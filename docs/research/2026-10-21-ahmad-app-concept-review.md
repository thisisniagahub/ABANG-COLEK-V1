# Penyelidikan konsep aplikasi Ahmad’s untuk ABANGCOLEK

<!-- COMMERCE-GROWTH-20261021:BEGIN -->
> **Amendment 21 Oktober 2026 — TARGET_DESIGN:** Disposition 21 Oktober: ordering/tracking/reorder/reward clarity dipetakan kepada spec pembangunan. MadConomy lima tingkat dan kadarnya kekal research-only; ABANGCOLEK menggunakan customer referral satu peringkat dua hala yang tertakluk approved policy. Tiada native app wajib/top-up/cashout diaktifkan. Penemuan dan batas bukti asal di bawah dikekalkan.
>
> Rujukan: [spesifikasi canonical](../design/commerce-growth.md) · [handover lengkap](../prompts/COMMERCE-GROWTH-HANDOVER-20261021.md). Generated acceptance kekal berasaskan ledger dan receipt, bukan nota ini.
<!-- COMMERCE-GROWTH-20261021:END -->


Tarikh semakan: 21 Oktober 2026. Skop: sumber awam, laman operator dan metadata app store. Tiada pemasangan aplikasi, login, pembelian, pengeluaran wallet atau ujian backend Ahmad’s dilakukan. Dokumen ini ialah penyelidikan dan cadangan; ia tidak mengaktifkan polisi atau menutup acceptance ABANGCOLEK.

## 1. Identiti yang ditemui

Padanan kukuh kepada sebutan pengguna “AHMAD FRIED KITCHEN APPS” ialah **Ahmads Hot Chicken**, juga mempunyai rekod bernama **Ahmads Fried Chicken**. Nama “Kitchen” belum disahkan sebagai nama aplikasi berasingan.

- [App Store Malaysia](https://apps.apple.com/my/app/ahmads-hot-chicken/id6745464417): ID `6745464417`, developer Raudhah Pay / RAUDHAH PAY SDN. BHD.; description menunjuk ke `ahmads.com.my`.
- [Laman Ahmad’s](https://ahmads.com.my/): pautan App Store kembali kepada aplikasi yang sama. Footer menamakan AHMADS FAST FOOD SDN. BHD. Identiti publisher perisian tidak semestinya identiti operator restoran.
- [Marketing-Interactive, 8 Julai 2026](https://www.marketing-interactive.com/did-ahmads-fried-chicken-just-appoint-malaysias-hottest-ai-ceo): melaporkan pertukaran jenama Fried Chicken kepada HotChicken. Kandungan kempen AI CEO ialah pemasaran; ia tidak membuktikan agent AI mengendalikan operasi.

## 2. Konsep produk

Tafsiran penyelidikan: aplikasi menghubungkan pembelian terus dengan outlet dan hubungan pelanggan berulang. Ordering menghasilkan transaksi; sejarah order memudahkan pembelian semula; rewards dan referral memberi sebab untuk kembali serta berkongsi. Ini penerangan model, bukan bukti kenaikan keuntungan.

### Kebolehan yang diisytiharkan publisher

[Listing dan sejarah versi App Store](https://apps.apple.com/my/app/ahmads-hot-chicken/id6745464417) menyatakan katalog dan add-on, pemilihan cawangan berasaskan lokasi, promo, QR/payment options, wallet top-up, order tracking dan reorder. Release notes juga menyebut points, referral/affiliate, OTP dan menu availability.

Riwayat perubahan menunjukkan peluasan daripada loyalty kepada ordering. Ia turut merekod pembaikan status bayaran menunggu/gagal/luput, checkout, harga dan penggunaan lokasi. Ini bukti publisher mengisytiharkan fungsi serta pembaikan; kejayaan transaksi hujung ke hujung belum diuji dalam penyelidikan ini.

Aliran pelanggan yang disintesis daripada listing:

1. Kenal pasti cawangan dan produk yang tersedia.
2. Pilih produk, pilihan tambahan dan kuantiti.
3. Semak troli, kelayakan promo dan jumlah bayaran.
4. Bayar menggunakan kaedah tersedia.
5. Lihat perkembangan order dan rekod pembelian.
6. Semak rewards dan buat pembelian semula apabila sesuai.

Urutan ini ialah sintesis fungsi; ia bukan rakaman urutan skrin aplikasi yang telah diuji.

## 3. MadConomy: angka rasmi dan batasnya

Sumber: [penerangan rasmi MadConomy, 13 Oktober 2026](https://ahmads.com.my/blog/madconomy-rewards-explained).

| Penerima/peruntukan | Kadar model yang diterangkan |
|---|---:|
| Pembeli atas pembelian sendiri yang layak | 0.33% |
| Setiap satu daripada lima tingkat referral | 0.33% |
| Jumlah lima tingkat referral | 1.65% |
| Pembeli bersama semua tingkat referral | 1.98% |
| Dana komuniti | 0.33% |
| Bonus jualan staf | 0.33% |
| Semua komponen apabila terpakai | 2.64% |

**1.98% dikongsi antara pembeli dan perujuk yang layak. Ia bukan cashback 2% kepada setiap pembeli.** Artikel memerlukan pembaca menyemak terma semasa aplikasi; pendapatan bergantung kepada pembelian yang layak.

Contoh aritmetik sahaja: jika asas pembelian layak ialah RM100 dan semua komponen terpakai, bahagiannya ialah RM0.33 kepada pembeli, RM1.65 merentas lima tingkat, RM0.33 komuniti dan RM0.33 staf. Contoh ini tidak menentukan asas sebenar selepas cukai/diskaun, pembundaran atau hak tuntutan pengguna tertentu.

Belum disahkan: withdrawal tunai, minimum pengeluaran, expiry, KYC, aturan refund/clawback, komponen yang menerima peruntukan jika sesuatu tingkat kosong, dan sama ada semua outlet mengaktifkan model yang sama. Baki top-up, points dan pendapatan referral tidak boleh dianggap boleh ditukar ganti tanpa terma.

## 4. Tahap bukti dan perkara yang belum terbukti

| Soalan | Dapatan |
|---|---|
| Adakah aplikasi dan publisher dapat dikenal pasti? | Ya, melalui pautan silang laman dan App Store. |
| Adakah ordering/rewards/referral dinyatakan? | Ya, dalam metadata publisher dan penerangan rasmi. |
| Adakah pembayaran/referral telah diuji sendiri? | Belum. Tiada transaksi atau akaun dicipta. |
| Adakah setiap perujuk mendapat kedai online sendiri? | Tiada bukti dalam sumber yang diperiksa. |
| Adakah ada private workspace bagi agent/stokis? | Belum disahkan. Outlet selector tidak membuktikan portal dealer. |
| Adakah model membuktikan keuntungan atau pertumbuhan disebabkan app? | Tiada metrik kewangan/retention kausal yang disahkan. |
| Adakah Android boleh dipasang sekarang? | Belum disahkan pada peranti. Listing Google Play yang dipulangkan bertarikh lama. |

[Google Play package `com.my.ahmads`](https://play.google.com/store/apps/details?id=com.my.ahmads&hl=en) memaparkan nama lama, developer sama dan tarikh kemas kini 21 Disember 2025. Snapshot ini berbeza usia daripada iOS; jangan menganggap parity versi atau availability pemasangan semasa telah terbukti. [AppBrain](https://www.appbrain.com/app/ahmads-fried-chicken/com.my.ahmads) pula melaporkan removal; percanggahan ini memerlukan semakan peranti/region jika pemasangan Android hendak dinilai.

## 5. Pengajaran operasi dan UX

[Laman operator, bahagian Our next chapter](https://ahmads.com.my/#) mengakui pengembangan partner mendahului kesiapsiagaan sistem sokongan, termasuk penutupan atau pertukaran jenama sesetengah outlet. Ia menyenaraikan sepuluh lokasi fokus HQ, dengan penjelasan bahawa senarai itu bukan jumlah seluruh rangkaian.

Implikasi untuk ABANGCOLEK: peluasan rangkaian perlu diikuti stok, fulfilment, support, settlement dan latihan yang boleh berfungsi. Bilangan outlet atau bilangan referral sahaja tidak membuktikan operasi sihat.

[Ulasan App Store](https://apps.apple.com/my/app/ahmads-hot-chicken/id6745464417?platform=iphone&see-all=reviews) merangkumi pengalaman positif serta aduan aplikasi tidak terbuka dan promosi berbeza daripada harga yang dilihat. Ini laporan individu; ia bukan bukti defect masih wujud atau ukuran seluruh pengguna. Ia memberi senario ujian yang berguna: syarat promosi jelas sebelum checkout dan laluan pemulihan jika login/app gagal.

Pautan polisi privasi daripada app store, [privacy-policy-2](https://ahmads.com.my/privacy-policy-2), gagal dengan 404 melalui alat web semasa semakan. Metadata store menyatakan tiada data dikumpul, sementara ciri akaun dan transaksi memerlukan penjelasan lanjut tentang pemprosesan data. Ini jurang penjelasan awam yang memerlukan semakan lanjut, bukan kesimpulan pelanggaran.

## 6. Apa yang sesuai untuk ABANGCOLEK

Rujukan dalaman: [Master Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md), terutama §8.1 dan §8.2; [penyelidikan model dealer](2026-10-21-dealer-storefronts-proven-models.md).

| Pola rujukan | Cadangan ABANGCOLEK |
|---|---|
| Pemilihan outlet | Pilihan HQ atau kedai Agent/Stokis dengan identiti penjual, kawasan servis dan sumber fulfilment jelas. |
| Menu availability | Katalog published serta stok/kelayakan sebenar mengikut kedai dan mod fulfilment. |
| Reorder | Cipta troli baharu daripada order lama; semak semula harga, stok, promo dan alamat. |
| Reward tracking | Penyata jelas bagi points, reward pelanggan dan komisen dealer, dengan sebab pending/rejected/reversed. |
| Referral | Kekalkan keputusan blueprint: satu peringkat untuk pelanggan. Lima tingkat Ahmad’s ialah rujukan perbandingan, bukan polisi ABANGCOLEK yang diluluskan. |
| Wallet | Nilai keperluan selepas checkout dan ledger stabil. Jangan tambah top-up/withdrawal hanya kerana pesaing memilikinya. |
| Retention | Uji repeat purchase dan redeemed rewards bersama margin selepas insentif. |
| Partner network | Setiap Agent/Stokis aktif tetap wajib mendapat Online Store sendiri dan Dealer Workspace. |

Nama route sasaran `/kedai/:slug` dalam blueprint ialah **TARGET_DESIGN**, bukan bukti provisioning sedia berfungsi.

### Cadangan aliran transaksi ABANGCOLEK

1. Pelanggan masuk melalui kedai dealer atau pautan kempen/referral yang layak.
2. Server menentukan store owner, customer referrer dan mod fulfilment secara berasingan.
3. Sebelum bayaran, paparkan penjual, pihak menghantar, stok, harga akhir dan syarat ganjaran.
4. Order dan bayaran menggunakan rekod canonical serta pengendalian retry yang tidak menggandakan transaksi.
5. Ganjaran direkod sebagai pending sehingga syarat polisi dipenuhi; tiada reward sekadar pendaftaran.
6. Dealer melihat jualan miliknya; pelanggan melihat order dan rewards miliknya. Akses pengurusan dealer lain ditolak oleh server.
7. Refund/cancellation menghasilkan reversal yang boleh diaudit mengikut polisi; status tidak pasti disiasat sebelum pelaksanaan semula.

Jika pemilik kedai dan perujuk berbeza, stacking hanya berlaku apabila polisi membenarkan dan margin mencukupi. Tiada kadar baharu ditetapkan oleh laporan ini.

### Keutamaan implementasi yang dicadangkan

- **P0:** kedai dealer, inventory/fulfilment yang betul, checkout, payment reconciliation dan order tracking.
- **P1:** penyata komisen/loyalty berasingan, referral satu peringkat, eligibility dan refund reversal.
- **P2:** reorder, kempen berizin dan dashboard repeat purchase serta margin selepas rewards.
- **P3:** wallet atau tambahan program insentif hanya selepas keperluan, kos dan operasi diluluskan.

Ukuran pilot: kadar checkout berjaya, repeat purchase, contribution selepas insentif, fulfilment tepat masa, refund, aduan dan settlement aging. Ini cadangan ukuran, bukan hasil yang sudah dicapai.

## 7. Keputusan penyelidikan

Ahmad’s berguna sebagai contoh gabungan ordering, pelanggan berulang dan pembahagian rewards yang didokumenkan. Sumber awam yang disemak belum membuktikan keuntungan model, kejayaan transaksi semasa atau provisioned storefront untuk setiap perujuk. ABANGCOLEK boleh menggunakan pola pengalaman pelanggan tersebut sambil mengekalkan mandat kedai dealer dan polisi referral blueprint semasa.

Tiada kod aplikasi, ledger acceptance atau blueprint diubah dalam task penyelidikan ini. Ujian aplikasi tidak dijalankan kerana perubahan hanya menambah dokumen ini.
