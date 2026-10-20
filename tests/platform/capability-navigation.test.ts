import { describe, expect, test } from 'bun:test';
import { canAccessSection, getNavigation, getNavigationGroups, resolveRoute, sectionCapabilities } from '../../src/features/platform/routes';
import { createPlatformApp } from '../../server/platform/app';
import { PlatformStore } from '../../server/platform/store';
import { existsSync, unlinkSync } from 'node:fs';
import { Database } from 'bun:sqlite';

/**
 * Fixture lifecycle guard.
 *
 * Root cause of the historical spurious `409 ALREADY_BOOTSTRAPPED` in this
 * file: the old `cleanup()` swallowed `unlinkSync` failures. On Windows a
 * SQLite database whose connection is still open cannot be unlinked (`EBUSY`),
 * so the fixture database survived the cleanup WITH its `owner_bootstrapped`
 * metadata row intact and the next bootstrap of the same path was rejected
 * with 409 — a test-infrastructure defect that kept masquerading as a product
 * failure in unrelated suites. This file is the one that produced the
 * historical false signal, so it carries the strictest guard.
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

// Path unik bagi setiap larian: larian lain yang serentak tidak boleh meminta
// fail SQLite yang sama.
const testDb = `var/lib/qa/capability-nav-test-${RUN_ID}.sqlite`;

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

function cleanup(dbPath: string = testDb) {
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

describe('D02: Capability-aware navigation metadata and access control', () => {
  test('navigation items have explicit domain capabilities, not generic workspace.role', () => {
    const founderNav = getNavigation('founder');
    expect(founderNav.find(i => i.id === 'finance')?.requiredCapability).toBe('business.read');
    expect(founderNav.find(i => i.id === 'people')?.requiredCapability).toBe('people.grant');
    expect(founderNav.find(i => i.id === 'settings')?.requiredCapability).toBe('business.write');
    expect(founderNav.find(i => i.id === 'overview')?.requiredCapability).toBe('business.read');

    const staffNav = getNavigation('staff');
    expect(staffNav.every(i => i.requiredCapability === 'assigned.read')).toBe(true);

    const devNav = getNavigation('developer');
    expect(devNav.every(i => i.requiredCapability === 'runtime.read')).toBe(true);

    const customerNav = getNavigation('customer');
    expect(customerNav.every(i => i.requiredCapability === 'own.read')).toBe(true);
  });

  test('canAccessSection validates actor capabilities correctly', () => {
    // Founder with full business capabilities
    const founderCaps = ['business.read', 'business.write', 'people.grant', 'payment.confirm'];
    expect(canAccessSection('founder', 'overview', founderCaps)).toBe(true);
    expect(canAccessSection('founder', 'finance', founderCaps)).toBe(true);
    expect(canAccessSection('founder', 'people', founderCaps)).toBe(true);
    expect(canAccessSection('founder', 'settings', founderCaps)).toBe(true);

    // Founder missing people.grant cannot access people section
    const restrictedFounder = ['business.read'];
    expect(canAccessSection('founder', 'finance', restrictedFounder)).toBe(true);
    expect(canAccessSection('founder', 'people', restrictedFounder)).toBe(false);
    expect(canAccessSection('founder', 'settings', restrictedFounder)).toBe(false);

    // Developer cannot access founder finance or settings
    const devCaps = ['runtime.read'];
    expect(canAccessSection('developer', 'reports', devCaps)).toBe(true);
    expect(canAccessSection('developer', 'settings', devCaps)).toBe(true);
    expect(canAccessSection('developer', 'overview', devCaps)).toBe(true);
    expect(canAccessSection('founder', 'finance', devCaps)).toBe(false);

    // Customer cannot access staff or developer sections
    const custCaps = ['own.read', 'own.write'];
    expect(canAccessSection('customer', 'orders', custCaps)).toBe(true);
    expect(canAccessSection('staff', 'tasks', custCaps)).toBe(false);
    expect(canAccessSection('developer', 'jobs', custCaps)).toBe(false);
  });

  test('backend enforces strict capability denial without leaking records', async () => {
    cleanup();
    const app = createPlatformApp({ databasePath: testDb, bootstrapToken: 'test-bootstrap-token-12345' });
    registerFixtureApp(testDb, app);

    // Bootstrap founder
    const bootRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ email: 'founder@test.local', password: 'password123456', name: 'Founder Test', token: 'test-bootstrap-token-12345' }),
    }));
    expect(bootRes.status).toBe(200);
    const bootData = await bootRes.json() as { data: { user: { id: string }, csrfToken: string }, cookie: string };
    const founderCookie = bootRes.headers.get('set-cookie')!;
    const founderCsrf = bootData.data.csrfToken;

    // Create a customer user
    const custRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ email: 'customer@test.local', password: 'password123456', name: 'Customer Test' }),
    }));
    expect(custRes.status).toBe(200);
    const custData = await custRes.json() as { data: { user: { id: string }, csrfToken: string } };
    const custCookie = custRes.headers.get('set-cookie')!;

    // Grant developer membership to customer user
    const grantRes = await app.fetch(new Request('http://localhost:3000/api/platform/people/grants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000', 'Cookie': founderCookie, 'x-csrf-token': founderCsrf },
      body: JSON.stringify({ userId: custData.data.user.id, role: 'developer', outletIds: ['hq'], expectedVersion: 0 }),
    }));
    expect(grantRes.status).toBe(200);


    // Login as developer
    const devLoginRes = await app.fetch(new Request('http://localhost:3000/api/platform/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ email: 'customer@test.local', password: 'password123456' }),
    }));
    expect(devLoginRes.status).toBe(200);
    const devCookie = devLoginRes.headers.get('set-cookie')!;


    // Negative tests: Developer attempts to call founder finance & business endpoints
    const devOverview = await app.fetch(new Request('http://localhost:3000/api/platform/overview', {
      headers: { 'Cookie': devCookie },
    }));
    expect(devOverview.status).toBe(403);

    const devFinance = await app.fetch(new Request('http://localhost:3000/api/platform/finance/summary', {
      headers: { 'Cookie': devCookie },
    }));
    expect(devFinance.status).toBe(403);

    const devReportBuild = await app.fetch(new Request('http://localhost:3000/api/platform/reports/build?kind=orders', {
      headers: { 'Cookie': devCookie },
    }));
    expect(devReportBuild.status).toBe(403);

    const devExpenses = await app.fetch(new Request('http://localhost:3000/api/platform/expenses', {
      headers: { 'Cookie': devCookie },
    }));
    expect(devExpenses.status).toBe(403);

    // Positive test: Developer can access runtime health and automation jobs
    const devHealth = await app.fetch(new Request('http://localhost:3000/api/platform/health', {
      headers: { 'Cookie': devCookie },
    }));
    expect(devHealth.status).toBe(200);

    const devJobs = await app.fetch(new Request('http://localhost:3000/api/platform/jobs', {
      headers: { 'Cookie': devCookie },
    }));
    expect(devJobs.status).toBe(200);

    cleanup();
  });
});

describe('D02-fixture: navigation fixture lifecycle never leaves a stale bootstrap owner marker', () => {
  const bootstrapRequest = (email: string) => new Request('http://localhost:3000/api/platform/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    body: JSON.stringify({ email, password: 'password123456', name: 'Founder Test', token: 'test-bootstrap-token-12345' }),
  });

  test('a held-open fixture database cannot turn the next bootstrap into a 409', async () => {
    // This file used to be the source of the historical false signal: a
    // deterministic fixture path plus a cleanup that swallowed `unlinkSync`
    // failures left the `owner_bootstrapped` marker behind, so the next run of
    // the suite failed with 409 while the suite itself was perfectly green.
    const dbPath = `var/lib/qa/capability-nav-held-${RUN_ID}.sqlite`;
    const app = createPlatformApp({ databasePath: dbPath, bootstrapToken: 'test-bootstrap-token-12345' });
    registerFixtureApp(dbPath, app);

    const bootRes = await app.fetch(bootstrapRequest('founder-nav-fixture@test.local'));
    expect(bootRes.status).toBe(200);

    // A second connection keeps the database and its sidecars open — exactly
    // what a concurrent test run does. On Windows this makes the files
    // undeletable, which is what used to leave the owner marker behind.
    const holder = new Database(dbPath, { create: false, strict: true });
    holder.run('PRAGMA busy_timeout=5000;');

    try {
      cleanup(dbPath);

      // On Windows the held-open database survives the cleanup, which proves the
      // marker-clearing fallback is the code path that keeps the next run green.
      if (process.platform === 'win32') expect(existsSync(dbPath)).toBe(true);

      const probe = createPlatformApp({ databasePath: dbPath, bootstrapToken: 'test-bootstrap-token-12345' });
      registerFixtureApp(dbPath, probe);

      const statusRes = await probe.fetch(new Request('http://localhost:3000/api/platform/bootstrap-status'));
      expect(statusRes.status).toBe(200);
      const statusBody = await statusRes.json() as { data: { required: boolean } };
      expect(statusBody.data.required).toBe(true);

      const reBootRes = await probe.fetch(bootstrapRequest('founder-nav-fixture@test.local'));
      expect(reBootRes.status).toBe(200);
    } finally {
      holder.close();
      cleanup(dbPath);
    }
  });
});
