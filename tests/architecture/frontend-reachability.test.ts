import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  analyzeReachability,
  extractValueImports,
  findStaleAllowListEntries,
  findUnprotectedDeadModules,
  loadRepoSources,
  type ReachabilityClass,
  type ReachabilityResult,
} from './frontend-reachability';

/**
 * ARC-08 — Guard dead-code frontend.
 *
 * Setiap modul runtime di bawah `src/` mesti boleh dicapai dari SATU
 * production entrypoint. Modul yang tidak boleh dicapai hanya dibenarkan
 * jika ia tersenarai dalam allow-list yang BERBUKTI reason.
 *
 * Guard ini mempunyai dua arah:
 *  1. Ratchet turun — senarai allow-list hanya boleh mengecil. Modul yang
 *     dahulunya mati tetapi kini hidup mesti dibuang daripada allow-list.
 *  2. Ratchet naik (kenaikan pagar) — modul BARU yang mati tanpa reason
 *     akan menggagalkan CI.
 */

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..');
const ALLOWLIST_PATH = path.join(
  import.meta.dir,
  'fixtures',
  'frontend-reachability-allowlist.json'
);

interface AllowListEntry {
  file: string;
  class: ReachabilityClass;
  reason: string;
}

interface AllowList {
  schemaVersion: number;
  policy: { ratchet: string };
  classes: Record<string, string>;
  allowList: AllowListEntry[];
}

const allowList: AllowList = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf-8'));

let cached: ReachabilityResult | undefined;
function reachability(): ReachabilityResult {
  if (!cached) {
    cached = analyzeReachability({ root: REPO_ROOT, scopePrefixes: ['src/'] });
  }
  return cached;
}

describe('ARC-08 frontend reachability guard — allow-list hygiene', () => {
  test('allow-list schema ialah tetap dan setiap entri ada reason', () => {
    expect(allowList.schemaVersion).toBe(1);
    expect(Array.isArray(allowList.allowList)).toBe(true);
    expect(allowList.allowList.length).toBe(0);

    for (const entry of allowList.allowList) {
      expect(entry.file.startsWith('src/')).toBe(true);
      expect(entry.reason.trim().length).toBeGreaterThan(20);
      expect(Object.keys(allowList.classes)).toContain(entry.class);
    }
  });

  test('tiada entri allow-list berulang', () => {
    const seen = new Set<string>();
    for (const entry of allowList.allowList) {
      expect(seen.has(entry.file)).toBe(false);
      seen.add(entry.file);
    }
  });

  test('setiap entri allow-list mesti benar-benar tidak boleh dicapai', () => {
    const result = reachability();
    const unreachable = new Set(result.unreachable.map((module) => module.file));

    const stale = allowList.allowList
      .map((entry) => entry.file)
      .filter((file) => !unreachable.has(file));

    expect(stale).toEqual([]);
  }, 60_000);

  test('kelas setiap entri allow-list sepadan dengan pengukuran sebenar', () => {
    const result = reachability();
    const byFile = new Map(result.unreachable.map((module) => [module.file, module.class]));

    for (const entry of allowList.allowList) {
      expect(byFile.get(entry.file)).toBe(entry.class);
    }
  });
});

describe('ARC-08 frontend reachability guard — real repository tree', () => {
  test('setiap modul runtime src/ boleh dicapai dari production entrypoint', () => {
    const result = reachability();

    expect(result.totalFilesScanned).toBeGreaterThan(0);
    expect(result.totalEdgesResolved).toBeGreaterThan(0);
    expect(result.entrypoints).toContain('src/main.tsx');

    const violations = findUnprotectedDeadModules(result, allowList.allowList.map((e) => e.file));

    if (violations.length > 0) {
      console.error(
        'Modul src/ mati tanpa alasan yang berdaftar:',
        violations.map((violation) => `${violation.file} (${violation.class}, ${violation.loc} LOC)`)
      );
    }
    expect(violations).toEqual([]);
  }, 60_000);

  test('angka pengukuran dikunci — dead-code frontend tidak boleh bertambah tanpa keputusan deliberate', () => {
    const result = reachability();
    const srcModules = result.modules.filter((module) => module.file.startsWith('src/'));

    expect(srcModules.length).toBe(140);
    expect(result.unreachable.length).toBe(0);
    expect(allowList.allowList.length).toBe(0);
  }, 60_000);

  test('allow-list hanya boleh mengecil — jumlah LOC tidak boleh bertambah', () => {
    const result = reachability();
    const allowedLoc = allowList.allowList.reduce((total, entry) => {
      const module = result.unreachable.find((candidate) => candidate.file === entry.file);
      return total + (module?.loc ?? 0);
    }, 0);

    // Semua 59 modul telah disambung semula ke dalam IntegrationWorkspace (0 unreachable LOC).
    expect(allowedLoc).toBeLessThanOrEqual(0);
  }, 60_000);

  test('regression guard: modul src/ BARU yang mati tanpa reason menggagalkan guard', () => {
    const realFiles = loadRepoSources(REPO_ROOT);
    const probe = {
      path: 'src/features/reachability-guard-probe/probe.ts',
      content:
        "export const probe = { unreachable: true };\n",
    };

    const before = analyzeReachability({ root: REPO_ROOT, files: realFiles, scopePrefixes: ['src/'] });
    expect(
      findUnprotectedDeadModules(before, allowList.allowList.map((entry) => entry.file))
    ).toEqual([]);

    const after = analyzeReachability({
      root: REPO_ROOT,
      files: [...realFiles, probe],
      scopePrefixes: ['src/'],
    });
    const violations = findUnprotectedDeadModules(
      after,
      allowList.allowList.map((entry) => entry.file)
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe(probe.path);
    expect(violations[0].class).toBe('no-importer');
  }, 60_000);

  test('regression guard: modul HIDUP yang diletak dalam allow-list dikesan sebagai lapuk', () => {
    const result = reachability();
    const live = result.modules.find((module) => module.reachable);
    expect(live).toBeDefined();

    // Guard hygiene: allow-list hanya boleh berisi modul mati. Jika satu
    // modul hidup diletak ke dalam allow-list, ia mesti dikesan sebagai
    // entri lapuk supaya senarai itu tidak menjadi senarai mati tersembunyi.
    const stale = findStaleAllowListEntries(result, [
      ...allowList.allowList,
      { file: live!.file },
    ]);

    expect(stale).toEqual([live!.file]);
  });
});

describe('ARC-08 value-import extraction — type-only import BUKAN runtime edge', () => {
  test('`import type` dan specifier `type` inline tidak dikira sebagai edge', () => {
    const edges = extractValueImports(
      'src/probe.ts',
      [
        "import type { OnlyType } from './only-type';",
        "import { type InlineType, RealValue } from './mixed';",
        "import DefaultValue from './default';",
        "import * as Namespace from './namespace';",
        "import './side-effect';",
        "export type { ExportedType } from './exported-type';",
        "export { ExportedValue } from './exported-value';",
        "export * from './star-export';",
        "const dynamic = await import('./dynamic');",
        "const required = require('./required');",
      ].join('\n')
    );

    const specifiers = edges.map((edge) => edge.specifier);
    expect(specifiers).not.toContain('./only-type');
    expect(specifiers).not.toContain('./exported-type');
    expect(specifiers).toContain('./mixed');
    expect(specifiers).toContain('./default');
    expect(specifiers).toContain('./namespace');
    expect(specifiers).toContain('./side-effect');
    expect(specifiers).toContain('./exported-value');
    expect(specifiers).toContain('./star-export');
    expect(specifiers).toContain('./dynamic');
    expect(specifiers).toContain('./required');
  });

  test('import multiline dikesan sebagai satu edge pada baris statement', () => {
    const edges = extractValueImports(
      'src/probe.ts',
      ["import {", "  alpha,", "  beta,", "} from './multiline';"].join('\n')
    );

    expect(edges).toHaveLength(1);
    expect(edges[0].specifier).toBe('./multiline');
    expect(edges[0].line).toBe(1);
  });
});
