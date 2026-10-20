# ABANGCOLEK — Deterministic Implementation Prompt Pack v2.4

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

**Sambung sesi semasa — Codex inline:** baca [CURRENT-STATUS](../CURRENT-STATUS.md), [checklist](../../PROJECT-CHECKLIST.md) dan [IMPLEMENT-ABANGCOLEK.md](IMPLEMENT-ABANGCOLEK.md). Candidate `codex-completion-20261020` ialah lane pembetulan; prompt CONTINUE-AGY/MULTI-CLI dikekalkan sebagai sejarah dan tidak boleh digunakan untuk melancarkan semula implementation agents yang dihentikan pengguna.

**Lihat kemajuan dahulu:** [PROJECT-CHECKLIST.md](../../PROJECT-CHECKLIST.md). Setiap prompt fasa mewajibkan integrator mengemas kini checkbox selepas task dengan actual evidence, environment dan reviewer. `implemented_unverified`/blocked/failed/not-run kekal unchecked; komponen siap tidak terus menutup parent feature. Ikut execution contract§10 dan sync register/checkpoint sebelum handoff.

Tarikh:20Oktober2026. Authority: [master blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md). Semua fail ini ialah arahan implementasi masa hadapan. Penulisan dokumen, komponen yang telah wujud atau report lama tidak membuktikan SDK/protocol/provider/production verified.

**Mula dengan [IMPLEMENT-ABANGCOLEK.md](IMPLEMENT-ABANGCOLEK.md).** Ia copy-ready entry bagi coding agent. [AGENT-EXECUTION-CONTRACT.md](AGENT-EXECUTION-CONTRACT.md) menetapkan architecture, current/target paths, source/worktree safety, budgets, skills/plugins/MCP/fallbacks, policy activation, status dan evidence. [ACCEPTANCE-REGISTER.md](ACCEPTANCE-REGISTER.md) menetapkan semua requirement IDs, phase ownership dan receipts. Baca ketiga-tiganya bersama, bukan prompt fasa secara terasing.

## Urutan pelaksanaan wajib

**00 -> 03A -> 01 -> 02 -> 03B -> 04 -> 05 -> 06**. Nombor fail bukan sebab memindahkan source sebelum membetulkan integrity. Tiada architecture/provider/folder/protocol choice diserahkan kepada agent; policy/account/permission yang belum diluluskan kekal gate bersebab.

| Step | Prompt | Inputs wajib | Deliverable/exit utama |
|---|---|---|---|
| 00 | [Baseline](00-baseline.md) | Current source/config/Git/runtime identity dan shared contract | Dirty/file manifest, baseline outcomes, capability availability, approved/unknown policy register,78 initial requirement rows |
| 03A | [Domain integrity](03-domains-and-tools.md#fasa-03a--integriti-sebelum-struktur) |00 evidence, current domain source dan domain review | Exact integer margin/allocation, late-payment/refund/stock/offline/tracking/consent/security/AI invariants; red->green regression evidence |
| 01 | [Structure](01-structure.md) |03A safe dependency closure, exact structure maps | Reviewed stages A–D, file/hash/import/test-discovery parity, architecture enforcement; no data-root move |
| 02 | [Copilot foundation](02-copilot-foundation.md) |01 move manifest, exact ADR pins, identity/provider gates | Real SDK Fetch->HttpAgent->ADK, owned sessions/shared budget, CPK-01/09 and free-only policy; honest local/blocked status |
| 03B | [Modules and tools](03-domains-and-tools.md#fasa-03b--registry-tools-dan-modul) |02 identity/grants/budgets,03A canonical commands | MOD10/ADV32 strict scoped adapters, fixed specializations, actual registration manifest and no generic write proxy |
| 04 | [UI and agents](04-ui-and-agents.md) |03B result/proposal interfaces,02 real bridge | GUI01..07, CPK04..08/10, real MCP UI-resource/iframe, read-only fixed A2UI, canonical HITL receipt and bounded delegation |
| 05 | [Intelligence](05-intelligence.md) |04 protocol/thread contracts, existing free project/account/privacy approval | Genuine CPK02/03/ADV28 if gated; otherwise precise blocked receipts and independent work continues |
| 06 | [Release](06-release.md) |All checkpoints/final source/locks/reviews | Fresh tests,78core+7adjacentEXT audit, measured local/cloud recovery, authorized preview/release and actual served-artifact evidence |

## Cara menggunakan prompt tanpa membuat keputusan baharu

1. Berikan master prompt kepada pelaksana yang mempunyai existing repo; jangan clone/recreate. Agent membaca source dan SKILL.md sebenar mengikut task, discovers actual tools, lalu merekod availability. Installed plugin name/config sahaja bukan callable/authenticated MCP.
2. Mulakan00. Setiap batch menerima exact owned paths, shared interface snapshot, prerequisite, behavior test, implementation task, command/expected result, reviewer dan continuation. Sesi semasa dijalankan inline; background implementation workers kekal dihentikan. Read-only review selepas diff stabil memelihara semua edit pihak lain.
3. Gunakan TDD bagi business/security behavior: test assertion red -> canonical implementation -> green -> independent review -> per-ID receipts/checkpoint. Fail application paths/tests yang dilabel **PLANNED** mesti diwujudkan dalam phase berkenaan sebelum command dijalankan; file **EXISTING** masih perlu reverify kerana dirty worktree berubah.
4. Bagi missing account/provider/hosting/privacy/commercial policy, disable capability tepat dengan reason/evidence dan teruskan synthetic/local tasks yang bebas. Jangan signup/login/pay/install alternatives atau menukar model order untuk mengelak blocker.
5. Setelah code/tests/reviews selesai, only authorized owned commit/push/deploy. Source/runtime/preview/production masing-masing memerlukan evidence sendiri; rootHTTP200, local fixture, import smoke atau Git push bukan release receipt.

## Liputan dan hard boundaries

Core register mempunyai **78 logical requirements**:10CPK+7GUI+10MOD+32ADV+19master. Registered functions boleh melebihi32 kerana fixed specialization dan ADV-26 Q/X/C separation;78 bukan test count. Adjacent7EXT capabilities (Inspector, User Memories, Analytics, Channels, WebMCP, Voice, Attachments) mempunyai separate gates; tiada auto-enable kerana SDK dipasang.

Runtime budgets authoritative dalam execution contract:30s,6tool dispatches,3model calls total parent/children/retry/failover,8192input/1024output per request,24576/3072total, depth1/concurrency2/max3specialist upper bound. Candidate model order tetap tiga calon ADR sahaja; eval boleh reject, tidak auto-promote primary atau menambah model. No paid/hidden title/vision/evaluation/memory/voice route.

MCP ext-apps2.0.3 host/core/client/server2.0.0 diasingkan melalui HTTP daripada runtime MCP SDK1.32.1; actual imports/initialize/tools/resources/iframe mesti diuji. A2UI Fixed Schema panels read-only; real approval controls GUI-02 berasingan dan memerlukan durable canonical receipt. SDK metadata/JSON component tidak melengkapkan integration.

Historical source snapshot root60311aa/releasee736856/interrupted `copilot-completion` perlu reverify; dokumen ini tidak menyambung merge atau membenarkan reset. Local SQLite, cloud snapshot CAS dan ADK sessions mempunyai authority/lifecycle berasingan; restructure bukan data migration.

## Evidence dan sambungan sesi

Setiap phase menulis report pada `reports/implementation/`, per-ID receipt `reports/implementation/evidence/<ID>.json` dan checkpoint `docs/handover/IMPLEMENTATION-CHECKPOINT.md`. Schema/status/reason codes ikut shared contract/register; tiada model reasoning/secrets disimpan. Record command/cwd/exit/time/environment, actual source/lock/policy versions, data class, browser/protocol/receipt refs, coverage denominator, reviewer dan limitations.

Sesi baharu membaca checkpoint kemudian revalidates actual HEAD/dirty hashes/runtime/dependencies sebelum sambung exact next task; jangan ulang keseluruhan baseline secara buta atau mempercayai badge COMPLETE lama. Task dokumentasi ini sendiri tidak menjalankan application suite, provider inference, DB migration, recovery drill, Git push atau deploy.
