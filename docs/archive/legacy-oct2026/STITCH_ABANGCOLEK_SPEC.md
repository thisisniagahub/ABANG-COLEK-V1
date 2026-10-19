<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** REKOD SEJARAH / RUJUKAN — pemerhatian, metrik ujian, status deployment, harga/model dan cadangan di bawah terikat kepada tarikh serta skop asal. Ia bukan checklist execution semasa atau pengesahan bahawa dapatan masih benar. Kekalkan bukti asal; revalidate sebelum mendakwa fixed, connected atau production-ready.
>
> Rujukan semasa: [Master Growth Blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# 🎨 Google Stitch Master Specification: ABANGCOLEK Ecosystem (5-Screen Suite)
**Version:** 1.0  
**Authority:** HYPER-SOVEREIGN ARCHITECT & VIBE CODER AUTOPILOT  
**Target Platform:** Google Stitch AI (`https://stitch.withgoogle.com/`)  
**Associated Codebase:** `D:\ABANGCOLEK-PLATFORM` & `D:\ABANGCOLEK`  
**Brand Identity:** Liurleleh House Malaysia (Colek Yellow `#FFC107`, Sambal Red `#E53935`, Midnight Black `#1A1A1A`, Cream `#FFFDF7`)

---

## 🧭 Executive Overview
This specification translates the canonical business requirements from `D:\ABANGCOLEK\PRD.md` into 5 production-grade Stitch generative UI screens following Google's official **Stitch Effective Prompting Guide** (`https://discuss.ai.google.dev/t/stitch-prompt-guide/83844`).

Each screen is architected with exact visual tokens, component states, and micro-interactions ready for generation in Stitch and immediate integration into the Vite + React platform.

---

## 📱 5-Screen Architecture Matrix

| Screen ID | Screen Name | Target Persona | Key Capabilities | Stitch Spec File |
|:---|:---|:---|:---|:---|
| **ST-01** | **Customer Express Kiosk & Storefront** | Pelanggan Runcit & Pengunjung Gerai | Menu buah potong segar, pilihan pedas 3-tahap, botol kuah, troli masa nyata, DuitNow QR & WhatsApp checkout | [`abang_colek_kiosk_storefront.md`](../../stitch_prompts/abang_colek_kiosk_storefront.md) |
| **ST-02** | **Sovereign Command Hub (HQ)** | Pengasas (Founder) & Operasi HQ | Metrik GMV masa nyata, kuota botol dapur utama, pengesanan kargo bas ekspres, triage aduan JEV | [`abang_colek_sovereign_command_hub.md`](../../stitch_prompts/abang_colek_sovereign_command_hub.md) |
| **ST-03** | **Portal Restok Stokis & Ejen B2B** | Ejen Sah & Stokis Negeri | Kiraan harga borong mengikut tier, pesanan karton pukal, pemilihan kargo bas ekspres, invois FPX | [`abang_colek_agent_restock_portal.md`](../../stitch_prompts/abang_colek_agent_restock_portal.md) |
| **ST-04** | **Radar Forensik Sosial & JEV Intelligence** | Penganalisis Jenama & QC | Pemantauan video viral TikTok/IG, pengecaman audio jingle, klasifikasi tuntutan JEV, audit rantaian | [`abang_colek_jev_social_intelligence.md`](../../stitch_prompts/abang_colek_jev_social_intelligence.md) |
| **ST-05** | **Penjejak Kargo Bas Ekspres Antara Bandar** | Pemandu, Stokis & Pasukan Logistik | Waybill tiket bas, pengesanan laluan pantai timur (LPT2), koordinat hentian rehat, notifikasi WhatsApp | [`abang_colek_express_bus_cargo_tracker.md`](../../stitch_prompts/abang_colek_express_bus_cargo_tracker.md) |

---

## 🎨 Master Design System & Tokens

```css
:root {
  /* Brand Core */
  --colek-yellow: #FFC107;      /* Primary Golden Mango */
  --sambal-red:   #E53935;      /* Action / Spicy CTA */
  --midnight-black: #1A1A1A;    /* Contrast Brushstroke */
  --cream-bg:     #FFFDF7;      /* Warm Street Food Background */
  --leaf-green:   #4CAF50;      /* Freshness & Success */
  --mascot-blue:  #4A90D9;      /* Blue Mascot Icon */
  
  /* Dark Mode Dashboard */
  --dark-charcoal: #121214;
  --dark-surface:  #1C1C20;
  --dark-border:   #2D2D35;

  /* Brutalist Metrics */
  --border-thick: 2px solid var(--midnight-black);
  --shadow-brutal: 4px 4px 0px var(--midnight-black);
  --radius-pill: 9999px;
  --radius-card: 24px;
}
```

---

## 🚀 How to Execute with Google Stitch in Chrome Profile 50

1. **Auto-Dispatched via Sovereign AI Labs Dispatcher:**
   The master prompt is queued for Chrome Profile 50 (`thisisdohnut@gmail.com`) using:
   ```powershell
   python C:\Users\megat\Scripts\ai_labs_dispatcher.py dispatch --target stitch --prompt "..."
   ```
2. **WebBridge Live Injection:**
   When Chrome Profile 50 is open, GangNiaga WebBridge (`http://127.0.0.1:10087`) or Chrome DevTools MCP navigates to `https://stitch.withgoogle.com/`, pastes the prompt from the `.md` file, and generates the layout canvas.
3. **Local Platform Synchronization:**
   The generated screens are mirrored directly in `D:\ABANGCOLEK-PLATFORM\src` with React 18, Tailwind CSS, Lucide icons, and zero-error TypeScript interfaces.
