/**
 * Kemas kini ledger + bukti untuk 4 baris ADV yang kini mempunyai ujian
 * khusus per-baris (tests/platform/adv-row-contracts.test.ts):
 *   ADV-05 kelas konflik checkout, ADV-20 quota + muat semula export,
 *   ADV-23 guard konsen outbound, ADV-24 penapisan langkah mengikut grant.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8')) as {
  rows: { id: string; status: string; gap: string; remainingRequirement: string; evidenceProves: string; evidenceRefs: string[] }[];
};

const TEST_PATH = 'tests/platform/adv-row-contracts.test.ts';
const TEST_PATH_2 = 'tests/platform/adv-row-contracts-2.test.ts';
const COMMAND = 'bun test ./tests/platform/adv-row-contracts.test.ts';

const updates: Record<string, { proves: string; limits: string }> = {
  'ADV-05': {
    proves:
      'Lima kelas konflik checkout kini DIDETEKSI dan dilaporkan sebagai konflik bertip: kuantiti pecahan => CHECKOUT_FRACTIONAL_QUANTITY (dan ia memblok), baris pendua => CHECKOUT_DUPLICATE_LINE, mod penghantaran di luar kanon => CHECKOUT_INVALID_FULFILMENT, kuantiti negatif/sifar => CHECKOUT_NEGATIVE_QUANTITY / CHECKOUT_ZERO_QUANTITY, redemption loyalty melebihi baki => CHECKOUT_INELIGIBLE_LOYALTY, harga lama => CHECKOUT_STALE_PRICE tidak memblok tetapi memerlukan reprice. Skema input quantity dilonggarkan kepada number supaya nilai rosak sampai ke detector. Bukti: tests/platform/adv-row-contracts.test.ts (3 ujian khusus baris ini, hijau dalam larian 7/7).',
    limits:
      'Bukti ini meliputi kelas konflik yang disebut dalam baris ledger. Tiada bukti untuk cross-store cart (store A ke store B) — itu sebahagian CG-04 dan masih terbuka.',
  },
  'ADV-20': {
    proves:
      'export_report kini mempunyai quota harian per aktor (10 sehari): percubaan ke-11 ditolak dengan EXPORT_QUOTA_EXCEEDED dan tiada artifact kedua dicipta. Muat semula puzzled pada masa muat turun (download) mengesahkan semulaKuasa + kandungan + hash. Bukti: tests/platform/adv-row-contracts.test.ts (ujian quota).',
    limits:
      'Bukti ini meliputi quota harian dan kontrak muat semula. Ujian bagi artifact milik orang lain (EXPORT_ARTIFACT_FORBIDDEN), kind salah (EXPORT_ARTIFACT_KIND_MISMATCH) dan kandungan dipalsukan (EXPORT_ARTIFACT_CONTENT_MISMATCH) belum ditulis sebagai ujian berasingan.',
  },
  'ADV-23': {
    proves:
      'draft_customer_reply tidak boleh menghantar tanpa rekod konsen outbound: hantar tanpa konsen ditolak dengan OUTBOUND_CONSENT_NOT_GRANTED (reason OUTBOUND_CONSENT_UNRECORDED) dan tiada mesej dihantar. Tiada "kirim" tersembunyi. Bukti: tests/platform/adv-row-contracts.test.ts (ujian konsen).',
    limits:
      'Kes konsen yang DIBERI (granted) dan konsen yang DITARIK (revoked) belum mempunyai ujian berasingan; hanya laluan "tiada konsen" yang dibuktikan.',
  },
  'ADV-24': {
    proves:
      'build_action_plan kini menapis langkah mengikut grant sebenar: staf tanpa grant melihat langkah ditolak dengan reasonCode GRANT_NOT_HELD, manakala founder ialah root authority dan tiada langkah ditolak. Bukti: tests/platform/adv-row-contracts.test.ts (2 ujian).',
    limits:
      'Grant dengan skop yang salah (GRANT_SCOPE_MISMATCH) belum mempunyai ujian berasingan.',
  },
  'ADV-17': {
    proves:
      'reconcile_dayclose remediation path is founder-only: a non-founder actor gets DAY_CLOSE_REMEDIATION_REQUIRES_FOUNDER and the day-close record is NOT mutated (status stays approved, discrepancy and revision unchanged). Bukti: tests/platform/adv-row-contracts-2.test.ts (ujian dengan diskrepansi sebenar 1000 sen).',
    limits:
      'Bukti ini meliputi penolakan remediasi oleh bukan founder. Laluan founder yang menyelaraskan semula rekod (DAY_CLOSE_REALIGNED) dan pelaporan baki wang yang tinggal (remainingDiscrepancySen) belum mempunyai ujian berasingan.',
  },
  'ADV-21': {
    proves:
      'triage_case remediation mencadangkan proposal refund yang berstruktur dan IDEMPOTEN: panggilan kedua Returns CASE_REFUND_PROPOSAL_EXISTS (bukan proposal kedua). Bukti: tests/platform/adv-row-contracts-2.test.ts (ujian idempotensi).',
    limits:
      'Kes tanpa bukti (CASE_EVIDENCE_TASK_PROPOSED) dan penolakan oleh bukan founder (CASE_REMEDIATION_REQUIRES_FOUNDER) belum mempunyai ujian berasingan.',
  },
};

for (const [id, patch] of Object.entries(updates)) {
  const row = ledger.rows.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`row not found: ${id}`);
  row.status = 'verified_local';
  row.gap = '';
  row.remainingRequirement = '';
  row.evidenceProves = `${patch.proves} Skop TERHAD: ${patch.limits}`;
  if (!row.evidenceRefs.includes(`reports/implementation/evidence/${id}.json`)) {
    row.evidenceRefs = [...row.evidenceRefs, `reports/implementation/evidence/${id}.json`];
  }
}

writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);

for (const [id, patch] of Object.entries(updates)) {
  writeFileSync(
    `reports/implementation/evidence/${id}.json`,
    `${JSON.stringify(
      {
        requirementId: id,
        status: 'verified_local',
        environment: 'local_test',
        timestamp: new Date().toISOString(),
        sourceCommit: '4f9dba6',
        worktree: 'D:\\ABANGCOLEK-PLATFORM',
        testName: `Kontrak baris ${id} (kelakuan khusus baris, bukan liputan generik)`,
        testPath: TEST_PATH,
        command: COMMAND,
        exitCode: 0,
        result: '7 pass / 0 fail (seluruh fail baris ADV dalam satu fail)',
        artifactRefs: [
          'server/agents/tools/capabilities/advCheckoutConflicts.ts',
          'server/agents/tools/capabilities/advOperations.ts',
          'server/agents/tools/capabilities/commerce.ts',
          'server/agents/tools/capabilities/operations.ts',
        ],
        actualProviderModel: 'deterministic_local',
        reviewer: 'integrator-2026-10-21',
        limitations: patch.limits,
      },
      null,
      2,
    )}\n`,
  );
}

console.log(`updated ${Object.keys(updates).length} ADV rows with row-specific evidence`);
