import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Pagar "satu entrypoint aplikasi" (contract §3:60 — tiada fetch/chat history
 * kedua).
 *
 * Audit 21 Okt 2026 jumpa `src/App.tsx` (65 KB) ialah fail MATI: `index.html`
 * memuat `/src/main.tsx`, `main.tsx` render `AppRouter`, dan TIDAK ADA satu pun
 * fail yang mengimport `src/App.tsx`. Semua kerja tema/butang jenama yang
 * dibuat dalam fail itu tiada kesan runtime langsung — dan sesi akan datang
 * akan terus mengemas fail mati.
 *
 * Ujian ini menjadikan keadaan itu mustahil berlaku semula.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('Pagar entrypoint aplikasi', () => {
  test('index.html memuat SATU entrypoint: /src/main.tsx', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((match) => match[1]);
    expect(scripts).toEqual(['/src/main.tsx']);
  });

  test('main.tsx merender AppRouter (bukan laluan aplikasi kedua)', () => {
    const main = readFileSync(join(SRC, 'main.tsx'), 'utf8');
    expect(main).toContain('AppRouter');
    expect(main).not.toMatch(/from\s+['"]\.\/App['"]/);
  });

  test('TIDAK ADA fail src/ yang mengimport App.tsx yang mati', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (file.endsWith(`${'App.tsx'}`)) continue;
      const source = readFileSync(file, 'utf8');
      // Segmen terakhir import mesti tepat "App" (bukan "KioskApp"/"SomeApp")
      // dan tiadaNama pakej luar (contoh 'firebase/app').
      if (/from\s+['"](?:\.{1,2}\/)*(?:[\w-]+\/)*App['"]/.test(source)) {
        offenders.push(file.replace(`${ROOT}\\`, ''));
      }
    }
    expect(offenders).toEqual([]);
  });

  test('fail App.tsx yang mati tidak wujud dalam src/', () => {
    let exists = true;
    try {
      statSync(join(SRC, 'App.tsx'));
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });
});
