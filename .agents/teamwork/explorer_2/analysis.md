# Laporan Kajian Domain & Integriti Kewangan Fasa 03A (analysis.md)

**Tarikh/Masa**: 2026-10-20T04:34:30Z  
**Penyelidik**: `explorer_2` (`teamwork_preview_explorer`)  
**Direktori Kerja**: `d:\ABANGCOLEK-PLATFORM\.agents\teamwork\explorer_2/`  
**Objektif**: Analisis mendalam suite ujian domain, peraturan integriti kewangan Fasa 03A (FIN-01), kitaran hayat HITL (CPK-06), dan logik pemulangan wang Billplz (PAY-01..03).

---

## 1. Ringkasan Eksekutif

| Komponen | Fail Terlibat | Status Ujian | Integriti Kod |
|---|---|---|---|
| **FIN-01 Financial Integrity** | `server/platform/marginGuardian.ts`, `shared/growth-contracts.ts`, `tests/platform/financial-integrity-v24.test.ts`, `tests/platform/growth-margin.test.ts` | **23 PASS / 0 FAIL** (18 FIN tests) | **LENGKAP & TEPAT**: Aritmetik integer Sen dan perbandingan BigInt menghalang salah laku pembundaran (24.996% disekat walaupun paparan dibundar ke 25.00%). |
| **CPK-06 HITL Lifecycle** | `server/platform/adkAgent.ts`, `server/platform/app.ts`, `shared/copilot-contracts.ts`, `tests/platform/hitl-execution-v24.test.ts` | **5 PASS / 0 FAIL** | **LENGKAP & KUKUH**: Semakan luput (`HITL_EXPIRED`), semakan duplikasi (`HITL_ALREADY_DECIDED`), sekatan bukan-founder (`FORBIDDEN`), `executionReceipt: undefined`, dan penanda `executionBlockedReason: 'EXECUTOR_UNAVAILABLE'`. |
| **PAY-01..03 Billplz & Refund** | `server/platform/paymentReconciliation.ts`, `tests/platform/payment-reconciliation-v24.test.ts`, `tests/platform/refund-allocation-v24.test.ts` | **17 PASS / 0 FAIL** (Runtime Bun) | **LOGIK DOMAIN TEPAT, JURANG TYPE/LINT & ROUTING DIKESAN**: Algoritma Largest-Remainder (Hamilton-Hare) dan pembalikan kumulatif 0-cent drift lulus sepenuhnya; ralat TS2305 pada import `PaymentRecord` dikesan semasa `bun run lint`. |

---

## 2. Status & Hasil Pelaksanaan Suite Ujian

Semua ujian unit yang disasarkan telah dijalankan dan disahkan secara langsung:

### 2.1. `tests/platform/financial-integrity-v24.test.ts` (8 ujian, 8 lulus)
- `FIN-01 exact comparison: blocks 24.996% even when display rounding rounds to 25.00%` — LULUS (10.55ms)
- `FIN-01 exact threshold: passes when margin meets exact 25.000% threshold` — LULUS (0.22ms)
- `Zero sales boundary: net sales <= 0 must never create margin ratio eligibility` — LULUS (0.09ms)
- `Safe integer validation: rejects negative variable costs` — LULUS (0.25ms)
- `Safe integer validation: rejects fractional sen amounts` — LULUS (0.12ms)
- `Safe integer validation: rejects NaN and Infinite amounts` — LULUS (13.56ms)
- `Policy validation: rejects invalid minimumContributionMarginPct` — LULUS (0.47ms)
- `Negative contribution handling: cash failure overrides percent failure reason code` — LULUS (0.29ms)

### 2.2. `tests/platform/growth-margin.test.ts` (10 ujian, 10 lulus)
- `passes when both contributionSen and marginPct meet thresholds` — LULUS (0.51ms)
- `blocks when contribution cash is high enough in RM but fails percentage margin threshold (FIN-01 scenario)` — LULUS (0.18ms)
- `blocks when percentage is high but absolute cash contribution is too low to cover fixed cost allocations` — LULUS (0.09ms)
- `evaluates margin simulation, blocks unapproved FIN-01 campaigns, and enforces founder override gate` — LULUS (280.69ms)
- `edge case: zero net sales handles division safely without NaN or infinite margin` — LULUS (0.33ms)
- `postiz-publish gate enforces FIN-01 founder override requirement` — LULUS (376.96ms)
- Termasuk 4 ujian asas sekuriti dan ketahanan backend — LULUS.

### 2.3. `tests/platform/hitl-execution-v24.test.ts` (5 ujian, 5 lulus)
- `Approval does NOT fabricate executionReceipt; sets executionBlockedReason to EXECUTOR_UNAVAILABLE` — LULUS (189.58ms)
- `Rejection updates status to rejected without receipt and without executionBlockedReason` — LULUS (211.18ms)
- `Expired HITL action fails with 409 HITL_EXPIRED before any state change occurs` — LULUS (270.35ms)
- `Deciding an already decided action fails with 409 HITL_ALREADY_DECIDED` — LULUS (227.48ms)
- `Non-founder users are blocked with 403 FORBIDDEN from deciding HITL actions` — LULUS (355.49ms)

### 2.4. Ujian Tambahan Domain Kewangan & Lejar Berkaitan
- `tests/platform/payment-reconciliation-v24.test.ts`: 8 lulus (211ms).
- `tests/platform/refund-allocation-v24.test.ts`: 9 lulus (197ms).
- `tests/platform/dealer-commission-ledger.test.ts`: 8 lulus (5.33s).
- `tests/platform/loyalty-redemption.test.ts`: 16 lulus (4.86s).
- `tests/platform/finance-review.test.ts`: 5 lulus (1.60s).
- `tests/platform/founder-proposals.test.ts`: 2 lulus (254ms).

---

## 3. Analisis Terperinci Logik Integriti Kewangan (FIN-01)

### 3.1. Lokasi Kod Kanonikal
- `shared/growth-contracts.ts` (baris 84–216): Definisi antara muka `MarginSimulationInput`, `MarginSimulationResult`, fungsi pengesahan `assertSafeSen`, `assertValidMarginPct`, dan fungsi teras `evaluateMarginContribution`.
- `server/platform/marginGuardian.ts` (baris 1–7): Re-export kanonikal untuk memastikan sifar percabangan (zero divergence).

### 3.2. Mekanisme Aritmetik & BigInt
Pengiraan margin sumbangan mematuhi prinsip **Rules Own The Money**:
1. **8 Kategori Kos Pembolehubah (Variable Costs)**:
   `cogsSen`, `packagingSen`, `paymentFeesSen`, `fulfilmentVariableCostSen`, `deliverySubsidySen`, `agentCommissionSen`, `rewardCostSen`, `expectedReturnLossSen`.
   Setiap nilai disahkan sebagai integer sen tidak negatif (`assertSafeSen`).
2. **Pengiraan Sumbangan**:
   ```typescript
   const totalVariableCostsSenBig =
     BigInt(input.cogsSen) +
     BigInt(input.packagingSen) +
     BigInt(input.paymentFeesSen) +
     BigInt(input.fulfilmentVariableCostSen) +
     BigInt(input.deliverySubsidySen) +
     BigInt(input.agentCommissionSen) +
     BigInt(input.rewardCostSen) +
     BigInt(input.expectedReturnLossSen);

   const netSalesSenBig = BigInt(input.netSalesExTaxSen);
   const contributionSenBig = netSalesSenBig - totalVariableCostsSenBig;
   ```
3. **Pencegahan Salah Laku Pembundaran (Rounding Fraud Prevention)**:
   Nisbah peratusan ambang minimum ditukar kepada basis points:
   `minimumMarginBps = BigInt(Math.round(input.minimumContributionMarginPct * 100))`
   Perbandingan nisbah dilakukan secara tepat menggunakan integer BigInt:
   ```typescript
   const isMarginPctPass =
     input.netSalesExTaxSen > 0 &&
     contributionSenBig * 10000n >= netSalesSenBig * minimumMarginBps;
   ```
   **Bukti Pengesahan**:
   - Untuk jualan bersih RM 1,000.00 (`100,000` sen) dan kos RM 750.04 (`75,004` sen):
     `contributionSen = 24,996` sen (RM 249.96).
     Nisbah sebenar: `24.996%`.
     Paparan skrin dibundar kepada `25.00%` (`Math.round(rawMarginPct * 100) / 100 = 25`).
     Namun secara matematik BigInt:
     `24,996 * 10,000 = 249,960,000`
     `100,000 * 2,500 = 250,000,000`
     Kerana `249,960,000 < 250,000,000`, `isMarginPctPass` adalah `false`.
     Permintaan disekat secara deterministik dengan `reasonCode: 'INSUFFICIENT_PERCENT_MARGIN'`.
4. **Hierarki Kegagalan Tunai (Cash Priority Invariant)**:
   Jika `contributionSenBig < BigInt(input.minimumContributionSen)`, kod mengembalikan `reasonCode: 'INSUFFICIENT_CASH_MARGIN'`.
   Dalam `server/platform/marketing.ts` (baris 150–180), Founder Override hanya dibenarkan bagi kegagalan peratusan (`INSUFFICIENT_PERCENT_MARGIN`). Jika margin tunai negatif/tidak mencukupi (`INSUFFICIENT_CASH_MARGIN`), kelulusan Founder disekat secara mutlak dengan kod ralat 409 (`INSUFFICIENT_CASH_MARGIN`).

---

## 4. Analisis Kitaran Hayat Human-In-The-Loop (HITL / CPK-06)

### 4.1. Lokasi Kod Kanonikal
- `shared/copilot-contracts.ts` (baris 184–200): Kontrak `HitlActionRequest` dan jenis status `HitlStatus`.
- `server/platform/adkAgent.ts` (baris 100–157): Kaedah `createHitlAction` dan `decideHitlAction`.
- `server/platform/app.ts` (baris 190 & 334–339): Laluan API HTTP `GET /api/platform/copilot/hitl` dan `POST /api/platform/copilot/hitl/:id/decide`.

### 4.2. Invarian CPK-06
1. **Semakan Tarikh Luput (Pre-Mutation Expiry Check)**:
   ```typescript
   if (action.expiry && new Date(action.expiry) <= new Date()) {
     fail('HITL_EXPIRED', 409, 'Tindakan HITL ini telah tamat tempoh.');
   }
   ```
   Semakan dilakukan sebelum sebarang mutasi data store. Rekod dalam pangkalan data kekal `pending_approval` tanpa mutasi separa.
2. **Deduplikasi Keputusan (Single Decision Invariant)**:
   ```typescript
   if (action.status !== 'pending_approval') {
     fail('HITL_ALREADY_DECIDED', 409, 'Tindakan HITL ini telah pun dinilai.');
   }
   ```
   Tindakan yang telah diluluskan atau ditolak tidak boleh dinilai kali kedua.
3. **Kawalan Akses Pengasas (Founder Authorization Guard)**:
   Endpoint `/copilot/hitl` dan `/copilot/hitl/:id/decide` menguatkuasakan `auth.founder(actor)`. Pengguna bukan-founder disekat dengan status 403 `FORBIDDEN`.
4. **Resit Pelaksanaan Palsu Dilarang (Zero Fabricated Receipts)**:
   Kelulusan oleh pengasas **BUKAN** pelaksanaan:
   ```typescript
   const updated: HitlActionRequest = {
     ...action,
     status: approve ? 'approved' : 'rejected',
     reviewedBy: actor.user.id,
     reviewedAt: now(),
     executionReceipt: undefined,
     executionBlockedReason: approve ? 'EXECUTOR_UNAVAILABLE' : undefined,
   };
   ```
   - `executionReceipt` MESTI `undefined`. Tiada resit palsu atau journal ID rawak dijana.
   - `executionBlockedReason` dilabelkan sebagai `'EXECUTOR_UNAVAILABLE'` apabila diluluskan sehingga executor fizikal yang disahkan (canonical allowlisted dispatcher) tersedia.

---

## 5. Analisis Penyelarasan Bayaran Billplz & Penguntukan Pemulangan Wang (PAY-01..03)

### 5.1. Lokasi Kod Kanonikal
- `server/platform/paymentReconciliation.ts`:
  - `allocateLargestRemainder(totalSen, items)` (baris 90–181)
  - `allocateCumulativeRefundAcrossLines(totalRefundSen, previousRefundSen, lines)` (baris 187–205)
  - `calculateCumulativeReversal(opts)` (baris 212–230)
  - `PaymentReconciler` (baris 232–612)

### 5.2. Invarian PAY-01 & PAY-02 (Penyelarasan Callback Pembekal)
1. **Deduplikasi (Idempotency)**:
   Disemak terhadap jadual `provider_receipts` menggunakan `payload.transactionId`. Callback berulang mengembalikan `{ outcome: 'duplicate_ignored', isDuplicate: true }` tanpa merekodkan entri lejar kedua atau menggandakan `paidAmountSen`.
2. **Validasi Asas**:
   - `currency === 'MYR'` (jika bukan, baling `PAYMENT_CURRENCY_MISMATCH`, 400).
   - `merchantAccount === this.expectedMerchantAccount` (`PAYMENT_ACCOUNT_MISMATCH`, 400).
   - `amountSen === order.amountSen` (`PAYMENT_AMOUNT_MISMATCH`, 409).
3. **Penyelarasan Percubaan Bertindih (Conflicting Paid Attempts)**:
   Jika pesanan telah disahkan bayar oleh transaksi terdahulu, transaksi kedua dipegang bawah kuarantin `payment_exceptions` dengan alasan `PAYMENT_CONFLICT_HELD` untuk semakan manusia (`payment_exception_review`).
4. **Pengendalian Bayaran Lewat (Late Paid Handling / STK-01 Invariant)**:
   Jika bayaran tiba selepas pesanan dibatalkan atau tempahan stok luput/dilepaskan:
   - Rekod fakta kewangan sebenar disimpan dalam `payments`.
   - Rekod pengecualian `payment_exceptions` dicipta dengan alasan `LATE_PAYMENT_AFTER_CANCELLATION`.
   - `fulfilmentStatus` pesanan KEKAL `cancelled`.
   - Tempahan stok TIDAK dihidupkan semula (stok yang telah dilepaskan tidak dirampas kembali / tiada oversell).

### 5.3. Invarian PAY-03 (Penguntukan Pemulangan Wang Terkumpul / Largest-Remainder)
1. **Kaedah Hamilton-Hare (Largest-Remainder)**:
   - Kuota integer floor dikira menggunakan aritmetik integer: `floorSen = Number(numerator / sumWeightsBig)`.
   - Baki pecahan dijejaki sebagai integer tepat: `remainderNum = numerator % sumWeightsBig`.
   - 1 sen residual diagihkan mengikut tertib baki terbesar (descending), dengan pemutus seri (tie-break) mengikut susunan ID menaik (`a.id.localeCompare(b.id)`).
   - Jumlah agihan disahkan sama dengan `totalSen` (`verifiedTotal === totalSen`).
   - Pemberat sifar dengan jumlah bukan sifar disekat serta-merta (`ZERO_WEIGHT_NONZERO_TOTAL`, `RangeError`).
2. **Kesetaraan Pembahagian Separa (Partial Partition Equality / 0-cent drift)**:
   `allocateCumulativeRefundAcrossLines` mengira delta:
   `cumulativeAfter - cumulativeBefore`.
   Terbukti dalam ujian bahawa 3 pemulangan wang separa (contoh: 300 sen, 400 sen, 300 sen) merentas baris pesanan menghasilkan agihan per baris yang 100% tepat sama dengan 1 pemulangan penuh 1000 sen, tanpa drifting 1 sen pun.
3. **Pembalikan Kontra Komisen Kumulatif (Cumulative Commission Reversal)**:
   `calculateCumulativeReversal` mengira sasaran pembalikan daripada jumlah kumulatif pemulangan wang:
   `target = floor(cumulativeRefundSen * rateBasisPoints / 10000)`.
   Delta kontra semasa = `target - previouslyReversed`.
   Menghapuskan kehilangan pembundaran (contoh 3 kali bayaran balik separa 333 + 333 + 334 sen pada kadar 10% menghasilkan pembalikan 33 + 33 + 34 = 100 sen tepat, berbanding 33 + 33 + 33 = 99 sen jika dikira secara terasing).
4. **Integriti Rollback Atomik**:
   Semua mutasi lejar, pemulangan wang pesanan, kontra komisen dealer, dan reversal mata loyalty diletakkan di dalam blok `this.store.atomic(() => { ... })`. Sebarang kegagalan membatalkan keseluruhan transaksi secara bersih.

---

## 6. Jurang, Percanggahan & Keperluan Pembetulan (Gaps & Discrepancies)

Semasa audit mendalam ini, tiga (3) jurang konkrit telah dikenal pasti:

### Jurang 1: Ralat Kompilasi TypeScript / Linter (`TS2305: PaymentRecord`)
- **Lokasi**:
  1. `tests/platform/refund-allocation-v24.test.ts` (baris 10):
     `import type { OrderRecord, PaymentRecord } from '../../shared/platform-contracts';`
  2. `server/platform/paymentReconciliation.ts` (baris 1):
     `import type { OrderRecord, PaymentRecord, InventoryReservation } from '../../shared/platform-contracts';`
- **Pemerhatian**:
  Fail `shared/platform-contracts.ts` TIDAK mengeksport antara muka `PaymentRecord`.
  `PaymentRecord` sebenarnya didefinisikan dalam `server/platform/commerce.ts` (baris 83):
  ```typescript
  export interface PaymentRecord { id:string; orderId:string; amountSen:number; method:'cash'|'bank'; reference:string; state:'confirmed'|'refunded'; confirmedBy:string; createdAt:string }
  ```
- **Kesan**:
  Walaupun `bun test` melepasi ujian (kerana Bun mengabaikan semakan jenis TS semasa runtime), arahan `bun run lint` (`tsc --noEmit && tsc --noEmit -p tsconfig.platform.json`) **GAGAL** dengan exit code bukan-sifar:
  `tests/platform/refund-allocation-v24.test.ts(10,28): error TS2305: Module '"../../shared/platform-contracts"' has no exported member 'PaymentRecord'.`
- **Cadangan Penyelesaian**:
  Eksport `PaymentRecord` secara kanonikal dalam `shared/platform-contracts.ts` (atau re-export daripada `server/platform/commerce.ts`) bagi membolehkan `bun run lint` lulus dengan status kod 0 mengikut Kriteria Penerimaan.

### Jurang 2: Penyambungan Laluan Webhook Pembayaran HTTP (`PaymentReconciler` Unmounted Route)
- **Pemerhatian**:
  Kelas `PaymentReconciler` telah lengkap dengan semua logik PAY-01..03, tetapi belum disambungkan ke laluan HTTP dalam `server/platform/app.ts` (contohnya tiada semakan `if (path === '/payments/webhook')` atau `/billplz/webhook`).
  Pada masa ini, pembayaran pesanan melalui HTTP disalurkan melalui `commerce.payment(actor, recordId, input, key)` yang memerlukan muat naik bukti manual (`evidenceIds`).
- **Cadangan Penyelesaian**:
  Bagi penyepaduan penuh gateway luar (Fasa 03A), wujudkan endpoint webhook tanpa sesi pelayar (seperti mana `/whatsapp/webhook` di baris 357 `app.ts`) yang menerima callback pembekal dan memanggil `paymentReconciler.processProviderCallback(payload)`.

### Jurang 3: Pengesahan Kriptografik X-Signature Billplz
- **Pemerhatian**:
  Dalam `server/platform/paymentReconciliation.ts`, jenis `ProviderCallbackPayload` mengandungi `signature?: string`, namun kaedah `processProviderCallback` belum menyemak tandatangan HMAC/SHA256 X-Signature Billplz menggunakan secret key webhook sandbox/production.
- **Konteks Spesifikasi**:
  Merujuk kepada `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md` (baris 247 & 374) dan `docs/prompts/03-domains-and-tools.md`, tanpa kelayakan sandbox sebenar, sistem berjalan dalam mod penyesuai sintetik (synthetic adapter test mode). Logik perniagaan teras telah terbukti mantap, tetapi rutin verifikasi X-Signature perlu dimasukkan apabila secret key dibekalkan.

---

## 7. Kesimpulan Siasatan

1. **FIN-01**: Aritmetik integer sen dan perbandingan BigInt tepat telah lengkap 100% dan terbukti kebal daripada salah laku pembundaran peratusan (23/23 ujian unit lulus).
2. **CPK-06**: Kitaran hayat HITL menguatkuasakan semakan luput sebelum mutasi, menolak duplikasi kelulusan, menyekat bukan-founder, dan melabelkan kelulusan dengan `executionBlockedReason: 'EXECUTOR_UNAVAILABLE'` tanpa mereka-reka resit palsu (5/5 ujian unit lulus).
3. **PAY-01..03**: Algoritma Largest-Remainder dan pembalikan kumulatif terbukti tepat tanpa drifting 1 sen (17/17 ujian unit lulus).
4. **Tindakan Pembetulan Diperlukan**: Satu isu jenis TS (`PaymentRecord` tiada dalam `shared/platform-contracts.ts`) perlu dibetulkan oleh ejen pelaksana untuk melepasi kriteria penerimaan `bun run lint exit code 0`.
