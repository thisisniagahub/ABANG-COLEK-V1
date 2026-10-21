# Commerce & Growth — Kedai Dealer, Ordering dan Orbit

Tarikh keputusan: **21 Oktober 2026**. Status: **TARGET_DESIGN / NOT_VERIFIED_AS_A_WHOLE**. Dokumen ini memperincikan [blueprint §8](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md#8-dealer-loyalty-referral-dan-consent); ia bukan receipt implementasi atau polisi komersial baharu.

## 1. Keputusan tetap dan sempadan

1. Setiap **Agent/Stokis aktif** mendapat **Online Store public sendiri yang disediakan ABANGCOLEK** serta **Dealer Workspace private**. Banner `?ref=` ke katalog umum tidak memenuhi mandat ini.
2. Rakan niaga boleh mendaftar terus atau dijemput founder tanpa pembelian terdahulu. Approval/aktivasi mengikut polisi canonical sedia ada; permohonan tidak automatik menjadi dealer aktif.
3. Reuse React/Vite + Bun, catalogue/checkout/identity/ledger canonical dan local SQLite/cloud Supabase CAS. Ini saluran jualan dalam platform yang sama; tiada SaaS tenant berlangganan atau backend commerce kedua.
4. Public store sasaran **`/kedai/:slug`**. Dealer Workspace menggunakan membership aktif dan grant organisasi sedia ada; dedicated navigation/identity dealer wajib, tanpa mengada role auth kelima atau memberi founder privilege. Route/source semasa mesti dibezakan daripada sasaran ini.
5. Referral pelanggan **satu peringkat dan dua hala**: pembeli serta perujuk boleh menerima manfaat yang ditentukan polisi. Kadar, nilai, eligibility dan payout tidak dicipta agent.
6. Margin wholesale, komisen dealer, reward referral pelanggan dan mata loyalty ialah konsep/entri berasingan. Store owner tidak automatik menjadi customer referrer atau pihak fulfilment.
7. Lima tingkat dan kadar **MadConomy Ahmad’s ialah research reference**, bukan polisi ABANGCOLEK. Top-up wallet, cash withdrawal, native app wajib dan referral berbilang tingkat kekal deferred; tiada kos atau integrasi baharu diaktifkan oleh dokumen ini.
8. Share biasa “Geng Jerux Kau” tidak menghasilkan ganjaran dengan sendirinya. Qualified referral memerlukan attribution dan transaksi sah mengikut polisi, bukan klik, share atau pendaftaran sahaja.

Authority produk: arahan pengguna semasa → blueprint → spesifikasi ini → prompt. Authority status: ledger + receipt semasa. Research dan mockup bukan konfigurasi bisnes.

## 2. Provisioning dan pengalaman dealer

Aktivasi sah menghasilkan satu store ID stabil untuk profil dealer yang aktif, slug unik dan grant workspace. Unique constraint serta operasi atomic/CAS menghalang dua store terhasil daripada retry/concurrent approval. Collision/reserved slug/input tidak sah ditolak dengan mesej selamat; jangan menggantikan nama pengguna secara senyap. Perubahan slug tidak memadam identity/order lama; dasar redirect hanya jika laluan lama boleh diselesaikan tanpa attribution salah.

Public store memaparkan nama/profil yang diluluskan, published catalogue, harga dan availability yang berprovenance, cart, checkout, pilihan fulfilment yang layak dan bantuan. Profil tidak menerbitkan alamat rumah, telefon peribadi atau dokumen dealer tanpa izin. Pelawat boleh browse tanpa login; checkout mengekalkan polisi sesi canonical.

Private workspace memberi akses kepada kedai sendiri, pautan/QR, order yang dibenarkan, restock/receiving/stock mengikut mod, earning/due/settlement/contra, aduan, bantuan dan marketing kit diluluskan. Nama role source tidak boleh digunakan untuk menyembunyikan pengalaman dealer daripada pengguna yang berhak.

Pending/rejected tidak menerbitkan kedai aktif. Suspend/revoke menghalang jualan baharu dan akses private yang tidak lagi sah; order, audit dan receipt lama dikekalkan dengan akses sokongan/rekod mengikut grant semasa. Founder mempunyai pemantauan/aktivasi berizin; staff hanya tugas/outlet assigned.

## 3. Identity, attribution dan fulfilment

Kontrak berikut **semantik sasaran**, bukan dakwaan nama field sudah wujud. Reuse field canonical yang sepadan dan dokumentasikan mapping dalam implementation manifest; tambah shared contract typed hanya apabila tiada representasi yang setara.

| Identiti/fakta | Pemilik authority | Invariant |
|---|---|---|
| Stable store ID dan `dealerOrgId` pemilik | Server daripada store aktif | Slug/ref/telefon client tidak menentukan payee |
| Principal pembeli | Sesi canonical | Body/header client tidak memilih actor |
| Customer referrer | Server daripada referral aktif dan polisi | Berasingan daripada pemilik kedai; self/duplicate ditapis |
| Pihak/mod fulfilment dan lokasi | Polisi/config stok canonical | Dealer memiliki store tidak bermaksud dealer memegang stok |
| Harga, promo, kos dan revisions | Catalogue/policy canonical | Client amount hanyalah draf, bukan amount diluluskan |
| Attribution dan polisi order | Snapshot durable pada order/entri berkaitan | Kempen, slug atau kadar baharu tidak menulis semula historical earning |

Masuk store B dengan cart store A menghasilkan conflict yang memerlukan pengguna mengesahkan cart baharu selepas revalidation. Jangan mencampur dua store/menukar attribution senyap. Referral tidak boleh menukar store owner atau lokasi stok. First/last-touch, attribution window, tempoh binding dan konflik kod menggunakan polisi approved berversi; tanpa polisi, jangan menjanjikan reward. Pembelian biasa boleh diteruskan hanya jika seluruh kontrak checkout/fulfilment yang diperlukan sudah sah dan UI jelas tentang reward yang belum tersedia.

Mod buy-resell, HQ fulfilment/dropship atau consignment hanya tersedia jika polisi domain dan rekod sumber menyokongnya. Reuse ledger custody/ownership sedia ada; jangan membuat semua order menjadi dropship atau mewujudkan komisen bagi keuntungan reseller secara automatik.

## 4. Customer journey dan ketepatan checkout

1. Masuk landing/HQ atau public store dealer; lihat identiti kedai serta published products.
2. Pilih SKU, variasi/kuantiti dan fulfilment yang disokong rekod sebenar.
3. Semak jumlah akhir, diskaun, kos penghantaran, penjual dan pihak fulfilment. Paparkan syarat promo/reward sebelum bayar.
4. Revalidate sesi, store aktif, harga/policy revision, stok/lot/expiry/quarantine, voucher dan loyalty. Conflict memberi sebab dan pengesahan baharu; offline draft tidak melaksanakan order secara automatik apabila online semula.
5. Canonical checkout mencipta order/attempt menggunakan idempotency. Callback provider disahkan; redirect atau screenshot bukan pengesahan bayaran.
6. Status order dan payment dipaparkan berasingan. `unknown_outcome` tidak dilabel gagal dan tidak mencetuskan blind retry/refund; jalankan reconciliation berizin.
7. Tracking private memerlukan ownership; tracking public menggunakan token bounded dengan projection minimum dan expiry/revoke. Order ID sahaja bukan credential.
8. Reorder membina **troli baharu**, mengekalkan rujukan order sumber untuk konteks sahaja. Reprice/recheck stok, store, referral eligibility, address/fulfilment dan consent sebelum confirmation; tiada replay harga lama atau automatic payment.

Menu availability tanpa lokasi tepat mesti dinyatakan unknown/terhad, bukan “ready stock” rekaan. Jika lokasi browser ditolak, pilihan lokasi manual berizin kekal tersedia; jangan menjadikan permission GPS sebagai authority atau syarat browse.

## 5. Orbit, komisen dan margin

Reward mesti menunjukkan lifecycle semantik **pending/held → eligible → issued**, serta **redeemed/expired/reversed** apabila terpakai. Gunakan enum domain sebenar dan peta label UI; jangan menukar enum ledger acceptance untuk meniru lifecycle ini.

- Eligibility dua hala diuji secara berasingan: pembeli layak/perujuk tidak layak, perujuk layak/pembeli tidak layak, kedua-dua layak dan kedua-dua tidak layak. Polisi boleh menyekat manfaat tertentu; “dua hala” bukan janji kedua-dua pihak sentiasa dibayar.
- Tiada reward untuk signup/share/klik semata-mata. Qualifying payment/fulfilment, hold dan return window menggunakan polisi approved.
- Jika dealer dan referrer berbeza, stacking hanya berlaku apabila polisi membenarkan dan contribution margin selepas **semua** manfaat/fees/costs memenuhi threshold canonical.
- Amount ialah integer sen; ratio basis points dengan integer/BigInt. Allocation/pembundaran canonical deterministik; polisi contoh atau kadar Ahmad’s tidak dipindahkan ke production.
- Setiap earning mempunyai source order/payment/policy dan dedupe key. Retry/replay/concurrent request tidak menggandakan earning atau redemption.
- Partial refund menggunakan allocation asal dan baki refundable. Selepas payout, append-only contra/adjustment; jangan memadam earning atau menjanjikan clawback luar tanpa polisi.
- Penyata membezakan gross sales, margin, commission accrued/held/due, recorded payout dan confirmed payment. Points/store credit bukan wang tunai boleh dikeluarkan.
- Missing risk signal kekal unknown dengan reason; IP/peranti berkongsi sahaja tidak menghukum keluarga. Reuse risk/appeal source sebelum membina engine kedua.

## 6. Retention, consent dan Copilot

Reorder, penjelasan ganjaran dan follow-up berizin ialah keutamaan retention. Marketing consent disimpan mengikut tujuan/channel dan disemak semula pada dispatch, termasuk queued job; transactional update tidak memberi consent promosi secara automatik. Tiada social post/WhatsApp/email dihantar oleh agent development hanya untuk membuktikan UI.

Copilot menerima konteks store/order yang disahkan server, fulfilment scope, referrer eligibility yang boleh diakses serta revision yang sesuai. Reuse 10 CPK, 7 GUI, 10 MOD dan 32 ADV sedia ditetapkan; tiada capability ke-33. Search/compare/tracking/settlement explanation berscope; frontend cart/reorder tool menghasilkan **unsent draft**. Agent tidak menentukan payee, mengesahkan bayaran, menerbitkan kedai atau memberi reward sendiri. Tindakan berisiko menggunakan proposal/HITL/canonical command/receipt.

Shared state dan Pet mesti mengosongkan konteks kedai/order peribadi ketika logout atau pertukaran principal. Public published store boleh dibaca orang lain; statement/order private tidak boleh. Fixture, local rules dan komponen synthetic tidak menutup runtime/browser/hosted acceptance.

## 7. Urutan kerja dan gates

Urutan projek sedia ada kekal: baseline → 03A integriti → struktur → runtime foundation → tools/domain/UI → intelligence → release. Keutamaan berikut **di dalam domain commerce/growth**, bukan alasan melangkau Copilot atau release gates.

| Prioriti | Deliverable | Gate keluar |
|---|---|---|
| P0 | Provision store/workspace, scoped catalogue/stock/fulfilment, checkout, reconciliation, tracking | Dua dealer + customer berbeza, negatif IDOR/tamper/concurrency, browser sebenar dan durable receipt |
| P1 | Penyata ledger berasingan, referral satu peringkat dua hala, eligibility, margin dan refund reversal | Approved policies atau disabled reason tepat; tiada fabricated reward/cash payout |
| P2 | Reorder dan consented retention; measurement operasi | Reprice flow, consent dispatch/revoke dan metrik sumber sebenar |
| Deferred | Wallet top-up/cashout, native wajib, referral berbilang tingkat | Tiada implementasi/activation tanpa perubahan skop pengguna dan polisi sebenar |

Business owner memiliki kadar/MOQ/fees, attribution window/first-last touch, hold/expiry/stacking, fulfillment service area, refund entitlement dan consent terms. Agent mengimplementasikan config/versioning/validation serta fixture tests; ia **tidak memilih nilai komersial**. Gate satu polisi tidak menghalang kerja bebas yang boleh diteruskan.

## 8. Sub-checklist implementasi dan mapping 85 ID

Semua item di bawah ialah **acceptance tambahan terancang, belum dibuktikan oleh task dokumentasi ini**. `CG-*` ialah sub-checklist, bukan ID baharu dalam ledger 85. Bukti sedia ada perlu dipadankan semula; row lama verified tidak automatik menutup skop tambahan.

| Sub-item | Requirement sedia ada | Bukti minimum sebelum tick |
|---|---|---|
| [ ] CG-01 — aktivasi/provision unik | MOD-01, MOD-05, SEC-02 | Retry + concurrent approval menghasilkan satu store; pending/rejected tidak published |
| [ ] CG-02 — public store/private workspace | MOD-01, MOD-05, SEC-02, GUI-07 | A/B URL berbeza, anonymous browse, scoped dealer navigation, IDOR denial tanpa menyekat public browse |
| [ ] CG-03 — attribution/fulfilment snapshot | MOD-01, MOD-02, MOD-05, REF-02 | Store owner, fulfilment dan customer referrer berbeza; tamper/ref conflict tidak menukar owner |
| [ ] CG-04 — stok/cart/reprice | MOD-01, MOD-03, STK-01, OFF-01, ADV-05 | Cross-store cart, stale amount/stock, expiry/quarantine, offline retry ditangani canonical |
| [ ] CG-05 — payment/reconciliation | MOD-02, PAY-01, PAY-02, PAY-03 | Signed callback, duplicate/out-of-order/late receipt dan unknown outcome; sandbox/live gated berasingan |
| [ ] CG-06 — tracking minimum | MOD-02, SEC-01 | Private ownership + public token expiry/revoke/rate limit; tiada PII leak |
| [ ] CG-07 — referral dua hala | MOD-06, REF-01, REF-02, FIN-01 | Empat kombinasi eligibility, single-level, self/duplicate/risk unknown, polisi/attribution snapshot |
| [ ] CG-08 — ledger/settlement/refund | MOD-05, MOD-06, LOY-01, PAY-03, ADV-14, ADV-15 | Distinct entri, exact sen, concurrency/dedupe, partial refund dan post-payout contra |
| [ ] CG-09 — reorder | MOD-01, MOD-02, CPK-07, ADV-05 | Troli baharu, reprice/store/availability check; tiada automatic order/payment |
| [ ] CG-10 — retention berizin | MOD-07, MOD-10, PD-01 | Consent scope, opt-out semasa queued dispatch dan no-send draft tests |
| [ ] CG-11 — Copilot context | CPK-01, CPK-04, CPK-06, CPK-07, CPK-08, CPK-09, GUI-01..07 | Tool/state sebenar + scope/revoke/logout + canonical receipt bagi tindakan; bukan kad dummy |
| [ ] CG-12 — operasi dan release | MOD-08, REL-01, DR-01 | Mobile/light/dark/keyboard, empty/error/reduced-motion, measurement source, final-source verification dan environment receipts |

Integrator merekod source hashes, named test positif/negatif, commands/exit/count, browser traces/receipts, environment, reviewer dan baki bagi setiap sub-item dalam checkpoint/evidence. Tick sub-item hanya selepas bukti lengkap; parent row hanya boleh ditutup apabila **seluruh** requirement asal dan tambahan dipenuhi. PROJECT-CHECKLIST/register dijana daripada ledger selepas verifier; jangan edit generated tick dengan tangan.

## 9. Sumber dan handover

- [Mandat dan model dealer terdahulu](../research/2026-10-21-dealer-storefronts-proven-models.md).
- [Research aplikasi Ahmad’s](../research/2026-10-21-ahmad-app-concept-review.md): rujukan ordering/rewards, bukan bukti kejayaan kewangan atau kelulusan polisi.
- [Workspaces](workspaces.md), [workflow](user-workflows.md), [advanced tools](copilot-advanced-tools.md).
- [Prompt handover lengkap](../prompts/COMMERCE-GROWTH-HANDOVER-20261021.md), [Kilo master](../prompts/KILO-COMPLETE-PROJECT-20261021.md) dan [matrix 85 requirement](../prompts/KILO-TASK-MATRIX-20261021.md).
