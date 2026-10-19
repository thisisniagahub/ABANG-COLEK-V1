> **HISTORICAL / SUPERSEDED — 19 Oktober 2026.** Original AGY prompt retained as evidence. Do not execute this version. Current authority: [master blueprint v2.3](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) and [canonical implementation prompt](../../prompts/IMPLEMENT-ABANGCOLEK.md). Historical paths/versions/metrics below are not current runtime proof.
# ABANGCOLEK — MASTER PROMPT UNTUK AGY: IMPLEMENT SEMUA TASK

**Versi:** 1.0 · **Tarikh penyediaan:** 4 Oktober 2026, Asia/Kuala_Lumpur

**Penerima:** Antigravity / AGY sebagai implementation lead, dengan swarm mengikut kapasiti sebenar.

**Tujuan:** Menyiapkan baki backlog melalui implementasi, verifikasi, integrasi, onboarding dan release yang mempunyai bukti.

**Status dokumen:** PROMPT_READY. Penyediaan prompt ini sendiri bukan bukti task telah dilaksanakan.

> Pengguna boleh menyerahkan keseluruhan dokumen ini kepada AGY sebagai arahan pelaksanaan. Jangan berhenti pada cadangan atau scaffolding apabila implementasi boleh diteruskan. Selesaikan semua kerja yang dibenarkan dan teruskan task bebas sementara menunggu input sebenar. Jangan melabel perkara yang belum diuji, belum connected atau belum diluluskan sebagai complete.

## 1. Arahan utama — hasil yang mesti dicapai

Anda menyambung projek ABANGCOLEK yang sedia ada. Jadikan platform ini satu tempat founder menjalankan jualan, khidmat pelanggan, operasi, QC, stok, kewangan, ejen/stokis, pemasaran, knowledge, pasukan dan automasi.

Implement semua task terbuka dalam backlog, lengkapkan task separa JEV dan putuskan penggunaan hasil research berdasarkan kegunaan sebenar. Kekalkan pengalaman Public/Landing, Customer, Staff, Founder dan Developer. Dealer/stokis ialah organisasi komersial yang berkait dengan membership Customer; jangan mencipta role auth kelima tanpa keputusan architecture yang berjustifikasi.

Keutamaan pengguna:

- Kualiti UI/UX premium, konsisten di seluruh aplikasi dan sidebar, dengan charcoal/lime/violet/lilac, dark/light dan mobile yang kemas.
- Landing berasaskan prinsip Emons: hero berubah melalui scroll, interaction live, visual produk/logo ABANGCOLEK asli.
- Founder boleh menyambung kerja dalam platform dengan context dan rekod tindakan yang kekal.
- Gunakan JEV untuk evidence, typed assessment, uncertainty, policy dan evaluasi; keputusan JEV tidak memberi permission tambahan.
- Tiada subscription, cloud atau model berbayar baharu tanpa arahan jelas. Gunakan sumber percuma atau sedia ada yang disahkan.
- Gunakan swarm secara berkesan, ownership jelas, review bebas dan checkpoint yang boleh disambung agent lain.

Laksanakan kerja kod, ujian, konfigurasi lokal, dokumentasi, release preparation dan pembaikan yang reversible. Gunakan authorization sedia ada apabila tindakan, akaun dan skopnya jelas; jangan meminta pengesahan berulang.

Untuk data bisnes authoritative, akses akaun, migration sebenar, lokasi hosting, public deployment atau kandungan yang hendak dihantar/publish, semak sama ada keputusan dan authorization khusus sudah tersedia. Jika belum, siapkan hasil yang boleh direview dahulu, kemudian minta input yang tepat dalam satu senarai ringkas. Arahan implementasi connector bukan kelulusan menghantar mesej sebenar atau menerbitkan kandungan yang belum diluluskan.

Jangan berhenti seluruh projek kerana satu provider atau data owner belum tersedia. Teruskan task yang tidak bergantung kepadanya. Jika syarat luar belum dipenuhi, laporkan baki dengan tepat; jangan cipta data, akaun, receipt atau claim completion.

## 2. Authority, lokasi dan baseline

| Entiti | Keputusan yang mesti dikekalkan |
|---|---|
| Canonical source | D:\ABANGCOLEK-PLATFORM |
| Runtime/data authoritative lokal | D:\ABANGCOLEK-OS\var |
| SQLite bisnes | D:\ABANGCOLEK-OS\var\lib\platform\platform.sqlite |
| Evidence | Gunakan layout sebenar di retained runtime root; sahkan melalui runbook/config |
| Checkout OS | Data/reference retained; bukan target rewrite atau cleanup |
| Source Git baseline ketika prompt disediakan | main / 250bc0e7af33c27a7024c936afadcc9d7b208251 |
| Remote yang direkodkan | https://github.com/thisidowgnut-source/ABANGCOLEK-PLATFORM.git |
| UI/API lokal | http://127.0.0.1:3000 / http://127.0.0.1:3010 |
| QA disposable | UI3001 / API3011, satu runner pada satu masa |
| Stack sedia ada | React/Vite/Tailwind + Bun + SQLite, modular monolith |

Refresh semua fakta yang boleh berubah sebelum bertindak. Baseline HEAD tidak menggambarkan semua implementasi: banyak perubahan penting masih uncommitted dan sebahagiannya untracked. Jangan checkout/reset kepada HEAD sehingga kehilangan implementasi tersebut.

node_modules pernah merupakan junction ke OS node_modules. Sahkan target; jangan delete/reinstall junction atau target secara automatik.

Keputusan pengguna ialah source PLATFORM dengan data OS dikekalkan. Jangan pindahkan authoritative runtime kepada root baharu, clone/recreate projek, seed DB kosong atau bina router/backend ketiga untuk memudahkan ujian.

### Baseline yang sudah diterima secara lokal

- A01–A05: alignment/source/documentation/build baseline.
- B02: verified local backup/recovery; B03: source-only startup; B04: runtime identity/launcher.
- D01: navigasi empat role, termasuk 18 destinasi Founder dalam tujuh kumpulan.
- D06: Emons implementation, scroll/interactions/mobile emulation/layout.
- D08: dealer approval atomic dengan membership/outlet scope dan audit.
- F01: documentation alignment snapshot.
- E01 separa: LOCAL_RULES 2.1.0, bukan native JEV connected.
- Receipt gabungan terakhir: 210 tests, 1199 assertions, 47 files; lint/build PASS. Ini snapshot terdahulu, bukan keputusan run anda.

Jangan bina semula bahagian yang sudah diterima tanpa defect yang dibuktikan. Kekalkan sebagai regression gates. Physical phone dan host dengan noncancelable wheel belum verified. Business founder belum dibootstrap dan published catalogue masih kosong pada snapshot; semak semula secara privacy-safe.

## 3. Bacaan wajib dan hierarchy

Baca arahan AGENTS.md yang benar-benar applicable pada lokasi source. Kemudian baca:

1. [Source of Truth](../../ABANGCOLEK-SOURCE-OF-TRUTH.md).
2. [Project Alignment Backlog](PROJECT-ALIGNMENT-BACKLOG.md).
3. [Handover A–Z](../../handover/AGENT-HANDOVER-A-Z.md).
4. [Capability Matrix](../../handover/CAPABILITY-MATRIX.md), khususnya receipt AGY dan implementation swarm.
5. [Markdown Alignment Register](../../handover/MARKDOWN-ALIGNMENT-REGISTER.md).
6. [Recovery Runbook](../../runbooks/platform-recovery.md).
7. [ADR authority/source](../../decisions/0001-project-authority-and-continuity.md).
8. [Research index](../../../reports/research/2026-10-02/README.md).
9. [Inventori gambar produk](../../../reports/INVENTORI_IMEJ_PRODUK_ABANGCOLEK_2026-10-03.md) dan [research sosial](../../../reports/RESEARCH_PRODUK_SOSIAL_ABANGCOLEK_2026-10-03.md).

Hierarchy: arahan pengguna semasa dan applicable host policy → keputusan current/source yang verified → backlog/runbook → pelan/research/sejarah. Dokumen ini ialah arahan kerja dan baseline; task completion tetap memerlukan receipt.

Status lama PAUSED/HOLD atau server STOPPED dalam snapshot tidak mengatasi keputusan resume dan bukti semasa. Sebaliknya, jangan anggap membaca dokumen handover lama memberikan permission operasi luar yang belum diputuskan. Refresh konflik dengan source/live evidence dan rekod correction pada dokumen current.

## 4. Preflight dan pelan sebelum edit

Lakukan pemeriksaan read-only dahulu:

~~~powershell
Set-Location -LiteralPath 'D:\ABANGCOLEK-PLATFORM'
git status --short
git rev-parse HEAD
bun --version
node --version
Get-Item -LiteralPath 'node_modules' | Select-Object LinkType, Target
Get-NetTCPConnection -State Listen -LocalPort 3000,3010,3001,3011 -ErrorAction SilentlyContinue |
    Select-Object LocalAddress, LocalPort, OwningProcess
~~~

Inspect origin/account/provider metadata secara privacy-safe; jangan print remote URL jika ia mempunyai credential, environment values, cookies, token atau konfigurasi private. Semak selected runtime, served source, private operator identity dan DB snapshot aggregates dengan cara runbook yang sudah diterima.

Jangan membuka DB authoritative melalui constructor yang boleh menjalankan migration ketika tujuan anda hanya status read-only. Pembukaan SQLite readonly juga boleh mempengaruhi SHM; gunakan verified isolated snapshot untuk pemeriksaan/build apabila sesuai. PID lama atau fail PID sahaja bukan bukti pemilik proses.

Sebelum multi-file edits, simpan implementation plan dalam docs/superpowers/plans dengan:

- Task ID, owner, exact files, dependencies dan acceptance.
- Source/API/data/provider boundaries.
- Ujian RED yang bermakna, implementasi, GREEN dan review.
- Keputusan yang sudah ada serta input sebenar yang masih kurang.
- Rollback dan urutan rollout.

Jika environment mempunyai goal tool yang benar-benar tersedia, gunakan authorization goal pengguna untuk menjejaki objektif implementation ini. Semak goal sedia ada sebelum mencipta yang baharu. Jangan cipta tool/goal API atau token budget sendiri. Jangan tandakan keseluruhan goal complete sehingga semua required acceptance tercapai; status ledger tidak menggantikan syarat host goal tool.

## 5. Architecture yang perlu dikekalkan

~~~text
+------------------------------------------------------+
| Public landing + catalogue + guided customer flows   |
+--------------------------+---------------------------+
                           |
                           v
+------------------------------------------------------+
| AppRouter + session + membership + capabilities      |
| Customer | Staff | Founder | Developer                |
+--------------------------+---------------------------+
                           |
                           v
+------------------------------------------------------+
| Shared typed contracts + scoped /api/platform        |
| Validation | CSRF | idempotency | revision | audit    |
+--------------------------+---------------------------+
                           |
                           v
+------------------------------------------------------+
| Commerce | Work | QC | Dealers | Finance | Marketing |
| JEV assessments | Jobs | Provider adapters           |
+--------------------------+---------------------------+
                           |
                           v
+------------------------------------------------------+
| Authoritative SQLite + evidence + bounded worker     |
| External adapters only when grant/usage verified     |
+------------------------------------------------------+
~~~

Money dalam integer sen; payment dan fulfilment berasingan. Stock ownership dan custody berasingan. Derived commission bukan paid commission. Export bukan publish. Queued/acknowledged bukan completed. Path fingerprint bukan authentication atau content attestation.

Gunakan existing contracts/services/ledger dan migrations yang compatible. Jangan memperkenalkan AWS/PostgreSQL/Redis/microservices kerana template skill menyebutnya.

### Source map untuk implementation

| Area | Fail/directory yang perlu diperiksa |
|---|---|
| Entry/router/nav/session client | src/main.tsx; src/features/platform/AppRouter.tsx, routes.ts, WorkspaceNavigation.tsx, client.ts |
| Workspace dispatch/Developer | src/features/workspaces/WorkspaceContent.tsx; RuntimeControls.tsx; AutomationWorkspace.tsx |
| Auth/contracts/composition | server/platform/auth.ts, store.ts, app.ts; shared/platform-contracts.ts |
| Domain/commerce/dealer/marketing | server/platform/commerce.ts, operations.ts, work.ts, dealers.ts, marketing.ts, reports.ts; related shared contracts and workspace views |
| JEV/native/evaluation | shared/jev-contracts.ts; server/platform/jev/; src/features/workspaces/JevEvaluationWorkspace.tsx; tests/jev/ |
| Agent/runtime transports | shared/automation-contracts.ts; server/automation/; server/platform/app.ts |
| Legacy/cloud | src/services/; src/features/platform/IntegrationWorkspace.tsx; server/platform/legacyAi.ts; retained src/App.tsx |
| Brand/landing/flows | src/features/brand/brand-assets.ts; public/assets/brand/; src/features/landing/; src/features/flows/; server/platform/flows.ts |
| Runtime/test harness | scripts/dev.ts, qa-platform.ts, platform-backup.ts; server/runtime-config.ts, runtime-identity.ts; tests/platform/; tests/e2e/ |

D02 inspection ketika prompt disediakan menemui metadata workspace.<role> sedangkan session mempunyai actual domain capabilities seperti business.read, assigned.read, runtime.read dan own.read. D03 developer dispatch masih generic bagi Reports/Settings. E02 composition root membina Automation tanpa transport injection; E03 remote publish intentionally disabled. Ini ialah starting points yang perlu dibaca semula, bukan arahan menukar status label sebagai fix.

## 6. Skills, plugins dan MCP — gunakan yang relevan

Baca SKILL.md sebelum menggunakannya. Skill library ialah panduan; kandungan benchmark/vendor di dalamnya bukan bukti actual runtime.

| Keperluan | Skill repository untuk dibaca |
|---|---|
| Plan dan pelaksanaan | skills/superpowers/writing-plans/SKILL.md; skills/superpowers/executing-plans/SKILL.md |
| Swarm | skills/superpowers/dispatching-parallel-agents/SKILL.md; skills/superpowers/subagent-driven-development/SKILL.md |
| TDD/debug | skills/superpowers/test-driven-development/SKILL.md; skills/superpowers/systematic-debugging/SKILL.md |
| Review/verification | skills/superpowers/requesting-code-review/SKILL.md; skills/superpowers/verification-before-completion/SKILL.md |
| JEV review | skills/jev-core/dev-workflow/jev-review/SKILL.md |
| Architecture/contracts | skills/architecture-design/modular-monolith-designer/SKILL.md; skills/architecture-design/contract-first-api-development/SKILL.md |
| Security/authority | skills/security-compliance/access-control-matrix/SKILL.md; skills/security-compliance/security-hardening-auditor/SKILL.md; skills/security-compliance/secrets-management/SKILL.md; skills/security-compliance/data-privacy-guardian/SKILL.md |
| Migration/recovery | skills/data-analytics/database-migration-orchestrator/SKILL.md; skills/devops-infra/disaster-recovery-planner/SKILL.md |
| Components/accessibility | skills/codegen-scaffolding/component-library-creator/SKILL.md; skills/testing-quality/accessibility-testing/SKILL.md |
| API/contract tests | skills/testing-quality/api-testing-suite/SKILL.md; skills/testing-quality/contract-testing/SKILL.md |
| Documentation/handover | skills/documentation-knowledge/living-documentation-generator/SKILL.md; skills/documentation-knowledge/architecture-decision-records/SKILL.md; skills/meta/delivery-checklist-and-handoff/SKILL.md |

Semua path skill di atas relatif kepada canonical source. Resolve dan verify sebelum baca. Pilih subset bagi task semasa; jangan load semua 172 skills dalam setiap agent.

Rediscover tool inventory penerima. Nama frontend-design, superpowers, code-review, code-simplifier, context7, agent-sdk-dev, github, prisma, security-guidance atau mana-mana MCP dalam AGENTS bukan bukti installed/authenticated.

- Context7 atau official docs: library/API semasa; sahkan schema/model/API sebelum implement.
- Browser/Playwright/Cua/WebBridge: pilih yang tersedia dan dibenarkan, baca skill host dahulu, test live scroll/click/form.
- GitHub/Git/gh: verify account/repo rights; secret jangan muncul dalam output.
- Supabase: guna skill Supabase jika benar-benar menyentuh sumber Supabase; Postgres best-practices sebelum remote schema changes. SQLite kekal runtime sekarang.
- Vercel/Cloudflare/Railway: gunakan hanya jika sumber sebenar sesuai dan zero-new-spend telah verified.
- Sequential Thinking, Magic UI, Firecrawl, Exa, fal.ai, Figma dan plugin lain ialah optional; jangan reka call atau jadikannya blocker untuk core local work.
- AGY/Hermes inference availability mesti dipisahkan daripada business adapter aplikasi.

Jika tool tiada, gunakan fallback verified atau laporkan exact capability missing. Jangan install/reinstall environment sedia ada secara automatik atau menambah paid service untuk memenuhi senarai tool.

## 7. Swarm dan disiplin AGY

Orchestrator memiliki plan, shared contracts, composition root, final integration, release dan current status docs. Spawn sebanyak task bebas yang kapasiti sebenar membenarkan, dengan bounded parallelism; bukan sebanyak mungkin process tanpa kawalan.

| Worker | Ownership awal | Scope |
|---|---|---|
| A — Product/onboarding | Brand research, onboarding UI/schema/import validation | B05 + D07 |
| B — Access/navigation/developer | Nav capability + developer views/tests | D02 + D03 |
| C — Legacy/data | Migration tooling/maps + selected legacy adapters | D04 + D05 |
| D — JEV/evaluation | JEV contracts/evaluation/native adapter/tests | E01 |
| E — Agent runtime | Scoped Hermes/Agent-Reach transports/jobs/tests | E02 |
| F — Marketing/messaging | Postiz/native WhatsApp adapter/UI/tests | E03 + E04 |
| G — Release/recovery | C01–C05 architecture/CI/persistence/release evidence | C tasks + F02 |
| Independent reviewers | READ-ONLY relevant diff/test evidence | Code/TypeScript/security/UX/JEV review |

Exact file ownership ditentukan selepas source inspection. shared contracts, server/platform/app.ts, workspace dispatch dan common UI tidak boleh menerima writes serentak daripada beberapa worker. Owner tunggal mengintegrasikan cadangan consumer; ledger mesti menyebut file locks dan dependencies.

Workers mesti diberitahu: "Anda tidak bekerja seorang diri. Jangan revert perubahan pengguna/agent lain. Adapt kepada source terkini." Jangan create separate user chats kecuali diminta.

Template assignment:

~~~text
Task ID:
Owner dan exact files:
Source/diff baseline:
Inputs yang dibenarkan:
Dependencies dan shared-file owner:
Required skills:
Acceptance + RED/GREEN tests:
Disallowed operations:
Output: patch/source changes, actual test evidence, limitations, next step.
Anda tidak bekerja seorang diri; jangan overwrite/revert perubahan orang lain.
~~~

### AGY execution pitfalls yang sudah diketahui

Direct coding batch terdahulu tertahan pada run_command dan returned PARTIAL_TIMEOUT. Proposal SUCCESS tidak membuktikan code telah applied atau tests passed.

- Semak actual CLI help, auth, usage dan model list sebelum batch; jangan salin flags secara buta.
- Native executable yang disahkan ialah C:\Users\megat\AppData\Local\agy\bin\agy.exe. Jangan menganggap npm antigravity shim ialah CLI yang sama. Semakan help ketika prompt disediakan berjaya; auth/model/usage semasa tetap perlu refresh sebelum inference.
- CLI print prompt perlu menjadi satu argument lengkap berbentuk --print=<prompt>, selepas flags; semak versi semasa.
- Jangan gunakan --mode plan bersama --disable-slash-commands untuk mendakwa read-only enforcement; kombinasi terdahulu memberi warning.
- --disable-slash-commands juga mematikan skill expansion. Dalam mode itu, baca relevant SKILL.md melalui allowed scoped file access atau sertakan dalam packet; jangan claim skill expansion berjalan.
- Tetapkan bounded deadline/cancellation, unique attempt ID, source-packet SHA, exact prompt hash, log/result paths dan status/error/usage.
- Poll/wait dalam interval pendek supaya orchestrator masih boleh memberi update. Jangan abandon unawaited child promises.
- Jika terminal tools stall, jangan mengulang swarm yang sama tanpa diagnosis. Selepas dua kegagalan, semak error/help/source.
- Gunakan fallback scoped source packet → proposal-only worker → orchestrator/worker dengan terminal verified menjalankan RED → apply → GREEN → independent review.
- Reject stale/empty/partial result, prompt/SHA mismatch dan proposal yang mengubah fail di luar ownership.
- Help semasa menyediakan --print-timeout dan --output-format json. Default timeout 0 menunggu turn selesai; pilih deadline yang bounded berdasarkan help versi sebenar, bukan membiarkan worker tergantung tanpa had.
- Jangan guna bypass permission flags. Jangan hantar whole repo, credentials atau customer data kepada external inference.

Jumlah token AGY dan overhead orchestrator dilaporkan berasingan apabila ada measurement. Jangan mendakwa delegation sentiasa zero token overhead.

## 8. Task ledger dan urutan pelaksanaan

Baseline mempunyai **16 OPEN + 1 PARTIAL_DONE_LOCAL + 1 RESEARCH_ONLY**:

| Task | Deliverable wajib |
|---|---|
| B01 | Credential incident revoke/rotation/access audit receipt |
| B05 | Founder dan data bisnes sebenar onboarded |
| C01 | Reviewed revision + remote Linux CI |
| C02 | Verified zero-new-spend full-platform hosting topology |
| C03 | Security/session/API gates pada actual host |
| C04 | Production persistence/worker/recovery evidence |
| C05 | Actual business journey dan owner acceptance |
| D02 | Capability-aware navigation + backend negative tests |
| D03 | Distinct scoped Developer Reports/Settings |
| D04 | Legacy data maps/dry-run/import/reconciliation |
| D05 | Selected legacy Workspace/logistics/assistant integration |
| D07 | Verified complete product portfolio/assets |
| E01 | Native JEV/evaluation/calibration work + honest local fallback |
| E02 | Hermes/Agent-Reach connected runtime and scoped receipts |
| E03 | Postiz one-channel verified publish pilot |
| E04 | Native WhatsApp/Flows verified capability and receipts |
| E05 | Five research inputs reviewed, disposition and useful synthesis |
| F02 | Reference-safe root cleanup to ≤15 core files |

1. Gelombang 1: preflight/plan; D02/D03; E01 local eval; B05/D07 readiness; B01 owner follow-through; C02 resource discovery.
2. Gelombang 2: D04 dry-run/maps; E02/E03/E04 adapter code/tests; C01 CI preparation; F02 audited housekeeping.
3. Gelombang 3: approved onboarding/import; D05 selected pilots; native/provider pilots; C02–C04 host verification.
4. Gelombang 4: C05 business acceptance, whole-role journeys, docs alignment dan final handover.

Ini urutan dependencies, bukan arahan menangguhkan semua implementation sehingga semua owner input tersedia.

## 9. Acceptance terperinci: B01, B05 dan D07

### B01 — credential incident follow-through

Kenal pasti affected provider/account tanpa menyalin nilai credential. Sediakan arahan revoke/rotate dan review access/usage yang spesifik melalui UI/API rasmi. Owner/account-authorized actor melakukan tindakan; rekod masa, key identifier yang masked dan outcome.

Bezakan private secret daripada Supabase publishable key; audit restrictions/RLS sesuai dengan jenis credential. Jangan menulis secret dalam docs, command arguments, Git, trace atau browser screenshot. Jangan disable integration sekadar menyenyapkan warning.

DONE memerlukan confirmation sebenar daripada account/owner. Prepared runbook sahaja ialah READY, bukan credential sudah rotated.

### B05 + D07 — business truth dan onboarding

Sediakan owner-input/import validation flow yang menyokong:

- Founder identity sebenar dan setup/invitation mengikut existing auth.
- Produk: SKU/owner-approved identity, nama, saiz/unit, harga sen, price version, description, lifecycle, product image provenance/rights.
- Outlet/location, opening-stock quantity/ownership/custody, lot/batch apabila diperlukan.
- SOP/QC thresholds, staff assignments dan polisi operasi.
- Dealer terms: eligibility, organization/outlet, harga/commission sebenar, custody, returns, settlement dan approval.
- Finance opening balances dan polisi refund/payment yang relevan.

Sahkan produk melalui listing/social rasmi semasa dan owner approval. Mascot/artwork bukan product SKU; foto historical tidak membuktikan harga/availability terkini. Jangan auto-publish claim RM28/500g/50-bottle terms daripada audit lama.

Baca brand-assets source dan gunakan logo asal serta foto pemilik. Sediakan pending/unverified fields dan validated import preview. Missing input kekal unknown; jangan seed demo data ke authoritative DB.

Owner mesti memasukkan bootstrap token/password secara private melalui existing setup; agent tidak boleh mencipta founder identity/password palsu atau reset bootstrap state. Jika DB sudah bootstrapped, gunakan account flow sedia ada.

Acceptance: owner-approved published catalogue, exact stock reconciliation, staff/dealer scope yang sah, receipts/audit dan public UI menunjukkan data sama. QA fixtures mesti disposable dan jelas synthetic; tidak boleh menjadi onboarding bisnes.

## 10. Acceptance terperinci: D02 dan D03

### D02 — capabilities konsisten dari session ke menu dan API

Inspect actual capability vocabulary dan effective session contract. requiredCapability nav metadata mesti sepadan dengan backend capability checks, actor ownership dan outlet/org scope.

Implement centralized visibility/access decision dengan loading/expired-session behavior yang betul. Deep link tanpa capability menghasilkan denial yang selamat. Jangan percaya capability/role yang dikirim client atau menyembunyikan menu sebagai satu-satunya security.

Ujian: role/capability combinations yang sah; stale/revoked capability; guessed routes; cross-user/outlet/org access; no financial escalation oleh Developer; keyboard/mobile nav tidak regress. Permission denied mesti jelas dan tidak mendedahkan private record.

### D03 — Developer workspace sebenar

Implement Reports dan Settings dengan tujuan berasingan, menggunakan existing contracts:

- Reports: execution/job/evaluation/readiness summaries, outcome receipts, filters dan detail yang dibenarkan.
- Settings: configuration readiness/diagnostics dan existing safe runtime controls mengikut actual capability.

Jangan dedahkan secrets atau financial/customer records di luar scope. Tunjuk configured, disconnected, running, failed dan unknown berdasarkan source sebenar. Jangan label provider connected kerana health response mempunyai field statik.

Acceptance: kedua-dua destinasi mempunyai content/action yang berbeza, endpoint scoped, error/empty/loading states, keyboard/mobile/dark-light dan negative access tests.

## 11. Acceptance terperinci: D04 dan D05

### D04 — audited migration/parity

Inventory legacy Google/Supabase sumber secara read-only melalui akses yang sah. Sediakan mapping user/owner/source-ID, SKU/price/version, lifecycle, timestamps dan evidence references.

Email sama tidak menyatukan identity/authority. Jangan transplant sessions/token. Tetapkan ownership conflicts, duplicate policy, rejected rows dan mapping receipts. Buat dry-run terhadap isolated snapshot; import tidak boleh silent dual-write.

Sebelum actual write: semak approval/data selection, verified backup, known writers, migration compatibility dan rollback. Import mesti bounded, resumable/idempotent dengan reconciliation jumlah/identity/ledger totals dan evidence links. Jangan memindahkan authoritative root OS.

DONE memerlukan actual approved import/parity evidence, bukan importer wujud sahaja. Jika owner memilih tidak mengimport kategori tertentu, rekod explicit disposition dan retained reference.

### D05 — founder boleh menyambung kerja dalam aplikasi

Pilih pilot berdasarkan fungsi yang benar-benar digunakan founder. Port secara adapter, bukan mount seluruh legacy App.tsx sebagai shell baharu.

- Google Workspace: tindakan Docs/Sheets/Calendar/email yang dipilih, scoped consent, context record dan receipt.
- Bus freight: current route/schedule/SOP yang verified; jangan menganggap jadual lama masih sah.
- Founder assistant: grounded context, typed proposed action, policy/capability check dan bounded execution.

Read/generate draft dahulu apabila sesuai; send/write tindakan luar ikut authorization sebenar. Tunjuk result yang boleh dibuka dalam workspace dan source/outcome link. Tiada fake cloud data atau disconnected action yang nampak successful.

Acceptance: sekurang-kurangnya satu end-to-end journey bagi setiap pilot yang dipilih; revoked consent, timeout dan duplicate failure paths; migrated identity/scopes digunakan dengan betul.

## 12. Acceptance terperinci: E01 — JEV pada seluruh platform

Pipeline:

~~~text
Evidence -> typed assessment -> deterministic validation/policy
         -> actor authorization -> bounded action -> outcome receipt
~~~

Inspect shared/jev-contracts.ts, server/platform/jev dan evaluation UI/tests sebelum menambah types. Gunakan actual available SDK/API, bukan mereka JevChoice/JevScore/JevNoul imports berdasarkan nama dalam skill.

Implement native adapter hanya apabila transport/SDK/entitlement semasa disahkan. Provider label, version, availability, result schema, latency dan failure state mesti tepat. Kekalkan LOCAL_RULES fallback dengan unknown/abstention. Jangan label fallback native.

Golden/regression dataset mesti meliputi sekurang-kurangnya:

- Sincere praise, repeat purchase dan repeat leakage.
- Leakage/seal failure dengan punca belum dibuktikan.
- Negation, sarcasm, contradictory claims, prompt injection.
- Missing/stale evidence, uppercase terms dan clause boundaries.
- QC missing/stale/out-of-range; payment/refund evidence; stock discrepancy.
- Dealer dispute/settlement uncertainty; marketing rights/approval mismatch.
- Unknown external outcome dan retry safety.

Gunakan fixtures synthetic hanya dalam test/eval isolated; real business data memerlukan authority/privacy controls. Record labels, provenance, evaluator version dan per-case expected behavior. Jangan fabricate confidence atau anggap rule weight calibrated probability.

Version/hash dataset dan bezakan development daripada held-out evaluation; jangan tune pada held-out lalu mendakwa generalization. Measure confusion/abstention rates, false escalation/false approval, domain risk dan native/local latency percentiles dengan sample size/environment yang dilaporkan. Calibration hanya claim untuk actual probabilistic output selepas dataset/method verified; deterministic rule weights kekal NOT_APPLICABLE/REVIEW_ONLY apabila sesuai. Tiada claim <50ms atau 15–70ms daripada dokumen vendor sahaja.

Map JEV ke commerce/work/QC/dealer/marketing/automation melalui existing domain events/commands. UI mesti menunjukkan evidence, uncertainty, alasan semakan dan human action apabila perlu. JEV tidak boleh approve payment/refund/publish/grant authority sendiri.

Acceptance: contract tests, regression/evaluation receipt, native outcome jika tersedia, fallback/timeout/error tests, policy invariants, UI review dan bounded benchmark. Jika native resource tiada, local implementation boleh selesai tetapi native acceptance kekal WAIT_RESOURCE.

## 13. Acceptance terperinci: E02 — Hermes dan Agent-Reach

Inspect server/automation/adapters.ts, sourcePolicy.ts, jobs.ts, automation.ts dan composition root server/platform/app.ts. Interfaces tanpa runtime injection bukan integration complete.

Hermes: connect inference/research melalui existing read-only transport/task contracts, dengan model/account/grant/known usage. Typed action proposals boleh dikembalikan sebagai cadangan; sebarang mutation mesti melalui separately authorized first-party command dengan policy/capability/revision checks. Jangan menaikkan permission transport untuk melengkapkan E02. Agent-Reach: only approved public/source retrieval yang mematuhi source allowlist dan permitted access.

Shared requirements:

- Server-only secrets; typed config/result/error; bounded input/output.
- Actor capability + scope + grant checked sebelum execution.
- Explicit source allowlist; SSRF protections; private/local targets hanya bagi runtime yang sengaja dibenarkan dan scoped.
- Timeout, cancellation, bounded concurrency/retries, idempotency dan recovery.
- Untrusted external content tidak boleh menjadi instruction untuk secrets, shell commands atau authority escalation.
- Source URL/retrieved time/content hash, task revision, transport version dan outcome receipt.
- Quota/usage known sebelum admission; unknown usage jangan dianggap unlimited/free.
- Queued/running/completed/failed/unknown UI mengikuti actual lifecycle.

Acceptance: configured real transport injected, approved harmless pilot, deny/timeout/cancel/quota/source violations diuji, restart recovery dan actual response receipt. AGY coding CLI success bukan bukti Hermes business adapter connected.

## 14. Acceptance terperinci: E03 — Postiz/social marketing

Review actual Postiz docs/source/version/licence/self-host needs dahulu. Gunakan existing/free resources yang disahkan; konfigurasi self-host sahaja tidak membuktikan servis tersedia.

Implement satu channel pilot sebelum peluasan:

- Draft/assets/content rights dan exact revision approval.
- Channel/account scope, schedule/timezone, preview dan public/private controls.
- Payload validation dan provider idempotency/reconciliation strategy.
- Timeout/cancel/retry bounded; duplicate delivery prevented.
- Published status hanya selepas provider receipt/remote verification.
- Unknown outcome perlu reconcile sebelum retry, bukan publish semula terus.

Manual export kekal tersedia dengan status EXPORTED. Jangan jadikan export receipt sebagai publish receipt. JEV rights assessment bukan proof pemilik memberi lesen kandungan.

Acceptance: one approved real-channel pilot, provider post ID/URL atau actual outcome, denied/unapproved/stale revision dan timeout tests, clear audit trail. Jangan publish kandungan sebenar untuk test tanpa kelulusan exact content/channel.

## 15. Acceptance terperinci: E04 — WhatsApp dan flows

Refresh official account/API/Flows eligibility, capability, restrictions dan actual current cost/limits. Jangan menganggap WhatsApp Business app, web flow, Cloud API dan native Flows adalah capability yang sama.

Implement adapter seam dan guided UI dahulu. Native path mesti menggunakan allowed official capability; jangan automate WhatsApp Web, bypass login/restrictions atau invent delivery receipts untuk memenuhi zero-cost requirement.

Support flow yang relevan: product enquiry/order intake, dealer application/restock dan complaint evidence, mengikut existing domain schemas. Payload/session/scope/evidence dan consent mestilah validated; rate limit dan webhook signature/replay handling perlu diuji mengikut actual API.

Owner phone/customer data dan message content private. Real sends memerlukan approved recipient/purpose/content dan account access. Acceptance membezakan requested, accepted, sent, delivered, failed dan unknown.

Jika native capability memerlukan resource/cost yang belum authorized, kekalkan provider disabled dengan readiness reason yang jelas. Selesaikan web-guided workflow dan adapter tests; jangan mark E04 native complete.

## 16. Acceptance terperinci: E05 — research menjadi keputusan yang berguna

Baca lima research reports serta synthesis sedia ada. Refresh primary sources ketika membuat keputusan implementasi; semak URL/product benar-benar wujud, availability, licence dan access. Jika source tidak tersedia, rekod unavailable; jangan mencipta documentation atau API.

| Input | Kegunaan yang perlu dinilai, bukan claim vendor feature |
|---|---|
| Grok Bot | Source-linked insights/monitoring atau assistant entry point yang relevan |
| Meta Muse | Prinsip interaction/visual/simulation yang boleh digunakan secara sah |
| OpenAI dots | Struktur reasoning/context/workflow yang boleh dipadankan dengan domain |
| DeepSeek Harness | Task contracts, execution monitoring, recovery dan evaluation |
| Hermes | Reusable scoped agent runtime; actual integration berada di E02 |

Deliver decision matrix: masalah ABANGCOLEK, available capability, evidence, zero-new-spend fit, risk, chosen pattern, actual code/task mapping dan acceptance.

Implement pattern yang sesuai tanpa menggantikan architecture. Jika sesuatu vendor tidak relevan atau unavailable, rekod keputusan accepted/deferred/rejected dengan alasan. E05 boleh DONE_DOCUMENTED melalui synthesis/disposition yang lengkap; ini tidak menandakan vendor connector connected. Jangan membuat lima connector kosong semata-mata memenuhi nama.

## 17. Acceptance terperinci: C01–C05 — production

### C01 — revision dan Linux CI

Preserve semua existing diffs. Review code/TypeScript dan security bagi auth/data. Prepare atomic conventional commits pada branch sesuai jika scope membenarkan; jangan include private var, credentials, generated runtime fixture databases atau test artifacts. Labelled synthetic test fixtures dalam source tests boleh dan perlu versioned apabila diperlukan oleh suite; jangan kelirukan dengan private var/run/e2e-fixture.json.

Remote push/PR/release ikut authorization/account rights sebenar. Linux CI mesti install dengan lockfile/pinned Bun yang sesuai, lint, tests dan build pada SHA yang sama. Rekod run URL/status/SHA; local pass bukan remote CI pass.

### C02 — full-platform topology

Buat ADR daripada resources sedia ada: frontend, Bun API, authoritative database, evidence, worker, TLS, backup location, origin, filesystem/volume retention dan zero-new-spend limits.

Vite/dist deployment atau Vercel SPA fallback tidak deploy Bun API/SQLite/evidence/worker. Jika hosting hanya menyokong frontend, jangan mark full platform ready. Jangan memindahkan data root atau menambah paid service tanpa keputusan sebenar.

Sediakan deploy config/runbook yang compatible dengan runtime. Jika tiada host sesuai, local-only readiness kekal jujur dan C02 WAIT_RESOURCE.

### C03 — actual host security

Verify API JSON/content type di same origin yang dipilih, secure cookie/session settings, CSRF, origin allowlist, private no-store, negative role/ownership/scope dan rate limits. Jangan cache workspace/evidence dalam public service worker.

Verify log redaction, secret server-side dan public/private route boundaries. Host proxy/TLS behavior mesti diuji, bukan source config sahaja.

### C04 — persistence, worker dan recovery

Prove data dan evidence kekal selepas restart/redeploy. Exercise bounded job recovery, unknown remote outcome, backup manifest/integrity/restore dan schema-compatible rollback.

Tentukan backup retention dan offsite destination sedia ada yang authorized. Local snapshot sahaja bukan offsite redundancy. Jangan raw-copy live SQLite file tanpa WAL/evidence semantics; ikut accepted recovery procedure.

### C05 — business acceptance

Pada actual release URL dan exact revision:

- Public: logo/product truth, Emons scroll, catalogue, enquiry/signup.
- Customer: own order/receipt/status/complaint.
- Staff: assigned task, fulfilment/QC/SOP dan shift close mengikut outlet.
- Founder: approvals, stock, finance, dealer, marketing, people dan reports.
- Dealer: application, restock, receive, return dan settlement.
- Developer: jobs/evaluation/scoped diagnostics tanpa financial escalation.

Real business acceptance tidak boleh diganti QA fixture screenshots. Rekod owner acceptance dan baki limitation. READY_PUBLIC hanya selepas C01–C05 serta business data gates lulus.

## 18. F02 dan konsistensi UI/dokumentasi

### Root housekeeping

Audit imports, scripts, metadata, build/public entrypoints dan docs references sebelum move/delete. Sasaran ≤15 core root files. Jangan memadam legacy/source/OS kerana laporan lama melabelnya unused.

Preserve historical report payloads dan skill frontmatter. Update relevant current links dan register selepas verified moves. Jangan menulis logs/PIDs/temp di root: gunakan var/log, var/run, var/lib, var/spool; MCP packages hanya tools/mcp jika benar-benar diperlukan.

### Global UX regression dan finishing

Semua view yang diubah mesti mempunyai loading/empty/error/denied/disconnected states, consistent controls, shared typography/tokens dan BM/English visible copy.

- Dark/light, desktop/mobile, keyboard/focus, reduced motion dan contrast.
- Sidebar group/active state, mobile drawer focus/Escape/return, role-specific destinations.
- Tiada glass/backdrop blur pada button/.btn/interactive links dan tiada magnetic physics pada controls.
- Immediate active scale 0.97; hover hanya fine pointer.
- Mobile dock/safe-area clearance mengikut applicable AGENTS; action targets dan list clearance tidak overlap.
- Streaming/log panels tidak collapse; action grid mobile yang applicable tidak bertindih.
- Emons live wheel/touch forward/reverse/rearm/dialog/native exit; photo continuity dan no overflow.
- Jangan claim physical device verified melalui emulation. Rekod host/device limitation sebenar.

Jangan redesign seluruh shell atau menggunakan generated logo/product sebagai pengganti artwork pemilik.

## 19. Test execution — isolated dan meaningful

Write meaningful failing-first tests bagi business behavior/bug fixes. Untuk low-impact documentation/cosmetic changes, verify relevant source/diff/browser sahaja; jangan buat test yang sekadar meniru implementation.

Gunakan commands sebenar package semasa dan fail cepat:

~~~powershell
Set-Location -LiteralPath 'D:\ABANGCOLEK-PLATFORM'
bun run lint
if ($LASTEXITCODE -ne 0) { throw 'Lint gagal.' }
bun run test:platform
if ($LASTEXITCODE -ne 0) { throw 'Platform tests gagal.' }
~~~

Build memerlukan selector yang berbeza daripada runtime:

- Runtime: PLATFORM_RUNTIME_ROOT → retained root.
- Prerender: PLATFORM_DATABASE → selected SQLite file.
- Pilih verified isolated restore untuk build apabila DB authoritative live.
- Sahkan DB path, version/count/public products; build exit 0 dengan default DB kosong tidak membuktikan catalogue betul.

Dalam build terminal, tetapkan PLATFORM_DATABASE kepada path verified snapshot yang benar-benar wujud, kemudian:

~~~powershell
bun run build
if ($LASTEXITCODE -ne 0) { throw 'Build gagal.' }
~~~

Untuk business runtime startup, hanya selepas root/process/recovery verified:

~~~powershell
$env:PLATFORM_RUNTIME_ROOT = 'D:\ABANGCOLEK-OS\var'
$env:PLATFORM_DATABASE = 'D:\ABANGCOLEK-OS\var\lib\platform\platform.sqlite'
~~~

Jangan run fixture acceptance pada UI3000/API3010. Gunakan tiga terminal, cwd PLATFORM:

~~~powershell
# Terminal A — disposable UUID database/fixtures
bun run qa:server
~~~

~~~powershell
# Terminal B — UI untuk disposable API
$env:PLATFORM_API_TARGET = 'http://127.0.0.1:3011'
bunx vite --host 127.0.0.1 --port 3001 --strictPort
~~~

~~~powershell
# Terminal C — satu QA runner, bukan parallel fixtures
$env:PLATFORM_TEST_URL = 'http://127.0.0.1:3001'
bunx playwright test -c tests/playwright.config.ts --output var/log/playwright-agy-master
~~~

Playwright config tiada auto webServer dan default URL3000 berbahaya untuk fixture suite. Fail var/run/e2e-fixture.json mempunyai private QA credentials; hanya harness menggunakannya, jangan paste ke report. Context/screenshot/trace mesti disemak privacy.

Scoped tests dahulu; broaden suite hanya bagi remaining risk/release gate. Target ≥80% coverage bagi changed business code, laporkan actual denominator/branch gaps. Jangan claim whole repo coverage daripada scoped files.

Independent code/TypeScript review selepas code edits; security review bagi auth/data/external boundaries; UX live review bagi views. Findings mesti diperbaiki dan diuji sebelum completion.

## 20. Recovery dan rollback

Baca runbook sebelum backup/start/stop. Sahkan actual process ownership, root, selected DB, writers dan schema compatibility. Jangan gunakan PID historical untuk kill dan jangan stop process user yang bukan task-owned.

Backup command boleh instantiate store dan menjalankan constructor migration; jangan anggap ia strictly read-only. Gunakan accepted verified snapshot/restore procedure; backup DB, WAL semantics dan evidence sebagai satu unit. Restore drill mesti isolated dan tidak menjadi authoritative root secara automatik.

Sebelum business import/bootstrap/configuration writes yang dibenarkan: snapshot verified, preview, audit, operation receipt dan reconciliation. Agent hanya melakukan approved data operations.

Jika rollback selepas new writes, pause known writers, preserve latest data/evidence, semak compatibility dan reconcile. Jangan activate snapshot lama sehingga memadam transaksi baharu. Code rollback dan data rollback ialah keputusan berasingan.

## 21. Progress, input owner dan continuation

Beri progress ringkas secara berkala: task yang berubah, bukti baru, keputusan dan input yang diperlukan. Jangan narasi unchanged polling atau dump seluruh tool logs.

Sediakan senarai input owner awal dalam artifact yang boleh diisi:

1. Founder identity/account flow; private credential input melalui setup.
2. Approved product/SKU/photo/size/price/version.
3. Outlets/opening stock/lots/finance balances.
4. SOP/QC/dealer/returns/settlement terms.
5. Cloud source scopes/mapping/import selections.
6. Existing hosting/provider account resources, grants dan allowed usage.
7. Exact pilot channel/recipient/content dan rights approval.

Jangan minta owner mengirim tokens/password/customer exports dalam chat. Gunakan local secure config/UI dan masked readiness receipts.

Teruskan semua task bebas semasa menunggu. Jangan request approval sebelum code/config/preview yang diperlukan sudah konkrit dan reviewable. Authorization yang sudah granted tidak perlu diminta semula.

Simpan checkpoint selepas setiap accepted wave supaya agent lain boleh menyambung: what changed, exact files, source/diff SHA, tests/evidence, pending dependency, next command/task, rollback dan ownership. Jangan mark blocked hanya kerana kerja panjang; ledger dependency waiting tidak mengubah rule goal tool.

## 22. Completion receipts dan Markdown alignment

Status mesti spesifik: IN_PROGRESS, DONE_LOCAL, CONNECTED_VERIFIED, READY_FOR_OWNER, WAIT_OWNER_INPUT, WAIT_RESOURCE, DONE_DOCUMENTED atau PRODUCTION_VERIFIED. Kekalkan ID/status semantics backlog; menambah milestone tidak boleh menutup acceptance asal secara palsu.

Setiap task mesti mempunyai:

~~~text
Task ID / status / owner:
Source directory / branch / HEAD / diff fingerprint:
Exact changed files / shared-file owner:
Dependencies / owner decisions:
Implementation and rationale:
RED/GREEN tests / actual command / exit code / timestamp:
Scoped coverage / environment / limits:
Provider transport/version/grant/known usage (masked):
Live journey and receipt IDs:
Data snapshot / reconciliation (privacy-safe):
Independent reviews / findings resolved:
Remaining unverified acceptance:
Rollback and next exact action:
Current docs updated:
~~~

Logs/raw JSON/queues/private receipts → ignored var directories. Sanitized summary → reports atau docs yang appropriate. Jangan embed secrets, private evidence, raw customer messages atau QA credentials dalam tracked Markdown.

Selepas verified changes, update:

- [Source of Truth](../../ABANGCOLEK-SOURCE-OF-TRUTH.md).
- [Backlog](PROJECT-ALIGNMENT-BACKLOG.md), setiap affected task ID.
- [Capability Matrix](../../handover/CAPABILITY-MATRIX.md), source/connected/research/tool status berasingan.
- [Handover A–Z](../../handover/AGENT-HANDOVER-A-Z.md), latest resume/checkpoint.
- [Docs index](../../README.md) dan [Markdown register](../../handover/MARKDOWN-ALIGNMENT-REGISTER.md).
- Relevant runbooks/ADRs dan dated implementation report.

Sahkan links/encoding/whitespace/semantic consistency. Historical counts/test receipts tidak ditukar menjadi fresh claims; tambah dated receipt baharu. Jangan global-rewrite semua skills/research atau menyatakan semua integrations live.

## 23. Final delivery contract

Jangan berhenti selepas plan, architecture drawing, scaffolds, mock API atau UI screenshot jika actual implementation masih boleh dibuat.

Final report mesti menyertakan:

1. Per-task table bagi semua 18 work items, actual status dan evidence.
2. Working folders/runtime/data selectors dan release revision.
3. What source built, tested, connected, onboarded, deployed dan business-accepted.
4. Tests/build/CI/live journey results yang benar-benar dijalankan.
5. Provider outcomes, known usage dan zero-new-spend resources.
6. Owner-data/resource gaps yang masih wujud, dengan exact next input/action.
7. Files/ADRs/runbooks/checkpoints dan rollback.

Keseluruhan projek boleh disebut COMPLETE hanya apabila required onboarding, integrations yang dipilih, production gates dan business acceptance selesai dengan bukti. Research disposition/deferred unavailable vendor tidak bermaksud connector live. Jika external input tidak tersedia, siapkan semua yang boleh disiapkan dan serahkan remaining dependency dengan jelas; jangan fabricate kejayaan.

**Mulakan sekarang apabila prompt ini diberikan sebagai arahan pelaksanaan: preflight → task plan/ownership → independent work waves → implementation/tests/review → actual approved pilots/onboarding → release/business acceptance → aligned documentation.**


