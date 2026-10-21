/**
 * KILO-09 — jana semula jadual "Semua rekod belum selesai" dalam
 * docs/CURRENT-STATUS.md LANGSUNG daripada ledger (satu sumber kebenaran).
 *
 * Sebelum ini jadual itu ditulis tangan dan tercicir 2–3 generasi (audit
 * AUD-DOCS). Sekarang ia dijana, jadi ia tidak boleh lapak tanpa disedari.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const STATUS_DOC = 'docs/CURRENT-STATUS.md';

const ledger = JSON.parse(readFileSync(LEDGER, 'utf8')) as {
  rows: {
    id: string;
    status: string;
    integrationStage?: string;
    gap?: string | null;
    externalGate?: string | null;
    remainingRequirement?: string | null;
  }[];
};

const open = ledger.rows.filter((row) => row.status !== 'verified_local');

function cell(value: string | null | undefined, limit: number): string {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '—';
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

const rows = open.map((row) => {
  const stage = row.integrationStage && row.integrationStage !== 'sdk_wired' ? ` (\`${row.integrationStage}\`)` : '';
  const baki = [row.gap, row.externalGate, row.remainingRequirement].filter(Boolean).join(' | ');
  return `| ${row.id} | ${row.status}${stage} | ${cell(baki, 300)} |`;
});

const table = [
  '| ID | Status | Baki requirement / gate yang direkod (dijana daripada ledger 21 Okt 2026) |',
  '|---|---|---|',
  ...rows,
].join('\n');

const doc = readFileSync(STATUS_DOC, 'utf8');
const heading = '## Semua rekod belum selesai dalam snapshot';
const start = doc.indexOf(heading);
if (start < 0) throw new Error('heading not found');
const nextHeading = doc.indexOf('\n## ', start + heading.length);
if (nextHeading < 0) throw new Error('next heading not found');

const intro = [
  heading,
  '',
  'Jadual ini **dijana** daripada `reports/implementation/acceptance-status.json` (21 Okt 2026) — jangan edit tangan; edit ledger, kemudian jana semula. Teks "Baki" ialah gabungan medan `gap` / `externalGate` / `remainingRequirement` daripada ledger.',
  '',
  table,
  '',
].join('\n');

writeFileSync(STATUS_DOC, doc.slice(0, start) + intro + doc.slice(nextHeading + 1));
console.log(`regenerated open-records table: ${open.length} rows`);
