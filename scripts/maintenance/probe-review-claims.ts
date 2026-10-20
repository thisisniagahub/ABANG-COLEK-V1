/**
 * Probe the three HIGH claims against the real renderer/harness code.
 * Writes ONLY into a temp directory outside the repo.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kilo-probe-'));
console.log(`probe dir: ${tmp}`);

// --- CLAIM 1: the render path writes the file BEFORE checking errors ---
const statusSrc = fs.readFileSync('reports/implementation/acceptance-status.json', 'utf-8');
const verifySrc = fs.existsSync('reports/implementation/acceptance-verification.json')
  ? fs.readFileSync('reports/implementation/acceptance-verification.json', 'utf-8')
  : null;

// Force a validation error: point CPK-01 at a green suite while lint is red.
const broken = JSON.parse(statusSrc);
broken.rows.find((r: any) => r.id === 'CPK-01').testName = 'this test name does not exist anywhere';
broken.rows.find((r: any) => r.id === 'CPK-02').testFile = 'tests/frontend/copilot-gui06-a2ui.test.tsx';
broken.rows.find((r: any) => r.id === 'CPK-02').testName = 'a green frontend test that proves nothing about Streams';
broken.rows.find((r: any) => r.id === 'CPK-02').status = 'implemented_verified';
broken.rows.find((r: any) => r.id === 'CPK-01').evidenceRefs = ['reports/this-file-does-not-exist.json'];

const brokenStatusPath = path.join(tmp, 'status.json');
fs.writeFileSync(brokenStatusPath, JSON.stringify(broken, null, 2));

// Copy the renderer into the temp dir and point it at the broken status file.
const rendererPath = 'scripts/maintenance/render-acceptance-register.ts';
let renderer = fs.readFileSync(rendererPath, 'utf-8');
renderer = renderer
  .replace(/path\.resolve\(root, 'reports\/implementation\/acceptance-status\.json'\)/, JSON.stringify(brokenStatusPath))
  .replace(/path\.resolve\(root, 'reports\/implementation\/acceptance-verification\.json'\)/, JSON.stringify(path.join(tmp, 'verification.json')));
const tmpRenderer = path.join(tmp, 'renderer.ts');
fs.writeFileSync(tmpRenderer, renderer);
fs.writeFileSync(path.join(tmp, 'verification.json'), verifySrc ?? '{}');

const outPath = path.join(tmp, 'ACCEPTANCE-REGISTER.md');
const proc = Bun.spawnSync(['bun', tmpRenderer, '--out', outPath], { cwd: process.cwd() });
const stdout = proc.stdout.toString();
const stderr = proc.stderr.toString();

console.log('\n=== CLAIM 1: does the render path write before erroring? ===');
console.log(`exitCode: ${proc.exitCode}`);
console.log(`outputExists: ${fs.existsSync(outPath)}`);
console.log(`printedWriteNotice: ${stdout.includes('Written:')}`);

console.log('\n=== CLAIM 2: does the validator accept a non-existent testName / evidenceRef / scope swap? ===');
const checkProc = Bun.spawnSync(['bun', tmpRenderer, '--check'], { cwd: process.cwd() });
const checkOut = checkProc.stdout.toString();
console.log(checkOut.split('\n').filter((l) => l.includes('Validation:') || l.includes('CPK-01') || l.includes('CPK-02')).join('\n'));

console.log('\n=== CLAIM 3: does the junit parser treat errors/skipped as clean? ===');
const fakeXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="0" assertions="0" failures="0" errors="1" skipped="1" time="0.1">
  <testsuite name="tests\\platform\\broken.test.ts" file="tests\\platform\\broken.test.ts" tests="0" assertions="0" failures="0" errors="1" skipped="1" time="0.1" hostname="">
  </testsuite>
</testsuites>`;
const harnessMod = await import(path.resolve('scripts/maintenance/verify-acceptance.ts'));
const parsed = harnessMod.parseJunitFiles(fakeXml);
console.log('parseJunitFiles(brokenXml) =>', JSON.stringify(parsed));
console.log(
  'the parsed record exposes errors/skipped/zero-tests:',
  JSON.stringify(parsed[0] ?? {}),
);
console.log(
  '=> a file with errors=1, skipped=1 and ZERO executed tests parses with failures=0:',
  parsed[0] ? parsed[0].failures === 0 : 'no record',
);
console.log(
  '=> the renderer validator rejects only when failures > 0:',
  /observed\.failures > 0/.test(renderer),
);

console.log('\n=== CLAIM 4: are evidenceRefs existence-checked anywhere? ===');
console.log(
  'validator contains an evidenceRefs existence check:',
  /evidenceRefs[\s\S]{0,400}existsSync/.test(renderer),
);

console.log('\n=== CLAIM 5: is the write before the error check? ===');
const writeIdx = renderer.indexOf('fs.writeFileSync(outPath');
const errIdx = renderer.indexOf('if (errors.length > 0) process.exit(1);');
console.log(`writeFileSync(outPath) at char ${writeIdx}; final error exit at char ${errIdx}`);
console.log(`write happens BEFORE the error exit: ${writeIdx > 0 && writeIdx < errIdx}`);

console.log('\n=== CLAIM 6: does the harness fail on unavailable suites? ===');
const harness = fs.readFileSync('scripts/maintenance/verify-acceptance.ts', 'utf-8');
const exitBlock = harness.slice(harness.lastIndexOf('if (result.totals'));
console.log(exitBlock.trim());

console.log(`\nprobe dir left at: ${tmp}`);
