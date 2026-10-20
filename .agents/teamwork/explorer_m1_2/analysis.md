# Analisis Integriti Kewangan (FIN-01 Rules Own The Money)

**Tarikh**: 2026-10-20  
**Penyiasat**: explorer_m1_2 (`teamwork_preview_explorer`)  
**Skop**: Audit dan pengesahan kontrak Integriti Kewangan FIN-01, BigInt sen exact arithmetic, penolakan penipuan pembundaran 24.996%, serta pengesahan suite ujian domain.

---

## 1. Ringkasan Eksekutif

Audit ini mengesahkan bahawa pelaksanaan algoritma **Margin Guardian (FIN-01)** dalam `shared/growth-contracts.ts` dan re-export kanonikal dalam `server/platform/marginGuardian.ts` mematuhi prinsip **Rules Own The Money** secara matematik dan logikal:
1. **Aritmetik BigInt Tepat**: Menggunakan perbandingan integer bersilang `contributionSenBig * 10000n >= netSalesSenBig * minimumMarginBps` tanpa pembahagian dan tanpa perbandingan terapung (floating-point).
2. **Penolakan Penipuan Pembundaran 24.996%**: Kes jualan 100,000 sen (RM 1,000) dan kos 75,004 sen (RM 750.04) menghasilkan sumbangan 24,996 sen (24.996%). Walaupun paparan UI membundarkan kepada `25.00%`, enjin secara tepat menolak kelulusan (`allowed: false`, `reasonCode: 'INSUFFICIENT_PERCENT_MARGIN'`).
3. **Hierarki Penolakan Tunai Mutlak**: Jika margin tunai gagal (`contributionSenBig < minimumContributionSen`), ia menghasilkan kod `INSUFFICIENT_CASH_MARGIN` dan **disekat sepenuhnya daripada sebarang kelulusan, termasuk Founder Override**.
4. **Pintu Kelulusan Pengasas Berpaksikan Audit**: Kegagalan peratusan margin (`INSUFFICIENT_PERCENT_MARGIN`) memerlukan kelulusan `founderOverride` dengan justifikasi bertaip teks yang direkodkan ke lejar audit.
5. **Perlindungan Sempadan Jualan <= 0**: Jualan bersih 0 sen disekat secara mutlak daripada memperoleh kelayakan nisbah margin.

---

## 2. Pemerhatian Terperinci & Bukti Kod Sumber

### 2.1 Struktur Kod & Lokasi Pelaksanaan
- **`shared/growth-contracts.ts`** (Baris 84–216):
  - Membina jenis data `MarginSimulationInput` dan `MarginSimulationResult`.
  - Fungsi penentusahan input `assertSafeSen` (baris 107–114) memastikan integer selamat, bukan NaN, bukan infiniti, dan menolak nilai negatif untuk jualan dan kos.
  - Fungsi `assertValidMarginPct` (baris 116–123) memastikan peratusan margin sah antara 0 hingga 100.
  - Penukaran peratusan ke basis points:
    ```typescript
    const minimumMarginBps = BigInt(Math.round(input.minimumContributionMarginPct * 100));
    ```
  - Penjumlahan 8 komponen kos pembolehubah dengan perlindungan limpahan `Number.MAX_SAFE_INTEGER` (baris 146–158).
  - Perbandingan integer BigInt tanpa pembundaran paparan:
    ```typescript
    const isMarginPctPass =
      input.netSalesExTaxSen > 0 &&
      contributionSenBig * 10000n >= netSalesSenBig * minimumMarginBps;
    ```
- **`server/platform/marginGuardian.ts`** (Baris 1–7):
  - Re-export kanonikal daripada `../../shared/growth-contracts`.
  - Mengelakkan penduaan kod (zero divergence), memastikan kod klien dan pelayan menggunakan formula matematik yang tepat sama.
- **`server/platform/marketing.ts`** (Baris 141–148):
  - Menguatkuasakan pintu integriti dalam aliran kerja kempen pemasaran:
    ```typescript
    if (record.marginResult) {
      if (!record.marginResult.isContributionPass) {
        fail('INSUFFICIENT_CASH_MARGIN', 409, 'Kelulusan disekat: Sumbangan margin tunai gagal.');
      }
      if (!record.marginResult.isMarginPctPass && !founderOverride?.approved) {
        fail('FOUNDER_OVERRIDE_REQUIRED', 409, 'Kelulusan disekat (FIN-01): Peratusan margin gagal, memerlukan kelulusan pengecualian Founder Override.');
      }
    }
    ```

---

## 3. Pembuktian Matematik & Analisis Sempadan

### 3.1 Kes Kaunter-Contoh 24.996%
| Parameter | Nilai Input | Nilai Sen / BigInt |
|---|---|---|
| `netSalesExTaxSen` | RM 1,000.00 | `100_000n` |
| `cogsSen` | RM 750.04 | `75_004n` |
| Kos-kos lain | RM 0.00 | `0n` |
| `minimumContributionSen` | RM 0.00 | `0n` |
| `minimumContributionMarginPct` | 25.00% | `25` (`minimumMarginBps = 2500n`) |

**Pengiraan**:
1. $\text{contributionSenBig} = 100,000\text{n} - 75,004\text{n} = 24,996\text{n}$
2. $\text{rawMarginPct} = \frac{24996}{100000} \times 100 = 24.996\%$
3. $\text{contributionMarginPct (paparan)} = \text{round}(24.996 \times 100) / 100 = 25.00\%$
4. **Perbandingan Tepat**:
   $$\text{LHS} = 24,996 \times 10,000 = 249,960,000\text{n}$$
   $$\text{RHS} = 100,000 \times 2,500 = 250,000,000\text{n}$$
   $$\text{LHS} \ge \text{RHS} \implies 249,960,000 \ge 250,000,000 \implies \mathbf{PALSU}$$
5. **Keputusan**:
   - `isContributionPass`: `true` ($24,996 \ge 0$)
   - `isMarginPctPass`: `false`
   - `allowed`: `false`
   - `reasonCode`: `'INSUFFICIENT_PERCENT_MARGIN'`

### 3.2 Kes Ambang Tepat 25.000%
- Jualan: 100,000 sen, Kos: 75,000 sen $\implies$ Sumbangan: 25,000 sen.
- $\text{LHS} = 25,000 \times 10,000 = 250,000,000\text{n}$.
- $\text{RHS} = 100,000 \times 2,500 = 250,000,000\text{n}$.
- $\text{LHS} \ge \text{RHS} \implies \mathbf{BENAR}$.
- Keputusan: `allowed: true`, `reasonCode: 'PASS'`.

### 3.3 Kes Jualan Bersih Sifar (`netSalesExTaxSen = 0`)
- Jika jualan = 0 sen dan peratusan minimum = 0%:
  - Syarat `input.netSalesExTaxSen > 0` menghalang formula nisbah daripada dinilai secara palsu sebagai lulus ($0 \ge 0$).
  - Keputusan: `isMarginPctPass = false`, `allowed = false`, `reasonCode = 'INSUFFICIENT_PERCENT_MARGIN'`.

---

## 4. Penilaian Suite Ujian Sedia Ada

### 4.1 `tests/platform/financial-integrity-v24.test.ts`
Suite ini menguji domain pengiraan peringkat unit secara khusus (8 ujian):
1. Menolak 24.996% walaupun pembundaran paparan menghasilkan 25.00%.
2. Meluluskan margin pada ambang tepat 25.000%.
3. Menolak jualan sifar (boundary net sales <= 0).
4. Menolak kos pembolehubah negatif (`RangeError`).
5. Menolak amaun sen perpuluhan/pecahan (`TypeError`).
6. Menolak nilai `NaN` dan `Infinity` (`TypeError`).
7. Menolak nilai peratusan margin dasar tidak sah (< 0, > 100, `NaN`).
8. Memastikan kegagalan tunai mengatasi kod kegagalan peratusan (`INSUFFICIENT_CASH_MARGIN`).

### 4.2 `tests/platform/growth-margin.test.ts`
Suite ini menguji pemisahan tunai vs peratusan dan kitaran hayat integrasi kempen (4 ujian utama):
1. Kelulusan apabila kedua-dua tunai dan peratusan melepasi ambang.
2. Penolakan kes tunai tinggi tetapi peratusan rendah (senario FIN-01).
3. Penolakan kes peratusan tinggi tetapi amaun tunai tidak menampung kos tetap.
4. Integrasi kempen: Pintu keselamatan menghalang kelulusan staf, menghalang kelulusan pengasas tanpa override, membenarkan kelulusan pengasas dengan override bertulis, dan menyekat kempen rugi tunai secara mutlak walaupun pengasas cuba override.
5. Ujian pintu keselamatan integrasi penerbitan automatik Postiz.

---

## 5. Jurang & Syor Strategi Pembaikan

Walaupun logik teras FIN-01 adalah kukuh, audit ini mengenal pasti beberapa penambahbaikan untuk menjamin integriti penuh:

### 5.1 Ketidakkonsistenan Nama Antara Muka (`PROJECT.md` vs Kod)
- **Pemerhatian**: Dalam `PROJECT.md` baris 62, spesifikasi antara muka ditulis sebagai:
  ```typescript
  evaluateContributionMargin(input: MarginInput): MarginSimulationResult
  ```
  Tetapi dalam kod sumber (`shared/growth-contracts.ts` dan `server/platform/marginGuardian.ts`), fungsi dinamakan `evaluateMarginContribution` dan jenis input adalah `MarginSimulationInput`.
- **Risiko**: Sekiranya modul baharu atau ujian luaran merujuk nama mengikut `PROJECT.md`, ralat kompilasi TypeScript TS2305 akan berlaku.
- **Syor**: Tambah alias rasmi dalam `shared/growth-contracts.ts` dan `server/platform/marginGuardian.ts`:
  ```typescript
  export const evaluateContributionMargin = evaluateMarginContribution;
  export type MarginInput = MarginSimulationInput;
  ```

### 5.2 Liputan Ujian Tambahan untuk Kes Limpahan & Pecahan Basis Points
- **Pemerhatian**: Baris 156 dan 164 dalam `shared/growth-contracts.ts` mengandungi perlindungan terhadap nilai melebihi `Number.MAX_SAFE_INTEGER`. Namun, belum ada ujian unit dalam `financial-integrity-v24.test.ts` yang mengesahkan cetusan `RangeError` bagi kes limpahan ini.
- **Syor**: Tambahkan kes ujian unit untuk:
  1. Limpahan `totalVariableCostsSenBig > BigInt(Number.MAX_SAFE_INTEGER)`.
  2. Input peratusan pecahan basis points (contohnya `minimumContributionMarginPct = 25.5` atau `24.99`).
  3. Kes kempen `minimumContributionSen` bernilai negatif (strategi *loss leader* yang sah jika dibenarkan polisi perniagaan).
  4. Pengesahan alias `evaluateContributionMargin` dan `MarginInput`.

---

## 6. Pelan Tindakan untuk Pelaksana (Worker)

1. **Langkah 1**: Buka `shared/growth-contracts.ts`, eksportkan alias:
   ```typescript
   export const evaluateContributionMargin = evaluateMarginContribution;
   export type MarginInput = MarginSimulationInput;
   ```
2. **Langkah 2**: Buka `server/platform/marginGuardian.ts`, pastikan kedua-dua alias turut di-re-export:
   ```typescript
   export { evaluateMarginContribution, evaluateContributionMargin } from '../../shared/growth-contracts';
   export type { MarginSimulationInput, MarginInput, MarginSimulationResult } from '../../shared/growth-contracts';
   ```
3. **Langkah 3**: Buka `tests/platform/financial-integrity-v24.test.ts`, tambahkan ujian untuk semakan limpahan `MAX_SAFE_INTEGER` dan pengesahan eksport alias `evaluateContributionMargin`.
4. **Langkah 4**: Jalankan pengesahan ujian menggunakan Bun:
   ```bash
   bun test tests/platform/financial-integrity-v24.test.ts tests/platform/growth-margin.test.ts
   ```
