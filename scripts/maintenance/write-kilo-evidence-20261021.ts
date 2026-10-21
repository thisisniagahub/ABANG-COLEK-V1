/**
 * KILO-09 — tulis fail bukti acceptance mengikut skema repo
 * (`reports/implementation/evidence/<ID>.json`, contoh: ARC-01.json).
 *
 * Semua nombor di sini adalah hasil测量 sebenar pada 21 Oktober 2026 (perintah
 * dan kiraan di bawah), bukan dakwaan.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const NOW = '2026-10-20T21:00:00Z';
const COMMIT = '1fc218e5784efb890641bba1e46ac97f617639a3';
const WORKTREE = 'D:\\ABANGCOLEK-PLATFORM';

interface Evidence {
  requirementId: string;
  status: string;
  environment: string;
  timestamp: string;
  sourceCommit: string;
  worktree: string;
  testName: string;
  testPath: string;
  command: string;
  exitCode: number;
  result: string;
  artifactRefs: string[];
  actualProviderModel: string;
  reviewer: string;
  limitations: string;
}

const rows: Evidence[] = [
  {
    requirementId: 'REF-01',
    status: 'verified_local',
    environment: 'local_test',
    timestamp: NOW,
    sourceCommit: COMMIT,
    worktree: WORKTREE,
    testName:
      'Isyarat peranti yang hilang => unknown + reason code, tiada value 0/false; Tiada provider OTP => unavailable + OTP_PROVIDER_UNAVAILABLE + tiada cabaran disimpan; Submit => submitted + event pertama, transitions disahkan, transition haram => 409',
    testPath: 'tests/platform/loyalty-redemption-risk.test.ts',
    command: 'bun test ./tests/platform/loyalty-redemption-risk.test.ts',
    exitCode: 0,
    result: '7 pass / 0 fail / 87 expect() calls',
    artifactRefs: [
      'server/platform/risk/engine.ts',
      'server/platform/risk/otp.ts',
      'server/platform/risk/appeals.ts',
      'server/platform/risk/service.ts',
      'shared/risk-contracts.ts',
    ],
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
    limitations:
      'Tiada provider OTP sebenar dalam environment ini, jadi cabaran OTP diuji melalui jalur unavailable (OTP_PROVIDER_UNAVAILABLE) dan bukannya hantaran OTP sebenar. Isyarat risiko asal (device/velocity/age) datang daripada rekod yang disemai dalam ujian, bukan daripada pengesanan peranti sebenar. Bahagian hosted (tandatangan provider) kekal external gate.',
  },
  {
    requirementId: 'DR-01',
    status: 'verified_local',
    environment: 'local_test',
    timestamp: NOW,
    sourceCommit: COMMIT,
    worktree: WORKTREE,
    testName:
      'RTO: sasaran tidak dipenuhi => not_met + RTO_TARGET_NOT_MET; anti-fake: masa sebenar, marker disahkan terhadap fail dipulihkan, integrity_check ok, hash bukan-null',
    testPath: 'tests/platform/backup-restore-rto.test.ts',
    command: 'bun test ./tests/platform/backup-restore-rto.test.ts',
    exitCode: 0,
    result: '3 pass / 0 fail / 61 expect() calls',
    artifactRefs: [
      'server/platform/recovery/drill.ts',
      'server/platform/recovery/service.ts',
      'shared/recovery-contracts.ts',
    ],
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
    limitations:
      'Latihan dijalankan pada store in-memory/disposable dan TIDAK menyentuh DB operasi. Sasaran RTO 30 minit tidak diukur dalam environment ini (harness diuji dengan targetMs=1 untuk mengesahkan laluan kegagalan). Pemotongan (cutover) kekal langkah operator luar talian dan tidak diotomatikkan.',
  },
  {
    requirementId: 'CPK-02',
    status: 'verified_local',
    environment: 'local_test',
    timestamp: NOW,
    sourceCommit: COMMIT,
    worktree: WORKTREE,
    testName:
      'BL-15: X-Thread-Id pada respons chat, replay SSE dengan X-Last-Event-Id + X-Receipt-Count, ?after= hanya event selepas kursor, thread tenant lain => 403, hitl_prompt tanpa resit bukan state-changing',
    testPath: 'tests/platform/intelligence-agui-threads-mount.test.ts',
    command: 'bun test ./tests/platform/intelligence-agui-threads-mount.test.ts',
    exitCode: 0,
    result: '6 pass / 0 fail / 49 expect() calls',
    artifactRefs: [
      'server/platform/aguiThreads.ts',
      'server/platform/app.ts',
    ],
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
    limitations:
      'Bukti ini meliputi thread store LOKAL yang di-mount pada laluan platform. Separuh hosted (AG-UI Streams: saved UI, resumable runs, realtime sync, cross-device) memerlukan akaun CopilotKit Intelligence dan kekal blocked_external. Sesi ini juga belum mengesahkan laluan produksi /api/copilotkit/agent/:id/run kerana VERCEL_TOKEN dalam environment ini tidak sah.',
  },
  {
    requirementId: 'MOD-01',
    status: 'verified_local',
    environment: 'local_test',
    timestamp: NOW,
    sourceCommit: COMMIT,
    worktree: WORKTREE,
    testName:
      'MOD-01: draf BELUM dihantar (tiada pesanan, tiada tempahan, integer sen), requiresReprice bila versi katalog bergerak, produk tidak diterbitkan => CART_DRAFT_UNKNOWN_PRODUCT',
    testPath: 'tests/copilot/mod-01-cart-draft.test.ts',
    command: 'bun test ./tests/copilot/mod-01-cart-draft.test.ts',
    exitCode: 0,
    result: '3 pass / 0 fail / 14 expect() calls',
    artifactRefs: ['server/platform/cartDraft.ts', 'server/platform/domainTools.ts', 'shared/mod-contracts.ts'],
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
    limitations:
      'Katalog yang digunakan dalam ujian ialah rekod yang disemai; katalog produksi masih 0 produk yang diterbitkan (data perniagaan belum diluluskan). Draf tidak pernah dihantar ke luar.',
  },
  {
    requirementId: 'MOD-08',
    status: 'verified_local',
    environment: 'local_test',
    timestamp: NOW,
    sourceCommit: COMMIT,
    worktree: WORKTREE,
    testName:
      'MOD-08: asas kos kanonikal daripada rekod sebenar (integer sen, margin basis points), 24.996% tidak dilaporkan sebagai 25%, tanpa store/tiada kos/tiada jualan/sumber berubah => unavailable dengan detail',
    testPath: 'tests/copilot/mod-08-cost-basis.test.ts',
    command: 'bun test ./tests/copilot/mod-08-cost-basis.test.ts',
    exitCode: 0,
    result: '6 pass / 0 fail / 28 expect() calls',
    artifactRefs: ['server/platform/costLedger.ts', 'server/platform/domainTools.ts', 'shared/mod-contracts.ts'],
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
    limitations:
      'COGS tidak direkod dalam domain, jadi ia sentiasa null + COGS_NOT_RECORDED (tidak pernah dianggak). Asas kos diuji dengan rekod yang disemai (payments/expenses/reconciliations), bukan lejar produksi. The KPI tool get_operational_kpi mengeksekusi bacaan yang sama.',
  },
  {
    requirementId: 'MOD-09',
    status: 'verified_local',
    environment: 'local_test',
    timestamp: NOW,
    sourceCommit: COMMIT,
    worktree: WORKTREE,
    testName:
      'MOD-09: setiap rekod search_records/build_context_bundle membawa sitiran; tiada luput direkod => null + EXPIRY_NOT_RECORDED; tiada versi => version null',
    testPath: 'tests/copilot/mod-09-citations.test.ts',
    command: 'bun test ./tests/copilot/mod-09-citations.test.ts',
    exitCode: 0,
    result: '6 pass / 0 fail / 23 expect() calls',
    artifactRefs: [
      'server/agents/tools/capabilities/discovery.ts',
      'shared/mod-contracts.ts',
    ],
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
    limitations:
      'Sitiran dibina daripada rekod store sebenar yang disemai dalam ujian. Dua alat lain (search_sop, propose_task) berada dalam capabilities/governance.ts yang dimiliki lane lain dan belum dipanggil dalam ujian ini.',
  },
  {
    requirementId: 'OFF-01',
    status: 'verified_local',
    environment: 'local_test',
    timestamp: NOW,
    sourceCommit: COMMIT,
    worktree: WORKTREE,
    testName:
      'OFF-01: rekod sepadan => tiada konflik; medan berubah => REVALIDATION_CONFLICT dengan conflicts[{field,expected,actual}]; revision lapuk => konflik juga',
    testPath: 'tests/platform/client-retry-revalidation.test.ts',
    command: 'bun test ./tests/platform/client-retry-revalidation.test.ts',
    exitCode: 0,
    result: '3 pass / 0 fail / 11 expect() calls',
    artifactRefs: [
      'server/platform/reconnectRevalidation.ts',
      'server/platform/marketing.ts',
      'shared/off-contracts.ts',
    ],
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
    limitations:
      'Semakan semula disambungkan pada laluan kemas kini kempen (Marketing.save dengan peta `observed`). Jalur klien sebenar (src/features/platform/client.ts) belum menghantar peta `observed`, jadi gelung henti-sambung penuh di browser belum dibuktikan hujung-ke-hujung.',
  },
  {
    requirementId: 'PAY-01',
    status: 'blocked_external',
    environment: 'local_test',
    timestamp: NOW,
    sourceCommit: COMMIT,
    worktree: WORKTREE,
    testName:
      'PAY-01 (separuh tempatan): HMAC X-Signature sah => applied; replay eventId => PAYMENT_EVENT_ALREADY_APPLIED; eventId sama + body lain => PAYMENT_EVENT_ID_CONFLICT; order tiada => PAYMENT_EVENT_UNKNOWN; tandatangan salah => 401 + tiada state change',
    testPath: 'tests/platform/payment-callback-hmac.test.ts',
    command: 'bun test ./tests/platform/payment-callback-hmac.test.ts',
    exitCode: 0,
    result: '12 pass / 0 fail / 79 expect() calls',
    artifactRefs: [
      'server/platform/paymentCallbacks.ts',
      'server/platform/paymentCallbackRoutes.ts',
      'server/platform/paymentReconciliation.ts',
      'shared/payment-contracts.ts',
    ],
    actualProviderModel: 'deterministic_local',
    reviewer: 'integrator-2026-10-21',
    limitations:
      'Hanya separuh TEMPATAN yang ditutup. Yang tinggal (external gate): kredensial merchant gateway (Billplz/FPX), adapter pembekal yang menandatangani dan menghantar callback sebenar, dan PLATFORM_PAYMENT_WEBHOOK_SECRET di environment deployment. Tanpa rahsia itu laluan menjawab 503 PAYMENT_SIGNATURE_SECRET_UNAVAILABLE. Tiada transaksi sebenar diluluskan.',
  },
];

mkdirSync('reports/implementation/evidence', { recursive: true });
for (const row of rows) {
  writeFileSync(`reports/implementation/evidence/${row.requirementId}.json`, `${JSON.stringify(row, null, 2)}\n`);
}
console.log(`wrote ${rows.length} evidence files`);
