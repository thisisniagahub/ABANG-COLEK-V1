# AGY — Autonomous Goal + Teamwork Continuation for ABANGCOLEK v2.4

**Supersession21Oktober:** dokumen ini rekod sesi sejarah. Entry semasa ialah [Kilo master](KILO-COMPLETE-PROJECT-20261021.md), [commerce/growth handover](COMMERCE-GROWTH-HANDOVER-20261021.md) dan [spec canonical](../design/commerce-growth.md), bersama arahan pengguna semasa. Jangan memulakan semula agent/candidate lama atau menyalin ticks; receipt → ledger85 → verifier → renderer ialah aliran status semasa. Badan asal dipelihara untuk provenance.

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Tarikh: 20 Oktober 2026, Asia/Kuala_Lumpur. **Dokumen ini ialah prompt pelaksanaan, bukan laporan siap.** Pengguna meminta AGY menyelesaikan semua baki task, mendelegasikan implementasi kepada subagents, mengemas kini ticks selepas bukti sah dan meneruskan kerja rutin tanpa meminta approval berulang. Pengguna turut membenarkan penggunaan Goal apabila membantu.

## A. Arahan terus daripada pengguna

Anda diberi mandat untuk menyambung pelaksanaan ABANGCOLEK v2.4 hingga semua kerja yang boleh dijalankan dengan akses sah sekarang selesai dan disahkan. Jangan berhenti selepas plan, satu feature, satu batch atau laporan subagent. Jangan bertanya sama ada perlu meneruskan, memilih stack, memilih worker atau memilih langkah seterusnya yang sudah ditetapkan di sini.

**Pre-authorized:** pemeriksaan source/runtime, isolated Git worktrees, penulisan ujian dan aplikasi, pembetulan bugs, dependency installation mengikut exact pins dalam lane peribadi, local services, local test fixtures, lint/build/browser QA, independent review, dokumentasi dan reconciliation terpilih. Owned atomic commits dibenarkan selepas gates berkaitan. Arahan push main dan Vercel sedia ada dalam sesi pengguna boleh digunakan hanya selepas release gate dan identity disahkan; bukan izin memintas branch protection, secrets, account atau deployment policy.

Tiada permission untuk mereka credential, menaik taraf subscription, membuka akaun/project cloud baharu, membayar inference/resource, destructive reset/delete/data cutover, menghantar mesej kepada pelanggan atau melaksanakan transaksi bisnes sebenar. Autonomous coding bukan approval founder untuk refund, quarantine, commission adjustment atau publish SOP. Apabila prerequisite luar tiada, rekod blocker tepat dan teruskan semua kerja bebas; jangan menghasilkan approval atau bukti rekaan.

Jika permission atau artifact gate native AGY masih meminta interaksi, jangan menganggap prompt ini menukar settings secara ajaib. Cuba laluan setara yang sah dalam scope sedia ada, teruskan kerja bebas dan laporkan gate tepat. Jangan mengubah konfigurasi global kepada unrestricted, menggunakan bypass atau berjanji semua native prompts boleh dihapuskan.

## B. Execution method yang telah diputuskan

1. **AGY sahaja.** Jangan melancarkan Codex subagents, Copilot CLI, Hermes atau Kilo. Subagents dalam prompt ini ialah subagents AGY.
2. **Sambung Teamwork sedia ada** jika masih hidup. Jangan melancarkan Sentinel/Project Orchestrator kedua. Rekod parent conversation, agent IDs, ownership dan status job sebenar. Fail `.agents/teamwork/` ialah data koordinasi, bukan bukti kemenangan.
3. **Goal:** gunakan satu active goal untuk objektif ini. Jika ada goal sama, sambung; jangan memulakan goal baharu berulang kali. AGY mendokumenkan bahawa goal baharu membatalkan goal sebelumnya. Goal mengubah stopping behavior, bukan permissions atau entitlement.
4. **Teamwork mode: `development`.** Gunakan official SDK, libraries dan source projek. Tolak fabricated results/facade implementation. Jangan pilih `benchmark` yang melarang dependencies yang memang diperlukan projek ini. Test transport mocks dibenarkan untuk unit/failure tests yang dilabel; bukan bukti provider/live integration.
5. Jika tiada team aktif, gunakan native Teamwork invocation yang benar-benar tersedia untuk brief lengkap ini, dengan scope pengguna sudah diberi. Jangan ulang interview bagi keputusan yang sudah dijawab. Jika native initial confirmation tetap diwajibkan produk, nyatakan limit itu; teruskan lane sah melalui native subagents apabila tersedia, tanpa fake Teamwork claim atau membayar upgrade.
6. **Boost hanya untuk blocker:** selepas dua percubaan root-cause yang berbeza gagal, hentikan tekaan, baca pinned source/docs dan gunakan `/boost` pada task terhad jika callable serta entitlement tersedia. Nama slash command bukan jaminan agent boleh menjalankannya sebagai tool; sahkan mekanisme dispatch. Jika tiada, delegasikan research, fix dan review terhad kepada subagents sedia ada. Jangan membuka full-project Boost yang berlumba dengan Teamwork atau menganggap ia menyembuhkan missing credentials.
7. Selesaikan scope secara berterusan. Jika quota/auth/hosting/free-eligibility/approval sah menjadi satu-satunya baki kerja, jangan tight-poll atau mengulang request berbayar: checkpoint, simpan semua kerja, senaraikan exact resume action dan laporkan `BLOCKED_EXTERNAL / IMPLEMENTATION_INCOMPLETE`. Itu bukan projek 100% siap. Jangan tandakan completion goal sebagai bukti semua ciri aplikasi lulus. Patuh mekanisme pause/stop native dan arahan pengguna; tiada daemon baru untuk mengulang run tanpa kawalan.

Rujukan mekanik AGY: [Goal](https://antigravity.google/docs/commands/goal/), [Teamwork](https://antigravity.google/docs/teamwork/), [Boost](https://antigravity.google/docs/boost/), [subagents](https://antigravity.google/docs/subagents/). Ini rujukan produk; bukan izin network data bisnes atau tambahan kos.

## C. Authority, lokasi dan recovery sebelum menulis

**Lane integrasi tetap:** `D:/ABANGCOLEK-WORKTREES/multi-cli-integration-20261020`, branch `work/multi-cli-integration-20261020`. Root asal `D:/ABANGCOLEK-PLATFORM` mempunyai dirty changes pengguna dan active Teamwork; jangan bulk-edit atau restore root.

Snapshot audit 20 Oktober: root/integration HEAD `60311aa`; release main dalam worktree release pada `e736856`. Angka ini bukan arahan reset. Jalankan actual HEAD/branch/index/dirty/unmerged/process checks dahulu.

**Recovery rule:** existing workers yang sedang menulis root mesti diselaraskan melalui AGY parent: biarkan operasi atomik selesai, minta handoff source/diff/log, lepaskan ownership, snapshot fail termasuk untracked/binary, kemudian reconcile per fail ke lane integrasi. Jangan kill proses pengguna, overwrite root, mengulang kerja yang sedang berjalan atau menyalin seluruh folder. Jika ownership belum dilepaskan, buat read-only research atau task bebas dahulu. Root menjadi sumber perubahan yang perlu dipelihara, bukan target untuk rollback. Future implementation workers bekerja pada lane integrasi/child worktrees selepas reconciliation disahkan.

Baca versi terkini dokumen berikut secara sekali lalu; kemudian hanya sections task yang relevan:

1. [PROJECT-CHECKLIST](../../PROJECT-CHECKLIST.md).
2. [Master blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md), [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md).
3. [Execution contract](AGENT-EXECUTION-CONTRACT.md), [acceptance register](ACCEPTANCE-REGISTER.md), [master prompt](IMPLEMENT-ABANGCOLEK.md).
4. [Checkpoint](../handover/IMPLEMENTATION-CHECKPOINT.md) dan `reports/implementation/`.
5. Existing `.agents/teamwork/BRIEFING.md`, `ORIGINAL_REQUEST.md`, current orchestrator `PROJECT.md`, `progress.md`, dispatches, handoffs dan receipts.
6. [AGY continuation terdahulu](CONTINUE-AGY-20261020.md) untuk provenance, [AGY research](../research/2026-10-20-antigravity-cli-power-setup.md) untuk diagnostic context.

Precedence: arahan pengguna terkini -> blueprint/ADR bagi produk -> execution contract/design acceptance -> prompt fasa -> checkpoints/reports. Prompt ini menggantikan arahan orchestration single-writer global lama dengan **maksimum tiga implementation workers pada ownership yang benar-benar tidak bertindih**; ia tidak menukar app architecture, pins, business policies atau acceptance. Jangan menganggap laporan lama mengatasi source/ujian terkini.

Jika Fasa 01 sudah memindahkan dokumen, resolve melalui verified move manifest dan compatibility links. Jangan mencipta dua blueprint yang terus diedit secara berasingan. Dokumen canonical root dan salinan lane perlu diselaraskan terpilih tanpa menindih versi lebih baru.

## D. Findings audit yang mesti ditriage dahulu

Ini observation bertarikh; revalidate sebelum membetulkan. Jangan mengulangi task yang sudah benar-benar dibaiki oleh worker lain.

- Lima suite 03A pernah menghasilkan **40 pass / 0 fail / 216 assertions**. Ini bukan penerimaan penuh seluruh Fasa 03A atau CPK-06. Review mapping setiap acceptance yang ditick; jangan membuang ujian tersebut atau memulakan semula semua implementasi tanpa sebab.
- Tiga suite architecture/runtime/registry pernah menghasilkan **17 pass / 0 fail**. Ujian yang mengharapkan echo atau resit sintetik tidak membuktikan requirement produk.
- `bun run lint` gagal `TS2307` pada `api/platform/copilot/v2.ts:6`; periksa relative import serta composition sebenar. Fix path sahaja tidak melengkapkan runtime.
- `server/agents/copilot/runtime.ts` pernah membalas semula input pengguna dengan status `completed` tanpa actual CopilotKit/ADK call. Ganti dengan official SDK pipeline; unavailable mesti dinyatakan unavailable. Jangan mengekalkan echo sebagai provider success.
- `server/agents/tools/definitions.ts` pernah mengandungi enam registrations walaupun header menyebut 32. Hitung registration/logical capability IDs dan behavior sebenar, bukan komen atau jumlah test.
- `execute_approved_action` pernah menghasilkan `rcpt-${Date.now()}` / `confirmed` tanpa lookup approval, reauthorization, CAS, executor atau durable commit. Tulis regression yang menolak fabricated execution ini. Tanpa executor sah, pulangkan `EXECUTOR_UNAVAILABLE`, tanpa execution-success receipt.
- Checklist pernah mempunyai lima checked core rows tetapi counter/register/header masih menggunakan angka lama. Sync daripada acceptance evidence; jangan menyalin lima ticks ke semua parents.
- Current orchestrator pernah menyenaraikan 01/02/03B/04/06 tetapi **tertinggal 05 Intelligence**. Masukkan semula 05, CPK-02/03, ADV-28 dan related EXT gates secara jelas.
- Ada fail baru dalam root yang belum masuk lane integrasi. Review provenance dan hashes sebelum mengambilnya; jangan menganggap semua untracked files hasil AGY atau semuanya boleh dipublish.
- Run AGY lama pernah exit 0/status SUCCESS dengan response kosong dan timeout yang menamatkan background tasks. Receipt acceptance perlu actual completed commands/source; CLI envelope sahaja tidak memadai.

## E. Skills, plugins dan MCP: keputusan tetap

Pilih **Superpowers** sebagai workflow utama. Read applicable SKILL.md sebelum tugas berkaitan; jangan load semua skills pada setiap turn atau menggabungkan tiga orchestrators daripada Superpowers/Conductor/Gemini Kit. Existing guardian/evidence hooks dipelihara; audit, jangan tambah duplicate stop loops.

| Tugas | Skill/panduan wajib | Fallback apabila tidak tersedia |
| --- | --- | --- |
| Workspace isolation | `using-git-worktrees` | Native `git worktree` inspection/creation dengan branch/path validation; tiada clone semula. |
| Plan/execution | `writing-plans`, `subagent-driven-development`, `dispatching-parallel-agents` | Task packets berstruktur, native AGY roles dan ownership queue. |
| Bugs dan business behavior | `systematic-debugging`, `test-driven-development` | Reproduce -> regression gagal -> fix -> covering tests -> review. |
| CopilotKit | `.agents/skills/copilotkit/SKILL.md` dan `copilotkit-cli/SKILL.md` | Official current docs serta exact pinned package source; verify imports/protocol. |
| SQL/RLS/CAS | Supabase dan `supabase-postgres-best-practices` | Official docs, migration file dan independent database/security review. |
| Browser | Existing Playwright skill/harness; WebBridge skill bagi sesi berizin | Actual available browser adapter; missing browser = not_run, bukan HTTP 200. |
| Review/completion | `requesting-code-review`, `verification-before-completion` | Fresh scoped AGY reviewer dan actual commands/logs. |
| UI | Verified frontend-design skill/plugin jika tersedia; `DESIGN.md` dan design docs | Approved component system, responsive/a11y tests. |
| JEV | Canonical evaluator dan LOCAL_RULES | Tiada external TypeSafe/native/vision inference diperlukan. |

Semak `.agents/skills`, installed AGY skills/plugins dan exact tool names. Plugin/skill names dalam jadual ialah arahan discovery; jangan mereka command atau menganggap plugin Codex automatik tersedia dalam AGY. Existing global skills boleh dibaca di `C:/Users/megat/.agents/skills/` apabila benar-benar wujud dan scope membenarkan.

MCP development:

- **Context7:** docs resolver/query; fallback official docs/pinned source. Jangan tambah MCP baru hanya untuk membuat manifest hijau.
- **GitHub:** connector jika callable; fallback authenticated `git`/`gh` pada `thisisniagahub/ABANG-COLEK-V1`.
- **Browser:** satu harness utama; Playwright bagi local/E2E, WebBridge bagi authenticated user session selepas fresh binding.
- **Supabase:** exact project ref `yeszjvcnjxumujxinahz`; verify identity sebelum remote access. Config mention bukan live connection. SQL migration/testing boleh diteruskan tanpa remote apply.
- **Vercel:** existing team `niaga-hub-pro`, project `abang-colek-v1`, domain `abangcolek.gangniaga.my`; verify actual linked identity. Jangan membuka project/hosting baru.
- **REA:** runtime forensic hanya apabila source/test/network evidence tidak menjawab masalah; jangan decompile CLI untuk task biasa.
- Development connector berbeza daripada **first-party MCP App** yang perlu dibina untuk GUI-05.

Credentials kekal dalam auth/keyring/env yang dibenarkan. Jangan print key, token, cookie, raw authenticated command line atau meletakkannya dalam repo. Remote MCP menggunakan schema semasa yang disahkan; jangan menganggap `url` legacy sama dengan `serverUrl`.

## F. Delegasikan seluruh implementation work dengan ownership

Orchestrator menyelaras; **semua task source, tests, browser QA dan review diberikan kepada AGY subagents**. Orchestrator ialah single writer untuk acceptance ledger/checklist/counters/checkpoints dan integration manifest. Contract/lockfile edits dimiliki seorang worker khusus pada satu masa, bukan semua worker.

Maksimum awal **tiga implementation writers serentak**, ditambah read-only explorer/reviewer/auditor mengikut slot dan kuota sebenar. Ini had keselamatan penulisan, bukan had jumlah task atau subagents sepanjang projek. Penuhi slot berguna dengan task bebas; jangan spawn agent idle atau menambah context hanya untuk mengejar jumlah agent. Runtime application specialist limits dalam §G berbeza daripada development agents ini.

Peranan yang mesti diliputi sepanjang pelaksanaan:

| Peranan | Ownership/hasil |
| --- | --- |
| Recovery/integration worker | Source provenance, selective reconciliation, dependency/move manifest dan release integration. |
| Contract/identity worker | Shared schemas, principal/grants, budgets; satu penulis lock/shared contract. |
| Domain workers | Commerce/stock/payment; dealer/loyalty/referral/finance; QC/JEV/marketing/SOP/automation, mengikut fail domain yang tidak bertindih. |
| Runtime worker | Official TypeScript runtime, proxy/composition dan protocol tests. |
| Python ADK worker | ADK Runner, bridge, sessions, adapters dan genuine specialists. |
| Frontend worker | Shared controller, Chat/Pet/workspace, state/tools/cards. |
| MCP/A2UI worker | First-party tool/resource/host dan Fixed Schema bounds. |
| Intelligence/privacy worker | Phase 05 adapters, eligibility records, retention/delete, negative tests dan activation gates. |
| QA workers | Architecture, domain regression, browser desktop/mobile, accessibility dan recovery drills. |
| Independent reviewers | TypeScript, Python, security, financial/database ikut perubahan. Tiada self-review dilabel independent. |
| Success auditor | Final requirement-to-evidence verification sebelum dakwaan complete/release. |

Peranan boleh dijalankan dalam waves dan agent boleh digunakan semula dengan brief terhad. Jangan spawn semua peranan serentak. Untuk kontrak bersama: publish frozen interface/hash dahulu; worker consumers menunggu handoff, bukan menulis shared file sendiri. Moves/import rewrites perlu write window berjadual supaya tiada worker mengedit path yang sedang dipindah.

Setiap dispatch mesti mempunyai: task ID, acceptance IDs, exact cwd/branch/source hash, dependencies, owned files/globs, read-only areas, consumed/produced interfaces, regression requirements, actual verification commands, expected receipt path dan stop conditions. Sertakan arahan: **Anda bukan seorang sahaja dalam codebase; jangan revert perubahan orang lain.**

Worker handoff: fail berubah, root cause, red/green output, actual command/exit/time, source hashes, protocol/browser evidence, uncovered cases dan proposed status. Reviewer hanya menggunakan candidate diff stabil; auditor semak output sebenar, bukan ringkasan worker. Slot penuh -> queue next ready task, reuse finished agent; jangan melancarkan orchestrator baru. Missing subagent tools -> rekod inability, teruskan coordination/read-only work yang berguna; jangan mendakwa task sudah delegated atau done.

## G. Architecture dan had aplikasi yang tidak boleh dipilih semula

- React/Vite + Bun modular monolith; tiada Next.js/Hono migration atau datastore baru. Preserve local SQLite / Supabase whole-snapshot CAS topology sedia ada mengikut ADR; jangan reka Postgres domain migration.
- Official CopilotKit TypeScript `/v2` exports, `CopilotRuntime` Fetch handler -> `HttpAgent` -> genuine Google ADK Python 3.12/AG-UI bridge.
- Agent `abangcolek_ops`; specialists tepat `commerce_reader`, `qc_jev_reviewer`, `marketing_drafter`.
- Public app-origin route **`/api/copilotkit`**, MCP **`/api/copilot-mcp`**. `/v2` ialah SDK contract, bukan lesen menggantikan pipeline dengan `/api/platform/copilot/v2` JSON echo. Legacy alias hanya facade yang diuji.
- Local loopback: UI3000/API3010/runtime3020/ADK8030; verify listener identity. Jangan kill proses lain atau pilih port rawak. Hosting ADK production yang tiada ialah `ADK_HOSTING_UNCONFIGURED`, bukan localhost Vercel.
- Pin awal ADR: CopilotKit react-core/runtime/a2ui-renderer `1.79.1`; AG-UI client/core `1.0.2`; zod `4.6.7`; MCP SDK `1.32.1`; ext-apps `2.0.3` dengan MCP core/client/server `2.0.0` pada boundary HTTP berasingan; CopilotKit diagnostic CLI `4.29.0`. Python: ADK `2.12.0`, ag-ui-adk `0.10.0`, fastapi `0.146.0`, uvicorn `0.54.0`, pydantic `2.14.1`, httpx `0.28.1`, pytest `9.1.1`. Reconcile dengan ADR semasa dahulu; metadata availability bukan compatibility proof. Pin gagal -> exact incompatibility evidence, tiada arbitrary latest upgrade.
- Dependency directory dalam lane mungkin junction ke `D:/ABANGCOLEK-OS/node_modules`. Jangan mutate shared target. Sediakan workspace-private dependency installation dan lock mengikut preflight yang disahkan.
- Provider aplikasi: exact order `gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> `nvidia/nemotron-3-super-120b-a12b:free`. Activate hanya apabila account/endpoint/free/no-overflow/privacy/tool support dibuktikan. Native ADK Gemini; OpenRouter app-owned `BaseLlm` adapter menggunakan pinned httpx, tiada LiteLLM atau duplicate TS inference. Tiada eligible candidate -> truthful LOCAL_RULES/unavailable, commerce kekal berfungsi.
- Model coding AGY dan provider aplikasi ialah lapisan berasingan. Kekalkan coding model sedia ada jika layak; jangan menaik taraf subscription atau membelanjakan credit. Jangan memasukkan slug model coding ke app router.
- App budgets: deadline30s; maksimum6 tool dispatches/run;3 model calls termasuk children/retry/failover;8192 input/1024 output per call;24576/3072 kumulatif; delegation depth1/concurrency2/maksimum3 specialist calls. Reserve sebelum dispatch; jangan reset budget dalam child.
- App auth: server principal, owned thread, signed scoped grant, fresh canonical authorization sebelum setiap tool; CSRF/origin/rate/size limits, revocation dan least privilege. Browser role/userId/history bukan authority. Python/iframe tidak menerima service-role key atau raw user cookie.
- A2UI Fixed Schema; panels pilot read-only. Arbitrary HTML/JS, generic SQL/shell/HTTP tools dan dynamic schema model dilarang. JEV LOCAL_RULES review-only; tiada vision/native/confidence claim tanpa bukti.
- Baki had rate/payload/surface/token TTL tepat daripada execution contract§4; tests mesti merangkumi boundary dan boundary+1, termasuk UTF-8 bytes. Jangan memilih nilai baru untuk meluluskan test.

## H. Semua acceptance mesti dipetakan, tiada fasa ditinggalkan

**78 core = 10 CPK + 7 GUI + 10 MOD + 32 ADV + 19 master; tujuh EXT ialah gate berasingan.** Baca requirement penuh dalam register/design, bukan menganggap nama di bawah acceptance yang lengkap.

**CPK:** CPK-01 Chat; CPK-02 AG-UI Streams; CPK-03 Automatic Learning; CPK-04 Generative UI; CPK-05 Declarative UI; CPK-06 HITL; CPK-07 Frontend tools; CPK-08 Shared state; CPK-09 Headless UI; CPK-10 Sub-agents.

**GUI:** GUI-01 Display Only; GUI-02 Interactive; GUI-03 Tool Rendering; GUI-04 State Rendering; GUI-05 MCP Apps; GUI-06 A2UI; GUI-07 Your Components.

**MOD:** MOD-01 Storefront/katalog; MOD-02 Orders/tracking; MOD-03 Inventory; MOD-04 QC/JEV; MOD-05 Dealer/komisen; MOD-06 Loyalty/referral; MOD-07 Marketing; MOD-08 Finance/day-close; MOD-09 Tasks/documents/SOP; MOD-10 Automations/integrations. Setiap modul memerlukan scoped canonical data, useful outcome dan actual authorized journey, bukan kad fixture.

| ID | Logical capability | ID | Logical capability |
| --- | --- | --- | --- |
| ADV-01 | discover_capabilities | ADV-17 | reconcile_dayclose |
| ADV-02 | search_records | ADV-18 | build_finance_digest |
| ADV-03 | build_context_bundle | ADV-19 | trace_transaction |
| ADV-04 | explain_record | ADV-20 | export_report |
| ADV-05 | diagnose_checkout | ADV-21 | triage_case |
| ADV-06 | reconcile_payments | ADV-22 | plan_consignment |
| ADV-07 | preview_refund | ADV-23 | draft_customer_reply |
| ADV-08 | propose_refund | ADV-24 | build_action_plan |
| ADV-09 | assess_expiry_risk | ADV-25 | execute_approved_action |
| ADV-10 | plan_restock | ADV-26 | reconcile_action |
| ADV-11 | trace_batch | ADV-27 | inspect_runtime |
| ADV-12 | propose_quarantine | ADV-28 | review_skill_candidate |
| ADV-13 | simulate_campaign | ADV-29 | search_sop |
| ADV-14 | explain_commission | ADV-30 | propose_task |
| ADV-15 | audit_loyalty | ADV-31 | evaluate_job_retry |
| ADV-16 | assess_referral | ADV-32 | draft_campaign |

**Master19:** FIN-01; PAY-01, PAY-02, PAY-03; STK-01; OFF-01; REF-01, REF-02; LOY-01; SEC-01, SEC-02; DR-01; AI-01, AI-02, AI-03; PD-01; OPS-01; ARC-01; REL-01. Exact scope/evidence ikut register. Jangan melupakan signature/redirect/CAS/consent/post-payout/restore gates kerana helper unit tests sudah pass.

**EXT:** EXT-01 Inspector local; EXT-02 User Memories; EXT-03 Analytics/collector; EXT-04 Slack/Teams Channels; EXT-05 WebMCP own-app; EXT-06 Voice; EXT-07 Attachments/multimodal. Implement gated paths/tests yang dibenarkan. Live activation mesti memenuhi eligibility/privacy/browser/provider/send authorization. Upload bukan vision, local history bukan Intelligence, synthetic send bukan actual delivery. Jangan mengaktifkan tambahan berbayar atau menghantar mesej sebenar tanpa arahan penghantaran.

## I. Waves pelaksanaan dan exit yang wajib

Urutan dependency: **00 recovery -> baki03A ->01 ->02 ->03B ->04 ->05 ->06**. Research/test design bebas boleh berjalan selari; jangan melangkau runtime dependency atau menerima UI sebelum contract stabil.

### W0 — Recovery dan triage

- [ ] Reuse active team, inspect ownership, snapshot dirty/index/untracked, reconcile perubahan root ke lane secara terpilih; jangan ulang full baseline tanpa perubahan relevan.
- [ ] Peta semua85 IDs, actual current statuses, stale ticks/register/counters, skills/tools, SDK pins, listener identity dan external gates. Sahkan yang blocked melalui diagnostic sah, bukan laporan lama sahaja.
- [ ] Task hotfix terhad untuk lint/import dan fail-closed behavior pseudo-runtime/receipt; preserve original failing cases dan provenance. Jangan menganggap hotfix ini acceptance runtime selesai.

### W1 — Baki03A, bukan ulang kerja yang sudah lulus

- [ ] Audit five checked core rows terhadap acceptance penuh. Jalankan existing40 regression dan tests tambahan hanya untuk jurang behavior/source baru. Reopen hanya acceptance yang buktinya tidak mencukupi/stale, dengan sebab dan historical receipt dipelihara.
- [ ] Pastikan exact sen/BPS/cost provenance/override, largest-remainder allocation, cumulative reversal, post-payout append-only ledger, verified signed/account-matched payment/dedupe/out-of-order/late receipt, stock/loyalty atomicity, tracking expiry/revoke/redaction, referral rules, consent at dispatch dan offline revalidation.
- [ ] HITL lifecycle: approval tidak sama dengan execution. Expiry/revocation/stale scope/CAS/retry/idempotency/unknown outcome tidak boleh membuat duplicate command. Fake IDs/receipt dan bypass founder ditolak; unavailable executor tidak menjadi confirmed.

### W2 — Fasa01 struktur

- [ ] Ikut [prompt01](01-structure.md), exact move map dan `repository-structure.md`; docs/media/frontend/server/shared secara stages. Hash before/after bagi media/binary; update consumers, relative links, case-sensitive paths dan discovery scripts.
- [ ] Architecture checker mesti resolver-aware dan menangkap aliases, multiline/dynamic imports yang relevan serta forbidden cycles. Negative fixtures mesti menjalankan checker terhadap pelanggaran sebenar. Test sekadar `isExempt === false` tidak membuktikan detector.
- [ ] Jangan blanket exempt existing violations atau duplicate old/new service. Facade sementara mempunyai owner/removal batch dan consumers yang diuji. Preserve transaction/CAS boundary dan production data roots.

### W3 — Fasa02 runtime, Python dan satu controller

- [ ] Worker TS, worker Python dan worker frontend bergerak selepas frozen contracts. Ikut [prompt02](02-copilot-foundation.md) untuk import smoke, exact lock, protocol/identity/history/session/budget tests dan hosted topology.
- [ ] Buktikan official Fetch runtime -> HttpAgent -> real ADK Runner/AG-UI melalui controlled integration transport. Selepas free/privacy gate lulus, jalankan actual qualified model round-trip. Echo/completed-text chunking/fixed model labels bukan proof.
- [ ] Durable scoped thread/session, logout isolation, reconnect/cancel/timeout/429, correct partial/final/tool lifecycle dan server-owned history. Satu shared headless controller antara Workspace dan Pet; tiada duplicate send/run.

### W4 — Fasa03B semua tools dan modul

- [ ] Delegate domain groups kepada disjoint workers; single owner composition/registry/shared schemas. Semua32 logical IDs dipetakan kepada executable implementations; ADV-28 phase05.
- [ ] Strict input/output schemas, unknown keys ditolak, server identity/scope/cost provenance dan shared budgets; browser tidak membekalkan authority atau budget counters.
- [ ] Query membaca record canonical; simulation menggunakan actual domain evaluator; draft tidak mutate authoritative state; command memerlukan durable approval/executor/transaction/receipt. Tiada `simulated_ok`, unconditional `valid:true` atau zero drift rekaan sebagai fakta production.
- [ ] Uji setiap tool positive, malformed, cross-tenant/role, stale/revoked, empty/not-found, timeout/budget dan actual domain result. Registry count serta names sahaja tidak menutup ADV/MOD.

### W5 — Fasa04 semua GUI/CPK UI dan app specialists

- [ ] Ikut [prompt04](04-ui-and-agents.md). Implement Display Only, Interactive, Tool Rendering, State Rendering dan Your Components berdasarkan actual SDK state/tool lifecycle, termasuk loading/partial/error/cancel/reconnect.
- [ ] A2UI Fixed Schema approved catalog/bounds; invalid component/action/patch ditolak. Real frontend tools hanya allowlisted navigation/filter/highlight/draft; tiada arbitrary eval, URL atau shell.
- [ ] GUI-05 mesti real MCP initialize/tools/list+call/resources/read, first-party UI resource metadata, authenticated host iframe/message/CSP dan permission tests. REST JSON atau kad custom sahaja tidak mencukupi.
- [ ] Actual ADK delegation kepada tiga specialist tetap; depth/shared budgets/access scope diuji. Worker development bukan bukti CPK-10 application sub-agents.
- [ ] Desktop/mobile/reduced-motion/keyboard/a11y QA mengikut DESIGN/landing/workspaces docs; jangan redesign landing di luar skop atau regress release main.

### W6 — Fasa05 Intelligence dan EXT gates

- [ ] Ikut [prompt05](05-intelligence.md); sahkan existing offering/project/free eligibility, data classes, retention/delete dan credentials sebelum data dihantar.
- [ ] CPK-02 memerlukan actual Streams replay/reconnect dengan state/cards dan owned identity. Persistence local sahaja tidak menutupnya.
- [ ] CPK-03/ADV-28 memerlukan provenance daripada completed workflows, reviewable candidate, eval, **human publish**, version-pinned compatible delivery dan rollback. Jangan menukar coding preauthorization menjadi automatic SOP publish.
- [ ] EXT-02/03/04 memerlukan eligibility/privacy/send gates; semua EXT ada scoped implementation/negative tests dan status tepat. Missing gate kekal unchecked; teruskan kerja local yang bebas. Tiada silent paid fallback untuk menjadikan semua ticks hijau.

### W7 — Fasa06 full verification, usable handoff dan release

- [ ] Freeze candidate source/lock/config. QA subagents bekerja pada stable revision; beri fixtures/databases/ports sendiri supaya parallel tests tidak mencemarkan hasil.
- [ ] Jalankan semua commands wajib §K, critical authenticated role journeys, security negatives, failure injection dan restore drill. Test discovery list bukan browser pass; existing419tests atau count baru bukan ukuran completeness tanpa path/case parity.
- [ ] Measure coverage business/security mengikut denominator sebenar; sasaran>=80% mengikut contract, bukan subset kosmetik. Tiada skipped/deleted security tests atau timeout dinaikkan tanpa diagnosis.
- [ ] Reconcile landing/Bun/SPA/media changes daripada release main secara reviewed dependency closure; preserve `bunVersion: "1.x"` dan existing SPA fallback. Jangan publish entire dirty branch.
- [ ] Exact eligible deployment/project identity, source/lock/env/migration refs, preview evidence, rollback dan final independent success audit. Push main/autodeploy hanya apabila authorization sedia ada sah dan release gates lulus. CI billing/auth block tidak boleh diubah menjadi green.
- [ ] Serah actual local start commands, URLs dan verified login/role journeys. Jangan mereka account/password/catalogue/stok atau menghantar credential di laporan.

## J. Checklist, evidence dan ticks — single writer sahaja

Orchestrator mesti menyelenggara `PROJECT-CHECKLIST.md`, `docs/prompts/ACCEPTANCE-REGISTER.md`, `docs/handover/IMPLEMENTATION-CHECKPOINT.md` dan `reports/implementation/evidence/<ID>.json` sebagai satu batch logik selepas task accepted. Workers hanya mencadangkan status dan menyerahkan bukti.

1. Sebelum mula: ID -> `in_progress`; checkbox `[ ]`. Rekod owner, scope, source dan next test.
2. Selepas implementasi: actual commands exit0, behavior/protocol/browser/domain evidence yang diwajibkan, source hash yang masih sama dan independent review mesti lengkap sebelum `[x]`.
3. Unit/synthetic/local pass hanya menutup item kecil dengan scope itu. Parent CPK/GUI/MOD/ADV/master kekal unchecked jika acceptance penuh masih memerlukan live/provider/browser/production evidence.
4. `implemented_unverified`, `not_run`, `failed`, `blocked_external` kekal `[ ]`. Jangan tick kerana agent berhenti, file wujud, registry lengkap, lint pass atau report menyebut SUCCESS.
5. Jika evidence stale atau overclaimed, untick **item terjejas sahaja**, tambah dated correction, limitation dan linked historical receipt. Jangan reset seluruh ledger atau memadam provenance.
6. Counter dikira daripada IDs tepat: 10CPK,7GUI,10MOD,32ADV,19master dan7EXT. DONE/NEXT/example checkboxes bukan denominator. Validate duplicate/missing IDs, dead evidence links dan status mismatch.
7. Receipt: requirement/task ID; canonical status dan environment; timestamp MYT; source commit/worktree/dirty+untracked manifest; lock/policy/config versions; command/test/path/exit; actual provider/model atau NOT_CALLED; browser/protocol artifacts; reviewer; limitations; exact next action. Tiada secrets, private prompts atau raw model reasoning.
8. Terima test evidence hanya jika commands benar-benar tamat; semak logs/background tasks dan source selepas ujian. `agy` exit0/`SUCCESS`/JSON parse atau `.agy_verified` bukan acceptance.
9. Kemajuan user-facing setiap kira-kira5–10minit: accepted IDs/counters per kategori, current workers, tests, blockers dan next tasks. Jangan menghasilkan update panjang tanpa perubahan atau membina timer baru apabila existing progress timer sudah berjalan.
10. Sebelum context compaction/succession, simpan state/handoff dan transfer exclusive ownership. Successor revalidate source/current jobs; tidak mengulang seluruh repo audit.

## K. Commands dan runtime evidence minimum

Commands dipindahkan melalui manifest01 jika path berubah; verify scripts sebenar sebelum menjalankannya. Missing suite/path bukan pass.

```powershell
bun run lint
bun run build
bun run test:platform
bun test ./tests/architecture/dependency-boundaries.test.ts
bun test ./tests/copilot
bun test ./tests/frontend
uv run --project agents/google-adk pytest agents/google-adk/tests
bun run test:e2e --list
bun run test:e2e
```

Gunakan Python3.12 `.venv`/locked fallback dalam prompt02 jika `uv` tiada. Jangan global pip atau mutate shared node_modules junction. Baseline/targeted tests per task dahulu; full suite pada stable integration gates, bukan selepas setiap write.

Native SDK/CLI diagnostic: baca help `copilotkit@4.29.0` dan skill. `verify --round-trip` ialah actual model call; hanya selepas exact free/data/credential gates. Registry metadata, health200 atau mocked transport tidak menggantikan model/browser/protocol proof. Local/preview/production dilaporkan berasingan.

Failure cases wajib termasuk unauthorized principal/thread/role; malformed/oversized input; expiry/revoke/stale/CAS; duplicate send/callback/command; timeout/429/abort/disconnect; no eligible provider; IDOR/redaction/consent; missing executor; bad A2UI/MCP resource/message; recovery daripada actual verified snapshot/evidence. Commerce mesti boleh digunakan semasa AI unavailable.

## L. Completion dan blocker handling

**Ready/complete** hanya jika semua mandatory acceptance untuk environment release yang didakwa mempunyai evidence sah, fresh suite/lint/build/browser gates, independent review dan exact artifact identity. “Semua10CPK siap” memerlukan CPK-02/03 actual Intelligence, bukan synthetic alternative.

Jika prerequisite luar menjadi baki tunggal selepas semua kerja bebas selesai: laporkan jumlah implemented/verified/blocked mengikut kategori, precise reason code, evidence attempted, capability yang disabled, keputusan yang diperlukan, exact resume command/task dan rollback. Jangan mengulang OAuth, membelanjakan wang, menunggu input sambil membakar inference atau mengaktifkan disabled provider untuk menutup checklist. Status hasil ialah **IMPLEMENTATION_INCOMPLETE / BLOCKED_EXTERNAL**, bukan 100% atau release ready.

Final handoff wajib menyatakan accepted IDs, unticked IDs/reasons, actual tests/coverage, source branch/commit/dirty state, local startup/login proof, preview/production URLs jika benar-benar diuji, CI state dan rollback. Completion artifact serta tick ialah hasil evidence; bukan evidence dengan sendirinya.

## M. Arahan pertama kepada AGY sekarang

1. Read prompt ini sepenuhnya dan dispatch existing Sentinel/orchestrator update sekali. Jangan minta approval rutin tambahan atau melancarkan pasukan kedua.
2. Nyatakan exact lane/ownership dan latest observed source. Reconcile snapshot lama dengan worker aktif; semak lint/import dan fake execution regression dahulu.
3. Beri setiap remaining ID task owner/wave, termasuk Fasa05. Mulakan sebanyak mungkin task bebas dalam had ownership/slot sebenar; semua implementasi melalui AGY subagents.
4. Teruskan W0->W7 hingga verified completion atau genuine external-only blocker handoff. Tick task selepas accepted evidence, sync register/counters/checkpoint dan jangan berhenti pada plan.

### Paste-ready untuk sesi AGY yang sedang aktif

```text
/goal Sambung dan selesaikan semua baki implementasi ABANGCOLEK v2.4 menggunakan pasukan AGY Teamwork sedia ada. Baca D:/ABANGCOLEK-PLATFORM/docs/prompts/CONTINUE-AGY-AUTONOMOUS-TEAMWORK-20261020.md sepenuhnya sebagai brief pelaksanaan pengguna semasa. Routine implementation, tests, review dan checkpoint updates telah dipreauthorize dalam brief; jangan ulang interview atau meminta saya memilih keputusan teknikal. Delegate semua implementation/QA/review kepada AGY subagents sebanyak task bebas dan slot sebenar membenarkan, dengan ownership eksklusif. Gunakan Boost hanya untuk blocker terhad yang memenuhi brief. Selesaikan semua78 core dan7EXT mengikut acceptance dan gates sebenar, termasuk Fasa05; tick hanya selepas evidence sah. Jangan buka pasukan kedua, overwrite dirty work, reka provider/receipt atau claim100% bagi blocked features. Teruskan hingga verified completion; jika baki benar-benar hanya prerequisite luar yang tidak tersedia selepas semua kerja bebas selesai, berikan exact BLOCKED_EXTERNAL/IMPLEMENTATION_INCOMPLETE handoff dan resume steps tanpa mereka kejayaan.
```

Launcher ini untuk AGY TUI, bukan PowerShell command. Jangan paste `/goal` berulang kali kerana ia menggantikan goal sedia ada. Jika goal yang sama sudah aktif, hantar brief sebagai follow-up biasa kepada conversation sama. Jika Teamwork belum wujud, §B menetapkan discovery/fallback dan native confirmation limit; tidak perlu memulakan `/goal` dan `/teamwork-preview` sebagai dua job berasingan.
