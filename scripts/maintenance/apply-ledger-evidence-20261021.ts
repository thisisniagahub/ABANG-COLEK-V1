/**
 * Skrip sekali guna: kemas kini baris ledger `reports/implementation/acceptance-status.json`
 * dengan bukti baharu (ujian hijau), TANPA memformat semula seluruh fail.
 *
 * Setiap kemas kini adalah dalam blok baris yang dikehendaki sahaja.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const lines = readFileSync(LEDGER, 'utf8').split('\n');

/** id → status baharu (hanya ditukar jika diberi) */
const STATUS: Record<string, string> = {
  'REF-01': 'verified_local',
  'DR-01': 'verified_local',
  'CPK-02': 'verified_local',
  'MOD-01': 'verified_local',
  'MOD-08': 'verified_local',
  'MOD-09': 'verified_local',
  'OFF-01': 'verified_local',
};

/** id → gap baharu (null bermaksud tiada jurang) */
const GAP: Record<string, string | null> = {
  'REF-01':
    'Tiada jurang tempatan: enjin risiko membina keputusan daripada isyarat peranti/velocity/umur yang SEBENAR, reason code boleh dibaca mesin, gate OTP tanpa provider => OTP_PROVIDER_UNAVAILABLE (503), rayuan ialah rekod store yang boleh diaudit, dan isyarat yang hilang ialah unknown (bukan sifar). Bukti: tests/platform/ref-01-risk-engine.test.ts (7 ujian, 87 assertion) hijau.',
  'DR-01':
    'Tiada jurang tempatan:|latihan pemulihan mengukur masa sebenar daripada lima fasa sebenar (capture_source_state, backup, restore, verify, cutover_ready), обще目標 dilintas dan tidak di-forge, dan harness MELEGAH apabila sasaran tidak dipenuhi (RTO_TARGET_NOT_MET). Bukti: tests/platform/dr-01-recovery-rto.test.ts (3 ujian, 61 assertion) hijau.',
  'CPK-02':
    'Tiada jurang tempatan: thread store AG-UI sudah di-mount dalam server/platform/app.ts dengan X-Thread-Id, route GET /api/platform/copilot/threads/:id/events (SSE replay + X-Last-Event-Id + X-Receipt-Count + ?after=), dan requireOwned() menolak thread tenant lain. Bukti: tests/platform/thread-store-mount.test.ts (6 ujian) hijau. Separuh hosted (cross-device, saved runs) kekal gated.',
  'MOD-01':
    'Tiada jurang tempatan: prepareCartDraft membina draf BELUM dihantar daripada katalog yang DITERBITKAN, integer sen, requiresReprice bila versi katalog bergerak, dan TIDAK menyimpan pesanan atau tempahan. Bukti: tests/platform/cart-revalidate-consent.test.ts (8 ujian) hijau.',
  'MOD-08':
    'Tiada jurang tempatan: readCanonicalCostBasis mengira asas kos kanonikal daripada bayaran disahkan dan perbelanjaan diluluskan (integer sen, margin dalam basis points BigInt), COGS sentiasa null + COGS_NOT_RECORDED, dan lejar tempoh yang sumbernya berubah => COST_BASIS_SOURCE_CHANGED. Bukti: tests/platform/mod-08-cost-basis.test.ts (6 ujian) hijau.',
  'MOD-09':
    'Tiada jurang tempatan: setiap rekod daripada search_records dan build_context_bundle membawa sitiran (sourceKind, sourceId, version/revision, observedAt, expiresAt + expiryReasonCode); tiada luput direkod => null + EXPIRY_NOT_RECORDED (tarikh tidak pernah direka). Bukti: tests/platform/mod-09-citations.test.ts (6 ujian) hijau.',
  'OFF-01':
    'Tiada jurang tempatan: revalidate-on-reconnect membandingkan revision DAN setiap medan, melaporkan conflicts[{field,expected,actual}] dan tidak pernahmeseksa command apabila ada konflik. Bukti: tests/platform/cart-revalidate-consent.test.ts (8 ujian) hijau.',
};

/** id → externalGate baharu (hanya untuk baris blocked_external) */
const GATE: Record<string, string> = {
  'PAY-01':
    'Separuh tempatan sudah lengkap dan disahkan: laluan callback HMAC X-Signature (constant-time compare), idempotency eventId dalam store, dan reason code penuh (PAYMENT_SIGNATURE_INVALID / PAYMENT_EVENT_ALREADY_APPLIED / PAYMENT_EVENT_ID_CONFLICT / PAYMENT_EVENT_UNKNOWN). Bukti: tests/platform/payment-callback-hmac.test.ts (12 ujian) hijau. Yang tinggal: kredensial merchant gateway (Billplz/FPX) + adapter pembekal yang menandatangani dan menghantar callback sebenar, dan PLATFORM_PAYMENT_WEBHOOK_SECRET di environment deployment (tanpa ia laluan menjawab 503 PAYMENT_SIGNATURE_SECRET_UNAVAILABLE, bukan menerima callback tanpa pengesahan).',
  'PAY-02':
    'Laluan pulangan (GET /payments/return) sudah wujud dan hanya MEMBACA status yang tersimpan; parameter status daripada klien diabaikan. Bukti: tests/platform/payment-callback-hmac.test.ts (12 ujian) hijau. Yang tinggal: akaun gateway sebenar untuk melengkapkan perjalanan hujung-ke-hujung (redirect pelanggan melalui provider).',
  'REL-01':
    'VERCEL_TOKEN dalam environment TIDAK SAH (CLI: "The token provided via VERCEL_TOKEN environment variable is not valid") => tiada deployment boleh dibuat atau resept deployment diambil. Selain itu skrip e2e Playwright (tests/e2e/**) perlukan pelayan hidup + Chrome (Chrome ada, ms-playwright chromium-1228 ada), dan 38 spec e2e masih gagal atas punca sebenar yang sedang diklaster.',
};

function replaceInRow(id: string, field: string, value: string | null): boolean {
  const start = lines.findIndex((line) => line.includes(`"id": "${id}"`));
  if (start < 0) throw new Error(`row not found: ${id}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{4}\},?\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  const fieldIndex = lines.findIndex(
    (line, index) => index > start && index < end && line.includes(`"${field}":`),
  );
  if (fieldIndex < 0) throw new Error(`field ${field} not found in ${id}`);
  const indent = lines[fieldIndex].match(/^\s*/)?.[0] ?? '      ';
  if (value === null) {
    lines[fieldIndex] = `${indent}"${field}": null,`;
  } else {
    lines[fieldIndex] = `${indent}"${field}": ${JSON.stringify(value)},`;
  }
  return true;
}

for (const [id, status] of Object.entries(STATUS)) replaceInRow(id, 'status', status);
for (const [id, gap] of Object.entries(GAP)) replaceInRow(id, 'gap', gap);
for (const [id, gate] of Object.entries(GATE)) replaceInRow(id, 'externalGate', gate);

writeFileSync(LEDGER, lines.join('\n'));
console.log(`updated ${Object.keys(STATUS).length} status + ${Object.keys(GAP).length} gap + ${Object.keys(GATE).length} gate`);
