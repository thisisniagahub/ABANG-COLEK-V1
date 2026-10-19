<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PELAN / PROMPT LAMA — superseded sebagai arahan execution oleh prompt pelaksanaan canonical di bawah. Checkbox, command, model, path runtime dan keputusan reka bentuk lama dikekalkan untuk provenance; jangan jalankan secara literal. Baseline, migrasi dan bukti semasa mesti ditentukan oleh blueprint dan prompt canonical.
>
> Rujukan semasa: [Master Growth Blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# ABANGCOLEK Landing — EMONS-Inspired Preserve Spec

**Status:** cadangan untuk semakan; belum mula ubah UI.

## Design Read

- **Artifact:** landing page awam ABANGCOLEK (`/`).
- **Audience:** pelanggan yang mahu meneroka katalog, pelanggan sedia ada yang perlu masuk ke akaun, dan bakal ejen/stokis.
- **Visual language:** food-commerce yang bertenaga dan editorial; hero dunia penuh skrin dengan hierarki ringkas dan rail bab yang diinspirasikan oleh struktur EMONS.
- **Mode:** **Redesign · Preserve** — pinjam prinsip susun atur EMONS, bukan identiti atau kandungannya.
- **Dials:** variance **5/10** (satu fokus visual, grid stabil); motion **4/10** (pertukaran bab ringkas; semua reduced-motion sedia ada dikekalkan); density **4/10** (satu mesej utama, CTA dan empat bab); asset-dependence **8/10** (logo, ilustrasi dunia dan foto produk rasmi); brand-fidelity **9/10** (palet, logo, suara dan aliran ABANGCOLEK kekal).

## Empat Keputusan Komposisi

- **Narrative role:** hero memperkenalkan perjalanan pelanggan daripada memilih produk hingga rangkaian rakan; ia membawa terus kepada katalog.
- **Viewing distance:** desktop/laptop dan telefon. Headline perlu jelas dari pandangan sepintas lalu; kawalan bab dan pautan mesti kekal mudah dicapai pada skrin kecil.
- **Visual temperature:** hangat, yakin dan playful-premium—bukan korporat-logistik.
- **Capacity check:** desktop mengekalkan nav satu baris, copy di kiri, dunia visual di kanan/latar, serta empat kawalan bab di bawah. Mobile menyusun kandungan secara menegak tanpa overflow atau menutup CTA.

## Design Decisions

- **Anchor:** corak struktur EMONS sahaja—masthead sticky, hero imersif, kad copy berkontras tinggi, dan pilihan kategori/bab. Jangan salin logo, copy, imej, atau label logistik EMONS.
- **Palette source:** imej pengguna `public/assets/brand/ABANG-COLEX-LOGO-2.png`; sampel piksel wakil: emas `#F2AE12`, merah `#DC1D3F`, hitam `#000000`, putih `#FFFFFD`, dan hijau daun `#488420`.
- **Palette application:** emas sebagai warna jenama utama/active state; merah sebagai CTA dan aksen; hitam/putih sebagai asas; hijau daun hanya aksen kecil. Pasangan teks hitam-atas-emas ialah **10.84:1**, putih-atas-merah **4.89:1**. Buang lime dan lavender daripada tema UI landing sahaja; kekalkan tema workspace lain. Gunakan tints neutral hanya untuk permukaan sekunder.
- **Typography:** Outfit untuk display; DM Sans untuk body—ikut aset/font sedia ada.
- **Spacing:** unit asas 8px; margin responsif 16–36px; kekalkan maks-width/ritma semasa di luar hero.
- **Radius:** kawalan kecil 8px; panel besar 16–20px; elakkan lapisan kad berlebihan.
- **Shadow:** satu tahap elevasi lembut hanya untuk panel/foto; ilustrasi dunia kekal fokus.
- **Motion:** easing sedia ada `cubic-bezier(.16, 1, .3, 1)` dan transisi sekitar 620ms dikekalkan; `prefers-reduced-motion`, mod statik, input sentuh, dan input papan kekunci tidak diubah.

## Preserve / Improve / Remove

- **Preserve:** `BrandLogo`, aset dunia dan foto rasmi; empat bab Produk/Packing/Penghantaran/Rangkaian; CTA/routes `/products`, `/customer/orders`, `/locations`, `/become-dealer`; login; toggle tema; scroll/touch/keyboard; reduced motion; katalog dan seksyen selepas hero.
- **Improve:** gunakan emas/merah/hitam/putih/hijau logo secara konsisten pada public landing; perkemas keutamaan visual header/CTA, keterbacaan copy hero di atas art, tab/bab aktif, dan responsif.
- **Remove:** lime dan lavender sebagai warna tema UI landing; tiada kandungan atau journey ABANGCOLEK dibuang. Jangan tambah lima kategori logistik EMONS, data produk/statistik yang belum disahkan, atau elemen brand EMONS.

## Protected Contracts

- Route, CTA, label navigasi, SEO/metadata, `data-scene`/`data-motion`, semantik dan fokus aksesibiliti kekal.
- Struktur scroll journey, panel hotspot/dialog, attribution foto, dan mod statik tidak ditukar.
- Perubahan kerja tempatan sahaja; tiada deploy, push, commit, API/backend, atau perubahan katalog.

## Highest Risk and Rollback

Risiko utama ialah panel copy/rail bab bertindih dengan ilustrasi atau CTA pada telefon dan viewport pendek. Pelaksanaan dimulakan sebagai v0 yang kecil untuk semakan visual; jika komposisi tidak jelas, fallback kepada susun atur hero sedia ada dan batalkan hanya perubahan CSS terkini.
