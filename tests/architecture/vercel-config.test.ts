import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * REL-01 — konfigurasi Vercel mesti kekal sah skema.
 *
 * SEBAB (akar production tak bergerak 21–22 Okt 2026): `vercel.json` mengandungi
 * `includeFiles` di aras. Vercel CLI v65 menolak fail itu dengan "Invalid
 * vercel.json - should NOT have additional property `includeFiles`" ⇒ SEMUA
 * deploy (preview mahupun production) gagal dengan state ERROR, jadi alias
 * `abangcolek.gangniaga.my` kekal terikat pada build lama. Ujian ini ialah
 * guard awal: nama hartanah di aras mestilah dalam senarai yang dibenarkan.
 */

const ROOT = resolve(import.meta.dir, '../..');
const config = JSON.parse(readFileSync(resolve(ROOT, 'vercel.json'), 'utf8')) as Record<string, unknown>;

/**
 * Sifat aras yang sah mengikut schema Vercel semasa
 * (https://openapi.vercel.sh/vercel.json). `includeFiles` BUKAN sifat aras —
 * ia hanya sah di dalam `functions` (per-fungsi).
 */
const ALLOWED_TOP_LEVEL = new Set([
  '$schema',
  'buildCommand',
  'installCommand',
  'outputDirectory',
  'outputFileTracingIncludes',
  'framework',
  'cleanUrls',
  'trailingSlash',
  'rewrites',
  'redirects',
  'headers',
  'crons',
  'functions',
  'env',
  'regions',
  'build',
  'git',
  'ignore',
  'public',
  'images',
  'frameworkPreferences',
  'bunVersion',
  'nodeVersion',
  'install',
  'cache',
  'container',
  'sourcemaps',
  'archive',
]);

/**
 * Senaraikan nama pakej yang benar-benar disertakan oleh satu glob `includeFiles`.
 *
 * Vercel menerima SATU glob string, jadi beberapa pakej digabung dengan brace
 * expansion: `node_modules/{uuid,pkce-challenge}/**`. Fungsi ini mengekstrak
 * nama pakej itu supaya ujian boleh assert kehadiran pakej, bukan literal glob.
 */
function includedPackages(includeFiles: string | undefined): string[] {
  if (!includeFiles) return [];
  const packages = new Set<string>();
  // Kesetion: `node_modules/{a,b}/**` ⇒ {a,b}; `node_modules/x/**` ⇒ {x}
  for (const braceGroup of includeFiles.match(/\{([^}]+)\}/g) ?? []) {
    for (const name of braceGroup.slice(1, -1).split(',')) {
      const clean = name.trim();
      if (clean) packages.add(clean);
    }
  }
  const withoutBraces = includeFiles.replace(/\{[^}]+\}/g, '');
  for (const segment of withoutBraces.split(',')) {
    // Buang trailing '/**' DULU, baru buang prefix path. Jika prefix dibuang
    // dahulu, glob '**' yang tinggal akan menelan nama pakej.
    const name = segment.replace(/\/\*\*$/, '').replace(/^.*\//, '').replace(/^\*\*$/, '').trim();
    if (name && name !== '**') packages.add(name);
  }
  return [...packages];
}

test('vercel.json tidak ada sifat aras yang tolak skema Vercel', () => {
  const unknown = Object.keys(config).filter((key) => !ALLOWED_TOP_LEVEL.has(key));
  expect(unknown).toEqual([]);
});

test('includeFiles hanya sah di dalam functions, bukan di aras', () => {
  expect(Object.prototype.hasOwnProperty.call(config, 'includeFiles')).toBe(false);
  const functions = config.functions as Record<string, { includeFiles?: string }> | undefined;
  for (const [pattern, options] of Object.entries(functions ?? {})) {
    // Bentuk yang sah: satu glob string (bukan array, bukan objek).
    if (options.includeFiles !== undefined) {
      expect(typeof options.includeFiles).toBe('string');
      expect(pattern).toMatch(/^api\//);
    }
  }
});

test('fungsi MCP/CopilotKit membungkus pkce-challenge (akibat runtime)', () => {
  // @modelcontextprotocol/sdk melakukan `require("pkce-challenge")` pada aras
  // modul ⇒ tanpa bundle ini, fungsi production crash (FUNCTION_INVOCATION_FAILED).
  //
  // Pola includeFiles ialah SATU glob string, jadi beberapa pakej digabung
  // dengan brace expansion: `node_modules/{uuid,pkce-challenge}/**`. JANGAN
  // assert literal 'node_modules/pkce-challenge' — itu pecah bila glob
  // digabung. AssertPresenceByPackage yang、PC — apa yang benar-benar diperlukan.
  const functions = (config.functions ?? {}) as Record<string, { includeFiles?: string }>;
  for (const pattern of ['api/copilotkit.ts', 'api/copilot-mcp.ts', 'api/mcp.ts']) {
    expect(includedPackages(functions[pattern]?.includeFiles)).toContain('pkce-challenge');
  }
});

test('fungsi CopilotKit membungkus uuid (akibat runtime @ag-ui/client)', () => {
  // `@ag-ui/client` (import nilai dalam api/copilotkit.ts) meng-import `uuid`
  // pada aras modul ⇒ tanpa bundle ini, /api/copilotkit crash dengan
  // "Cannot find package 'uuid'" (bukti: docs/handover/IMPLEMENTATION-CHECKPOINT.md).
  const functions = (config.functions ?? {}) as Record<string, { includeFiles?: string }>;
  expect(includedPackages(functions['api/copilotkit.ts']?.includeFiles)).toContain('uuid');
});

test('setiap laluan API awam ada rewrite ke fail fungsi sebenar', () => {
  const rewrites = config.rewrites as { source: string; destination: string }[];
  const sources = rewrites.map((rewrite) => rewrite.source);
  expect(sources).toContain('/api/platform/:route*');
  expect(sources).toContain('/api/copilotkit/:route*');
  expect(sources).toContain('/api/copilot-mcp/:route*');
  for (const rewrite of rewrites) {
    if (rewrite.destination.includes('__route=:route*')) {
      const target = rewrite.destination.split('?')[0].replace(/^\//, '');
      expect(existsSync(resolve(ROOT, `${target}.ts`))).toBe(true);
    }
  }
});

test('cron hanya menunjuk ke fungsi API yang wujud', () => {
  const crons = (config.crons ?? []) as { path: string; schedule: string }[];
  for (const cron of crons) {
    const file = resolve(ROOT, `.${cron.path}.ts`);
    expect(existsSync(file)).toBe(true);
    expect(cron.schedule).toMatch(/^(\S+ ){4}\S+$/);
  }
});

test('build dan install command kekal bun', () => {
  expect(String(config.buildCommand)).toContain('bun run build');
  expect(String(config.installCommand)).toContain('bun install');
  expect(String(config.outputDirectory)).toBe('dist');
});
