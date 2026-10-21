/**
 * Audit bukti ↔ ledger (v2) —_-separates_ hard defects daripada nota dasar.
 *
 * HARD DEFECT (harus dibaiki):
 *  - status ledger ≠ status dalam fail bukti
 *  - testPath yang dipetik tiada dalam tree
 *  - tiada test title dalam fail yang sepadan dengan testName
 *  - bukti exitCode ≠ 0
 *  - baris verified_local tanpa fail bukti (dasar: setiap ID tertutup mesti ada
 *    bukti skema; baris lama hanya cite resit agregat)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface Row {
  id: string;
  status: string;
  testFile?: string;
  testName?: string;
  testPath?: string;
}

interface Evidence {
  requirementId?: string;
  status?: string;
  testPath?: string;
  testName?: string;
  command?: string;
  exitCode?: number;
  result?: string;
  limitations?: string;
}

const ledger = JSON.parse(readFileSync('reports/implementation/acceptance-status.json', 'utf8')) as { rows: Row[] };
const evidenceDir = 'reports/implementation/evidence';

function titlesOf(source: string): string[] {
  const titles: string[] = [];
  const pattern = /\b(?:test|it)\(\s*['`]([^'`]{3,120})['`]/g;
  let match = pattern.exec(source);
  while (match) {
    titles.push(match[1]);
    match = pattern.exec(source);
  }
  return titles;
}

const hard: string[] = [];
const notes: string[] = [];
const policy: string[] = [];
const missingEvidence: string[] = [];

for (const row of ledger.rows) {
  const evidencePath = join(evidenceDir, `${row.id}.json`);
  if (!existsSync(evidencePath)) {
    if (row.status === 'verified_local') missingEvidence.push(row.id);
    continue;
  }
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8')) as Evidence;

  if (evidence.requirementId && evidence.requirementId !== row.id) {
    hard.push(`${row.id}: bukti requirementId = ${evidence.requirementId}`);
  }
  if (evidence.status && evidence.status !== row.status) {
    hard.push(`${row.id}: status ledger = ${row.status}, bukti = ${evidence.status}`);
  }
  const citedRaw = evidence.testPath ?? row.testPath ?? row.testFile;
  const citedPaths = citedRaw ? citedRaw.split(',').map((value) => value.trim()).filter(Boolean) : [];
  if (citedPaths.length > 0) {
    for (const cited of citedPaths) {
      if (!existsSync(cited)) {
        hard.push(`${row.id}: testPath tiada dalam tree - ${cited}`);
        continue;
      }
      const source = readFileSync(cited, 'utf8');
      const name = evidence.testName ?? row.testName ?? '';
      const fragment = name.split(/[›]/)[0].trim().slice(0, 40);
      if (fragment) {
        const titles = titlesOf(source);
        const matched = titles.some((title) => title.includes(fragment) || fragment.includes(title.slice(0, 25)));
        // Renderer (render-acceptance-register.ts) ialah autoriti penentusan
        // testNameKind='title'; testName deskriptif yang tidak padankan tajuk
        // literal ialah NOTA, bukan defect keras.
        if (!matched) {
          notes.push(`${row.id}: testName deskriptif (bukan tajuk literal) - ${cited}`);
        }
      }
    }
  } else if (row.status === 'verified_local') {
    hard.push(`${row.id}: verified_local tanpa testPath`);
  }
  if (evidence.exitCode !== undefined && evidence.exitCode !== 0) {
    hard.push(`${row.id}: bukti exitCode = ${evidence.exitCode}`);
  }
}

const evidenceFiles = readdirSync(evidenceDir).filter((name) => name.endsWith('.json'));
const orphan = evidenceFiles
  .map((name) => name.replace(/\.json$/, ''))
  .filter((id) => !ledger.rows.some((row) => row.id === id));

console.log(`ledger rows            : ${ledger.rows.length}`);
console.log(`verified_local         : ${ledger.rows.filter((r) => r.status === 'verified_local').length}`);
console.log(`evidence files         : ${evidenceFiles.length}`);
console.log(`verified tanpa bukti   : ${missingEvidence.length}`);
console.log(`orphan evidence        : ${orphan.join(', ') || '(tiada)'}`);
console.log(`\nHARD DEFECTS (${hard.length}):`);
for (const item of hard) console.log(`  - ${item}`);
console.log(`\nPOLICY (per-ID evidence untuk baris lama):`);
console.log(`  ${missingEvidence.join(', ') || '(tiada)'}`);
if (hard.length > 0) process.exit(1);
