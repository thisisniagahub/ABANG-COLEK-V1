/**
 * Selaraskan status ledger ↔ bukti bagi 6 baris yang bercanggah (audit
 * `scripts/maintenance/audit-ledger-evidence-20261021.ts`).
 *
 * Prinsip: bukti yang lebih SPESIFIK menang. Bila bukti menunjukkan requirement
 * belum penuh, `verified_local` adalah overclaim — turun taraf kepada status
 * yang jujur (implemented_unverified / partial / blocked_external).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ledgerPath = 'reports/implementation/acceptance-status.json';
const evidenceDir = 'reports/implementation/evidence';

/* --- (1) bukti yang overclaim: turun taraf status dalam fail bukti ------- */
const downgrade: Record<string, { status: string; note: string }> = {
  'CPK-06': {
    status: 'implemented_unverified',
    note:
      ' Bukti ini hanya meliputi kelifecycle proposal/execution; requirement penuh (executor didaftar untuk SETIUP action type yang diluluskan, bukan refund.execute sahaja) belum dipenuhi —/scripts review offen',
  },
  'GUI-06': {
    status: 'implemented_unverified',
    note:
      ' Bukti ini meliputi allowlist + anti-injection sahaja; had struktur A2UI §4:93 (2 surfaces/64 components/depth 8/128 patch ops/512 ops) dan catalog A2UI ber versioning belum di-mount ke laluan dilayani',
  },
  'PAY-02': {
    status: 'blocked_external',
    note:
      ' Perjalanan hujung-ke-hujung (redirect + callback pembekal sebenar) memerlukan kredensial merchant gateway + PLATFORM_PAYMENT_WEBHOOK_SECRET; hanya separuh tempatan disahkan',
  },
  'SEC-01': {
    status: 'implemented_unverified',
    note:
      ' Bukti ini meliputi revocation semasa strim muat naik sahaja; requirement penuh (public tracking token: expiry handover, revocation path, per-token rate limit) belum dipenuhi',
  },
};

for (const [id, patch] of Object.entries(downgrade)) {
  const path = `${evidenceDir}/${id}.json`;
  const evidence = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  evidence.status = patch.status;
  evidence.limitations = `${evidence.limitations ?? ''}${patch.note}`.trim();
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`evidence ${id}: status -> ${patch.status}`);
}

/* --- (2) ledger: baris yang overclaimikut bukti ----------------------- */
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) as {
  rows: { id: string; status: string }[];
};
const ledgerDowngrade: Record<string, string> = {
  'ARC-01': 'partial',
  'REL-01': 'partial',
};
for (const [id, status] of Object.entries(ledgerDowngrade)) {
  const row = ledger.rows.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`row not found: ${id}`);
  row.status = status;
  console.log(`ledger ${id}: status -> ${status}`);
}
writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
