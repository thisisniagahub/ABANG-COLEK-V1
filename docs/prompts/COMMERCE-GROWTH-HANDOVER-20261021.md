# COPY-READY — Handover Commerce, Dealer Stores dan Orbit

Tarikh: **21 Oktober 2026**. Dokumen ini ialah prompt pembangunan masa hadapan. Task penyediaannya hanya menyelaraskan dokumentasi; tiada fungsi aplikasi, migration, ujian transaksi atau deployment disahkan melalui penulisannya.

**Cara guna:** berikan seluruh fail ini kepada agent penerima yang mempunyai repo sedia ada. Ia melengkapkan [Kilo master](KILO-COMPLETE-PROJECT-20261021.md) dan [matriks 85 requirement](KILO-TASK-MATRIX-20261021.md), bukan menggantikan baki projek dengan task commerce sahaja. Membaca fail tidak melancarkan agent lama atau memberi kelulusan baharu untuk tindakan akaun/production.

---

## Prompt kepada integrator

Anda menyambung ABANGCOLEK dalam repository sedia ada **`D:/ABANGCOLEK-PLATFORM`**. Lengkapkan backlog aplikasi yang masih relevan berdasarkan source, ledger dan receipt semasa, termasuk skop growth di bawah. Teruskan kerja tempatan yang telah diarahkan pengguna sehingga siap atau sehingga hanya gate luar yang tepat tinggal. Jangan berhenti pada scaffolding, cadangan atau laporan worker. Jangan meminta pengguna memilih semula stack, model, route public store, bilangan lapisan referral, plugin atau urutan kerja yang telah ditetapkan di sini.

Jika tugasan pengguna semasa hanya review/dokumentasi, jangan memulakan implementasi aplikasi. Jika tugasan ialah implementasi, pemeriksaan dan pembetulan tempatan reversible berada dalam skopnya; signup, pembelian, langganan, remote migration, mesej pelanggan, merge/push/deploy dan perubahan polisi sebenar memerlukan authority yang sudah jelas dalam sesi. Jangan meminta semula kelulusan yang sudah diberikan. Gate credential/polisi yang tiada direkod tepat; teruskan task bebas tanpa mereka nilainya.

### A. Read order dan authority

1. `AGENTS.md` dan arahan harness/pengguna semasa.
2. `docs/CURRENT-STATUS.md`, `docs/handover/IMPLEMENTATION-CHECKPOINT.md`, actual Git/worktree/source dan ledger `reports/implementation/acceptance-status.json`.
3. `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md` terutama §8, kemudian **`docs/design/commerce-growth.md` sepenuhnya**.
4. `docs/prompts/AGENT-EXECUTION-CONTRACT.md`, `KILO-COMPLETE-PROJECT-20261021.md`, `KILO-TASK-MATRIX-20261021.md` dan prompt fasa yang berkaitan.
5. `docs/design/workspaces.md`, `user-workflows.md`, `landing-page.md`, `copilot-advanced-tools.md`, `copilotkit-ten-features.md` dan `copilot-generative-ui-seven-approaches.md`.
6. Research `docs/research/2026-10-21-dealer-storefronts-proven-models.md` dan `2026-10-21-ahmad-app-concept-review.md` sebagai konteks bukti, bukan arahan komersial.
7. `reports/implementation/domain-policy-decisions.md` serta source/policy yang sebenar sebelum mengaktifkan eligibility/earning/dispatch.

Blueprint root canonical. Fail nested product/architecture ialah compatibility mirrors dengan pautan relatif diselaraskan; sync daripada canonical apabila berubah, jangan mengeditnya sebagai kontrak bebas. Status snapshot dalam Markdown boleh lapuk; jangan menukar angka kepada fakta semasa tanpa receipt. Kekalkan **85 ID: 78 teras + 7 EXT**. CG-01..12 ialah subcriteria di bawah ID tersebut, bukan denominator baharu.

### B. Keputusan produk yang sudah tetap

- Setiap Agent/Stokis aktif mempunyai **Online Store public sendiri yang ABANGCOLEK sediakan dan Dealer Workspace private**. Route sasaran `/kedai/:slug`; slug unik dan stable store ID. Custom domain tidak wajib.
- Direct dealer signup atau jemputan founder tidak memerlukan pembelian terdahulu. Approval/aktivasi canonical menyediakan store/workspace secara idempotent. Pending/rejected bukan kedai aktif.
- Empat auth roles source bukan had bilangan pengalaman produk. Kekalkan membership/grants customer-business untuk authorization sedia ada, tambah dedicated dealer navigation/surface yang diperlukan; jangan memberi privilege founder atau membina sistem identity kedua.
- Anonymous public browse dibenarkan untuk published store. Checkout menggunakan syarat sesi canonical. Private dealer management/orders/statements hanya organisasi yang diberi grant; public browse B oleh A bukan IDOR.
- **Store owner, buyer, customer referrer dan fulfiller dipisahkan**, ditentukan server serta dipin kepada order/policy yang sesuai. `ref`, `phone`, slug atau body client bukan authority payee.
- Referral pelanggan **satu peringkat dua hala** berdasarkan eligibility polisi; bukan komisen rangkaian lima tingkat. Wholesale margin, dealer commission, customer referral reward dan loyalty points berasingan. Tiada reward kerana share/signup/klik semata-mata.
- Reorder mencipta draf cart baharu dengan reprice/stock/store/fulfilment/promo/reward checks. Ia tidak mengulangi order atau bayaran lama.
- Kadar/expiry/hold/stacking/MOQ/fees/attribution window/first-last touch/return policy menggunakan konfigurasi approved berversi sahaja. Missing policy → capability reward tertentu disabled dengan sebab; browse/kerja bebas diteruskan apabila kontraknya sah.
- MadConomy dan kadarnya ialah **research-only**. Wallet top-up, cash withdrawal, native wajib, referral berbilang tingkat, paid inference fallback dan backend commerce baharu tidak termasuk skop approved ini.

### C. Preflight yang wajib dilakukan dahulu

Jalankan read-only dan simpan output yang disunting tanpa token:

```powershell
Get-Location
git rev-parse --show-toplevel
git rev-parse HEAD
git status --short
git worktree list --porcelain
git diff --name-only
bun --version
```

Pastikan root/branch/index/dirty state dan runtime/data selectors sebenar. Candidate lama, SHA lama atau port 4777 dalam chat bukan authority working tree atau app runtime. Port 4777 pernah digunakan bagi atlas workflow statik; HTTP 200 di situ tidak membuktikan aplikasi berjalan. Jangan kill proses berdasarkan PID lama.

Simpan manifest hash fail yang akan diedit, status ujian baseline dan sempadan fail setiap assignment. Jangan reset/restore/clean/stash, clone/reinstall/recreate, bulk `git add -A` atau memadam media gitignored. Jika fail berubah ketika worker berjalan, baca semula dan reconcile diff; jangan menimpa perubahan orang lain.

### D. Skills, plugin dan MCP — penggunaan tetap

Semak kewujudan path dan actual callable tools. Baca hanya skill relevan kepada task; nama plugin/config bukan bukti tool authenticated. Tiada pemasangan pukal atau MCP server baharu diperlukan.

| Tugas | Skill utama | Fallback tetap |
|---|---|---|
| Plan/ownership | `C:/Users/megat/.agents/skills/writing-plans/SKILL.md`; `dispatching-parallel-agents/SKILL.md` | Pelan explicit + satu owner/path/task; inline jika slot tiada |
| Isolation | `C:/Users/megat/.agents/skills/using-git-worktrees/SKILL.md` | Reuse verified worktree; jangan migrate candidate lama secara automatik |
| Bug/TDD | `C:/Users/megat/.agents/skills/systematic-debugging/SKILL.md`; `test-driven-development/SKILL.md` | Reproduce → test tingkah laku merah → fix canonical → hijau |
| CopilotKit | `.agents/skills/copilotkit/SKILL.md`; `.agents/skills/copilotkit-cli/SKILL.md` | Official `.md` docs/`llms.txt` dan exact pinned installed source sebelum API code |
| Database/CAS | `C:/Users/megat/.agents/skills/supabase/SKILL.md`; `supabase-postgres-best-practices/SKILL.md` | Official docs + local migration/tests; remote apply kekal gated |
| Browser | `C:/Users/megat/.codex/skills/playwright/SKILL.md` | Existing project runner; browser unavailable = not_run, bukan HTTP substitute |
| Review/completion | `C:/Users/megat/.agents/skills/requesting-code-review/SKILL.md`; `verification-before-completion/SKILL.md` | Independent read-only reviewer jika tersedia; self-review limit direkod jika tiada |

Context7 ialah primary docs lookup jika actual tools tersedia; fallback official CopilotKit/AG-UI/Supabase docs dan pinned source. GitHub/Vercel/Supabase tools hanya selepas account/project identity disahkan. GitHub remote sasaran `thisisniagahub/ABANG-COLEK-V1`, Vercel `niaga-hub-pro/abang-colek-v1`, Supabase ref `yeszjvcnjxumujxinahz`; identifiers ini bukan credentials atau authorization remote write.

Playwright/project CLI membuktikan browser. REA/WebBridge hanya jika runtime forensic/authenticated browser task memerlukannya dan skill/target binding sah. Jangan menghantar mesej pelanggan atau export history untuk menguji connector. Magic UI/image plugins tidak diperlukan untuk menyelesaikan domain commerce; reuse DESIGN.md dan komponen sedia ada.

JEV menggunakan lapisan LOCAL_RULES yang berprovenance apabila relevan QC/risk explanation. Tiada native model/vision/confidence direka; `confidence` yang tidak dikira kekal null. JEV/model tidak meluluskan komisen, refund atau authority.

### E. Ownership dan pelaksanaan

Jika tools delegation tersedia, maksimum **tiga assignment berjalan serentak** selepas memeriksa slot: backend, frontend, ujian. Integrator menyelaras kontrak dan ledger; reviewer read-only dijadual selepas slot tersedia. Satu assignment = satu CG sub-item/acceptance item dengan exact paths, prerequisite dan exit proof; jangan memberi semua baki kepada satu worker. Workers tidak fan-out sendiri atau mengedit lane orang lain. Jika delegation tiada, integrator melaksanakan task sama secara sequential tanpa mendakwa worker berjalan.

| Lane | Owned paths | Kontrak |
|---|---|---|
| Backend | `server/**`, `api/**`, `shared/**` | Canonical commands, session/org/store/fulfilment/reward contracts |
| Frontend | `src/**` | Public store/private workspace, truthful UI, drafts dan callbacks |
| Ujian | `tests/**`, `scripts/**` | Behavioral regressions, browser fixtures, verification |
| Integrator | Docs/policy evidence/ledger/checkpoint | Single writer; tidak mewakilkan tick generated kepada workers |
| Reviewer | Read-only | Security/domain/types/protocol findings; tiada edit tersembunyi |

Frontend consumes contract snapshot backend yang sudah disahkan. Backend memaklumkan schema changes sebelum UI/tests depend kepadanya. Jangan guna `any`, mock runtime atau client authority untuk memintas dependencies. Keseluruhan 10 CPK/7 GUI/10 MOD/32 ADV/7 EXT masih perlu bukti mengikut Kilo matrix; task growth tidak menutup ciri lain secara automatik.

### F. File map — baca sebelum menulis

**EXISTING, perlu reverify:**

- Contracts: `shared/platform-contracts.ts`, `shared/dealer-contracts.ts`, `shared/growth-contracts.ts`, `shared/payment-contracts.ts`, `shared/copilot-contracts.ts`.
- Domain: `server/platform/dealers.ts`, `commerce.ts`, `loyalty.ts`, `marketing.ts`, `auth.ts`, `app.ts`, `paymentCallbacks.ts`, `paymentCallbackRoutes.ts`, `paymentReconciliation.ts`, `store.ts`, `supabasePersistence.ts`.
- UI: `src/features/platform/AppRouter.tsx`, `routes.ts`, `client.ts`, `src/features/workspaces/commerce.tsx`, `DealerLedger.tsx`, `CopilotWorkspace.tsx`, `src/features/copilot/**` dan `src/features/landing/**`.
- Regressions: `tests/platform/dealer-approval.test.ts`, `dealer-completion.test.ts`, `agent-storefront-referral.test.ts`, `dealer-commission-ledger.test.ts`, `loyalty-redemption.test.ts`, `loyalty-redemption-risk.test.ts`, `payment-reconciliation-v24.test.ts`, `payment-callback-hmac.test.ts`, `order-tracking-token.test.ts`.
- Browser: `tests/playwright.config.ts`, `tests/e2e/fixtures.ts`, `dealer-completion.spec.ts`, `platform-commerce.spec.ts`, `commerce-fulfilment.spec.ts`, `marketing-operations.spec.ts`.

**PLANNED jika belum ada equivalent semantic module:** `server/platform/dealerStorefronts.ts`, `shared/dealer-storefront-contracts.ts`, `src/features/storefront/DealerStorefrontPage.tsx`, `src/features/workspaces/DealerWorkspace.tsx`, `tests/platform/dealer-storefront-provisioning.test.ts`, `tests/platform/customer-referral-two-sided.test.ts`, `tests/e2e/dealer-storefront-growth.spec.ts`. Semak equivalent dahulu; jika sudah ada, guna fail itu dan rekod mapping supaya tiada implementasi kedua. Public API route tidak direka dalam prompt; bind melalui router/shared client canonical selepas mapping existing handlers.

### G. Urutan implementasi yang mesti diikuti

Urutan global kekal **baseline → 03A integrity → struktur → Copilot foundation → domain/tools/UI → intelligence → release**. P0/P1/P2 berikut ialah dependency urusan commerce di dalam fasa domain; jangan melangkau runtime/security/release prerequisites atau menangguhkan baki CPK.

1. **CG-01/02, P0:** test pending/rejected/active/duplicate/concurrent activation, store A/B, anonymous published browse dan private IDOR. Implement provisioning durable/idempotent dan dedicated dealer surface. Unknown/suspended slug tidak boleh checkout; tiada leaked private profile.
2. **CG-03/04, P0:** test store owner ≠ fulfiller ≠ customer referrer; store/cart binding, tampered phone/ref/amount, cross-store switch, stale stock/expiry/quarantine, offline revalidation. Implement snapshot canonical tanpa mengubah merchant/payout policy.
3. **CG-05/06, P0:** test verified callback, duplicate/out-of-order/late payment, CAS conflict/restart, unknown-outcome reconciliation, partial refund dan public/private tracking. Satu order/effect/receipt; no blind retry. Live gateway tanpa credentials kekal gate berasingan; semua local work tetap disiapkan.
4. **CG-07/08, P1:** test empat kombinasi buyer/referrer eligibility, single-level depth, self/duplicate, held/rejected/missing risk, stacking margin tepat, exact-once credit/redemption dan refund/post-payout contra. Implement approved policy adapter dan penyata berasingan. Nilai yang tiada tidak menjadi sifar atau rate Ahmad’s.
5. **CG-09/10, P2:** test reorder daripada order sendiri ke cart baharu dengan harga/stok/fulfilment semasa; customer lain ditolak. Test opt-out selepas enqueue, channel/purpose mismatch dan no-consent. Draft/reminder tidak send tanpa grant/consent sebenar.
6. **CG-11:** reuse tools scoped, shared state/Pet dan UI catalog. Buktikan callback/event sebenar; frontend cart action hanya unsent draft. Agent tidak memberi rewards atau override seller melalui state. Logout/revoke/cross-principal late event ditolak.
7. **CG-12:** browser desktop/mobile, light/dark, keyboard, reduced motion, error/empty/offline; semak summary/order/payment/statement yang sama. Tambah pengukuran source-backed checkout success, repeat purchase, contribution selepas insentif, fulfilment, refund dan settlement aging tanpa fixture revenue.
8. Audit semua baki **85 ID** mengikut matrix dan checkpoint; kerja yang sudah benar jangan dibina semula. Laksanakan baki bebas, perincikan blocker luar dan jalankan verification penutup.

Setiap langkah: namakan behavioral test dan assertions dahulu → buktikan merah → implement canonical → hijau → fresh reviewer → receipt. Test sedia ada ditambah apabila boleh. Jangan melemahkan matcher, menambah skip/todo, mengubah denominator atau memanggil negative-only test sebagai bukti happy path.

### H. Verification dan rekod kemajuan

Gunakan runner sedia ada selepas membaca config dan memastikan fixture/runtime disposable:

```powershell
bun run lint
bun scripts/maintenance/check-boundaries.ts
bun run test:platform
bun run build
bun run test:e2e
bun scripts/maintenance/verify-acceptance.ts
bun scripts/maintenance/render-acceptance-register.ts
git diff --check
```

Full E2E memerlukan runtime/fixtures beridentiti sah; jangan seed/restore data operasi. `--list` ialah discovery sahaja. Jalankan targeted test semasa TDD, kemudian gate penuh sekali pada source stabil; ulang selepas perubahan yang memberi kesan sahaja. Verifier/renderer gagal → baiki sebab sebenar dan simpan kegagalan; jangan melangkau build/E2E untuk mengaku release penuh.

**Aliran kemajuan wajib:** named tests/protocol/browser receipts → integrator audit → update canonical ledger menggunakan schema sebenar → verification pada source stabil → renderer menghasilkan `PROJECT-CHECKLIST.md` dan `docs/prompts/ACCEPTANCE-REGISTER.md` → checkpoint. Jangan hand-edit generated ticks/counters. Preserve85IDs, historical receipts dan environment distinction. `verified_local` bukan production; synthetic bukan live.

Untuk CG sub-checklist, simpan status dan evidence refs dalam `docs/handover/IMPLEMENTATION-CHECKPOINT.md`/laporan batch serta kemas kini checkbox dalam `docs/design/commerce-growth.md` hanya apabila bukti sub-item lengkap. Parent ledger row memerlukan seluruh acceptance asal **dan** tambahan, bukan sub-item tunggal. Source/policy changes yang membatalkan bukti memerlukan reassessment bersebab, bukan reset seluruh ledger atau verified diwarisi tanpa semakan.

Setiap laporan batch wajib: CG/requirement IDs, path/hash/HEAD+dirty manifest, command tepat/cwd/exit/count, positive/negative case, environment, browser/receipt refs, reviewer, limitation, gate owner dan **exact next executable task**. Jangan berhenti untuk meminta stack/model/plugin yang sudah tetap; teruskan task bebas jika satu gate luar tidak tersedia.

### I. Definition of Done dan format handoff seterusnya

Projek hanya boleh dipanggil siap mengikut environment yang benar-benar dibuktikan: source stabil, semua acceptance mandatory dipenuhi, lint/build/boundaries/tests/browser hijau, reconciliation/recovery berizin diuji, dan application route/bundle/API sebenar disahkan pada release yang tepat. Push/HTTP200/goal_report bukan bukti seluruh fungsi siap.

Jika gate luar tinggal, laporkan **belum production-complete**, nyatakan local work yang selesai serta owner/credential/policy tepat yang diperlukan tanpa meminta key dalam chat. Jangan menjanjikan 100% bebas ralat berdasarkan prompt.

Handoff akhir gunakan format ini:

```text
CURRENT: repo/branch/HEAD/dirty manifest + runtime/data identity
DONE: CG/85-ID scope, named evidence, environment dan reviewer
VERIFICATION: command/cwd/exit/count + artifact refs
REMAINING: exact local task atau exact external gate/owner/safe state
NEXT: satu tindakan boleh dijalankan tanpa keputusan architecture baharu
FILES: senarai penuh owned changes; perubahan pihak lain dipelihara
RELEASE: authorization/actual deployment SHA/served evidence, atau not_run
```

Mula dengan preflight C dan baca spec, kemudian pilih **task prerequisite pertama yang belum dibuktikan** mengikut urutan G dan checkpoint. Ini pemilihan berdasarkan dependency/evidence yang ditetapkan, bukan membuka semula keputusan produk.
