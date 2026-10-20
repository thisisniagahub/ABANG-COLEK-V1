/**
 * AbangColek Sovereign GrowthOS — Sesi platform: skop cookie, migrasi dan pencabutan
 *
 * Cookie sesi `platform_session` sebelum ini mempunyai `Path=/api/platform`.
 * Pelayar hanya menghantar cookie itu ke laluan di bawah `/api/platform`,
 * jadi `/api/copilotkit` dan `/api/mcp` TIDAK membawa sesi pelayar dan
 * memulangkan 401. Skop baharu meliputi `/api/platform`, `/api/copilotkit`,
 * `/api/mcp`, `/v2` dan `/copilotkit/v2` dengan SATU header `Set-Cookie`.
 *
 * Tiga hal yang dijaga di sini:
 *
 *  1. **Migrasi cookie lama.** Cookie versi lama (`Path=/api/platform`) dan
 *     cookie baharu (`Path=/`) boleh hidup bersama dalam pelayar yang sama.
 *     Oleh itu setiap login menghantar cookie baharu DAN mengosongkan cookie
 *     lama, dan pelayan menerima mana-mana nilai `platform_session` yang sah
 *     (lihat `Auth.resolve`).
 *  2. **Pencabutan tetap menutup.** `auth.logout` menandakan sesi sebagai
 *     revoked dalam store; selepas itu mana-mana nilai cookie ditolak dengan
 *     401.
 *  3. **Kuasa milik server.** Modul ini hanya menulis dan membaca bentuk
 *     cookie. Ia tidak pernah membaca actor, role atau tenant daripada badan
 *     permintaan.
 */

/** Nama cookie sesi platform. */
export const SESSION_COOKIE_NAME = 'platform_session';

/**
 * Skop cookie sesi.
 *
 * `Path=/` diperlukan kerana aplikasi melayani `/api/platform`,
 * `/api/copilotkit`, `/api/mcp`, `/v2` dan `/copilotkit/v2` pada origin yang
 * sama. Skop `/api` tidak meliputi `/v2` dan `/copilotkit/v2`, jadi ia akan
 * meninggalkan kelas defect yang sama.
 */
export const SESSION_COOKIE_PATH = '/';

/** Skop cookie versi lama yang perlu dikosongkan semasa migrasi. */
export const LEGACY_SESSION_COOKIE_PATH = '/api/platform';

/** Umur cookie sesi (12 jam) — tidak berubah. */
export const SESSION_COOKIE_MAX_AGE = 43_200;

/** Header `Set-Cookie` bagi cookie sesi yang sah. */
export function sessionCookieHeader(token: string, secure = false): string {
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    `Path=${SESSION_COOKIE_PATH}`,
    `Max-Age=${SESSION_COOKIE_MAX_AGE}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

/** Header `Set-Cookie` yang mengosongkan cookie pada skop tertentu. */
export function clearedCookieHeader(path: string): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=${path}; Max-Age=0`;
}

/** Header yang mengosongkan cookie lama `/api/platform` (migrasi BL-14). */
export function legacySessionCookieClearHeader(): string {
  return clearedCookieHeader(LEGACY_SESSION_COOKIE_PATH);
}

/** Header yang mengosongkan cookie sesi semasa. */
export function sessionCookieClearHeader(): string {
  return clearedCookieHeader(SESSION_COOKIE_PATH);
}

/**
 * Semua nilai `Set-Cookie` yang perlu dihantar selepas log masuk.
 *
 * Cookie sesi didahulukan (supaya `headers.get('set-cookie')` mula-mula
 * mengembalikan sesi), kemudian cookie lama dikosongkan.
 */
export function sessionCookieHeaders(token: string, secure = false): string[] {
  return [sessionCookieHeader(token, secure), legacySessionCookieClearHeader()];
}

/**
 * Semua nilai `Set-Cookie` yang perlu dihantar selepas log keluar.
 *
 * Kedua-dua skop dikosongkan: yang semasa (`/`) dan yang lama
 * (`/api/platform`). Cookie lama yang tertinggal sudah tidak berguna kerana
 * sesinya dicabut dalam store.
 */
export function sessionCookieClearHeaders(): string[] {
  return [sessionCookieClearHeader(), legacySessionCookieClearHeader()];
}

/**
 * Semua nilai cookie `platform_session` yang dihantar oleh pelayar.
 *
 * Pelayar boleh menghantar lebih daripada satu nilai selepas migrasi skop
 * (cookie lama dan cookie baharu). Semua nilai dikembalikan supaya pelayan
 * boleh mengesahkan sesi yang masih sah tanpa pernah mempercayai nilai
 * pertama secara membuta tuli.
 */
export function sessionCookieTokens(request: Request): string[] {
  const header = request.headers.get('cookie');
  if (!header) return [];
  const tokens: string[] = [];
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) continue;
    const value = trimmed.slice(SESSION_COOKIE_NAME.length + 1);
    if (value.length > 0) tokens.push(value);
  }
  return tokens;
}
