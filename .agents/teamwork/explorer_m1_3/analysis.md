# Laporan Analisis Terperinci — explorer_m1_3
**Subjek**: Audit Kitaran Hayat HITL (CPK-06) dan Penyelarasan Pembayaran & Pemulangan Wang Billplz (PAY-01..03)  
**Tarikh & Masa**: 2026-10-20T04:46:00Z  
**Ejen**: explorer_m1_3 (teamwork_preview_explorer)  
**Direktori Kerja**: `d:\ABANGCOLEK-PLATFORM\.agents\teamwork\explorer_m1_3`  
**Induk Orkestrator**: orchestrator_1 (`69f0e8df-5db9-4eb4-aae4-75264c0674f4`)

---

## Ringkasan Eksekutif

Pemeriksaan kod sumber, kontrak antara muka, dan suite ujian domain mengesahkan bahawa:
1. **Kitaran Hayat HITL (CPK-06)** dalam `server/platform/adkAgent.ts` dan `server/platform/app.ts` mematuhi prinsip *No False Execution Receipts* secara ketat:
   - Tindakan tamat tempoh (`expiry`) disekat serta-merta dengan HTTP 409 `HITL_EXPIRED` sebelum sebarang mutasi data berlaku.
   - Kelulusan Founder **TIDAK** menjana resit pelaksanaan palsu (`executionReceipt: undefined`).
   - Apabila diluluskan, status ditanda dengan `executionBlockedReason: 'EXECUTOR_UNAVAILABLE'` sehingga executor fizikal disahkan.
2. **Penyelarasan Bayaran Billplz (PAY-01..03)** dalam `server/platform/paymentReconciliation.ts`:
   - Menguatkuasakan deduplikasi idempoten berasaskan `transactionId` dalam `provider_receipts`.
   - Menolak ketidakpadanan amaun, akaun, atau mata wang secara serta-merta.
   - Mengasingkan bayaran lewat (selepas pesanan dibatalkan atau tempahan stok luput) di bawah `payment_exception_review` tanpa membangkitkan semula stok (`STK-01`).
   - Algoritma kuota integer **Largest-Remainder (Hamilton-Hare)** dan pengiraan pembalikan kumulatif menjamin **0-cent drift** merentas bayaran balik separa.
3. Suite ujian domain merangkumi 22 senario ujian spesifik (`hitl-execution-v24.test.ts`: 5 ujian, `payment-reconciliation-v24.test.ts`: 8 ujian, `refund-allocation-v24.test.ts`: 9 ujian).

---

## 1. Audit Terperinci CPK-06: Kitaran Hayat Human-In-The-Loop (HITL)

### 1.1 Pemerhatian Kod Sumber

#### A. `server/platform/adkAgent.ts` (Baris 110–157)
```typescript
110: const hitl: HitlActionRequest = {
111:   id: actionId,
112:   actionType,
113:   entity: payload.entity ?? { type: 'order', id: payload.orderId ?? 'ord-unknown' },
114:   amountSen: typeof payload.amountSen === 'number' ? payload.amountSen : undefined,
115:   revision: typeof payload.revision === 'number' ? payload.revision : 1,
116:   reason: typeof payload.reason === 'string' ? payload.reason : description,
117:   expiry: typeof payload.expiry === 'string' ? payload.expiry : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
118:   status: 'pending_approval',
119:   description,
120:   payload,
121:   createdAt: now(),
122: };
123: this.store.save('hitl_actions', hitl);
124: this.store.audit(actor.user.id, 'hitl.create', hitl.id);
125: return hitl;
...
131: decideHitlAction(actor: Principal, actionId: string, approve: boolean): HitlActionRequest {
132:   this.auth.founder(actor);
133:   const action = this.store.require<HitlActionRequest>('hitl_actions', actionId);
134:
135:   // Semak tamat tempoh sebelum sebarang mutasi state
136:   if (action.expiry && new Date(action.expiry) <= new Date()) {
137:     fail('HITL_EXPIRED', 409, 'Tindakan HITL ini telah tamat tempoh.');
138:   }
139:
140:   if (action.status !== 'pending_approval') {
141:     fail('HITL_ALREADY_DECIDED', 409, 'Tindakan HITL ini telah pun dinilai.');
142:   }
143:
144:   // Kelulusan BUKAN pelaksanaan. Dilarang mereka-reka executionReceipt palsu.
145:   const updated: HitlActionRequest = {
146:     ...action,
147:     status: approve ? 'approved' : 'rejected',
148:     reviewedBy: actor.user.id,
149:     reviewedAt: now(),
150:     executionReceipt: undefined,
151:     executionBlockedReason: approve ? 'EXECUTOR_UNAVAILABLE' : undefined,
152:   };
153:
154:   this.store.save('hitl_actions', updated);
155:   this.store.audit(actor.user.id, approve ? 'hitl.approve' : 'hitl.reject', updated.id);
156:   return updated;
157: }
```

#### B. `server/platform/app.ts` (Baris 334–339)
```typescript
334: if(segments[0]==='copilot'&&segments[1]==='hitl'&&segments[2]&&segments[3]==='decide'){
335:   auth.founder(actor);
336:   const b=object(input);
337:   const approve=b.approve!==undefined?Boolean(b.approve):b.decision==='approved';
338:   return adkAgent.decideHitlAction(actor,segments[2],approve);
339: }
```

#### C. `shared/copilot-contracts.ts` (Baris 184–200)
```typescript
export interface HitlActionRequest {
  id: string;
  actionType: 'refund' | 'stock_quarantine' | 'founder_override' | 'commission_contra';
  entity: HitlEntityRef;
  amountSen?: number;
  revision: number;
  reason: string;
  expiry: string;
  status: HitlStatus;
  description: string;
  payload: Record<string, any>;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  executionReceipt?: ExecutionReceipt;
  executionBlockedReason?: 'EXECUTOR_UNAVAILABLE';
}
```

### 1.2 Analisis Rantaian Logik CPK-06
1. **Pencegahan Mutasi Pra-Syarat (Pre-Mutation Invariance)**:
   - Pada baris 136 `adkAgent.ts`, `new Date(action.expiry) <= new Date()` dinilai sebelum sebarang kemas kini ke atas objek `action` atau pangkalan data `store`.
   - Apabila syarat luput dipenuhi, `fail('HITL_EXPIRED', 409)` dilemparkan. Ini menghalang keadaan separuh siap (*partial state corruption*). Status dalam pangkalan data kekal `pending_approval`.
2. **Ketiadaan Resit Pelaksanaan Palsu (No Fabricated Receipt)**:
   - Kelulusan pengasas (*Founder approval*) hanyalah pemberian kuasa kebenaran (*authorization*), bukan pelaksanaan mutasi fizikal (*execution*).
   - Baris 150 menetapkan `executionReceipt: undefined` secara eksplisit, menghapuskan sebarang kemungkinan lapisan Copilot mereka-reka resit rekaan.
   - Baris 151 menetapkan `executionBlockedReason: approve ? 'EXECUTOR_UNAVAILABLE' : undefined`. Sekiranya ditolak, tiada blocked reason ditetapkan.
3. **Keselamatan Sempadan Peranan (Role & Authority Isolation)**:
   - Semakan `auth.founder(actor)` berlaku dua kali: di peringkat routing (`app.ts:335`) dan di peringkat domain (`adkAgent.ts:132`).
   - Percubaan oleh pengguna bukan founder disekat serta-merta dengan HTTP 403 `FORBIDDEN`.
4. **Idempotensi Peralihan Status**:
   - Jika `action.status !== 'pending_approval'`, cubaan kedua menghasilkan HTTP 409 `HITL_ALREADY_DECIDED`.

---

## 2. Audit Terperinci PAY-01 & PAY-02: Penyelarasan Bayaran Billplz

### 2.1 Pemerhatian Kod Sumber (`server/platform/paymentReconciliation.ts`)

#### A. Deduplikasi dan Idempotensi (PAY-01, Baris 253–264)
```typescript
const existingReceipt = this.store.get<ProviderReceiptRecord>('provider_receipts', payload.transactionId);
if (existingReceipt) {
  const order = this.store.get<OrderRecord>('orders', payload.orderId) ?? undefined;
  return {
    outcome: 'duplicate_ignored',
    orderId: payload.orderId,
    isDuplicate: true,
    receiptId: existingReceipt.id,
    order,
  };
}
```

#### B. Pengesahan Pintu Keselamatan (Gateway Invariants, Baris 266–281)
- **Mata Wang**: `payload.currency !== 'MYR'` menolak dengan 400 `PAYMENT_CURRENCY_MISMATCH`.
- **Akaun Peniaga**: `payload.merchantAccount !== this.expectedMerchantAccount` menolak dengan 400 `PAYMENT_ACCOUNT_MISMATCH`.
- **Jumlah Sen**: `payload.amountSen !== order.amountSen` menolak dengan 409 `PAYMENT_AMOUNT_MISMATCH`.

#### C. Pengendalian Konflik Bayaran Bertindih (Baris 307–349)
- Sekiranya `order.paidAmountSen >= order.amountSen && order.paymentState === 'verified'`, transaksi kedua tidak menggandakan rekod bayaran pesanan.
- Transaksi direkod dalam `payment_exceptions` dengan sebab `'PAYMENT_CONFLICT_HELD'` dan disimpan di bawah semakan manusia (`payment_exception_review`).

#### D. Pengendalian Bayaran Lewat & Perlindungan Stok (STK-01 / PAY-02, Baris 351–423)
```typescript
const reservations = this.store.all<InventoryReservation>('reservations').filter(r => r.orderId === order.id);
const isOrderCancelled = order.fulfilmentStatus === 'cancelled';
const isReservationDead = reservations.length === 0 || reservations.some(r => r.status === 'released' || r.status === 'expired' || r.expiresAt <= now());

if (isOrderCancelled || isReservationDead) {
  return this.store.atomic(() => {
    // 1. Rekod fakta kewangan sebenar (wang diterima tidak dinafikan)
    const paymentRecord: PaymentRecord = {
      id: id(),
      orderId: order.id,
      amountSen: payload.amountSen,
      method: 'bank',
      reference: payload.transactionId,
      state: 'confirmed',
      confirmedBy: 'provider:webhook',
      createdAt: now(),
    };
    this.store.save('payments', paymentRecord);

    // 2. Simpan resit pembekal
    const receipt: ProviderReceiptRecord = {
      id: payload.transactionId,
      orderId: order.id,
      provider: payload.provider ?? 'billplz',
      providerRef: payload.transactionId,
      amountSen: payload.amountSen,
      currency: payload.currency,
      merchantAccount: payload.merchantAccount,
      status: 'paid',
      receivedAt: now(),
      outcome: 'payment_exception_review',
      exceptionReason: 'LATE_PAYMENT_AFTER_CANCELLATION',
    };
    this.store.save('provider_receipts', receipt);

    // 3. Simpan pengecualian bayaran
    const exception: PaymentExceptionRecord = {
      id: id(),
      orderId: order.id,
      transactionId: payload.transactionId,
      reason: 'LATE_PAYMENT_AFTER_CANCELLATION',
      amountSen: payload.amountSen,
      currency: payload.currency,
      heldAt: now(),
      resolved: false,
      notes: 'Bayaran tiba selepas pesanan expired/cancelled. Stok tidak dihidupkan semula secara automatik.',
    };
    this.store.save('payment_exceptions', exception);

    // 4. Kemas kini fakta bayaran pesanan TETAPI KEKALKAN fulfilmentStatus sebagai cancelled
    // JANGAN hidupkan semula tempahan stok
    const updatedOrder: OrderRecord = {
      ...order,
      paidAmountSen: payload.amountSen,
      fulfilmentStatus: 'cancelled',
      revision: order.revision + 1,
      updatedAt: now(),
    };
    this.store.save('orders', updatedOrder);
    ...
  });
}
```

### 2.2 Analisis Rantaian Logik PAY-01 & PAY-02
1. **Integriti Lejar Fakta Kewangan**:
   - Wang yang masuk tidak boleh dinafikan atau dipadamkan semata-mata kerana pesanan telah luput.
   - Oleh itu, lejar `payments` merekodkan `PaymentRecord` rasmi.
2. **Prinsip Anti-Overselling (STK-01)**:
   - Apabila pesanan dibatalkan atau tempahan luput, unit stok fizikal telah dilepaskan kembali ke pasaran untuk pembeli lain.
   - Sekiranya callback pembayaran lewat tiba kemudian, sistem **DILARANG** menghidupkan semula tempahan stok (`reservations`) secara automatik, kerana ini akan menyebabkan overselling sekiranya pembeli lain telah menempah unit tersebut.
   - Status pesanan dikekalkan sebagai `cancelled` dan insiden ditandakan `payment_exception_review` untuk tindakan manual Founder (sama ada pulangan balik atau restock manual).

---

## 3. Audit Terperinci PAY-03: Algoritma Largest-Remainder & Pemulangan Wang Kumulatif

### 3.1 Algoritma Hamilton-Hare Integer Allocation (`allocateLargestRemainder`, Baris 81–182)

1. **Pengesahan Masukan**:
   - `totalSen` mesti integer selamat bukan negatif (`Number.isSafeInteger(totalSen) && totalSen >= 0`).
   - Pemberat (`weight`) setiap item mesti nombor terhingga bukan negatif.
   - Jika `sumWeights === 0 && totalSen > 0`, lempar `RangeError('ZERO_WEIGHT_NONZERO_TOTAL')`.
2. **Pengiraan Quota & Baki Pecahan Rasional**:
   ```typescript
   const sumWeightsBig = BigInt(Math.round(sumWeights * 10000));
   const totalSenBig = BigInt(totalSen);

   const quotas = items.map((item, index) => {
     const weightBig = BigInt(Math.round(item.weight * 10000));
     const numerator = weightBig * totalSenBig;
     const floorSen = Number(numerator / sumWeightsBig);
     const remainderNum = numerator % sumWeightsBig;
     return { index, id: item.id, floorSen, remainderNum };
   });
   ```
3. **Agihan Residual 1-Cent & Pemutus Seri Stabil**:
   - `residual = totalSen - sumFloor`
   - Susun mengikut `remainderNum` secara menurun.
   - Jika `remainderNum` sama, pemutus seri stabil: `a.id.localeCompare(b.id)` secara menaik.
   - Sebanyak `residual` item teratas menerima +1 sen tambahan.
   - Invarian mutlak: `verifiedTotal === totalSen`.

### 3.2 Pemulangan Wang Kumulatif Merentas Baris (`allocateCumulativeRefundAcrossLines`, Baris 188–206)
```typescript
export function allocateCumulativeRefundAcrossLines(
  totalRefundSen: number,
  previousRefundSen: number,
  lines: { productId: string; priceSen: number; quantity: number }[]
): AllocationResult[] {
  if (lines.length === 0) return [];
  const items: AllocationItem[] = lines.map(line => ({
    id: line.productId,
    weight: line.priceSen * line.quantity,
  }));

  const cumulativeBefore = allocateLargestRemainder(previousRefundSen, items);
  const cumulativeAfter = allocateLargestRemainder(previousRefundSen + totalRefundSen, items);

  return cumulativeAfter.map((after, idx) => ({
    id: after.id,
    allocatedSen: after.allocatedSen - cumulativeBefore[idx].allocatedSen,
  }));
}
```
**Analisis Matematik**:
- Dengan mengira perbezaan antara keadaan kumulatif selepas dan keadaan kumulatif sebelum, sebarang pemulangan separa (contoh: 300 sen, 400 sen, 300 sen) adalah **tepat setara dari segi matematik** dengan pemulangan sekali gus (1000 sen).
- Ini menghapuskan sepenuhnya *rounding drift* (0-cent drift).

### 3.3 Pembalikan Komisen Dealer Kumulatif (`calculateCumulativeReversal`, Baris 213–231)
```typescript
export function calculateCumulativeReversal(opts: CumulativeReversalOptions): {
  targetCumulativeReversalSen: number;
  currentReversalDeltaSen: number;
} {
  const targetCumulative = Number(
    (BigInt(opts.cumulativeRefundSen) * BigInt(opts.rateBasisPoints)) / 10000n
  );
  const cappedTarget = Math.min(opts.originalAmountSen, targetCumulative);
  const delta = Math.max(0, cappedTarget - opts.previouslyReversedSen);

  return {
    targetCumulativeReversalSen: cappedTarget,
    currentReversalDeltaSen: delta,
  };
}
```
**Analisis Bukti**:
- Diberi komisen RM 1.00 (100 sen) pada kadar 10% ke atas pesanan RM 10.00 (1000 sen).
- Diberi 3 refund separa: 333 sen, 333 sen, 334 sen.
- Jika dibundar secara berasingan:
  - `floor(33.3) = 33`
  - `floor(33.3) = 33`
  - `floor(33.4) = 33`
  - Jumlah = 99 sen (hilang 1 sen!).
- Kaedah Kumulatif:
  - Callback 1: Sasaran = `floor(333 * 0.1) = 33`. Delta = 33 sen.
  - Callback 2: Sasaran = `floor(666 * 0.1) = 66`. Delta = `66 - 33 = 33` sen.
  - Callback 3: Sasaran = `floor(1000 * 0.1) = 100`. Delta = `100 - 66 = 34` sen.
  - Jumlah Delta = `33 + 33 + 34 = 100` sen tepat!

### 3.4 Proses Pemulangan Wang (`processRefund`, Baris 490–612)
1. **Semakan Replay ID**: Jika `payments` sudah mempunyai rekod berstatus `refunded`, kembalikan hasil sedia ada (`isReplay: true`) tanpa mutasi baharu.
2. **Had Baki Boleh Bayar (Cap)**: `availableRefundableSen = order.paidAmountSen - order.refundAmountSen`. Jika melebihi, lempar 400 `REFUND_EXCEEDS_PAID_BALANCE`.
3. **Pembalikan Komisen & Mata Ganjaran**: Mengemaskini kontra komisen dalam `commission_ledger` dan membalikkan mata kesetiaan sekiranya bayaran dipulangkan sepenuhnya.
4. **Atomicity**: Dilindungi oleh `store.atomic(...)` — sekiranya berlaku ralat integrasi, semua jadual digulung balik (*rollback*) secara penuh.

---

## 4. Matriks Pemetaan Kriteria Penerimaan & Suite Ujian

| Kod Keperluan | Fail Ujian Terlibat | Bilangan Ujian | Status Pengesahan Statik |
|---|---|---|---|
| **CPK-06 (No False Receipts)** | `tests/platform/hitl-execution-v24.test.ts` | 5 ujian | LENGKAP & DISAHKAN |
| **CPK-06 (Expiry 409 Check)** | `tests/platform/hitl-execution-v24.test.ts` | Disertakan (Test 3) | LENGKAP & DISAHKAN |
| **PAY-01 (Billplz Idempotency)** | `tests/platform/payment-reconciliation-v24.test.ts` | 4 ujian | LENGKAP & DISAHKAN |
| **PAY-02 (Late Paid STK-01)** | `tests/platform/payment-reconciliation-v24.test.ts` | 4 ujian | LENGKAP & DISAHKAN |
| **PAY-03 (Hamilton-Hare Allocation)** | `tests/platform/refund-allocation-v24.test.ts` | 4 ujian | LENGKAP & DISAHKAN |
| **PAY-03 (0-Cent Drift Partition)** | `tests/platform/refund-allocation-v24.test.ts` | 5 ujian | LENGKAP & DISAHKAN |

---

## 5. Strategi Pelaksanaan & Pengesahan untuk Worker dan Reviewers

### 5.1 Panduan untuk Worker
1. **Status Kod Sedia Ada**:
   - Kod dalam `server/platform/adkAgent.ts`, `server/platform/app.ts`, dan `server/platform/paymentReconciliation.ts` telah berada dalam keadaan lengkap, mantap, dan tepat dari segi spesifikasi.
   - **TIDAK PERLU** membuat pengubahsuaian semula pada algoritma Largest-Remainder, logik luput HITL, atau penanganan bayaran lewat.
2. **Penyelesaian Isu Linter TS2305**:
   - `PaymentRecord` telah berjaya dieksport dalam `shared/platform-contracts.ts` (baris 13–22). Pastikan tiada fail lain yang merujuk import lapuk atau membuat definisi berulang yang bertentangan.
3. **Penyambungan Webhook Terbuka (Pilihan Masa Hadapan)**:
   - Sekiranya endpoint HTTP untuk Billplz diperlukan di masa hadapan, buat laluan `POST /api/platform/billplz/webhook` dalam `server/platform/app.ts` tanpa perlindungan CSRF (kerana ia callback mesin-ke-mesin), yang memanggil `paymentReconciler.processProviderCallback(body)`.

### 5.2 Panduan untuk Reviewers
1. **Senarai Semak Semakan Kod (Review Checklist)**:
   - [ ] Sahkan bahawa `HitlActionRequest` yang diluluskan mempunyai `executionReceipt: undefined` dan `executionBlockedReason: 'EXECUTOR_UNAVAILABLE'`.
   - [ ] Sahkan bahawa tindakan HITL tamat tempoh membaling 409 `HITL_EXPIRED` sebelum sebarang mutasi status berlaku.
   - [ ] Sahkan bahawa callback bayaran lewat (`cancelled` / `expired`) tidak sekali-kali menghidupkan semula tempahan stok (`InventoryReservation` kekal `released` atau `expired`).
   - [ ] Sahkan bahawa agihan baki pemulangan wang Hamilton-Hare mengagihkan residual 1 sen mengikut susunan pecahan menurun dengan pemutus seri ID menaik.
   - [ ] Sahkan bahawa pembalikan kumulatif komisen (`calculateCumulativeReversal`) menghapuskan drift pembundaran merentas berbilang callback separa.

---

## 6. Kesimpulan

Logik CPK-06 dan PAY-01..03 membuktikan ketepatan seni bina berkanun platform ABANGCOLEK v2.4 berlandaskan prinsip *Rules Own The Money*. Semua invarian domain yang ditugaskan telah disahkan secara terperinci dan sedia untuk peringkat semakan dan integrasi Milestone 1.
