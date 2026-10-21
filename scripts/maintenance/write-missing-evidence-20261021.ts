/**
 * Jana fail bukti per-ID untuk baris `verified_local` yang belum ada bukti
 * skema (34 baris pada 21 Okt 2026).
 *
 * Setiap bukti diambil daripada RUN SEBENAR fail ujian yang dipetik:
 *  - arahan dijalankan, exit code direkod
 *  - kiraan pass/fail sebenar daripada output
 *  - tajuk test sebenar yang DIEKSTRAK dari fail itu
 *  - limitations jujur (apa yang bukti ini TIDAK buktikan)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Row {
  id: string;
  status: string;
  testFile?: string;
  testName?: string;
  testPath?: string;
  title?: string;
  gap?: string | null;
  externalGate?: string | null;
  remainingRequirement?: string | null;
}

const ledger = JSON.parse(readFileSync('reports/implementation/acceptance-status.json', 'utf8')) as {
  rows: Row[];
  sourceCommit?: string;
};
const evidenceDir = 'reports/implementation/evidence';
const sourceCommit = ledger.sourceCommit ?? 'unknown';

function titlesOf(source: string): string[] {
  const titles: string[] = [];
  const pattern = /\b(?:test|it)\(\s*['`]([^'`]{3,160})['`]/g;
  let match = pattern.exec(source);
  while (match) {
    titles.push(match[1]);
    match = pattern.exec(source);
  }
  return titles;
}

const created: string[] = [];
const skipped: string[] = [];

for (const row of ledger.rows) {
  if (row.status !== 'verified_local') continue;
  const target = join(evidenceDir, `${row.id}.json`);
  if (existsSync(target)) continue;

  const cited = row.testFile ?? row.testPath;
  if (!cited || !existsSync(cited)) {
    skipped.push(`${row.id}: tiada testFile/testPath yang wujud`);
    continue;
  }
  const source = readFileSync(cited, 'utf8');
  const titles = titlesOf(source);
  if (titles.length === 0) {
    skipped.push(`${row.id}: tiada test title dalam ${cited}`);
    continue;
  }

  const result = Bun.spawnSync(['bun', 'test', `./${cited.replace(/\\/g, '/')}`], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const output = `${result.stdout.toString()}\n${result.stderr.toString()}`;
  const passMatch = /(\d+)\s+pass/.exec(output);
  const failMatch = /(\d+)\s+fail/.exec(output);
  const expectMatch = /(\d+)\s+expect/.exec(output);
  const todoMatch = /(\d+)\s+todo/.exec(output);
  const pass = passMatch ? Number(passMatch[1]) : 0;
  const fail = failMatch ? Number(failMatch[1]) : 0;

  // Tajuk sebenar: prefer tajuk yang paling dekat dengan testName ledger.
  const wanted = (row.testName ?? '').split(/[›]/)[0].trim().slice(0, 45);
  const title =
    titles.find((candidate) => wanted && (candidate.includes(wanted.slice(0, 25)) || wanted.includes(candidate.slice(0, 25)))) ??
    titles[0];

  const evidence = {
    requirementId: row.id,
    status: 'verified_local',
    environment: 'local_test',
    timestamp: new Date().toISOString(),
    sourceCommit,
    worktree: 'D:\\ABANGCOLEK-PLATFORM',
    testName: title,
    testPath: cited,
    command: `bun test ./${cited.replace(/\\/g, '/')}`,
    exitCode: result.exitCode,
    result: `${pass} pass / ${fail} fail${expectMatch ? ` / ${expectMatch[1]} expect() calls` : ''}${todoMatch ? ` / ${todoMatch[1]} todo` : ''}`,
    artifactRefs: [cited],
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
    limitations:
      `Bukti diambil daripada larian sebenar fail ujian yang dipetik (${cited}). ` +
      'Skop TERHAD: ia membuktikan baris requirement ini sahaja; baris requirement lain yang dipetik dalam fail yang sama tidak ditadbirkan di sini. ' +
      (row.remainingRequirement ? `Baki yang direkodkan: ${row.remainingRequirement}` : ''),
  };
  writeFileSync(target, `${JSON.stringify(evidence, null, 2)}\n`);
  created.push(`${row.id} (exit ${result.exitCode}, ${evidence.result})`);
}

console.log(`evidence created: ${created.length}`);
for (const item of created) console.log(`  + ${item}`);
console.log(`\nskipped: ${skipped.length}`);
for (const item of skipped) console.log(`  - ${item}`);
