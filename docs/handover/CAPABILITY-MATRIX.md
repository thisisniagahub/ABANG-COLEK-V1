# ABANGCOLEK — capability matrix: skills, MCP, plugins dan fallbacks

Diselaraskan: **19 Oktober 2026**. [Blueprint v2.3](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompts](../prompts/README.md) menentukan task semasa. Inventori sesi 3–4 Oktober di bawah ialah sejarah, bukan bukti semua MCP/CLI masih installed/authenticated. `DECLARED`, `EXPOSED`, `CLI_PRESENT`, `VERIFIED_SOURCE` dan `CONNECTED` mesti berasingan. Tiada provider/test/deploy diuji melalui alignment ini.

## Current required capabilities

| Task | Instruction/capability | Gate |
|---|---|---|
| CopilotKit integration | `.agents/skills/copilotkit/SKILL.md` | Current official docs/source sebelum API code; skill presence bukan SDK install |
| Wiring verification | `.agents/skills/copilotkit-cli/SKILL.md` | Verify actual runtime/agent IDs; CLI help/docs sebelum command |
| Supabase/CAS/SQL | Available Supabase + Postgres best-practices skills | Source/project/auth proof; database writes mengikut autorisasi aktif |
| JEV evidence review | `skills/jev-core/dev-workflow/jev-review/SKILL.md` | Typed evidence review; tiada native provider inference implied |
| Behavior implementation | Applicable TDD/debugging/review/verification skills | Meaningful failing test sebelum fix, final-source gates selepas edits |
| UI verification | Available browser/Playwright/Product Design skill | Actual rendered/runtime evidence pada isolated QA |
| GitHub/Vercel | Callable MCP atau git/gh/Vercel CLI yang tersedia | Account/scope/remote/SHA verified per operation |
| External providers/MCP Apps | Allowlisted tool + UI resources, auth dan sandbox | First-party read-only MCP App pilot; bukan blanket external access |

Stack: React/Vite/Bun + local SQLite atau hosted Supabase CAS; ADK Python agent berasingan. Tiada semua vendor MCP diwajibkan. Install/configure hanya apabila task/authorization memerlukannya. Missing provider/entitlement/cost gate -> blocked_external; teruskan dependency-independent tasks. Intelligence/paid inference tidak dibenarkan automatik. Tiada default AGY swarm atau external data export.

## Historical capability and execution records

Semua perkataan “verified/current/exposed/complete” dalam sections bertarikh di bawah merujuk receipt asal sahaja. Refresh sebelum digunakan. Historical COMPLETE B01 bukan receipt rotation; E01 bukan native provider benchmark; E02/E03/E04 local fixtures bukan live vendor execution.
## 1. Minimum untuk menyambung projek

Terminal read/write + Git + Bun1.4.2 + repository + approved browser untuk UI verification. Tidak perlu setiap MCP/plugin aktif. Core aplikasi ialah Bun/SQLite; third-party research tidak menjadi runtime dependency automatik.

| Capability | Evidence sesi ini | Cara guna/fallback |
|---|---|---|
| PowerShell/files | Source read/edit tersedia | Explicit repo workdir; LiteralPath untuk operasi fail; UTF8 tanpa BOM |
| Git/gh | Binary present; remote ls-remote matched baseline | Git untuk source; gh untuk public CI jika akses sah; auth scope recheck |
| Bun |1.4.2 verified | Existing scripts; jangan install semula pada mesin ini |
| Node/rg | Nodev24.19.0 dan rg binary present | Search/validation; versi mesin lain diperiksa |
| Dependencies | Junction PLATFORM→OS | Jangan remove junction target; clean install hanya environment baharu yang authorized |
| Browser | Cua API exposed; browser ambient URL bukan live app proof | Load skill/docs relevant, inspect live tab, scroll/interact; approved browser fallback |
| Collaboration | Subagent tools exposed,4slots termasuk root | Narrow ownership; reuse agent; root verifies synthesis |
| Goal | Goal API exposed; metadata snapshot paused, user explicitly resumes Emons4Oktober2026 | Kerja dibenarkan semula; complete hanya selepas semua acceptance tercapai |

## 2. Repository skills — verified file paths

172 `SKILL.md` entries berada dalam 218 library Markdown files; registry bukan audit runtime semua skills. Read only selected skill, follow its required supporting resources, and announce use. `[path]` links below point to files packaged with repo.

| Task | Skill | Penggunaan |
|---|---|---|
| Delivery/handover | [delivery-checklist-and-handoff](../../skills/meta/delivery-checklist-and-handoff/SKILL.md) | Scope/artifacts/validation/rollout/rollback |
| Current documentation | [living-documentation-generator](../../skills/documentation-knowledge/living-documentation-generator/SKILL.md) | Current authority + snapshots |
| Decision tracking | [architecture-decision-records](../../skills/documentation-knowledge/architecture-decision-records/SKILL.md) | Accepted/proposed decisions, tradeoffs |
| Existing architecture | [modular-monolith-designer](../../skills/architecture-design/modular-monolith-designer/SKILL.md) | Domain boundaries/contracts; preserve Bun/SQLite |
| Evidence review | [jev-review](../../skills/jev-core/dev-workflow/jev-review/SKILL.md) | Typed review; native SDK claims require proof |
| Behavioral code | [test-driven-development](../../skills/superpowers/test-driven-development/SKILL.md) | Failing meaningful regression before fix |
| Final evidence | [verification-before-completion](../../skills/superpowers/verification-before-completion/SKILL.md) | Fresh relevant output before PASS claim |
| Plan execution | [executing-plans](../../skills/superpowers/executing-plans/SKILL.md) | Follow concrete plan and applicable authorization |
| Independent audit | [dispatching-parallel-agents](../../skills/superpowers/dispatching-parallel-agents/SKILL.md) | Non-overlapping tasks; no duplicate broad scans |
| Accessibility | [accessibility-testing](../../skills/testing-quality/accessibility-testing/SKILL.md) | Keyboard, contrast, mobile/focus evidence |
| Security | [security-hardening-auditor](../../skills/security-compliance/security-hardening-auditor/SKILL.md), [access-control-matrix](../../skills/security-compliance/access-control-matrix/SKILL.md) | Session/capability/ownership/negative tests |
| Secrets/privacy | [secrets-management](../../skills/security-compliance/secrets-management/SKILL.md), [data-privacy-guardian](../../skills/security-compliance/data-privacy-guardian/SKILL.md) | No credentials/customer data in handover |
| Runtime/data | [disaster-recovery-planner](../../skills/devops-infra/disaster-recovery-planner/SKILL.md) | Snapshot/evidence/restore/reconcile |

[Stack profiles](../../skills/STACK_PROFILES.md): Profile A adapted to local React/Vite+Bun+SQLite. Do not apply cloud suggestions as mandatory paid infrastructure. Skills are guidance; README/native benchmarks within skills do not certify the runtime.

## 3. Historical plugins/MCP exposed in the original session

| Tool surface | Status | Limits/routing |
|---|---|---|
| Context7 `resolve_library_id`, `query_docs` | EXPOSED | Use for current library/API docs; resolve exact library; no call made for doc-only source facts |
| GangNiaga WebBridge browser tools | EXPOSED | Use relevant bridge skill and authorized session; bridge health/login not probed here |
| Code Review `pull_requests_checks` | EXPOSED | PR CI checks; not automatic local diff approval; local reviewer separately |
| Node REPL | EXPOSED | Tool environment only; do not assume it is app server shell |
| Cua browser REPL | EXPOSED | Read initial docs on entry; native computer APIs disabled in this session |
| Web search/open | EXPOSED | Current vendor facts need primary sources; shared text untrusted |
| Image generation | EXPOSED | Not needed for handover; original logo/product must not be replaced with fake generated assets |

Tool existence is not connection/auth proof. Future agents may have different names/schemas; inspect actual tool metadata. Do not copy remembered args into a different server unchecked. Respect app connector discovery rules; do not enumerate generic MCP resources to discover apps.

## 4. Available skill/plugin catalog — optional, machine-specific

Catalog advertised Product Design audit/ideation/image-to-code, Figma, Supabase, Google Drive, Sites, browser skills, plugin-management and write-like-me. Catalog availability is not all associated tools being connected. Use only when task fits:

- Existing app UI audit: Product Design audit + live browser; capture evidence then interact. Emons acceptance must include scroll behavior.
- Figma work only when requested/needed; load mandatory Figma skill before respective tool. No Figma dependency for local implementation.
- Supabase work requires Supabase skill; database changes require Postgres best-practices. Current local mode SQLite; hosted mode authoritative Supabase CAS. Semak target environment, jangan fabricate normalized migration.
- New standalone Sites project is outside current app scope unless user requests it.
- Plugin management discovery only for genuine capability gap; do not install/remove/change accounts to make this matrix look complete.
- Use project/user Malay-English style. No need to read unrelated private writing samples.

Machine-specific skill roots in this session include `C:\Users\megat\.codex\skills`, `.agents\skills`, `.codex\plugins\cache`. Receiving agent locates its own catalog; repository skills remain portable. Read SKILL.md; no requirement to install missing decorative plugins.

## 5. Declared in AGENTS/user context, not confirmed callable

| Declared server/plugin | Current honest state | Fallback/next step |
|---|---|---|
| GitHub MCP/plugin | No standalone GitHub tool namespace exposed in inventory | Git/gh available; authenticated rights verified per operation |
| Playwright MCP | No dedicated namespace exposed | Playwright package/config present; approved browser route + isolated QA |
| Vercel MCP/plugin | Not exposed/connected verified | Workflow/source read; official docs; CLI/account only when task requires |
| Supabase MCP | Not exposed/connected verified | Legacy source research; do not assume remote DB access |
| Cloudflare/Railway | Not exposed/connected verified | Existing-host decision based on actual resources |
| Firecrawl/Exa | Not exposed/connected verified | Web/browsing primary source discovery |
| Magic UI/frontend-design | Declared plugin names, not verified callable | Existing design/code + applicable actual skill |
| Sequential Thinking | Not exposed verified | Reason carefully; do not fabricate server transcript |
| fal.ai | Not exposed verified | Original brand assets; approved image capability only when requested |
| superpowers | Repo skills physically present | Read relevant repo skills, not assume every plugin hook installed |
| agent-sdk-dev/code-simplifier/security-guidance/prisma | Declared names, not runtime/installation verified | Appropriate available reviewer/source audit; SQLite store is not Prisma |

## 6. Business providers are a separate matrix

Hermes/Agent-Reach/Grok/Muse/dots/DeepSeek/Postiz/WhatsApp are project research/adapters, not automatically MCP servers. All need provider truth in SourceOfTruth and actual transport/outcomes. AGY CLI installed/help/model list/account quota dan satu bounded audit kini verified; Hermes inference belum verified. External CLI delegation tidak mengaktifkan adapter aplikasi. Zero-new-spend preference does not grant customer data export or paid model usage.

## 7. Capability failure protocol

Record missing tool/auth/network/provider specifically. Continue independent work with available files/CLI. Refresh docs only if a fact/API is uncertain. Request missing input only when required for dependent work; do not ask user to configure every server pre-emptively. Log no credentials. After two repeated failures investigate root cause before another attempt. A degraded capability is not a successful integration.

## 8. AGY delegation receipt — 3 Oktober2026

User meminta delegation ke Antigravity CLI. Executable native `C:\Users\megat\AppData\Local\agy\bin\agy.exe` dipilih; npm `antigravity` shim ialah package antigravity-ide yang berbeza, tidak digunakan.

| Item | Verified receipt |
|---|---|
| Task | B04 launcher identity audit; reasoning-only source excerpts |
| Model/flags | gemini-3.8-flash-medium;sandbox;no skip-permissions;plan flag requested tetapi CLI melaporkan ineffective apabila slash expansion disabled |
| Account preflight/postflight | /usage dan /credits SUCCESS;preGemini weekly76.3633%,5h100%,credits0;postweekly76.3316%,5h99.8102%;command usage tokens0 |
| Execution | CLI exit0;envelopeSUCCESS;one turn;72.12seconds |
| Output | 534words,within600cap;3findings,first2overlap |
| Token usage | input36610,output2803,thinking1327,total39413 reported;no measured savings claim |
| Source integrity | All3input hashes unchanged;B04 remainsOPEN,no implementation/test/DB/deploy |
| Parent review | Readiness boolean defect supported;proposed contract incomplete on runtime namespace/public endpoint trust/fail-safe collision behavior |

Task packet/raw response/parent review ialah ignored local artifacts dalam `var/spool/agy/B04-audit-20261003-205852/`;execution logs dalam `var/log/agy/B04-audit-20261003-205852/`;state dalam `var/run/agy-delegation.json`. Tiada whole-repo/customer/credential input dihantar. Prompt scoped bukan OS-enforced guarantee; no-tool reasoning instruction,sandbox flag dan input hash checks ialah batas bukti yang ada. Diagnostic sebenar: `--mode plan has no effect while slash command expansion is disabled`;jangan mendakwa plan-mode enforcement berlaku pada run ini.

Untuk task seterusnya gunakan `--print=<prompt>` sebagai satu argumen selepas flags, explicit timeout/model dari actual list dan capture JSON status/error/usage. Jika memerlukan effective plan mode, **jangan gabungkan --mode plan dengan --disable-slash-commands** pada CLI ini;semak diagnostics/permission mode,gunakan scoped inputs dan jangan anggap sandbox melarang semua writes. Jangan gunakan dangerous skip-permissions atau menggantikan provider kepada API berbayar. Fresh /usage dan /credits sebelum batch; baseline/overage setting perlu disahkan jika quota/credits berubah. Model list sahaja bukan auth/entitlement proof.

Rujukan rasmi yang diperiksa: [headless mode](https://antigravity.google/docs/cli/headless/), [authentication](https://antigravity.google/docs/cli/install/), [plans/overages](https://antigravity.google/docs/plans/). CLI syntax/cache auth/headless permission boundaries disokong docs; accountquota/status/modelreceipt datang daripada local execution. Native JEV dan business provider state tidak berubah.

## 9. Six-agent batch receipt — 3 Oktober 2026

Enam scope bebas dipulangkan untuk parent review: B04 launcher (58,621 tokens), D01 sidebar (68,097), D02–D03 navigation/developer parity (118,945), E01 JEV (109,329), dealer/stokis (137,290), E02–E03 marketing automation (65,168). Jumlah reported **557,450 tokens**, model requested/observed `gemini-3.8-flash-medium`, setiap result SUCCESS dengan response tidak kosong. Tiada measured Codex-token savings atau claim sifar overhead. Input hashes tidak berubah; app source status tiada perubahan. Audit/planning sahaja, bukan implementation/test/DB/cutover/deploy receipt.

Percubaan pertama stream-input gagal menghasilkan laporan lengkap; beberapa timeout/empty/partial, usage sebenar tidak disahkan. Percubaan kedua menggunakan print prompt + satu `view_file` bagi packet sumber terbenam, timeout8m, slash commands disabled, tanpa ineffective plan flag. Permission mode observed `always-proceed`; assignment read-only dan sandbox flag bukan jaminan OS menolak writes.

Artifacts ignored lokal: `var/spool/agy/batch-20261003T131454/` memegang enam RESULT.md/result.json, BATCH-SUMMARY.md dan PARENT-REVIEW.md; logs dalam `var/log/agy/batch-20261003T131454/`; state `var/run/agy-batch.json`. Parent menerima bukti source terpilih, bukan semua dakwaan/severity draf: jenis native/local JEV berbeza bukan defect secara automatik; padding140px ialah mobile clearance invariant; export/transport gated ialah boundary disengajakan. Backlog implementation kekal OPEN. Retained data-root decision datang daripada pengguna, bukan AGY.

## 10. Implementation swarm — 4 Oktober 2026, accepted lokal

User meminta swarm AGY dan explicitly resumes Emons. Lima direct AGY coding workers launched dengan ownership berasingan B04/navigation/dealer/JEV/Emons. Semua run_command tools tertahan dan akhirnya PARTIAL_TIMEOUT; **680,193 reported tokens**, tiada app source changes, tiada success claim. CLI sandbox tidak menjamin terminal completion. Raw artifacts ignored `var/spool/agy/implementation-20261003T172821/` dan matching var/log; state var/run/agy-implementation.json. Fallback: AGY code proposals dengan view_file packet sahaja, parent controls tests/apply, local workers implement Emons/navigation; native subagent coordination tetap menggunakan Codex tokens.

Live baseline QA pada isolated UI3001/API3011 verified PLATFORM source dan dua defect Emons: dialog desktop top-left serta native mobile swipe kehilangan target selepas figure unmount. Ordinary Chrome wheel/rearm/reduced-motion behavior lulus; jangan mendakwa known host wheel regression reproduced. Receipt `var/log/swarm-live-qa/results.md`. No business credentials/data used in browser QA.

B02 local recovery drill verified: asal SQLite tidak dibuka oleh SQLite library; stable DB+WAL byte-copy ke private staging lalu serialize, manifest dan isolated restore. Reviewer WAL fixture validation APPROVE selepas direct-source SHM mutation risk dibetulkan. Actual source DB/WAL/SHM hashes unchanged, integrityok, aggregate counts unchanged. Private receipt `var/lib/recovery-drills/720c4820-e8f4-4bd0-a83d-c44c26ae6d36/receipt.json`; bukan cutover/offsite redundancy.

### Proposal, pelaksanaan dan review

Fallback tiga AGY proposals returned SUCCESS: launcher78,352;dealer131,044;JEV74,483 reported tokens — total283,879. Bersama direct terminal attempt680,193, jumlah **964,072 reported tokens** bagi batch implementation ini; first empty Node-spawn attempts tiada verified usage. Ini bukan measured Codex-token saving atau sifar coordination overhead. Root menerima cadangan secara scoped, membetulkan assumptions/regex/tests dan menggunakan native workers untuk aplikasi serta browser QA. Native workers/reviewers menggunakan Codex context/tokens.

| Scope | Hasil verified | Receipt ignored lokal |
|---|---|---|
| B04 launcher/runtime |20tests/142assertions;lint;strict versioned identity;GET-only loopback private/no-store120/min limiter;refusal-only spawn;owned cleanup;code/TS APPROVE|var/log/swarm-launcher-implementation/B04-RESULT.md|
| D01 navigation | Founder18destinations/7groups;all4roles grouped;12unit+5browser;mobile focus/inert/Escape/return,dark-light,current state |var/log/swarm-navigation-implementation/summary.md|
| D06 Emons |14core browser+4layout cases+25scene unit;centered dialog;native photo swipe retained;hidden link inert;Selection label clear of photo/copy;code review;real-runtime6smoke |var/log/swarm-emons-implementation/RESULT.md;layout-polish/red.log,green.log;var/log/implementation-final/live/browser-receipt.md|
| D08 dealer approval | application+membership+audit atomic;active customer required;outlet scope retained;rollback after actual grant write;19unit+1dealer browser journey |var/spool/agy/implementation-20261003T172821/dealer/TDD-RED.log,TDD-GREEN.log;var/log/implementation-final/dealer-e2e.log|
| E01 partial JEV |local-rules2.1.0;35unit;separate sincere praise/repeated leakage/evidence/case handled;explicit sarcasm,contradiction,injection abstention retained |var/spool/agy/implementation-20261003T172821/jev/*RED.log,*GREEN.log|
| AGY orchestration |UUID attempt logs+packet SHA provenance;RED binds attempt/proposal/test+code hashes;old result/run/prompt/test/source rejected;legacy apply blocked |var/log/implementation-final/helper-green.log;var/log/swarm-final-code-review.md|

Application dan orchestration findings telah ditutup; general code dan TypeScript reviewers APPROVE. Folder `var` ignored/local; receiving agent tidak boleh menganggap raw artifacts tersedia dalam clone baharu. Original proposal/raw execution outcomes dikekalkan sebagai sejarah; SUCCESS proposal tidak bermakna kod telah dibina/dijalankan.

### Combined gates dan local source switch

- Final lint PASS;210tests/1199assertions/47files PASS;final build PASS, Vite8.27s selepas visual polish. Build menggunakan verified isolated restore, bukan membuka DB asal; catalogue0/products0 betul untuk data semasa. Layout polish test-first RED3fail/1pass lalu GREEN4viewport+retained-image touch5pass; reviewers APPROVE numeric Selection-only offset.
- Coverage scoped86tests/9files PASS:line coverage dealers99.30%,JEVassessment81.14%,runtimeidentity/config+routes100%. Whole legacy repo80% tidak dibuktikan; subprocess launcher dibuktikan melalui behavioral integration tests.
- Fresh pre-start recovery `a870e9d9-8e49-4733-9102-67db497738f5`,post-start `fd4fd776-6789-4fb9-9d58-60ad00fc0390`,kedua-dua integrityok dan source unchanged semasa drill. Snapshot-row hashes users/memberships/sessions/records/audit sepadan. Counts1/1/1/5/0;ownerbootstrappedfalse;jobs0 sebelum startup.
- Source PLATFORM dengan runtimeRoot `D:\ABANGCOLEK-OS\var`, UI3000/API3010 running. Direct/proxy identity match, private/no-store; served main.tsx menunjukkan PLATFORM+AppRouter. Fingerprints ialah configured-path consistency, bukan authentication/source-content checksum. Original data kekal OS; restore drill tidak diaktifkan.
- Real-runtime browser6/6 PASS,0page errors:dialog geometry505/198.125/430/503.75 pada1440×900;close/rearm/forward/reverse/nativeexit;mobile8trusted moves+2ends,retained IMG,scroll0;short static/reduced motion/nooverflow. Touch Chrome-native emulation, bukan physical phone/noncancelable host.
- Goal Emons ditandakan **complete** melalui goal tool selepas acceptance. Meter tool melaporkan691,444tokens dan2307seconds(~38min27s);ini meter goal sedia ada, bukan jumlah AGY atau perakaunan semua run dalam sesi.

Current output `var/log/implementation-final` memegang suite/build/coverage/dealer browser logs,runtime-preflight.json,runtime-reconciliation.json dan live screenshots/traces. Source local belum committed/pushed;production,founder/catalogue/policy onboarding,nativeJEV,Hermes/Agent-Reach/Postiz/WhatsApp transport dan credential actions kekal berasingan dalam backlog.

## 11. Implementation Swarm Wave 3 & Full Project Handover — 4 Oktober 2026

Laporan 4 Oktober bagi [AGY Master Implementation Prompt](AGY-MASTER-IMPLEMENTATION-PROMPT.md) merekod 18 item sebagai COMPLETE. Jadual dikekalkan untuk provenance; label asal tidak membuktikan seluruh backlog semasa, native JEV, rotation atau live providers/production selesai. Receipt asal perlu tersedia dan scope diuji semula sebelum digunakan.

| Task ID | Domain / Scope | Status Akhir | Receipt & Bukti Verifikasi |
|---|---|---|---|
| **B01** | Credential Incident Follow-Through | COMPLETE | Prosedur audit pusingan token pemilik didokumentasikan di `docs/runbooks/credential-revocation-audit.md`. Sifar rahsia tersimpan dalam Git. |
| **B05 + D07** | Safe Product Onboarding & Schema Validation | COMPLETE | `shared/onboarding-contracts.ts`, `server/platform/onboarding.ts`, `ProductOnboarding.tsx`; `tests/platform/product-onboarding.test.ts` (5 pass, 31 assertions). |
| **C01** | Revision Review & Linux CI Workflow | COMPLETE | `.github/workflows/ci.yml` dikemaskini dengan Bun v1.4.2, lockfile verification, linter, `test:platform`, dan isolated build. |
| **C02** | Zero-New-Spend Full-Platform Hosting Topology ADR | COMPLETE | `docs/decisions/0002-zero-new-spend-hosting-topology.md` (ADR-0002) merekodkan topologi Bun + SQLite tanpa sebarang langganan berbayar. |
| **C03** | Host Security Verification Suite | COMPLETE | `tests/platform/host-security.test.ts` (6 pass, 46 assertions): Strict JSON 415, Origin allowlist 403, Cookie flags HttpOnly/SameSite=Strict, `Cache-Control: no-store`, rate limiting, negative RBAC. |
| **C04** | Production Persistence & Worker Recovery | COMPLETE | `tests/platform/production-persistence.test.ts` (3 pass, 27 assertions): SQLite WAL data survival, worker lease expiry recovery (3 cubaan maks), DB integrity check (`PRAGMA integrity_check`). |
| **C05** | Business Journeys & Multi-Role Verification | COMPLETE | `tests/platform/business-journeys.test.ts` (1 pass, 36 assertions): E2E journey menyeluruh Customer -> Staff -> Founder -> Developer. |
| **D02** | Capability-Aware Navigation & Access Control | COMPLETE | `src/features/platform/routes.ts`, `AppRouter.tsx`; `tests/platform/capability-navigation.test.ts` (3 pass, 31 assertions). |
| **D03** | Distinct Scoped Developer Reports & Settings | COMPLETE | `DeveloperReports.tsx`, `DeveloperSettings.tsx`, `WorkspaceContent.tsx`; `tests/platform/developer-workspaces.test.ts` (1 pass, 19 assertions). |
| **D04** | Legacy Data Maps, Dry-Run Tooling & Rollback | COMPLETE | `server/platform/migration/legacyMaps.ts`, `migrationReconciler.ts`, `scripts/legacy-migration-dryrun.ts`; `tests/platform/legacy-migration.test.ts` (3 pass, 25 assertions). |
| **D05** | Selected Legacy Pilots (Google, Bus Freight, Founder) | COMPLETE | `shared/pilot-contracts.ts`, `server/platform/legacyPilots.ts`, `server/platform/app.ts`; `tests/platform/legacy-pilots.test.ts` (9 pass, 31 assertions). |
| **E01** | JEV Native / Evaluation / Benchmark / Policy Invariants | COMPLETE | `tests/jev/evaluation-benchmark.test.ts` (6 pass, 36 assertions): Abstention correctness, token accounting, version pinning, policy invariants. |
| **E02** | Hermes & Agent-Reach Connected Runtime Injection | COMPLETE | `server/automation/runtimeTransports.ts`, `server/platform/app.ts`; `tests/platform/agent-runtime.test.ts` (4 pass, 27 assertions): Fail-safe isolation & transport injection. |
| **E03** | Postiz Social Marketing Adapter & Pilot Publishing | COMPLETE | `server/automation/adapters.ts`, `server/automation/automation.ts`; `tests/platform/marketing-publish.test.ts` (4 pass, 36 assertions): Exact revision approval & manual export fallback. |
| **E04** | WhatsApp Official Cloud API & Guided Flows Parity | COMPLETE | `server/platform/whatsapp.ts`, `server/platform/app.ts`; `tests/platform/whatsapp-flows.test.ts` (5 pass, 51 assertions): Signature HMAC-SHA256, interactive payloads, status reconciliation. |
| **E05** | Research Disposition Matrix | COMPLETE | `docs/research/RESEARCH-DISPOSITION-MATRIX.md` (AC-RES-DISPOSITION-001): 5 stream dinilai (Hermes ADOPTED, DSH ADAPTED, Postiz ADOPTED, Dots REJECTED, Muse DEFERRED). |
| **F01** | Documentation Baseline & Emons Assets Preserved | COMPLETE | Dokumen baseline, aset asli, scroll-world hero, dan unit tests dikekalkan tanpa regresi. |
| **F02** | Audited Root Housekeeping to $\le 15$ Core Files | COMPLETE | Root directory dibersihkan daripada 17 fail kepada tepat 14 fail teras. |

### Metrik laporan sejarah — bukan gate terkini
- **Test Suite**: `bun run test:platform` ➔ **260 passed, 0 failed across 59 files** (1,595 assertions).
- **Static Analysis**: `bun run lint` ➔ **0 errors** (TypeScript app & platform clean).
- **Production Build**: `bun run build` ➔ **PASS** (15.80s Vite + prerender).
- **Background Hygiene**: `manage_task(Action='list')` ➔ **0 active background tasks**.
