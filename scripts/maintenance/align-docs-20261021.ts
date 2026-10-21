/**
 * KILO-09 — selaraskan dokumen yang tercicir (audit AUD-DOCS, 21 Okt 2026):
 *  - version truth: blueprint v2.3 ⇒ v2.4 (7 fail, arkib dikecualikan)
 *  - pautan mati dalam backlog (6 laluan ujian yang dinamakan semula)
 *  - ringkasan backlog yang bercanggah dengan ledger semasa
 *  - salinan register provider yang lapuz di docs/architecture/
 *  - AGENTS.md: senarai `test:platform` + status render register
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const changes: string[] = [];

function edit(path: string, pairs: [string, string][]): void {
  if (!existsSync(path)) {
    changes.push(`SKIP (tiada): ${path}`);
    return;
  }
  let content = readFileSync(path, 'utf8');
  let touched = 0;
  for (const [from, to] of pairs) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      touched += 1;
    }
  }
  if (touched > 0) {
    writeFileSync(path, content);
    changes.push(`${path}: ${touched} penggantian`);
  }
}

/* --- 1. Version truth: v2.3 ⇒ v2.4 ------------------------------------ */
const versionFiles = [
  'docs/handover/AGY-MASTER-IMPLEMENTATION-PROMPT.md',
  'docs/handover/MARKDOWN-ALIGNMENT-REGISTER.md',
  'docs/research/2026-10-19-github-project-structure.md',
  'docs/superpowers/plans/2026-10-19-copilotkit-ten-features.md',
  'docs/decisions/0001-project-authority-and-continuity.md',
  'docs/decisions/0002-zero-new-spend-hosting-topology.md',
];
for (const file of versionFiles) {
  edit(file, [
    ['master blueprint v2.3', 'master blueprint v2.4'],
    ['Master blueprint v2.3', 'Master blueprint v2.4'],
    ['blueprint v2.3', 'blueprint v2.4'],
  ]);
}

/* --- 2. Backlog: pautan mati + ringkasan bercanggah ------------------- */
edit('reports/open-task-backlog-20261021.md', [
  ['tests/platform/ref-01-risk-engine.test.ts', 'tests/platform/loyalty-redemption-risk.test.ts'],
  ['tests/platform/dr-01-recovery-rto.test.ts', 'tests/platform/backup-restore-rto.test.ts'],
  ['tests/platform/thread-store-mount.test.ts', 'tests/platform/intelligence-agui-threads-mount.test.ts'],
  ['tests/platform/mod-08-cost-basis.test.ts', 'tests/copilot/mod-08-cost-basis.test.ts'],
  ['tests/platform/mod-09-citations.test.ts', 'tests/copilot/mod-09-citations.test.ts'],
  [
    'Ledger: 47 rekod belum ditutup (37 implemented_unverified, 8 blocked_external, 1 not_run, 1 partial) + 3 item proses/housekeeping yang tiada dalam ledger',
    'Ledger (21 Okt 2026, selepas wave 1 + evidence): **38 rekod belum ditutup** (30 implemented_unverified, 8 blocked_external, 0 not_run, 0 partial) — 47 verified_local. Lihat `reports/implementation/acceptance-status.json` sebagai sumber kebenaran tunggal.',
  ],
]);

/* --- 3. Salinan register provider yang lapuz --------------------------- */
edit('docs/architecture/AI-PROVIDER-FREE-MODELS-REGISTER.md', [
  [
    '# ',
    '> **SUPERSEDED — 21 Oktober 2026:** salinan ini LAGUP. Autoriti tunggal ialah\n> [`docs/AI-PROVIDER-FREE-MODELS-REGISTER.md`](../AI-PROVIDER-FREE-MODELS-REGISTER.md)\n> (mengandungi rekod pengesahan live 21 Okt 2026). Jangan kemas kini salinan ini.\n\n# ',
  ],
]);

/* --- 4. AGENTS.md: skrip sebenar + status render ------------------------- */
edit('AGENTS.md', [
  [
    'bun run test:platform                           # suite penuh (jev+platform+copilot+frontend+architecture+ext)',
    'bun run test:platform                           # suite penuh (jev+platform+copilot+frontend+architecture+ext+dashboard-model+landing-brand-theme)',
  ],
  [
    '| Register + checklist | dijana daripada ledger — `bun scripts/maintenance/render-acceptance-register.ts` |',
    '| Register + checklist | dijana daripada ledger — `bun scripts/maintenance/render-acceptance-register.ts`. Fail yang DIHASILKAN ialah `docs/prompts/ACCEPTANCE-REGISTER.md` + `PROJECT-CHECKLIST.md`; jika ia masih memaparkan snapshot lama, ia belum di-render (semak tarikh render therein). |',
  ],
]);

console.log(changes.join('\n'));
