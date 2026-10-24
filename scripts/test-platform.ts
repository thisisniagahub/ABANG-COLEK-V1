import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const PLATFORM_TEST_SCOPE = [
  'tests/jev', 'tests/platform', 'tests/copilot', 'tests/frontend',
  'tests/architecture', 'tests/ext', 'tests/dashboard-model.test.ts',
  'tests/landing-brand-theme.test.ts',
] as const;
const TEST_FILE = /[._](?:test|spec)\.(?:js|jsx|ts|tsx|mjs|cjs|mts|cts)$/;
export interface Counts { pass: number; fail: number; skip: number; todo: number; expect: number }

export function discoverTests(paths: readonly string[], root = process.cwd()): string[] {
  const files = new Set<string>();
  const visit = (path: string): void => {
    const info = statSync(path);
    if (info.isDirectory()) {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.isSymbolicLink()) continue;
        visit(join(path, entry.name));
      }
    } else if (info.isFile() && TEST_FILE.test(path)) files.add(path);
  };
  for (const path of paths) visit(resolve(root, path));
  return [...files].sort();
}

export function parseTestCounts(output: string): Counts | null {
  // Ambil blok akhir supaya output fixture bersarang tidak dikira sebagai suite induk.
  const blocks = [...output.matchAll(/(?:^|\n)\s*(\d+) pass\r?\n([\s\S]*?)Ran (\d+) tests? across (\d+) files?\./g)];
  const block = blocks.at(-1);
  if (!block) return null;
  const value = (label: string): number | null => {
    const match = new RegExp(`^\\s*(\\d+) ${label}\\s*$`, 'm').exec(block[0]);
    return match ? Number(match[1]) : null;
  };
  const fail = value('fail');
  if (fail === null) return null;
  const counts = { pass: Number(block[1]), fail, skip: value('skip') ?? 0, todo: value('todo') ?? 0, expect: value('expect\\(\\) calls') ?? 0 };
  if (Number(block[3]) === 0 || counts.pass + counts.fail + counts.skip + counts.todo !== Number(block[3])) return null;
  return counts;
}

export function runTestFile(file: string, timeoutMs = 180_000) {
  // Proses berasingan melepaskan module cache dan mock antara fail, termasuk CopilotKit.
  const result = spawnSync(process.execPath, ['test', '--isolate', '--timeout', '15000', file.replace(/\\/g, '/')], {
    cwd: process.cwd(), encoding: 'utf8', timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const counts = parseTestCounts(output);
  const reason = result.error ? result.error.message : result.signal ? `proses dihentikan: ${result.signal}` : !counts ? 'tiada ringkasan ujian lengkap' : result.status !== 0 ? `exit ${result.status}` : counts.fail > 0 ? 'ujian gagal' : '';
  return { counts, output, reason, ok: reason === '' };
}

export function runPlatformTests(paths: readonly string[]): number {
  const files = discoverTests(paths);
  if (files.length === 0) throw new Error('Tiada fail ujian dalam skop yang diminta.');
  const totals: Counts = { pass: 0, fail: 0, skip: 0, todo: 0, expect: 0 };
  let failedFiles = 0;
  for (const [index, file] of files.entries()) {
    const result = runTestFile(file);
    if (result.counts) for (const key of Object.keys(totals) as Array<keyof Counts>) totals[key] += result.counts[key];
    console.log(`[${index + 1}/${files.length}] ${result.ok ? 'PASS' : 'FAIL'} ${relative(process.cwd(), file)}${result.counts ? ` (${result.counts.pass} pass, ${result.counts.fail} fail, ${result.counts.skip} skip, ${result.counts.todo} todo)` : ''}`);
    if (!result.ok) {
      failedFiles++;
      console.error(`${result.reason}\n${result.output}`);
    }
  }
  console.log(`${totals.pass} pass / ${totals.fail} fail / ${totals.skip} skip / ${totals.todo} todo / ${totals.expect} expect() calls`);
  console.log(`${files.length} fail dijalankan; ${failedFiles} fail gagal atau tidak lengkap.`);
  return failedFiles > 0 ? 1 : 0;
}

if (import.meta.main) {
  try {
    process.exitCode = runPlatformTests(process.argv.length > 2 ? process.argv.slice(2) : PLATFORM_TEST_SCOPE);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
