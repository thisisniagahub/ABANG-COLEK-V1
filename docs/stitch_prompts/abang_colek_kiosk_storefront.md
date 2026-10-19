<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PROMPT PROTOTAIP — superseded sebagai arahan implementasi. Gunakan prompt pelaksanaan canonical di bawah. Angka, produk, badge VERIFIED, evidence ID dan confidence dalam contoh ialah ilustrasi reka bentuk sehingga disokong data canonical; jangan terbitkan sebagai fakta bisnes atau kejayaan JEV.
>
> Rujukan semasa: [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Stitch Screen Specification: Customer Express Kiosk & Direct Ordering Storefront
**File:** `abang_colek_kiosk_storefront.md`  
**Target:** Google Stitch AI UI/UX Engine (`https://stitch.withgoogle.com/`)  
**Design Philosophy:** Neo-Brutalist Street Food Hypebeast, Mobile-First Touch Ergonomics, High Conversion  
**Platform:** ABANGCOLEK (Liurleleh House Malaysia)

---

## High-Level Vision
A vibrant, appetizing, and ultra-fast mobile storefront and digital kiosk for "Abang Colek" — Malaysia's premier viral street-food brand specializing in fresh cut fruits (mangga muda, jambu batu, nenas, kedondong) drenched in authentic, thick, savory-spicy Colek sauce. Customers can customize fruit platters, adjust spiciness levels, bundle bottled sauces, view live cart subtotals in Malaysian Ringgit (RM), and checkout in 1-tap via DuitNow QR or WhatsApp.

---

## Visual Theme & Design Tokens
- **Theme Archetype:** Warm Neo-Brutalism with high-contrast street-food typography.
- **Color Palette:**
  - `Primary / Canvas Warmth`: Warm Cream `#FFFDF7` and Pure White `#FFFFFF`.
  - `Brand Accent / Colek Gold`: `#FFC107` (Deep golden mango yellow).
  - `Spicy Action / Sambal Red`: `#E53935` (Chili red for CTAs, spicy badges, and buy buttons).
  - `Typography & Outlines`: Midnight Black `#1A1A1A` with 2px solid brutalist borders and subtle drop shadows (`box-shadow: 4px 4px 0px #1A1A1A`).
  - `Freshness Indicator`: Chili Leaf Green `#4CAF50` for in-stock and freshness guarantees.
- **Typography:** Bold sans-serif headings (`font-extrabold tracking-tight`), playful street badges, clear tabular numerals for prices (`RM 12.00`).
- **Corner Radii:** 16px to 24px rounded corners (`rounded-2xl` / `rounded-3xl`) with tactile button depress animations.

---

## Screen Layout & Component Structure

### 1. Sticky Header
- **Brand Logo:** "ABANG COLEK" dripping brushstroke logo with blue mascot icon.
- **Location Selector:** Dropdown showing active pickup stall (e.g., "Gerai Utama Uptown Danau Kota", "Pasar Malam Seksyen 7", "Depot Kemaman").
- **Operating Status:** Glowing green badge "🔴 DIBUKA SEKARANG — STOK SEGAR".
- **Floating Cart Button:** Badge showing item count and real-time total (e.g., "🛒 2 Item · RM 28.00").

### 2. Hero Street Food Banner
- High-impact photography showcase of sliced crunchy green mangoes drenched in gleaming dark colek sauce topped with toasted sesame and bird's eye chilies.
- Badge: *"Kuah Pekat Melekat · Asli Resepi Pantai Timur"*.
- Quick Filter Pills: `Semua Menu`, `Set Kombo Buah`, `Botol Kuah Colek`, `Snek & Keropok Lekor`, `Edisi Terhad`.

### 3. Interactive Fruit Platter & Combo Builder (Card Grid)
Each menu item card features:
- High-res crisp photo with rounded container.
- Product Title (e.g., "Set Platter Mangga Siam + Jambu Rangup").
- Portion description: "500g Buah Potong Segar + 100ml Kuah Colek Asli".
- **Spiciness Level Selector (3-Tiers):**
  - Level 1: `Pedas Manis` (Mild & Fruity)
  - Level 2: `Pedas Padu` (Standard Hot)
  - Level 3: `Berapi Liur Leleh` (Extra Spicy with cili padi potong)
- Price display: Prominent bold `RM 14.00`.
- Quantity incrementor `[-] 1 [+]` and high-contrast "Tambah ke Troli" button in `#E53935` Sambal Red.

### 4. Bottled Sauce Retail Showcase ("Bawa Balik Rumah")
- Bottle items:
  - `Botol Khas Kuah Colek Asli (350ml)` — RM 12.00
  - `Botol Khas Kuah Colek Extra Pedas (350ml)` — RM 13.00
  - `Pek Kombo 3 Botol Jimat Family Pack` — RM 32.00
- Leak-Proof Seal Security Badge: *"Penutup Botol Berkedap Induksi (Anti-Bocor)"*.

### 5. Slide-Over Cart Drawer & Instant Checkout Modal
- Order Summary List with customized spiciness badges.
- Delivery / Pickup Method:
  - `[x] Ambil di Gerai (Self-Pickup)`
  - `[ ] Penghantaran Pantas (GrabExpress / Lalamove)`
- Instant Payment Options:
  - **DuitNow QR**: High-resolution generated QR code with 1-tap download receipt.
  - **Pesan Terus WhatsApp**: Pre-formats full itemized order text directly to Abang Colek order dispatch hotline (+6011-XXXXXXX).

---

## Exact Stitch Prompt (Copy-Paste Ready)
```text
Design a vibrant, high-conversion mobile digital ordering kiosk and storefront for "Abang Colek", a beloved Malaysian street-food brand famous for fresh fruit platters and homemade sweet-savory colek sauces.

Use a modern Neo-Brutalist street aesthetic:
- Background: Warm Cream (#FFFDF7) with crisp White surface cards (#FFFFFF).
- Accents: Deep Mango Gold (#FFC107) and Vibrant Sambal Red (#E53935).
- Borders: Crisp Midnight Black (#1A1A1A) 2px borders with subtle brutalist drop-shadows (4px 4px 0px #1A1A1A).
- Typography: Punchy, bold sans-serif with high contrast and street-food enthusiasm.

Include:
1. A sticky top bar with the Abang Colek logo, active stall selector ("Uptown Danau Kota / Kemaman"), and floating cart badge with real-time RM total.
2. A hero promo banner with glowing tagline "Kuah Pekat Melekat · Resepi Asli Pantai Timur".
3. A menu filter bar: "Semua", "Set Buah Potong", "Botol Kuah Colek", "Kombo Famili".
4. Product cards displaying:
   - High-quality food photo placeholder.
   - Title, portion weight (e.g., 500g Buah + 100ml Kuah).
   - An interactive 3-tier spiciness pill selector: "Pedas Manis", "Pedas Padu", "Berapi Liur Leleh".
   - Price tag in Malaysian Ringgit (e.g. RM 14.00) with a bold Sambal Red "+ Tambah" button.
5. A featured retail section for bottled sauces (350ml / 500ml) highlighting anti-leak induction seals.
6. A responsive slide-over cart sheet showing order items, subtotal, DuitNow QR code scanner box, and a prominent green "Hantar Pesanan ke WhatsApp" button.
```
