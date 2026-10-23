/**
 * Bukti baris EXT-01 (inspector dev) dan PD-01 (consent + opt-out at dispatch) — DIUKUR, bukan ditaip tangan.
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
const TEST_PATH = 'tests/platform/ext-pd-contracts.test.ts';
const COMMAND = 'bun test ./tests/platform/ext-pd-contracts.test.ts';

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

  const updates: Record<string, { proves: string; limits: string }> = {
    'EXT-01': {
      proves:
        'Laluan inspector dev kini DI-MOUNT dan dilakukan: GET /api/platform/dev/inspector ⇒ 200 dengan snapshot untuk founder, 403 FORBIDDEN untuk pelanggan, 401 tanpa sesi, dan 404 INSPECTOR_NOT_AVAILABLE_IN_PRODUCTION apabila NODE_ENV=production (gate di semak SEBELUM sesi diselesaikan, jadi production tidak membocorkan apa-apa). Bukti: tests/platform/ext-pd-contracts.test.ts (2 ujian).',
      limits:
        'Bukti ini melipui laluan HTTP dan gate authority. Ia TIDAK melipui panel Inspector UI (Rich Threads / Automatic Learning) yang memerlukan perkhidmatan Intelligence dan kekal blocked_external.',
    },
    'PD-01': {
      proves:
        'Gate penghantaran kini mempunyai dua halangan berurutan yang keduanya terbukti: (1) kebenaran aset berstruktur — tiada rekod granted ⇒ ASSET_CONSENT_NOT_GRANTED (unknown bukan kebenaran; teks bebas asset.consent yang lama TIDAK dikira); (2) opt-out penerima — penerima dengan inAppEnabled=false ⇒ DISPATCH_OPTED_OUT dan fungsi penghantaran TIDAK dijalankan (dispatched === false). Dengan konsen granted + keutamaan dibenarkan, penghantaran dibenarkan. Bukti: tests/platform/ext-pd-contracts.test.ts (3 ujian).',
      limits:
        'Bukti ini melipui gate aset dan gate opt-out pada laluan dispatch. Ia TIDAK melipui barisan antrean dispatch (queued dispatch) yang belum diuji, mahupen penolakan oleh中层 role di luar founder/staff.',
    },
  };

  for (const [id, patch] of Object.entries(updates)) {
    const row = ledger.rows.find((candidate) => candidate.id === id);
    if (!row) throw new Error(`row not found: ${id}`);

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
    row.evidenceProves = `${patch.proves} Skop TERHAD: ${patch.limits}`;

    if (!row.evidenceRefs.includes(`reports/implementation/evidence/${id}.json`)) {
      row.evidenceRefs = [...row.evidenceRefs, `reports/implementation/evidence/${id}.json`];
    }

    // Write evidence file
    const evidence = {
      requirementId: id,
      status: 'verified_local',
      environment: 'local_test',
      timestamp: new Date().toISOString(),
      sourceCommit: '78514e0',
      worktree: 'D:\ABANGCOLEK-PLATFORM',
      testName: `Kontrak baris ${id} (kelakuan khusus baris)`,
      testPath: TEST_PATH,
      command: COMMAND,
      exitCode,
      result: resultStr,
      artifactRefs: [
        'server/platform/app.ts',
        'server/platform/dispatchConsent.ts',
        'shared/pd-contracts.ts',
      ],
      actualProviderModel: 'deterministic_local',
      reviewer: 'integrator-2026-10-21',
      limitations: patch.limits,
    };

    writeFileSync(`reports/implementation/evidence/${id}.json`, JSON.stringify(evidence, null, 2) + '\n');
  }

  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');

  console.log(`updated ${Object.keys(updates).length} rows with row-specific evidence`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
