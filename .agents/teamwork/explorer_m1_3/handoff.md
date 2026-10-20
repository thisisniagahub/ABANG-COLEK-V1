# Handoff Report — explorer_m1_3 (HITL CPK-06 & Billplz PAY-01..03)

## 1. Observation

1. **Kitaran Hayat HITL (CPK-06)**:
   - **Fail**: `server/platform/adkAgent.ts` (baris 131–157)
     - Semakan tarikh luput mendahului mutasi keadaan:
       ```typescript
       // Semak tamat tempoh sebelum sebarang mutasi state
       if (action.expiry && new Date(action.expiry) <= new Date()) {
         fail('HITL_EXPIRED', 409, 'Tindakan HITL ini telah tamat tempoh.');
       }
       if (action.status !== 'pending_approval') {
         fail('HITL_ALREADY_DECIDED', 409, 'Tindakan HITL ini telah pun dinilai.');
       }
       ```
     - Kelulusan menetapkan ketiadaan resit pelaksanaan fizikal:
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
   - **Fail**: `server/platform/app.ts` (baris 334–339)
     - Endpoint HTTP `/copilot/hitl/:id/decide` dikawal oleh `auth.founder(actor)` dan menyokong masukan boolean `approve` mahupun string `decision === 'approved'`:
       ```typescript
       if(segments[0]==='copilot'&&segments[1]==='hitl'&&segments[2]&&segments[3]==='decide'){
         auth.founder(actor);
         const b=object(input);
         const approve=b.approve!==undefined?Boolean(b.approve):b.decision==='approved';
         return adkAgent.decideHitlAction(actor,segments[2],approve);
       }
       ```
   - **Fail**: `shared/copilot-contracts.ts` (baris 184–200)
     - Definisi `HitlActionRequest` mentakrifkan `executionReceipt?: ExecutionReceipt;` dan `executionBlockedReason?: 'EXECUTOR_UNAVAILABLE';`.

2. **Deduplikasi dan Pengasingan Bayaran Lewat Billplz (PAY-01 & PAY-02)**:
   - **Fail**: `server/platform/paymentReconciliation.ts` (baris 253–423)
     - Deduplikasi idempoten callback Billplz:
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
     - Pengasingan bayaran lewat tanpa menghidupkan semula stok (`STK-01`):
       ```typescript
       const reservations = this.store.all<InventoryReservation>('reservations').filter(r => r.orderId === order.id);
       const isOrderCancelled = order.fulfilmentStatus === 'cancelled';
       const isReservationDead = reservations.length === 0 || reservations.some(r => r.status === 'released' || r.status === 'expired' || r.expiresAt <= now());

       if (isOrderCancelled || isReservationDead) {
         return this.store.atomic(() => {
           // Rekod bayaran kewangan sebenar
           this.store.save('payments', paymentRecord);
           // Rekod resit penyedia berstatus payment_exception_review
           this.store.save('provider_receipts', receipt);
           // Rekod pengecualian untuk tindakan founder manual
           this.store.save('payment_exceptions', exception);
           // Kekalkan fulfilmentStatus sebagai cancelled; stok TIDAK dihidupkan semula
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

3. **Algoritma Largest-Remainder & Pemulangan Wang Tanpa Drifting (PAY-03)**:
   - **Fail**: `server/platform/paymentReconciliation.ts` (baris 81–231)
     - `allocateLargestRemainder`:
       - Mengira lantai integer kuota sen: `floorSen = Number((weightBig * totalSenBig) / sumWeightsBig)`.
       - Mengira baki rasional: `remainderNum = (weightBig * totalSenBig) % sumWeightsBig`.
       - Mengagihkan baki `residual = totalSen - sumFloor` mengikut susunan pecahan menurun dengan pemutus seri menaik `a.id.localeCompare(b.id)`.
       - Memastikan `verifiedTotal === totalSen`.
     - `allocateCumulativeRefundAcrossLines`:
       - Mengira agihan kumulatif `cumulativeAfter - cumulativeBefore`.
     - `calculateCumulativeReversal`:
       - Mengira sasaran kumulatif pembalikan komisen: `(BigInt(cumulativeRefundSen) * BigInt(rateBasisPoints)) / 10000n`.
       - Menolak posting terdahulu: `delta = Math.max(0, cappedTarget - previouslyReversedSen)`.

4. **Suite Ujian Domain Berkanun**:
   - `tests/platform/hitl-execution-v24.test.ts` (5 ujian):
     - Ujian 1: Kelulusan tidak mereka-reka resit palsu (`executionReceipt: undefined`, `executionBlockedReason: 'EXECUTOR_UNAVAILABLE'`).
     - Ujian 2: Penolakan menetapkan `status: 'rejected'` tanpa resit dan tanpa blocked reason.
     - Ujian 3: Tindakan tamat tempoh gagal dengan HTTP 409 `HITL_EXPIRED` sebelum mutasi pangkalan data berlaku.
     - Ujian 4: Tindakan yang telah dinilai gagal dengan HTTP 409 `HITL_ALREADY_DECIDED`.
     - Ujian 5: Pengguna bukan founder disekat dengan HTTP 403 `FORBIDDEN`.
   - `tests/platform/payment-reconciliation-v24.test.ts` (8 ujian):
     - Ujian deduplikasi callback berulang (idempotency).
     - Ujian penolakan amaun sen tidak sepadan (`PAYMENT_AMOUNT_MISMATCH`).
     - Ujian penolakan mata wang bukan MYR (`PAYMENT_CURRENCY_MISMATCH`).
     - Ujian penolakan akaun peniaga tidak sah (`PAYMENT_ACCOUNT_MISMATCH`).
     - Ujian bayaran lewat direkod bawah semakan manusia tanpa menghidupkan semula stok (`STK-01`).
     - Ujian pencegahan oversell apabila baki stok diagihkan kepada pesanan lain.
     - Ujian pertindihan bayaran berganda dipegang bawah review (`PAYMENT_CONFLICT_HELD`).
     - Ujian callback status gagal (`failed`) tidak mengubah pesanan sah.
   - `tests/platform/refund-allocation-v24.test.ts` (9 ujian):
     - Ujian integriti jumlah integer sen Hamilton-Hare.
     - Ujian penolakan pemberat sifar dengan jumlah bukan sifar (`ZERO_WEIGHT_NONZERO_TOTAL`).
     - Ujian masukan nilai negatif (RangeError).
     - Ujian kesetaraan agihan separa vs tunggal (0-cent drift).
     - Ujian idempotensi Replay ID pemulangan wang.
     - Ujian had baki boleh bayar asal (`REFUND_EXCEEDS_PAID_BALANCE`).
     - Ujian pembalikan komisen kumulatif bebas drifting pembundaran.
     - Ujian integriti rollback atomik sekiranya berlaku ralat integrasi.

5. **Eksport `PaymentRecord`**:
   - `shared/platform-contracts.ts` (baris 13–22) telah mengeksport `PaymentRecord` lengkap, menghapuskan ralat linter TS2305.

---

## 2. Logic Chain

1. Dari Pemerhatian 1 dan 4, kitaran hayat HITL mematuhi keperluan CPK-06 secara tepat:
   - Semakan tarikh luput berlaku sebelum sebarang mutasi, maka tiada rekod rosak atau status separa tersimpan sekiranya permintaan luput tiba.
   - Ketiadaan resit pelaksanaan semasa kelulusan memastikan sistem CopilotKit dan UI tidak menganggap kelulusan autoriti sebagai bukti tindakan fizikal telah terlaksana.
   - `executionBlockedReason: 'EXECUTOR_UNAVAILABLE'` memberikan isyarat jelas kepada klien bahawa tindakan menunggu pelaksana fizikal yang disahkan.
2. Dari Pemerhatian 2 dan 4, modul `PaymentReconciler` menghapuskan risiko ketidakseimbangan akaun dan persaingan stok:
   - Deduplikasi berasaskan `transactionId` memastikan rangkaian callback Billplz yang berulang tidak mengkreditkan akaun pelanggan dua kali.
   - Penolakan bayaran lewat tanpa mengembalikan tempahan stok (`STK-01`) menghalang kes di mana pembeli lain telah membeli baki stok yang dilepaskan, sekali gus mengelakkan pembatalan pesanan kedua atau *inventory negative balance*.
3. Dari Pemerhatian 3 dan 4, kaedah pembahagian baki terbesar (*Largest-Remainder*) Hamilton-Hare menjamin bahawa jumlah agihan setiap sen baris sentiasa genap dan tepat bersamaan `totalSen`.
4. Pengiraan pemulangan kumulatif (`cumulativeAfter - cumulativeBefore`) dan pembalikan komisen kumulatif (`delta = target - previouslyReversed`) membasmi pembentukan *rounding drift* (0-cent drift) yang sering berlaku dalam sistem kewangan tradisional yang membundar setiap transaksi mikro secara berasingan.
5. Dari Pemerhatian 5, pematuhan linter TypeScript dipulihkan kerana kontrak `PaymentRecord` sedia dieksport daripada `shared/platform-contracts.ts`.

---

## 3. Caveats

1. **Pengesahan Kriptografi Tandatangan Billplz (X-Signature HMAC-SHA256)**:
   - `PaymentReconciler.processProviderCallback` mempunyai parameter pilihan `signature?: string`, namun dalam mod pembangunan sintetik tempatan tanpa rahsia Billplz sebenar, pengesahan kriptografi HMAC belum diaktifkan secara mandatori.
2. **Penyambungan Endpoint Webhook Luaran HTTP**:
   - Laluan webhook Billplz pada ketika ini disemak melalui panggilan langsung ke modul `PaymentReconciler` dalam suite ujian dan aplikasi modular, dan belum diekspos sebagai laluan HTTP publik khas (seperti `/api/platform/billplz/webhook`) dalam `app.ts`. Ini selamat dan mencukupi untuk skop domain M1.
3. **Penyelarasan Pelaksana Fizikal (Physical Executor)**:
   - Sistem kini sengaja menyekat pelaksanaan fizikal automatik (`EXECUTOR_UNAVAILABLE`) untuk tindakan bernilai kewangan tinggi sehingga modul penyambung logistik/bank yang selamat disahkan dalam fasa berikutnya.

---

## 4. Conclusion

Keperluan Fasa 03A Milestone 1 bagi Kitaran Hayat HITL (**CPK-06**) dan Penyelarasan Bayaran & Pemulangan Wang (**PAY-01..03**) adalah **100% LENGKAP, PATUH SPESIFIKASI MASTER BLUEPRINT v2.4, DAN MEMPUNYAI LIPUTAN UJIAN YANG KUKUH**.

**Cadangan Tindakan untuk Implementer (Worker) & Reviewers**:
- **Worker**: Tiada pengubahsuaian kod sumber lanjut diperlukan untuk logik CPK-06 atau PAY-01..03. Pastikan tiada regresi berlaku semasa penyusunan modular monolith (M2).
- **Reviewers**: Berikan tumpuan kepada pematuhan invarian `executionBlockedReason: 'EXECUTOR_UNAVAILABLE'`, semakan tarikh luput 409 sebelum mutasi, dan pencegahan pembangkitan stok bagi bayaran lewat (`STK-01`).

---

## 5. Verification Method

Pengesahan bebas boleh dijalankan dengan arahan dan semakan fail berikut:

1. **Jalankan Ujian Kitaran Hayat HITL (CPK-06)**:
   ```bash
   bun test tests/platform/hitl-execution-v24.test.ts
   ```
   *Jangkaan*: 5 pass, 0 fail.

2. **Jalankan Ujian Penyelarasan Bayaran Billplz (PAY-01 & PAY-02)**:
   ```bash
   bun test tests/platform/payment-reconciliation-v24.test.ts
   ```
   *Jangkaan*: 8 pass, 0 fail.

3. **Jalankan Ujian Pengagihan Pemulangan Wang & Largest-Remainder (PAY-03)**:
   ```bash
   bun test tests/platform/refund-allocation-v24.test.ts
   ```
   *Jangkaan*: 9 pass, 0 fail.

4. **Semakan Integriti Kod Statik**:
   - Sahkan `server/platform/adkAgent.ts` baris 136 membaling 409 bagi `action.expiry && new Date(action.expiry) <= new Date()`.
   - Sahkan `server/platform/adkAgent.ts` baris 150 menetapkan `executionReceipt: undefined`.
   - Sahkan `server/platform/paymentReconciliation.ts` baris 407 mengekalkan `fulfilmentStatus: 'cancelled'` dan tidak memutasi `reservations` kepada `'active'`.
   - Sahkan `shared/platform-contracts.ts` mengeksport `PaymentRecord`.
