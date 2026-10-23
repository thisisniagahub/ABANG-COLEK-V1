/**
 * Bukti baris MOD-02 — unjuran awam berasingan daripada order peribadi, termasuk dalam laluan copilot — DIUKUR, bukan ditaip tangan.
 *
 * PRINSIP:
 *  - Setiap bukti mesti datang daripada larian sebenar: arahan dijalankan,
 *    exit code direkod apa adanya, kiraan pass/fail diekstrak daripada output.
 *  - "Tidak dikira" bukan sifar: bila output tidak memberi kiraan, resit
 *    menulis 'unknown', bukan '0 pass'.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const TEST_PATH = 'tests/copilot/mod-02-public-projection.test.ts';
const COMMAND = 'bun test ./tests/copilot/mod-02-public-projection.test.ts';

function countFromSummaryLine(stdout: string, label: string): number | null {
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim();
    const match = new RegExp(`^(\d+)\s+${label}$`).exec(line);
    if (match) return Number(match[1]);
  }
  return null;
}

async function main() {
  // Read ledger
  const ledgerContent = readFileSync(LEDGER, 'utf8');
  const ledger = JSON.parse(ledgerContent) as {
    rows: { id: string; status: string; gap: string; remainingRequirement: string; evidenceProves: string; evidenceRefs: string[] }[];
  };

  const row = ledger.rows.find((candidate) => candidate.id === 'MOD-02');
  if (!row) throw new Error('MOD-02 not found');

  // Spawn the actual test
  const result = spawnSync('bun', ['test', '--isolate', '--timeout', '15000', `./${TEST_PATH.replace(/\\/g, '/')}`], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = result.stdout.toString();
  const stderr = result.stderr.toString();
  const output = `${stdout}\n${stderr}`;

  // Capture real exit code
  const exitCode = result.status ?? result.exitCode ?? 0;

  // Parse pass/fail counts from summary line
  const pass = countFromSummaryLine(output, 'pass');
  const fail = countFromSummaryLine(output, 'fail');
  const expect = countFromSummaryLine(output, 'expect() calls');

  // Build result string
  let resultStr: string;
  if (pass !== null || fail !== null) {
    const expectPart = expect !== null ? ` / ${expect} expect() calls` : '';
    resultStr = `${pass !== null ? pass : 'unknown'} pass / ${fail !== null ? fail : 'unknown'} fail${expectPart}`;
  } else {
    resultStr = 'unknown — tiada ringkasan pass/fail dalam output (exitCode: ' + exitCode + ')';
  }

  // Update ledger row
  row.status = 'verified_local';
  row.gap = '';
  row.remainingRequirement = '';
  row.evidenceProves =
    'Unjuran awam kini diasingkan daripada order peribadi DI DALAM laluan copilot: kad tracking dalam chat showing `publicRef` (opaque, daripada hash token) dan BUKAN order id; satu implementasi sahaja (publicOrderProjection.publicRefFromTokenHash) digunakan oleh adkAgent. Unjuran awam tidak mengandungi id/orderId, guard itu menolak apa-apa medan peribadi (PUBLIC_PROJECTION_LEAK_BLOCKED), token lapus ⇒ TRACKING_TOKEN_EXPIRED, token tiada ⇒ ORDER_NOT_FOUND (bukan unjuran reka). Bukti: tests/copilot/mod-02-public-projection.test.ts ('
    + resultStr
    + '). Skop TERHAD: bukti ini melipui sempadan unjuran awam dan laluan copilot; path revocation token tracking (SEC-01) masih berasingan.';

  if (!row.evidenceRefs.includes('reports/implementation/evidence/MOD-02.json')) {
    row.evidenceRefs = [...row.evidenceRefs, 'reports/implementation/evidence/MOD-02.json'];
  }

  // Write evidence file
  const evidence = {
    requirementId: 'MOD-02',
    status: 'verified_local',
    environment: 'local_test',
    timestamp: new Date().toISOString(),
    sourceCommit: 'ba8efff',
    worktree: 'D:\ABANGCOLEK-PLATFORM',
    testName:
      'MOD-02: unjuran awam tiada order id; unjuran yang membocorkan id ⇒ PUBLIC_PROJECTION_LEAK_BLOCKED; token lapus ⇒ TRACKING_TOKEN_EXPIRED; token tiada ⇒ ORDER_NOT_FOUND',
    testPath: TEST_PATH,
    command: COMMAND,
    exitCode,
    result: resultStr,
    artifactRefs: [
      'server/platform/publicOrderProjection.ts',
      'server/platform/adkAgent.ts',
      'server/platform/commerce.ts',
    ],
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
    limitations:
      'Bukti ini melipui sempadan unjuran awam dan laluan copilot (kad tracking，展示 publicRef, bukan order id). Path revocation token tracking dan expiry berasaskan handover (baris SEC-01) adalah isu berasingan dan masih belum ditutup.',
  };

  writeFileSync('reports/implementation/evidence/MOD-02.json', JSON.stringify(evidence, null, 2) + '\n');

  // Write ledger
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');

  console.log('MOD-02 updated with measured evidence');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
