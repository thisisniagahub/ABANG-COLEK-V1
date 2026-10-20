import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPlatformApp } from '../../server/platform/app';

const cleanup: (() => void)[] = [];
const NATIVE_ENV_KEYS = [
  'TYPESAFE_API_KEY',
  'KILO_API_KEY',
  'JEV_NATIVE_ENABLED',
  'JEV_NATIVE_TERMS_ACCEPTED',
  'JEV_NATIVE_DATA_HANDLING_APPROVED',
  'JEV_NATIVE_SPEND_APPROVED',
];
const savedEnv = NATIVE_ENV_KEYS.map(key => [key, process.env[key]] as const);
// Native gates are cleared so the suite can never reach the real provider.
for (const key of NATIVE_ENV_KEYS) delete process.env[key];
afterEach(() => {
  cleanup.splice(0).forEach(close => close());
  for (const [key, value] of savedEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
type Session = { cookie: string; csrf: string; userId: string };

function harness() {
  const directory = mkdtempSync(join(tmpdir(), 'jev-native-api-'));
  const app = createPlatformApp({ databasePath: join(directory, 'test.sqlite'), bootstrapToken: 'jev-native-bootstrap', origin: 'http://localhost:3000' });
  cleanup.push(() => { app.close(); rmSync(directory, { recursive: true, force: true }); });
  async function call(path: string, body?: unknown, session?: Session) {
    const response = await app.fetch(new Request(`http://localhost:3010/api/platform${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' }), ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }));
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
  }
  async function user(name: string, founder = false): Promise<Session> {
    const result = await call(founder ? '/auth/bootstrap' : '/auth/signup', { email: `${name}@example.test`, password: 'strong test-only password 123', name, ...(founder ? { token: 'jev-native-bootstrap' } : {}) });
    expect(result.status).toBe(200);
    return { userId: result.body.data.user.id, cookie: result.cookie!.split(';')[0], csrf: result.body.data.csrfToken };
  }
  return { app, call, user };
}

test('native TypeSafe assessment stays unavailable and unconnected until the native gate is opened', async () => {
  const { call, user } = harness();
  expect((await call('/jev/native-assessments')).status).toBe(401);
  const founder = await user('jev-native-founder', true), developer = await user('jev-native-developer');
  const grant = await call('/people/grants', { userId: developer.userId, role: 'developer', outletIds: [], expectedVersion: 0 }, founder);
  expect(grant.status).toBe(200);

  const context = await call('/jev/context?packId=developer&entityId=runtime', undefined, developer);
  expect(context.status).toBe(200);
  const assessment = await call('/jev/native-assessments', { packId: 'developer', entityId: 'runtime', expectedRevision: context.body.data.entityRevision }, developer);

  expect(assessment.status).toBe(200);
  expect(assessment.body.data.providerMode).toBe('TYPESAFE_NATIVE');
  expect(assessment.body.data.status).toBe('UNAVAILABLE');
  expect(assessment.body.data.receipt).toBeUndefined();
  expect(assessment.body.data.abstentionReasons).toContain('kilo_gateway:JEV_NATIVE_DISABLED');
  expect(assessment.body.data.abstentionReasons).toContain('JEV_NATIVE_NO_ELIGIBLE_TRANSPORT');
  expect(assessment.body.data.policy.outcome).toBe('REVIEW_REQUIRED');
  expect(assessment.body.data.policy.reasonCodes).toContain('AUTHORITATIVE_POLICY_AND_APPROVAL_REQUIRED');

  const listed = await call('/jev/native-assessments', undefined, developer);
  expect(listed.status).toBe(200);
  expect(listed.body.data).toHaveLength(1);
  expect(listed.body.data[0].id).toBe(assessment.body.data.id);

  const route = await call('/jev/native-route', undefined, developer);
  expect(route.status).toBe(200);
  expect(route.body.data.mode).toBe('LOCAL_RULES');
  expect(route.body.data.transport).toBeNull();
  expect(route.body.data.reasonCodes).toContain('JEV_NATIVE_NO_ELIGIBLE_TRANSPORT');

  const packs = await call('/jev/packs', undefined, developer);
  expect(packs.body.data[0].nativeMode.providerMode).toBe('TYPESAFE_NATIVE');
  expect(packs.body.data[0].nativeMode.status).toBe('LOCAL_RULES_ONLY');
  expect(packs.body.data[0].nativeAvailable).toBe(false);
});

test('a member without evaluator scope cannot trigger a native provider call', async () => {
  const { call, user } = harness();
  await user('jev-native-founder-2', true);
  const member = await user('jev-native-member');
  expect((await call('/jev/native-assessments', { packId: 'developer', entityId: 'runtime', expectedRevision: 1 }, member)).status).toBe(403);
});
