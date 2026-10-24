import { afterEach, describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import type { HitlActionRequest } from '../../shared/copilot-contracts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn();
});

function harness() {
  const directory = mkdtempSync(join(tmpdir(), 'abangcolek-hitl-'));
  const app = createPlatformApp({
    databasePath: join(directory, 'test.sqlite'),
    bootstrapToken: 'test-bootstrap-token-hitl-v24',
    origin: 'http://localhost:3000',
  });
  cleanups.push(() => {
    app.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { app, directory };
}

async function call(
  app: ReturnType<typeof createPlatformApp>,
  path: string,
  body?: unknown,
  session?: { cookie: string; csrf: string },
  extra: Record<string, string> = {}
) {
  const response = await app.fetch(
    new Request(`http://localhost:3010/api/platform${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined
          ? {}
          : {
              'Content-Type': 'application/json',
              Origin: 'http://localhost:3000',
              'Idempotency-Key': crypto.randomUUID(),
            }),
        ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
        ...extra,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  );
  return { response, json: await response.json() };
}

async function user(app: ReturnType<typeof createPlatformApp>, name: string, founder = false) {
  const result = await call(
    app,
    founder ? '/auth/bootstrap' : '/auth/signup',
    {
      email: `${name}@example.test`,
      name,
      password: 'a strong local password 123',
      ...(founder ? { token: 'test-bootstrap-token-hitl-v24' } : {}),
    }
  );
  expect(result.response.status).toBe(200);
  return {
    cookie: result.response.headers.get('set-cookie')!.split(';')[0],
    csrf: result.json.data.csrfToken,
    userId: result.json.data.user.id,
  };
}

describe('03A-HITL / CPK-06 — Human-in-the-Loop Lifecycle & Execution Receipts Integrity', () => {
  test('Approval does NOT fabricate executionReceipt; sets executionBlockedReason to EXECUTOR_UNAVAILABLE', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);

    // Dapatkan actor founder dari platform
    const actor = app.auth.resolve(
      new Request('http://localhost:3010/api/platform/session', {
        headers: { Cookie: founder.cookie },
      })
    );

    // Cipta tindakan HITL pending
    const action = app.adkAgent.createHitlAction(
      actor,
      'refund',
      'Tuntutan refund botol sos pecah',
      {
        orderId: 'ord-test-01',
        amountSen: 2500,
        reason: 'Botol pecah semasa kurier',
      }
    );

    expect(action.status).toBe('pending_approval');
    expect(action.executionReceipt).toBeUndefined();
    expect(action.executionBlockedReason).toBeUndefined();

    // Luluskan tindakan HITL melalui HTTP endpoint
    const decideRes = await call(
      app,
      `/copilot/hitl/${action.id}/decide`,
      { approve: true },
      founder
    );

    expect(decideRes.response.status).toBe(200);
    const updated = decideRes.json.data as HitlActionRequest;

    expect(updated.status).toBe('approved');
    expect(updated.reviewedBy).toBe(founder.userId);
    // INVARIANT MUTLAK: Kelulusan BUKAN pelaksanaan. Dilarang mereka-reka receipt palsu!
    expect(updated.executionReceipt).toBeUndefined();
    expect(updated.executionBlockedReason).toBe('EXECUTOR_UNAVAILABLE');

    // Sahkan data dalam database juga konsisten
    const persisted = app.store.require<HitlActionRequest>('hitl_actions', action.id);
    expect(persisted.status).toBe('approved');
    expect(persisted.executionReceipt).toBeUndefined();
    expect(persisted.executionBlockedReason).toBe('EXECUTOR_UNAVAILABLE');
  });

  test('Rejection updates status to rejected without receipt and without executionBlockedReason', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);

    const actor = app.auth.resolve(
      new Request('http://localhost:3010/api/platform/session', {
        headers: { Cookie: founder.cookie },
      })
    );

    const action = app.adkAgent.createHitlAction(
      actor,
      'stock_quarantine',
      'Kuarantin batch sos botol lama',
      {
        lotId: 'lot-batch-99',
        reason: 'Ujian bau',
      }
    );

    const decideRes = await call(
      app,
      `/copilot/hitl/${action.id}/decide`,
      { approve: false },
      founder
    );

    expect(decideRes.response.status).toBe(200);
    const updated = decideRes.json.data as HitlActionRequest;

    expect(updated.status).toBe('rejected');
    expect(updated.executionReceipt).toBeUndefined();
    expect(updated.executionBlockedReason).toBeUndefined();
  });

  test('Expired HITL action fails with 409 HITL_EXPIRED before any state change occurs', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);

    const actor = app.auth.resolve(
      new Request('http://localhost:3010/api/platform/session', {
        headers: { Cookie: founder.cookie },
      })
    );

    // Cipta tindakan yang sudah tamat tempoh 1 jam lalu
    const pastExpiry = new Date(Date.now() - 3600 * 1000).toISOString();
    const action = app.adkAgent.createHitlAction(
      actor,
      'refund',
      'Tuntutan refund lapuk',
      {
        orderId: 'ord-expired-99',
        expiry: pastExpiry,
      }
    );

    // Pastikan expiry disimpan dengan betul
    expect(new Date(action.expiry).getTime()).toBeLessThan(Date.now());

    // Cubaan menilai tindakan tamat tempoh mesti gagal 409
    const decideRes = await call(
      app,
      `/copilot/hitl/${action.id}/decide`,
      { approve: true },
      founder
    );

    expect(decideRes.response.status).toBe(409);
    expect(decideRes.json.code).toBe('HITL_EXPIRED');

    // Sahkan status dalam store KEKAL pending_approval (tiada partial mutation!)
    const persisted = app.store.require<HitlActionRequest>('hitl_actions', action.id);
    expect(persisted.status).toBe('pending_approval');
  });

  test('Deciding an already decided action fails with 409 HITL_ALREADY_DECIDED', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);

    const actor = app.auth.resolve(
      new Request('http://localhost:3010/api/platform/session', {
        headers: { Cookie: founder.cookie },
      })
    );

    const action = app.adkAgent.createHitlAction(
      actor,
      'founder_override',
      'Override limit diskaun',
      { limit: 5000 }
    );

    // Keputusan pertama: Luluskan
    const first = await call(
      app,
      `/copilot/hitl/${action.id}/decide`,
      { approve: true },
      founder
    );
    expect(first.response.status).toBe(200);

    // Keputusan kedua: Cubaan tolak atau luluskan semula mesti gagal 409
    const second = await call(
      app,
      `/copilot/hitl/${action.id}/decide`,
      { approve: false },
      founder
    );
    expect(second.response.status).toBe(409);
    expect(second.json.code).toBe('HITL_ALREADY_DECIDED');
  });

  test('Non-founder users are blocked with 403 FORBIDDEN from deciding HITL actions', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);
    const customer = await user(app, 'customer', false);

    const actor = app.auth.resolve(
      new Request('http://localhost:3010/api/platform/session', {
        headers: { Cookie: founder.cookie },
      })
    );

    const action = app.adkAgent.createHitlAction(
      actor,
      'refund',
      'Refund keselamatan',
      { orderId: 'ord-sec-01' }
    );

    // Pelanggan cuba luluskan tindakan HITL
    const unauthorizedRes = await call(
      app,
      `/copilot/hitl/${action.id}/decide`,
      { approve: true },
      customer
    );

    expect(unauthorizedRes.response.status).toBe(403);
    expect(unauthorizedRes.json.code).toBe('FORBIDDEN');
  });

  test('AI-03: unknown_outcome state records indeterminate execution without fabricating receipt', async () => {
    const { app } = harness();
    const founder = await user(app, 'founder', true);
    const actor = app.auth.resolve(
      new Request('http://localhost:3010/api/platform/session', {
        headers: { Cookie: founder.cookie },
      })
    );

    const action = app.adkAgent.createHitlAction(
      actor,
      'refund',
      'Refund gangguan talian',
      { orderId: 'ord-unk-01', amountSen: 1500 }
    );
    app.adkAgent.decideHitlAction(actor, action.id, true);

    const unknown = app.adkAgent.recordHitlUnknownOutcome(
      actor,
      action.id,
      'Pengangkutan gateway terputus sebelum pengesahan komit'
    );
    expect(unknown.status).toBe('unknown_outcome');
    expect(unknown.executionReceipt).toBeUndefined();
    expect(unknown.executionBlockedReason).toBe('EXECUTION_OUTCOME_UNKNOWN');

    const persisted = app.store.require<HitlActionRequest>('hitl_actions', action.id);
    expect(persisted.status).toBe('unknown_outcome');
    expect(persisted.executionReceipt).toBeUndefined();
  });
});
