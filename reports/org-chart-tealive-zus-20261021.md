# Org Chart: Loob Holding (Tealive) & ZUS Coffee (Zuspresso)

Tarikh: 21 Okt 2026 · Sumber: deck korporat rasmi Tealive (Mac 2025), laman rasmi, LinkedIn, Tracxn, Wikipedia, Tatler.
**Nota**: struktur dalaman penuh tidak didedahkan awam — rajah menunjukkan lapisan yang disahkan sahaja; kotak [inferens] ialah susunan logik, bukan fakta.

---

## 1. Loob Holding Sdn Bhd (Tealive, Bask Bear, Soda Xpress, WonderBrew)

```mermaid
flowchart TD
    SH1["Pemegang Saham: Bryan Loo<br/>(pengasas)"] --> CO
    SH2["Pemegang Saham: Creador (PE)<br/>30% ekuiti, Jun 2021"] --> CO
    CO["Loob Holding Sdn Bhd<br/>(201001021759-905529-P)"] --> CEO

    CEO["CEO — Bryan Loo"] --> COO["Group COO — Loo Chee Leng<br/>operasi harian kumpulan"]
    CEO --> CCO["Chief Commercial Officer — MJ Ling<br/>ex-COO KFC Malaysia<br/>ops Tealive & Bask Bear MY + training + R&D"]
    CEO --> D1["Director, Strategy & Portfolio — Jeremy Tan"]
    CEO --> D2["Director, Special Projects &<br/>International Business — Bryan Yeow"]
    CEO --> FD["Finance Director — Juliet Choo<br/>(deck Mac 2025)"]

    CCO -.->|"[inferens] unit jenama"| B1["Tealive"]
    CCO -.-> B2["Bask Bear Coffee"]
    CO -.->|"[inferens] jenama lain kumpulan"| B3["Soda Xpress"]
    CO -.-> B4["WonderBrew Kombucha"]
```

Bukti: deck korporat "Tealive International Brand Deck" Mac 2025 (senior leadership team eksplisit); loob.com.my/our-executive-team; Crunchbase (nota: Crunchbase senaraikan Mei Ling Toh sebagai CFO — bercanggah dengan deck Mac 2025 (Juliet Choo, Finance Director); kemungkinan perubahan penggabungan/era berbeza — **tidak disahkan**).

## 2. Zuspresso (M) Sdn Bhd (ZUS Coffee)

```mermaid
flowchart TD
    SH1["Pengasas: Ian Chua, Venon Tian,<br/>Terence Ho, Lim Zhi How dkk."] --> CO
    SH2["Pelabur: KWAP, KV Asia Capital<br/>RM250 juta, Sept 2024"] --> CO
    CO["Zuspresso (M) Sdn Bhd<br/>didaftar 2019, KL"] --> CEO

    CEO["Group CEO — Venon Tian<br/>(dari Ogos 2026; sebelum itu Group COO<br/>sejak Dis 2020)"] --> CEO2["CEO — Ian Chua<br/>(pengasas, disebut sebagai CEO<br/>dalam temubual Apr 2026)"]

    CEO --> CFO["CFO — Chong Han Keong<br/>(Tracxn)"]
    CEO --> CDO["Chief Design Officer — Ting Yan Yeo<br/>(Tracxn)"]
    CEO -.->|"[inferens] fungsi tech-driven:<br/>app-first, inovasi produk"| F1["Tech / Produk / Data"]
    CEO -.->|"[inferens] operasi serantau<br/>~1,000+ outlet, 6 negara,<br/>~6,000 pekerja"| F2["MY · SG · PH · BN · TH · ID"]
```

Bukti: LinkedIn Venon Tian (timeline jawatan: Group CEO mulai Ogos 2026); Tracxn (founders, CFO, CDO); Wikipedia (founders); Tatler Asia (1,000+ outlet, 6,000 pekerja); Business Today (RM250 juta); unienrol (Ian Chua CEO, temubual Apr 2026).

## 3. Perbandingan ringkas

| Aspek | Loob/Tealive | ZUS/Zuspresso |
|---|---|---|
| Model leadership | Founder-CEO + COO keluarga (adik-beradik Loo) + CCO veteran QSR | Duo founder (CEO/Group CEO) + kepimpinan luar industri (tech) |
| Struktur jenama | Multi-brand eksplisit bawah satu induk | Satu jenama, multi-negara |
| Pelabur institusi | Creador 30% (2021) | KWAP + KV Asia (2024) |
| Pengembangan | Master franchise serantau | Korporat langsung (tiada franchise tradisional) |

---

## 4. Org chart expanded sampai ke store (lanjutan 21 Okt 2026)

Sumber store-level: iklan jawatan sebenar (Indeed, Maukerja, Hiredly, PhilJobNet) + halaman careers rasmi ZUS. Jawatan dan gaji adalah **sourced**; garisan hierarki antara jawatan adalah **inference** melainkan dinyatakan dalam iklan (contoh: iklan ZUS PH menyatakan Outlet Supervisor "support the Outlet Manager").

### 4.1 Loob Holding → Store (Tealive)

```mermaid
flowchart TD
    CEO["CEO — Bryan Loo"] --> CCO["CCO — MJ Ling<br/>ops Tealive & Bask Bear MY"]

    CCO --> AM["Area Manager<br/>(jawatan diiklankan: Perak, Bangi/Kajang/Cheras)<br/>RM3,000-4,500 · urus pelbagai outlet · P&L outlet"]
    AM -->|"[inferens] 5-15 outlet per area"| OM["Outlet Manager<br/>RM2,156 purata (Indeed)"]
    AM -.-> OS2["Outlet Supervisor<br/>up to RM2,500 (iklan Hextar PJ)"]
    OM --> OS["Shift Leader<br/>(disebut dalam review Indeed, Sentul)"]
    OS --> B["Barista / Tearista<br/>RM1,700-2,200 (iklan TRX, Mid Valley)"]
    OS -.-> KC["Kitchen Team Member<br/>RM1,805"]
    OS -.-> CS["Cashier"]

    AM -.->|"[fakta] entiti franchisee berasingan<br/>contoh: Ingress Food Sdn Bhd (Subang Jaya)"| FR["Store franchisee<br/>barista diupah oleh Sdn Bhd franchisee,<br/>bukan Loob"]
```

Jawatan disahkan wujud melalui iklan: Barista (22 iklan Loob di Indeed), Outlet Manager (15), Outlet Supervisor, Shift Leader (review pekerja), Area Manager (iklan rasmi, RM3,000–4,500, "managing multiple outlets operations", "outlet sales performance & outlet costing (P&L)").

### 4.2 ZUS Coffee → Store (Zuspresso)

```mermaid
flowchart TD
    CEO["Group CEO — Venon Tian"] --> OPS["Operations dept<br/>(disenaraikan di careers page rasmi)"]

    OPS --> DM["District Manager<br/>RM4,563 purata (Indeed)"]
    DM -->|"[inferens] district = kawasan outlet"| OM["Outlet Manager<br/>RM2,424 purata (Indeed, 1,110 gaji dilaporkan)"]
    OM --> OS["Outlet Supervisor<br/>(iklan ZUS Philippines: urus shift,<br/>sokong Outlet Manager; target Customer/People/Profit/Sales)"]
    OS --> SB["Senior Barista"]
    SB --> B["Barista (ZURISTA)<br/>RM1,788 purata · stesen: Bar 1, Bar 2,<br/>Counter, Expedite · '8 ZUS Service Steps'"]
    B -.-> PT["Part-time crew"]

    CEO -.->|"[fakta] jabatan HQ disenaraikan<br/>di careers page"| HQ["Internal Audit · HR · Customer Happiness ·<br/>Brand & Product Development · Growth & Marketing ·<br/>Retail"]
    CEO -.->|"[fakta] entiti negara berasingan"| ENT["Zuspresso (M) Sdn Bhd (MY) ·<br/>Zuspresso Philippines Inc · ..."]
```

**Laluan kerjaya ZUS yang disahkan** (testimoni pekerja di careers page): Barista → **outlet supervisor trainee** → Outlet Supervisor ("Saya bermula sebagai barista biasa dan kini menyelia outlet Plaza Pandan Malim") → Outlet Manager → District Manager (jawatan wujud di Indeed).

### 4.3 Perbandingan store-level

| Lapisan | Tealive | ZUS Coffee |
|---|---|---|
| Multi-outlet | Area Manager (RM3.0–4.5k) | District Manager (RM4.6k purata) |
| Kepala outlet | Outlet Manager + Outlet Supervisor | Outlet Manager + Outlet Supervisor (co-supervisor disebut dalam iklan PH) |
| Shift | Shift Leader | Supervisor urus shift (opening/operating/closing) |
| Barisan | Barista/Tearista + Kitchen Team + Cashier | Barista + Senior Barista + part-time crew; stesen standard (Bar 1/2, Counter, Expedite) |
| Gaji barista | RM1,700–2,200 | RM1,788 purata |
| Entiti penggaji | Loob Sdn Bhd **atau** Sdn Bhd franchisee (contoh: Ingress Food) | Entiti per negara (Zuspresso M Sdn Bhd, Zuspresso Philippines Inc) |
