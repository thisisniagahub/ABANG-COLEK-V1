# ABANGCOLEK — DESIGN.md (Panduan Reka Bentuk Bersama)

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](docs/CURRENT-STATUS.md) · [Checklist](PROJECT-CHECKLIST.md). Kontrak sasaran kekal di bawah blueprint v2.4; scope reka bentuk dan keputusan tetap bukan bukti semua fungsi telah diimplementasi. Semak status per-ID dan environment sebelum mendakwa siap atau production-ready.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Disusun: **19 Oktober 2026** · Sumber bukti: pakej bukti reka bentuk kongsi (compiled 2026-10-19, read-only research) · Guna label bukti: **OBSERVED_SOURCE** (dari source semasa), **OBSERVED_VISUAL** (dari tangkapan visual), **HISTORICAL** (rekod lama, bukan status semasa), **TARGET_DESIGN** (sasaran reka bentuk, belum dilaksana), **BUSINESS_UNVERIFIED** (klaim bisnes belum disahkan).

> **NOTA PENTING — dokumen ini BUKAN laporan status implementasi.** Kandungan source di bawah (fail CSS, komponen, routes) menunjukkan **implementasi semasa** sahaja. Implementasi semasa TIDAK automatik menjadi reka bentuk sasaran. Apa-apa yang dilabel TARGET_DESIGN adalah keperluan sasaran yang masih perlu dilaksana, diuji dan disahkan. Jangan baca dokumen ini sebagai pengesahan pematuhan atau kelulusan bisnes.

---

## A. Tujuan dan skop

**Tujuan.** DESIGN.md ialah **asas bersama reka bentuk** untuk seluruh aplikasi ABANGCOLEK: landing public dan workspace operations. Ia menetapkan prinsip, token, tipografi, spacing, komponen, tema, aksesibiliti dan tadbir urus supaya semua dokumen reka bentuk dan implementasi merujuk satu set nilai yang sama.

**Struktur dokumen reka bentuk (4 dokumen, diluluskan):**

- `DESIGN.md` (root, dokumen ini) — panduan bersama aplikasi.
- [docs/design/landing-page.md](docs/design/landing-page.md) — landing public (spesifikasi pengalaman dunia miniature, storyboard enam bab sasaran).
- [docs/design/workspaces.md](docs/design/workspaces.md) — workspace operations (Founder, Staff, Developer, Customer serta dedicated Dealer Workspace berasaskan membership/grants).
- [docs/design/commerce-growth.md](docs/design/commerce-growth.md) — target public store setiap Agent/Stokis, private workspace, ordering, rewards dan retention. Gunakan tokens/komponen/a11y bersama di sini; spesifikasi produk tersebut tidak membuktikan surface sudah tersedia.
- [docs/design/brand-spec.md](docs/design/brand-spec.md) — aset & identiti landing (sedia ada, v0 basis 2026-10-17, dalam proses kemas kini).

**Konteks strategi & sumber kebenaran:**

- [docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md](docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) — blueprint pertumbuhan penuh. Dokumen ini TIDAK menduplikasi blueprint; ia merujuk kepadanya untuk strategi.
- [docs/ABANGCOLEK-SOURCE-OF-TRUTH.md](docs/ABANGCOLEK-SOURCE-OF-TRUTH.md) — SoT platform. Nota OBSERVED_SOURCE daripada SoT: snapshot `catalogue0/products0` pada 3–4 Okt menunjukkan **tiada katalog operasi terbukti daripada snapshot platform**; keseluruhan SKU, harga, gram/ml, variasi dan availability semasa **belum terbukti**. Sebarang reka bentuk paparan katalog mesti mengendalikan data tidak lengkap sebagai keadaan kelas pertama, bukan assumption terisi.

**Skop:**

1. **Dalam skop:** prinsip reka bentuk, warna/token, tipografi, spacing, komponen, light/dark, aksesibiliti, governance — merentasi landing dan workspace.
2. **Luar skop:** salinan aset pihak ketiga (Emons dsb.), copywriting penuh, keputusan bisnes (harga/stok/event), dan apa-apa yang diluluskan dalam blueprint tanpa ulasan tambahan di sini.
3. **Batas tindakan:** dokumen ini hanya menetapkan sasaran; ia TIDAK mengubah CSS, source atau aset. Fail source yang diubah oleh orang lain (contoh `ScrollWorldHero.tsx`) tidak disentuh oleh dokumen ini.

---

## B. Prinsip reka bentuk

Prinsip ini mengikat landing dan workspace:

1. **Produk dan rekod sebenar.** UI memaparkan produk, status dan rekod sebenar sahaja. Data yang tidak diketahui dipaparkan sebagai tidak diketahui (unknown kekal unknown), bukan nilai direka. Stok/availability **jangan dakwa** tanpa rekod disahkan (BUSINESS_UNVERIFIED kekal dilabel).
2. **Kejelasan tindakan.** Setiap skrin menonjolkan tindakan seterusnya yang boleh dibuat pengguna. CTA kedua/tertiary tidak bersaing dengan CTA utama.
3. **Identiti ABANGCOLEK konsisten.** Tone daripada bukti brand: **ringkas, direct, playful, yakin, dekat**. Bahasa: **BM + code-switching English**. Ejaan jenama (ABANGCOLEK / ABANG COLEK / ABANG COLEX) **belum terkunci** (Open Decision #1) — jangan normalisasi ejaan dalam aset sedia ada.
4. **UI mengikut tujuan pengguna.** Landing: perkenalkan dunia jenama dan laluan beli. Workspace: operasi berdasarkan peranan (role) dan keupayaan (capability) — bukan menu penuh untuk semua.
5. **Status berasaskan bukti.** **Approval ≠ execution.** Kelulusan (approve) hanya status kelulusan; pelaksanaan (dispatch, publish, dsb.) dipaparkan berbeza daripada kelulusan. Keadaan pending/unknown/failed dipaparkan berbeza dan jelas.
6. **Progressive disclosure.** Maklumat disampaikan dalam lapisan bertingkat: hotspot "+" pada dunia landing (hanya dalam motion mode), `<details>` expansion pada rekod workspace, dialog untuk butiran. Kandungan berat tidak dimuat sekaligus.
7. **Akses tidak ditentukan rupa UI.** Kebolehcapaan bahagian ditentukan **capability-gated** (`canAccessSection()`, `SessionData.capabilities`, `NavigationItem.requiredCapability`), bukan oleh sama ada pautan kelihatan atau disembunyi secara visual. Menyembunyikan item menu bukan kawalan keselamatan.
8. **Aset asli dikekalkan.** Aset brand sedia ada (logo, maskot, artwork dunia) digunakan seperti asli; imej research bukan bukti SKU tersedia; jangan ubah/tukar aset untuk menyesuaikan tema (lihat seksyen F).

---

## C. Warna

**Prinsip utama: DUA keluarga warna terpisah, JANGAN gabungkan penuh.**

- **Keluarga 1 — Landing / brand** (`--ac-*`): digunakan pada landing public.
- **Keluarga 2 — Workspace** (`--ui-*`): digunakan pada semua workspace route.

Penggunaan lintas keluarga mesti disengajakan dan didokumenkan (contoh: kedua-dua keluarga berkongsi derivasi emas/merah daripada logo — itu serahan identiti, bukan alasan mencampur sistem). **TARGET_DESIGN: tiada token baharu diperkenalkan** — sasaran sentiasa dinyatakan sebagai penggunaan semula token sedia ada.

### C.1 Landing — token brand (OBSERVED_SOURCE)

Ditakrif di `src/features/landing/landing.css` (`.ac-landing`, bukan scroll-world.css):

| Token | Nilai | Fungsi |
|---|---|---|
| `--ac-brand-gold` | `#f2ae12` | Aksen utama/CTA (butang `.ac-button` latar emas + teks ink), bab aktif, fokus ring |
| `--ac-brand-red` | `#dc1d3f` | Aksen sekunder/CTA gelap (`.ac-button-dark` latar merah + teks putih) |
| `--ac-brand-ink` | `#000000` | Teks utama (light), latar panggung dunia (`.ac-world-journey`) |
| `--ac-brand-white` | `#fffffd` | Teks atas latar gelap/merah, latar surface light |
| `--ac-brand-leaf` | `#488420` | Aksen hijau (dari palet logo; penggunaan sasaran dinyatakan di brand-spec) |

**Pasangan teks/latar sedia ada (OBSERVED_SOURCE):** ink pada emas; putih pada merah; ink pada putih (`--ac-text` atas `--ac-bg`); `--ac-world-ink` (putih) atas ink/skrim gelap. Pada dark theme landing, teks bertukar kepada `--ac-brand-white` atas `#171614`.

### C.2 Landing — surface & teks (OBSERVED_SOURCE)

| Token | Light | Dark (`.app-shell[data-theme=dark] .ac-landing`) | Fungsi |
|---|---|---|---|
| `--ac-bg` | `#fffffd` (var white) | `#171614` | Latar halaman |
| `--ac-card` | `#fffffd` (var white) | `#24211b` | Latar kad |
| `--ac-text` | `#000000` (var ink) | `#fffffd` (var white) | Teks utama |
| `--ac-muted` | `#57534e` | `#d1cabc` | Teks sekunder/keterangan |
| `--ac-border` | `#ded7c8` | `#4a4438` | Garis/border kad, nav |

### C.3 Landing — world tokens (OBSERVED_SOURCE)

Ditakrif di `src/features/landing/scroll-world.css` (`.ac-landing-home`):

| Token | Nilai | Fungsi |
|---|---|---|
| `--ac-world-header` | `80px` (mobile `120px` @750px) | Tinggi header sticky dunia |
| `--ac-world-ink` | = `--ac-brand-white` | Teks atas panggung dunia gelap |
| `--ac-world-muted` | `#ded7c8` | Teks sekunder atas dunia |
| `--ac-world-accent` | = `--ac-brand-gold` | Aksen dunia (bab aktif dsb.) |

**Nilai bukan-token hard-coded dalam dunia (OBSERVED_SOURCE, rekod nilai semasa):** scrim `#111115` (gradients); butang motion/secondary latar `#24211b` border `#ffffff35`/`#ffffff46`; butang bab latar `#1f1c16`; bab aktif latar/border gold + teks `#182009`; progress rail `#ffffff28`; hotspot dialog latar `#201d17` border `#5a5040`, backdrop `#09090fb8`, butang tutup `#342e23`, hover `#ffd979`/`#494033`/`#39342a`; photo border `#ffffff35` shadow `#0008`. **TARGET_DESIGN:** apabila komponen dunia disusun semula, nilai ini diangkat menjadi token named dalam keluarga `--ac-world-*` yang sedia ada (tiada token baharu di luar keluarga itu), bukan dibiarkan tersebar sebagai literal.

### C.4 Workspace — token `--ui-*` (OBSERVED_SOURCE)

Ditakrif di `src/features/theme/workspace-theme.css` (`.app-shell`; dark via `.app-shell[data-theme=dark]`):

| Token | Light | Dark | Fungsi |
|---|---|---|---|
| `--ui-bg` | `#f1f0f5` | `#171719` | Latar app shell |
| `--ui-surface` | `#ffffff` | `#222225` | Permukaan kad/panel |
| `--ui-soft` | `#eae8f0` | `#2b2b30` | Permukaan lembut (soft chip, hover row) |
| `--ui-text` | `#202025` | `#f5f4f8` | Teks utama |
| `--ui-muted` | `#62606f` | `#b5b2c1` | Teks sekunder |
| `--ui-border` | `#dcd9e4` | `#37363e` | Border kad/pembahagi |
| `--ui-input-border` | `#817b8f` | `#85818f` | Border input/textarea/select |
| `--ui-primary` | `#f6bd1b` | `#f6bd1b` | Aksen primer (tiada override dark) |
| `--ui-primary-ink` | `#171719` | (tiada override) | Teks atas primary |
| `--ui-accent` | `#e31e3d` | `#f0445e` | Aksen merah; outline fokus; input accent-color |
| `--ui-accent-ink` | `#ffffff` | `#ffffff` | Teks atas accent |
| `--ui-lilac` | `#f3a51f` | `#f6bd1b` | Aksen nama warisan "lilac" (nilai semasa adalah emas/amber) |
| `--ui-accent-text` | `#b3132e` | `#ff8a9a` | Teks pautan/aksen merah |
| `--ui-success-text` | `#157351` | `#83dfb5` | Status success |
| `--ui-warning-text` | `#8a5b0b` | `#f4cb75` | Status warning |
| `--ui-danger-text` | `#b42c42` | `#ff98a7` | Status danger |
| `--ui-inverse` | `#171719` | (tiada override) | Latar terbalik |
| `--ui-inverse-text` | `#f5f4f8` | (tiada override) | Teks terbalik |
| `--ui-shadow` | `0 8px 28px #17171908` | `0 8px 28px #00000018` | Elevation |

Hard-coded semasa dalam `workspaces.css` (OBSERVED_SOURCE, rekod): `.xp-dark-secondary` `#303036`/`#fff`/`#414148`; `.xp-hero-card` `#222225`/`#f8f7fa` dengan em `#cfff5e` dan shape `#8c7dff`; warna brand provider `#d7193f`/`#b92f91`. Status classes guna `color-mix()` atas success/warning/danger.

### C.5 Kontras — HISTORICAL vs TARGET_DESIGN

**HISTORICAL (nilai rekod sedia ada daripada brand-spec, anggaran terdokumentasi):**

- ink-on-gold `#000000` atas `#f2ae12` ≈ **10.84:1**
- white-on-red `#fffffd` atas `#dc1d3f` ≈ **4.89:1**
- white-on-leaf `#fffffd` atas `#488420` ≈ **4.56:1**

Nilai ini adalah **rekod sedia ada**, bukan audit semasa, dan jangan dikutip sebagai "kontras lulus" tanpa pengiraan semula pada kombinasi sebenar yang digunakan.

**TARGET_DESIGN:** setiap pasangan teks/latar baharu (atau kombinasi sedia ada yang belum dikira) **mesti lulus WCAG 2.2 AA** — 4.5:1 untuk teks biasa, 3:1 untuk teks besar dan elemen UI — **dengan pengiraan sebenar sebelum digunakan**. Anggaran HISTORICAL di atas tidak menggantikan pengiraan. Pengecualian bukan-teks (artwork, dekorasi aria-hidden) tidak dianggap pasangan teks/latar.

### C.6 Current vs TARGET_DESIGN (warna)

- **Current (OBSERVED_SOURCE):** landing dan workspace sudah mempunyai dua keluarga token lengkap dan berfungsi, dengan beberapa literal hard-coded dalam dunia landing dan `workspaces.css`.
- **TARGET_DESIGN:** paparan sasaran menggunakan **semula token sedia ada** sahaja; literal berulang diangkatkan ke token keluarga masing-masing; tiada token baharu; setiap pasangan teks/latar sah melalui pengiraan kontras AA. Penggunaan token per bab landing sasaran ditetapkan dalam `docs/design/landing-page.md` §4.1 (pasangan sedia ada sahaja, tanpa token baharu). Bahagian disekat: pengesahan bisnes warna untuk kategori produk baharu (BUSINESS_UNVERIFIED). Fallback dibenarkan: kekal guna nilai semasa sehingga pengiraan AA disiapkan.

---

## D. Typography

**Font (OBSERVED_SOURCE, dimuatkan di `index.html` L11, Google Fonts `display=swap`):**

- **Outfit** — display/headings; wght `400;500;600;700;800` (sasaran guna 400–800; jangan tambah font atau wght di luar senarai ini).
- **DM Sans** — body; wght `400;500;600;700`.
- `.ac-landing` dan `.app-shell` kedua-duanya `font-family:'DM Sans',sans-serif` (OBSERVED_SOURCE). **TARGET_DESIGN: jangan tambah font ketiga.**

**Hierarki tipografi:**

| Peringkat | Font | Nilai semasa (OBSERVED_SOURCE) | Nota |
|---|---|---|---|
| Display h1 (hero dunia) | Outfit | `clamp(46px, 5.8vw, 82px)`, ls −3px, weight 550 (semasa) | Target tajuk utama landing |
| Display h2 (hero dunia) | Outfit | `clamp(36px, 4.5vw, 62px)`, ls −2.4px | Seksin dunia |
| Heading (dialog hotspot h2) | Outfit | semasa weight 500 | Dialog body = DM Sans |
| Body | DM Sans | default | Teks rencana/keterangan |
| Label/caption | DM Sans | semasa guna weight/muted token | Label butang, meta rekod |
| Wordmark nav | Outfit | 18px, weight 850 semasa (di luar wght yang dimuat — sasaran 800) | Border kes: guna wght termuat |

**Nombor (tabular/monospace):** **tiada mekanisme nombor khusus (tabular-nums/monospace) ditemui dalam source semasa** untuk landing/workspaces. Rekod `design-qa.md` Historical Dashboard (2026-10-01) menyebut "tabular numeric values" — itu HISTORICAL snapshot, bukan sistem semasa. **Jangan reka** font nombor baharu. TARGET_DESIGN (ditetapkan di sini): nilai kewangan/kuantiti dipaparkan dengan CSS property `font-variant-numeric: tabular-nums` pada font sedia ada (DM Sans/Outfit) — property CSS standard, bukan token atau font baharu; keperluan paparan per senarai dirujuk di `docs/design/workspaces.md` §7.2.

**Sasaran susun atur (TARGET_DESIGN):**

- Desktop dan mobile kedua-duanya disasarkan; landing dunia mempunyai reflow khusus ≤750px (chapters 3-kolum) dan guard `(max-height:560px)`, `(max-width:750px) and (max-height:740px)` untuk short viewport (OBSERVED_SOURCE).
- **Line-height body** ~1.5 (nilai semasa diwarisi browser; TARGET_DESIGN: body ≥1.5, tajuk ~1.1–1.2 — nilai ini ditetapkan di sini sebagai keputusan sasaran).
- **Batas panjang teks body ~60–75 aksara** (≈ 32–40em) untuk blok rencana/FAQ; landing hero dikecualikan (display pendek).

---

## E. Spacing dan komponen

**Spacing rhythm (OBSERVED_SOURCE daripada brand-spec sedia ada): rhythm 8px.** Semua padding/gap/margin sasaran dalam gandaan 8px (4px dibenarkan untuk micro-adjustments dalam komponen padat). Nilai semasa dalam source yang tidak mengikut gandaan 8px (contoh `padding:24px 52px` nav — 52 bukan gandaan) adalah current; TARGET_DESIGN menyelaraskan ke 8px rhythm semasa komponen disentuh, bukan sweep besar-besar tanpa ujian.

**Radius (OBSERVED_SOURCE, rekod nilai semasa):** butang landing `border-radius:10px`. Radius komponen lain diwarisi nilai semasa; tiada sistem radius berperingkat dalam source — TARGET_DESIGN akan menetapkan skala radius kecil (tetap 10px untuk butang/pill, nilai kad mengikut semasa) tanpa token baharu.

**Elevation:**

- Dunia landing: photo shadow `#0008` (OBSERVED_SOURCE).
- Workspace: `--ui-shadow` = `0 8px 28px #17171908` (light) / `0 8px 28px #00000018` (dark) (OBSERVED_SOURCE).

**Butang (OBSERVED_SOURCE + TARGET_DESIGN):**

- Primary CTA landing: `.ac-button` — latar `--ac-brand-gold`, teks ink. CTA gelap: `.ac-button-dark` — latar `--ac-brand-red`, teks `--ac-brand-white`. Outline: `.ac-button-outline` — latar telus, border `--ac-border`. (Semua radius 10px.)
- Butang motion/secondary dunia: latar `#24211b`, border putih-α (`#ffffff35`/`#ffffff46`).
- Bab aktif dunia: latar/border gold, teks `#182009`.
- Workspace: `button { min-height:44px }`, `button:active` scale(.97); MutationButton = POST dengan two-step confirm state (bukan confirm dialog — lihat dialogs di bawah).
- **TARGET_DESIGN:** keadaan hover/focus/disabled dinyatakan konsisten menggunakan token sedia ada sahaja.

**Inputs (OBSERVED_SOURCE):** border input/textarea/select = `--ui-input-border`; placeholder = `--ui-muted` opacity .8; `accent-color:var(--ui-accent)`.

**Cards (OBSERVED_SOURCE):**

- Workspace: `Panel` (ui.tsx) dan list card `.xp-record-list`, `.xp-stock-card`, `.xp-dealer-card`, `.xp-task`, `.xp-qc`, `.xp-shift`, dsb. — tiada `<table>`; semua senarai ialah card/row. Landing kad produk SEMASA ialah **placeholder warna** `ac-product-color-{i%3}` + ikon Package + "ABANG/COLEK" — **bukan imej produk**.
- `workspaces.css` mengguna `--ui-*` sahaja untuk permukaan (dengan beberapa literal dinyatakan di C.4).

**Badges/status (OBSERVED_SOURCE):** `Status` → class `xp-status-{value}`; pemetaan: verified/done/approved = success, pending/review/unknown/blocked = warning, rejected/failed = danger (guna `--ui-*-text` + `color-mix`). **Status bukan warna sahaja** — label teks sentiasa disertakan (lihat G).

**Dialogs (OBSERVED_SOURCE, keadaan semasa):**

- Hotspot dialog dunia landing: latar `#201d17`, border `#5a5040`, backdrop `#09090fb8`, butang tutup `#342e23` (hover `#494033`, teks hover `#ffd979`). Dialog hotspot menyekat input scene.
- Mobile sidebar workspace: `role=dialog` + focus-trap + inert.
- **TIADA sistem dialog/toast umum dalam source** (gaps dinyatakan dalam bukti). Confirm semasa = two-step button; feedback semasa = inline.
- **TARGET_DESIGN:** keperluan dialog/toast untuk sasaran **akan ditetapkan** oleh dokumen rakan (workspaces.md) — ini keperluan sasaran, bukan dakwaan siap. Sebelum itu, fallback dibenarkan: teruskan corak inline/two-step sedia ada.

**Toast/status feedback (semasa):** inline sahaja — `ResourceState` (loading "Memuatkan rekod…", error + "Cuba semula", load-more), `FormPanel` receipt "Disimpan oleh server · {id}", error `role=alert`, status enum transition buttons muncul ikut status rekod. Landing: order card disabled bila `availableQuantity < 1`.

**Focus states (OBSERVED_SOURCE):**

- Workspace: `:focus-visible` outline 3px solid `--ui-accent`, offset 3px (semua button/input/textarea/select/summary/a).
- Landing dunia: focus ring **gold** (gold ring) dalam motion mode — sasaran: kekalkan.

**Keadaan lengkap (loading/empty/denied/error/success) — TARGET_DESIGN mencakupi semua lima:**

| Keadaan | Semasa (OBSERVED_SOURCE) | Nota sasaran |
|---|---|---|
| Loading | `ResourceState` "Memuatkan rekod…" | Skeleton/teks; jangan tanda siap tanpa ujian |
| Empty | `Empty` component | CopilotWorkspace: badge "Runtime unavailable · Belum tersedia" (role=status) |
| Error | error + "Cuba semula"; `role=alert` | Retry boleh dipanggil (`reload`) |
| Success | receipt "Disimpan oleh server · {id}" | Receipt server-authoritative |
| Denied | Denial UI route-level: "Akses bahagian ini tidak dibenarkan" | Capability-gated, lihat B.7 |

**Keperluan tertunda (wajib dinyatakan, bukan TODO kosong):**

- **Belum diketahui:** perihal paparan visual produk (imej vs placeholder) dalam enam bab sasaran — bergantung pada katalog disahkan (BUSINESS_UNVERIFIED; snapshot SoT menunjukkan tiada katalog operasi terbukti).
- **Sumber diperlukan:** katalog/SKU disahkan founder/ops sebelum reka bentuk kad produk diteruskan melebihi placeholder semasa.
- **Disekat:** sistem dialog/toast umum — disekat sehingga keperluan ditetapkan dalam `docs/design/workspaces.md`.
- **Fallback dibenarkan:** placeholder warna produk sedia ada; inline feedback sedia ada; stills fallback dunia (film → stills → asset-fallback `abangcolek-world-v2.webp` opacity .15).

---

## F. Light/dark mode

**Mekanisme projek (OBSERVED_SOURCE):**

- Dark theme diaktif melalui **data attribute**: `.app-shell[data-theme=dark]`.
- Persistensi: **localStorage key `abangcolek-workspace-theme`** melalui `useWorkspaceTheme`; **default DARK**; `documentElement.style.colorScheme` diselaraskan.
- **TIADA `prefers-color-scheme` detection** dalam projek. Sasaran: kekalkan mekanisme ini (jangan tambah auto-detect OS tanpa keputusan baharu).

**Perbezaan UI surfaces daripada warna foto/artwork:**

- Token tema hanya mengawal **permukaan UI** (bg, card, border, teks). Warna kandungan imej (foto produk, artwork dunia, maskot, logo) **bukan token** dan tidak ikut tema.
- **LARANGAN (TARGET_DESIGN):** jangan menukar, menint (tint), memfilter atau menggantikan aset imej untuk menyesuaikan tema. Aset asli dikekalkan seperti dalam brand-spec. Contoh rekod: `abangcolek-world-v2.webp` mengandung lime/purple yang ≠ token UI — itu sifat artwork, bukan isu token yang perlu "dibaiki".
- Landing dark surface values nyata (C.2): bg `#171614`, card `#24211b`, teks putih, muted `#d1cabc`, border `#4a4438` (OBSERVED_SOURCE).
- Workspaces dark: shadow `#00000018`, accent `#f0445e`, success/warning/danger text diterangkan semula (C.4) (OBSERVED_SOURCE).

---

## G. Accessibility

**Sasaran: WCAG 2.2 AA.** **Label status: "sasaran; belum diuji"** — jangan label pematuhan sudah tercapai. Pengesahan memerlukan ujian penuh mengikut gaya evidence `docs/design-qa.md` (commit/viewport/trace/limitations).

**Keperluan sasaran (dengan apa yang sedia ada dalam source sebagai OBSERVED_SOURCE):**

1. **Keyboard + visible focus:** semua interaksi boleh capaian papan kekunci. Semasa: outline 3px `--ui-accent` (workspace); gold ring (landing dunia). Keyboard scene control: PageUp/Down/Arrow pada dunia (OBSERVED_SOURCE).
2. **Semantic headings & landmarks:** `h1` hanya pada chapter 1 dalam current source (OBSERVED_SOURCE). TARGET_DESIGN: satu h1 per halaman/semantik landmark nav/main/footer dikekalkan.
3. **Dialog focus management:** mobile sidebar workspace — `role=dialog` + focus-trap + **inert** (corak sedia ada, OBSERVED_SOURCE). Dialog hotspot menyekat input scene semasa terbuka. Sasaran: focus return ke pemanggil selepas tutup.
4. **Labels & error association:** input berlabel; error `role=alert`; field wajib dinyatakan (FormPanel FieldDefinition; required state perlu kekal berhubung dengan input).
5. **Status bukan warna sahaja:** `aria-live` "Bab N daripada 6" pada dunia (OBSERVED_SOURCE); `aria-current=step` (chapter nav) dan `aria-current=page` (sidebar); `xp-status-*` sentiasa dengan teks + ikon, bukan warna sahaja; CopilotWorkspace badge guna `role=status`.
6. **Kawalan sentuh ≥44×44 CSS px = standard projek** (workspace button min-height 44px, landing nav min-height 44px — OBSERVED_SOURCE). Touch scene threshold semasa ≥45px (dunia).
7. **Reduced motion:** CSS kill switch `@media(prefers-reduced-motion:reduce)` (kill all transitions landing; workspace `scroll-behavior:auto`, tiada active transform); `staticMode` = reducedMotion || motionPaused || short viewport; motion toggle dalam UI (preserve scroll); pause off-screen & semasa dialog; film loop pause bila tiada penglihatan. (OBSERVED_SOURCE.)
8. **Contrast:** lihat C.5 — TARGET_DESIGN AA dengan pengiraan; HISTORICAL anggaran bukan audit.

**Belum diketahui / disekat:** keputusan ujian screen reader penuh, Core Web Vitals sebenar (sasaran LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 p75 — sasaran, bukan keputusan), dan paparan bab sasaran enam-bab yang belum dilaksana. Fallback: kekalkan corak sedia ada sehingga keputusan ujian ada.

---

## H. Governance

### H.1 Kaedah mencadangkan perubahan token

1. **Cadangan** — tulis cadangan (token, nilai semasa, nilai dicadangkan, sebab, pasangan teks/latar terlibat) dalam dokumen reka bentuk berkaitan (dokumen ini atau dokumen rakan) dengan label bukti.
2. **Pengesahan dalam dokumen ini** — cadangan direkod sebagai TARGET_DESIGN di sini (atau di seksyen relevan), termasuk **pengiraan kontras AA** bagi setiap pasangan teks/latar baharu. Tiada kelulusan diam-diam.
3. **Kemas kini CSS** — hanya selepas langkah 2: ubah CSS/komponen, kekal dalam keluarga token sedia ada, kemudian jalankan semakan mengikut `docs/design-qa.md` (commit, viewport, trace, limitations).

**Peraturan tetap:** tiada token baharu tanpa entri TARGET_DESIGN; literal hard-coded berulang diangkatkan ke token sedia ada; aset imej tidak diubah untuk tema; ejaan jenama tidak dinormalisasi.

### H.2 Dokumen yang wajib dikemas kini bila komponen berubah

| Perubahan | Dokumen wajib dikemas kini |
|---|---|
| Token warna/typography/spacing | `DESIGN.md` (seksyen C/D/E) + dokumen rakan berkenaan |
| Struktur/enam bab landing, storyboard | `docs/design/landing-page.md` |
| Komponen workspace, dialog/toast, roles/capability | `docs/design/workspaces.md` |
| Logo, aset brand, maskot, tagline | `docs/design/brand-spec.md` |
| Keputusan ujian/acceptance | `docs/design-qa.md` (gaya evidence: commit/viewport/trace/limitations) |
| Struktur implementasi bila bahan bukti berubah | pakej bukti kongsi (evidence pack) dikemas kini dahulu |

### H.3 Acceptance checklist (boleh diuji)

Ringkas dan padankan gaya evidence `docs/design-qa.md`. Setiap item perlu evidence: **commit/dirty manifest, viewport/browser, screenshot/trace, expected/actual, limitations.**

- [ ] Semua token yang dipapar berasal dari keluarga `--ac-*` (landing) atau `--ui-*` (workspace); tiada literal warna berulang baharu (source review).
- [ ] Setiap pasangan teks/latar baharu ada pengiraan WCAG 2.2 AA direkod (≥4.5:1 teks, ≥3:1 large/UI) — bukan kutipan HISTORICAL semata-mata.
- [ ] Hanya Outfit + DM Sans dimuatkan; tiada font ketiga (network/manifest check).
- [ ] Spacing komponen baharu mengikut 8px rhythm (atau pengecualian dinyatakan dengan sebab).
- [ ] Setiap komponen mempunyai lima keadaan: loading/empty/denied/error/success (source review + interaksi).
- [ ] Dark mode via `data-theme=dark` + localStorage `abangcolek-workspace-theme`; default dark; tiada `prefers-color-scheme` ditambah; aset imej tidak diubah untuk tema.
- [ ] Fokus papan kekunci kelihatan pada semua interaktif; dialog ada focus-trap + inert + focus return.
- [ ] Status tidak bergantung warna sahaja (teks + ikon + `aria-live`/`role=status`/`aria-current`).
- [ ] Sasaran sentuh ≥44×44 CSS px disemak pada viewport mobile.
- [ ] `prefers-reduced-motion` mematikan motion; motion toggle berfungsi; dunia pause off-screen dan semasa dialog.
- [ ] Approval ≠ execution dipapar berbeza; unknown kekal unknown; tiada klaim stok/harga tanpa rekod disahkan (BUSINESS_UNVERIFIED dilabel).
- [ ] Keputusan ujian dilabel "belum diuji" sehingga evidence lengkap wujud.

---

*Akhir dokumen. Kemas kini hanya melalui proses H.1.*
