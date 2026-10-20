
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Kontrak sasaran kekal di bawah blueprint v2.4; scope reka bentuk dan keputusan tetap bukan bukti semua fungsi telah diimplementasi. Semak status per-ID dan environment sebelum mendakwa siap atau production-ready.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** Rujukan reka bentuk aktif berskop landing: kekalkan aset, attribution, palette dan accessibility yang didokumenkan. Autoriti ini terhad kepada brand/landing dan tertakluk kepada blueprint; status v0 serta ukuran lama ialah rekod bertarikh, bukan pengesahan runtime semasa. Semakan dokumen design pada 2026-10-19 menyelaraskan brand-spec ini dengan panduan bersama ([../../DESIGN.md](../../DESIGN.md)) dan storyboard landing ([landing-page.md](landing-page.md)).
>
> Rujukan semasa: [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# ABANGCOLEK Landing Brand Spec

**Status:** v0 implementation basis, 2026-10-17. The logo, content, routes and existing interactions remain authoritative. Semakan terakhir dokumen design: 2026-10-19.

## Skop dan hubungan dokumen

Brand-spec ini menetapkan **aset jenama, sumber fail dan batas penggunaan untuk landing sahaja**. Storyboard, penstrukturan dan kandungan bab landing berada di [landing-page.md](landing-page.md) (storyboard sasaran). Panduan bersama yang menjadi **autoriti asas visual** berada di [../../DESIGN.md](../../DESIGN.md) — jika berlaku percanggahan visual asas, rujuk DESIGN.md; brand-spec mengekal butiran aset, sumber dan attribution khusus landing.

## Source assets

| Role | Source | Notes |
|---|---|---|
| Sampled brand reference | `public/assets/brand/ABANG-COLEX-LOGO-2.png` (1200 × 880) | User-provided logo image used as the color source; not substituted for the live header/footer logo. |
| Live landing logo | `public/assets/brand/abang-colex-logo-original.webp` (1200 × 880) | Loaded through `src/features/brand/BrandLogo.tsx` and `brand-assets.ts`; preserve the original image and alt text. |
| Hero world artwork | `public/assets/brand/abangcolek-world-v2.webp` (1774 × 887) | Existing world illustration; retain the file and use it as authored. Its original artwork contains lime/purple regions, distinct from UI theme tokens. |
| Editorial product photo | `public/assets/brand/tiktok-sambal-colek-launch.webp` (405 × 720) | Existing launch-video image; **historical/editorial only**, not a live product listing or price claim. Attribution remains `https://www.tiktok.com/@styloairpool/video/7683047307016834322`. Registered in `brand-assets.ts` dengan `historicalOnly: true` dan `requiresOwnerPriceApproval: true`. |
| Founder photo (primary) | `public/assets/brand/FOUNDER.png` (1024 × 1024) | Registered in `brand-assets.ts` sebagai `founder.primary`. **Isu implementasi (berlabel):** disk turut mengandungi `founder.png` lowercase — case mismatch berisiko pada hosting case-sensitive; sahkan nama fail sebenar sebelum deployment. Aset foto founder bukan biodata: jangan cipta petikan, pengiktirafan atau biodata lanjutan. |
| Founder photo (secondary) | `public/assets/brand/FOUNDER2.png` | Registered in `brand-assets.ts` sebagai `founder.secondary`. |
| Maskot artwork | `public/assets/brand/MASKOT-LOGO.PNG` + `MASKOT-1..5.PNG` | Registered in `brand-assets.ts` sebagai brand artwork (`isProductSku: false`) — **bukan SKU, bukan produk**. |
| World scene stills | `public/assets/world/scene-1-dapur.webp … scene-6-hero.webp` (6 × 1536 × 1024) | `worldScenes` dalam `brand-assets.ts`; sumber masih untuk scene landing. |

**Packaging Jerux:** hanya imej packaging daripada **sumber terkawal** sahaja boleh digunakan untuk merchandising Jerux dalam landing. Product Photo inventory (Mangga/Jambu/Kedondong/Epal Asam Boi, Awesome Shacx, Sambal Kicx) ialah **HISTORICAL inventory** daripada `outputs/product-image-inventory-2026-10-17.md` — inventori fail sahaja, **bukan katalog aktif** dan bukan pengesahan visual/SKU; jangan salin PRODUCT LLH secara pukal.

No separate pre-change ABANGCOLEK UI screenshot was supplied in the source materials. The desktop and mobile v0 screenshots are captured separately under `.work/` for the review checkpoint.

## Logo-derived palette

Representative samples recorded from the user-provided reference logo:

| Token | Sample | Intended role |
|---|---|---|
| `--ac-brand-gold` | `#F2AE12` | Primary brand surface, active chapter/progress, small hero highlights. |
| `--ac-brand-red` | `#DC1D3F` | Main CTA, important supporting accents and emphasis. |
| `--ac-brand-ink` | `#000000` | Core text and dark surfaces. |
| `--ac-brand-white` | `#FFFFFD` | Core light surface and dark-surface text. |
| `--ac-brand-leaf` | `#488420` | Small natural/brand accent only. |

Nilai source sebenar dalam `src/features/landing/landing.css` (L2–24) direkodkan lowercase — **OBSERVED_SOURCE**: `--ac-brand-gold #f2ae12`, `--ac-brand-red #dc1d3f`, `--ac-brand-ink #000000`, `--ac-brand-white #fffffd`, `--ac-brand-leaf #488420`. Nilai dark-mode landing yang direkodkan (OBSERVED_SOURCE, `.app-shell[data-theme=dark] .ac-landing`):

| Token | Nilai dark (OBSERVED_SOURCE) |
|---|---|
| `--ac-bg` | `#171614` |
| `--ac-card` | `#24211b` |
| `--ac-muted` | `#d1cabc` |
| `--ac-border` | `#4a4438` |
| `--ac-text` | white (kekalkan ink token di light) |

Approved high-contrast pairings (rekod sedia ada): ink on gold **10.84:1**, white on red **4.89:1**, and white on leaf green **4.56:1**. Secondary neutrals may be warm tints derived from these core colors; the landing must not retain legacy lime/lavender UI accents. Existing food, foliage and parcel colors remain natural where they are part of the preserved artwork.

## Typography and UI foundations

- Display: **Outfit**; body: **DM Sans**.
- Kedua-dua font dimuatkan melalui Google Fonts stylesheet dalam `index.html` (L11, `display=swap`) dengan wght: **DM Sans 400;500;600;700** dan **Outfit 400;500;600;700;800**; do not add or replace font dependencies.
- Preserve the existing 8 px spacing rhythm, responsive breakpoints, border radii and motion timing unless a later approved refinement changes them.
- Preserve light/dark theme support, visible keyboard focus, 44 px controls and all reduced-motion/static behavior.
- At widths up to 750 px, hide the two redundant decorative illustration captions to prevent overlap; keep the product-photo title and attribution, all chapter controls and the artwork available. Desktop captions remain visible.

## Attribution dan hak penggunaan

- Semua media sosial dan foto produk yang digunakan dalam landing **mesti membawa attribution** yang boleh disemak (pautan sumber).
- **Kebenaran owner diperlukan** sebelum mana-mana media sosial/foto produk digunakan sebagai aset jualan (sales asset).
- Hak siar lanjut (redistribution) media pihak ketiga: **BUSINESS_UNVERIFIED** — jangan dakwa kebenaran repost/edar semula.
- Editorial product photo kekal `historicalOnly` + `requiresOwnerPriceApproval` (lihat Source assets).

## Pemisahan entity

**ABANGCOLEK**, **Liur Le Leh House** dan **The Famous Jerux** kekal sebagai entity berasingan sehingga founder mengesahkan hubungan. Cross-link antara akaun sosial terbukti (OBSERVED_SOURCE), tetapi hubungan legal antara entiti ialah **UNKNOWN (BUSINESS_UNVERIFIED)**. Jangan dakwa pemilikan, penggabungan, pensub-sijilan atau sebarang hubungan korporat/legal antara ketiga-tiga entiti.

## Peraturan teks dan label produk dalam artwork

- Elak teks label produk yang boleh berubah/musnah akibat generasi imej: teks produk (nama, harga, label) kekal sebagai **lapisan DOM**, bukan terbakar ke dalam imej.
- Ejaan jenama **belum terkunci** — ABANGCOLEK / ABANG COLEK / ABANG COLEX (Open Decision). **Jangan normalisasi ejaan** dalam mana-mana aset atau documentation; gunakan ejaan sebagaimana aset asal.

## Preserve boundaries

- Keep the existing logo, world and editorial-photo files, their alternative text and attribution.
- **HISTORICAL — nota spesifikasi lama (konteks 2026-10-17):** versi terdahulu dokumen ini menyatakan "Keep the four chapter names, navigation labels, route destinations…". Struktur empat bab ialah konteks spesifikasi lama dan **bukan kekangan aktif lagi**; storyboard sasaran kini **enam bab** ditetapkan di [landing-page.md](landing-page.md). Jangan gunakan "preserve four chapters" sebagai had reka bentuk semasa.
- Kekangan aktif yang masih sah: kekalkan logo/world/editorial files, alt text, attribution, theme toggle, accessibility semantics, data attributes, hotspot/dialog behavior, keyboard/touch behavior dan catalog content/data mengikut storyboard sasaran di landing-page.md.
- Restyle only public landing UI surfaces and the decorative SVG's old brand accents. Do not alter the source illustration/photo files or workspace theme tokens.

## Larangan aset Emons

**Ditegaskan:** tiada logo, copy, footage, logistics labels atau artwork Emons dibenarkan dalam produk atau landing ini. Hanya **inspirasi komposisi dan mekanik** (one world many cameras, scarcity brand color, hotspot progressive disclosure, chapter rail) yang boleh diadaptasi — bukan salinan aset, copy atau struktur. Jangan label implementasi slideshow/crossfade semasa sebagai setara Emons.
