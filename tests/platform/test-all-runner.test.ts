/**
 * Bukti untuk pelari aggregate `scripts/test-all.ts`.
 *
 * Pelari itu sendiri tidak boleh dijalankan oleh lane ujian (hanya skrip
 * yang affirms boleh), jadi modul ini dieksport helper TULEN supaya logik
 * kiraan boleh dibuktikan DI SINI, dan satu ujian mekanisme menjalankan
 * `bun test` sebenar untuk proving spawn + tangkap + kira.
 *
 * Ujian ini tidak pernah menyentuh implementasi produk; ia hanya menjaga
 * Kontrak pelari: urutan suite, bacaan kiraan yang jujur, dan peraturan
 * "gagal => keluar bukan sifar".
 */

import { describe, expect, test } from 'bun:test';
import {
  SUITES,
  isSuiteFailed,
  parseSuiteCounts,
  runSuite,
  stripAnsi,
} from '../../scripts/test-all';

const ESC = String.fromCharCode(27);

describe('Pelari aggregate — scripts/test-all.ts', () => {
  test('urutan suite adalah tepat seperti yang diminta', () => {
    expect(SUITES.map(suite => suite.path)).toEqual([
      './tests/jev',
      './tests/platform',
      './tests/copilot',
      './tests/frontend',
      './tests/architecture',
      './tests/ext',
      './tests/dashboard-model.test.ts',
      './tests/landing-brand-theme.test.ts',
    ]);
    // Nama suite mesti unik supaya ringkasan boleh dibaca.
    const names = SUITES.map(suite => suite.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('kiraan dibaca daripada output bun test yang sebenar (dengan kod warna ANSI)', () => {
    // Bentuk output sebenar `bun test`: warna ANSI mengelilingi baris
    // ringkasan, jadi `stripAnsi` mesti dijalankan sebelum dibaca.
    const output = [
      `bun test v1.4.2 (744846f84)`,
      `${ESC}[31;1m${ESC}[0m`,
      ` 5 pass`,
      ` 1 todo`,
      ` 0 fail`,
      ` 36 expect() calls`,
      `Ran 6 tests across 1 file. [177.00ms]`,
    ].join('\n');

    expect(stripAnsi(output)).not.toContain(ESC);
    const counts = parseSuiteCounts(output);
    expect(counts).not.toBeNull();
    expect(counts!.pass).toBe(5);
    expect(counts!.fail).toBe(0);
    expect(counts!.todo).toBe(1);
    expect(counts!.skip).toBe(0);
  });

  test('output tanpa ringkasan => tiada kiraan (bukan kiraan rekaan)', () => {
    expect(parseSuiteCounts('')).toBeNull();
    expect(parseSuiteCounts('error: something exploded before the runner started')).toBeNull();
  });

  test('peraturan "gagal": fail > 0, kod keluar bukan sifar, atau tiada kiraan', () => {
    const clean = { exitCode: 0, counts: { pass: 10, fail: 0, todo: 2, skip: 0 } };
    expect(isSuiteFailed(clean)).toBe(false);

    // Satu ujian gagal => suite gagal walaupun kod keluar 0.
    expect(isSuiteFailed({ exitCode: 0, counts: { pass: 9, fail: 1, todo: 0, skip: 0 } })).toBe(true);
    // Kod keluar bukan sifar => suite gagal walaupun tiada fail dikira.
    expect(isSuiteFailed({ exitCode: 1, counts: { pass: 9, fail: 0, todo: 0, skip: 0 } })).toBe(true);
    // Tiada ringkasan => suite gagal (tidak boleh disembunyikan).
    expect(isSuiteFailed({ exitCode: 0, counts: null })).toBe(true);
  });

  test('mekanisme: `bun test` sebenar -> kod keluar, kiraan sebenar, tiada apa-apa disembunyikan', async () => {
    // Suite sebenar yang kecil dan pantas. Ini membuktikan mekanismenya:
    // spawn, tangkap output, baca kiraan.
    const outcome = await runSuite({ name: 'landing-brand-theme', path: './tests/landing-brand-theme.test.ts' });

    expect(outcome.exitCode).toBe(0);
    expect(outcome.counts).not.toBeNull();
    expect(outcome.counts!.pass).toBeGreaterThan(0);
    expect(outcome.counts!.fail).toBe(0);
    expect(isSuiteFailed(outcome)).toBe(false);
    // Output Sebenar dikekalkan untuk diagnosis.
    expect(outcome.output.length).toBeGreaterThan(0);
    expect(outcome.output).toContain('pass');
  });
});
