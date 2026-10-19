<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** REKOD SEJARAH / RUJUKAN — pemerhatian, metrik ujian, status deployment, harga/model dan cadangan di bawah terikat kepada tarikh serta skop asal. Ia bukan checklist execution semasa atau pengesahan bahawa dapatan masih benar. Kekalkan bukti asal; revalidate sebelum mendakwa fixed, connected atau production-ready.
>
> Rujukan semasa: [Master Growth Blueprint](../docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../docs/prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Laporan Semakan ABANGCOLEK-PLATFORM — 17 Oktober 2026

**Verdik:** **Jangan anggap production-ready / Request Changes.** Perkara utama bukan rupa UI: deployment Vercel dalam repo hanya menghasilkan SPA statik sedangkan runtime bergantung pada API Bun. Aliran Google OAuth juga tidak mengeluarkan session yang diperlukan aplikasi. Untuk landing v0 dalam worktree berasingan, **arah visual boleh diteruskan sebagai prototaip**, tetapi **belum wajar mengganti empat bab asal dengan lima label** sebelum struktur dan sumber kandungan disahkan.

## Tujuan dan skop semakan

Perbualan dan perubahan yang disemak merangkumi platform ABANGCOLEK, checkout/cart pelanggan, deployment/auth, arkib foto dan bukti produk, deliverable EMONS/REA, pemasangan skill Superpowers, serta landing v0. Saya merujuk checkout utama `D:\ABANGCOLEK-PLATFORM`, worktree `D:\ABANGCOLEK-PLATFORM\.kilo\worktrees\abangcolek-logo-theme-20261017`, screenshot desktop/mobile, nota kajian sosial, dan chat yang dibuka dalam In-App Browser.

Semakan ini **read-only terhadap source**. Fail yang ditambah oleh semakan ini hanyalah laporan ini. Tiada commit, push, deploy, perubahan database atau panggilan ke dashboard/production dibuat. `.env` dan nilai rahsia tidak dibuka. Oleh itu dapatan yang bergantung pada konfigurasi live, migration yang benar-benar dijalankan, atau endpoint production ditandakan sebagai **bersyarat**, bukan dakwaan bahawa insiden live telah berlaku.

## Ringkasan eksekutif

1. **Release blocker:** workflow Vercel menerbitkan `dist` statik dan catch-all ke `index.html`; tiada Vercel API handler untuk `/api/platform/*`. Backend Bun berjalan sebagai proses berasingan. Sebelum release, tunjukkan topology API yang sebenar dan smoke-test deployment.
2. **Auth belum bersambung:** butang Google menggunakan Supabase OAuth, tetapi tiada callback/bridge yang memetakan identiti ke `platform_session`; API hanya membaca cookie platform. Google login berkemungkinan kembali sebagai pengguna belum authenticated.
3. **Isu backend berimpak tinggi:** authorization bus-freight tidak berskop kepada owner/role; Origin gate boleh menolak webhook WhatsApp server-to-server; rollback migration boleh memadam order selepas ia berubah. Kesemuanya memerlukan pembaikan sebelum penggunaan operasi.
4. **Risiko bersyarat:** RLS Supabase yang disimpan dalam source terlalu permisif jika benar-benar diterapkan; SQLite lokal tidak memenuhi persistence multi-instance/ephemeral runtime; public bind tidak membuktikan TLS. Status live belum disahkan.
5. **Katalog/media:** bukti sosial bahawa item boleh dipesan bukan bukti SKU, harga, saiz atau stok dalam runtime. Katalog hasil build QA kosong (`version 0`, tiada produk), dan screening media meluluskan **0 imej baharu**. Arkib ZIP/foto masih untracked di akar repo.
6. **Landing v0:** screenshot desktop dan mobile 390×844 mempunyai identiti dan hierarki visual yang kuat. Screenshot masih menunjukkan empat bab asal. Lima label ialah cadangan IA/kandungan, bukan perubahan yang patut dianggap sudah diluluskan.

## Dapatan berkeutamaan

### P0 / Critical — perlu ditutup sebelum production

#### 1. Vercel menerbitkan SPA statik, bukan API platform

**Bukti:** `vercel.json:3-12` menetapkan output Vite `dist` dan rewrite semua path `/(.*)` ke `/index.html`. `.github/workflows/vercel-production.yml:19-26` menjalankan build lalu deploy Vercel; repo tidak mempunyai Vercel function/API handler. `server/index.ts:20-25` memulakan `Bun.serve` berasingan, manakala `src/features/platform/client.ts:49` memanggil same-origin `/api/platform/...`.

**Kesan:** Jika Vercel itu endpoint production yang dimaksudkan, login, session, logout, commerce dan route platform tidak disediakan oleh artifact tersebut; request boleh menerima HTML/404, bukan respons API. SQLite, bootstrap state dan worker lokal juga tidak berjalan hanya kerana `dist` berjaya dibina.

**Tindakan:** Pilih satu topology nyata: deploy API Bun pada service persistent berasingan dan route `/api/platform/*` ke sana, atau bina adapter/function Vercel yang mendaftarkan route tersebut. Tambah smoke test pada deployment untuk bootstrap-status, login, session, logout dan respons API. Jangan jadikan `bun run build` bukti bahawa API hidup.

### P1 / High — pembaikan auth, authorization dan operasi

#### 2. Google/Supabase OAuth tidak menghasilkan session platform

**Bukti:** `src/features/platform/AppRouter.tsx:45-48,59-61,79-83,107-113` memanggil `supabase.auth.signInWithOAuth` dan kemudian membaca `/api/platform/session`. `server/platform/auth.ts:29-45` menyelesaikan identiti hanya daripada cookie `platform_session`. Tiada callback, `exchangeCodeForSession`, pemetaan membership atau bridge yang mengeluarkan cookie itu; logout platform juga tidak memanggil `supabase.auth.signOut()` (`server/platform/app.ts:285-293`).

**Kesan:** Supabase boleh mempunyai session browser tetapi platform tetap melihat 401, menyebabkan workspace tidak terbuka. Logout platform juga boleh meninggalkan Supabase session aktif.

**Tindakan:** Pilih satu authority auth. Implement callback PKCE dan pengesahan identiti server-side yang memetakan `auth.users` kepada membership platform sebelum mengeluarkan session/CSRF, atau ubah API supaya memverifikasi Supabase JWT. Uji callback, deep-link, membership, replay, penolakan dan logout dua hala.

#### 3. Bus-freight pilot tiada role/owner boundary

**Bukti:** `server/platform/app.ts:155-157` membaca semua `bus_shipments` tanpa role/owner filtering; create dan status hanya melalui `auth.resolve` (`:244-245`). Service `server/platform/legacyPilots.ts:119-172` tiada semakan role, ownership, revision atau transition; `shared/pilot-contracts.ts:21-30` tiada owner/org scope.

**Kesan:** Pengguna yang sekadar authenticated berpotensi menyenaraikan shipment semua pihak, mencipta booking dan menukar status shipment pengguna lain, termasuk mengundurkan status.

**Tindakan:** Hadkan create/status kepada capability yang betul, simpan owner/organization, tapis GET mengikut scope, dan enforce `expectedRevision` serta state transition monotonic di service layer. Tambah ujian cross-user/cross-role.

#### 4. Origin gate boleh menyekat webhook WhatsApp yang sah

**Bukti:** Semua POST disemak terhadap browser `Origin` di `server/platform/app.ts:257-263`, sebelum webhook branch pada `:279-283` menyemak signature. Test sedia ada membekalkan `Origin` secara manual.

**Kesan:** Provider server-to-server lazimnya tidak menghantar browser Origin; webhook yang sah boleh ditolak sebagai `ORIGIN_DENIED` sebelum HMAC diperiksa.

**Tindakan:** Asingkan route webhook daripada Origin/CSRF browser gate. Kekalkan had body/rate, sahkan signature provider, dan gunakan Origin+CSRF untuk POST browser biasa.

#### 5. Migration rollback boleh memadam order yang telah berubah

**Bukti:** `server/platform/app.ts:164-166` dan `server/platform/migration/migrationReconciler.ts:144-168` memadam order import selepas semakan receipt; tiada perbandingan revision/hash semasa atau semakan payment/case/evidence/fulfilment yang berkait.

**Kesan:** Rollback yang stale/tersalah pilih boleh memadam sejarah order yang sudah digunakan secara operasi.

**Tindakan:** Simpan revision/hash dalam receipt; sekat rollback jika order berubah atau mempunyai rekod kewangan/operasi berkait. Sediakan force + second approval untuk deletion luar biasa dan audit senarai konflik.

#### 6. Polisi RLS terlalu terbuka **jika schema ini telah diterapkan**

**Bukti:** Polisi di `src/services/supabaseClient.ts:95-138` menggunakan `USING (true)` untuk SELECT `orders`, `inventory` dan `jev_audit_logs`, serta `WITH CHECK (true)` untuk INSERT orders. Order menyimpan PII seperti nama, telefon dan lokasi; browser menggunakan publishable/anon key (`:9-22`).

**Kesan:** **Bersyarat sahaja:** jika policy/schema ini berada pada project live, pengguna anon berpotensi membaca data operasi/PII dan menghantar order palsu melalui PostgREST. Saya tidak mengesahkan schema live atau status migration.

**Tindakan:** Jangan gunakan policy awam untuk data operasi. Tambah owner/tenant scope dan polisi `auth.uid()` yang sempit; buat mutation melalui backend/RPC yang mengesahkan membership, validation dan idempotency. Jalankan negative RLS tests dan audit polisi live secara berasingan jika pernah diterapkan.

#### 7. Public bind tanpa bukti TLS **risiko bersyarat**

**Bukti:** `server/runtime-config.ts:4-16` membenarkan `PLATFORM_HOST=0.0.0.0` dan memeriksa HTTPS origin, tetapi `server/index.ts:20-25,32` memulakan Bun tanpa TLS. Cookie hanya mendapat `Secure` apabila request URL kelihatan HTTPS (`server/platform/auth.ts:86-90`, `server/platform/app.ts:288`).

**Kesan:** Allowlist Origin bukan encryption. Jika listener boleh dicapai tanpa TLS terminator yang dipercayai, kredensial/session boleh dihantar melalui HTTP; proxy yang melaporkan scheme HTTP juga boleh menghilangkan `Secure`.

**Tindakan:** Kekalkan listener localhost atau sertakan TLS terminator yang dipercayai dalam deployment proof. Set `Secure` berdasarkan deployment config, gunakan HSTS dan uji attribute cookie selepas termination sebenar.

#### 8. SQLite/filesystem lokal tidak membuktikan persistence deployment

**Bukti:** `server/index.ts:14-19` menggunakan `var/lib/platform/platform.sqlite`; `server/platform/store.ts:44-63` menggunakan `bun:sqlite` dan WAL. `tests/platform/production-persistence.test.ts:13-22,82-90` menguji close/reopen pada filesystem lokal sama. Vercel config hanya menerbitkan `dist`.

**Kesan:** Jika API dipindahkan ke runtime ephemeral atau multi-instance tanpa storage bersama, session/data boleh hilang atau bercanggah antara instance. Ini isu architecture bersyarat, bukan bukti data live hilang.

**Tindakan:** Gunakan database terurus atau service persistent dengan volume, backup/restore drill dan worker terurus; uji restart, multi-instance, concurrent write dan restore.

#### 9. Dakwaan “Production/Live” bercanggah dengan authority status

**Bukti:** README memaparkan badge/pautan production dan auto-deploy (`README.md:12-20,134-143`), tetapi `docs/ABANGCOLEK-SOURCE-OF-TRUTH.md:24,176,180` menyatakan tiada production receipt dan fix lokal belum dipush.

**Tindakan:** Label deployment sebagai “configured/expected” sehingga ada receipt bertarikh yang menyatakan revision, CI, URL, health/API dan persistence check. Pautkan receipt itu dari README.

#### 10. Credential exposure lama belum ada receipt penutupan

**Bukti:** `docs/ABANGCOLEK-SOURCE-OF-TRUTH.md:195-201` merekodkan credential pernah terdedah dalam shared chat dan meminta revoke/rotate/audit, tetapi semakan tidak menemukan receipt bukan-rahsia bahawa tindakan itu selesai. Nilai rahsia tidak dibuka.

**Kesan:** Jika status itu masih semasa, credential lama mungkin berisiko; jika sudah diselesaikan, dokumen tetap membingungkan tanpa closure.

**Tindakan:** Owner sahkan revoke/rotate melalui secret store, kemudian rekod tarikh, scope dan status sahaja—jangan masukkan nilai token dalam laporan.

### P2 / Medium — correctness, UX, konfigurasi dan readiness

#### 11. HMAC WhatsApp menggunakan JSON yang dinormalisasi, bukan raw bytes

`server/platform/app.ts:263,280-282` parse body kemudian membina semula `JSON.stringify`; HMAC dihitung pada payload yang telah dinormalisasi (`server/platform/whatsapp.ts:62-72`, `server/automation/runtimeTransports.ts:155-157`). Payload sah dengan whitespace/newline atau susunan key berbeza boleh gagal. Simpan bytes asal, semak HMAC padanya, kemudian parse; tambah test untuk serialization variation.

#### 12. Cart boleh buntu selepas stok turun

Dalam `src/features/workspaces/commerce.tsx:27-34,64-71`, decrement ditolak jika nilai selepas tolak masih melebihi stok baru. Contoh: 10 unit, stok turun ke 6, saiz pek 2—butang minus cuba 8 berulang kali. Benarkan pengurangan kepada kuantiti positif yang sah tanpa had stok; hadkan stok pada increment dan sediakan warning stale-stock/Remove.

#### 13. Direct-buy boleh menunjukkan quote sebelum availability disahkan

`FlowRenderer.tsx:112-115`/`flow-answers.ts:2-7` mengesahkan pack multiple tetapi bukan stok; `Commerce.quote` memeriksa katalog/versi/pek (`server/platform/commerce.ts:55-66`), manakala stok diperiksa pada submit (`:68-75`). Server masih menghalang order berlebihan, jadi ini isu UX/expectation. Semak quantity sebelum review dan kekalkan semakan atomik ketika submit.

#### 14. Supabase project reference dan key fallback tidak dikawal satu sumber

`src/services/supabaseClient.ts:3-22,90-93` mempunyai default project ref dan empty-key fallback; komen `src/services/supabaseAuth.ts:1-4` menyebut ref berlainan. Nilai production env tidak diperiksa. Satukan config source-of-truth, fail build production jika URL/key tiada atau ref tidak sepadan, tanpa mencetak key.

#### 15. Route public selain home/products tiada HTML prerender route-specific

`scripts/prerender-public.ts:27-35` dan `scripts/public-html.ts:6-22` hanya membina home/products/product. Lokasi, dealer dan bantuan bergantung pada metadata selepas JavaScript mount (`src/features/landing/LandingPage.tsx:17-45`). Prerender/SSR route awam yang diindeks dan uji HTML terus setiap route.

#### 16. `.gitignore` tidak mengabaikan semua `.env.*`

`.gitignore:10-17` mengabaikan `.env` dan `*.local`, bukan `.env.production`/`.env.development`. Tiada secret leak dibuktikan (`git ls-files` hanya menunjukkan `.env.example`), tetapi tambah `.env.*` dengan exception `!.env.example` dan secret scanning.

#### 17. Index/status dan proses REA belum diselaraskan

`docs/README.md:3-12,38-48` masih bertarikh 16 Oktober, sedangkan deliverable 17 Oktober tidak dipaut sebagai current authority. Pelan REA menyenaraikan official quick validator, pressure scenarios dan final manifest yang belum selesai (`docs/superpowers/plans/2026-10-17-reusable-rea-emons-deliverables.md:40-44,69-78`). Lengkapkan atau tandakan blocked dengan receipt dan expiry; jangan anggap custom check pengganti validator rasmi.

#### 18. EMONS deliverable ialah standalone, bukan landing runtime ABANGCOLEK

`outputs/EMONS_COMPONENT_README.md:1-11` meminta integrator copy/import komponen; runtime `src/features/landing/LandingPage.tsx:6-7,59-60` masih menggunakan komponen lain. Jangan laporkan EMONS sebagai sudah live. Jika mahu integrasi, perlukan checkpoint, build/browser test dan rollback note.

Komponen EMONS juga menyertakan dakwaan fakta tanpa provenance bagi setiap string dan memuatkan font/poster luar (`outputs/EmonsHeroNavigation.tsx:28-64,267-279`, `outputs/EmonsHeroNavigation.css:1-28`). Sebelum reuse awam, pautkan evidence/approval bagi setiap claim dan semak hak, hash, fallback serta expiry aset luar.

#### 19. Arkib foto di akar repo belum dikurasi atau diluluskan

`PRODUCT LLH-...` dan `Product Photo-...` sebagai ZIP/folder berada di root sebagai untracked; inventory menyebut 185 fail keseluruhan, sementara screening menyatakan **0 imej baharu diluluskan** (`outputs/abangcolek-product-image-screening-2026-10-17.md:3-7,26-33`). Jangan stage atau auto-import arkib. Kekalkan quarantine, manifest path/hash/owner/rights/review state, kemudian hanya map imej yang diluluskan kepada product ID. Inventori juga terlepas satu salinan `4. Asam Boi Campur.jpg` daripada jadual terperinci—kemas kini jadual atau hasilkan manifest mesin.

#### 20. Bukti orderability sosial tidak bersamaan katalog runtime

Laporan sosial menyebut Jerux boleh dipesan/pre-order tetapi tidak memberikan SKU/varian, harga dan stok lokasi lengkap (`outputs/abangcolek-social-product-availability-2026-10-17.md:9-12,22,31,45-51`). Authority menyatakan katalog sebenar kosong (`docs/ABANGCOLEK-SOURCE-OF-TRUTH.md:90,105-109`); build QA juga version 0/tiada produk. Kekalkan dapatan sosial sebagai external availability evidence, bukan listing/runtime stock. Buat reconciliation product ID/SKU/price/size/rights sebelum mengisi katalog.

#### 21. Liputan cart baru belum membuktikan keseluruhan aliran UI

`tests/platform/customer-cart.test.ts` menguji helper encode/decode/validation, tetapi belum meliputi render Shop/FlowRenderer/FlowForm, multi-SKU add/remove, URL round-trip/pagination dan stok berubah antara review-submit. Tambah integration/E2E tests terutama untuk stale stock dan disabled-checkout messaging. Pelan customer commerce juga merekodkan tiada red-phase test gagal sebelum implementasi; untuk kerja susulan, tunjukkan ujian regression gagal dahulu kemudian lulus selepas fix.

### P3 / Low — kemasan dan kawalan kecil

- Verify token fallback yang diketahui pada webhook: `server/platform/app.ts:271-277` menggunakan literal `whatsapp-verify-token` jika transport tiada. Buang fallback dan fail closed sebagai unavailable.
- Public navigation tidak mengekalkan Ctrl/Cmd-click serta tiada `aria-current` (`src/features/landing/LandingPage.tsx:48-56`).
- Theme toggle tidak menyatakan state semasa melalui `aria-pressed`/label dinamik (`LandingPage.tsx:56`, `WorkspaceNavigation.tsx:92`, `AppRouter.tsx:137`).

## Semakan khusus landing v0 dan label rail

Saya telah melihat screenshot 1440×900, screenshot 390×844, nota sosial di `docs/design/abangcolek-founder-social-research.md`, status branch dan chat dalam In-App Browser.

**Yang berkesan:** logo dan palet emas/merah/hitam/putih/hijau jelas; hero mempunyai hierarchy dan CTA yang menonjol; ilustrasi/produk menyokong cerita tanpa mengganggu CTA. Mobile 390px tidak menunjukkan clipping besar dalam screenshot, dan susunan rail empat bab masih mengekalkan struktur yang sedia ada.

**Perlu diperhalus sebelum dianggap ready:** navigasi atas dan hero/ilustrasi menjadi padat pada mobile. Tambah semakan 320px, viewport pendek/landscape, keyboard focus dan reduced-motion. Saya tidak menjalankan semula Playwright v0; angka 18/18 dan 261/261 datang daripada mesej/nota terdahulu, bukan pengesahan baharu dalam review ini.

**Cadangan label:** buat masa ini **kekalkan empat bab** (`Produk`, `Packing`, `Penghantaran`, `Rangkaian`) seperti screenshot. Lima label (`Sambal`, `Buah`, `Jerux`, `Jelajah`, `Pengasas`) menukar information architecture, bukan sekadar warna. Jadikan lima label itu pilihan kandungan untuk kelulusan owner dahulu:

- `Sambal` boleh menjadi CTA ke katalog, tetapi jangan menyatakan produk/stock aktif jika katalog kosong.
- `Buah` selamat sebagai idea visual/recipe; jangan jadikan SKU atau harga tanpa pengesahan.
- `Jerux` boleh kekal teaser/topik; orderability sosial tidak membuktikan SKU, varian, harga atau stok runtime.
- `Jelajah` hanya paparkan lokasi/pop-up yang disahkan oleh sistem.
- `Pengasas` perlu fakta yang owner-approved. Nota design mengatakan pemilikan silang akaun Instagram belum disahkan; laporan sosial berasingan menggambarkan pautan rasmi dengan cara berlainan. Selesaikan percanggahan provenance itu sebelum menggunakan bio/claim.

Foto TikTok dalam hero boleh kekal sebagai inspirasi/rujukan visual dengan atribusi, tetapi **bukan bukti stok semasa**. Penilaian saya: **approve v0 sebagai prototaip visual untuk review; hold pelaksanaan lima label dan dakwaan produk/pengasas**.

## Chat, worktree, skills dan status perubahan

- Chat yang dibuka dalam In-App Browser mengesahkan anda menyerahkan pilihan isolasi kerja kepada agent; ia memilih worktree berasingan supaya perubahan checkout `main` tidak disentuh. Worktree yang dijumpai ialah `feature/abangcolek-logo-theme-20261017`, HEAD `1b09d1b`, dengan empat fail landing diubah, test/dokumen/preview untracked; belum ada commit/push/deploy.
- Checkout utama masih `main...origin/main` dengan perubahan customer cart/flow, deletion `public/assets/brand/icon128.png`, dan pelbagai outputs, plans, arkib media serta fail kerja untracked. **Jangan `git add .` atau menganggap semua fail untracked sebagai production code.**
- Bundle Superpowers: 11 sub-skill dipasang pada user profile; empat nama bertindih dikekalkan sebagai managed skills dan `reverse-engineer-anything` telah tersedia. Semakan frontmatter khusus dijalankan, tetapi validator rasmi `quick_validate.py` tidak berjaya dimulakan pada Windows. Tandakan validator/pressure tests sebagai belum selesai, bukan fully validated.
- Tiada source change, commit, push atau deploy dibuat oleh review ini.

## Pengesahan dan batas bukti

- Reviewer code mengesahkan lint dan `bunx tsc --noEmit` lulus semasa pemeriksaan. Build QA dibuat dalam `.work/review-build` dengan database katalog sengaja tidak wujud; hasilnya katalog kosong, bukan pengesahan runtime production.
- `git diff --check` tiada isu whitespace; Git hanya mengeluarkan amaran penukaran line-ending LF/CRLF.
- Saya tidak membuka `.env`, tidak memeriksa Vercel/Supabase dashboard, tidak memanggil endpoint production dan tidak mengulang Playwright/E2E. Oleh itu live env, redirect URI, migration/RLS yang benar-benar applied, TLS proxy dan runtime API kekal belum dibuktikan.
- Test yang disebut dalam mesej v0 terdahulu (theme 3/3, platform 261/261, Playwright 18/18, HTTP 200) dicatat sebagai laporan asal sahaja; ia tidak saya dakwa sebagai rerun.

## Susunan tindakan yang disyorkan

1. Tetapkan topology production API + persistence, dan buktikan login/session/logout dengan smoke test.
2. Pilih authority auth dan sambungkan Google OAuth dengan platform membership/session.
3. Tutup authorization bus-freight, webhook Origin/raw-body, migration rollback guards, serta semak RLS/TLS pada deployment sebenar.
4. Baiki cart stale-stock/direct-buy UX dan tambah UI/E2E coverage.
5. Bersihkan release governance: production receipt, closure receipt credential, env ignore rules, current authority index.
6. Kekalkan media sebagai quarantine sehingga SKU/provenance/rights dipetakan; jangan stage arkib ZIP/folder secara pukal.
7. Untuk landing, terima v0 sebagai prototaip visual, uji viewport lebih sempit, dan kekalkan empat bab sehingga owner mengesahkan lima label serta sumber kandungannya.

## Soalan keputusan untuk owner

1. Di manakah API Bun dan database produksi akan dihoskan jika UI kekal di Vercel?
2. Adakah Supabase atau platform cookie sendiri authority auth yang muktamad?
3. Lima label patut mengganti empat bab, atau menjadi pautan/tema tambahan sahaja?
4. Akaun Instagram pengasas yang mana owner sahkan sebagai rasmi, dan kandungan biografi apa yang diluluskan untuk dipaparkan?

**Kesimpulan:** arah produk dan kawalan source mempunyai banyak asas yang baik, tetapi release production perlu ditahan sehingga blocker API/auth serta authorization/integration kritikal ditutup. Landing v0 boleh diteruskan sebagai prototaip visual; jangan menganggap katalog, OAuth, stok, deployment atau lima label sudah disahkan.