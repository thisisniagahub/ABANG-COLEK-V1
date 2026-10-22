/**
 * Resolusi URL permintaan untuk fungsi `api/*.ts` yang dijalankan pada Vercel.
 *
 * ❗_isu sebenar: `new URL(request.url)` melontar `TypeError: Invalid URL`
 * apabila `request.url` hanya pathname relatif (`/api/copilotkit`). Vercel
 * menghantar URL relatif dalam beberapa laluan (adapter Node untuk handler
 * yang dieksport terus, dan sebahagian fungsi yang dibina semula). Kesannya
 * setiap laluan `/api/copilotkit` membalas 500 di produksi.
 *
 * Rujukan berfungsi di produksi: `api/platform.ts` dan `api/mcp.ts` yang
 * mengeksport `{ fetch }` — Vercel membina `Request` dengan URL mutlak untuk
 * gaya itu. Helper ini ditambah sebagai lapisan kedua supaya URL relatif
 * tidak pernah melontar, walaupun gaya eksport atau runtime berubah.
 */

/** Header yang Vercel/proxy standard hantar untuk host asal permintaan. */
const FORWARDED_HOST_HEADERS = ['x-forwarded-host', 'host'] as const;
const FORWARDED_PROTO_HEADERS = ['x-forwarded-proto'] as const;

/** Host yang sah untuk fallback — bukan host sebenar, hanya untuk URL parsing. */
const FALLBACK_ORIGIN = 'http://localhost';

function headerValue(request: Request, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = request.headers?.get?.(name);
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return undefined;
}

/**
 * Bina URL mutlak daripada mana-mana URL permintaan.
 *
 * - URL mutlak → dikembalikan terus.
 * - URL relatif → digabungkan dengan host/proto daripada header permintaan.
 * - Tiada host → `http://localhost` (parsing sah, tiada rangkaian keluar).
 */
export function resolveRequestUrl(request: Request): URL {
  const raw = request.url;
  try {
    return new URL(raw);
  } catch {
    // Teruskan: `raw` ialah URL relatif.
  }

  const host = headerValue(request, FORWARDED_HOST_HEADERS);
  const proto = headerValue(request, FORWARDED_PROTO_HEADERS) ?? 'http';
  const origin = host ? `${proto}://${host}` : FALLBACK_ORIGIN;

  try {
    return new URL(raw, origin);
  } catch {
    // URL palingirat — pulangkan URL mutlak yang sah supaya chain calling
    // tidak melontar. Pathname dikekalkan supaya diagnostik masih tepat.
    return new URL(FALLBACK_ORIGIN);
  }
}

/**
 * URL mutlak untuk permintaan, dengan `searchParams` boleh ditulis.
 *
 * `URL` pulangan oleh `resolveRequestUrl` sentiasa baharu — jadi
 * `searchParams.delete()` pada salinan itu tidak mengubah URL asal.
 */
export function withMutableSearchParams(request: Request): URL {
  return new URL(resolveRequestUrl(request).toString());
}
