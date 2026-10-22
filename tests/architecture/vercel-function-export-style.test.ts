/**
 * ARC-09 — Gaya eksport fungsi `api/*.ts` mesti `{ fetch }`.
 *
 * Vercel membezakan dua gaya eksport untuk fungsi `api/*.ts`:
 *   - `export default { fetch: handler }` → Vercel membina `Request` dengan
 *     `request.url` ABSOLUT.
 *   - `export default handler` (fungsi terus) → Vercel memanggil handler
 *     daripada adapter Node; `request.url` then hanya pathname RELATIF
 *     (`/api/copilotkit`).
 *
 * `api/copilotkit.ts` kini memerlukan `new URL(request.url)` untuk memulihkan
 * laluan daripada parameter `__route`. Dengan URL relatif, `new URL()` melontar
 * `TypeError: Invalid URL` (ERR_INVALID_URL) dan SETIAP laluan CopilotKit
 * balas 500 di produksi —otinomial disahkan pada 2026-10-22 selepas push
 * commit `050b0ce` ("require a verified session on the CopilotKit agent route")
 * yang menambah `restoreRoute`.
 *
 * Rujukan functioning di produksi: `api/platform.ts` dan `api/mcp.ts` — kedua
 *-duanya mengeksport `{ fetch }`.
 *
 * Guard ini mengikat COUNTDOWN secara eksplisit: setiap fungsi `api/*.ts`
 * mesti mengeksport objek `{ fetch }`, dan handler itu mesti menerima URL
 * ABSOLUT tanpa melontar.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const API_DIR = resolve(import.meta.dir, '../../api');
const REPO_ROOT = resolve(import.meta.dir, '../..');

/** Fail `api/*.ts` di peringkat teratas sahaja (bukan subdirektori). */
function apiEntryFiles(): string[] {
  return readdirSync(API_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name)
    .sort();
}

describe('ARC-09 — gaya eksport fungsi api/ untuk Vercel', () => {
  test('setiap fungsi api/*.ts mengeksport { fetch } (bukan fungsi terus)', () => {
    const offenders: string[] = [];

    for (const name of apiEntryFiles()) {
      const source = readFileSync(resolve(API_DIR, name), 'utf8');
      // Re-export (`export { default } from './mcp'`) mewarisi gaya fail yang
      // dieksport — ia sah asalkan fail sumbernya `{ fetch }`.
      const isReExport = /export\s*\{\s*default\s*\}\s*from/.test(source);
      if (isReExport) continue;

      const declaresFetchObject = /export\s+default\s*\{[^}]*\bfetch\b/s.test(source);
      if (!declaresFetchObject) offenders.push(name);
    }

    if (offenders.length > 0) {
      console.error(
        'Fungsi api/ yang mengeksport handler terus (request.url akan relatif):',
        offenders
      );
    }
    expect(offenders).toEqual([]);
  });

  test('eksport default api/copilotkit.ts ialah objek dengan fetch', async () => {
    const module = (await import(resolve(API_DIR, 'copilotkit.ts'))) as {
      default?: unknown;
    };
    expect(typeof module.default).toBe('object');
    expect(module.default).not.toBeNull();
    expect(typeof (module.default as { fetch?: unknown }).fetch).toBe('function');
  });

  test('eksport default api/platform.ts dan api/mcp.ts juga objek dengan fetch', async () => {
    for (const name of ['platform.ts', 'mcp.ts']) {
      const module = (await import(resolve(API_DIR, name))) as { default?: unknown };
      expect(typeof module.default).toBe('object');
      expect(typeof (module.default as { fetch?: unknown }).fetch).toBe('function');
    }
  });

  test('handler copilotkit menerima URL ABSOLUT tanpa melontar (regresi 500)', async () => {
    const module = (await import(resolve(API_DIR, 'copilotkit.ts'))) as {
      default: { fetch: (request: Request) => Promise<Response> };
    };
    const handler = module.default.fetch;

    // URL mutlak — apa yang Vercel hantar bagi gaya `{ fetch }`.
    const absolute = new Request('https://abangcolek.gangniaga.my/api/copilotkit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const response = await handler(absolute);
    // 401/403 = laluan reached, pengesahan berfungsi. 500 = `new URL()` melontar.
    expect(response.status).not.toBe(500);
  });

  test('URL RELATIF tidak lagi melontar ERR_INVALID_URL (regresi sebenar)', async () => {
    const module = (await import(resolve(API_DIR, 'copilotkit.ts'))) as {
      default: { fetch: (request: Request) => Promise<Response> };
    };
    const handler = module.default.fetch;

    // `new Request('/api/copilotkit')` melontar dalam Node/undici — jadi
    // ulang-webkit Request supaya `url` jadi relatif, seperti adapter Vercel
    // hantar untuk handler yang dieksport terus.
    const relative = Object.create(Request.prototype) as Request;
    Object.defineProperty(relative, 'url', { value: '/api/copilotkit' });
    Object.defineProperty(relative, 'method', { value: 'POST' });
    Object.defineProperty(relative, 'headers', { value: new Headers() });

    let thrown: unknown;
    try {
      await handler(relative);
    } catch (error) {
      thrown = error;
    }
    // Selepas fix, handler mesti TIDAK melontar ERR_INVALID_URL.
    const message = thrown instanceof Error ? thrown.message : String(thrown ?? '');
    expect(message).not.toContain('Invalid URL');
  });

  test('vercel.json tidak menetapkan includeFiles pada fungsi tanpa { fetch }', () => {
    const config = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'vercel.json'), 'utf8')
    ) as { functions?: Record<string, { includeFiles?: string }> };
    const functions = config.functions ?? {};

    for (const [target] of Object.entries(functions)) {
      const fileName = target.split('/').pop();
      if (!fileName) continue;
      const source = readFileSync(resolve(API_DIR, fileName), 'utf8');
      const isReExport = /export\s*\{\s*default\s*\}\s*from/.test(source);
      if (isReExport) continue;
      expect(source).toMatch(/export\s+default\s*\{[^}]*\bfetch\b/s);
    }
  });
});
