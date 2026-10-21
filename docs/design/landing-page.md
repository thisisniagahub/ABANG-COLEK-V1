# ABANGCOLEK Landing Page Design Spec

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Kontrak sasaran kekal di bawah blueprint v2.4; scope reka bentuk dan keputusan tetap bukan bukti semua fungsi telah diimplementasi. Semak status per-ID dan environment sebelum mendakwa siap atau production-ready.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

**Status:** TARGET_DESIGN, 2026-10-19. Dokumen ini menetapkan reka bentuk sasaran landing public. Ia **bukan laporan status implementasi** — mekanik yang sedang wujud dalam source dilabel OBSERVED_SOURCE secara berasingan daripada sasaran.

**Autoriti:** [DESIGN.md](../../DESIGN.md) menetapkan asas visual bersama; [brand-spec.md](brand-spec.md) menetapkan aset, sumber dan batas penggunaan landing; [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [Source of Truth](../ABANGCOLEK-SOURCE-OF-TRUTH.md) menetapkan kekangan bisnes, keselamatan dan sistem. Jika dokumen bercanggah, keutamaan mengikut urutan tersebut untuk skop masing-masing.

**Batas bukti Emons:** Pemerhatian visual Emons (OBSERVED_VISUAL) berasaskan **5 screenshot statik** di `C:\EMONS` sahaja — tiada playback penuh dan tiada pemeriksaan rakaman `.mp4` telah dibuat. Semua rujukan mekanik Emons adalah inspirasi komposisi/mekanik, **bukan** salinan logo, copy, footage atau artwork Emons ke dalam aplikasi.

---

## 1. Konsep: "Dunia ABANGCOLEK bersama founder"

Landing public ialah **dunia miniature/isometric satu kesinambungan ruang** yang memperkenalkan jenama, produk dan founder — bukan slideshow kartu yang berpindah-bebas. Founder ialah penghubung cerita, selaras dengan dapatan bahawa akaun founder ialah "enjin reach, trust dan persona" (HISTORICAL, outputs/ABANGCOLEK_TIKTOK_FOUNDER_REVIEW.md).

### 1.1 Prinsip mekanik yang diadaptasi daripada Emons (OBSERVED_VISUAL — inspirasi sahaja)

| Prinsip | Maksud sasaran |
|---|---|
| One world, many cameras | Satu dunia berkesinambungan; bab = posisi kamera dalam dunia yang sama, bukan ilustrasi terpisah |
| Cutaway reveal | Bangunan/kenderaan miniature boleh "dibuka" untuk menunjukkan proses dalaman (contoh: dapur, semakan kualiti) |
| Hotspot "+" | 1–3 penanda bulat putih pada titik menarik; butiran terbuka atas tindakan |
| Expanding chapter rail | Pil bernombor yang kolap ke ikon dan mengembang ke ikon + label bila aktif |
| Persistent anchor card | Satu kad naratif kekal (posisi stabil) manakala dunia/kamera berubah di belakang |
| Text as world object | Label zon dicat ke permukaan dunia; teks berfungsi kekal di lapisan DOM |
| Brand-color scarcity | Persekitaran ~70% neutral; warna jenama (gold/red) ditegaskan hanya pada elemen utama |

### 1.2 Mekanik sasaran (TARGET_DESIGN)

- **Kesinambungan ruang** — transition menghubungkan scene secara spatial (jalan/tapak/latar bersambung), bukan crossfade berdiri-sendiri.
- **Scene aktif berloop** — scene yang dipilih berjalan secara berterusan (video loop atau ken-burns still) sehingga pengguna bergerak.
- **Controls pemilihan bab** — chapter rail + keyboard (PageUp/PageDown/Arrow) + touch swipe, seperti mekanik semasa.
- **Laluan terus ke produk** — pengguna TIDAK wajib menghabiskan cerita. Corak "Terus ke katalog" yang wujud dalam source (skip link ke `#catalogue` dengan pelepasan lock scene) dikekalkan sebagai keperluan; tiada perangkap scroll atau keyboard.
- **UI teks dan hotspot kekal DOM accessible** — semua teks, CTA dan hotspot ialah elemen DOM dengan label; teks tidak dibakar ke dalam imej.
- **Signature camera journey** — setiap bab mempunyai arah pergerakan kamera tersendiri (push-in, pan kiri/kanan/atas, pull-back penutup) supaya pergerakan dunia menjadi identiti landing; perjalanan sama boleh diterbitkan sebagai klip pendek untuk promosi. Mekanik per-scene dilaksanakan sebagai ken-burns arahan berbeza pada still (CSS sahaja) dan tiada dakwaan ia setara render 3D.
- **Media prerendered + lapisan DOM** — video/still prerendered dengan overlay DOM; **WebGL bukan keperluan** untuk mencapai konsep ini. Generasi world master map (peta induk) mendahului generasi scene supaya perspektif, lighting, skala dan style konsisten.

### 1.3 Mekanik semasa (OBSERVED_SOURCE) — bukan setara sasaran

Source semasa (`src/features/landing/ScrollWorldHero.tsx`, `scene-controller-model.ts`, `useSceneController.ts`) mempunyai **enam chapter** (`dapur`, `qc`, `stokis`, `penghantaran`, `komuniti`, `produk`) dengan crossfade still (1.1s) atau video `film.mp4` ber-timed-loop per scene, transition 680ms, wheel/touch/keyboard capture dengan clamp di hujung (native scroll dilepas), motion toggle, hotspot dialog, `aria-live` "Bab N daripada 6", dan `prefers-reduced-motion` kill switch. Mekanik ini **slideshow crossfade/zoom** — ia TIDAK dilabel sebagai setara kesinambungan dunia Emons dan bukan kekangan sasaran.

### 1.4 Sejarah struktur chapter

| Struktur | Sumber | Status |
|---|---|---|
| **Empat chapter** | brand-spec lama (konteks 2026-10-17) | HISTORICAL — rekod lama, bukan kekangan aktif |
| **Enam chapter sedia ada** (`dapur`, `qc`, `stokis`, `penghantaran`, `komuniti`, `produk`) | `ScrollWorldHero.tsx` | OBSERVED_SOURCE — implementasi semasa |
| **Enam bab sasaran** (Seksyen 4) | Dokumen ini | TARGET_DESIGN |

**Nota merge 2026-10-19:** proposal alternatif "Dari Buah ke First Bite" (produk-dahulu, proses, share booth) telah dibandingkan. Keputusan: produk-dahulu sudah terkandung dalam Bab 01; proses penyediaan digabungkan ke dalam Bab 03; suasana booth digabungkan ke Bab 04/05; signature camera journey dan roadmap keutamaan (Seksyen 9) diambil; **bab founder dikekalkan** kerana ia keputusan reka bentuk yang diluluskan dan aset trust utama jenama — proposal tanpa bab founder tidak diterima sepenuhnya.

---

## 2. Jerux sebagai fokus merchandising — arah yang dicadangkan daripada bukti

Jerux dijadikan **fokus merchandising landing** kerana bukti terkini menunjukkan ia produk paling aktif dan boleh dipesan:

- HISTORICAL (outputs/abangcolek-social-product-availability-2026-10-17.md, semakan 17 Okt 2026): THE FAMOUS JERUX "Masih aktif dan boleh dipesan" — pra-tempahan/made-to-order, ejen boleh simpan ready stock (Threads 11 Sep, 28–29 Sep, 7 Okt).
- HISTORICAL (SoT §6): visual "colek buah dalam cawan" dan "Sambal Colek dalam balang" disokong; keseluruhan SKU, harga dan availability semasa belum terbukti.

**Label wajib:** Ini ialah **arah reka bentuk yang dicadangkan daripada bukti** — ia **bukan pengesahan** bahawa bisnes menjual Jerux sahaja. Colek dan sambal kekal sebagai **kategori sokongan** yang tertakluk kepada katalog yang disahkan. Tiada dakwaan stok semasa boleh dibuat berdasarkan dokumen ini; paparan stok sentiasa dari data katalog server semasa (`/catalogue`).

---

## 3. Route sebenar (OBSERVED_SOURCE)

Semua CTA landing hanya boleh guna route berikut (daripada `LandingPage.tsx` + `routes.ts`). Route lain yang muncul dalam dokumen ini dilabel TARGET_DESIGN / NOT_IMPLEMENTED.

| Route | Fungsi semasa |
|---|---|
| `/` | Landing home + world hero |
| `/products`, `/products/:id` | Katalog / detail produk |
| `/locations` | Lokasi pickup (data `/public-info`) |
| `/become-dealer` | Info pendaftaran ejen |
| `/flows/order?product=<id>&ref=&phone=` | Flow order produk (disabled bila `availableQuantity < 1`) |
| `/flows/dealer-application` | Borang pendaftaran ejen |
| `/customer/business` | Permohonan business/dealer |
| `/customer/orders`, `/customer/cases` | Orders & cases customer |
| `/help`, `/login` | Bantuan, login |

**TARGET_DESIGN — Commerce & Growth 21 Oktober:** setiap Agent/Stokis aktif menerima public store sasaran `/kedai/:slug` dan private Dealer Workspace pada platform sama. Ini belum route/provisioning yang dibuktikan jadual source di atas. Published store boleh dibrowse anonymous; private management/order/statement memerlukan scope server. CTA pendaftaran dealer membenarkan daftar terus tanpa pembelian terdahulu. Query `ref`/`phone` dalam route lama bukan authority store owner, referrer eligibility, fulfiller atau payee.

Ikut [spesifikasi commerce](commerce-growth.md): entry landing/HQ/dealer mengekalkan identiti store, seller dan sumber fulfilment sebenar hingga checkout/tracking. Reorder membuat cart baharu dengan harga/stok/polisi semasa; share biasa tidak memberi reward. Referral pelanggan satu peringkat dua hala hanya mengikut polisi approved, berasingan daripada margin/komisen/points; lima tingkat Ahmad’s kekal research. Ordering P0 → rewards P1 → retention P2 ialah urutan domain selepas prerequisite runtime/integriti. Top-up, cash withdrawal dan native wajib deferred; jangan tambah CTA yang menjanjikan ciri atau reward belum tersedia.

---

## 4. Enam bab sasaran (TARGET_DESIGN)

Setiap bab di bawah mempunyai jadual 16 medan wajib. Aset packaging/foto mesti mematuhi [brand-spec.md](brand-spec.md) (sumber terkawal, attribution, tiada aset Emons).

### 4.1 Pasangan token sasaran per elemen (tanpa token baharu)

Semua warna menggunakan token sedia ada daripada [DESIGN.md](../../DESIGN.md) (keluarga `--ac-*`). Keadaan gelap menggunakan nilai dark yang direkodkan dalam source. **Tiada pasangan baharu; setiap penggunaan pada permukaan luar nilai sedia ada wajib melalui pengiraan WCAG 2.2 AA sebelum implement** (lihat DESIGN.md §C.5).

| Elemen | Token yang digunakan |
|---|---|
| Panggung dunia (scene bg) | `--ac-brand-ink` + scrim `#111115` (nilai sedia ada, diangkatkan ke token `--ac-world-*` apabila disusun semula) |
| Teks utama atas dunia | `--ac-world-ink` (white) atas ink/scrim |
| Teks sekunder atas dunia | `--ac-world-muted` |
| Anchor card | `--ac-card` + `--ac-text` + border `--ac-border` (mengikut tema) |
| CTA utama | `--ac-brand-gold` dengan teks ink (pasangan 10.84:1 rekod sedia ada) |
| CTA gelap | `--ac-brand-red` dengan teks `--ac-brand-white` (4.89:1 rekod sedia ada) |
| Chapter rail aktif | gold + teks `#182009` (nilai sedia ada) |
| Hotspot & dialog | nilai sedia ada (dialog `#201d17`/`#5a5040`, hover `#ffd979`) |
| Fokus papan kekunci | ring gold (`--ac-brand-gold`) |

### Bab 01 — Dunia ABANGCOLEK

| Medan | Spesifikasi |
|---|---|
| Tujuan pengguna | Memahami jenama dalam <10 detik: apa ABANGCOLEK, siapa di sebaliknya |
| Produk/entity | Packaging Jerux sebenar yang disahkan + logo + maskot |
| Scene composition | Miniature dunia ABANGCOLEK: gerai/kedai buah miniature dengan packaging balang Jerux di hadapan; elemen neutral dominan, accent gold/red pada produk |
| Kamera | Aerial 3/4 tinggi, slow push-in ringan ke arah gerai; tiada pergerakan mengejut |
| Loop | Ken-burns perlahan atau video loop ≤10s; pause bila dialog hotspot terbuka atau off-screen |
| Transition masuk/keluar | Masuk: fade dunia dari poster. Keluar: pan kamera bersebelahan ke Bab 02 (jalan menghubungkan gerai ke meja buah) |
| Copy sasaran | "Dunia ABANGCOLEK" + "Colek, jeruk dan sambal — dibuat dengan tangan, dijaga dengan kualiti." Kandidat ujian tambahan (belum keputusan jenama, BUSINESS_UNVERIFIED): "Sekali colek. Terus teringat." |
| Hotspot | 2: (1) packaging Jerux → butiran produk; (2) gerai → story jenama ringkas |
| CTA | "Jom pilih produk" → `/products` |
| Route | `/` (wujud, OBSERVED_SOURCE) |
| Aset diperlukan | Master world map; scene render; packaging Jerux daripada sumber terkawal; logo sedia ada `abang-colex-logo-original.webp` |
| Sumber/bukti | Availability report (HISTORICAL — Jerux aktif/orderable); SoT visual balang/cawan; brand-spec assets |
| Desktop framing | World full-bleed; anchor card bottom-left ~30% lebar; chapter rail bottom |
| Mobile framing | Komposisi portrait: produk di tengah atas, anchor card bawah, rail horizontal scrollable |
| Static/reduced-motion fallback | Stack statik semua chapter + still scene; tiada video/hotspot interaktif |
| Acceptance | Poster muncul ≤1.5s pada rangkaian sasaran; h1 tunggal; hotspot keyboard-accessible; reduced-motion mematikan semua animasi |

### Bab 02 — Pilih Buah Anda

| Medan | Spesifikasi |
|---|---|
| Tujuan pengguna | Kenal varian buah dan pilih yang diingini |
| Produk/entity | Varian daripada katalog aktif (`/catalogue`) |
| Scene composition | Meja/gerai miniature dengan bekas buah colek; tiada teks varian dibakar ke imej — nama varian di DOM |
| Kamera | Push-in sederhana ke meja; orbit kecil ±5° untuk kedalaman |
| Loop | Ken-burns atau loop pendek; tiada autoplay audio |
| Transition masuk/keluar | Masuk: pan dari gerai Bab 01 sepanjang "jalan" ke meja. Keluar: pan ke dapur Bab 03 |
| Copy sasaran | "Pilih buah anda" + senarai varian dari katalog semasa |
| Hotspot | 1 per varian yang dipaparkan (maks 3), mengikut katalog server |
| CTA | "Lihat katalog" → `/products` |
| Route | `/products` (wujud, OBSERVED_SOURCE) |
| Aset diperlukan | Scene render meja; foto produk sebenar untuk kad (bukan dalam scene) |
| Sumber/bukti | Bukti minimum sejarah varian — mangga, rambutan, nenas, jambu, kedondong (HISTORICAL, availability report 17 Okt: mangga 11 Sep; rambutan+nenas dibeli pelanggan 11 Sep; jambu ~16 Okt; kedondong dipromosi 3 Okt). **Ini bukan katalog penuh dan bukan pengesahan stok semasa** — paparan sentiasa dari `/catalogue` |
| Desktop framing | Scene kiri, kad varian kanan atau anchor card |
| Mobile framing | Scene atas, kad varian carousel horizontal di bawah |
| Static/reduced-motion fallback | Still + senarai varian DOM |
| Acceptance | Varian dipaparkan hanya bila wujud dalam katalog server; tiada varian sosial dipaparkan sebagai stok tanpa data katalog |

**Fallback katalog kosong:** Jika `/catalogue` tiada data (SoT: snapshot platform `catalogue0/products0`), bab ini render kandungan editorial sosial berlabel jelas (contoh: "Pernah dipesan di media sosial") **tanpa** dakwaan stok, dan CTA kekal mengarah ke `/products` yang menunjukkan keadaan sebenar.

### Bab 03 — Rasa & Reaksi

| Medan | Spesifikasi |
|---|---|
| Tujuan pengguna | Nampak tekstur sebenar dan reaksi pelanggan sebenar (sensory proof) |
| Produk/entity | Tekstur kuah colek/jeruk; klip reaksi pelanggan |
| Scene composition | Cutaway dapur/gerai dengan skrin "paparan media" dalam dunia; kad media DOM di atas. **Merge:** proses penyediaan (menghiris, mengisi, menutup cawan) dipaparkan sebagai latar composition bab ini — proses dan reaksi bina keyakinan dalam satu bab |
| Kamera | Push-in ke zon cutaway; kamera stabil |
| Loop | Loop pendek klip media; pause off-screen |
| Transition masuk/keluar | Masuk: pan dari meja ke dapur cutaway. Keluar: pull-back + pan ke zon founder Bab 04 |
| Copy sasaran | "Rasa sekali, jatuh cinta selamanya" + kapsyen reaksi (dari kandungan yang diberi kebenaran) |
| Hotspot | 1: skrin media → galeri reaksi |
| CTA | "Lihat katalog" → `/products` |
| Route | `/products` (wujud); galeri media = NOT_IMPLEMENTED |
| Aset diperlukan | Klip/gambar tekstur dan reaksi **dengan attribution + kebenaran owner** (rentetan sedia ada `requiresOwnerPriceApproval` sebagai corak) |
| Sumber/bukti | TikTok review (HISTORICAL): reaksi pelanggan = "aset conversion yang kuat"; sensory proof close-up kuah |
| Desktop framing | Media grid 2–3 kad di kanan scene |
| Mobile framing | Media stack menegak di bawah scene |
| Static/reduced-motion fallback | Still frame + kapsyen DOM |
| Acceptance | Setiap media ada attribution; tiada media tayang tanpa kebenaran owner; audio hanya atas tindakan pengguna |

**BUSINESS_UNVERIFIED:** Hak siar lanjut media sosial (redistribution, crop, edit) belum disahkan — gate: kebenaran owner per rekod sebelum aset dipromosikan ke media landing utama. Fallback: gunakan hanya screenshot rekod berattribution dengan pemotongan minimal.

### Bab 04 — Kenal Founder

| Medan | Spesifikasi |
|---|---|
| Tujuan pengguna | Kenal wajah dan personaliti jenama (trust) |
| Produk/entity | Founder (foto/video sedia ada) + maskot |
| Scene composition | Zon "pentas kecil" dalam dunia dengan maskot; suasana booth/lepak dari proposal digabungkan di sini (komuniti sebagai konteks founder); foto founder dalam kad DOM (bukan di dalam scene render) |
| Kamera | Pull-back lembut untuk nampak figur founder/maskot dalam dunia |
| Loop | Ken-burns lembut |
| Transition masuk/keluar | Masuk: pan ke pentas. Keluar: pan sepanjang jalan ke zona penghantaran Bab 05 |
| Copy sasaran | "Kenal founder" + peranan "Founder | Motivator" + cerita ringkas HANYA daripada fakta yang founder luluskan |
| Hotspot | 1: maskot → pengenalan watak |
| CTA | "Ikuti di TikTok" → `https://www.tiktok.com/@styloairpool` (sumber semasa menggunakan URL video spesifik; sasaran guna profil — disemak semasa implementasi) |
| Route | External TikTok (wujud, OBSERVED_SOURCE) |
| Aset diperlukan | `FOUNDER.png`/`FOUNDER2.png`, `MASKOT-LOGO.PNG`, `MASKOT-1..5.PNG` (sedia ada; lihat brand-spec untuk isu case-sensitivity `founder.png`) |
| Sumber/bukti | Brand assets (OBSERVED_SOURCE); identiti founder daripada laporan sosial (HISTORICAL) |
| Desktop framing | Kad founder dalam anchor card, scene di belakang |
| Mobile framing | Kad founder penuh lebar di bawah scene |
| Static/reduced-motion fallback | Still + kad founder DOM |
| Acceptance | Tiada biodata, petikan atau pengiktirafan yang direka; semua fakta founder dalam copy boleh dijejaki ke sumber yang diluluskan |

**BUSINESS_UNVERIFIED:** Paparan nama founder. Gate: kelulusan founder atas nama + ejaan. Fallback: gunakan peranan "Founder | Motivator" tanpa nama (corak bio semasa).

### Bab 05 — Dapatkan Jerux Anda

| Medan | Spesifikasi |
|---|---|
| Tujuan pengguna | Tahu cara order, di mana ambil, dan bagaimana penghantaran berlaku |
| Produk/entity | Jerux; lokasi pickup; flow order |
| Scene composition | Zon pickup miniature (pump stesen-like) + kenderaan penghantaran dengan label jenama dicat ke badan (world object) |
| Kamera | Orbit rendah melalui zon pickup ke kenderaan |
| Loop | Kenderaan bergerak slow dalam loop (jika video); else ken-burns |
| Transition masuk/keluar | Masuk: pan dari pentas ke jalan utama. Keluar: pan ke "stor" Bab 06 |
| Copy sasaran | "Dapatkan Jerux anda" + cara order (pra-tempahan/made-to-order mengikut rekod disahkan) |
| Hotspot | 2: (1) lokasi pickup → senarai lokasi; (2) kenderaan → cara order |
| CTA | "Order sekarang" → `/flows/order?product=<id>` (produk id semasa dari katalog) + "Lihat lokasi" → `/locations` |
| Route | `/flows/order`, `/locations` (wujud, OBSERVED_SOURCE) |
| Aset diperlukan | Scene zon pickup; senarai lokasi dari `/public-info` |
| Sumber/bukti | Ready stock berdate: PETRONAS Bukit Antarabangsa (IG 23 Sep), PETRONAS Rasah Seremban (Threads ~16 Okt) — HISTORICAL; order awal Kuching/Sibu (IG 29 Ogos) — HISTORICAL |
| Desktop framing | Kad lokasi di kanan scene |
| Mobile framing | Kad lokasi stack bawah |
| Static/reduced-motion fallback | Still + senarai lokasi DOM |
| Acceptance | Lokasi dipaparkan dari data server semasa; tiada lokasi sosial dipaparkan sebagai aktif tanpa rekod `/public-info`; tiada dakwaan stok lokasi tanpa pengesahan |

**Event:** DEPOCO 10–14 Jun 2026 ialah **HISTORICAL** (acara lepas). Event hanya muncul sebagai sokongan/sejarah (contoh: badge "Pernah hadir di DEPOCO 2026") **kecuali** jadual acara aktif disahkan oleh founder/ops (BUSINESS_UNVERIFIED). Fallback: tiada modul event dalam landing sehingga disahkan.

### Bab 06 — Pilihan & Pesanan

| Medan | Spesifikasi |
|---|---|
| Tujuan pengguna | Nampak lineup aktif dan terus ke laluan pembelian sebenar |
| Produk/entity | Katalog aktif penuh; colek/sambal sebagai kategori sokongan mengikut katalog disahkan |
| Scene composition | Zon "stor/galeri" miniature dengan rak produk; kad produk sebenar (foto makanan sebenar + data `/catalogue`) di DOM overlay |
| Kamera | Pull-back akhir yang menutup dunia (kamera menarik ke belakang memperlihat keseluruhan dunia) |
| Loop | Statis atau ken-burns minimum |
| Transition masuk/keluar | Masuk: pan ke stor. Keluar: tiada — bab akhir boleh paut balik ke mana-mana bab |
| Copy sasaran | "Pilihan & pesanan" + lineup semasa |
| Hotspot | 1: rak → katalog penuh |
| CTA | "Pesan sekarang" → `/flows/order?product=<id>`; "Jadi ejen / stokis" → `/become-dealer` (CTA berasingan) |
| Route | `/flows/order`, `/become-dealer`, `/flows/dealer-application`, `/customer/business` (wujud, OBSERVED_SOURCE) |
| Aset diperlukan | Foto produk sebenar dari katalog; scene stor |
| Sumber/bukti | Availability report (HISTORICAL): Jerux orderable; colek/sambal status belum disahkan — paparan mengikut katalog server |
| Desktop framing | Grid kad produk di atas scene statik ringan |
| Mobile framing | Senarai kad produk penuh lebar |
| Static/reduced-motion fallback | Grid produk statik penuh |
| Acceptance | Kad produk = data `/catalogue` semasa (harga `priceSen`, `availableQuantity`); disabled bila stok <1; pendaftaran ejen TIDAK digabung dengan flow pembelian |

---

## 5. Media & aset

- **Packaging dan logo** hanya daripada sumber terkawal (lihat [brand-spec.md](brand-spec.md)); tiada imbasan semula daripada media sosial untuk aset utama.
- **Peta induk dunia (parent map)** wajib direka/diluluskan dahulu; scene diperoleh daripadanya supaya lighting, skala, perspektif dan style konsisten antara bab.
- **Teks label kekal di DOM.** Jangan generasi teks (nama produk, harga, label zon berfungsi) ke dalam imej — teks berubah akan memerlukan re-generasi. Teks dekoratif world-object (contoh nama di bumbung) dibenarkan dalam artwork statik yang diluluskan.
- **Foto makanan sebenar** digunakan dalam kad produk; visual miniature dunia **bukan** bukti rupa tepat produk yang diterima pembeli (nyatakan dalam caption bila perlu).
- **Video semasa** (`public/assets/world/film.mp4`, OBSERVED_SOURCE) ialah mekanik peralihan semasa — **tiada dakwaan** ia memenuhi sasaran kesinambungan dunia ini.
- Media sosial yang digunakan wajib ada attribution dan kebenaran owner (rentetan `historicalOnly`/`requiresOwnerPriceApproval` dalam `brand-assets.ts` sebagai corak pengurusan).

## 6. Mobile & performance (TARGET_DESIGN)

- **Komposisi portrait khusus** — bukan crop desktop: elemen utama dalam 60% atas, anchor card di bawah, chapter rail horizontal scrollable (corak reflow ≤750px semasa dikekalkan sebagai asas).
- **Poster yang cepat muncul** — poster scene dipaparkan sebelum video/still penuh sedia.
- **Tiada audio automatik**; audio hanya atas tindakan pengguna.
- **Pause dan reduced motion** — `prefers-reduced-motion` mematikan semua animasi; motion toggle; pause bila off-screen atau dialog terbuka (semua wujud dalam source sebagai corak — dikekalkan).
- **Tiada kewajipan menghabiskan cerita**; tiada perangkap scroll/keyboard (source semasa melepaskan native scroll di hujung scene — kekalkan sebagai keperluan).
- **Strategi video mengikut viewport dan keupayaan** — `SHORT_VIEWPORT_QUERY` memaksa static mode pada viewport pendek/mobile; kegagalan film → stills → fallback world image; video hanya dimuat bila scene motion aktif.
- **Core Web Vitals (SASARAN, bukan keputusan):** LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 pada p75.
- **Asset budget (PROVISIONAL — perlu diuji pada peranti/rangkaian wakil sebelum dikunci):** poster ≤120KB; scene still ≤250KB setiap satu; film ≤6MB; muatan awal landing ≤2MB.

## 7. Perkongsian "Geng Jerux Kau" (TARGET_DESIGN — diimplement)

Satu interaksi perkongsian pilihan. **Status implementasi (2026-10-19):** component `src/features/landing/GengColekShare.tsx` telah dilaksanakan client-side — pilihan produk sebenar (radio group) → kad preview DOM (logo, nama, harga semasa, pautan) → `navigator.share` dengan fallback clipboard → status inline. Pautan balik ke `/products/:id`. Belum melalui QA runtime/browser (lihat Seksyen 10).

1. Pengguna memilih **produk sebenar** daripada katalog.
2. Sistem menjana **kad preview** (produk + nama + harga semasa + pautan).
3. **Share hanya atas tindakan pengguna** (butang share).
4. Pautan dibawa **balik ke pilihan produk** (route produk sasaran; mekanik deep-link sahaja selepas route wujud).
5. **Tiada** ganjaran, hadiah, leaderboard atau tuntutan promosi yang direka.
6. Interaksi ini **tidak menyekat pembelian** — laluan order biasa sentiasa tersedia.

Apa yang belum diketahui: format kad share (imej statik vs OG tags) dan endpoint share. Sumber diperlukan: keputusan implementasi + OG metadata. Bahagian disekat: mana-mana UI share. Fallback dibenarkan: share pautan produk biasa tanpa kad preview.

## 8. Measurement (TARGET_DESIGN — NOT_IMPLEMENTED)

Tiada analytics event dalam source semasa. Susunan acara sasaran:

| Acara | Definisi | Nota |
|---|---|---|
| `explore_start` | Interaksi pertama dengan dunia | Mula teroka |
| `chapter_select` | Pilih bab | Termasuk via rail/keyboard/touch |
| `hotspot_open` | Buka hotspot | Per hotspot id |
| `product_select` | Pilih produk | Dari bab/kad |
| `order_click` | Klik order | Bukan pembelian |
| `cart_add` | Tambah ke troli | **HANYA jika fungsi troli wujud — kini tiada troli dalam source** |
| `purchase` | Pembelian | **Berdasarkan receipt sebenar server**, bukan redirect browser |
| `dealer_or_location_click` | Klik ejen/lokasi | |
| `share_preview_open` | Buka preview share | |
| `share_action` | Tindakan share | **Bezakan klik share daripada perkongsian yang benar-benar berjaya** (sahkan callback/hitungan platform sebelum mengklaim kejayaan) |

Prinsip: views/jangkauan media sosial TIDAK disamakan dengan jualan; pembelian hanya dari receipt sebenar (selaras design-qa dan blueprint).

## 9. Keutamaan implementasi (roadmap)

1. **Sahkan asas** — katalog/packaging/palet jenama yang disahkan + peta induk dunia (master map) diluluskan sebelum generasi scene lanjut. Mengelakkan visual cantik yang tersasar daripada ABANGCOLEK.
2. **Satu opening + satu transition** pada desktop dan mobile — buktikan kualiti arah visual sebelum menghasilkan seluruh dunia.
3. **Lengkapkan bab, hotspot dan pembelian** — jadikan pengalaman berguna serta boleh menjual.
4. **Kad perkongsian dan klip kempen** — beri sebab serta bahan untuk orang berkongsi (share card telah diimplement client-side; klip kempen daripada signature camera journey).
5. **Ukur** klik produk, tambah ke troli (jika wujud), pembelian dan perkongsian — nilai sama ada pengalaman menghasilkan tindakan.

Status pelaksanaan langkah 3–4 pada 2026-10-19: struktur enam bab sasaran, hotspot content, camera journey CSS dan share card telah diimplement dalam source (lihat `ScrollWorldHero.tsx`, `WorldHotspot.tsx`, `GengColekShare.tsx`, `scroll-world.css`, `landing.css`) — belum melalui QA runtime.

## 10. Acceptance criteria keseluruhan

1. Semua CTA mengarah ke route dalam Seksyen 3 sahaja; tiada route direka.
2. Enam bab sasaran hadir dengan jadual 16 medan lengkap setiap satu; mekanik semasa dilabel OBSERVED_SOURCE, bukan dakwaan sasaran terpenuhi.
3. Paparan produk/stok **semestinya** dari katalog server semasa; kandungan sosial hanya editorial berlabel bila katalog kosong.
4. Tiada dakwaan stok aktif, tiada dakwaan Jerux satu-satunya produk, tiada event aktif tanpa jadual disahkan.
5. Semua teks/hotspot/CTA adalah DOM accessible; tiada teks berfungsi di dalam imej.
6. Reduced motion + pause + skip-to-catalog berfungsi; tiada perangkap scroll/keyboard.
7. CWV dan asset budget dilabel SASARAN/PROVISIONAL; pengesahan sebenar pada peranti/rangkaian wakil adalah prasyarat penguncian angka.
8. Semua media ada attribution; kebenaran owner direkod sebelum aset naik ke landing utama.
9. Measurement acara dilabel NOT_IMPLEMENTED sehingga diimplement; purchase hanya dari receipt.
