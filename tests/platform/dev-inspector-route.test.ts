/**
 * EXT-01 / BL-22 — the local inspector ROUTE, proven end to end.
 *
 * This file lives in the server tree on purpose: the boundary rule forbids
 * `server/platform/**` from importing `server/agents/**`, and the inspector
 * implementation now lives in `server/platform/inspection/inspector.ts`. The
 * route proof belongs next to the layer it guards.
 *
 * What is proven (and what breaks the proof):
 *  - a production build answers 404 `INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION`
 *    BEFORE any session is resolved (the request carries no cookie at all, so
 *    a missing production gate would answer 401 instead of 404);
 *  - a customer session is refused with 403 `FORBIDDEN` (a missing role gate
 *    would answer 200 instead);
 *  - a founder session receives 200 with the REAL snapshot shape
 *    `{generatedAt, threads, totals, persistence, locality}`.
 */

import { describe, expect, test } from 'bun:test';
import { unlinkSync } from 'node:fs';
import { createPlatformApp } from '../../server/platform/app';

const RUN = `dev-inspector-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const BOOTSTRAP_TOKEN = 'dev-inspector-bootstrap-token-12345';

interface InspectorContext {
  app: ReturnType<typeof createPlatformApp>;
  databasePath: string;
  founderCookie: string;
  customerCookie: string;
}

async function createContext(testId: string): Promise<InspectorContext> {
  const databasePath = `var/lib/qa/dev-inspector-${RUN}-${testId}.sqlite`;
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      unlinkSync(databasePath + suffix);
    } catch {
      /* the file was not there */
    }
  }
  const app = createPlatformApp({
    databasePath,
    bootstrapToken: BOOTSTRAP_TOKEN,
    origin: 'http://localhost:3000',
  });
  const bootstrap = await app.fetch(
    new Request('http://localhost:3000/api/platform/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({
        email: `founder-${RUN}-${testId}@test.local`,
        password: 'password123456',
        name: 'Founder Inspector',
        token: BOOTSTRAP_TOKEN,
      }),
    }),
  );
  expect(bootstrap.status).toBe(200);
  const signup = await app.fetch(
    new Request('http://localhost:3000/api/platform/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({
        email: `customer-${RUN}-${testId}@test.local`,
        password: 'password123456',
        name: 'Customer Inspector',
      }),
    }),
  );
  expect(signup.status).toBe(200);
  return {
    app,
    databasePath,
    founderCookie: bootstrap.headers.get('set-cookie')!,
    customerCookie: signup.headers.get('set-cookie')!,
  };
}

function inspectorRequest(cookie?: string): Request {
  return new Request('http://localhost:3000/api/platform/dev/inspector', {
    headers: cookie ? { Cookie: cookie } : {},
  });
}

describe('BL-22 — the local inspector route', () => {
  test('a production build refuses the inspector before any session is resolved', async () => {
    const context = await createContext('production');
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      // No cookie: if the production gate were missing, the session resolution
      // would answer 401 instead of 404.
      const response = await context.app.fetch(inspectorRequest());
      expect(response.status).toBe(404);
      const body = (await response.json()) as { ok: boolean; code: string };
      expect(body.ok).toBe(false);
      expect(body.code).toBe('INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION');
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
      context.app.close();
    }
  });

  test('a customer session is refused with 403 FORBIDDEN', async () => {
    const context = await createContext('customer');
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const response = await context.app.fetch(inspectorRequest(context.customerCookie));
      expect(response.status).toBe(403);
      const body = (await response.json()) as { ok: boolean; code: string };
      expect(body.ok).toBe(false);
      expect(body.code).toBe('FORBIDDEN');
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
      context.app.close();
    }
  });

  test('a founder session receives the real snapshot shape', async () => {
    const context = await createContext('founder');
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const response = await context.app.fetch(inspectorRequest(context.founderCookie));
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        ok: boolean;
        data: {
          generatedAt: string;
          threads: unknown[];
          totals: { threads: number; toolCalls: number; errors: number; totalDurationMs: number };
          persistence: string;
          locality: string;
        };
      };
      expect(body.ok).toBe(true);
      expect(Object.keys(body.data).sort()).toEqual([
        'generatedAt',
        'locality',
        'persistence',
        'threads',
        'totals',
      ]);
      expect(typeof body.data.generatedAt).toBe('string');
      expect(Number.isNaN(Date.parse(body.data.generatedAt))).toBe(false);
      expect(Array.isArray(body.data.threads)).toBe(true);
      expect(Object.keys(body.data.totals).sort()).toEqual([
        'errors',
        'threads',
        'toolCalls',
        'totalDurationMs',
      ]);
      expect(body.data.persistence).toBe('in_memory');
      expect(body.data.locality).toBe('local');
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
      context.app.close();
    }
  });
});
