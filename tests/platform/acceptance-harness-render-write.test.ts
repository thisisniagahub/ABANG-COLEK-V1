/**
 * Acceptance harness — renderer write-path regression tests (FIX 1).
 *
 * Pre-fix, the renderer's non-`--check` path wrote the register FIRST and only
 * THEN checked `errors.length > 0`. A failing run therefore replaced the
 * canonical register with a broken one and still exited 1. The orchestrator
 * reproduced this with a probe that wrote only into a temp dir:
 *
 *   exitCode: 1, outputExists: true, printedWriteNotice: true
 *
 * The renderer must now VALIDATE FIRST, WRITE SECOND, and write ATOMICALLY.
 */

import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { ALL_IDS, type AcceptanceRow, type VerificationLite } from '../../scripts/maintenance/render-acceptance-register';

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..');
const RENDERER = path.join(REPO_ROOT, 'scripts', 'maintenance', 'render-acceptance-register.ts');

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `acceptance-harness-${prefix}-`));
}

function defaultRow(id: string): AcceptanceRow {
  return {
    id,
    tier: id.startsWith('EXT-') ? 'extension' : 'core',
    title: `placeholder requirement ${id}`,
    status: 'implemented_unverified',
    statusRaw: 'implemented_unverified',
    source: 'src/placeholder.ts',
    testFile: null,
    testName: null,
    testKind: 'none',
    gap: null,
    externalGate: null,
    evidenceRefs: ['package.json'],
  };
}

function statusFile(overrides: Record<string, Partial<AcceptanceRow>> = {}) {
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    sourceCommit: 'commit-abc',
    rows: ALL_IDS.map((id) => ({ ...defaultRow(id), ...(overrides[id] ?? {}) })),
  };
}

function verificationFile(): VerificationLite {
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    gitCommit: 'commit-abc',
    gitBranch: 'main',
    gitDirty: true,
    sourceManifestBefore: { digest: 'manifest-A', fileCount: 42 },
    sourceManifestAfter: { digest: 'manifest-A', fileCount: 42 },
    sourceStable: true,
    suites: [
      {
        id: 'lint',
        command: 'bun run lint',
        exitCode: 0,
        status: 'pass',
        passCount: null,
        failCount: null,
        expectCount: null,
        filesScanned: null,
        summary: '',
      },
      {
        id: 'build',
        command: 'bun run build',
        exitCode: 0,
        status: 'pass',
        passCount: null,
        failCount: null,
        expectCount: null,
        filesScanned: null,
        summary: '',
      },
    ],
    totals: {
      suitesRun: 2,
      suitesPassed: 2,
      suitesFailed: 0,
      suitesUnavailable: 0,
      testsPassed: 0,
      testsFailed: 0,
      assertions: 0,
    },
  };
}

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runRenderer(dir: string, outPath: string, status: unknown, verification: unknown): RunResult {
  const statusPath = path.join(dir, 'status.json');
  const verifyPath = path.join(dir, 'verification.json');
  fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
  fs.writeFileSync(verifyPath, JSON.stringify(verification, null, 2));
  const res = spawnSync(
    'bun',
    [
      RENDERER,
      '--status',
      statusPath,
      '--verification',
      verifyPath,
      '--repo-root',
      REPO_ROOT,
      '--out',
      outPath,
    ],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  return { exitCode: res.status ?? -1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

describe('FIX 1 — a failing render must not write the register', () => {
  test('exit is 1, no output file is created, and nothing is printed as written', () => {
    const dir = tempDir('broken');
    const outPath = path.join(dir, 'REGISTER.md');
    const broken = statusFile({
      'CPK-02': { evidenceRefs: ['reports/this-file-does-not-exist.json'] },
    });
    const res = runRenderer(dir, outPath, broken, verificationFile());

    expect(res.exitCode).toBe(1);
    expect(fs.existsSync(outPath)).toBe(false);
    expect(res.stdout).not.toContain('Written:');
    expect(res.stderr).toContain('REFUSING TO WRITE');
  });

  test('an existing register is left untouched by a failing run', () => {
    const dir = tempDir('preserve');
    const outPath = path.join(dir, 'REGISTER.md');
    const original = '# THE GOOD REGISTER\n\ncanonical content\n';
    fs.writeFileSync(outPath, original);

    const broken = statusFile({
      'MOD-01': { evidenceRefs: ['reports/this-file-does-not-exist.json'] },
    });
    const res = runRenderer(dir, outPath, broken, verificationFile());

    expect(res.exitCode).toBe(1);
    expect(fs.readFileSync(outPath, 'utf-8')).toBe(original);
  });

  test('a missing verification receipt is an error and does not write', () => {
    const dir = tempDir('noverify');
    const outPath = path.join(dir, 'REGISTER.md');
    const res = runRenderer(dir, outPath, statusFile(), null);
    expect(res.exitCode).toBe(1);
    expect(fs.existsSync(outPath)).toBe(false);
    expect(res.stdout).not.toContain('Written:');
  });
});

describe('FIX 1 — a valid render writes atomically', () => {
  test('the register is written and no temp file is left behind', () => {
    const dir = tempDir('valid');
    const outPath = path.join(dir, 'REGISTER.md');
    const res = runRenderer(dir, outPath, statusFile(), verificationFile());

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('Written:');
    expect(fs.existsSync(outPath)).toBe(true);
    expect(fs.readFileSync(outPath, 'utf-8')).toContain('# Acceptance Register');

    const leftovers = fs.readdirSync(dir).filter((f) => f.includes('.tmp'));
    expect(leftovers).toEqual([]);
  });

  test('the write is atomic: no partially written file is ever published', () => {
    const dir = tempDir('atomic');
    const outPath = path.join(dir, 'REGISTER.md');
    fs.writeFileSync(outPath, 'PREVIOUS CONTENT\n');
    const res = runRenderer(dir, outPath, statusFile(), verificationFile());
    expect(res.exitCode).toBe(0);
    // The published file is complete, never a truncated prefix.
    const content = fs.readFileSync(outPath, 'utf-8');
    expect(content.startsWith('# Acceptance Register')).toBe(true);
    expect(content.trimEnd().endsWith('_No dated corrections recorded._')).toBe(true);
  });
});
