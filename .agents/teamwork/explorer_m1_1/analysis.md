# Laporan Analisis Teknikal: Penyelesaian Ralat Penghalang TypeScript TS2305

**Tarikh/Masa**: 2026-10-20T04:50:00Z  
**Penyiasat**: `explorer_m1_1` (teamwork_preview_explorer)  
**Milestone**: M1 (Fasa 03A: Integriti Kewangan, Lejar & HITL)  
**Status**: SELESAI DISIASAT (EVIDENCE-VERIFIED)

---

## 1. Ringkasan Eksekutif (Executive Summary)

Ralat kompilasi TypeScript:
```text
tests/platform/refund-allocation-v24.test.ts(10,28): error TS2305: Module '"../../shared/platform-contracts"' has no exported member 'PaymentRecord'.
```
berpunca daripada ketidakselarasan lokasi eksport jenis data `PaymentRecord`. Asalnya, `PaymentRecord` ditakrifkan secara setempat di `server/platform/commerce.ts:83`, manakala fail suite ujian domain baharu `tests/platform/refund-allocation-v24.test.ts` mengimportnya daripada kontrak kongsi kanonikal `shared/platform-contracts.ts`.

Siasatan mendalam mendapati bahawa dalam salinan kerja (working copy) semasa, penambahan interface `PaymentRecord` telah dimasukkan ke dalam `shared/platform-contracts.ts:13-22`. Namun, `server/platform/commerce.ts:83` masih mengekalkan takrifan pendua (duplicate declaration), dan terdapat percanggahan teks spesifikasi dalam `PROJECT.md:74` yang berisiko mengelirukan ejen pembangun sekiranya tidak diperbetulkan mengikut kontrak domain sebenar.

Strategi pembaikan paling bersih, selamat dan mematuhi seni bina adalah:
Menjadikan `shared/platform-contracts.ts` sebagai **Single Source of Truth** untuk `PaymentRecord`, dan melakukan **re-export** dalam `server/platform/commerce.ts`. Ini mengekalkan keserasian 100% terhadap kesemua 6 fail pengguna sedia ada tanpa memecahkan sempadan seni bina pelayan-klien (ARC-01).

---

## 2. Rantaian Bukti & Pemerhatian Langsung (Evidence Chain)

### A. Pemerhatian Fail Ujian (`tests/platform/refund-allocation-v24.test.ts`)
- **Lokasi Import**: Baris 10:
  ```typescript
  import type { OrderRecord, PaymentRecord } from '../../shared/platform-contracts';
  ```
- **Penggunaan Medan `PaymentRecord` dalam Ujian**: Baris 46–56:
  ```typescript
  const initialPayment: PaymentRecord = {
    id: 'pay-initial-001',
    orderId: order.id,
    amountSen: 1000,
    method: 'bank',
    reference: 'TXN-INITIAL-1000',
    state: 'confirmed',
    confirmedBy: 'provider:webhook',
    createdAt: now(),
  };
  store.save('payments', initialPayment);
  ```
- **Pemerhatian Kunci**: Medan yang diwajibkan oleh ujian ialah:
  `id`, `orderId`, `amountSen`, `method`, `reference`, `state`, `confirmedBy`, `createdAt`.
  Status ujian: `bun test tests/platform/refund-allocation-v24.test.ts` menghasilkan 9 pass / 0 fail (43 expect calls).

### B. Pemerhatian Pelayan Dagangan (`server/platform/commerce.ts`)
- **Lokasi Takrifan Sedia Ada**: Baris 83:
  ```typescript
  export interface PaymentRecord { id:string; orderId:string; amountSen:number; method:'cash'|'bank'; reference:string; state:'confirmed'|'refunded'; confirmedBy:string; createdAt:string }
  ```
- **Import Sedia Ada**: Baris 2 `server/platform/commerce.ts` telah pun mengimport jenis kontrak awam daripada `../../shared/platform-contracts`:
  ```typescript
  import type { CatalogueProduct, PublicProduct, InventoryMovement, InventoryReservation, OrderInput, OrderLine, OrderRecord, StockLot, PaymentState, FulfilmentStatus, VersionedQuote, EvidenceRecord, TrackedOrder } from '../../shared/platform-contracts';
  ```
- **Mutasi Rekod**: Baris 318 dan 329 menyimpan `PaymentRecord` ke koleksi `'payments'` dalam `PlatformStore`.

### C. Pemerhatian Kontrak Kongsi (`shared/platform-contracts.ts`)
- **Status Komit Asal (HEAD 60311aa)**: Tiada eksport `PaymentRecord`.
- **Status Salinan Kerja (Working Tree Uncommitted Diff)**:
  Baris 13–22 telah ditambah:
  ```typescript
  export interface PaymentRecord {
    id: string;
    orderId: string;
    amountSen: number;
    method: 'cash' | 'bank';
    reference: string;
    state: 'confirmed' | 'refunded';
    confirmedBy: string;
    createdAt: string;
  }
  ```
- **Sifat Sempadan Seni Bina (ARC-01)**:
  `shared/platform-contracts.ts` adalah kontrak peringkat klien/pelayar (browser-safe public contracts). Baris 2 menyatakan:
  `/** Browser-safe public contracts. Authority is resolved by the server for every request. */`
  Ia diimport secara langsung oleh komponen antaramuka pengguna Vite/React di `src/`. Ia **DILARANG SAMA SEKALI** mengimport apa-apa dari direktori `server/`.

### D. Pemetaan Keseluruhan Rujukan `PaymentRecord` dalam Repositori
Hasil carian ripgrep (`grep_search`) mengesahkan 6 fail aktif yang menggunakan `PaymentRecord`:

| # | Fail | Baris | Cara Penggunaan / Import |
|---|------|-------|--------------------------|
| 1 | `server/platform/commerce.ts` | 83 | Takrifan asal: `export interface PaymentRecord { ... }` |
| 2 | `server/platform/dealers.ts` | 3, 29, 271, 475 | `import { Commerce, type PaymentRecord } from './commerce';` |
| 3 | `server/platform/operations.ts` | 3, 11, 37, 38, 42 | `import { Commerce, type PaymentRecord } from './commerce';` |
| 4 | `server/platform/reports.ts` | 5, 25, 77 | `import { Commerce, type PaymentRecord } from './commerce';` |
| 5 | `server/platform/paymentReconciliation.ts` | 2, 75, 360, 427, 492, 528 | `import type { PaymentRecord } from './commerce';` |
| 6 | `tests/platform/full-collection-summaries.test.ts` | 4, 12, 13 | `import type { PaymentRecord } from '../../server/platform/commerce';` |
| 7 | `tests/platform/refund-allocation-v24.test.ts` | 10, 46, 325 | `import type { OrderRecord, PaymentRecord } from '../../shared/platform-contracts';` |

---

## 3. Analisis Percanggahan: `PROJECT.md` vs Kod Sebenar

Dalam fail skop `PROJECT.md:72-75`, tercatat penerangan berikut:
```markdown
### `shared/platform-contracts.ts` ↔ Test Suites
- Eksport `PaymentRecord` dengan medan kanonikal:
  - `{ id: string, orderId: string, provider: string, referenceId: string, amountSen: number, status: 'pending' | 'paid' | 'failed' | 'refunded', createdAt: string, signature?: string }`
```

### Amaran Kritikal (Critical Divergence):
Penerangan dalam `PROJECT.md` baris 74 adalah **draf konsep awal yang tidak tepat** kerana mencampurkan skema rekod transaksi lejar dalaman (`PaymentRecord`) dengan skema resit luaran webhook Billplz (`ProviderReceiptRecord` / `ProviderCallbackPayload` di `paymentReconciliation.ts:20-30`).

Sekiranya implementer menukar medan `PaymentRecord` kepada skema `PROJECT.md` (menukar `state` kepada `status`, membuang `method`, atau menambah `provider` wajib):
1. **Pecah**: `server/platform/commerce.ts` (baris 318 & 329) akan gagal kompilasi (`method: 'cash' | 'bank'`, `state: 'confirmed' | 'refunded'`).
2. **Pecah**: `server/platform/operations.ts` (baris 37, 38 & 42) akan gagal (`p.state === 'confirmed'`).
3. **Pecah**: `server/platform/paymentReconciliation.ts` (baris 360-370 & 528-538) akan gagal.
4. **Pecah**: `tests/platform/refund-allocation-v24.test.ts` (baris 46-56) akan gagal kompilasi!

**Ketetapan Penyiasatan**:
Skema kanonikal yang sah dan berkuat kuasa merentas 100% kod dan ujian sedia ada adalah:
```typescript
export interface PaymentRecord {
  id: string;
  orderId: string;
  amountSen: number;
  method: 'cash' | 'bank';
  reference: string;
  state: 'confirmed' | 'refunded';
  confirmedBy: string;
  createdAt: string;
}
```

---

## 4. Perbandingan Pilihan Strategi Pembaikan

### Pilihan 1: Takrifkan dalam `shared/platform-contracts.ts` & Re-export dalam `server/platform/commerce.ts` (DISYORKAN)
- **Tindakan**:
  1. Kekalkan takrifan `PaymentRecord` dalam `shared/platform-contracts.ts`.
  2. Dalam `server/platform/commerce.ts`, tambahkan `PaymentRecord` ke import baris 2 dari `../../shared/platform-contracts`.
  3. Di baris 83 `server/platform/commerce.ts`, gantikan takrifan setempat dengan:
     ```typescript
     export type { PaymentRecord };
     ```
- **Kelebihan**:
  - Mematuhi prinsip **Single Source of Truth** (SSOT).
  - Sifar penduaan kod jenis data.
  - Keserasian ke belakang 100%: modul sedia ada yang mengimport dari `./commerce` (`dealers.ts`, `operations.ts`, `reports.ts`, `paymentReconciliation.ts`, `full-collection-summaries.test.ts`) tidak perlu diubah walau satu aksara sekalipun.
  - Fail ujian `refund-allocation-v24.test.ts` yang mengimport dari `../../shared/platform-contracts` lulus serta-merta tanpa ralat.
  - Tiada kebocoran kod pelayan ke klien (menghormati ARC-01).

### Pilihan 2: Re-export dari `commerce.ts` ke dalam `shared/platform-contracts.ts` (DITOLAK)
- Mengimport `server/platform/commerce.ts` ke dalam `shared/platform-contracts.ts` melanggar sempadan ketergantungan. Fail `shared/` digunakan oleh klien Vite. Menarik masuk `commerce.ts` akan menyebabkan modul runtime Node/Bun (seperti `node:crypto`, `PlatformStore`, SQLite) dimasukkan ke bundle pelayar dan merosakkan `bun run build`.

### Pilihan 3: Mengubah import dalam `tests/platform/refund-allocation-v24.test.ts` (DITOLAK)
- Mengubah import ujian ke `server/platform/commerce` melanggar hasrat reka bentuk asal di mana `PaymentRecord` sepatutnya menjadi kontrak awam platform yang dikongsi bersama.

---

## 5. Pelan Pelaksanaan Terperinci untuk Ejen Worker (Step-by-Step Implementation Guide)

Untuk dilaksanakan oleh implementer worker seterusnya:

### Langkah 1: Semak Fail `shared/platform-contracts.ts`
Pastikan `PaymentRecord` dieksport dengan bentuk kanonikal (telah wujud pada baris 13-22):
```typescript
export interface PaymentRecord {
  id: string;
  orderId: string;
  amountSen: number;
  method: 'cash' | 'bank';
  reference: string;
  state: 'confirmed' | 'refunded';
  confirmedBy: string;
  createdAt: string;
}
```

### Langkah 2: Kemas Kini `server/platform/commerce.ts`
1. Di baris 2 `server/platform/commerce.ts`, masukkan `PaymentRecord` ke dalam senarai import:
   ```typescript
   // SEBELUM:
   import type { CatalogueProduct, PublicProduct, InventoryMovement, InventoryReservation, OrderInput, OrderLine, OrderRecord, StockLot, PaymentState, FulfilmentStatus, VersionedQuote, EvidenceRecord, TrackedOrder } from '../../shared/platform-contracts';
   
   // SELEPAS:
   import type { CatalogueProduct, PublicProduct, InventoryMovement, InventoryReservation, OrderInput, OrderLine, OrderRecord, StockLot, PaymentState, FulfilmentStatus, VersionedQuote, EvidenceRecord, TrackedOrder, PaymentRecord } from '../../shared/platform-contracts';
   ```
2. Di baris 83 `server/platform/commerce.ts`:
   ```typescript
   // SEBELUM:
   export interface PaymentRecord { id:string; orderId:string; amountSen:number; method:'cash'|'bank'; reference:string; state:'confirmed'|'refunded'; confirmedBy:string; createdAt:string }
   
   // SELEPAS:
   export type { PaymentRecord };
   ```

### Langkah 3: Pengesahan & Ujian (Verification Commands)
Jalankan arahan berikut mengikut urutan:
1. `bun test tests/platform/refund-allocation-v24.test.ts` (mesti 9 pass / 0 fail)
2. `bun test tests/platform/payment-reconciliation-v24.test.ts` (mesti 8 pass / 0 fail)
3. `bun test tests/platform/financial-integrity-v24.test.ts tests/platform/hitl-execution-v24.test.ts tests/platform/growth-margin.test.ts` (mesti 23 pass / 0 fail)
4. `bun x tsc --noEmit -p tsconfig.platform.json` (mesti tamat dengan kod keluar 0 tanpa ralat TS2305)
5. `bun run lint` (mesti melepasi kompilasi penuh)
