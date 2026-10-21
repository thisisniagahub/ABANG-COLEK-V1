/**
 * EXT-01 — laluan inspector dev (local sahaja) + PD-01 — gate opt-out when
 * hantar.
 *
 * EXT-01: `GET /api/platform/dev/inspector` mesti 404 dalam production,
 * 403 untuk pelanggan, 200 untuk founder/developer, dan 401 tanpa sesi.
 * PD-01: penerima yang opted-out ⇒ `DISPATCH_OPTED_OUT` dan tiada penghantaran;
 * konsen yang granted membolehkan penghantaran.
 */
import { describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { Auth } from '../../server/platform/auth';
import { evaluateDispatchConsent, runWithDispatchConsent } from '../../server/platform/dispatchConsent';
import { PlatformStore, now } from '../../server/platform/store';

const ORIGIN = 'http://localhost:3000';
const BOOTSTRAP_TOKEN = 'test-bootstrap-token-12345';
const RUN_ID = `${Date.now()}-${process.pid}`;

interface Session {
  cookie: string;
  csrfToken: string;
  userId: string;
}

async function boot(testId: string): Promise<{
  app: ReturnType<typeof createPlatformApp>;
  dbPath: string;
  founder: Session;
  customer: Session;
}> {
  const dbPath = `var/lib/qa/ext-pd-${RUN_ID}-${testId}.sqlite`;
  const app = createPlatformApp({ databasePath: dbPath, bootstrapToken: BOOTSTRAP_TOKEN, origin: ORIGIN });

  const bootstrap = await app.fetch(new Request(`${ORIGIN}/api/platform/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ token: BOOTSTRAP_TOKEN, email: `founder-${testId}@test.local`, password: 'RahsiaKuat12345', name: 'Founder' }),
  }));
  const founderBody = await bootstrap.json() as { ok: boolean; data?: { csrfToken: string; user: { id: string } } };
  expect(founderBody.ok).toBe(true);

  const signup = await app.fetch(new Request(`${ORIGIN}/api/platform/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email: `pelanggan-${testId}@test.local`, password: 'RahsiaKuat12345', name: 'Pelanggan' }),
  }));
  const customerBody = await signup.json() as { ok: boolean; data?: { csrfToken: string; user: { id: string } } };
  expect(customerBody.ok).toBe(true);

  return {
    app,
    dbPath,
    founder: {
      cookie: (bootstrap.headers.get('set-cookie') ?? '').split(';')[0],
      csrfToken: founderBody.data!.csrfToken,
      userId: founderBody.data!.user.id,
    },
    customer: {
      cookie: (signup.headers.get('set-cookie') ?? '').split(';')[0],
      csrfToken: customerBody.data!.csrfToken,
      userId: customerBody.data!.user.id,
    },
  };
}

describe('EXT-01 — inspector dev (local sahaja)', () => {
  test('founder ⇒ 200 dengan snapshot; pelanggan ⇒ 403; tanpa sesi ⇒ 401', async () => {
    const ctx = await boot('inspector');
    try {
      const asFounder = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/dev/inspector`, {
        headers: { Origin: ORIGIN, Cookie: ctx.founder.cookie },
      }));
      expect(asFounder.status).toBe(200);
      const founderBody = await asFounder.json() as { ok: boolean; data?: { generatedAt?: string } };
      expect(founderBody.ok).toBe(true);
      expect(founderBody.data?.generatedAt).toBeTruthy();

      const asCustomer = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/dev/inspector`, {
        headers: { Origin: ORIGIN, Cookie: ctx.customer.cookie },
      }));
      expect(asCustomer.status).toBe(403);

      const anonymous = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/dev/inspector`, { headers: { Origin: ORIGIN } }));
      expect(anonymous.status).toBe(401);
    } finally {
      ctx.app.close();
    }
  });

  test('NEGATIF NODE_ENV=production ⇒ 404 dan TIDAK ada sesi yang bocor', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const ctx = await boot('inspector-prod');
    try {
      const response = await ctx.app.fetch(new Request(`${ORIGIN}/api/platform/dev/inspector`, {
        headers: { Origin: ORIGIN, Cookie: ctx.founder.cookie },
      }));
      expect(response.status).toBe(404);
      const body = await response.json() as { code?: string };
      expect(body.code).toBe('INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION');
    } finally {
      ctx.app.close();
      process.env.NODE_ENV = previous;
    }
  });
});

describe('PD-01 — gate opt-out dan kebenaran aset', () => {
  function seedCampaign(store: PlatformStore): void {
    store.save('campaigns', {
      id: 'camp-pd-001',
      title: 'Kempen PD',
      objective: 'Ujian',
      copy: 'Teks',
      status: 'approved',
      ownerId: 'user-pd-founder',
      revision: 1,
      assets: [{ id: 'asset-pd-001', name: 'Nota', rights: 'Business-owned', consent: 'Free text lama' }],
      productIds: [],
      catalogueVersion: 0,
      createdAt: now(),
    } as never);
  }

  test('NEGATIF penerima opted-out ⇒ DISPATCH_OPTED_OUT dan tiada penghantaran', () => {
    const store = new PlatformStore(':memory:');
    try {
      seedCampaign(store);
      store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)').run('recipient-pd-001','r1@example.test','R1','hash',now());
      store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)').run('recipient-pd-002','r2@example.test','R2','hash',now());
      store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)').run('recipient-pd-003','r3@example.test','R3','hash',now());
      store.save('asset_consents', { id: 'asset-pd-001', assetId: 'asset-pd-001', state: 'granted', scope: 'in_app:orders', evidenceId: 'ev-pd-001', recordedAt: now(), recordedBy: 'user-pd-founder' } as never);
      // Preferensi tersimpan: in_app dinyahaktifkan.
      store.save('notification_preferences', {
        id: 'recipient-pd-001',
        userId: 'recipient-pd-001',
        revision: 1,
        channel: 'in_app',
        inAppEnabled: false,
        topics: [],
        updatedAt: now(),
      } as never);

      let dispatched = false;
      const auth = new Auth(store);
      const actor = { user: { id: 'user-pd-staff' }, memberships: [{ role: 'staff', status: 'active', outletIds: ['hq'] }] } as never;
      const outcome = runWithDispatchConsent(
        store,
        auth,
        actor,
        { campaignId: 'camp-pd-001', assetId: 'asset-pd-001', recipientId: 'recipient-pd-001', channel: 'in_app' },
        () => {
          dispatched = true;
        },
      );
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.code).toBe('DISPATCH_OPTED_OUT');
      expect(dispatched).toBe(false);
    } finally {
      store.close();
    }
  });

  test('NEGATIF tiada rekod konsen ⇒ ASSET_CONSENT_NOT_GRANTED (unknown bukan kebenaran)', () => {
    const store = new PlatformStore(':memory:');
    try {
      seedCampaign(store);
      store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)').run('recipient-pd-002','r2@example.test','R2','hash',now());
      const auth = new Auth(store);
      const actor = { user: { id: 'user-pd-staff' }, memberships: [{ role: 'staff', status: 'active', outletIds: ['hq'] }] } as never;
      const outcome = evaluateDispatchConsent(store, auth, actor, {
        campaignId: 'camp-pd-001',
        assetId: 'asset-pd-001',
        recipientId: 'recipient-pd-002',
        channel: 'in_app',
      } as never);
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.code).toBe('ASSET_CONSENT_NOT_GRANTED');
    } finally {
      store.close();
    }
  });

  test('rekod konsen `granted` ⇒ dispatch dibenarkan', () => {
    const store = new PlatformStore(':memory:');
    try {
      seedCampaign(store);
      store.save('asset_consents', {
        id: 'asset-pd-001',
        assetId: 'asset-pd-001',
        state: 'granted',
        scope: 'in_app:orders',
        evidenceId: 'ev-pd-001',
        recordedAt: now(),
        recordedBy: 'user-pd-founder',
      } as never);
      store.db.query('INSERT OR IGNORE INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)').run('recipient-pd-003','r3@example.test','R3','hash',now());
      store.save('notification_preferences', {
        id: 'recipient-pd-003',
        userId: 'recipient-pd-003',
        revision: 1,
        channel: 'in_app',
        inAppEnabled: true,
        topics: ['orders'],
        updatedAt: now(),
      } as never);

      const auth = new Auth(store);
      const actor = { user: { id: 'user-pd-staff' }, memberships: [{ role: 'staff', status: 'active', outletIds: ['hq'] }] } as never;
      const outcome = evaluateDispatchConsent(store, auth, actor, {
        campaignId: 'camp-pd-001',
        assetId: 'asset-pd-001',
        recipientId: 'recipient-pd-003',
        channel: 'in_app',
      } as never);
      expect(outcome.ok).toBe(true);
    } finally {
      store.close();
    }
  });
});
