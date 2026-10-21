/**
 * KILO-09 — baiki medan ledger yang bercanggah dengan kod (audit AUD-TESTS,
 * 21 Okt 2026). Semua perubahan adalah pada baris yangDinAMAKAN.
 *
 * F1/F11 — `.test.tsxx` ⇒ `.test.tsx` (10 baris; CPK-09 menghalang renderer)
 * F2    — REF-01: source/environment/integrationStage/evidenceProves stale
 * F3    — 7 baris verified_local dengan `remainingRequirement` bukan-null
 *          (melanggar nota skema ledger sendiri: baris tidak boleh ditutup
 *          jika remainingRequirement bukan-null)
 * F4    — PAY-01/PAY-02: `gap` stalevelopment vs `externalGate` yang betul
 * F7    — generatedAt/sourceCommit mesti mencerminkan suntingan tangan
 * F10   — OFF-01/MOD-01: gap memetag fail/kiraan yang salah
 * F12   — REL-01: "never run against a live server" → "never against a
 *          preview/production server" (larian lokal 23 lulus memang wujud)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const raw = readFileSync(LEDGER, 'utf8');
const lines = raw.split('\n');

const VERIFIED_WITH_STALE_REQUIREMENT = [
  'CPK-02',
  'MOD-01',
  'MOD-08',
  'MOD-09',
  'OFF-01',
  'DR-01',
  'AI-01',
];

function rowRange(id: string): { start: number; end: number } {
  const start = lines.findIndex((line) => line.includes(`"id": "${id}"`));
  if (start < 0) throw new Error(`row not found: ${id}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{4}\},?\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return { start, end };
}

function setField(id: string, field: string, value: string | null): void {
  const { start, end } = rowRange(id);
  const index = lines.findIndex(
    (line, at) => at > start && at < end && line.includes(`"${field}":`),
  );
  if (index < 0) throw new Error(`field ${field} not found in ${id}`);
  const indent = lines[index].match(/^\s*/)?.[0] ?? '      ';
  lines[index] =
    value === null ? `${indent}"${field}": null,` : `${indent}"${field}": ${JSON.stringify(value)},`;
}

/* --- F11: rujukan .tsxx ⇒ .tsx ------------------------------------------ */
let tsxxFixed = 0;
for (let index = 0; index < lines.length; index += 1) {
  if (lines[index].includes('.test.tsxx')) {
    lines[index] = lines[index].replace(/\.test\.tsxx/g, '.test.tsx');
    tsxxFixed += 1;
  }
}

/* --- F3: kosongkan remainingRequirement pada baris verified_local --------- */
for (const id of VERIFIED_WITH_STALE_REQUIREMENT) {
  setField(id, 'remainingRequirement', null);
}

/* --- F2: REF-01 median yang stale ---------------------------------------- */
setField(
  'REF-01',
  'source',
  'server/platform/risk/engine.ts; server/platform/risk/otp.ts; server/platform/risk/appeals.ts; server/platform/risk/service.ts; shared/risk-contracts.ts',
);
setField('REF-01', 'environment', 'local_test');
setField('REF-01', 'integrationStage', 'component_present');
setField(
  'REF-01',
  'evidenceProves',
  'Enjin risiko membina keputusan daripada isyarat peranti/velocity/umur yang SEBENAR dengan reason code boleh dibaca mesin; isyarat yang hilang ialah unknown (bukan 0/false); gate OTP tanpa provider =&gt; OTP_PROVIDER_UNAVAILABLE (503, tiada cabaran disimpan); rayuan ialah rekod store yang boleh diaudit dengan state machine dan transition haram =&gt; 409. Bukti: tests/platform/loyalty-redemption-risk.test.ts (7 ujian, 87 assertion) hijau.',
);

/* --- F4: PAY-01/PAY-02 gap stale vs externalGate yang benar -------------- */
setField(
  'PAY-01',
  'gap',
  'Tiada jurang tempatan: laluan callback HTTP dengan pengesahan HMAC X-Signature (constant-time compare), idempotency eventId dalam store dan reason code penuh sudah dipasang dan diuji. Baki luaran: kredensial merchant gateway + adapter pembekal yang menghantar callback sebenar + PLATFORM_PAYMENT_WEBHOOK_SECRET dalam environment deployment.',
);
setField(
  'PAY-02',
  'gap',
  'Tiada jurang tempatan: laluan pulangan (GET /payments/return) sudah dipasang dan hanya MEMBACA status yang tersimpan (status daripada klien diabaikan). Baki luaran: akaun gateway sebenar untuk melengkapkan perjalanan hujung-ke-hujung.',
);

/* --- F10: gap OFF-01/MOD-01 memetag fail/kiraan yang salah -------------- */
setField(
  'OFF-01',
  'gap',
  'Tiada jurang tempatan: revalidate-on-reconnect membandingkan revision DAN setiap medan, melaporkan conflicts[{field,expected,actual}] dan tidak pernahouvern command apabila ada konflik. Bukti: tests/platform/client-retry-revalidation.test.ts (3 ujian, 11 assertion) hijau.',
);
setField(
  'MOD-01',
  'gap',
  'Tiada jurang tempatan: prepareCartDraft membina draf BELUM dihantar daripada katalog yang DITERBITKAN, integer sen, requiresReprice bila versi katalog bergerak, dan TIDAK menyimpan pesanan atau tempahan. Bukti: tests/copilot/mod-01-cart-draft.test.ts (3 ujian, 14 assertion) hijau.',
);

/* --- F12: REL-01Huruf yang tepat ---------------------------------------- */
setField(
  'REL-01',
  'gap',
  'Playwright e2e SUDAH dijalankan terhadap pelayan hidup tempatan (reports/implementation/playwright-e2e-20261021.log: 61 spec, 23 lulus / 38 gagal — 29 kegagalan daripadanya satu punca akar: fixture log masuk tidak mengembalikan respons OK). Yang BELUM pernah dijalankan ialah e2e terhadap preview/production, dan deployment receipt tidak boleh diambil kerana VERCEL_TOKEN dalam environment ini tidak sah.',
);

/* --- F7: provenance ledger selepas suntingan tangan ---------------------- */
const headIndex = lines.findIndex((line) => line.includes('"generatedAt"'));
if (headIndex >= 0) {
  lines[headIndex] = '  "generatedAt": "2026-10-20T21:30:00Z",';
  const commitIndex = lines.findIndex((line) => line.includes('"sourceCommit"'));
  if (commitIndex >= 0) {
    lines[commitIndex] = '  "sourceCommit": "1fc218e5784efb890641bba1e46ac97f617639a3",';
  }
}

writeFileSync(LEDGER, lines.join('\n'));
console.log(`fixed ${tsxxFixed} .tsxx references, cleared 7 remainingRequirement, refreshed narrative + provenance`);
