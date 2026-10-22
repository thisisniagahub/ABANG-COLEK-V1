import { createPlatformApp } from '../server/platform/app';
import { MAX_PLATFORM_REQUEST_BYTES } from '../shared/upload-limits';
import { boundedBody } from '../server/platform/evidenceFiles';
import { DomainError } from '../server/platform/store';
import { boundHostedResponse } from '../server/platform/hostedResponse';
import { resolveRequestUrl } from '../server/platform/requestUrl';
import { createGoogleIdentityVerifier } from '../server/platform/googleIdentity';
import { drainLocalJobs } from '../server/automation/cloudWorker';
import { createDurableHandler, SupabaseEvidenceStorage, SupabaseSnapshotRepository } from '../server/platform/supabasePersistence';

/** Includes multipart overhead and stays below Vercel's 4.5 MB function limit. */
export const MAXIMUM_REQUEST_BYTES = MAX_PLATFORM_REQUEST_BYTES;
type Environment = Record<string, string | undefined>;
const productionOrigin = 'https://abangcolek.gangniaga.my';

/**
 * Nama parameter query yang membawa laluan API platform yang dipulihkan.
 *
 * Vercel mendaftarkan fungsi `api/platform/[...path]` sebagai SATU segmen
 * sahaja (`^/api/platform/([^/]+)$`); laluan berbahagian segmen seperti
 * `/api/platform/auth/login` tidak akan sampai ke fungsi ini. `vercel.json`
 * menghantar semula segmen tersebut melalui parameter ini, dan di sini
 * pathname sebenar dipulihkan supaya aplikasi platform menerima
 * `/auth/login` dan bukan `/`.
 */
const ROUTE_QUERY = '__route';

/**
 * Memulihkan pathname sebenar daripada parameter `__route`.
 *
 * Mengembalikan `undefined` apabila tiada pemulihan diperlukan, `null`
 * apabila laluan itu tidak selamat (percubaan keluar daripada
 * `/api/platform`), dan URL yang telah dipulihkan jika ada.
 */
export function restorePlatformRoute(target: URL): URL | null | undefined {
  const route = target.searchParams.get(ROUTE_QUERY);
  if (route === null || route === '') return undefined;
  if (target.pathname !== '/api/platform') return undefined;
  const suffix = route.startsWith('/') ? route : `/${route}`;
  if (suffix.split('/').includes('..')) return null;
  const restored = new URL(target.toString());
  restored.pathname = `/api/platform${suffix}`;
  restored.searchParams.delete(ROUTE_QUERY);
  return restored;
}

function failure(status: number, code: string, message: string): Response {
  return Response.json({ ok: false, code, message }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

function trustedOrigins(value: string | undefined): string[] {
  const values = value === undefined ? [productionOrigin] : value.split(',').map(item => item.trim());
  if (!values.length || values.some(value => {
    try { const url = new URL(value); return url.protocol !== 'https:' || url.origin !== value; } catch { return true; }
  })) throw new Error('Invalid origin configuration.');
  return [...new Set(values)];
}

/** Lazily initializes server-only credentials; import and frontend builds need no secrets. */
export function createProductionHandler(environment: Environment, bodyTimeoutMs = 10000) {
  let handler: ((request: Request) => Promise<Response>) | undefined;
  return async (request: Request): Promise<Response> => {
    const target = resolveRequestUrl(request);
    const restored = restorePlatformRoute(target);
    if (restored === null) return failure(404, 'NOT_FOUND', 'Halaman API tidak ditemui.');
    const routeTarget = restored ?? target;
    const pathname = routeTarget.pathname;
    if (
      pathname !== '/api/platform' &&
      !pathname.startsWith('/api/platform/') &&
      pathname !== '/v2' &&
      !pathname.startsWith('/v2/') &&
      pathname !== '/copilotkit/v2' &&
      !pathname.startsWith('/copilotkit/v2/')
    ) {
      return failure(404, 'NOT_FOUND', 'Halaman API tidak ditemui.');
    }
    const length = request.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAXIMUM_REQUEST_BYTES)) {
      return failure(413, 'REQUEST_TOO_LARGE', 'Saiz permintaan maksimum ialah 4 MB termasuk metadata fail.');
    }
    if (!handler) {
      try {
        const url = environment.SUPABASE_URL?.trim();
        const key = (environment.SUPABASE_SECRET_KEY ?? environment.SUPABASE_SERVICE_ROLE_KEY)?.trim();
        if (!url || !key) throw new Error('Missing server configuration.');
        const origins = trustedOrigins(environment.PLATFORM_ALLOWED_ORIGINS);
        const workspace = environment.PLATFORM_WORKSPACE_ID ?? 'business';
        const repository = new SupabaseSnapshotRepository(url, key, workspace);
        const evidenceStorage = new SupabaseEvidenceStorage(url, key, workspace);
        handler = createDurableHandler(repository, databasePath => {
          const app = createPlatformApp({
          databasePath,
          persistenceMode: 'supabase',
          evidenceStorage,
          googleIdentityVerifier: createGoogleIdentityVerifier(url,key),
          bootstrapToken: environment.PLATFORM_BOOTSTRAP_TOKEN,
          origin: origins[0],
          allowedOrigins: origins,
          log: entry => console.warn(JSON.stringify({component:'platform_api',...entry})),
          });
          return {store:app.store,close:()=>app.close(),fetch:async request=>{
            drainLocalJobs(app.jobs,{maximumJobs:2,workerId:'vercel-request'});
            return app.fetch(request);
          }};
        });
      } catch {
        return failure(503, 'PLATFORM_CONFIGURATION_UNAVAILABLE', 'Konfigurasi platform belum tersedia. Hubungi pentadbir.');
      }
    }
    // Count actual bytes too: chunked clients cannot bypass the declared-length check.
    let payload: BodyInit | undefined;
    if (request.body) {
      try {
        const bytes = await boundedBody(request, MAXIMUM_REQUEST_BYTES, bodyTimeoutMs);
        payload = bytes as BodyInit;
      } catch (error) {
        if (error instanceof DomainError && error.status === 408) return failure(408, 'REQUEST_TIMEOUT', 'Permintaan mengambil masa terlalu lama. Cuba semula.');
        if (error instanceof DomainError && error.status === 413) return failure(413, 'REQUEST_TOO_LARGE', 'Saiz permintaan maksimum ialah 4 MB termasuk metadata fail.');
        return failure(400, 'INVALID_REQUEST_BODY', 'Permintaan tidak dapat dibaca. Cuba semula.');
      }
    }
    if (restored) request = new Request(routeTarget, { method: request.method, headers: request.headers, ...(payload === undefined ? {} : { body: payload }) });
    else if (payload !== undefined) request = new Request(request, { body: payload });
    return boundHostedResponse(await handler(request));
  };
}

export default { fetch: createProductionHandler(process.env) };
