import { afterEach, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { discoverTests, parseTestCounts, runTestFile } from '../../scripts/test-platform';
import { join, resolve } from 'node:path';

const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));
function invoke(sources: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'platform-runner-'));
  temporary.push(dir);
  const files = sources.map((source, index) => {
    const file = join(dir, `fixture-${index}.test.ts`);
    writeFileSync(file, `import { test, expect } from 'bun:test';\n${source}`);
    return file;
  });
  const result = spawnSync(process.execPath, [resolve('scripts/test-platform.ts'), ...files], {
    encoding: 'utf8', timeout: 10000,
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

test('runner menjumlahkan fail lulus dan mengekalkan kiraan todo/skip', () => {
  const result = invoke(["test('satu', () => expect(1).toBe(1)); test.todo('baki');", "test('dua', () => expect(2).toBe(2)); test.skip('skip', () => {});"]);
  expect(result.status).toBe(0);
  expect(result.output).toContain('2 pass / 0 fail / 1 skip / 1 todo / 2 expect() calls');
});

test('runner meneruskan fail lain tetapi memulangkan kegagalan sebenar', () => {
  const result = invoke(["test('gagal', () => expect(1).toBe(2));", "test('sah', () => expect(1).toBe(1));"]);
  expect(result.status).toBe(1);
  expect(result.output).toContain('1 pass / 1 fail');
  expect(result.output).toContain('Expected: 2');
});

test('fail tanpa ujian tidak mendapat kejayaan palsu', () => {
  const result = invoke(['const kosong = true;']);
  expect(result.status).toBe(1);
  expect(result.output).toContain('tiada ringkasan ujian lengkap');
});

test('runner menghentikan proses tersekat dan menolak output tanpa ringkasan', () => {
  const dir = mkdtempSync(join(tmpdir(), 'platform-timeout-'));
  temporary.push(dir);
  const file = join(dir, 'hang.test.ts');
  writeFileSync(file, 'setInterval(() => {}, 1000); await new Promise(() => {});');
  const result = runTestFile(file, 100);
  expect(result.ok).toBe(false);
  expect(result.reason).toContain('ETIMEDOUT');
  expect(parseTestCounts('debug: 10 pass, 0 fail')).toBeNull();
});

test('discovery menyokong suffix Bun dan deduplikasi secara deterministik', () => {
  const dir = mkdtempSync(join(tmpdir(), 'platform-discovery-'));
  temporary.push(dir);
  const names = ['b_spec.mts', 'a.test.tsx', 'c.test.cjs', 'helper.ts'];
  for (const name of names) writeFileSync(join(dir, name), '');
  expect(discoverTests([dir, dir])).toEqual(names.slice(0, 3).map(name => join(dir, name)).sort());
});
