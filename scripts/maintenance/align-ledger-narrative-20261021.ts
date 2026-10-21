/**
 * KILO-09 — selaraskan 3 baris ledger lagi yang bercanggah dengan kod
 * (audit AUD-DOCS, 21 Okt 2026: C4 AI-02, C5 PD-01, C6 EXT-07).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const lines = readFileSync(LEDGER, 'utf8').split('\n');

function setField(id: string, field: string, value: string | null): void {
  const start = lines.findIndex((line) => line.includes(`"id": "${id}"`));
  if (start < 0) throw new Error(`row not found: ${id}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{4}\},?\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  const at = lines.findIndex((line, index) => index > start && index < end && line.includes(`"${field}":`));
  if (at < 0) throw new Error(`field ${field} not found in ${id}`);
  const indent = lines[at].match(/^\s*/)?.[0] ?? '      ';
  lines[at] = value === null ? `${indent}"${field}": null,` : `${indent}"${field}": ${JSON.stringify(value)},`;
}

/* C4 — AI-02: "guard test itself is still RED" adalah lapuk; resit 21 Okt
   menunjukkan tests/platform/provenance-truth-guard.test.ts 6/6 lulus. */
setField(
  'AI-02',
  'evidenceProves',
  'Guard provenance hijau: tests/platform/provenance-truth-guard.test.ts 6/6 lulus (resit 2026-10-21). Batasan kekal: ini bukti static-analysis + ujian unit, BUKAN bukti runtime production (guard tidakPassive mencegah provenance rekaan pada laluan model sebenar).',
);
setField(
  'AI-02',
  'remainingRequirement',
  'Bukti runtime production untuk provenance guard (laluan model sebenar) masih belum diambil — memerlukan deployment yang diizinkan (token Vercel tidak sah dalam environment ini).',
);

/* C5 — PD-01: gate dispatch + consent berstruktur sudah wujud; baki sebenar
   ialah kes opted-out yang belum ada ujian. */
setField(
  'PD-01',
  'gap',
  'Separuh tempatan sudah wujud dan diuji: konsen berstruktur (server/platform/dispatchConsent.ts, rekod `asset_consents`), gate `ASSET_CONSENT_NOT_GRANTED` pada asset tanpa konsen granted, laluan `POST /campaigns/consent` untuk mencatat konsen, dan gate `DISPATCH_OPTED_OUT` pada preferensi opt-out penerima. Baki yang BELUM ada ujian: kes opted-out (DISPATCH_OPTED_OUT) dan integration pemacross hantar beratur. Bukti: tests/platform/operational-amendments-consent.test.ts (2 ujian, 4 assertion) hijau.',
);
setField(
  'PD-01',
  'remainingRequirement',
  'Tambah ujian negatif untuk DISPATCH_OPTED_OUT (penerima opted-out ⇒ tiada penghantaran) dan uji lintasan dispatch queue/asset consent pada masa hantar, bukan hanya pada gate asset.',
);

/* C6 — EXT-07: externalGate bukan salinan EXT-03; gate sebenar ialah
   kelayakan model vision + data scope, BUKAN akaun Intelijen. */
setField(
  'EXT-07',
  'externalGate',
  'Gate sebenar: model vision yang LAYAK untuk memahami imej (data scope diluluskan) — BUKAN akaun CopilotKit Intelijen. Bukti live 2026-10-21: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` menjawab HTTP 200 (2821 ms) dan membaca imej dengan betul; `gemini_free/gemini-3.8-flash` HTTP 200 dengan imej ditelan (1104 token input). Batasan: kuota provider (20 permintaan/hari) dan terma provider semasa. Refusal 409 QUALIFIED_VISION_MODEL_REQUIRED kekal sebagai laluan felloh apabila model tidak layak — bukan "tiada model".',
);

writeFileSync(LEDGER, lines.join('\n'));
console.log('aligned AI-02, PD-01, EXT-07 narrative fields');
