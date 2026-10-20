
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PELAN / PROMPT LAMA — superseded sebagai arahan execution oleh prompt pelaksanaan canonical di bawah. Checkbox, command, model, path runtime dan keputusan reka bentuk lama dikekalkan untuk provenance; jangan jalankan secara literal. Baseline, migrasi dan bukti semasa mesti ditentukan oleh blueprint dan prompt canonical.
>
> Rujukan semasa: [Master Growth Blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

<!-- ABANGCOLEK_DOC_AUTHORITY_V1 -->
> **HISTORICAL_PLAN — context diselaraskan 3 Oktober 2026.** Kandungan/metadata asal di bawah ialah bukti atau cadangan pada tarikh asal, bukan current runtime/authorization/release proof. Gunakan [Source of Truth](../../ABANGCOLEK-SOURCE-OF-TRUTH.md) dan [handover A–Z](../../handover/AGENT-HANDOVER-A-Z.md) untuk keputusan semasa. Server3000/3010 STOPPED pada snapshot20:25MYT; data kekal OS; Emons goal PAUSED. Native provider/benchmark/cost/complete claims perlu verifikasi sendiri.

# Pelan hero scroll ABANGCOLEK ala Emons

Status: COMPLETE — LOCAL_HERO_SCOPE. User telah memilih konsep hero Emons dan meminta pelaksanaan penuh menggunakan goal. Hero empat bab dan aset asal telah diintegrasikan. Browser live, TypeScript, full suite akhir 150 pass/0 fail/856 assertions, regression geometri 9 pass/29 assertions, production build selepas resize akhir dan review berasingan lulus. Provenance, matriks penerimaan dan screenshot direkodkan dalam `reports/IMPLEMENTASI_HERO_EMONS_DAN_ASET_ASLI_ABANGCOLEK_2026-10-03.md`; design QA dalam `reports/DESIGN_QA_HERO_EMONS_2026-10-03.md` ialah PASS. Penutupan ini meliputi hero lokal dan integrasi public yang dinyatakan, bukan deployment production atau keseluruhan roadmap platform. Semakan CLI AGY/Hermes hanya help, tiada inference; lihat `reports/DELEGASI_JIMAT_TOKEN_AGY_HERMES_2026-10-03.md`.

## Skop

Hero pinned pada homepage lokal; kamera visual bergerak mengikut scroll dua arah; empat bab produk, packing, penghantaran dan pelanggan/ejen; navigasi bab; skip ke katalog; tema light/dark; mobile, keyboard dan reduced motion. Katalog dan API sebenar kekal digunakan. Aset ialah ilustrasi jenama, bukan dakwaan fasiliti atau data operasi sebenar.

## Susunan pelaksanaan

1. Tulis ujian progress, sempadan bab dan geometri pin sebelum kod model.
2. Sediakan ilustrasi raster dunia ABANGCOLEK yang tersendiri.
3. Bina model progress dan komponen hero berasingan dengan listener passive, requestAnimationFrame dan cleanup.
4. Sambungkan komponen kepada LandingPage; susun CSS hero/header responsif.
5. Sahkan scroll forward/reverse, pin/unpin, chapter navigation, skip/catalogue, theme, media failure dan reduced motion dalam browser sebenar.
6. Jalankan pemeriksaan TypeScript, ujian relevan dan production build; gunakan review kod berasingan dan baiki penemuan.
7. Simpan bukti dan status akhir dalam laporan .md. Goal hanya complete selepas seluruh skop ini disahkan.

## Penerimaan

Tambahan user: logo dan product imagery wajib dirujuk kepada sample-image repo rasmi serta TikTok. Gunakan artwork asal, simpan provenance, dan hapuskan jar generik daripada ilustrasi. Foto editorial tidak dianggap sebagai mapping SKU atau harga katalog.

- Scroll mengubah transform visual dan bab aktif; kedudukan stage kekal sepanjang rentang pin.
- Selepas bab terakhir stage dilepaskan dan katalog boleh dicapai.
- Keyboard mempunyai chapter buttons, skip dan CTA dengan focus yang kelihatan.
- Motion boleh dikurangkan; semua kandungan boleh dibaca dalam mod statik.
- Tiada horizontal overflow pada 320px dan tiada tindakan tertutup pada mobile.
- Tiada seeded business data, dependency berbayar baharu atau integrasi palsu.
- Entry point AppRouter, metadata lifecycle serta role/membership sedia ada dipelihara.
