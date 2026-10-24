/**
 * Laluan API platform pada Vercel — pemulihan laluan berbahagian segmen.
 *
 * Vercel mendaftarkan fungsi `api/platform/[...path]` sebagai SATU segmen
 * sahaja (`^/api/platform/([^/]+)$`). Tanpa rewrite tersuai, `/api/platform/
 * auth/login` jatuh ke rule 404 Vercel dan route itu tidak pernah sampai ke
 * aplikasi — jadi log masuk produksi gagal dengan 404, bukan dengan 401.
 *
 * Ujian ini mengikat dua separuh perbaikan itu:
 *   1. `vercel.json` mesti menghantar semula laluan berbahagian segmen, dan
 *   2. `restorePlatformRoute` mesti memulihkan pathname sebenar supaya
 *      aplikasi platform menerima `/auth/login` dan bukan `/`.
 *
 * Kes negatif menguji apa yang TIDAK boleh berlaku: laluan keluar daripada
 * `/api/platform` ditolak, dan laluan tanpa `__route` tidak diubah.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { restorePlatformRoute } from '../../api/platform';

interface VercelConfig {
  rewrites?: { source: string; destination: string }[];
}

function vercelConfig(): VercelConfig {
  return JSON.parse(readFileSync(resolve(import.meta.dir, '../../vercel.json'), 'utf8')) as VercelConfig;
}

describe('Laluan API platform pada Vercel', () => {
  test('vercel.json menghantar semula laluan berbahagian segmen ke fungsi platform', () => {
    const rewrite = vercelConfig().rewrites?.find(entry => entry.source.includes('/api/platform'));
    expect(rewrite).toBeDefined();
    // Corak mesti membenarkan lebih daripada satu segmen selepas /api/platform.
    expect(rewrite?.source).toMatch(/(\*|\.\*)/);
    expect(rewrite?.destination).toContain('__route=');
  });

  test('POSITIF laluan berbahagian segmen dipulihkan ke pathname sebenar', () => {
    const restored = restorePlatformRoute(new URL('https://abangcolek.gangniaga.my/api/platform?__route=auth/login'));
    expect(restored).not.toBeNull();
    expect(restored?.pathname).toBe('/api/platform/auth/login');
    // Aplikasi platform membaca path sebagai pathname tanpa prefix /api/platform.
    expect(restored?.pathname.replace(/^\/api\/platform/, '')).toBe('/auth/login');
    // Parameter dalaman tidak boleh bocor ke lapisan aplikasi.
    expect(restored?.searchParams.get('__route')).toBeNull();
  });

  test('POSITIF query asal dikekalkan semasa pemulihan', () => {
    const restored = restorePlatformRoute(new URL('https://abangcolek.gangniaga.my/api/platform?__route=orders/track&token=abc'));
    expect(restored?.pathname).toBe('/api/platform/orders/track');
    expect(restored?.searchParams.get('token')).toBe('abc');
  });

  test('NEGATIF laluan tanpa __route tidak diubah', () => {
    const target = new URL('https://abangcolek.gangniaga.my/api/platform/session');
    expect(restorePlatformRoute(target)).toBeUndefined();
    expect(target.pathname).toBe('/api/platform/session');
  });

  test('NEGATIF laluan keluar daripada /api/platform ditolak', () => {
    const traversal = restorePlatformRoute(new URL('https://abangcolek.gangniaga.my/api/platform?__route=../admin'));
    expect(traversal).toBeNull();
  });

  test('NEGATIF laluan di luar /api/platform tidak dipulihkan', () => {
    expect(restorePlatformRoute(new URL('https://abangcolek.gangniaga.my/v2?__route=auth/login'))).toBeUndefined();
  });
});

// Kontrak production fail-closed: konfigurasi tiada tidak boleh membuka fallback SQLite.
test('production tanpa konfigurasi durable menolak permintaan', async () => {
  const { createProductionHandler } = await import('../../api/platform');
  const handler = createProductionHandler({});
  const response = await handler(new Request('https://abangcolek.gangniaga.my/api/platform/session'));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ok:false, code:'PLATFORM_CONFIGURATION_UNAVAILABLE'});
});
