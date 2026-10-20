import { afterEach, expect, test, setSystemTime } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { Dealers } from '../../server/platform/dealers';
import { DomainError } from '../../server/platform/store';
import type { Principal } from '../../server/platform/auth';
import type { DealerApplication } from '../../shared/platform-contracts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const opened: ReturnType<typeof createPlatformApp>[] = [];
const directories: string[] = [];
function expectDomainError(operation: () => unknown, code: string, status: number) {
  let failure: unknown;
  try { operation(); } catch (error) { failure = error; }
  expect(failure).toBeInstanceOf(DomainError);
  expect((failure as DomainError).code).toBe(code);
  expect((failure as DomainError).status).toBe(status);
}
afterEach(() => {
  setSystemTime();
  for (const app of opened.splice(0)) app.close();
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

async function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'dealer-approval-'));
  directories.push(dir);
  const dbPath = join(dir, 'platform.db');
  const app = createPlatformApp({ databasePath: dbPath, bootstrapToken: 'dealer-approval-bootstrap-test' });
  opened.push(app);

  async function actor(name: string, founder = false): Promise<Principal> {
    const session = await app.auth.authenticate(founder ? 'bootstrap' : 'signup', {
      email: `${name}@example.test`,
      name,
      password: 'local isolated test password',
      ...(founder ? { token: 'dealer-approval-bootstrap-test' } : {}),
    });
    return app.auth.resolve(new Request('http://localhost', { headers: { Cookie: session.cookie } }));
  }

  const founder = await actor('founder', true);
  const dealer = await actor('dealer');
  const outsider = await actor('outsider');
  const dealers = new Dealers(app.store, app.auth, app.commerce);

  app.store.save('settings', {
    id: 'business',
    version: 1,
    approvedPolicies: {
      dealer: {
        version: 1,
        minimumQuantity: 1,
        packMultiple: 1,
        priceBasisPoints: 7500,
        ownership: 'consigned',
        returnRules: 'Founder checks returned units before quarantine receipt',
        approvedAt: new Date().toISOString(),
      },
    },
    locale: 'ms-MY',
    timezone: 'Asia/Kuala_Lumpur',
  });

  return { app, dealers, founder, dealer, outsider, dbPath };
}

test('non-founder actor is denied access', async () => {
  const { dealers, outsider, dealer } = await setup();
  const application = dealers.apply(dealer, { organization: 'Unauthorized Corp', description: 'Testing founder enforcement' });

  expectDomainError(() => dealers.decide(outsider, application.id, { expectedRevision: 1 }, true), 'FORBIDDEN', 403);
});

test('stale revision conflict fails and leaves application unchanged', async () => {
  const { app, dealers, founder, dealer } = await setup();
  const application = dealers.apply(dealer, { organization: 'Stale Corp', description: 'Testing revision check' });

  expectDomainError(() => dealers.decide(founder, application.id, { expectedRevision: 999 }, true), 'REVISION_CONFLICT', 409);

  const record = app.store.get<DealerApplication>('dealer_applications', application.id)!;
  expect(record.status).toBe('pending');
  expect(record.revision).toBe(1);
});

test('absent customer membership fails explicitly and leaves application pending', async () => {
  const { app, dealers, founder, dealer } = await setup();
  const application = dealers.apply(dealer, { organization: 'Missing Member Corp', description: 'Testing absent customer membership' });
  app.store.db.query("DELETE FROM memberships WHERE user_id=? AND role='customer'").run(dealer.user.id);

  expectDomainError(() => dealers.decide(founder, application.id, { expectedRevision: 1 }, true), 'ACTIVE_CUSTOMER_REQUIRED', 409);

  const record = app.store.get<DealerApplication>('dealer_applications', application.id)!;
  expect(record.status).toBe('pending');
  expect(record.revision).toBe(1);
}, 15000);

test('revoked customer membership fails explicitly and prevents silent reactivation', async () => {
  const { app, dealers, founder, dealer } = await setup();
  const application = dealers.apply(dealer, { organization: 'Revoked Member Corp', description: 'Testing revoked customer membership' });
  app.store.db.query("UPDATE memberships SET status='revoked', version=version+1 WHERE user_id=? AND role='customer'").run(dealer.user.id);

  expectDomainError(() => dealers.decide(founder, application.id, { expectedRevision: 1 }, true), 'ACTIVE_CUSTOMER_REQUIRED', 409);

  const memberRow = app.store.db.query<{ status: string }, [string]>("SELECT status FROM memberships WHERE user_id=? AND role='customer'").get(dealer.user.id)!;
  expect(memberRow.status).toBe('revoked');

  const record = app.store.get<DealerApplication>('dealer_applications', application.id)!;
  expect(record.status).toBe('pending');
  expect(record.revision).toBe(1);
}, 15000);

test('forced grant failure rolls back application approval and audit inside store.atomic', async () => {
  const { app, dealers, founder, dealer } = await setup();
  const application = dealers.apply(dealer, { organization: 'Atomic Rollback Corp', description: 'Testing grant failure rollback' });

  const originalGrant = app.auth.grant.bind(app.auth);
  app.auth.grant = (...args) => {
    originalGrant(...args);
    throw new Error('SIMULATED_GRANT_FAILURE');
  };

  try {
    expect(() => dealers.decide(founder, application.id, { expectedRevision: 1 }, true)).toThrow('SIMULATED_GRANT_FAILURE');
  } finally {
    app.auth.grant = originalGrant;
  }

  const record = app.store.get<DealerApplication>('dealer_applications', application.id)!;
  expect(record.status).toBe('pending');
  expect(record.revision).toBe(1);
  expect(record.dealerOrgId).toBeUndefined();

  const audits = app.store.db.query<{ id: string }, [string]>("SELECT id FROM audit WHERE entity_id=? AND operation='dealer.decide'").all(application.id);
  expect(audits.length).toBe(0);

  const memberships = app.auth.memberships(dealer.user.id);
  const custMem = memberships.find(m => m.role === 'customer')!;
  expect(custMem.dealerOrgId).toBeUndefined();
});

test('successful approval grants dealerOrgId, preserves outletIds, and records audit', async () => {
  const { app, dealers, founder, dealer } = await setup();
  app.store.db.query("UPDATE memberships SET outlets=? WHERE user_id=? AND role='customer'").run(JSON.stringify(['outlet-hq', 'outlet-branch']), dealer.user.id);

  const application = dealers.apply(dealer, { organization: 'Approved Dealer Corp', description: 'Legitimate dealer application' });
  const approved = dealers.decide(founder, application.id, { expectedRevision: 1 }, true);

  expect(approved.status).toBe('approved');
  expect(approved.revision).toBe(2);
  expect(typeof approved.dealerOrgId).toBe('string');
  expect(approved.dealerOrgId!.length).toBeGreaterThan(0);

  const record = app.store.get<DealerApplication>('dealer_applications', application.id)!;
  expect(record.status).toBe('approved');
  expect(record.revision).toBe(2);
  expect(record.dealerOrgId).toBe(approved.dealerOrgId);

  const memberships = app.auth.memberships(dealer.user.id);
  const custMem = memberships.find(m => m.role === 'customer')!;
  expect(custMem.dealerOrgId).toBe(approved.dealerOrgId);
  expect(custMem.outletIds).toEqual(['outlet-hq', 'outlet-branch']);

  const audits = app.store.db.query<{ id: string; revision: number }, [string]>("SELECT id, revision FROM audit WHERE entity_id=? AND operation='dealer.decide'").all(application.id);
  expect(audits.length).toBe(1);
  expect(audits[0].revision).toBe(2);
});

test('rejection updates status to rejected with reason and records audit without membership changes', async () => {
  const { app, dealers, founder, dealer } = await setup();
  const application = dealers.apply(dealer, { organization: 'Rejected Corp', description: 'Application to reject' });
  const rejected = dealers.decide(founder, application.id, { expectedRevision: 1, reason: 'Kriteria tidak dipenuhi.' }, false);

  expect(rejected.status).toBe('rejected');
  expect(rejected.revision).toBe(2);
  expect(rejected.dealerOrgId).toBeUndefined();

  const record = app.store.get<DealerApplication>('dealer_applications', application.id)!;
  expect(record.status).toBe('rejected');
  expect(record.revision).toBe(2);

  const memberships = app.auth.memberships(dealer.user.id);
  const custMem = memberships.find(m => m.role === 'customer')!;
  expect(custMem.dealerOrgId).toBeUndefined();

  const audits = app.store.db.query<{ id: string; revision: number }, [string]>("SELECT id, revision FROM audit WHERE entity_id=? AND operation='dealer.decide'").all(application.id);
  expect(audits.length).toBe(1);
  expect(audits[0].revision).toBe(2);
});
