# ABANGCOLEK — handover A–Z

<!-- COMMERCE-GROWTH-20261021:BEGIN -->
> **Amendment 21 Oktober 2026 — TARGET_DESIGN:** Entry handover Commerce & Growth di bawah ialah sambungan skop semasa, melengkapkan Kilo master untuk baki keseluruhan projek. Arahan/angka/agent roster lama dalam badan kekal sejarah; jangan melancarkan agent lama atau menggunakan candidate lama secara automatik. Kedai setiap dealer, single-level two-sided referral dan canonical attribution/fulfilment mesti dibaca daripada spec, bukan mockup/history.
>
> Rujukan: [spesifikasi canonical](../design/commerce-growth.md) · [handover lengkap](../prompts/COMMERCE-GROWTH-HANDOVER-20261021.md). Generated acceptance kekal berasaskan ledger dan receipt, bukan nota ini.
<!-- COMMERCE-GROWTH-20261021:END -->


<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Diselaraskan: **19 Oktober 2026**. [Master Blueprint v2.4](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md), [Source of Truth](../ABANGCOLEK-SOURCE-OF-TRUTH.md) dan [prompt index](../prompts/README.md) ialah arahan semasa. Snapshot/receipts 3–4 Oktober dikekalkan bertarikh, bukan bukti keadaan host, provider atau production terkini. Tiada test/deploy dijalankan melalui kemas kini ini.

## Current implementation contract

- Stack tetap React/Vite + Bun domain services; CopilotKit TypeScript runtime -> AG-UI -> Google ADK Python service. Founder pilot, fixed-schema A2UI, first-party read-only MCP App; tiada Next.js/monorepo rewrite.
- Scope wajib: 10 ciri CopilotKit, 10 modul, 32 logical tools dan 7 pendekatan Generative UI. Registry/design/prompt menentukan kontrak, bukan jumlah fungsi live.
- Local SQLite dan cloud Supabase authoritative snapshot CAS berbeza. Temporary Vercel database bukan durable store. Sahkan environment/data selectors sebelum run; retained OSvar ialah keputusan local bertarikh.
- Semua inference free-only, exact allowlist/account/data evidence; no paid fallback/overflow. Intelligence Streams/Learning kekal blocked_external jika gate tiada. Native JEV disabled; LOCAL_RULES bukan model probability atau permission kewangan.
- Agent membaca/mencadang melalui scoped canonical tools. Approval != execution; success memerlukan durable receipt. Reconnect/replay tidak mengulangi mutation; unknown memerlukan reconciliation.
- Preserve user/agent dirty changes. Source code/custom SSE/provider mock bukan runtime proof. Gunakan prompt induk terkini, bukan arahan AGY legacy di bawah sebagai automatic authority.
## A. Arahan utama kepada agent penerima

Untuk task semasa gunakan [prompt implementasi terkini](../prompts/README.md). [AGY Master Implementation Prompt](AGY-MASTER-IMPLEMENTATION-PROMPT.md) ialah rujukan tugasan 4 Oktober 2026, bukan pelan Copilot terkini. Ia memetakan 16 task OPEN, E01 separa dan E05 research kepada acceptance dan swarm ownership. Penyediaan prompt tidak menjalankan task atau memberi approval kandungan/account bagi tindakan luar secara automatik; status semasa tetap dalam backlog dan receipt.

Anda menyambung projek ABANGCOLEK, satu platform operasi founder dengan landing page serta workspace Customer, Staff, Founder dan Developer. Baca dokumen ini penuh, kemudian [Source of Truth](../ABANGCOLEK-SOURCE-OF-TRUTH.md), [backlog](../archive/legacy-oct2026/PROJECT-ALIGNMENT-BACKLOG.md), [capability matrix](CAPABILITY-MATRIX.md), [register Markdown](MARKDOWN-ALIGNMENT-REGISTER.md) dan [runbook](../runbooks/platform-recovery.md).

Gunakan repository sedia ada. Jangan clone, recreate, reinstall, reset, delete atau seed business data untuk menghasilkan kejayaan palsu. Lindungi perubahan agent/user lain. Jangan bina aplikasi/router/backend ketiga. Utamakan task dengan ID backlog dan bukti acceptance. Jangan mendakwa hasil verified melalui source sahaja.

Prompt ini menyampaikan konteks; ia **tidak membatalkan arahan hold** atau memberikan arahan baharu untuk deploy, cutover, migration, credential rotation, remote publishing atau menghantar mesej. Teruskan kerja read-only dan reversible yang dibenarkan oleh tugas aktif. Gunakan authorization yang sudah jelas dalam sesi; minta input hanya apabila keputusan sebenar belum tersedia. Jika permintaan semasa hanya handover, berhenti pada handover yang verified.

## B. Hasil yang pengguna mahu

- Founder dapat menyambung kerja dalam satu workspace: jualan, pelanggan, staff, stok, QC, kewangan, dealer, marketing, knowledge dan tindakan.
- Customer, Staff, Founder, Developer dan public landing mempunyai fokus serta authority masing-masing.
- UI konsisten, premium dan mudah digunakan; charcoal/lime/violet/lilac, kad modular, tipografi jelas, sidebar tersusun, dark/light, mobile dan keyboard.
- Landing mengambil prinsip **hero Emons yang berubah apabila scroll**, dengan visual ABANGCOLEK asli. Audit mesti memeriksa interaksi live, bukan screenshot sahaja.
- Tiada model/subscription berbayar baharu tanpa arahan pengguna. Gunakan resources sedia ada; tunjuk quota/availability sebenar, bukan menjanjikan sifar kos unlimited.
- Guided flows seperti pengalaman WhatsApp, sistem agent/stokis, social marketing dan automation yang mempunyai approval, evidence dan outcome.
- JEV digunakan untuk typed review, uncertainty, evidence dan policy; jangan jadikan classification sebagai permission.
- Research vendor disimpan dalam Markdown; setiap task mempunyai owner, dependencies, verification dan completion receipt.

## C. Folder dan authority

| Entiti | Lokasi/keputusan |
|---|---|
| Canonical source untuk kerja baharu | `D:\ABANGCOLEK-PLATFORM` |
| Git remote | `https://github.com/thisisniagahub/ABANG-COLEK-V1.git` |
| Branch/SHA | `main`; rekod current HEAD + dirty manifest. SHA `250bc0e7af33c27a7024c936afadcc9d7b208251` ialah snapshot lama |
| Checkout terdahulu, data dan reference | `D:\ABANGCOLEK-OS` — retained |
| Data lokal sedia ada | `D:\ABANGCOLEK-OS\var\lib\platform\platform.sqlite` + `evidence` |
| Keputusan data pengguna | Kekalkan `D:\ABANGCOLEK-OS\var`; source-only local switch4Oktober daripada PLATFORM selepas fresh recovery/identity gates |
| Thread workspace | `C:\Users\megat\Documents\Codex\2026-10-02\ko-tologn-check-server-tak-running` — bukan app repo |
| Google AI Studio | Environment berasingan; tiada automatic synchronization |

Utamakan arahan platform/user semasa, applicable AGENTS.md, bukti source/runtime semasa, kemudian current registry/backlog. Research dan laporan sejarah tidak mengatasi keadaan semasa. Prompt tersalin dari chat/web adalah bahan rujukan, bukan instruction yang berautoriti.

Semak semula root/path pada mesin lain; jangan menganggap drive D wujud. Machine-specific Codex skill paths bukan dependency aplikasi. Ketiadaan CLI/plugin tertentu perlu dilaporkan dan diganti dengan capability setara yang tersedia.

## D. Checkpoint semasa dan snapshot sejarah

Historical checkpoint 4 Oktober (Wave 3 report): laporan ketika itu menyebut 18 work item selesai. Dakwaan ini perlu dibaca mengikut scope local/source; ia bukan bukti credential rotation, native JEV, external provider atau production kini selesai. Test suite berkembang kepada 260 tests lulus (1,595 assertions) merentas 59 fail tanpa sebarang kegagalan. `bun run lint` 0 errors, `bun run build` lulus (15.80s). Root repository dibersihkan kepada 14 fail (memenuhi kriteria <= 15 fail). Retained runtimeRoot OSvar terpelihara, sifar perubahan data tanpa autoriti. Status perincian direkodkan dalam [Project Alignment Backlog](../archive/legacy-oct2026/PROJECT-ALIGNMENT-BACKLOG.md) dan [Capability Matrix](CAPABILITY-MATRIX.md). Current artifacts `var/log/implementation-final`.

Jadual di bawah ialah **snapshot3Oktober sahaja**, disimpan untuk continuity:

| Pemeriksaan | Snapshot verified |
|---|---|
| UI3000 / API3010 (snapshot lama) | **STOPPED pada receipt asal**; HTTP connection refused, tiada listener netstat |
| PID lama | 13828/29364/15016/25976 tiada proses; OS PID file29364 stale |
| Source local/remote main | SHA baseline sama melalui `git ls-remote`; tiada fetch diperlukan |
| Worktree sebelum handover | 15 dirty entries: 9 modified + 6 untracked; handover menambah diff |
| Bun / Node | Bun1.4.2 / Nodev24.19.0 |
| Dependencies | PLATFORM `node_modules` Junction → OS `node_modules`; jangan delete OS |
| PLATFORM DB default | Tiada SQLite bisnes; tidak boleh disalah anggap kehilangan data OS |
| OS DB read-only aggregates | Users1; active Customer membership1; sessions1 total/0 aktif; founder bootstrapped=false; records5 flow definitions; audit0 |

Tiada catalogue/orders/stock/dealers/marketing transactions dibuktikan dalam data lokal ini. Lima flow definitions ialah struktur order/complaint/dealer application/restock/stock receipt, bukan lima transaksi. Runtime dahulu berjalan dari OS; kenyataan itu kini **sejarah**, bukan live status.

Perubahan alignment lokal yang belum committed: BOM package.json dibuang tanpa mengubah nilai JSON; CI Bun dipin1.4.2 dan `test:platform` ditambah sebelum build; current docs/backlog/runbook/reports dikemas kini. Jangan discard/stash overwrite diff ini tanpa pemeriksaan.

## E. Architecture yang mesti dikekalkan

```text
+--------------------------------------------------+
| Public landing + AppRouter + role workspaces      |
+-------------------------+------------------------+
                          |
                          v
+--------------------------------------------------+
| Shared typed contracts + /api/platform            |
| Session / membership / CSRF / revision / receipts |
+-------------------------+------------------------+
                          |
                          v
+--------------------------------------------------+
| Bun domain services                              |
| Commerce / Work / Operations / Dealers / Marketing|
| JEV / Evidence / Reports / Automation             |
+-------------------------+------------------------+
                          |
                          v
+--------------------------------------------------+
| SQLite + private evidence + audit + local worker  |
+--------------------------------------------------+
```

React/Vite/Tailwind frontend + Bun domain API ialah stack; exact versions diperiksa dari manifest/lockfile, bukan angka dalam snapshot lama. Stack Profile A diadaptasi kepada local Bun/SQLite; pilihan AWS/PostgreSQL/Redis dalam skills bukan arahan migration. Backend menguatkuasakan authority. UI hiding sahaja bukan RBAC. Money dalam sen; ownership berbeza daripada custody; payment berbeza daripada fulfilment; derived commission berbeza daripada paid.

## F. Source map untuk sambung kerja

| Area | Fail/directory yang perlu dibaca |
|---|---|
| Entrypoint/router/nav/client | `src/main.tsx`, `src/features/platform/{AppRouter.tsx,routes.ts,client.ts}` |
| Workspace dispatch | `src/features/workspaces/WorkspaceContent.tsx` |
| API/runtime | `server/index.ts`, `server/runtime-config.ts`, `server/platform/app.ts` |
| Contracts/auth/storage | `shared/platform-contracts.ts`, `server/platform/{auth.ts,store.ts}` |
| Business domains | `server/platform/commerce.ts`, `work.ts`, `operations.ts`, `operationalAmendments.ts`, `dealers.ts`, `marketing.ts`, `reports.ts` |
| Finance/dealer/report UI | `src/features/workspaces/business.tsx`, `DealerLedger.tsx`, `ReportBuilder.tsx` |
| JEV | `server/platform/jev/`, `src/features/workspaces/JevEvaluationWorkspace.tsx`, `tests/jev/` |
| Jobs/remote adapters | `server/automation/`, `src/features/workspaces/AutomationWorkspace.tsx` |
| Guided flow/privacy | `src/features/flows/`, `public/platform-sw.js`, offline draft code |
| Legacy bridge | `src/App.tsx`, `src/services/`, `src/features/platform/IntegrationWorkspace.tsx` |
| Landing/brand | `src/features/landing/`, `src/features/brand/brand-assets.ts`, `public/assets/brand/` |
| Tooling/verification | `scripts/`, `tests/platform/`, `tests/e2e/`, `tests/playwright.config.ts` |

Legacy App.tsx dikekalkan tetapi tidak dimount sebagai utama. Founder legacy page sekarang readiness/shortcuts, bukan keseluruhan Google/Supabase app lama. Kedua-dua checkout mempunyai AppRouter; jangan ulang penjelasan bahawa OS masih hanya SPA lama. Tiada automatic cloud identity/order/task import.

## G. Roles dan journey acceptance

| Pengalaman | Journey utama | Batas wajib |
|---|---|---|
| Public | Kenal brand→produk published→flow/signup/bantuan | Tiada private metrics/records |
| Customer | Order→receipt→status→complaint | Rekod sendiri; tidak verify payment sendiri |
| Customer dealer | Application→approval→restock→receive→sell/return→settlement | Organization ownership/custody/terms tepat |
| Staff | Assigned queue→fulfilment/QC/SOP→shift close | Assignment/outlet scope |
| Founder | Onboarding→catalogue/stock→approvals→finance→marketing/people | Explicit capabilities, evidence/revision |
| Developer | Jobs/readiness/evaluation→safe runtime controls | Tiada financial approval automatik |

Empat auth roles: Customer, Staff, Founder, Developer. Dealer/stokis ialah commercial organization yang dihubungkan kepada Customer membership melalui dealerOrgId selepas approval; bukan role auth kelima. Test backend unauthorized access, ownership dan scope, bukan screenshot dropdown role sahaja.

## H. Feature/provider truth

| Sistem | Keadaan | Syarat sebelum claim lebih tinggi |
|---|---|---|
| Commerce/work/QC/finance/dealers | Source/API local wired | Actual onboarding + role journey + reconciliation |
| JEV | `LOCAL_RULES`; native unavailable | Transport/evaluation/latency benchmark sebenar |
| Hermes / Agent-Reach | Interfaces/scaffold; tiada injected runtime transport | Usage, scoped grant, transport, source allowlist, timeout/cancel/recovery dan receipt |
| Postiz | Remote publish blocked | Rights/exact revision approval + connected channel + provider outcome |
| WhatsApp | Guided first-party web flows; native disabled | Approved account/API, availability/cost dan delivery receipt |
| Grok Bot / Muse / dots / DeepSeek Harness | Research/reference | Adapter dan acceptance sendiri; jangan claim executable connectors |
| Google / Supabase | Google bridge source + cloud CAS source, activation/runtime berasingan | Identity/record mapping, scoped grants, private evidence dan actual deployment proof |
| Gemini legacy | Server helper, founder/flag gated | Server-only credential + connected UI/job + usage/outcome proof |
| NVIDIA/Groq/OpenRouter/Ollama | Preference resources sedia ada | Verify model ID/access/limits; jangan percaya angka kunci/model dalam chat sahaja |

Health external unavailable sekarang declared statically; bukan live network probes. Code adapter wujud bukan connected. Exported bukan published, job queued bukan completed, request acknowledged bukan outcome. Research retrieval/hash/permitted use berbeza daripada content rights.

## I. JEV — cara guna dengan betul

Gunakan aliran `evidence → typed assessment → deterministic validation/policy → authorization → bounded execution → receipt → outcome`. Rekod source, revision, retrieved time, unknowns/abstention dan provider label. Jangan cipta confidence/probability untuk menggantikan bukti atau membuat tuduhan root cause.

Untuk review dokumentasi: setiap claim dikelaskan `VERIFIED_CURRENT`, `VERIFIED_SNAPSHOT`, `PROPOSED`, `RESEARCH_ONLY`, `UNVERIFIED` atau `PAUSED`. Banding source/API/test/log; nyatakan contradiction dan limitation. Kaedah review evidence ini **bukan native TypeSafe inference atau benchmark**.

Untuk domain: payment/refund/stock/rights/QC memerlukan evidence dan actor capability sendiri. Missing/stale/out-of-range QC kekal review/quarantine; leakage tanpa bukti punca kekal undetermined. Unknown remote outcome perlu reconcile sebelum retry. JEV result tidak boleh menaikkan permission actor.

## J. Brand, produk dan arah visual

- Logo asal: `public/assets/brand/abang-colex-logo-original.webp`; lihat `src/features/brand/brand-assets.ts`. Kekalkan artwork dan lettering pemilik.
- Source artwork pemilik: `https://github.com/thisisniagahub/ABANG-COLEK/tree/main/sample-image`, pinned revision `e3f6498446414417feb1e583dad5bb6c0fc3eadc`.
- Foto Sambal Colek sebenar: `public/assets/brand/tiktok-sambal-colek-launch.webp`, source TikTok `https://www.tiktok.com/@styloairpool/video/7683047307016834322`.
- Foto colek buah/cawan: `public/assets/brand/Screenshot 2026-01-16 193536.png`. Lemon8 reference: `https://www.lemon8-app.com/@styloairpool/7549827624869167633?region=my`.
- Foto/history bukan bukti availability/SKU semasa. RM28/500g/pakej50botol dalam preset/report lama memerlukan owner/current listing confirmation. Jangan invent produk daripada mascot, render atau screenshot menu.
- Review sosial dan [inventori imej](../../reports/INVENTORI_IMEJ_PRODUK_ABANGCOLEK_2026-10-03.md) menyokong dua bentuk visual; belum seluruh portfolio.

UI: konsisten charcoal/lime/violet/lilac, hierarchy dan contrast; jangan menjadikan RM300k atau Fortune500 sebagai scope kos. User mahu kualiti pengalaman. D01 implemented4Oktober:18 Founder destinations dalam tujuh groups — Hari ini; Jualan & rangkaian; Operasi & kewangan; Pelanggan & kualiti; Pertumbuhan; Ilmu & laporan; Pentadbiran. Customer/Staff/Developer juga grouped;12unit+5browser tests lulus. Route URLs dan actual capability gates dikekalkan; granular requiredCapability D02 masih backlog.

Buttons tidak menggunakan backdrop blur/glass/magnetic tracking. Hover hanya fine pointer; active scale0.97 immediate. Mobile dock clearance dan safe area, 52px action targets/3-column action grid jika applicable, internal lists bottom clearance36px. Verify tiada overlap, focus trap atau sticky hover. Global dark/light/mobile parity masih acceptance live, bukan claim semua selesai.

## K. Emons task — resumed4Oktober2026

Reference `https://www.emons.de/en` sudah diaudit live: pinned hero, idle loop, chapter transition/reverse, interactive hotspots, final exit/re-entry. [Live audit](../../reports/REVIEW_LIVE_SCROLL_EMONS_2026-10-03.md) memegang bukti; jangan clone artwork/logistics content vendor.

Source implementasi: `scene-controller-model.ts`, `useSceneController.ts`, `AnimatedColekWorld.tsx`, `animated-colek-world.css`, `ScrollWorldHero.tsx`, `scroll-world.css`, `WorldHotspot.tsx` dalam landing, dan `tests/platform/landing-scene-controller.test.ts`. Empat worlds: fruit, packing, delivery, network; source SVG/CSS asli dengan foto produk verified.

**Historical wheel hypothesis:** hotspot-close rearming dicurigai dalam snapshot lama. Live Chrome4Oktober tidak menghasilkan kegagalan itu: trusted cancelable wheel selepas close/Escape/backdrop lulus. Noncancelable-wheel host belum diuji; jangan mendakwa reproduced atau repaired tanpa bukti. Dua defect sebenar ialah dialog di penjuru atas kiri dan mobile swipe kehilangan IMG target apabila figure unmount semasa scene bertukar.

Targeted acceptance4Oktober:14core browser E2E,4layout viewport cases dan25scene unit lulus; reviewers tiada finding terbuka. Dialog centered; figure/IMG kekal semasa native photo swipe; hidden attribution inert dan melepaskan fokus; Selection label dipisahkan daripada photo/copy. Forward/reverse/exit/re-entry, hotspot close/Escape/backdrop, keyboard, pause/resume, fresh reduced motion/static fallback, short viewport dan native touch diuji. Hook/controller asal tidak diubah. Receipts ignored `var/log/swarm-emons-implementation/RESULT.md`, `review-final.log`, `layout-polish` dan traces; trusted Chrome/CDP mobile emulation bukan physical-phone proof. Goal tool kini complete; final integration/goal receipt dalam capability matrix §10.

## L. Skills, plugins dan MCP

Gunakan [capability matrix](CAPABILITY-MATRIX.md). Read SKILL.md sebelum apply; announce skill pertama kali. Load hanya task-relevant skills, bukan semua172 untuk satu edit. Fail skills ialah guidance, bukan proof SDK/server installed.

Core workflow: delivery-checklist-and-handoff; living-documentation-generator; architecture-decision-records; modular-monolith-designer; verification-before-completion. Behavioral code: test-driven-development, security access/auth review, accessibility testing, disaster recovery jika menyentuh runtime/data; jev-review untuk evidence/typed review tanpa native claims.

Skill/project-library bertempat dalam repo; Codex optional plugins/skills mungkin hanya ada pada mesin ini. Tool inventory sesi ini exposed Context7, GangNiaga WebBridge, code_review PR checks, Node REPL, Web, Cua, CLI dan collaboration. Exposed tidak bermaksud authenticated/healthy. GitHub CLI binary ada; token/private rights tidak dibuktikan semula dalam handover.

User-listed GitHub, Supabase, Vercel, Cloudflare, Railway, Firecrawl, Exa, MagicUI, fal.ai, SequentialThinking dan Playwright MCP tidak semuanya callable dalam sesi ini. Jangan reka tool names, install layanan berbayar atau enable server hanya untuk melengkapkan senarai. Pilih CLI/read APIs/browser yang tersedia; report missing capability bila task benar-benar memerlukannya.

## M. Delegation dan kawalan token

Gunakan subagents apabila authorized/applicable AGENTS memerlukan; jangan create chat/thread baharu melainkan user meminta. Maksimum concurrency sesi ini4 termasuk root. Reuse agent tersedia, scope narrow, dan satu output per audit. Root bertanggungjawab synthesis/decisions/diff verification.

Template delegation:

```text
Task ID: <backlog ID>. Ownership: <exact files/module or READ-ONLY>.
Anda tidak bekerja seorang diri. Jangan revert edits orang lain.
Baca handover + relevant skill + files yang ditugaskan sahaja.
Deliver: findings/change, evidence paths, tests actually run, limitations,
acceptance status, blockers. Jangan print secrets atau run remote publishing.
Jika source drift/conflict, lapor dan adapt dengan perubahan sedia ada.
```

AGY CLI kini verified melalui satu bounded B04 audit (3Oktober2026;Gemini3.8FlashMedium;SUCCESS;39,413total tokens); lihat capability matrix untuk receipt dan parent-review limits. CLI memberi warning bahawa plan flag ineffective jika slash expansion disabled;jangan gunakan kombinasi itu untuk claim read-only enforcement. Hermes inference belum verified. Jangan menghantar seluruh repo, credentials atau customer data kepada agent luaran. Task seterusnya hanya selepas current account/provider/usage/allowlist/timeout verified. Compression summaries tidak menggantikan original acceptance evidence. Jangan claim delegation mengurangkan jumlah tokens tanpa measurement. CLI delegation tidak bermakna business adapter aplikasi connected.

Batch susulan enam AGY agents memulangkan audit/planning B04,D01,D02–D03,E01,dealer,E02–E03 pada 3 Oktober 2026: **557,450 reported tokens**, source inputs unchanged, tiada app patch/cutover/vendor activation. Percubaan pertama incomplete; full receipt, permission limitations dan parent corrections dalam capability matrix §9. Raw drafts tidak diterima wholesale; gunakan PARENT-REVIEW.md ignored lokal sebelum pelaksanaan.

## N. Preflight sebelum perubahan

```powershell
Set-Location -LiteralPath 'D:\ABANGCOLEK-PLATFORM'
git status --short
git rev-parse HEAD
git remote get-url origin
git ls-remote origin refs/heads/main
bun --version
node --version
Get-Item -LiteralPath 'node_modules' | Select-Object LinkType,Target
Get-NetTCPConnection -State Listen -LocalPort 3000,3010 -ErrorAction SilentlyContinue |
    Select-Object LocalAddress,LocalPort,OwningProcess
```

Inspect commands/output privately if remote URL can contain credentials. Do not echo env/config/session/token contents. Confirm source files, env selectors and intended database with read-only aggregates. PID file alone is not listener proof. If PowerShell network query stalls, use narrow netstat/HTTP with timeout; timeout alone does not prove process dead.

Write explicit plan before multi-file implementation. Branch prefix codex/ when creating a requested/suitable branch; conventional atomic commits only when commit is in task scope. Preserve current uncommitted work; never reset it to baseline.

## O. Commands verifikasi dan snapshot

Commands verified from package/scripts, not executed by reading this prompt:

```powershell
Set-Location -LiteralPath 'D:\ABANGCOLEK-PLATFORM'
bun run lint
if ($LASTEXITCODE -ne 0) { throw 'Lint gagal.' }
bun run test:platform
if ($LASTEXITCODE -ne 0) { throw 'Platform tests gagal.' }
bun run build
if ($LASTEXITCODE -ne 0) { throw 'Build gagal.' }
```

Previous alignment snapshot: strict JSON parse/package semantic comparison PASS; lint PASS; **166tests/0fail/929assertions/43files**, 24.29s; build PASS, Vite17.13s. Ignored logs `var/log/alignment/{lint.log,platform-tests.log,build.log}`. Catalogue version0/products0 came from missing PLATFORM DB. These are dated receipts, not fresh run for later changes. No new browser E2E/Linux CI/production/user acceptance proven in that snapshot. Run meaningful tests for new behavior and record SHA+diff; avoid coverage percentage claims for entire repo from a partial suite.

## P. QA terasing — tiga terminal

Business API3010/UI3000 must never be targets of disposable fixture tests. QA ports3011/3001 and fixture file are single-run resources; jangan parallel QA runners.

Terminal A, cwd PLATFORM:

```powershell
bun run qa:server
```

Terminal B, cwd PLATFORM:

```powershell
$env:PLATFORM_API_TARGET = 'http://127.0.0.1:3011'
bunx vite --host 127.0.0.1 --port 3001 --strictPort
```

Terminal C, cwd PLATFORM:

```powershell
$env:PLATFORM_TEST_URL = 'http://127.0.0.1:3001'
bunx playwright test -c tests/playwright.config.ts --output var/log/playwright-handover
```

No auto webServer in Playwright config; default URL3000 is dangerous for fixture assumptions. QA creates disposable UUID DB under var/lib/qa and ignored credentials `var/run/e2e-fixture.json`; never paste/read values into report. Browser tool/skill must comply with receiving host policies. Reuse isolation setup even if Cua is the permitted browser route. Inspect privacy before sharing screenshots/traces.

## Q. Two database selectors

Runtime uses `PLATFORM_RUNTIME_ROOT` → `<root>/lib/platform/platform.sqlite`. Prerender build uses **`PLATFORM_DATABASE`**, default checkout `var/lib/platform/platform.sqlite`. The build does not inherit database choice from runtime-root alone.

Source-only cutover retaining old data requires, in each applicable launch/build terminal:

```powershell
$env:PLATFORM_RUNTIME_ROOT = 'D:\ABANGCOLEK-OS\var'
$env:PLATFORM_DATABASE = 'D:\ABANGCOLEK-OS\var\lib\platform\platform.sqlite'
```

Check published snapshot version/count against intended DB. Missing DB produces empty catalogue without fatal build failure; success exit code alone is insufficient. B04 implemented4Oktober: launcher reuses only strict matching operator identity. Configured-path fingerprints are consistency checks, not authentication or source-content attestation. Served module path/diff/revision are verified separately. Prefer verified snapshot for build when original SQLite is live; readonly original connections can still mutate SHM.

## R. Backup dan restore — prepared procedure

Execute only within the chosen backup/cutover task after verifying data root and write state. Backup CLI opens PlatformStore and can apply constructor migrations; it is not strictly read-only. Take final snapshot with known writers stopped. Snapshot includes private DB/sessions/evidence and must remain outside public Git.

```powershell
Set-Location -LiteralPath 'D:\ABANGCOLEK-PLATFORM'
$handoverStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$sourceDatabase = 'D:\ABANGCOLEK-OS\var\lib\platform\platform.sqlite'
$snapshotDirectory = "D:\ABANGCOLEK-PLATFORM\var\lib\backups\handover-$handoverStamp"
$newRuntimeRoot = "D:\ABANGCOLEK-PLATFORM\var\lib\runtimes\handover-$handoverStamp"
$restoreDirectory = Join-Path $newRuntimeRoot 'lib\platform'
if (-not (Test-Path -LiteralPath $sourceDatabase -PathType Leaf)) {
    throw 'Source DB tidak wujud; hentikan prosedur.'
}
if (Test-Path -LiteralPath $snapshotDirectory) { throw 'Snapshot mesti baharu.' }
if (Test-Path -LiteralPath $restoreDirectory) { throw 'Restore mesti baharu.' }
bun scripts/platform-backup.ts backup $sourceDatabase $snapshotDirectory
if ($LASTEXITCODE -ne 0) { throw 'Backup gagal.' }
bun scripts/platform-backup.ts restore $snapshotDirectory $restoreDirectory
if ($LASTEXITCODE -ne 0) { throw 'Restore verification gagal.' }
```

Restore output is DIRECT `<restoreDirectory>/platform.sqlite` + evidence, so passing `<newRuntimeRoot>/lib/platform` is necessary for runtime layout. A drill creates files only; it does not activate recovered data. Verify SHA/size/SQLite integrity/count/references and retention. Local snapshot is not off-site redundancy. Do not raw-copy only live SQLite without WAL/evidence semantics.

## S. Cutover dan rollback gates

User decision on 3 October 2026: retain `D:\ABANGCOLEK-OS\var` initially and use PLATFORM source. Use the source-only selectors in Q for the planned switch. Restored-root startup below is a future alternative requiring a separate decision; it is not the current plan. Before switch: preflight→tests/isolated QA→owner write freeze→known process graceful shutdown→final backup/recovery verification→explicit root launch→scoped smoke/reconciliation→worker re-enable after acceptance. No two writers against same business DB.

After authorization and proof ports are free, restored-root startup:

```powershell
$env:PLATFORM_RUNTIME_ROOT = $newRuntimeRoot
$env:PLATFORM_DATABASE = Join-Path $restoreDirectory 'platform.sqlite'
bun run dev
```

For source-only switch choose selectors in Q instead. Never reuse old PID for Stop-Process; stop only proven owner processes. Verify listener and source/root, JSON API, session/scopes and pre/post DB aggregates. GET bootstrap status proves only readiness and setup state. WorkerAdmission paused blocks new claims, not necessarily remote inflight; readonly release mode is not binary rollback.

Rollback before new writes: stop new source, relaunch old source/root and verify. After new writes: pause writers, retain latest DB/evidence/snapshot, reconcile changes; **do not blindly activate old snapshot**. Code rollback must be schema/data-compatible. Never move/delete OS/junction target as cleanup during cutover.

## T. Founder onboarding dan cloud migration

Current OS DB founder=false; preserving it does not make founder provisioned. Bootstrap `/setup` only when actual chosen DB needs it. On a future already-bootstrapped DB, do not create alternate founder or reset metadata. Owner privately reads `<PLATFORM_RUNTIME_ROOT>/run/owner-bootstrap.token` and enters it locally; token/file presence alone not setup-required proof. No automatic founder/password/demo account.

Owner supplies actual SKU/prices/pack sizes/version, opening stock, outlets, SOP thresholds, dealer terms, finance balances and rights. Catalogue0 must remain honest until verified data is provided. Staff/Developer invitations are scoped/expiring and not proof email delivered.

Google/Supabase import: read-only source inventory→identity/ownership/source-ID mapping→dry-run diff→dedupe→approved import→reconciliation→receipts. Email equality does not merge authority. No silent dual-write or session transplantation. Bus logistics need current verified schedule/SOP; old business narratives are reference only.

## U. Roadmap order dan task IDs

| Urutan | Backlog | Deliverable |
|---|---|---|
| 1 | B01 | Owner handles exposed credential revoke/audit, no token values |
| 2 | B02/B03 | DONE_LOCAL4Oktober: retain OSvar; fresh recovery/source-only switch/identity/rows/live proof; offsite and future migration separate |
| 3 | B05 | B04 identity DONE_LOCAL; genuine founder/catalogue/policies remain OPEN |
| 4 | C01–C05 | Publication when requested; topology/CI/API/persistence/role journeys |
| 5 | D01–D05/D07 | Sidebar groups/capabilities/parity + selective imports + verified products |
| Completed local swarm | D01/D06/D08 | Grouped nav; Emons interaction; atomic dealer approval; receipts in capability matrix §10 |
| Bounded pilots | E01–E05 | JEV eval/agent transport/Postiz/WhatsApp; research remains research |

Independent UI/QA/documentation work may progress when authorized without waiting for every cloud task. Preserve dependencies for irreversible operations. Do not block all local improvements behind a fabricated blanket permission checklist. Refer backlog acceptance, not list items marked done in historical reports.

## V. Release dan zero-new-spend topology

Workflow local diff pins Bun1.4.2 and runs install/lint/platform tests/build before deploy. Baseline remote runs37089230469/37089172927 failed build at SHA250bc0e; local encoding fix is unpublished. Do not claim remote CI recovered.

Source kini mempunyai Vercel API entry dan cloud Supabase CAS. Dev proxy to3010 sahaja tidak menyediakan production backend; permanent local interval worker berbeza daripada bounded cloud drain/worker endpoint. Receiving agent must validate same-origin API JSON/cookies/CSRF, negative RBAC, public/private cache, persistent storage, worker/restart/redeploy recovery, TLS and actual release SHA/READY URL. A frontend200 is not full platform release.

Hosting topology ditetapkan blueprint semasa; verify resources/limits dan laporkan blocker, jangan mereka topology alternatif atau menambah langganan. Do not introduce paid cloud/model or promise free perpetual24/7. Research official provider docs at execution time; static docs/pricing may have changed. Preserve manual/manual-export fallback when provider disconnected.

## W. Security dan recovery invariants

- Shared public chat contained credentials; never duplicate them. Owner credential revoke/audit remains B01. Do not read private key/token files to write handover.
- Server-only provider secrets; placeholders in templates. Client publishable keys require RLS/restrictions review and are not automatically privileged secrets. Google Maps restrictions/quota proof must be checked separately.
- Validate boundary inputs, use parameterized DB, check session/capability/ownership, CSRF/origin and rate limits. No financial auto-approval from agent output.
- Idempotency/revision guards; approval tied to exact content version and rights. Unknown external side effects reconcile before retry.
- Private API/evidence/workspace must not enter service-worker public cache. Logout/account change clears permitted per-user drafts. Offline drafts cannot reserve stock or verify payment.
- Logs/PIDs/dynamic data/queues go var/log,var/run,var/lib,var/spool. Root already has17files; do not add root clutter to satisfy documentation tasks. Root≤15cleanup is backlog housekeeping and needs reference checks, not blind deletion.
- Two failed attempts: stop repetition, investigate actual error/source/docs; never disable integrations just to suppress warnings.

## X. Markdown governance dan alignment

[Register](MARKDOWN-ALIGNMENT-REGISTER.md) inventories every in-scope Markdown: project entries, plans/reports/research and unchanged skills/templates. Current-authority banners on dated docs preserve original evidence while preventing stale runtime, cost, model, native JEV or completion claims from controlling work.

Never rewrite SKILL.md frontmatter globally or turn a research target into live capability. Update SourceOfTruth/backlog after verified change, add dated report for receipt, adjust handover checkpoint when needed. Check local links and semantic conflicts. Scope excludes dependency/generated/private runtime trees node_modules/.git/dist/var; OS retained as reference, not a second documentation authority to keep writing in parallel.

## Y. Completion contract dan checkpoint template

Post-implementation code review is required for code changes; security reviewer for auth/data, appropriate language reviewer, meaningful failing-first tests for business behavior. Documentation-only edits need link/content/encoding/diff verification; do not rerun unrelated business suites solely to make a fresh pass claim.

Ikuti target coverage≥80% yang dinyatakan AGENTS untuk business code yang berubah dengan tests bermakna; lapor denominator/scope dan gaps. Jangan claim seluruh legacy repo memenuhi80% daripada suite platform sahaja. Refresh4Oktober mempunyai282Markdown inventoried,600relative links resolved,55historical payload hashes retained dan218library files unchanged. Prior independent documentation review APPROVE preserved; current code/TypeScript reviewers APPROVE. Lapan historical public landing captures disalin unchanged untuk pautan lokal; bukan fresh QA atau git-tracked artifacts.

```text
Task ID / scope / status:
Source folder / branch / HEAD / uncommitted diff:
Runtime source / UI+API origin / process ownership / timestamp:
Database root / snapshot identity / privacy-safe reconciliation:
Provider state / rights / approvals / known usage:
Changes and rationale:
Evidence: command, exit code, log/test path, SHA+diff, live journey:
What is still unverified / paused / owner-input-dependent:
Rollback / next exact task / documentation updated:
```

Say source exists/tested/runtime connected/data onboarded/production verified/business accepted separately. Never mark full project or paused goal complete through successful handover. Save reports as Markdown inside canonical repo; no secrets/artifact uploads without authorization.

## Z. Kickoff prompt untuk agent seterusnya

```text
Sambung projek ABANGCOLEK dalam D:\ABANGCOLEK-PLATFORM.
Baca docs/handover/AGENT-HANDOVER-A-Z.md penuh, kemudian SourceOfTruth,
PROJECT-ALIGNMENT-BACKLOG, CAPABILITY-MATRIX, Markdown register dan runbook.
Refresh Git/listeners/runtime-root/database/tool availability secara read-only.
Kekalkan OS data/reference dan semua uncommitted changes; jangan recreate/reset.
Emons resumed oleh pengguna4Oktober2026; semak receipt implementation/live QA semasa. Research bukan live provider.
Gunakan skills relevan, delegate bounded tasks dengan ownership yang jelas,
JEV evidence/unknown/policy dan post-change review. Jangan claim native inference.
Sediakan ringkasan keadaan sebenar + task ID seterusnya + implementation plan.
Laksanakan hanya scope yang authorized dalam arahan semasa; jangan anggap
membaca handover ialah arahan cutover/migration/deploy/remote publishing.
Verifikasi acceptance dengan bukti source/API/live/data yang sesuai, kemudian
update current docs/backlog dan checkpoint. Tiada credentials dalam output.
```

## Current skills/MCP instructions

Read `.agents/skills/copilotkit/SKILL.md` sebelum sebarang CopilotKit API code; read `copilotkit-cli` untuk verify wiring. TDD, security/code review, verification-before-completion dan Supabase/Postgres skills digunakan apabila task berkaitan. Repository `skills/jev-core/dev-workflow/jev-review/SKILL.md` ialah evidence review, bukan native inference.

MCP/plugin/CLI yang dinamakan dalam konteks pengguna tidak semestinya callable atau authenticated. Inspect metadata tersedia; gunakan official docs/CLI fallback apabila sesuai. Jangan menambah MCP server, membuat paid subscriptions atau menghantar mesej hanya kerana prompt menyebut integrasi. Task outcome mencatat blocked_external dengan capability/auth/cost reason tepat, sambil meneruskan kerja bebas dependency.

Arahan kickoff Z di atas ialah historical template. Untuk implementasi semasa gunakan [prompt induk](../prompts/IMPLEMENT-ABANGCOLEK.md) dan phase order di index; semua keputusan teknikal tetap di situ. Completion memerlukan final-source gates dan actual receipts, bukan ringkasan ini.
