<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** REKOD SEJARAH / RUJUKAN — pemerhatian, metrik ujian, status deployment, harga/model dan cadangan di bawah terikat kepada tarikh serta skop asal. Ia bukan checklist execution semasa atau pengesahan bahawa dapatan masih benar. Kekalkan bukti asal; revalidate sebelum mendakwa fixed, connected atau production-ready.
>
> Rujukan semasa: [Master Growth Blueprint](../docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../docs/prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Semakan Menyeluruh ABANGCOLEK

Tarikh semakan: 15 Oktober 2026

## Kesimpulan paling penting

**ABANGCOLEK mempunyai dua lapisan yang berbeza tetapi berkaitan:**

1. **Jenama F&B:** produk colek buah dan sambal/colek dalam balang, dengan sejarah kandungan berkaitan jeruk, mangga, gerai pop-up, festival dan jualan sosial.
2. **ABANGCOLEK-OS / ABANGCOLEK Platform:** aplikasi operasi bisnes lokal untuk mengurus customer, staff, founder, developer, produk, pesanan, stok, ejen/stokis, kualiti, marketing, dokumen, laporan dan automasi.

Jadi, Abangcolek bukan sekadar “sambal” dan bukan sekadar “aplikasi”. Ia ialah **ekosistem jenama + sistem operasi bisnes** yang sedang dibina.

## Skop semakan

Saya membuat inventori terhadap:

- `D:\ABANGCOLEK-PLATFORM`
- Desktop
- Documents
- Downloads
- Tab Gemini dan Facebook yang sudah dibuka dalam In-App Browser

Inventori awal merangkumi kira-kira **4,633 fail** di empat lokasi tersebut. Bacaan mendalam difokuskan kepada README, source-of-truth, pelan discovery, laporan audit/research, route aplikasi, data repositori, aset jenama dan rekod Facebook yang sedang kelihatan.

Saya **tidak membaca kata laluan, cookies, token sesi, Login Data, Web Data atau Local State**. Tiada posting Facebook diterbitkan, tiada mesej dihantar dan tiada data akaun diubah.

Tiada fail bernama atau kandungan teks yang jelas menyebut Abangcolek ditemui dalam Desktop, Documents atau Downloads di luar folder projek. Data paling bermakna berada dalam `D:\ABANGCOLEK-PLATFORM`.

## Apa yang disahkan tentang jenama

### Produk yang mempunyai bukti visual

Dua bentuk produk mempunyai bukti paling kukuh dalam aset dan research lokal:

- **Colek buah siap makan dalam cawan** berlabel “ABANG COLEX”, dengan buah potong dan sos colek pekat dituangkan di atasnya.
- **Sambal Colek dalam balang** dengan penutup hitam dan label merah jambu.

Bukti ini tidak cukup untuk menetapkan nama SKU rasmi, berat, isipadu, harga, variasi rasa atau stok semasa.

### Identiti sosial yang ditemui

Research lokal merekodkan kaitan berikut:

- `@styloairpool` sebagai handle sosial utama yang dikaitkan dengan ABANGCOLEK/STYLOAIRPOOL.
- `@airpoolstylo` sebagai identiti sejarah/berkaitan dalam kandungan Instagram dan jeruk/mangga.
- `@abangcolek` sebagai calon handle Instagram, tetapi hubungan rasmi tidak disahkan sepenuhnya dalam research lama.
- LIURLELEH / LIUR LELEH HOUSE dan JERUX/The Famous Jerux muncul sebagai entiti berkaitan atau dikaji bersama, tetapi pemilikan dan hubungan semasa tidak boleh dianggap automatik.

### Positioning jenama

Daripada copy, aset dan struktur aplikasi, positioning yang muncul ialah:

- rasa pedas-manis yang kuat dan mudah diingati;
- produk colek buah dan sambal sebagai pengalaman sosial, bukan hanya barang runcit;
- jualan melalui booth, pop-up, festival, kandungan TikTok dan rangkaian ejen/stokis;
- gaya komunikasi santai, berani, mesra dan berorientasikan reaksi pelanggan;
- slogan yang berulang dalam source: “Rasa Sekali, Jatuh Cinta Selamanya”, “PEDAS MANIS LIKAT MELEKAT”, “Pedas Tapi Puas” dan “Bukan Calang-Calang Pedas”.

## Apa itu ABANGCOLEK-OS

Platform lokal menggunakan **React/Vite + Bun + SQLite**, dengan API backend sebagai authority. Ia bukan sekadar dashboard mockup.

Empat pengalaman utama ialah:

- **Public:** landing page, katalog produk published, lokasi, permohonan dealer dan bantuan.
- **Customer:** pembelian, pesanan sendiri, bukti bayaran, aduan dan ruang ejen/stokis jika diluluskan.
- **Staff:** tugasan assigned, pesanan, khidmat pelanggan, QC, shift/handoff, dokumen dan SOP.
- **Founder:** overview bisnes, pesanan/pembayaran, stok/batch, ejen, marketing, tugasan, dokumen, kalendar, kewangan, laporan, pasukan dan tetapan.
- **Developer:** runtime, readiness, jobs, quota/controls dan penilaian JEV; role ini tidak mempunyai kuasa kewangan secara automatik.

Modul founder yang wujud dalam route aplikasi termasuk:

- ringkasan bisnes;
- pesanan dan pembayaran;
- stok dan batch;
- quality & JEV;
- ejen dan stokis;
- marketing studio;
- tugasan, dokumen, SOP dan pengetahuan;
- kalendar operasi;
- kewangan dan laporan;
- kawalan kualiti, shift/day-close;
- pasukan, akses dan tetapan;
- workspace integrasi lama.

### Aliran operasi yang direka

Model operasi platform menghubungkan satu rekod dari awal hingga akhir:

1. customer membuat pesanan;
2. server mengira harga dan reserve stok;
3. customer memuat naik bukti bayaran;
4. founder mengesahkan;
5. staff/founder melakukan review, packing dan dispatch;
6. customer mengesahkan penerimaan;
7. laporan pembayaran dan aduan merujuk order ID yang sama.

Untuk ejen/stokis, sistem merangkumi permohonan, terms komersial, restock, receiving, custody/ownership, consignment, returns dan settlement.

Untuk marketing, aliran yang direka ialah **draft → rights/evidence → exact-version approval → manual export**. Penerbitan remote automatik belum dianggap aktif.

## Keadaan semasa yang perlu dipercayai

Source-of-truth bertarikh 4 Oktober 2026 ialah rujukan lebih kuat daripada dokumen sejarah yang lebih lama.

Keadaan penting:

- canonical source: `D:\ABANGCOLEK-PLATFORM`;
- runtime/data bisnes lokal sengaja dikekalkan di `D:\ABANGCOLEK-OS\var`;
- database utama lokal ialah `platform.sqlite` di runtime OS;
- founder belum diprovisionkan dalam snapshot yang direkodkan;
- snapshot data menunjukkan 1 customer membership aktif, 5 flow definitions, 0 founder bootstrap, 0 catalogue published dan 0 transaksi bisnes sebenar;
- source dan tests platform sudah dibina, tetapi onboarding sebenar masih diperlukan;
- native WhatsApp dan Postiz remote publishing belum aktif;
- JEV semasa ialah LOCAL_RULES/evaluation/policy, bukan bukti runtime TypeSafe native yang connected;
- Google Workspace, Supabase, Gemini lama dan sumber cloud ialah adapter/legacy/reference, bukan sync automatik;
- production deployment belum mempunyai receipt yang boleh mengesahkan keadaan akhir.

**Maksudnya:** aplikasi sudah mempunyai banyak struktur operasi, tetapi data bisnes sebenar seperti SKU, harga, stok, SOP, polisi refund, lokasi, founder authority dan katalog published belum boleh dianggap lengkap hanya kerana UI atau dokumen wujud.

## JEV dan lapisan AI

JEV digunakan sebagai lapisan keputusan berstruktur untuk:

- triage dan routing;
- klasifikasi aduan;
- penilaian kualiti/sentimen;
- semakan unknowns dan evidence;
- guardrail sebelum tindakan seperti refund;
- evaluation yang boleh diaudit.

Gemini/LLM pula sesuai untuk penerangan, sintesis, penulisan copy dan penggunaan tools. Idea seni bina projek ialah **JEV/System 1 untuk keputusan berstruktur + LLM/System 2 untuk kerja generatif dan penerangan**.

Dokumen lama mengandungi dakwaan vendor seperti latency, kos dan calibrated confidence. Source-of-truth mengingatkan bahawa dakwaan tersebut bukan benchmark lokal atau bukti runtime production. Saya tidak menganggapnya sebagai fakta operasi semasa.

## Apa yang saya nampak dalam Facebook dan Google

- Tab Gemini yang dibuka menunjukkan akaun Google berlabel **abang colek** dan sesi Gemini aktif.
- Tab Facebook menunjukkan akaun/profil Facebook berlabel **Abang**, dengan menu dan feed peribadi. Ini belum membuktikan bahawa halaman Facebook rasmi bisnes Abangcolek sudah dikenal pasti atau dipautkan dengan tepat.
- Saya tidak akan menganggap profil bernama “Abang” sebagai halaman rasmi Abangcolek tanpa URL/page identity yang disahkan.
- Tiada fail eksport Facebook ditemui di Desktop, Documents atau Downloads berdasarkan carian nama dan kandungan teks.

## Perkara yang masih belum diketahui

Ini ialah jurang paling penting sebelum platform boleh menjadi sistem operasi sebenar:

- katalog SKU rasmi lengkap;
- berat/isipadu, harga dan variasi setiap produk;
- stok semasa dan lokasi stok;
- hubungan rasmi antara ABANGCOLEK, STYLOAIRPOOL, LIURLELEH dan JERUX;
- akaun sosial rasmi yang benar-benar dimiliki dan digunakan sekarang;
- SOP pembuatan, bancuhan, suhu, pembungkusan dan QC;
- polisi refund/return dan ambang kelulusan;
- struktur founder/staff/agent yang sebenar;
- lokasi pop-up dan jadual event semasa;
- akaun pembayaran rasmi dan rekonsiliasi kewangan;
- status production deployment dan cloud migration;
- bukti hak penggunaan semua logo, foto, muzik dan aset media;
- data sebenar daripada Facebook/TikTok/WhatsApp yang belum dieksport secara rasmi.

## Pemahaman saya tentang ABANGCOLEK

Saya memahami Abangcolek sebagai **jenama makanan Malaysia yang dibina untuk berkembang daripada jualan colek buah/sambal dan booth sosial kepada rangkaian operasi yang boleh diaudit**.

Nilai utama yang cuba dibina ialah:

- jenama yang mudah diingati melalui rasa, visual dan reaksi pelanggan;
- saluran jualan fizikal dan sosial yang saling melengkapi;
- rangkaian ejen/stokis yang mempunyai ownership dan settlement yang jelas;
- proses order-to-delivery yang mempunyai evidence;
- kawalan kualiti dan aduan yang boleh dijejaki ke order, lot dan proses;
- marketing yang tidak terus publish tanpa rights, revision dan approval;
- pembantu AI yang memberi cadangan dan klasifikasi, tetapi tidak mengambil authority kewangan secara senyap.

Ringkasnya: **ABANGCOLEK ialah jenama F&B yang sedang dibentuk menjadi ekosistem commerce, operasi, rangkaian dealer dan intelligence yang berasaskan bukti.**

## Cadangan langkah seterusnya

1. Sahkan owner/identity rasmi setiap akaun sosial dan pisahkan profil peribadi daripada halaman bisnes.
2. Sediakan satu master catalogue rasmi: SKU, nama, label, gram/ml, harga, kos, stok, availability dan bukti sumber.
3. Provision founder dan role staff secara rasmi dalam database lokal.
4. Masukkan SOP, QC, batch, lokasi, refund dan day-close yang sebenar.
5. Sambungkan setiap akaun sosial hanya selepas URL, owner, permission dan tujuan penggunaan direkodkan.
6. Gunakan Facebook sebagai saluran content/engagement, tetapi kekalkan approval manusia sebelum publish, reply sensitif, refund, iklan atau perubahan page.
7. Jangan gunakan harga, SKU atau bank details yang hanya muncul dalam template/source lama sebagai fakta jualan semasa tanpa pengesahan pemilik.
