import { describe, expect, test } from 'bun:test';
import * as path from 'node:path';

/**
 * ARC-01 — kontrak exit code CLI `scripts/maintenance/check-boundaries.ts`.
 *
 * Keperluan gaya (ledger ARC-01): checker mesti kekal exit 0 pada repo sebenar
 * dan exit != 0 pada tree rekaan yang melanggar. Ujian in-process dalam
 * dependency-boundaries.test.ts membuktikan detector; fail ini meminkan
 * bahawa wrapper CLI memetakan keputusan itu kepada exit code yang betul,
 * kerana gate `bun scripts/maintenance/check-boundaries.ts` dalam CI / bun run
 * qa hanya melihat exit code, bukan objek keputusan.
 */

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..');
const CHECKER = path.join(REPO_ROOT, 'scripts', 'maintenance', 'check-boundaries.ts');
const FIXTURES = path.join(REPO_ROOT, 'tests', 'architecture', 'fixtures');

interface CliRun {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runChecker(rootDir: string): CliRun {
  const proc = Bun.spawnSync({
    cmd: [process.execPath, CHECKER, '--root', rootDir],
    cwd: REPO_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

describe('ARC-01 boundary checker CLI — exit code contract', () => {
  test('exits 1 on a synthetic tree that violates the client->server rule', () => {
    const run = runChecker(path.join(FIXTURES, 'client-imports-server'));

    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('FORBIDDEN_CLIENT_IMPORTING_SERVER');
    expect(run.stderr).toContain('src/features/legacy/client-imports-server.ts:1:1');
  });

  test('exits 1 on a synthetic tree with a module-interface cycle', () => {
    const run = runChecker(path.join(FIXTURES, 'cycle'));

    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('FORBIDDEN_MODULE_CYCLE');
    expect(run.stderr).toContain('server/modules/alpha');
    expect(run.stderr).toContain('server/modules/beta');
  });

  test('exits 0 on a clean synthetic tree', () => {
    const run = runChecker(path.join(FIXTURES, 'clean'));

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain('Zero unauthorized boundary violations');
  });

  test('exits 0 on the real repository tree', () => {
    const run = runChecker(REPO_ROOT);

    if (run.exitCode !== 0) {
      console.error('checker stdout:', run.stdout);
      console.error('checker stderr:', run.stderr);
    }
    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain('Zero unauthorized boundary violations');
  }, 60_000);
});
