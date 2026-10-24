/**
 * Shared test harness helper — extracted from backend-security.test.ts
 * to eliminate duplication across 8 platform test files.
 * 
 * Existing importers of ./backend-security.test MUST continue to work.
 */
import { afterEach, expect } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPlatformApp } from '../../server/platform/app';

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const fn of cleanups.splice(0)) fn();
});

/**
 * Shared async call function for platform API tests.
 * Makes a request to the platform API and returns { response, json }.
 */
async function call(app: ReturnType<typeof createPlatformApp>, path: string, body?: unknown, session?: { cookie: string; csrf: string }, extra: Record<string, string> = {}) {
  const response = await app.fetch(new Request(`http://localhost:3010/api/platform${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', 'Idempotency-Key': crypto.randomUUID() }),
      ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
  return { response, json: await response.json() };
}

/**
 * Shared async user function for platform API tests.
 * Signs up / boots a user and returns { cookie, csrf, userId }.
 */
async function user(app: ReturnType<typeof createPlatformApp>, name: string, founder = false, bootstrapToken = 'test-bootstrap-token-long-enough') {
  const result = await call(app, founder ? '/auth/bootstrap' : '/auth/signup', {
    email: `${name}@example.test`,
    name,
    password: 'a strong local password 123',
    ...(founder ? { token: bootstrapToken } : {}),
  });
  expect(result.response.status).toBe(200);
  return {
    cookie: result.response.headers.get('set-cookie')!.split(';')[0],
    csrf: result.json.data.csrfToken,
    userId: result.json.data.user.id,
  };
}

/**
 * Create a test harness with a customizable bootstrap token.
 * The token defaults to 'test-bootstrap-token-long-enough' for compatibility
 * with the 20 importers of ./backend-security.test, but each migrating file
 * can pass its own token.
 * 
 * Returns { app, call, user, directory } so tests can destructure:
 *   const { call, user } = harness('token');
 */
function harness(bootstrapToken = 'test-bootstrap-token-long-enough') {
  const directory = mkdtempSync(join(tmpdir(), 'abangcolek-api-'));
  const app = createPlatformApp({ databasePath: join(directory, 'test.sqlite'), bootstrapToken, origin: 'http://localhost:3000' });
  
  cleanups.push(() => {
    try { app.close(); } catch { /* already closed */ }
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    app, directory,
    call: async (path: string, body?: unknown, session?: {cookie: string; csrf: string}, extra: Record<string, string> = {}) => {
      const result = await call(app, path, body, session, extra);
      return { status: result.response.status, body: result.json, cookie: result.response.headers.get('set-cookie') };
    },
    user: (name: string, founder = false) => user(app, name, founder, bootstrapToken),
  };
}

/** Re-export the shared call and user for direct import */
export { call, user };
export { harness };