import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LANES, buildReceipt, measureBunTest, measurePytest, runLanes, writeReceipt } from '../../scripts/maintenance/write-measured-evidence-20261021';

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));

function measure(source: string) {
  const directory = mkdtempSync(join(tmpdir(), 'evidence-regression-'));
  directories.push(directory);
  const file = join(directory, 'fixture.test.ts');
  writeFileSync(file, `import { test, expect } from 'bun:test';\n${source}`);
  return measureBunTest([file], process.cwd());
}

test('resit mengukur pass dan assertion sebenar', () => {
  const result = measure("test('sah', () => { expect(2 + 2).toBe(4); });");
  expect(result.exitCode).toBe(0);
  expect(result.green).toBe(true);
  expect(result.pass).toBe(1);
  expect(result.fail).toBe(0);
  expect(result.expectCalls).toBe(1);
});

test('ujian gagal tidak boleh menerbitkan status verified', () => {
  const result = measure("test('gagal', () => { expect(2 + 2).toBe(5); });");
  expect(result.exitCode).not.toBe(0);
  expect(result.fail).toBe(1);
  expect(result.green).toBe(false);
  const receipt = buildReceipt({receipt: LANES[0].receipts[0], measurement: result, commit:'fixture', worktree:process.cwd(), timestamp:new Date().toISOString()});
  expect(receipt.status).toBe('implemented_unverified');
  expect(receipt.exitCode).not.toBe(0);
});

test('fail tanpa ujian dan ujian skip bukan bukti lulus', () => {
  expect(measure('const value = 1;').green).toBe(false);
  expect(measure("test.skip('tertangguh', () => expect(true).toBe(true));").green).toBe(false);
});

function scratch() {
  const directory = mkdtempSync(join(tmpdir(), 'evidence-integrity-'));
  directories.push(directory);
  return directory;
}

for (const outcome of ['passed', 'failed']) {
  for (const status of ['blocked_external', 'implemented_unverified']) {
    test(`ledger mengekalkan gate luaran apabila ${outcome} dari ${status}`, () => {
      const directory = scratch();
      mkdirSync(join(directory, 'tests/platform'), { recursive: true });
      writeFileSync(join(directory, 'tests/platform/adv-row-contracts-3.test.ts'),
        `import { test, expect } from 'bun:test'; test('ADV-15 fixture', () => expect(true).toBe(${outcome === 'passed'}));`);
      const row = { id: 'ADV-15', status, externalGate: { reason: 'credential' }, gap: 'Kredensial belum ada', remainingRequirement: 'Callback sebenar', evidenceProves: '', evidenceRefs: [] };
      const ledgerPath = join(directory, 'ledger.json');
      writeFileSync(ledgerPath, JSON.stringify({ rows: [row] }));
      const result = runLanes({ repoRoot: directory, outRoot: directory, ledgerPath, only: new Set(['adv15']), selfTest: false });
      const actual = JSON.parse(readFileSync(ledgerPath, 'utf8')).rows[0];
      expect(result.green).toBe(outcome === 'passed');
      expect(actual.status).toBe(row.status);
      expect(actual.externalGate).toEqual(row.externalGate);
      expect(actual.gap).toBe(row.gap);
      expect(actual.remainingRequirement).toBe(row.remainingRequirement);
    });
  }
}

for (const suffix of ['1 skipped', '1 xfailed', '1 xpassed', '1 error']) {
  test(`pytest ${suffix} bukan bukti lengkap`, () => {
    const directory = scratch();
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ scripts: { fixture: 'bun fixture.js' } }));
    writeFileSync(join(directory, 'fixture.js'), `console.log('=== 2 passed, ${suffix} in 0.02s ===');`);
    const result = measurePytest('fixture', directory);
    expect(result.exitCode).toBe(0);
    expect(result.green).toBe(false);
    if (!suffix.includes('error')) expect(result.skip).toBe(1);
  });
}

test('resit JSON rosak tidak ditimpa dan metadata sah dikekalkan', () => {
  const target = join(scratch(), 'receipt.json');
  const original = '{"corrections": broken';
  writeFileSync(target, original);
  expect(() => writeReceipt(target, { status: 'verified_local' })).toThrow();
  expect(readFileSync(target, 'utf8')).toBe(original);
  writeFileSync(target, JSON.stringify({ corrections: ['sejarah'], status: 'old' }));
  writeReceipt(target, { status: 'verified_local' });
  expect(JSON.parse(readFileSync(target, 'utf8'))).toEqual({ corrections: ['sejarah'], status: 'verified_local' });
});

for (const [output, green] of [
  ['=== 2 passed in 0.02s ===', true],
  ['2 passed, 1 warning in 0.02s', true],
  ['debug: 2 passed before interruption', false],
  ['=== 2 passed, 1 deselected in 0.02s ===', false],
] as const) {
  test(`pytest ringkasan lengkap diperlukan: ${output}`, () => {
    const directory = scratch();
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ scripts: { fixture: 'bun fixture.js' } }));
    writeFileSync(join(directory, 'fixture.js'), `console.log(${JSON.stringify(output)});`);
    const result = measurePytest('fixture', directory);
    expect(result.green).toBe(green);
    if (green) {
      expect(result.pass).toBe(2);
      expect(result.fail).toBe(0);
      expect(result.skip).toBe(0);
    }
  });
}
