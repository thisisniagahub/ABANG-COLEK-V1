<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** Rujukan reka bentuk aktif berskop landing: kekalkan aset, attribution, palette dan accessibility yang didokumenkan. Autoriti ini terhad kepada brand/landing dan tertakluk kepada blueprint; status v0 serta ukuran lama ialah rekod bertarikh, bukan pengesahan runtime semasa.
>
> Rujukan semasa: [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# ABANGCOLEK Landing Brand Spec

**Status:** v0 implementation basis, 2026-10-17. The logo, content, routes and existing interactions remain authoritative.

## Source assets

| Role | Source | Notes |
|---|---|---|
| Sampled brand reference | `public/assets/brand/ABANG-COLEX-LOGO-2.png` (1200 × 880) | User-provided logo image used as the color source; not substituted for the live header/footer logo. |
| Live landing logo | `public/assets/brand/abang-colex-logo-original.webp` (1200 × 880) | Loaded through `src/features/brand/BrandLogo.tsx` and `brand-assets.ts`; preserve the original image and alt text. |
| Hero world artwork | `public/assets/brand/abangcolek-world-v2.webp` (1774 × 887) | Existing world illustration; retain the file and use it as authored. Its original artwork contains lime/purple regions, distinct from UI theme tokens. |
| Editorial product photo | `public/assets/brand/tiktok-sambal-colek-launch.webp` (405 × 720) | Existing launch-video image; historical/editorial only, not a live product listing or price claim. Attribution remains `https://www.tiktok.com/@styloairpool/video/7683047307016834322`. |

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

Approved high-contrast pairings: ink on gold **10.84:1**, white on red **4.89:1**, and white on leaf green **4.56:1**. Secondary neutrals may be warm tints derived from these core colors; the landing must not retain legacy lime/lavender UI accents. Existing food, foliage and parcel colors remain natural where they are part of the preserved artwork.

## Typography and UI foundations

- Display: **Outfit**; body: **DM Sans**.
- Both fonts are already loaded by the existing Google Fonts stylesheet in `index.html`; do not add or replace font dependencies.
- Preserve the existing 8 px spacing rhythm, responsive breakpoints, border radii and motion timing unless a later approved refinement changes them.
- Preserve light/dark theme support, visible keyboard focus, 44 px controls and all reduced-motion/static behavior.
- At widths up to 750 px, hide the two redundant decorative illustration captions to prevent overlap; keep the product-photo title and attribution, all four chapter controls and the artwork available. Desktop captions remain visible.

## Preserve boundaries

- Keep the existing logo, world and editorial-photo files, their alternative text and attribution.
- Keep the four chapter names, navigation labels, route destinations, metadata, theme toggle, accessibility semantics, data attributes, chapter handlers, hotspot/dialog, keyboard/touch behavior and catalog content/data.
- Restyle only public landing UI surfaces and the decorative SVG's old brand accents. Do not alter the source illustration/photo files or workspace theme tokens.
- No EMONS logo, copy, images, logistics labels or five-tab structure are part of this brand spec.
