import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createPlatformApp } from '../platform/app';
import { createDurableHandler, SupabaseSnapshotRepository } from '../platform/supabasePersistence';
import { integer } from '../platform/store';
import type { Jobs } from './jobs';

/** Only deterministic, first-party SQLite work belongs inside a replayable CAS attempt. */
export function drainLocalJobs(jobs: Jobs, options: { maximumJobs?: number; workerId?: string } = {}) {
  const maximum = integer(options.maximumJobs ?? 5, 'Maximum worker jobs', 1, 10);
  const workerId = options.workerId ?? `cloud-${randomUUID()}`;
  let processed = 0;
  for (; processed < maximum; processed++) {
    const job = jobs.claimJob(workerId);
    if (!job) break;
    jobs.executeLocal(job.id, workerId);
  }
  return { processed };
}

type Environment = Record<string, string | undefined>;
type Handler = (request: Request) => Promise<Response>;
function response(status: number, code: string) {
  return Response.json({ ok: status === 200, code }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

/** Cron authentication is independent of browser sessions and never accepts query-string keys. */
export function createCloudWorkerHandler(environment: Environment, injectedHandler?: Handler): Handler {
  let durable = injectedHandler;
  return async request => {
    const secret = environment.CRON_SECRET;
    if (!secret || secret.length < 24 || secret.length > 1024) return response(503, 'WORKER_CONFIGURATION_UNAVAILABLE');
    if (request.method !== 'GET') return response(405, 'METHOD_NOT_ALLOWED');
    const provided = request.headers.get('authorization') ?? '';
    // Fixed-size hashes keep comparison timing independent of the presented token length.
    if (provided.length > 2048 || !timingSafeEqual(createHash('sha256').update(provided).digest(), createHash('sha256').update(`Bearer ${secret}`).digest())) return response(401, 'UNAUTHORIZED');
    if (!durable) {
      try {
        const url = environment.SUPABASE_URL?.trim(), key = (environment.SUPABASE_SECRET_KEY ?? environment.SUPABASE_SERVICE_ROLE_KEY)?.trim();
        if (!url || !key) throw new Error('Missing server configuration.');
        const repository = new SupabaseSnapshotRepository(url, key, environment.PLATFORM_WORKSPACE_ID ?? 'business');
        durable = createDurableHandler(repository, databasePath => {
          const app = createPlatformApp({ databasePath, persistenceMode: 'supabase' });
          return {
            store: app.store,
            close: () => app.close(),
            fetch: async () => Response.json({ ok: true, data: drainLocalJobs(app.jobs, { maximumJobs: 10 }) }, { headers: { 'Cache-Control': 'no-store' } }),
          };
        });
      } catch { return response(503, 'WORKER_CONFIGURATION_UNAVAILABLE'); }
    }
    return durable(request);
  };
}
