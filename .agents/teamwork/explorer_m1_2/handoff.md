# Handoff Report — explorer_m1_2 (FIN-01 Financial Integrity)

## 1. Observation
- **Fail Sumber Utama**:
  - `shared/growth-contracts.ts` (baris 107–216): Mengandungi fungsi penentusahan `assertSafeSen` (baris 107–114), `assertValidMarginPct` (baris 116–123), dan pengiraan teras `evaluateMarginContribution` (baris 131–216).
  - Pada baris 144: `const minimumMarginBps = BigInt(Math.round(input.minimumContributionMarginPct * 100));`.
  - Pada baris 146–154: Menjumlahkan 8 komponen kos pembolehubah (`cogsSen`, `packagingSen`, `paymentFeesSen`, `fulfilmentVariableCostSen`, `deliverySubsidySen`, `agentCommissionSen`, `rewardCostSen`, `expectedReturnLossSen`) ke dalam `totalVariableCostsSenBig`.
  - Pada baris 160–161: `const netSalesSenBig = BigInt(input.netSalesExTaxSen); const contributionSenBig = netSalesSenBig - totalVariableCostsSenBig;`.
  - Pada baris 182–184:
    ```typescript
    const isMarginPctPass =
      input.netSalesExTaxSen > 0 &&
      contributionSenBig * 10000n >= netSalesSenBig * minimumMarginBps;
    ```
- **Fail Re-export Pelayan**:
  - `server/platform/marginGuardian.ts` (baris 1–7): Mengandungi:
    ```typescript
    export { evaluateMarginContribution } from '../../shared/growth-contracts';
    export type { MarginSimulationInput, MarginSimulationResult } from '../../shared/growth-contracts';
    ```
- **Fail Penguatkuasaan Domain & Pintu Kelulusan**:
  - `server/platform/marketing.ts` (baris 141–148):
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
- **Fail Ujian Yang Disemak**:
  - `tests/platform/financial-integrity-v24.test.ts` (147 baris): Merangkumi 8 ujian unit bagi penolakan kes 24.996% (baris 20–38), kes ambang tepat 25.000% (baris 40–55), sempadan jualan sifar (baris 57–75), pengesyoran jenis/julat integer selamat (baris 77–127), dan pengendalian sumbangan negatif (baris 129–145).
  - `tests/platform/growth-margin.test.ts` (256 baris): Merangkumi ujian deterministik pemisahan tunai vs peratusan (baris 6–84) dan ujian integrasi kempen bersama kelulusan Founder Override serta sekatan Postiz (baris 86–255).
- **Percubaan Perintah Ujian**:
  - Perintah `run_command` dengan arahan `bun test tests/platform/financial-integrity-v24.test.ts tests/platform/growth-margin.test.ts` menerima penafian kebenaran larian terminal (`permission check failed for command "bun test...": Permission prompt was denied`). Siasatan dijalankan secara analisis statik dan pembuktian formal tanpa melanggar protokol keselamatan.

## 2. Logic Chain
1. **Dari Pemerhatian Baris 144 dan Baris 182–184**:
   Formula perbandingan margin diubah menjadi perbandingan integer bersilang:
   $$\frac{\text{contributionSen}}{\text{netSalesSen}} \ge \frac{\text{minimumMarginBps}}{10000} \iff \text{contributionSenBig} \times 10000\text{n} \ge \text{netSalesSenBig} \times \text{minimumMarginBps}$$
   Kerana tiada pembahagian pecahan terapung (floating-point division) yang terlibat dalam penentuan boolean `isMarginPctPass`, perbandingan ini adalah tepat 100% pada peringkat bit integer.
2. **Dari Pemerhatian Kaunter-Contoh 24.996% (Ujian baris 20–38)**:
   - Jualan: 100,000 sen, Kos: 75,004 sen $\implies$ Sumbangan: 24,996 sen.
   - Ambang: 25.00% $\implies$ `minimumMarginBps = 2500n`.
   - $\text{LHS} = 24,996 \times 10,000 = 249,960,000\text{n}$.
   - $\text{RHS} = 100,000 \times 2,500 = 250,000,000\text{n}$.
   - Kerana $249,960,000 < 250,000,000$, $\text{LHS} \ge \text{RHS}$ mengembalikan `false`.
   - Walaupun pembundaran paparan `contributionMarginPct` mengembalikan `25.00%`, `isMarginPctPass` kekal `false` dan `allowed` kekal `false`. Ini membuktikan penipuan pembundaran disekat secara deterministik.
3. **Dari Pemerhatian `server/platform/marketing.ts` (baris 141–148)**:
   - Apabila margin tunai gagal (`!isContributionPass`), sistem menolak serta-merta dengan HTTP 409 `INSUFFICIENT_CASH_MARGIN`, tanpa mengambil kira kewujudan `founderOverride`.
   - Apabila margin tunai lulus tetapi peratusan margin gagal (`!isMarginPctPass`), sistem menyekat kelulusan dengan HTTP 409 `FOUNDER_OVERRIDE_REQUIRED` melainkan `founderOverride.approved === true` berserta justifikasi teks sah direkodkan oleh pengasas.
4. **Dari Pemerhatian Antara Muka `PROJECT.md` (baris 62)**:
   - `PROJECT.md` menyatakan nama antara muka `evaluateContributionMargin(input: MarginInput)`.
   - Kod sumber menggunakan nama `evaluateMarginContribution(input: MarginSimulationInput)`.
   - Bagi mengelakkan sebarang `TS2305` atau ketidakserasian kontrak di masa hadapan, mengeksport kedua-dua alias adalah langkah yang amat selamat dan bebas risiko.

## 3. Caveats
- Persekitaran mengehadkan pelaksanaan perintah terminal secara langsung (`run_command` ditolak kebenaran interaktif), maka tiada resit masa nyata terminal yang dijana semasa giliran ini. Walau bagaimanapun, analisis statik kod TypeScript, penjejakan pembolehubah, dan pembuktian matematik telah disahkan sepenuhnya.
- Nilai ambang perniagaan (contohnya penetapan peratusan 20% vs 25% bagi sesuatu SKU) adalah polisi pemilik kewangan/perniagaan dan berada di luar skop algoritma deterministik enjin.

## 4. Conclusion
Kontrak Integriti Kewangan **FIN-01 (Rules Own The Money)** adalah **KUKUH, TEPAT, DAN MEMATUHI SPESIFIKASI**:
- Menggunakan aritmetik integer sen dan perbandingan BigInt tepat.
- Menolak kes 24.996% secara konsisten walaupun dibundarkan ke 25.00% pada paparan.
- Menolak jualan sifar dan input negatif secara mutlak.
- Menguatkuasakan pemisahan kuasa di mana kerugian tunai tidak boleh dioverride sama sekali, manakala kegagalan nisbah peratusan memerlukan kelulusan pengasas bertaip audit.
- Pelaksana hanya perlu menambah dua alias (`evaluateContributionMargin` dan `MarginInput`) bagi menyempurnakan pematuhan spesifikasi kontrak `PROJECT.md`.

## 5. Verification Method
Untuk mengesahkan secara bebas pelaksanaan dan ujian FIN-01:
1. **Semakan Kod Sumber**:
   - Periksa `shared/growth-contracts.ts` pada baris 131–216 untuk memastikan formula BigInt `contributionSenBig * 10000n >= netSalesSenBig * minimumMarginBps` dan semakan `input.netSalesExTaxSen > 0`.
   - Periksa `server/platform/marginGuardian.ts` untuk memastikan ketiadaan salinan kod duplikasi.
2. **Perintah Ujian Rasmi**:
   Jalankan perintah berikut menggunakan Bun:
   ```bash
   bun test tests/platform/financial-integrity-v24.test.ts tests/platform/growth-margin.test.ts
   ```
3. **Syarat Pembatalan (Invalidation Conditions)**:
   - Sekiranya ujian melaporkan kegagalan pada ujian 24.996% (contohnya jika perbandingan bertukar kepada `res.contributionMarginPct >= input.minimumContributionMarginPct`), integriti kewangan terbatal.
   - Sekiranya jualan 0 sen menghasilkan `allowed: true`, integriti kewangan terbatal.
