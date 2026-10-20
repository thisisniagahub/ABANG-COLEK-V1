/**
 * Acceptance harness — source manifest regression tests (FIX 7).
 *
 * The receipt used to record only `gitCommit` + `gitDirty: true`. With many
 * writers editing concurrently, the SAME commit + dirty=true can refer to many
 * different source trees, so a receipt could not prove which code was tested.
 *
 * The harness now computes a deterministic source manifest before and after the
 * suites run. These tests pin the algorithm:
 *   1. tracked files (`git ls-files`) + untracked-but-not-ignored files
 *      (`git status --porcelain --untracked-files=all`) are the candidate set;
 *   2. excluded paths (node_modules, dist, var/, .git, reports/, docs/,
 *      test-output dirs) are dropped;
 *   3. each remaining file is hashed with SHA-256;
 *   4. the sorted `path:hash` lines fold into ONE digest.
 */

import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  computeSourceManifest,
  isSourceManifestExcluded,
  verifyAcceptance,
  type SuiteSpec,
} from '../../scripts/maintenance/verify-acceptance';

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..');

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `acceptance-manifest-${prefix}-`));
}

function git(repoRoot: string, args: string[]): void {
  const res = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf-8' });
  if (res.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${res.stderr ?? res.stdout}`);
  }
}

/** A tiny git repo used to observe how the manifest reacts to tree changes. */
function makeTempRepo(prefix: string): string {
  const dir = tempDir(prefix);
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'harness@example.invalid']);
  git(dir, ['config', 'user.name', 'harness']);
  fs.writeFileSync(path.join(dir, 'source.txt'), 'original content\n');
  fs.writeFileSync(path.join(dir, 'other.ts'), 'export const other = 1;\n');
  git(dir, ['add', '-A']);
  return dir;
}

describe('source manifest — determinism', () => {
  test('two consecutive computations of an unchanged tree agree', () => {
    const dir = makeTempRepo('stable');
    const a = computeSourceManifest(dir);
    const b = computeSourceManifest(dir);
    expect(a.digest).toBe(b.digest);
    expect(a.fileCount).toBe(b.fileCount);
    expect(a.fileCount).toBe(2);
  }, 120_000);

  test('the real repo manifest is computable', () => {
    // NOTE: the live repo is written concurrently by other agents, so the real
    // manifest is NOT asserted to be stable across two reads here — that is
    // exactly what FIX 7 exists to detect. Determinism is asserted against a
    // quiescent temp repo above.
    const manifest = computeSourceManifest(REPO_ROOT);
    expect(manifest.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.fileCount).toBeGreaterThan(100);
  }, 120_000);
});

describe('source manifest — sensitivity', () => {
  test('changing a tracked file changes the digest', () => {
    const dir = makeTempRepo('changed');
    const before = computeSourceManifest(dir);
    fs.writeFileSync(path.join(dir, 'source.txt'), 'mutated content\n');
    const after = computeSourceManifest(dir);
    expect(after.digest).not.toBe(before.digest);
  }, 120_000);

  test('adding an untracked file changes the digest', () => {
    const dir = makeTempRepo('untracked');
    const before = computeSourceManifest(dir);
    fs.writeFileSync(path.join(dir, 'new-file.ts'), 'export const added = 1;\n');
    const after = computeSourceManifest(dir);
    expect(after.digest).not.toBe(before.digest);
    expect(after.fileCount).toBe(before.fileCount + 1);
  }, 120_000);

  test('excluded paths do NOT change the digest', () => {
    const dir = makeTempRepo('excluded');
    const before = computeSourceManifest(dir);
    for (const excluded of ['reports', 'docs', 'dist', 'var', 'node_modules', 'test-results']) {
      const target = path.join(dir, excluded, 'note.md');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, 'ignored by the manifest\n');
    }
    const after = computeSourceManifest(dir);
    expect(after.digest).toBe(before.digest);
  }, 120_000);

  test('the exclusion list covers the documented paths', () => {
    expect(isSourceManifestExcluded('node_modules/foo/index.js')).toBe(true);
    expect(isSourceManifestExcluded('dist/main.js')).toBe(true);
    expect(isSourceManifestExcluded('var/log/run.log')).toBe(true);
    expect(isSourceManifestExcluded('.git/config')).toBe(true);
    expect(isSourceManifestExcluded('reports/implementation/x.json')).toBe(true);
    expect(isSourceManifestExcluded('docs/prompts/README.md')).toBe(true);
    expect(isSourceManifestExcluded('tests/platform/foo.test.ts')).toBe(false);
    expect(isSourceManifestExcluded('server/platform/app.ts')).toBe(false);
  });
});

describe('source manifest — a tree that moves during the run is flagged', () => {
  test('sourceStable is false when the tree changes while the suites run', async () => {
    const dir = makeTempRepo('mutating');
    // The suite mutates a tracked source file WHILE it runs.
    const mutator = path.join(dir, 'mutator.test.ts');
    fs.writeFileSync(
      mutator,
      [
        "import { test, expect } from 'bun:test';",
        "import * as fs from 'node:fs';",
        "import * as path from 'node:path';",
        `const repo = ${JSON.stringify(dir)};`,
        "test('mutates the source tree while the suite runs', () => {",
        "  fs.writeFileSync(path.join(repo, 'source.txt'), 'mutated during the run\\n');",
        '  expect(true).toBe(true);',
        '});',
        '',
      ].join('\n'),
    );

    const suites: SuiteSpec[] = [
      {
        id: 'test:mutator',
        cmd: 'bun',
        args: ['test', mutator],
        cwd: dir,
        timeoutMs: 120_000,
      },
    ];

    const result = verifyAcceptance(dir, { skipBuild: true, skipE2e: true, suites });

    expect(result.sourceManifestBefore).not.toBeNull();
    expect(result.sourceManifestAfter).not.toBeNull();
    expect(result.sourceManifestBefore!.digest).not.toBe(result.sourceManifestAfter!.digest);
    expect(result.sourceStable).toBe(false);
  }, 180_000);

  test('sourceStable is true when the tree does not move', async () => {
    const dir = makeTempRepo('still');
    const stable = path.join(dir, 'stable.test.ts');
    fs.writeFileSync(
      stable,
      ["import { test, expect } from 'bun:test';", "test('does not touch the tree', () => { expect(1).toBe(1); });", ''].join('\n'),
    );

    const suites: SuiteSpec[] = [
      {
        id: 'test:stable',
        cmd: 'bun',
        args: ['test', stable],
        cwd: dir,
        timeoutMs: 120_000,
      },
    ];

    const result = verifyAcceptance(dir, { skipBuild: true, skipE2e: true, suites });
    expect(result.sourceStable).toBe(true);
    expect(result.sourceManifestBefore!.digest).toBe(result.sourceManifestAfter!.digest);
  }, 180_000);
});

