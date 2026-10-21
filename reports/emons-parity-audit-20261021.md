# ArtCraft Parity Audit — emons.de ⇄ ABANGCOLEK landing (21 Oktober 2026)

**Laluan:** ArtCraft *parity audit* (Fasa 0 ringkas + Fasa 1 recon + Fasa 5 gates) — projek ni **bukan** recreation baharu: ada blueprint (`docs/design/landing-page.md`, `docs/superpowers/plans/2026-10-17-abangcolek-emons-landing-spec.md`) dan implementasi sendiri yang sudah dibina. Audit ini mengesahkan sama ada implementasi itu **patuh** kepada sumber rujukan.

**Fasa 0 — Legal gate (verdict): `GO-LIMITED`**
- Sasaran rujukan: `https://www.emons.de/en` (laman awam).
- Hubungan: **interoperability / belajar** — ABANGCOLEK ialah pelaksanaan **sendiri** untuk jenama sendiri; tiada byte kod, aset, logo atau penanda dagangan emons.de disalin. Batasan: perbandingan **perilaku & struktur DOM sahaja**; tiada protokol proprietari, tiada aset visual.
- Repositori bersih: `outputs/` mengandungi laporan REA (bukan aset yang digunakan dalam aplikasi).

**Bukti mentah:** `var/log/rea-emons-20261021/emons-recon.json` + `emons-desktop-1440.png` + `emons-mobile-320.png` (scripts/rea-emons-recon.ts mengulang recon).

---

## 1. Fasa 1 — Recon emons.de (Evidence ID)

| ID | Dalaman / Perintah | Pemerhatian | Coverage |
|---|---|---|---|
| E-001 | `page.goto('https://www.emons.de/en')` | `title` = "Emons Spedition – Transport & Logistics since 1928 \| 120+ locations"; `h1` = "Emons - your forwarding company for transport & logistics"; **satu-satunya** region = "Image Slider"; 5 `<section>` dengan id `hero_first`…`hero_fifth` | penuh |
| E-002 | `locator('a, button')` (120 pertama) | Kawalan yang kelihatan = nav atas (Services, Business Units, Road/Rail/Air/Sea/Customs/Logistics, Emons Digital, Customer Area, Private customers, Freight inquiries, Order entry) + banner cookie (Accept/Reject/Save/Cookie settings). Tiada butang bab dalam accessibility tree | penuh |
| E-003 | `video, img` | 1 `<video>` (poster ada), imej editorial; `prefers-reduced-motion` = false dalam headless (bukan bukti) | separa |
| E-004 | `button[aria-haspopup=dialog]` → Tab ×6 → Escape | Trigger pertama = **banner cookie** ("Cookie Infos öffnen"); urutan fokus = "Cookie Einstellungen öffnen" → (link) → Services → Customer Area → Company → Contact; tiada dialog hero; selepas Escape fokus kembali ke atas | separa (dialog hero tidak Achieved) |
| E-005 | `mouse.wheel(0,900)` | `scrollY` 0 → 0 (**delta 0**): halaman **tidak menatal** ⇒ emons.de **memakan roda tetikus** untuk slider. `body overflow: visible`, `documentHeight` >> viewport | penuh |
| E-006 | `a[href^="#"]` | Tiada skip-link ke katalog dalam senarai fokus atas (fokus pertama selepas banner = nav) | penuh |
| E-007 | viewport 320×760 | `scrollWidth` 320 = `innerWidth` ⇒ **tiada limpahan mendatar**; 1 video | penuh |
| E-008 | console errors | **0** | penuh |
| E-009 | `#hero_first`…`#hero_fifth` | Tiada `h1/h2/h3` dalam mana-mana bahagian hero (teks dibakar dalam media); pautan setiap bahagian: "More about <Category>", "To the performance overview", "For the freight request" | penuh |

---

## 2. Perbandingan dengan implementasi ABANGCOLEK

| #{Aspect} | emons.de (bukti) | ABANGCOLEK | Verdict |
|---|---|---|---|
| 1 | 5 bahagian hero, id `hero_first`…`hero_fifth` (E-001, E-009) | 6 bab (`ScrollWorldHero.tsx` `chapters`: dunia, pilih, rasa, founder, jerux, pesanan) | **Deviasi deliberat** — reka bentuk ABANGCOLEK menetapkan 6 bab (`docs/design/landing-page.md` §Bab 01–06). Nombor bab mengikut cerita jenama, bukan rujukan. |
| 2 | Tiada tajuk DOM dalam bahagian hero (E-009) | Setiap bab `h1`/`h2` DOM + teks (`ScrollWorldHero.tsx:205`) | **ABANGCOLEK lebih baik untuk a11y** — `brand-spec.md:37` mewajibkan "UI teks dan hotspot kekal DOM accessible"; teks dalam imej tidak dapat dibaca screen reader. Deviasi dikehendaki. |
| 3 | Tiada kawalan bab dalam accessibility tree (E-002) | Rail bab `<nav aria-label="Bab perjalanan ABANGCOLEK">` dengan `aria-label="Bab N: <label>"` + `aria-current` | **ABANGCOLEK lebih baik** (E-002 bukti rujukan tiada kawalan). |
| 4 | Roda tetikus dimakan (E-005, delta 0) | Roda "trusted" advance/reverse bab danuze dilepas bab terakhir (e2e `landing-emons.spec.ts:45`) | **Padan** ✔ |
| 5 | Tiada dialog hero; ada banner cookie (E-004) | Hotspot `<dialog>` asli dengan `showModal()`, fokus terperangkap, Escape + backdrop menutup, fokus kembali ke pencetubuh (e2e `landing-emons.spec.ts:85`) | **Deviasi tambahan** — reka bentuk ABANGCOLEK menetapkan "Hotspot & dialog" (`landing-page.md:103`); rujukan tiada interaksi ini. **Fokus: keyboard + focus return** (ada dalam e2e). |
| 6 | 1 video + imej (E-003) | Filem + poster + 6 still + fallback imej dunia (`ScrollWorldHero.tsx:44-49`) | **Padan + diperkukuh** ✔ (e2e `landing-emons.spec.ts:206` buktikan filem gagal → still + fallback tidak blok navigasi) |
| 7 | Tiada limpahan mendatar pada 320 (E-007) | 0 limpahan (e2e `landing-emons-touch.spec.ts:130` + `landing-release.spec.ts:54` pada 320/390/1440) | **Padan** ✔ |
| 8 | 0 console error (E-008) | 0 console error (gate e2e) | **Padan** ✔ |
| 9 | Fokus pertama selepas banner = nav (E-004) | Fokus pertama = rail bab / skip-link ke `#catalogue` (`ScrollWorldHero.tsx:168-175`) | **Deviasi keutamaan** — ABANGCOLEK letakkan pintasan ke katalog dahulu ( untuk pembelian). |
| 10 | Teks hero dibakar dalam media (E-009) | Teks DOM + rajah + copy mengikut bab (Wave 1: `jevValueSemantics` dsb.) | **Padan spirit** (teks sebenar, bukan stok) ✔ |

### Reka bentuk hotspot (Bab 01–06) — disemak semula

`WorldHotspot.tsx` kini carrying **6 butiran, satu bagi setiap bab**, dengan copy disalin semula daripada versi yang diluluskan (`6edbdd2`) yang sepadan dengan `docs/design/landing-page.md` §Bab 01–06:

| Bab | Butiran / label / CTA | Sumber |
|---|---|---|
| 01 | Selamat datang ke dunia kami. / Terokai dunia / Jom pilih produk | landing-page.md §Bab 01 |
| 02 | Pilih buah anda. / Terokai varian / Buka katalog | §Bab 02 |
| 03 | Rasa sekali, jatuh cinta. / Terokai rasa & reaksi / Lihat katalog | §Bab 03 |
| 04 | Kenal founder. / Terokai founder / Ikuti di TikTok | §Bab 04 (Route: External TikTok) |
| 05 | Dapatkan Jerux anda. / Terokai pickup / Semak lokasi pickup | §Bab 05 |
| 06 | Pilihan & pesanan. / Terokai pesanan / Pesan sekarang | §Bab 06 |

### Regresi yang audit ini jumpa (dan dibaiki)

| # | Regresi | Bukti | Status |
|---|---|---|---|
| R-1 | Wave 1 menggantikan 6 butiran hotspot dengan senarai 4 generik ⇒ Bab 05/06 jatuh balik ke Bab 01, dan copy "Terokai dunia" hilang | audit frontend V-M1 + `git log -S "Terokai dunia"` (6edbdd2 → 6c5b16e → wave 1) | **DibBaiki** — 6 butiran dipulihkan |
| R-2 | Assertion fokus dialog mengandaikan satu Tab terus ke CTA; DOM kini ada pautan attribution (wajib brand-spec.md:70) | e2e `landing-emons.spec.ts:93` | **DibBaiki** — urutan sebenar: tutup → pautan attribution → CTA |
| R-3 | Assertion h1 landing menjangka "Colek." ( tajuk dokumen), bukan tajuk hero yang dirender | e2e `workspace-experiences.spec.ts:7` | **DibBaiki** — h1 = "Dunia" + "ABANGCOLEK." + landmark `Public navigation` |

---

## 3. Fasa 5 — Gates (evidence sebenar)

| Gate | Perintah | Exit | Hasil |
|---|---|---:|---|
| Lint | `bun run lint` | **0** | 0 ralat |
| Build | `bun run build` | **0** | Vite + prerender |
| Boundaries | `bun scripts/maintenance/check-boundaries.ts` | **0** | 0 unauthorized violation |
| Acceptance | `bun scripts/maintenance/verify-acceptance.ts` | **0** | 11/11 suite, 1258 ujian lulus, 0 gagal, 8127 assertion, `sourceStable: true` |
| Register | `bun scripts/maintenance/render-acceptance-register.ts` | **0** | 85/85 baris, 0 error |
| Browser (e2e) | `bun run test:e2e` (Playwright + Chrome, API QA 3011 + UI 3001) | lihat §4 | 61 spec |

**Nota harness e2e (penting untuk ulangan):**
- `bunfig.toml` mengecualikan `tests/e2e/**` daripada `bun test` — e2e ialah **gate berasingan**.
- E2e memerlukan **dua servis milik sesi**: `bun run qa:server` (API terasing 3011, database sendiri di `var/lib/qa/<uuid>`) + Vite UI 3001 (`PLATFORM_API_TARGET=http://127.0.0.1:3011`), dan `PLATFORM_TEST_URL=http://127.0.0.1:3001`.
- Platform mengehadkan **6 percubaan log masuk / 60 saat per akaun** ⇒ harness kini melakukan **satu** log masuk HTTP bagi setiap peranan dan menyimpan cookie sesi ke `var/run/e2e-session-<role>.txt` (dari `Set-Cookie` server), jadi worker yang dibina semula tidak melog masuk semula.

---

## 4. Gap & had (coverage partial = claim partial)

1. **Recon emons.de hanya-merentas 5 permukaan** yang P1 landing perlukan. Tidak diperiksa: halaman dalaman emons, tingkah laiku slider (timing/animasi), gestur swipe mudah alih, dan aliran "performance overview"/"freight request".
2. `prefers-reduced-motion` **tidak** dapat diukur di headless (E-003 = false ⇒ bukan bukti); kedudukan ABANGCOLEK di bawah reduced-motion disahkan oleh e2e (`landing-release.spec.ts:54`, `landing-emons.spec.ts:172`), bukan oleh rujukan.
3. Tiada audit WCAG penuh rujukan pada sesi ini (ada `outputs/EMONS_HERO_WCAG_AUDIT.md` daripada sesi REA sebelumnya — **bukan** disahkan semula di sini).
4. **Tiada parity aset**: ABANGCOLEK menggunakan aset jenama sendiri; rujukan visual tiada kata hubung langsung.

**Cadangan seterusnya (bukanحيح):**
- Recon **** kedua: gaya `hero_*` bagi rujukan (5 bahagian, tiada tajuk DOM) — sudahirming denganCitra, tiada tindakan.
- Periksa `outputs/EMONS_HERO_WCAG_AUDIT.md` sebagai bukti sedia ada untuk E-004/E-006 dan bandingkan dengan audit ini.
- Tutup E-004 (dialog hero rujukan) dengan tangkapan skrin selepas banner cookie ditutup sepenuhnya.
