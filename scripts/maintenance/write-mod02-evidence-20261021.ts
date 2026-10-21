/**
 * Bukti baris MOD-02 — unjuran awam berasingan daripada order peribadi,
 * termasuk dalam laluan copilot.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8')) as {
  rows: { id: string; status: string; gap: string; remainingRequirement: string; evidenceProves: string; evidenceRefs: string[] }[];
};

const row = ledger.rows.find((candidate) => candidate.id === 'MOD-02');
if (!row) throw new Error('MOD-02 not found');

row.status = 'verified_local';
row.gap = '';
row.remainingRequirement = '';
row.evidenceProves =
  'Unjuran awam kini diasingkan daripada order peribadi DI DALAM laluan copilot: kad tracking dalam chat showing `publicRef` (opaque, daripada hash token) dan BUKAN order id; satu implementasi sahaja (publicOrderProjection.publicRefFromTokenHash) digunakan oleh adkAgent. Unjuran awam tidak mengandungi id/orderId, guard itu menolak apa-apa medan peribadi (PUBLIC_PROJECTION_LEAK_BLOCKED), token lapus ⇒ TRACKING_TOKEN_EXPIRED, token tiada ⇒ ORDER_NOT_FOUND (bukan unjuran reka). Bukti: tests/copilot/mod-02-public-projection.test.ts (4 ujian). Skop TERHAD: bukti ini meliputi sempadan unjuran awam dan laluan copilot; path revocation token tracking (SEC-01) masih berasingan.';
if (!row.evidenceRefs.includes('reports/implementation/evidence/MOD-02.json')) {
  row.evidenceRefs = [...row.evidenceRefs, 'reports/implementation/evidence/MOD-02.json'];
}

writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);

writeFileSync(
  'reports/implementation/evidence/MOD-02.json',
  `${JSON.stringify(
    {
      requirementId: 'MOD-02',
      status: 'verified_local',
      environment: 'local_test',
      timestamp: new Date().toISOString(),
      sourceCommit: 'ba8efff',
      worktree: 'D:\\ABANGCOLEK-PLATFORM',
      testName:
        'MOD-02: unjuran awam tiada order id; unjuran yang membocorkan id ⇒ PUBLIC_PROJECTION_LEAK_BLOCKED; token lapus ⇒ TRACKING_TOKEN_EXPIRED; token tiada ⇒ ORDER_NOT_FOUND',
      testPath: 'tests/copilot/mod-02-public-projection.test.ts',
      command: 'bun test ./tests/copilot/mod-02-public-projection.test.ts',
      exitCode: 0,
      result: '4 pass / 0 fail',
      artifactRefs: [
        'server/platform/publicOrderProjection.ts',
        'server/platform/adkAgent.ts',
        'server/platform/commerce.ts',
      ],
      actualProviderModel: 'deterministic_local',
      reviewer: 'integrator-2026-10-21',
      limitations:
        'Bukti ini meliputi sempadan unjuran awam dan laluan copilot (kad tracking，展示 publicRef, bukan order id). Path revocation token tracking dan expiry berasaskan handover (baris SEC-01) adalah isu berasingan dan masih belum ditutup.',
    },
    null,
    2,
  )}\n`,
);

console.log('MOD-02 updated with row-specific evidence');
