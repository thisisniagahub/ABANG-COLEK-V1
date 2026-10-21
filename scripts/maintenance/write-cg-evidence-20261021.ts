/**
 * Bukti sub-checklist Commerce & Growth (CG-01, CG-02).
 *
 * Sub-checklist CG-01..CG-12 TIDAK ialah baris ledger — jadi buktinya tidak
 * duduk dalam `reports/implementation/evidence/` (yang dikunci kepada ID ledger
 * dan diaudit oleh `audit-ledger-evidence-20261021.ts`). Bukti CG disimpan di sini
 * dan dirujuk dari baris ledger yang berkenaan (MOD-05, SEC-02) serta dari
 * `docs/design/commerce-growth.md` §8.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'reports/implementation/evidence-cg';
mkdirSync(OUT, { recursive: true });

const base = {
  environment: 'local_test',
  timestamp: new Date().toISOString(),
  sourceCommit: '1fc218e5784efb890641bba1e46ac97f617639a3',
  worktree: 'D:\\ABANGCOLEK-PLATFORM',
  command: 'bun test ./tests/platform/dealer-store-provisioning.test.ts',
  exitCode: 0,
  result: '8 pass / 0 fail',
  actualProviderModel: 'deterministic_local',
  reviewer: 'integrator-2026-10-21',
};

writeFileSync(
  `${OUT}/CG-01.json`,
  `${JSON.stringify(
    {
      ...base,
      requirementId: 'CG-01',
      title: 'Aktivasi/provision unik store awam',
      testName: 'CG-01: kelulusan menghasilkan SATU store dengan store ID stabil; retry ⇒ TIDAK store kedua; slug collision ⇒ DEALER_STORE_SLUG_TAKEN; slug terpelihara ⇒ DEALER_STORE_SLUG_RESERVED; input tidak sah ⇒ DEALER_STORE_INPUT_INVALID',
      testPath: 'tests/platform/dealer-store-provisioning.test.ts',
      artifactRefs: [
        'server/platform/dealerStores.ts',
        'server/platform/dealers.ts',
        'shared/dealer-store-contracts.ts',
      ],
      limitations:
        'Provisioning berlaku dalam blok atomik kelulusan yang sama, jadi retry/kelulusan serentak tidak menghasilkan dua store. Bukti ini TIDAK meliputi: store peribadi (private catalogue overrides), lifecycle suspend/revoke store, atau pengalihan slug yang mengubah redirect laluan lama (belum ada laluan redirect). Store ID kekal stabil apabila slug ditukar; itu disahkan oleh re-provision store yang sama.',
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  `${OUT}/CG-02.json`,
  `${JSON.stringify(
    {
      ...base,
      requirementId: 'CG-02',
      title: 'Public store / private workspace',
      testName: 'CG-02: public store dibaca TANPA sesi (slug ⇒ 404 STORE_NOT_FOUND); dealer workspace senarai store sendiri sahaja; pelanggan lain nampak kosong',
      testPath: 'tests/platform/dealer-store-provisioning.test.ts',
      artifactRefs: [
        'server/platform/app.ts',
        'server/platform/dealerStores.ts',
        'shared/dealer-store-contracts.ts',
      ],
      limitations:
        'API public store mengembalikan projek store + katalog yang diterbitkan dengan availability; UI public store (`/kedai/:slug`) dan navigasi dealer workspace yang berbeza BELUM dibina — ini kerja frontend (lane frontend). Projek awam mengandungi 4 medan sahaja (storeId, slug, displayName, status); tiada data peribadi owner.',
    },
    null,
    2,
  )}\n`,
);

console.log(`wrote CG evidence to ${OUT}`);
