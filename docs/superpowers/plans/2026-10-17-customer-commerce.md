<!-- COMMERCE-GROWTH-HISTORY-20261021:BEGIN -->
> **Konteks semasa 21 Oktober 2026:** badan bertarikh/mockup/proposal ini dikekalkan untuk provenance. Untuk pembangunan seterusnya, [Commerce & Growth](../../design/commerce-growth.md) dan [handover](../../prompts/COMMERCE-GROWTH-HANDOVER-20261021.md) memperincikan mandat public store setiap Agent/Stokis + private workspace, direct signup, server-bound store/referrer/fulfiller dan referral pelanggan satu peringkat dua hala. Contoh kadar, wallet, hierarki referral, empat role source atau arahan agent lama di bawah tidak meluluskan perubahan polisi/privilege atau menggantikan kontrak semasa. CG subcriteria memerlukan bukti di bawah ledger85; tiada status aplikasi dinaik taraf melalui nota sejarah ini.
<!-- COMMERCE-GROWTH-HISTORY-20261021:END -->


<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PELAN / PROMPT LAMA — superseded sebagai arahan execution oleh prompt pelaksanaan canonical di bawah. Checkbox, command, model, path runtime dan keputusan reka bentuk lama dikekalkan untuk provenance; jangan jalankan secara literal. Baseline, migrasi dan bukti semasa mesti ditentukan oleh blueprint dan prompt canonical.
>
> Rujukan semasa: [Master Growth Blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Customer Commerce MVP Implementation Plan

> **For agentic workers:** Pelan ini dilaksanakan secara native dalam sesi semasa kerana pengguna telah meminta “proceed”. Langkah menggunakan checkbox untuk menjejak kerja.

**Goal:** Lengkapkan storefront customer dengan troli berbilang produk dan aliran checkout yang menggunakan semula guided order flow serta validasi server sedia ada.

**Architecture:** `Shop` mengurus pilihan produk dan troli sementara di UI, lalu menghantar hanya product IDs dan kuantiti ke order flow. `FlowRenderer` memadankan troli dengan katalog terkini, menyediakan jawapan multi-line, dan terus menggunakan quote, submit, idempotency serta semakan stok backend sedia ada.

**Tech Stack:** React 19, TypeScript, Bun tests, React Router/AppRouter sedia ada, API platform dan CSS workspace/flow sedia ada.

**Spec:** Cadangan customer e-commerce yang diterima pengguna: katalog → troli → checkout dengan semakan harga/stok → pesanan; tiada SKU/harga rekaan dan tiada dakwaan pembayaran online.

**Mode:** Extension — kekalkan bahasa, warna, komponen dan route customer sedia ada; tambah cart/checkout tanpa redesign workspace lain.

## Global Constraints

- Kekalkan React/Vite + Bun + SQLite modular monolith; jangan tambah backend atau provider baru.
- Katalog awam hanya memaparkan produk published dan data harga/stok daripada API.
- Server kekal authoritative untuk harga, availability, ownership, payment dan status fulfilment.
- Jangan anggap bukti bayaran sebagai bayaran disahkan; tiada integrasi online payment dalam skop.
- Kekalkan bahasa/corak UI projek dan aksesibiliti asas: label, status, ralat, butang boleh dicapai.

## Review Focus

- Troli kosong atau katalog kosong: checkout tidak dibenarkan dan UI terangkan sebabnya.
- Kuantiti bukan integer, sifar/negatif atau bukan gandaan pack: ditolak sebelum quote, server masih memvalidasi.
- Produk hilang/retired, stok berubah atau katalog berubah: troli perlu disemak semula, bukan menghantar harga lama.
- Data troli URL rosak/terlalu besar: abaikan dengan selamat dan jangan rosakkan guided flow.
- Navigasi customer: receipt/order hanya muncul dalam rekod customer sendiri; payment tetap pending sehingga operator mengesahkan.

---

### Task 1: Cart model dan validasi client-side

**Files:**
- Create: `src/features/flows/customer-cart.ts`
- Test: `tests/platform/customer-cart.test.ts`

**Interfaces:**
- Produces `CustomerCartLine`, `encodeCustomerCart(lines)`, `decodeCustomerCart(raw)`, dan `validateCustomerCart(lines, products)`.
- Hadkan troli kepada maksimum 20 SKU unik; kuantiti mesti integer positif, tersedia dan gandaan `packSize`.

- [x] Uji encode/decode stabil untuk product IDs + kuantiti, input malformed, had bilangan SKU, pack multiple dan stok tidak cukup.
- [x] Ujian helper ditambah dan dijalankan; red-phase awal tidak dijalankan kerana test ditulis selepas implementasi.
- [x] Implement helper pure tanpa menyimpan harga daripada browser.
- [x] Jalankan ujian terarah sehingga lulus (4 tests, 12 expect calls).

### Task 2: Customer shop dengan troli

**Files:**
- Modify: `src/features/workspaces/commerce.tsx`
- Modify: `src/features/workspaces/workspaces.css`

**Interfaces:**
- `Shop({ onNavigate })` kekal signature sedia ada.
- Tambah butang tambah/ubah/buang kuantiti, ringkasan troli dan checkout yang membawa ID/kuantiti ke `/flows/order`.

- [x] Uji dengan semakan kod bahawa produk tanpa stok tidak boleh ditambah, jumlah menggunakan harga katalog semasa, dan troli kosong tidak boleh checkout.
- [x] Implement UI responsive serta aria-label/status untuk kawalan kuantiti dan mesej troli.

### Task 3: Multi-line order flow

**Files:**
- Modify: `src/features/flows/FlowRenderer.tsx`
- Modify: `src/features/flows/FlowForm.tsx`
- Modify: `src/features/flows/flows.css`
- Reuse existing: `src/features/flows/flow-answers.ts`
- Test: `tests/platform/customer-cart.test.ts`

**Interfaces:**
- Order flow menerima parameter `cart` yang didecode oleh cart helper; semua item dipadankan terhadap `/catalogue`.
- Jawapan `lines` mengandungi semua item pilihan serta `catalogueVersion` katalog semasa; guided server quote/review/submit tidak diubah.

- [x] Tambah ujian untuk cart checkout yang mengekalkan semua line dan reject data yang gagal validasi.
- [x] Implement paparan ringkasan multi-line dalam langkah produk dan form mode; kekalkan laluan legacy `?product=...` untuk direct buy.
- [x] Bersihkan cart parameter selepas receipt dan tolak cart rosak; asingkan session cart daripada draft order legacy.

### Task 4: Verifikasi

**Files:**
- Test: suite platform sedia ada dan type/build gates projek.

- [x] Jalankan `bun test ./tests/platform/customer-cart.test.ts` (4 pass, 0 fail, 12 expect calls).
- [x] Jalankan `bun run lint`.
- [x] Jalankan `bun run test:platform` (265 pass, 0 fail, 1617 expect calls).
- [x] Jalankan `bun run build` (Vite production bundle dan prerender lulus).
- [x] Laporkan tepat apa yang berjaya dan apa yang tidak dapat dijalankan.

**Implementation note:** Checkout troli tidak menggunakan draft offline lama; draft dikekalkan hanya untuk flow sedia ada supaya jawapan checkout terdahulu tidak bercampur dengan cart baru. Katalog/harga/stok/order masih authoritative di server.

---
