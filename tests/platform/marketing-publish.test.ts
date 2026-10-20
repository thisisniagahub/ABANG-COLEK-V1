import { describe, expect, test } from 'bun:test';
import { createPlatformApp } from '../../server/platform/app';
import { createDefaultAutomationOptions, LocalPostizTransport } from '../../server/automation/runtimeTransports';
import { existsSync, unlinkSync } from 'node:fs';
import { Database } from 'bun:sqlite';

/**
 * Fixture lifecycle guard.
 *
 * Root cause of the historical spurious `409 ALREADY_BOOTSTRAPPED` in this
 * suite: the old `cleanup()` swallowed `unlinkSync` failures. On Windows a
 * SQLite database whose connection is still open cannot be unlinked (`EBUSY`),
 * so the fixture database survived the cleanup WITH its `owner_bootstrapped`
 * metadata row intact and the next bootstrap of the same path was rejected
 * with 409 — a test-infrastructure defect that kept masquerading as a product
 * failure in unrelated suites.
 *
 * The guard fixes it on three levels:
 *   1. the platform app (and therefore the SQLite connection) is closed before
 *      any file is removed;
 *   2. removal is retried with a bounded backoff instead of swallowing the
 *      error, and a SQLite sidecar is never orphaned from its main database;
 *   3. if the database is still held open by another connection, the bootstrap
 *      owner marker (and the owner identity) is cleared in place, so the next
 *      bootstrap of that path can never return 409.
 */
type FixtureApp = { close(): void };

const RUN_ID = `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const SIDECAR_SUFFIXES = ['-wal', '-shm'] as const;
const UNLINK_ATTEMPTS = 6;
const UNLINK_BACKOFF_MS = 20;
const UNLINK_MAX_BACKOFF_MS = 250;

const fixtureApps = new Map<string, FixtureApp>();

const sleepSync = (ms: number) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

function registerFixtureApp(dbPath: string, app: FixtureApp) {
  fixtureApps.set(dbPath, app);
}

function closeFixtureApp(dbPath: string) {
  const app = fixtureApps.get(dbPath);
  if (!app) return;
  fixtureApps.delete(dbPath);
  try { app.close(); } catch { /* the test already closed the connection */ }
}

/** Removes the given database files, retrying with a bounded backoff. Never swallows the error. */
function removeFiles(dbPath: string, suffixes: readonly string[]): string[] {
  const remaining: string[] = [];
  for (const suffix of suffixes) {
    const target = dbPath + suffix;
    if (!existsSync(target)) continue;
    let removed = false;
    for (let attempt = 0; attempt < UNLINK_ATTEMPTS && !removed; attempt++) {
      try { unlinkSync(target); removed = true; }
      catch { sleepSync(Math.min(UNLINK_BACKOFF_MS * 2 ** attempt, UNLINK_MAX_BACKOFF_MS)); }
    }
    if (!removed && existsSync(target)) remaining.push(suffix);
  }
  return remaining;
}

/**
 * Clears the bootstrap owner marker (and the owner identity) from a database
 * that could not be deleted. Without this, a surviving fixture database turns
 * the next bootstrap of the same path into a 409.
 */
function clearBootstrapMarker(dbPath: string): boolean {
  if (!existsSync(dbPath)) return false;
  let db: Database | undefined;
  try {
    db = new Database(dbPath, { create: false, strict: true });
    db.run('PRAGMA busy_timeout=5000;');
    const founders = db.query<{ id: string }, []>(
      "SELECT u.id AS id FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.role='founder'"
    ).all();
    for (const founder of founders) {
      db.run('DELETE FROM sessions WHERE user_id=?', [founder.id]);
      db.run('DELETE FROM memberships WHERE user_id=?', [founder.id]);
      db.run('DELETE FROM users WHERE id=?', [founder.id]);
    }
    db.run('DELETE FROM metadata WHERE key=?', ['owner_bootstrapped']);
    return true;
  } catch {
    // Another connection owns the file outright — the unique per-run path keeps
    // the next run away from it, so the marker can never block a later bootstrap.
    return false;
  } finally {
    try { db?.close(); } catch { /* already closed */ }
  }
}

function cleanup(dbPath: string) {
  closeFixtureApp(dbPath);
  // Sidecars first: a surviving `-wal` without its main database can be replayed
  // into a fresh database and resurrect the stale owner marker.
  const lockedSidecars = removeFiles(dbPath, SIDECAR_SUFFIXES);
  const lockedMain = lockedSidecars.length === 0
    ? removeFiles(dbPath, [''])
    : (existsSync(dbPath) ? [''] : []);
  if (lockedSidecars.length > 0 || lockedMain.length > 0) {
    // The database is still held open by another connection. Deleting the file
    // alone is not enough: the surviving database still carries the
    // `owner_bootstrapped` marker, so the next bootstrap of this path would be
    // rejected with 409. Clear the marker in place instead.
    clearBootstrapMarker(dbPath);
    removeFiles(dbPath, SIDECAR_SUFFIXES);
    removeFiles(dbPath, ['']);
  }
}

async function createTestContext(testId: string, withAutomation = true, customPostizTransport?: any) {
  // Path unik bagi setiap larian: larian lain yang serentak tidak boleh
  // meminta fail SQLite yang sama.
  const testDb = `var/lib/qa/postiz-marketing-${RUN_ID}-${testId}.sqlite`;
  cleanup(testDb);

  const autoOptions = withAutomation ? createDefaultAutomationOptions() : undefined;
  if (autoOptions && customPostizTransport) {
    autoOptions.postiz = customPostizTransport;
  }

  const app = createPlatformApp({
    databasePath: testDb,
    bootstrapToken: 'test-bootstrap-token-postiz',
    origin: 'http://localhost:3000',
    automationOptions: autoOptions,
  });
  registerFixtureApp(testDb, app);

  // Bootstrap founder
  const bootRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    body: JSON.stringify({
      email: `founder-postiz-${testId}@test.local`,
      password: 'password123456',
      name: 'Founder Postiz Test',
      token: 'test-bootstrap-token-postiz',
    }),
  }));
  expect(bootRes.status).toBe(200);
  const bootData = await bootRes.json() as { data: { user: { id: string }; csrfToken: string } };
  const founderCookie = bootRes.headers.get('set-cookie')!;
  const founderCsrf = bootData.data.csrfToken;

  return { app, founderCookie, founderCsrf, testDb };
}

describe('E03: Postiz Social Marketing Adapter & Pilot Publishing', () => {
  test('without transport injection, health reports unavailable and publish is blocked', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('no-transport', false);

    const healthRes = await app.fetch(new Request('http://localhost:3000/api/platform/health', {
      headers: { 'Cookie': founderCookie },
    }));
    expect(healthRes.status).toBe(200);
    const health = await healthRes.json() as { data: { component: string; status: string }[] };
    expect(health.data.find(c => c.component === 'postiz')?.status).toBe('unavailable');

    // Create campaign
    const createRes = await app.fetch(new Request('http://localhost:3000/api/platform/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-create-camp-001',
      },
      body: JSON.stringify({
        title: 'Kempen Sambal Colek Ramadhan',
        objective: 'Meningkatkan kesedaran produk',
        copy: 'Dapatkan sambal colek asli di outlet berhampiran!',
        assets: [],
        productIds: [],
        catalogueVersion: 0,
      }),
    }));
    expect(createRes.status).toBe(200);
    const campaign = (await createRes.json() as any).data;

    // Approve campaign
    const approveRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify({
        expectedRevision: 1,
        approvalExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      }),
    }));
    expect(approveRes.status).toBe(200);

    // Attempt publish without transport
    const pubRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/postiz-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-postiz-001',
      },
      body: JSON.stringify({
        expectedRevision: 2,
        channel: 'local-pilot',
      }),
    }));
    expect(pubRes.status).toBe(200);
    const pubOutcome = (await pubRes.json() as any).data;
    expect(pubOutcome.status).toBe('blocked');
    expect(pubOutcome.reasonCode).toBe('REMOTE_PUBLISH_DISABLED');

    cleanup(testDb);
  });

  test('validates exact revision approval, expiry, and channel scope before publish', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('validation-suite', true);

    // Create campaign
    const createRes = await app.fetch(new Request('http://localhost:3000/api/platform/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-create-camp-002',
      },
      body: JSON.stringify({
        title: 'Kempen Diskaun Akhir Tahun',
        objective: 'Jualan habiskan stok',
        copy: 'Beli 2 percuma 1!',
        assets: [],
        productIds: [],
        catalogueVersion: 0,
      }),
    }));
    const campaign = (await createRes.json() as any).data;

    // 1. Unapproved publish fails with 409 APPROVAL_REQUIRED
    const unapprovedRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/postiz-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-unapproved-1',
      },
      body: JSON.stringify({
        expectedRevision: 1,
        channel: 'local-pilot',
      }),
    }));
    expect(unapprovedRes.status).toBe(409);
    expect((await unapprovedRes.json() as any).code).toBe('APPROVAL_REQUIRED');

    // 2. Approve with past expiry date
    const approveRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify({
        expectedRevision: 1,
        approvalExpiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
      }),
    }));
    expect(approveRes.status).toBe(200);

    // 3. Stale revision fails with 409
    const staleRevRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/postiz-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-stale-rev',
      },
      body: JSON.stringify({
        expectedRevision: 99,
        channel: 'local-pilot',
      }),
    }));
    expect(staleRevRes.status).toBe(409);

    // 4. Unsupported channel is blocked
    const badChannelRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/postiz-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-bad-channel',
      },
      body: JSON.stringify({
        expectedRevision: 2,
        channel: 'unsupported-tiktok-enterprise',
      }),
    }));
    expect(badChannelRes.status).toBe(200);
    const badChannelOutcome = (await badChannelRes.json() as any).data;
    expect(badChannelOutcome.status).toBe('blocked');
    expect(badChannelOutcome.reasonCode).toBe('CHANNEL_NOT_SUPPORTED');

    cleanup(testDb);
  });

  test('executes approved one-channel pilot publish attempt without external publish, manual export separation, and replay identity', async () => {
    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('pilot-success', true);

    // Create & approve campaign
    const createRes = await app.fetch(new Request('http://localhost:3000/api/platform/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-create-camp-003',
      },
      body: JSON.stringify({
        title: 'Kempen Pelancaran Rasmi',
        objective: 'Jualan balang pertama',
        copy: 'Sambal colek kini rasmi boleh didapati!',
        assets: [],
        productIds: [],
        catalogueVersion: 0,
      }),
    }));
    const campaign = (await createRes.json() as any).data;

    await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify({
        expectedRevision: 1,
        approvalExpiresAt: new Date(Date.now() + 14 * 24 * 3600_000).toISOString(),
      }),
    }));

    // Manual export remains available with status 'exported'
    const exportRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-export-001',
      },
      body: JSON.stringify({
        expectedRevision: 2,
        format: 'text',
      }),
    }));
    expect(exportRes.status).toBe(200);
    const exportData = (await exportRes.json() as any).data;
    expect(exportData.status).toBe('exported');
    expect(exportData.content).toContain('Sambal colek kini rasmi');

    // Publish pilot via the local Postiz stub (no external publish ever occurs)
    const pubRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/postiz-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-publish-pilot-001',
      },
      body: JSON.stringify({
        expectedRevision: 2,
        channel: 'local-pilot',
        accountId: 'acct-abangcolek-my',
      }),
    }));
    expect(pubRes.status).toBe(200);
    const pubData = (await pubRes.json() as any).data;
    // The previous expectations ('published' + a 'postiz-' providerRef + the
    // 'POSTIZ_PUBLISHED' reason code) encoded a fabricated external effect: the
    // local stub never published anything to Postiz.
    // New invariant: the outcome stays 'unknown' and names the local stub explicitly
    // (server/automation/runtimeTransports.ts:166-173).
    expect(pubData.status).toBe('unknown');
    expect(pubData.reasonCode).toBe('LOCAL_STUB_NO_EXTERNAL_PUBLISH');
    // New invariant: the provider reference must be a local stub reference and never
    // a fabricated external 'postiz-' id, and no external publish URL may be invented.
    expect(pubData.providerRef).toMatch(/^local-stub-/);
    expect(pubData.providerRef).not.toMatch(/^postiz-/);
    expect(pubData.url).toBeUndefined();
    // New invariant: no fabricated evidence is attached to an outcome that never happened.
    expect(pubData.evidenceIds).toEqual([]);
    // The unmistakable local-stub marker (transport/delivered/externalEffect) must
    // reach the HTTP response so no consumer can mistake this for a real publish.
    // IMPLEMENTATION GAP: server/automation/adapters.ts:87-93 rebuilds the outcome
    // without the LocalStubMarker fields, so they never reach the response built at
    // server/platform/app.ts:454.
    expect(pubData.transport).toBe('local_stub');
    expect(pubData.delivered).toBe(false);
    expect(pubData.externalEffect).toBe('none');

    // Replaying the same idempotency key must NOT be served as a successful publish
    // replay. The previous expectation (200 + the identical 'published' receipt)
    // encoded a fabricated external effect.
    // New invariant: an 'unknown' outcome is never auto-replayed; the platform
    // refuses with RECONCILIATION_REQUIRED so no second publish can be triggered.
    const replayRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/postiz-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-publish-pilot-001',
      },
      body: JSON.stringify({
        expectedRevision: 2,
        channel: 'local-pilot',
        accountId: 'acct-abangcolek-my',
      }),
    }));
    expect(replayRes.status).toBe(409);
    const replayBody = (await replayRes.json() as any);
    expect(replayBody.code).toBe('RECONCILIATION_REQUIRED');
    expect(replayBody.data).toBeUndefined();

    // Identity contract: the same idempotency key still resolves to the SAME intent
    // id and the SAME local provider reference — proven by reading the persisted
    // intent back through reconcile instead of re-publishing.
    const recRes = await app.fetch(new Request('http://localhost:3000/api/platform/automation/postiz/reconcile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify({
        intentId: pubData.intentId,
        providerRef: pubData.providerRef,
      }),
    }));
    expect(recRes.status).toBe(200);
    const recData = (await recRes.json() as any).data;
    expect(recData.intentId).toBe(pubData.intentId);
    expect(recData.providerRef).toBe(pubData.providerRef);
    // The local stub cannot confirm an external publish either.
    expect(recData.status).toBe('unknown');
    expect(recData.reasonCode).toBe('LOCAL_STUB_NO_EXTERNAL_RECONCILE');

    cleanup(testDb);
  });

  test('local Postiz stub transport performs no external publish and marks every outcome as a local stub', async () => {
    const transport = new LocalPostizTransport();
    const signal = new AbortController().signal;
    const intent = {
      id: 'intent-local-stub-001',
      campaignId: 'campaign-12345678',
      assetVersion: 2,
      channel: 'local-pilot',
      approvalId: 'user-founder',
      approvalExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      grantVersion: 1,
      idempotencyKey: 'idem-local-stub-001',
    };

    const outcome = await transport.publish(intent, signal);
    // The local stub must never report a published outcome and must never invent
    // an external provider reference or URL.
    expect(outcome.status).toBe('unknown');
    expect(outcome.reasonCode).toBe('LOCAL_STUB_NO_EXTERNAL_PUBLISH');
    expect(outcome.providerRef).toMatch(/^local-stub-/);
    expect(outcome.providerRef).not.toMatch(/^postiz-/);
    expect(outcome.url).toBeUndefined();
    expect(outcome.transport).toBe('local_stub');
    expect(outcome.delivered).toBe(false);
    expect(outcome.externalEffect).toBe('none');

    // Reconciliation is equally honest: the stub cannot confirm anything externally.
    const reconciled = await transport.reconcile(outcome.providerRef, signal);
    expect(reconciled.status).toBe('unknown');
    expect(reconciled.reasonCode).toBe('LOCAL_STUB_NO_EXTERNAL_RECONCILE');
    expect(reconciled.transport).toBe('local_stub');
    expect(reconciled.delivered).toBe(false);
    expect(reconciled.externalEffect).toBe('none');
  });

  test('reconciles unknown outcome and supports cancel flow', async () => {
    // Custom transport simulating unknown outcome followed by successful reconciliation
    let publishAttempt = 0;
    const flakyTransport = {
      zeroNewSpend: true as const,
      channel: 'local-pilot' as const,
      async publish(intent: any) {
        publishAttempt++;
        return {
          providerRef: 'postiz-flaky-999',
          status: 'unknown' as const,
          reasonCode: 'NETWORK_TIMEOUT_UNCONFIRMED',
        };
      },
      async reconcile(providerRef: string) {
        return {
          providerRef,
          status: 'published' as const,
          url: 'https://postiz.local/posts/postiz-flaky-999',
          reasonCode: 'REMOTE_CONFIRMED',
        };
      },
      async cancel(providerRef: string) {
        return {
          providerRef,
          status: 'cancelled' as const,
          evidenceIds: [],
        };
      },
    };

    const { app, founderCookie, founderCsrf, testDb } = await createTestContext('flaky-postiz', true, flakyTransport);

    // Create & approve campaign
    const createRes = await app.fetch(new Request('http://localhost:3000/api/platform/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-create-camp-004',
      },
      body: JSON.stringify({
        title: 'Kempen Flaky Test',
        objective: 'Test reconciliation',
        copy: 'Test post content',
        assets: [],
        productIds: [],
        catalogueVersion: 0,
      }),
    }));
    const campaign = (await createRes.json() as any).data;

    await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify({
        expectedRevision: 1,
        approvalExpiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
      }),
    }));

    // 1. Initial publish returns unknown status
    const pubRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/postiz-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-flaky-001',
      },
      body: JSON.stringify({
        expectedRevision: 2,
        channel: 'local-pilot',
      }),
    }));
    expect(pubRes.status).toBe(200);
    const pubData = (await pubRes.json() as any).data;
    expect(pubData.status).toBe('unknown');

    // 2. Re-trying publish before reconciliation is rejected with 409 RECONCILIATION_REQUIRED
    const retryRes = await app.fetch(new Request(`http://localhost:3000/api/platform/campaigns/${campaign.id}/postiz-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
        'idempotency-key': 'idem-flaky-001',
      },
      body: JSON.stringify({
        expectedRevision: 2,
        channel: 'local-pilot',
      }),
    }));
    expect(retryRes.status).toBe(409);
    expect((await retryRes.json() as any).code).toBe('RECONCILIATION_REQUIRED');

    // 3. Reconcile endpoint succeeds and updates status
    const recRes = await app.fetch(new Request('http://localhost:3000/api/platform/automation/postiz/reconcile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify({
        intentId: pubData.intentId,
        providerRef: 'postiz-flaky-999',
      }),
    }));
    expect(recRes.status).toBe(200);
    const recData = (await recRes.json() as any).data;
    expect(recData.status).toBe('published');

    // 4. Cancel endpoint succeeds
    const cancelRes = await app.fetch(new Request('http://localhost:3000/api/platform/automation/postiz/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': founderCookie,
        'x-csrf-token': founderCsrf,
      },
      body: JSON.stringify({
        providerRef: 'postiz-flaky-999',
      }),
    }));
    expect(cancelRes.status).toBe(200);
    const cancelData = (await cancelRes.json() as any).data;
    expect(cancelData.status).toBe('cancelled');

    cleanup(testDb);
  });
});
