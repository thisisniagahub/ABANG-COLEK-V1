import { expect, test } from 'bun:test';
import { call, harness, user } from './backend-security.test';
import { drainLocalJobs, createCloudWorkerHandler } from '../../server/automation/cloudWorker';
import { createDurableHandler, type SnapshotRepository } from '../../server/platform/supabasePersistence';
import { createPlatformApp } from '../../server/platform/app';
import { DomainError } from '../../server/platform/store';

test('cloud drain bounds local work and does not execute blocked research', async () => {
  const { app } = harness(), founder = await user(app, 'cloud-worker-founder', true);
  for (let index = 0; index < 3; index++) await call(app, '/jobs', { kind: 'morning_brief', entityId: 'business', skillVersion: 'local-v1', scope: 'business' }, founder, { 'Idempotency-Key': `cloud-job-${index}` });
  await call(app, '/jobs', { kind: 'research', entityId: 'business', skillVersion: 'local-v1', scope: 'business' }, founder, { 'Idempotency-Key': 'cloud-research' });
  expect(drainLocalJobs(app.jobs, { maximumJobs: 2 }).processed).toBe(2);
  expect(app.store.all('job_artifacts')).toHaveLength(2);
  expect(drainLocalJobs(app.jobs).processed).toBe(1);
  expect(drainLocalJobs(app.jobs).processed).toBe(0);
  expect(app.store.all<{ status: string }>('jobs').filter(job => job.status === 'blocked')).toHaveLength(1);
  expect(() => drainLocalJobs(app.jobs, { maximumJobs: 100 })).toThrow();
});

test('worker requires exact bearer secret before touching durable storage', async () => {
  let calls = 0;
  const handler = createCloudWorkerHandler({ CRON_SECRET: 'a-long-random-worker-secret-value' }, async () => { calls++; return Response.json({ ok: true }); });
  const deniedHeaders: Record<string, string>[] = [{}, { Authorization: 'Bearer wrong' }, { Cookie: 'platform_session=ignored' }];
  for (const headers of deniedHeaders) {
    expect((await handler(new Request('https://example.test/api/platform-worker', { headers }))).status).toBe(401);
  }
  expect(calls).toBe(0);
  expect((await handler(new Request('https://example.test/api/platform-worker', { headers: { Authorization: 'Bearer a-long-random-worker-secret-value' } }))).status).toBe(200);
  expect(calls).toBe(1);
  expect((await handler(new Request('https://example.test/api/platform-worker', { method: 'POST', headers: { Authorization: 'Bearer a-long-random-worker-secret-value' } }))).status).toBe(405);
  expect((await createCloudWorkerHandler({})(new Request('https://example.test/api/platform-worker'))).status).toBe(503);
});

test('free-text automation cannot be enabled without an executor', async () => {
  const { app } = harness(), session = await user(app, 'scheduler-founder', true);
  const owner = app.auth.resolve(new Request('http://localhost', { headers: { Cookie: session.cookie } }));
  const definition = app.automationDefinitions.save(owner, { name: 'Daily report', instruction: 'Generate report', mode: 'schedule', scheduleKind: 'recurring', scheduleExpression: 'daily', destination: 'report' });
  expect(() => app.automationDefinitions.toggle(owner, definition.id, { expectedRevision: definition.revision, status: 'enabled' })).toThrow('executor yang disahkan');
  expect(app.store.get<{ status: string }>('automation_definitions', definition.id)?.status).toBe('paused');
  // Legacy saved configurations must not imply a live consumer exists.
  app.store.save('automation_definitions', { ...definition, status: 'enabled' });
  expect(app.automationDefinitions.all(owner)[0]).toMatchObject({ status: 'paused', readinessReason: 'AUTOMATION_EXECUTOR_UNAVAILABLE' });
  expect(app.store.get<{ status: string }>('automation_definitions', definition.id)?.status).toBe('enabled');
});

test('concurrent cloud workers retry CAS without duplicating durable artifacts', async () => {
  const { app } = harness(), founder = await user(app, 'concurrent-worker-founder', true);
  await call(app, '/jobs', { kind: 'morning_brief', entityId: 'business', skillVersion: 'local-v1', scope: 'business' }, founder, { 'Idempotency-Key': 'concurrent-cloud-job' });
  let bytes: Uint8Array = app.store.db.serialize(), revision = 1, conflicts = 0;
  const repository: SnapshotRepository = {
    load: async () => ({ bytes, revision }),
    commit: async (expected, next) => {
      if (expected !== revision) { conflicts++; throw new DomainError('SNAPSHOT_CONFLICT', 409); }
      bytes = next; revision++;
    },
  };
  const handler = createDurableHandler(repository, databasePath => {
    const instance = createPlatformApp({ databasePath });
    return { store: instance.store, close: () => instance.close(), fetch: async () => Response.json(drainLocalJobs(instance.jobs)) };
  });
  const results = await Promise.all([handler(new Request('https://example.test/worker')), handler(new Request('https://example.test/worker'))]);
  expect(results.map(result => result.status)).toEqual([200, 200]);
  expect(conflicts).toBe(1);
  const verify = createDurableHandler(repository, databasePath => {
    const instance = createPlatformApp({ databasePath });
    return { store: instance.store, close: () => instance.close(), fetch: async () => Response.json({ artifacts: instance.store.all('job_artifacts').length, statuses: instance.store.all<{ status: string }>('jobs').map(job => job.status) }) };
  });
  expect(await (await verify(new Request('https://example.test/worker'))).json()).toEqual({ artifacts: 1, statuses: ['completed'] });
});
