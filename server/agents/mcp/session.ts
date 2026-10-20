/**
 * AbangColek Sovereign GrowthOS — Server-side session → MCP actor
 *
 * Resolusi identiti untuk pelayan MCP. Identiti SELALU datang daripada sesi
 * server:
 *
 * 1. Cookie platform_session dikesahkan dengan hash di store sessions, atau
 * 2. `Authorization: Bearer <session token>` (kepada klien bukan pelayar,
 *    contoh pelayan MCP lain) — token dikverseas dengan hash yang sama.
 *
 * Tiada jalur lain: badan permintaan tidak pernah digunakan untuk menentukan
 * actor, dan `McpActor` tidak boleh dibina tanpa `Principal` yang disahkan.
 */

import { Auth } from '../../platform/auth';
import { DomainError, type PlatformStore } from '../../platform/store';
import { McpAccessError, toMcpActor, type McpActor } from './actor';

export interface SessionActorResolverOptions {
  /** Store kanonikal platform. Tanpa store, tiada sesi boleh disahkan. */
  store?: PlatformStore;
  /** Nama cookie sesi platform. */
  cookieName?: string;
}

const SESSION_COOKIE = 'platform_session';

function tokenFromCookie(request: Request, cookieName: string): string | undefined {
  const cookie = request.headers.get('cookie');
  if (!cookie) return undefined;
  for (const part of cookie.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${cookieName}=`)) continue;
    const value = trimmed.slice(cookieName.length + 1);
    return value.length > 0 ? value : undefined;
  }
  return undefined;
}

function tokenFromBearer(request: Request): string | undefined {
  const header = request.headers.get('authorization');
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/**
 * Membina resolver actor yang membaca sesi server sahaja.
 */
export function createSessionActorResolver(
  options: SessionActorResolverOptions,
): (request: Request) => Promise<McpActor> {
  const cookieName = options.cookieName ?? SESSION_COOKIE;

  return async (request: Request): Promise<McpActor> => {
    const store = options.store;
    if (!store) {
      throw new McpAccessError(
        'RUNTIME_NOT_READY',
        503,
        'Store platform tidak tersedia; sesi tidak boleh disahkan.',
      );
    }

    const token = tokenFromCookie(request, cookieName) ?? tokenFromBearer(request);
    if (!token) {
      throw new McpAccessError('UNAUTHENTICATED', 401, 'Sesi tidak dijumpai.');
    }

    // Auth.resolve() hanya melihat cookie; iaitu tiket server-side yang
    // mengesahkan sesi terhadap baris `sessions` dalam store.
    const authenticated = new Request(request.url, {
      method: request.method,
      headers: { cookie: `${cookieName}=${token}` },
    });

    try {
      const principal = new Auth(store).resolve(authenticated);
      return toMcpActor(principal);
    } catch (error) {
      if (error instanceof DomainError) {
        throw new McpAccessError(error.code, error.status, error.message);
      }
      throw error;
    }
  };
}
