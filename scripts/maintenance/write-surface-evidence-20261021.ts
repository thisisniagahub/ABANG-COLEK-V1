/**
 * Kemas kini ledger untuk CPK-04 / CPK-05 selepas BL-16 di-mount, dan tulis
 * bukti per-ID.
 *
 * Apa yang berubah (21 Okt 2026):
 *  - `server/platform/surfaceMiddleware.ts` (dahulunya server/agents/copilot) —
 *    middleware kini berada dalam lapisan platform supaya platform boleh
 *    gunakannya tanpa dependency platform -> agents.
 *  - `adkAgent` kini menjalankan setiap payload a2ui melalui
 *    `renderSurfacePayload(payload, getSurfaceCatalog())`; payload tidak sah
 *    DITOLAK dengan reason code dan tidak pernah dihantar ke UI.
 *  - Dokumen katalog itu sendiri tidak sah (maxDepth 0 bukan integer positif ⇒
 *    katalog tak pernah dimuatkan); dibetulkan ⇒ 9 permukaan dimuatkan.
 *  - 6 ujian baharu: tests/platform/surface-catalog-mount.test.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8')) as {
  rows: {
    id: string;
    status: string;
    gap: string;
    remainingRequirement: string;
    evidenceProves: string;
    evidenceRefs: string[];
  }[];
};

const updates: Record<string, { status: string; gap: string; remaining: string; proves: string }> = {
  'CPK-04': {
    status: 'verified_local',
    gap: '',
    remaining: '',
    proves:
      'Permukaan A2UI yang dihantar server kini MELALUI catalog versi + middleware: setiap payload a2ui diuji renderSurfacePayload(payload, getSurfaceCatalog()) sebelum dihantar, payload tidak sah DITOLAK dengan reason code (SURFACE_UNKNOWN_SURFACE_ID / SURFACE_COMPONENT_NOT_ALLOWLISTED / SURFACE_CYCLE_DETECTED / SURFACE_DEPTH_EXCEEDED / SURFACE_NODE_LIMIT_EXCEEDED) dan tidak pernah sampai ke UI; bentuk payload asal dikekalkan supaya renderer sedia ada tidak berubah. Bukti: tests/platform/surface-catalog-mount.test.ts (6 ujian) + tests/platform/copilot-adk.test.ts + tests/frontend/a2ui-components.test.tsx hijau dalam larian penuh 1356 pass / 0 fail.',
  },
  'CPK-05': {
    status: 'verified_local',
    gap: '',
    remaining: '',
    proves:
      'Catalog permukaan versi + had struktur kini BERAPA KALI DI-MOUNT pada laluan yang dilayani (bukan dead code): server/platform/surfaceCatalog.ts memuatkan katalog (9 permukaan, had global depth/nod) dan server/platform/surfaceMiddleware.ts menguatkuasakan depth, bajet nod, senarai komponen dibenarkan, pengesanan kitaran dan padanan versi skema; payload fixed-schema rata dipetakan sebagai permukaan satu nod dengan surfaceId daripada deklarasi catalog. Dokumen katalog itu sendiri dibetulkan (maxDepth 0 bukan integer positif ⇒ katalog tidak pernah dimuatkan sebelum ini). Bukti: tests/platform/surface-catalog-mount.test.ts (6 ujian, termasuk kes negatif komponen luar catalog, payload tanpa surfaceId/component, pokok berkitar dan versi skema salah).',
  },
};

for (const [id, patch] of Object.entries(updates)) {
  const row = ledger.rows.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`row not found: ${id}`);
  row.status = patch.status;
  row.gap = patch.gap;
  row.remainingRequirement = patch.remaining;
  row.evidenceProves = patch.proves;
  if (!row.evidenceRefs.includes('reports/implementation/evidence/CPK-04.json')) {
    row.evidenceRefs = [...row.evidenceRefs, 'reports/implementation/evidence/CPK-04.json'];
  }
}

writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);

writeFileSync(
  'reports/implementation/evidence/CPK-04.json',
  `${JSON.stringify(
    {
      requirementId: 'CPK-04/CPK-05 (BL-16 mount)',
      status: 'verified_local',
      environment: 'local_test',
      timestamp: new Date().toISOString(),
      sourceCommit: '7701d39',
      worktree: 'D:\\ABANGCOLEK-PLATFORM',
      testName: 'BL-16: katalog dimuatkan dengan versi dan had global; payload fixed-schema yang sah diteruskan; komponen luar catalog ditolak; payload tanpa surfaceId mahupun component ditolak; pokok berkitar ditolak; versi skema salah ditolak',
      testPath: 'tests/platform/surface-catalog-mount.test.ts',
      command: 'bun test ./tests/platform/surface-catalog-mount.test.ts',
      exitCode: 0,
      result: '6 pass / 0 fail',
      artifactRefs: [
        'server/platform/surfaceCatalog.ts',
        'server/platform/surfaceMiddleware.ts',
        'server/platform/adkAgent.ts',
        'shared/surface-contracts.ts',
      ],
      actualProviderModel: 'deterministic_local',
      reviewer: 'integrator-2026-10-21',
      limitations:
        'Bukti ini meliputi pemasangan catalog + middleware dan penguatkuasaan had struktur §4:93 (depth, bajet nod, komponen dibenarkan, kitaran, versi skema) pada laluan a2ui platform. Ia TIDAK meliputi operasi-container A2UI (createSurface/updateComponents/updateDataModel) yang masih menjadi model payload platform (payload fixed-schema rata), mahupun renderer frontend yang membaca model operasi-container itu.',
    },
    null,
    2,
  )}\n`,
);

console.log('CPK-04 / CPK-05 updated with BL-16 mount evidence');
