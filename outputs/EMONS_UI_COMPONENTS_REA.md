<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** REKOD SEJARAH / RUJUKAN — pemerhatian, metrik ujian, status deployment, harga/model dan cadangan di bawah terikat kepada tarikh serta skop asal. Ia bukan checklist execution semasa atau pengesahan bahawa dapatan masih benar. Kekalkan bukti asal; revalidate sebelum mendakwa fixed, connected atau production-ready.
>
> Rujukan semasa: [Master Growth Blueprint](../docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../docs/prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# REA CLI — Inventori komponen UI EMONS

**Sasaran:** https://www.emons.de/en  
**Tarikh pemeriksaan:** 17 Oktober 2026  
**REA CLI:** 6.5.0  
**Kaedah:** pemeriksaan DOM/accessibility pasif + analisis statik bundle; susulan berupa senario klik lima pautan kategori hero dan perbandingan transform setiap section. Screenshot tidak diperlukan untuk pemetaan ini.

## Pelaksanaan dan bukti

| Operasi | Keputusan | Evidence ID |
|---|---|---|
| `inspect-web-page` — DOM, accessibility tree dan bentuk body JSON | Berjaya, exit code 0; 3,215 nod DOM dan 2,010 nod accessibility | `ev_a1ac59d7fc71f4a7261a083f2906e88a193f565e62b5c8022ebd783cbcbbf43` |
| `analyze-web-bundle` — analisis statik skrip halaman | Berjaya, exit code 0; 13 skrip dikumpulkan | `ev_309eccb376f00b3b7fe3d94f1e6df3e2aa2e4370e7095385493b015e47362e6` |
| Scenario browser — identiti tab berita dan lima pautan hero | Berjaya; lima pautan diaktifkan berasingan; section sepadan diperiksa selepas setiap activation | `ev_ff197f0993486c23e036d211982b240cdd47735794208820a4a26314022991a7` |

Pemeriksaan dihadkan kepada origin `https://www.emons.de`. JSON Evidence penuh disimpan dalam folder kerja REA:

- `.work/rea/emons-ui-page-evidence.json`
- `.work/rea/emons-ui-bundle-evidence.json`
- `.work/rea/emons-hero-tabs-dom-evidence.json`
- `.work/rea/emons-hero-tabs-evidence.json`

## Komponen UI utama yang dikenal pasti

| Komponen | Bukti daripada DOM/accessibility | Catatan |
|---|---|---|
| Cookie consent | Tajuk “Cookie settings”; butang “Accept all cookies”, “Reject all cookies”, “Cookie settings” dan “Cookie Banner schließen”; kategori consent turut wujud | Keadaan/pilihan cookie tidak diubah. |
| Header dan navigasi | Satu landmark `navigation`; butang dropdown `Services`, `Customer Area`, `Company`; pemilih `EN`; pautan `Contact` dan `Careers` | Dropdown direkodkan `expanded=false` dengan `hasPopup=menu`. |
| Carian | Satu `searchbox` bernama “Enter search term” | Medan ini ialah kawalan carian yang didedahkan dalam accessibility tree. |
| Hero | Satu H1: “Emons - your forwarding company for transport & logistics”; satu elemen `<video>` dengan `poster`, `muted` dan `playsinline`; imej mempunyai alt “Red Emons truck based on Mercedes-Benz Actros — modern freight truck for national and international transport” | DOM menyokong adanya media hero; tidak digunakan untuk membuat tuntutan warna atau komposisi visual. |
| Kawalan kategori hero | Lima pautan `<a class="btn_anim_wrap" href="#">`: “01 Road”, “02 Logistics”, “03 Air & Sea”, “04 Rail”, “05 Digital”. Attribute `data-video-section="0"` hingga `"4"` berada pada section `#hero_first` hingga `#hero_fifth`, bukan pada pautan. Klik terkawal setiap pautan menggerakkan section padan ke transform `translateY(0)`. | Snapshot mendedahkan kawalan sebagai `link`; tiada hubungan ARIA ke panel atau `aria-selected`/`aria-current`. Ini bukan ARIA tabs. |
| CTA hero | Dua pautan di bawah heading hero muncul tanpa nama aksesibiliti dalam tangkapan REA ini; pautan “All Services” turut ditemui berasingan | Label dua pautan itu tidak diteka daripada bukti ini. Ini berpotensi isu accessible-name. |
| Pengenalan/benefit | Heading “Your cargo. Our mission. Welcome to Emons.”, “Our wide”, “Freight forwarding for general cargo, part loads, and full loads”, serta “Warehousing and Distribution”; tiga subheading menerangkan express/scheduled, part/full loads dan general cargo | Susunan heading menunjukkan beberapa blok penerangan perkhidmatan. |
| Senarai penyelesaian | Heading “Your experts for reliable transport and logistics solutions”, diikuti Road, Rail, Air, Sea, Customs, Logistics, Digital solutions dan Other benefits; pautan `Learn more` untuk kategori | Lapan blok/kategori perkhidmatan dikenal pasti. |
| Pintasan pelanggan dan CTA | Pautan “Shipment tracking”, “Freight request”, “Request a freight quote” dan “Learn more about our logistics solutions” | Elemen pautan berasingan daripada kawalan menu. |
| FAQ | Heading “Häufige Fragen rund um Spedition und Transport”; dua butang accordion bertanya tentang kerja syarikat forwarding dan negara operasi EMONS | Heading FAQ berbahasa Jerman walaupun URL `/en`. |
| Berita | Heading “Latest news from the Emons world”; region “Image Slider”; kawalan “Back” dan “Weiter”; beberapa pautan artikel | Satu tajuk artikel turut berbahasa Jerman: “Serap Güler auf Sommertour bei der Emons Spedition”. |
| Footer | Pautan telefon, Facebook, Instagram, LinkedIn, YouTube, imprint, data protection, whistleblower system, terms, ADSP dan ADR | Dikenal pasti daripada accessibility tree. |

## Penemuan teknikal dan batasan

- `/en` memaparkan kandungan bercampur bahasa dalam Evidence ini: H1 hero berbahasa Inggeris, tetapi perenggan hero yang direkodkan REA ialah Jerman: “Emons ist Ihre Spedition für Transport und Logistik – global, vernetzt und effizient…”. Heading FAQ dan satu tajuk berita juga berbahasa Jerman.
- Struktur semantik merangkumi satu `main`, satu landmark `navigation`, satu `tablist` dengan lima `tab` **dalam slider berita yang berasingan**, lima pautan kategori hero, satu `searchbox`, 27 heading, 79 pautan dan 13 butang bukan ignored dalam rekod yang dianalisis. Tab berita bukan kawalan kategori hero. Pemetaan hero dibuktikan melalui aktivasi terkawal dan transform section, bukan atribut pautan atau hubungan ARIA.
- Bundle Evidence mempunyai satu edge `require` dengan specifier `ix3`; tiada route atau endpoint statik yang dilaporkan. Beberapa string dikelaskan sebagai calon endpoint berkeyakinan rendah—ia **bukan** bukti komponen UI dan tidak digunakan dalam inventori ini.
- REA tidak menghasilkan nama dalaman komponen framework seperti React/Vue. Oleh itu senarai ini ialah **inventori komponen UI semantik/DOM**, bukannya peta nama komponen source-code.
- Satu pengecam `data-wf-*`/`data-w-id` hadir pada DOM. Ini petunjuk markup bergaya Webflow, tetapi tidak membuktikan keseluruhan implementasi atau framework tanpa sumber tambahan.
