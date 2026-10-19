<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PROMPT PROTOTAIP — superseded sebagai arahan implementasi. Gunakan prompt pelaksanaan canonical di bawah. Angka, produk, badge VERIFIED, evidence ID dan confidence dalam contoh ialah ilustrasi reka bentuk sehingga disokong data canonical; jangan terbitkan sebagai fakta bisnes atau kejayaan JEV.
>
> Rujukan semasa: [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Stitch Screen Specification: Sovereign Command Hub (Founder / HQ Executive Dashboard)
**File:** `abang_colek_sovereign_command_hub.md`  
**Target:** Google Stitch AI UI/UX Engine (`https://stitch.withgoogle.com/`)  
**Design Philosophy:** Dark-Mode Industrial Cyber-Operations / Bento-Box High Density  
**Platform:** ABANGCOLEK (Liurleleh House Malaysia)

---

## High-Level Vision
An executive mission control dashboard designed for the Abang Colek business owner and HQ operations leads. Unites live retail telemetry across pop-up stalls, central kitchen production metrics (Kemaman & Kota Bharu cauldrons), express bus freight transit status, inventory stockpile levels, and real-time JEV epistemological complaint triage (especially packaging defect rates).

---

## Visual Theme & Design Tokens
- **Theme Archetype:** Dark Bento-Box Industrial Dashboard.
- **Color Palette:**
  - `Background Canvas`: Deep Obsidian Charcoal `#121214`.
  - `Surface Cards`: Slate Zinc `#1C1C20` with 1px border `#2D2D35`.
  - `Brand Accent`: Colek Amber `#FFC107`.
  - `Critical Alert / Triage`: Chili Crimson `#E53935` and Safety Orange `#FF9800`.
  - `Positive Telemetry`: Emerald Metric Green `#10B981`.
- **Typography:** Inter / JetBrains Mono for numerals and timestamps.
- **Data Density:** High information density, compact telemetry badges, sparklines.

---

## Screen Layout & Component Structure

### 1. Top Executive KPI Bar (4-Column Bento Row)
- **Today's Gross Sales (GMV):** `RM 18,450.00` (+14.2% vs yesterday) with mini bar chart.
- **Active Kitchen Output (Bottles):** `1,840 / 2,500 botol` (73.6% daily quota reached).
- **Consignments in Transit:** `12 Kotak Bas Ekspres` (5 aktif di lebuh raya LPT/Plus).
- **JEV Defect Alarm Rate:** `0.8%` (3 aduan penutup botol longgar dalam triage).

### 2. Live Central Kitchen Batch Telemetry (Cauldron Monitor)
- Kitchen 1: `Dapur Utama Kemaman (Kuali A - 500L Kuah Colek Asli)` — Status: *Mendidih (Simmering 85°C)*.
- Kitchen 2: `Dapur Cawangan Kota Bharu (Kuali B - 300L Colek Berapi)` — Status: *Penyejukan & Pembotolan*.
- Batch Code: `#BATCH-20261007-KM1`, QC Officer: *En. Razak (QC PASS)*.

### 3. JEV System-1 Epistemological Complaint & Defect Radar
- Interactive table categorizing incoming customer and stockist complaints with raw epistemological badges:
  - Incident 1: `Aduan #REV-902` — *Botol Meleleh semasa transit Bas Ekspres ke Larkin*. Classification: `LEAKAGE_SEAL_FAILURE`, Certainty: `VERIFIED (0.94)`, Action: *Auto-gantian botol baharu dihantar*.
  - Incident 2: `Aduan #REV-908` — *Rasa kurang masam*. Classification: `TASTE_VARIANCE`, Certainty: `PARTIAL (0.61)`, Action: *Kaji semula nombor lot kicap*.
  - Invariant Status: Zero invented conclusions, strict provenance tracking.

### 4. Express Bus Freight Corridor Tracker (Live Route Map)
- Visual East Coast ➔ Klang Valley corridor:
  - Route A: `Kemaman (Depot) ➔ TBS Kuala Lumpur` (Bas Sani Express / Adik Beradik).
  - Route B: `Kota Bharu (MBKT) ➔ Larkin Sentral Johor Bahru`.
  - Progress bar showing estimated time of arrival (ETA) and driver phone dispatch link.

---

## Exact Stitch Prompt (Copy-Paste Ready)
```text
Design a dark-mode Bento-Box Executive Command Hub for the founder and operations director of "Abang Colek", a large-scale Malaysian street food & bottled sauce franchise.

Design style:
- Background: Deep Obsidian Charcoal (#121214) with Slate Zinc (#1C1C20) cards and subtle 1px border (#2D2D35).
- Accent Colors: Vibrant Colek Gold (#FFC107) for highlights, Emerald Green (#10B981) for positive metrics, and Crimson Chili Red (#E53935) for alerts.
- Typography: Clean modern tech-industrial sans-serif with monospace counters.

Include the following sections in a responsive grid:
1. Top KPI Row: Today's GMV (RM 18,450.00), Bottles Produced Today (1,840 bottles), Active Freight Consignments (12 Express Bus shipments), and Defect Incident Rate (0.8%).
2. Central Kitchen Cooking & Bottling Monitor: Two live cauldron batch status cards with batch IDs, temperature indicators, and QC approval seals.
3. JEV AI Incident & Quality Triage Feed: A high-density audit log showing incoming feedback, automated issue classification (e.g., "SEAL_LEAKAGE" or "TASTE_CONSISTENCY"), confidence scores, and action triggers.
4. Logistics & Bus Consignment Tracker: A visual timeline representing express bus deliveries travelling from Kemaman/Kota Bharu to Klang Valley and Southern depots with real-time ETA tags.
5. Quick Action Palette: Buttons for "Luluskan Pesanan Bas", "Henti Batch Kuali", and "Muat Turun Laporan Kewangan".
```
