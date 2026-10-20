/**
 * scripts/test-all.ts — pelari aggregate untuk seluruh suite ujian repo.
 *
 * TUJUAN: satu arahan yang menjalankan SEMUA suite dalam urutan tetap,
 * mencetak kiraan sebenar bagi setiap suite, dan KELUAR dengan kod bukan sifar
 * jika mana-mana suite gagal. Kegagalan tidak boleh disembunyikan: output
 * penuh suite yang gagal dicetak, dan jumlah akhir mengandungi `fail` sebenar.
 *
 * Urutan suite adalah sebekat yang diminta:
 *   1. tests/jev
 *   2. tests/platform
 *   3. tests/copilot
 *   4. tests/frontend
 *   5. tests/architecture
 *   6. tests/ext
 *   7. tests/dashboard-model.test.ts
 *   8. tests/landing-brand-theme.test.ts
 *
 * Skrip ini TIDAK mengubah suai apa-apa fail. Ia hanya menjalankan `bun test`
 * dan membaca outputnya.
 *
 * contemplated: modul ini mengeksport helper tulen supaya logik kiraan boleh
 * diuji tanpa menjalankan keseluruhan suite (lihat
 * tests/platform/test-all-runner.test.ts).
 */

import { spawn } from 'bun';

// ---------------------------------------------------------------------------
// Kontrak
// ---------------------------------------------------------------------------

export interface SuiteSpec {
  /** Nama ringkas untuk paparan. */
  readonly name: string;
  /** Halaman/berkas yang dihantar kepada `bun test`. */
  readonly path: string;
}

/** Urutan suite — TIDAK boleh diubah tanpa mengemas kini laporan. */
export const SUITES: readonly SuiteSpec[] = [
  { name: 'jev', path: './tests/jev' },
  { name: 'platform', path: './tests/platform' },
  { name: 'copilot', path: './tests/copilot' },
  { name: 'frontend', path: './tests/frontend' },
  { name: 'architecture', path: './tests/architecture' },
  { name: 'ext', path: './tests/ext' },
  { name: 'dashboard-model', path: './tests/dashboard-model.test.ts' },
  { name: 'landing-brand-theme', path: './tests/landing-brand-theme.test.ts' },
];

export interface SuiteCounts {
  readonly pass: number;
  readonly fail: number;
  readonly todo: number;
  readonly skip: number;
}

export interface SuiteOutcome {
  readonly spec: SuiteSpec;
  /** Kod keluar sebenar proses `bun test`. */
  readonly exitCode: number;
  /** Kiraan sebenar yang dibaca daripada output, atau null jika tiada. */
  readonly counts: SuiteCounts | null;
  readonly durationMs: number;
  /** Output penuh (stdout + stderr) untuk pembuktian / diagnosis. */
  readonly output: string;
}

// ---------------------------------------------------------------------------
// Helper tulen (diuji dalam tests/platform/test-all-runner.test.ts)
// ---------------------------------------------------------------------------

/** Buang kod warna ANSI daripada output `bun test`. */
export function stripAnsi(text: string): string {
  return text.replace(/\[[0-9;]*m/g, '');
}

/**
 * Baca kiraan sebenar daripada output `bun test`.
 *
 * Ringkasan `bun test`dicetak pada hujung output dalam bentuk:
 *   ` 5 pass` / ` 1 todo` / ` 0 fail` / ` 36 expect() calls`
 * Baris ringkasan adalah yang TERAKHIR, jadi regexp mengambil match terakhir
 * bagi setiap kata kunci. Jika tiada satu pun dijumpai, `null` dikembalikan —
 * itu bermakna suite tidak menghasilkan ringkasan (contohnya ia ran ke
 * ralat sebelum jin), dan suite itu mesti dianggap gagal.
 */
export function parseSuiteCounts(rawOutput: string): SuiteCounts | null {
  const text = stripAnsi(rawOutput);
  const last = (keyword: string): number | null => {
    const matches = [...text.matchAll(new RegExp(`(\\d+)\\s+${keyword}\\b`, 'g'))];
    if (matches.length === 0) return null;
    const value = Number(matches[matches.length - 1]![1]);
    return Number.isFinite(value) ? value : null;
  };
  const pass = last('pass');
  const fail = last('fail');
  const todo = last('todo');
  const skip = last('skip');
  if (pass === null && fail === null && todo === null && skip === null) return null;
  return {
    pass: pass ?? 0,
    fail: fail ?? 0,
    todo: todo ?? 0,
    skip: skip ?? 0,
  };
}

/**
 * Adakah suite ini dianggap gagal?
 *
 * Tiga syarat, kesemuanya mesti DISALASAN (bukan "kalau ada apa-apa"):
 *  - ada sekurang-kurangnya satu ujian gagal;
 *  - proses `bun test` keluar dengan kod bukan sifar;
 *  - tiada kiraan boleh dibaca (suite ran sebelum menghasilkan ringkasan).
 */
export function isSuiteFailed(outcome: {
  exitCode: number;
  counts: SuiteCounts | null;
}): boolean {
  if (outcome.counts === null) return true;
  if (outcome.counts.fail > 0) return true;
  if (outcome.exitCode !== 0) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Pelari
// ---------------------------------------------------------------------------

/** Jalankan satu suite dan kumpulkan hasil sebenar. */
export async function runSuite(spec: SuiteSpec): Promise<SuiteOutcome> {
  const started = Date.now();
  const proc = spawn([process.execPath, 'test', spec.path], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env },
    cwd: process.cwd(),
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    proc.stdout ? new Response(proc.stdout).text() : Promise.resolve(''),
    proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(''),
    proc.exited,
  ]);
  const output = `${stdout}${stderr}`;
  return {
    spec,
    exitCode,
    counts: parseSuiteCounts(output),
    durationMs: Date.now() - started,
    output,
  };
}

/** Jalankan semua suite dalam urutan dan pulangkan kod keluar. */
export async function main(): Promise<number> {
  const outcomes: SuiteOutcome[] = [];
  let failed = false;

  for (const [index, spec] of SUITES.entries()) {
    const position = `[${index + 1}/${SUITES.length}]`;
    process.stdout.write(`${position} ${spec.name} (${spec.path}) ... `);
    const outcome = await runSuite(spec);
    outcomes.push(outcome);

    const counts = outcome.counts;
    const summary = counts
      ? `${counts.pass} pass | ${counts.fail} fail | ${counts.todo} todo | ${counts.skip} skip`
      : 'TIADA KIRAAN (suite tidak menghasilkan ringkasan)';
    const broken = isSuiteFailed(outcome);
    if (broken) failed = true;
    process.stdout.write(
      `${summary} | exit ${outcome.exitCode} | ${outcome.durationMs}ms${broken ? ' | GAGAL' : ''}\n`,
    );

    // Kegagalan tidak boleh disembunyikan: output penuh suite yang gagal
    // dicetak terus.
    if (broken) {
      process.stdout.write(`----- output penuh suite ${spec.name} -----\n`);
      process.stdout.write(outcome.output.endsWith('\n') ? outcome.output : `${outcome.output}\n`);
      process.stdout.write(`----- end output suite ${spec.name} -----\n`);
    }
  }

  const totals = outcomes.reduce(
    (acc, outcome) => {
      const counts = outcome.counts ?? { pass: 0, fail: 0, todo: 0, skip: 0 };
      return {
        pass: acc.pass + counts.pass,
        fail: acc.fail + counts.fail,
        todo: acc.todo + counts.todo,
        skip: acc.skip + counts.skip,
      };
    },
    { pass: 0, fail: 0, todo: 0, skip: 0 },
  );

  process.stdout.write('\n===== RINGKASAN =====\n');
  for (const outcome of outcomes) {
    const counts = outcome.counts;
    const summary = counts
      ? `${counts.pass} pass | ${counts.fail} fail | ${counts.todo} todo | ${counts.skip} skip`
      : 'tiada kiraan';
    process.stdout.write(
      `${outcome.spec.name.padEnd(20)} ${outcome.spec.path.padEnd(38)} ${summary} | exit ${outcome.exitCode}\n`,
    );
  }
  process.stdout.write(
    `TOTAL: ${totals.pass} pass | ${totals.fail} fail | ${totals.todo} todo | ${totals.skip} skip\n`,
  );

  if (failed) {
    process.stdout.write('RESULT: GAGAL — sekurang-kurangnya satu suite tidak lulus.\n');
    return 1;
  }
  process.stdout.write('RESULT: SEMUA SUITE LULUS.\n');
  return 0;
}

if (import.meta.main) {
  process.exit(await main());
}
