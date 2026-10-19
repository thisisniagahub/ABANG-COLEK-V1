<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PROMPT PROTOTAIP — superseded sebagai arahan implementasi. Gunakan prompt pelaksanaan canonical di bawah. Angka, produk, badge VERIFIED, evidence ID dan confidence dalam contoh ialah ilustrasi reka bentuk sehingga disokong data canonical; jangan terbitkan sebagai fakta bisnes atau kejayaan JEV.
>
> Rujukan semasa: [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Stitch Screen Specification: Express Bus Freight & Consignment Logistics Tracker
**File:** `abang_colek_express_bus_cargo_tracker.md`  
**Target:** Google Stitch AI UI/UX Engine (`https://stitch.withgoogle.com/`)  
**Design Philosophy:** Route Map Logistics, East Coast Express Bus Transit, Driver Dispatch  
**Platform:** ABANGCOLEK (Liurleleh House Malaysia)

---

## High-Level Vision
A specialized logistics and live tracking screen for Abang Colek's core regional distribution channel: intercity Express Bus cargo shipments (e.g., Sani Express, Perdana Express, Adik Beradik, Transnasional). Tracks bottled colek cartons travelling between central coastal kitchens (Kemaman / Kota Bharu) and urban terminal distribution depots (Terminal Bersepadu Selatan / TBS KL, Larkin Sentral JB, Penang Sentral).

---

## Visual Theme & Design Tokens
- **Theme Archetype:** Transportation & Fleet Telemetry.
- **Color Palette:**
  - `Canvas Background`: Clean Light Slate `#F1F5F9`.
  - `Bus Company Branding`: Sani Red `#DC2626`, Perdana Blue `#1D4ED8`, Adik Beradik Green `#059669`.
  - `Status Highlights`: In-Transit Yellow `#F59E0B`, Arrived / Ready for Pickup `#10B981`.
- **Typography:** Bold sans-serif, bus ticket style typography with perforated separator lines.

---

## Screen Layout & Component Structure

### 1. Active Consignment Overview (Tabbed by Corridor)
- **Koridor Pantai Timur ➔ Lembah Klang (TBS):** 6 Kotak Aktif.
- **Koridor Pantai Timur ➔ Johor Bahru (Larkin):** 4 Kotak Aktif.
- **Koridor Pantai Timur ➔ Utara (Penang Sentral):** 2 Kotak Aktif.

### 2. Live Express Bus Consignment Cards (Ticket Style)
Each consignment card mimics an authentic bus cargo bill of lading:
- **Bus Company & Plate:** `Sani Express (No. Plat: VDV 4488)`.
- **Bus Ticket / Waybill No:** `#SN-KMM-TBS-8921`.
- **Route:** `Depot Kemaman (10:00 AM) ➔ Platform Kargo TBS KL (ETA: 3:30 PM)`.
- **Cargo Contents:** `8 Kotak (192 Botol Kuah Colek Asli 350ml)`.
- **Consignee / Penerima:** `Kak Salmah (012-345XXXX) — Stokis Gombak`.
- **Status Indicator:**
  - `● DALAM PERJALANAN (Lebuhraya Pantai Timur LPT2 KM140)` — ETA: 1 Jam 15 Minit.
- **Direct Dispatch Actions:**
  - `[Hubungi Pemandu Bas]`: 1-tap call button.
  - `[Hantar Resit Ambilan WhatsApp]`: Direct WhatsApp dispatch to stockist with cargo pickup PIN.

### 3. Depot Pickup Instructions & QR Handover
- Unique 4-digit pickup code or barcode for terminal counter verification.
- Storage notes: "Simpan dalam suhu bilik, jauhkan dari pancaran matahari langsung."

---

## Exact Stitch Prompt (Copy-Paste Ready)
```text
Design a transportation logistics and tracking screen for "Abang Colek Express Bus Consignment", a sauce distribution network using intercity express buses in Malaysia.

Style:
- Clean modern fleet tracking: Light Slate (#F1F5F9) background with crisp ticket-style white cards (#FFFFFF).
- High contrast status colors: In-Transit Amber (#F59E0B), Arrived Emerald (#10B981), and Bus Brand Badges (Red, Blue, Green).
- Perforated ticket styling with clear barcodes and terminal depot tags.

Include:
1. Fleet Header: Summary of active cartons in transit across 3 corridors (East Coast to KL, Johor Bahru, and Penang).
2. Bus Cargo Ticket Cards featuring:
   - Express bus operator badge (e.g. "Sani Express", "Adik Beradik", "Perdana").
   - Bus registration plate number and consignment waybill ID.
   - Origin depot (Kemaman/Kota Bharu) and destination terminal (TBS Kuala Lumpur / Larkin Sentral).
   - Cargo details (e.g. "8 Cartons - 192 Bottles Colek Sauce").
   - Live transit progress bar with highway checkpoint ("Passing LPT2 Karak") and ETA countdown.
   - Assigned recipient stockist with masked phone number.
   - Quick Action buttons: "Hubungi Pemandu" (Call driver) and "Hantar Notis WhatsApp" (Notify recipient).
3. Terminal Depot Pickup Modal showing the pickup QR code, counter number, and warehouse receipt checklist.
```
