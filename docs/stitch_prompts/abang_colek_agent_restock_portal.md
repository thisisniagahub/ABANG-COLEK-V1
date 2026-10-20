
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PROMPT PROTOTAIP — superseded sebagai arahan implementasi. Gunakan prompt pelaksanaan canonical di bawah. Angka, produk, badge VERIFIED, evidence ID dan confidence dalam contoh ialah ilustrasi reka bentuk sehingga disokong data canonical; jangan terbitkan sebagai fakta bisnes atau kejayaan JEV.
>
> Rujukan semasa: [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Stitch Screen Specification: Stockist & Agent Wholesale Restock Portal
**File:** `abang_colek_agent_restock_portal.md`  
**Target:** Google Stitch AI UI/UX Engine (`https://stitch.withgoogle.com/`)  
**Design Philosophy:** Clean B2B Portal, Wholesale Tier Calculations, Malaysian Logistics  
**Platform:** ABANGCOLEK (Liurleleh House Malaysia)

---

## High-Level Vision
A dedicated B2B wholesale ordering portal for verified Abang Colek stokis and agents across Malaysia. Enables authorized agents to check their wholesale price tier, view MOQ (Minimum Order Quantity) carton discounts, place restock orders for bottled sauces and keropok bundles, book express bus consignment pickup, and track tier commissions and monthly revenue leaderboards.

---

## Visual Theme & Design Tokens
- **Theme Archetype:** Premium B2B Commerce with street-food gold flair.
- **Color Palette:**
  - `Canvas Background`: Clean Pearl White `#F8F9FA` with Warm Cream accents `#FFF8E1`.
  - `Card Background`: Pure White `#FFFFFF` with soft borders `#E2E8F0`.
  - `Primary Action`: Colek Royal Gold `#D97706` / `#FFC107` and Deep Charcoal `#1E293B`.
  - `Tier Badges`: Master Stokis (Purple `#7C3AED`), Stokis Emas (Amber `#F59E0B`), Ejen Sah (Blue `#2563EB`).
- **Typography:** DM Sans / Outfit for crisp numerals and readable tables.

---

## Screen Layout & Component Structure

### 1. Agent Profile & Tier Status Banner
- Agent Name: `Kak Salmah (Stokis Kawasan Gombak & Danau Kota)`.
- Tier Level: `⭐ STOKIS EMAS` (Margin Keuntungan: 35%).
- Restock Quota Bulan Ini: `420 / 500 Botol` (84% ke Master Stokis).
- Accumulated Commission: `RM 2,840.50` (Tersedia untuk pengeluaran).

### 2. Wholesale Restock Catalog (Pakej Kotak / Karton)
- **Karton A: Kuah Colek Asli 350ml (24 Botol / Kotak)**
  - Harga Runcit: RM 288.00 | Harga Ejen Emas: `RM 187.20` (RM 7.80/botol).
  - Keuntungan Bersih Ejen: `RM 100.80` / kotak.
  - Kuota minimum: 2 Kotak.
- **Karton B: Kuah Colek Extra Pedas 350ml (24 Botol / Kotak)**
  - Harga Runcit: RM 312.00 | Harga Ejen Emas: `RM 202.80` (RM 8.45/botol).
  - Keuntungan Bersih: `RM 109.20` / kotak.
- **Pakej Starter Gerai Krew (10 Kotak + Banner Percuma + 10x Apron Abang Colek)**
  - Pakej Lengkap Buka Gerai: `RM 1,750.00`.

### 3. Freight & Dispatch Selector (Malaysian Express Bus Consignment)
- Pilihan Pengangkutan:
  - `[x] Kargo Bas Ekspres (Perdana / Sani Express / Adik Beradik)` — Jimat & Sampai Hari Sama!
    - Stesen Ambilan: *Terminal Bersepadu Selatan (TBS), Kaunter Kargo No. 4*.
    - Kos Kargo: *RM 15.00 / kotak* (Kargo terus dari Kemaman).
  - `[ ] Kurier Standard (J&T Cargo / Line Clear Express)` — 2-3 hari bekerja.

### 4. Interactive Bulk Order Matrix & Invoice Preview
- Real-time calculator showing total cartons, total bottles, freight fee, wholesale discount, and Net Payable in RM.
- 1-Tap Action: "Sahkan Pesanan & Jana Invois Rasmi".
- Payment via FPX Instant Banking atau Kredit Ejen DuitNow.

---

## Exact Stitch Prompt (Copy-Paste Ready)
```text
Design a clean, modern B2B Wholesale & Restock Portal for authorized agents and stockists of "Abang Colek" (Malaysian bottled sauce brand).

Style:
- Professional light theme: Pearl White (#F8F9FA) background, White (#FFFFFF) cards, soft slate borders (#E2E8F0), and rich Gold/Amber (#D97706) highlights.
- Clear, readable financial typography with Malaysian Ringgit (RM) pricing.

Include the following sections:
1. Agent Header: Display agent details, verified badge, tier pill ("Stokis Emas - 35% Margin"), and monthly quota progress bar (420/500 bottles).
2. Wholesale Carton Catalog: Product cards for wholesale master cartons (e.g., "24 Bottles Original 350ml" and "24 Bottles Extra Spicy 350ml"). Each card displays:
   - Retail Value vs Wholesale Cost.
   - Net Profit Margin per carton.
   - Quantity counter [-] [+] with instant subtotal updates.
3. Express Bus Logistics Selector: A delivery method box featuring popular Malaysian bus freight options (e.g., Sani Express, Adik Beradik to TBS Kuala Lumpur) with estimated same-day arrival times and cargo terminal pickup instructions.
4. Order Summary & Invoice Drawer: A sticky right-hand summary box detailing total boxes, unit counts, bus freight fee, and net total with a high-contrast button: "Sahkan Pesanan & Bayar FPX".
```
