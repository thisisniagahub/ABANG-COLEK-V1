/**
 * Acceptance harness — runner regression tests (FIX 5 and FIX 6).
 *
 * FIX 5: the junit outfile used to be a FIXED path (`<junitDir>/<suite>.xml`).
 *        Two concurrent harness runs therefore wrote the SAME file and one run
 *        could read the other's results. The outfile is now unique per run.
 *
 * FIX 6: the exit condition only looked at failed suites/tests. A suite that
 *        was `unavailable` (missing prerequisite, timeout) did NOT affect the
 *        exit code, so a missing prerequisite could be reported while the
 *        harness still exited 0 — contradicting the harness's own comment.
 */

import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  acceptanceExitCode,
  junitOutFilePath,
  newRunToken,
} from '../../scripts/maintenance/verify-acceptance';

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..');

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `acceptance-runner-${prefix}-`));
}

/**
 * A QUIESCENT git repo used as the harness root for these tests. The real
 * repo is written concurrently by other agents, so its source manifest moves
 * during a run (which is exactly what FIX 7 detects). The runner tests are
 * about junit isolation and the exit code, so they run against a stable tree.
 */
function makeTempGitRepo(prefix: string): string {
  const dir = tempDir(prefix);
  const git = (args: string[]) => {
    const res = spawnSync('git', args, { cwd: dir, encoding: 'utf-8' });
    if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr ?? res.stdout}`);
  };
  git(['init', '-q']);
  git(['config', 'user.email', 'harness@example.invalid']);
  git(['config', 'user.name', 'harness']);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'harness-repo', private: true }));
  git(['add', '-A']);
  return dir;
}

/**
 * Write a runner script that calls the REAL harness (verifyAcceptance) with a
 * supplied suite list, writes the receipt to disk and exits with the REAL
 * acceptance exit code. The script lives under the repo's gitignored `var/`
 * so the relative import of the harness resolves.
 */
function writeRunner(name: string): { script: string; spec: string } {
  const dir = path.join(REPO_ROOT, 'var', 'tmp', `acceptance-harness-runner-${name}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const script = path.join(dir, 'runner.ts');
  fs.writeFileSync(
    script,
    [
      "import { verifyAcceptance, acceptanceExitCode } from '../../../scripts/maintenance/verify-acceptance.ts';",
      "import * as fs from 'node:fs';",
      "const spec = JSON.parse(fs.readFileSync(process.argv[2]!, 'utf-8'));",
      'const result = verifyAcceptance(spec.repoRoot, {',
      '  skipBuild: true,',
      '  skipE2e: true,',
      '  suites: spec.suites.map((s) => ({',
      '    ...s,',
      "    ...(s.requires ? { requires: () => ({ ok: false, reason: s.requires }) } : {}),",
      '  })),',
      '});',
      "fs.writeFileSync(spec.out, JSON.stringify(result, null, 2));",
      'const verdict = acceptanceExitCode(result);',
      "if (verdict.code !== 0) console.error('FAILED: ' + verdict.reasons.join('; '));",
      'process.exit(verdict.code);',
      '',
    ].join('\n'),
  );
  return { script, spec: path.join(dir, 'spec.json') };
}

function writeProbeTest(dir: string, name: string, caseName: string): string {
  const file = path.join(dir, `${name}.test.ts`);
  fs.writeFileSync(
    file,
    [
      "import { test, expect } from 'bun:test';",
      `test(${JSON.stringify(caseName)}, () => { expect(true).toBe(true); });`,
      '',
    ].join('\n'),
  );
  return file;
}

describe('FIX 5 — the junit outfile is unique per run', () => {
  test('two run tokens produce two different junit paths for the same suite', () => {
    const dir = path.join(os.tmpdir(), 'kilo-acceptance-junit');
    const a = junitOutFilePath(dir, 'test:platform', newRunToken());
    const b = junitOutFilePath(dir, 'test:platform', newRunToken());
    expect(a).not.toBe(b);
    expect(path.basename(a)).toContain('test_platform');
    expect(path.basename(a)).toMatch(/\.xml$/);
  });

  test('the run token itself is unique', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => newRunToken()));
    expect(tokens.size).toBe(50);
  });

  test('two concurrent harness runs do not read each other\'s results', async () => {
    const repo = makeTempGitRepo('concurrent');
    const alphaFile = writeProbeTest(repo, 'alpha', 'alpha case ran');
    const betaFile = writeProbeTest(repo, 'beta', 'beta case ran');

    const runnerA = writeRunner('alpha');
    const runnerB = writeRunner('beta');
    const outA = path.join(repo, 'alpha-receipt.json');
    const outB = path.join(repo, 'beta-receipt.json');

    fs.writeFileSync(
      runnerA.spec,
      JSON.stringify({
        repoRoot: repo,
        out: outA,
        suites: [{ id: 'test:probe', cmd: 'bun', args: ['test', alphaFile], cwd: repo, timeoutMs: 120000 }],
      }),
    );
    fs.writeFileSync(
      runnerB.spec,
      JSON.stringify({
        repoRoot: repo,
        out: outB,
        suites: [{ id: 'test:probe', cmd: 'bun', args: ['test', betaFile], cwd: repo, timeoutMs: 120000 }],
      }),
    );

    // Launch BOTH runners at the same time.
    const [procA, procB] = [
      Bun.spawn(['bun', runnerA.script, runnerA.spec], { cwd: repo, stdout: 'pipe', stderr: 'pipe' }),
      Bun.spawn(['bun', runnerB.script, runnerB.spec], { cwd: repo, stdout: 'pipe', stderr: 'pipe' }),
    ];
    const [exitA, exitB] = await Promise.all([procA.exited, procB.exited]);
    expect(exitA).toBe(0);
    expect(exitB).toBe(0);

    const receiptA = JSON.parse(fs.readFileSync(outA, 'utf-8'));
    const receiptB = JSON.parse(fs.readFileSync(outB, 'utf-8'));

    // Each run measured ONLY its own file.
    const filesA = receiptA.suites[0].fileResults.map((f: { file: string }) => f.file);
    const filesB = receiptB.suites[0].fileResults.map((f: { file: string }) => f.file);
    expect(filesA).toHaveLength(1);
    expect(filesB).toHaveLength(1);
    expect(filesA[0]).toContain('alpha.test.ts');
    expect(filesB[0]).toContain('beta.test.ts');
    expect(filesA[0]).not.toContain('beta.test.ts');
    expect(filesB[0]).not.toContain('alpha.test.ts');

    // The per-testcase evidence is likewise uncontaminated.
    const namesA = receiptA.suites[0].fileResults[0].testCases.map((c: { name: string }) => c.name);
    const namesB = receiptB.suites[0].fileResults[0].testCases.map((c: { name: string }) => c.name);
    expect(namesA).toEqual(['alpha case ran']);
    expect(namesB).toEqual(['beta case ran']);

    // And the two runs used DIFFERENT junit files.
    expect(receiptA.suites[0].junitOutFile).not.toBe(receiptB.suites[0].junitOutFile);

    // The scratch junit files are deleted after parsing.
    for (const receipt of [receiptA, receiptB]) {
      const junit = receipt.suites[0].junitOutFile as string;
      expect(fs.existsSync(junit)).toBe(false);
    }
  }, 180_000);
});

describe('FIX 6 — an unavailable suite fails the harness', () => {
  test('the exit-code function reports unavailable suites', () => {
    const verdict = acceptanceExitCode({
      totals: { suitesFailed: 0, testsFailed: 0, suitesUnavailable: 1 },
      sourceStable: true,
    });
    expect(verdict.code).toBe(1);
    expect(verdict.reasons.join(' ')).toContain('unavailable');
  });

  test('a fully green, stable run exits 0', () => {
    const verdict = acceptanceExitCode({
      totals: { suitesFailed: 0, testsFailed: 0, suitesUnavailable: 0 },
      sourceStable: true,
    });
    expect(verdict.code).toBe(0);
    expect(verdict.reasons).toEqual([]);
  });

  test('a changed source tree fails the harness even when every suite is green', () => {
    const verdict = acceptanceExitCode({
      totals: { suitesFailed: 0, testsFailed: 0, suitesUnavailable: 0 },
      sourceStable: false,
      sourceManifestBefore: { digest: 'before', fileCount: 1 },
      sourceManifestAfter: { digest: 'after', fileCount: 1 },
    });
    expect(verdict.code).toBe(1);
    expect(verdict.reasons.join(' ')).toContain('source tree changed');
  });

  test('end to end: a run with an unavailable suite exits non-zero', async () => {
    const repo = makeTempGitRepo('unavailable');
    const runner = writeRunner('unavailable');
    const out = path.join(repo, 'receipt.json');
    fs.writeFileSync(
      runner.spec,
      JSON.stringify({
        repoRoot: repo,
        out,
        suites: [
          {
            id: 'test:unavailable',
            cmd: 'bun',
            args: ['test', './does-not-exist'],
            cwd: repo,
            timeoutMs: 30_000,
            requires: 'prerequisite missing for the harness regression test',
          },
        ],
      }),
    );

    const proc = Bun.spawn(['bun', runner.script, runner.spec], {
      cwd: repo,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('unavailable');

    const receipt = JSON.parse(fs.readFileSync(out, 'utf-8'));
    expect(receipt.totals.suitesUnavailable).toBe(1);
    expect(receipt.suites[0].status).toBe('unavailable');
    expect(receipt.suites[0].reason).toBe('prerequisite missing for the harness regression test');
  }, 120_000);
});
