# Prompt 04 — Tujuh Generative UI Approaches, HITL dan Bounded Specialists

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Bukti dan generated status:** baca [PROJECT-CHECKLIST.md](../../PROJECT-CHECKLIST.md). Integrator menulis actual receipt/environment/source manifest/reviewer, mengemas kini ledger85 berdasarkan bukti lengkap, kemudian menjalankan verifier dan renderer. Jangan edit generated checklist/register dengan tangan; separa/blocked/failed/not-run kekal unchecked. Worker menyerahkan bukti/baki; checkpoint menyimpan next task. Ikut execution contract§10; child task tidak menutup parent feature.

**Refinement commerce/growth:** baca [spec canonical](../design/commerce-growth.md) dan [handover](COMMERCE-GROWTH-HANDOVER-20261021.md). Public store/private dealer workspace mempunyai journey berbeza; cart/reorder tool hanya unsent draft. Semua7GUI/10CPK asal kekal wajib. Ini subcriteria existing85 IDs; tiada kadar/5-tier/wallet/native app baharu diluluskan dan tiada acceptance ditutup oleh dokumentasi.


Baca [master prompt](IMPLEMENT-ABANGCOLEK.md), [execution contract](AGENT-EXECUTION-CONTRACT.md), [GUI contract](../design/copilot-generative-ui-seven-approaches.md), [CPK contract](../design/copilotkit-ten-features.md), [acceptance register](ACCEPTANCE-REGISTER.md) dan checkpoint03B. Laksanakan CPK-04..08/10; CPK-01/09 mesti terus menggunakan provider/thread yang sama. A2UI Fixed Schema dan first-party read-only MCP App telah diputuskan; jangan memilih protocol alternatif.

## Inputs, ownership dan outputs

Input:02 real SDK/identity/grants/budget interfaces,03B strict registry/canonical results/proposals,01 move manifest dan approved product components. Frontend owner memiliki adapters/renderers, Python owner fixed surfaces/state/specialists, backend owner approvals/MCP projection/executor; integrator memiliki shared schema/composition dan dependency graph. Jangan dua owners menulis shared contract serentak.

Output **PLANNED**: all7 GUI adapters, approval/execution state machine, real delegation, protocol/browser evidence pada `reports/implementation/04-ui-agents.md` serta checkpoint05. Existing `MarginSimulatorForm.tsx`, `OperationsBriefApp.tsx`, `frontendToolAdapters.ts`, `tests/frontend/gui02-interactive.test.tsx`, `gui05-mcp-app-view.test.tsx`, `frontend-tool-adapters.test.ts` dan platform `mcp-brief.test.ts`, `adk-specialists.test.ts` ialah inputs untuk reconcile, bukan framework certification.

## 04.1 — Common schema dan red security tests

Implement common project envelope adapter: schema/surface/thread/run IDs, data, source refs/revisions, policy, observedAt, missingData dan status. Ini project DTO, **bukan** redefine SDK AG-UI/A2UI event. Adapters memvalidasi pinned SDK messages dan memetakan explicit kepada DTO. Amount sen/ratio canonical; no fabricated margin/confidence/default business samples.

Tulis **PLANNED** `tests/copilot/ui-schema.test.ts`, `shared-state.test.ts`, `frontend-tools.test.ts`, `approval-execution.test.ts`, `mcp-app-protocol.test.ts`, `a2ui-fixed-schema.test.ts`, `subagent-budgets.test.ts`; Python `test_ui_surfaces.py`, `test_state.py`, `test_subagents.py`. Named red cases: `rejects unknown component action and props`, `rejects unsafe markup and prototype paths`, `rejects oversized deep cyclic tree`, `rejects stale source revision`, `replay renders without execution`, `rejects foreign thread surface`. Exact bounds berasal shared contract/GUI schema; test limit dan limit+1. Jangan invent SDK prop name.

```powershell
bun test ./tests/copilot/ui-schema.test.ts ./tests/copilot/shared-state.test.ts ./tests/copilot/frontend-tools.test.ts ./tests/copilot/approval-execution.test.ts ./tests/copilot/mcp-app-protocol.test.ts ./tests/copilot/a2ui-fixed-schema.test.ts ./tests/copilot/subagent-budgets.test.ts
```

Expected first run meaningful behavioral failures, kemudian green selepas implementation. Missing package/file sahaja ialah tooling blocker, bukan bukti business/security test telah exercised.

## 04.2 — GUI-01/02/03 dan canonical cards

| Approach | Deliverable tetap | Test/bukti minimum |
|---|---|---|
| GUI-01 Display Only | `src/features/copilot/cards/`: order/tracking/margin/JEV cards daripada validated canonical results | Loading/empty/denied/missing/stale/error, source revision dan sen parity; mount/replay no effect |
| GUI-02 Interactive | `interactive/`: structured selection/draft/review callbacks, server-owned proposal refs | Strict decision enum, no Boolean coercion, duplicate/stale/expired callbacks; UI selected tidak automatic financial approval |
| GUI-03 Tool Rendering | `tool-rendering/`: actual tool-call/args/result/error lifecycle | Tool IDs correlate to SDK events/receipt, abort/unknown separate, replay no reexecution |

Generic docs berlabel Built-in Agent tidak automatik serasi ADK. Verify relevant pinned ADK tool/event/human-input adapter dan register sebenar. Local React onClick tanpa framework callback bukan CPK integration. Existing simulator boleh dipakai pure component, tetapi calculation tetap domain canonical dan success label memerlukan receipt.

## 04.3 — GUI-04/CPK-08 shared state dan CPK-07 frontend tools

`src/features/copilot/state/`, `state-rendering/` dan Python `sessions.py` memetakan approved fields sahaja: selected order/filter/draft inputs/proposal ref serta revisions. Reset pada logout/user/workspace/thread switch; older response ignored. Paid/price/role/grants/stock authority tidak writable dari client state. Parse context mengikut pinned AG-UI/ADK wire, bukan cast browser object kepada trusted context.

Frontend tools pada `src/features/copilot/frontend-tools/` expose allowlisted route/filter/highlight/unsent draft sahaja. Validate routes/entity IDs/quantities dan authorize record navigation. Tiada arbitrary URL/fetch/eval/cookie/storage access, hidden clipboard/message send atau ledger mutation. Tool availability tidak memberi broad permissions. `prepare_cart_draft` kekal unsent/requires_reprice; submit canonical berasingan.

Named tests: `switch clears prior principal context`, `cannot spoof paid price role`, `stale patch rejected`, `route outside allowlist denied`, `draft cannot reserve stock`, `frontend result cannot promote grants`. Verify agent tool request -> actual frontend adapter -> structured result -> updated allowed state tanpa run kedua.

## 04.4 — GUI-05 real first-party MCP App

Target fixed: stable server ID `abangcolek-operations-brief`, endpoint runtime-service `/api/copilot-mcp`, resource `ui://abangcolek/operations-brief/v1`, capability `operations_brief.read`, tool `get_operations_brief` specialization ADV-03. Source `server/platform/mcp/operationsBrief.ts` ialah existing local implementation input; migrate/reconcile ke **PLANNED** `server/agents/mcp/operations-brief.ts`, `ui-resource.ts`. Remove fabricated business defaults daripada production projection.

1. Lock `@modelcontextprotocol/sdk@1.32.1` bagi runtime's existing major graph. Ext-apps2.0.3 host menggunakan core/client/server2.0.0 graph mengikut ADR. **HTTP boundary**, bukan shared/cast `McpServer` instance. Tulis import smoke bagi kedua graph sebelum implementing host.
2. Implement authenticated initialize/capability negotiation, `tools/list`, `resources` contract, scoped tool call dan UI resource retrieval mengikut exact SDK exports. SDK import success sahaja tidak menutup protocol.
3. Runtime MCP Apps activity associates result/resource, host memuat actual sandboxed iframe `OperationsBriefApp` dengan validated projection. JSON resource, React route atau HTML card sahaja tidak menutup GUI-05.
4. Reauthorize tool/resource/restore. No bearer authority daripada resource URI; no service/user credentials dalam iframe. Short-lived server-mediated grant kekal backend, no unrestricted proxy/arbitrary remote server/URL.
5. Default-deny CSP/frame/network, origin+source+message schema checks, approved MIME/resource hash, only first-party assets. Test credentials absent dalam resource/bundle/messages/network; CSP actual deployment behavior perlu verified.

Protocol named cases: `initializes isolated MCP graphs over HTTP`, `negotiates tool and UI resource`, `renders resource in sandboxed host`, `denies expired foreign grant`, `rejects malicious message origin and MIME`, `denies external fetch and tampered resource`, `replay cannot mutate`. Capture request/resource/iframe trace tanpa secrets. Compatibility failure -> `GUI05_DEPENDENCY_BLOCKED`/`DEPENDENCY_INCOMPATIBLE`, component may remain disabled; jangan fake protocol using REST replacement.

## 04.5 — GUI-06 fixed-schema read-only A2UI

Fixed catalog `copilotkit://abangcolek-ops-v1`, surfaces `operations-brief-v1`, `refund-impact-v1`; unique instance surface IDs per thread/run/entity. Approved catalog components/layout hanya yang GUI contract senaraikan. JSON schema startup validation/version/hash, unknown component/prop/JSON Pointer/prototype path rejected; no arbitrary HTML/JS/import/URL.

Flow: canonical query/refund preview -> validated domain data -> Python `agents/google-adk/ui_surfaces.py` fixed operations container -> real A2UI middleware -> pinned React renderer under `src/features/copilot/declarative/`. Verify current `createSurface`/`updateComponents`/`updateDataModel` nested shape/wire version pada pinned package sebelum code. `a2ui.v1` label dengan custom JSON bukan proof middleware protocol.

Dynamic schema/secondary-model injection disabled, documented `injectA2UITool: false` hanya selepas actual pin support disahkan. Capture no second provider call atau schema generation tool registration. Fixed surfaces **read-only**: pinned Python helper documentation tidak menyokong `action_handlers`. Canonical approval controls GUI-02 berada di luar A2UI surface. Jangan render inert Button lalu claim server action, atau copy optimistic success showcase.

Tests dua surfaces sebenar: canonical amounts/revisions, catalog mismatch, missing binding/source, unknown prop/path, orphan/duplicate/cyclic component, excessive depth/count, stale/replayed operations, surface isolation dan BM/English money/ratio rendering. Valid tree tidak menggantikan resource authorization.

## 04.6 — GUI-07 reusable product components dan CPK-09 parity

Reuse existing ABANGCOLEK primitives/styles dengan pure view models, explicit framework adapters dan lazy renderer imports selepas ukuran bundle. No second design system/provider/thread. Components tidak membaca secret/ledger localStorage atau melakukan effect on mount. Workspace, Pet, tool card dan MCP/A2UI projection menunjukkan value/source/status yang sama.

Test mobile320px, keyboard-only/focus restoration/error announcement, WCAG AA contrast, light/dark, reduced motion dan English/BM. Browser snapshot/source component test berbeza evidence daripada actual runtime journey. No microphone/vision/attachments inference auto-enable; adjacent EXT gates kekal separate.

## 04.7 — CPK-06 durable approval dan actual execution

Implement **PLANNED** `server/agents/approvals/service.ts` mengikut canonical founder workflows. Persist immutable proposal payload/hash, actor/entity/policy revisions, preview expiry<=5min, high-risk approval<=15min atau stricter domain expiry. Allowed decisions strict enum; unknown keys/non-Boolean coercion rejected. Actor role/resource fresh checked pada approve **dan execute**.

State transitions: proposed -> approved/rejected/expired; approved -> executing -> succeeded/failed/unknown_outcome. Stale revision/policy/price/stock blocks execute atau memerlukan new preview/reapproval. Approval bukan success; no random journal IDs/fake receipt. Execution dispatch only allowlisted canonical command, durable transaction/CAS receipt + authoritative audit refs. Duplicate request/key/approval returns same outcome, not repeat effect. If executor absent -> `EXECUTOR_UNAVAILABLE` disabled, approval UI tidak kata succeeded.

Tests reject/expire/stale, revoked approver, changed cost/stock, duplicate callbacks, command failure/CAS conflict, abort after commit, external timeout/unknown dan reconciliation before retry. Browser success value sepadan durable record after reload; intercepted mocked response tidak cukup.

## 04.8 — CPK-10 actual bounded delegation

`abangcolek_ops` delegates hanya `commerce_reader`, `qc_jev_reviewer`, `marketing_drafter` melalui actual ADK orchestration. Children mendapat subset grant/minimum context refs dan same remaining budget, tidak menerima execute/publish/payment grants, service secret atau role override. Children tidak delegate lagi. Output specialist/run/parent linkage, sources, assumptions/missing data dan result status; jangan log chain-of-thought.

Depth1/concurrency2/max3 specialist calls **upper bounds**. Total3 model calls/run termasuk parent+children+retry/failover; parent+3 model-calling children melanggar limit. Tool dispatch6 total termasuk delegation dan child tools; no fresh child quota. Reserve budget atomic sebelum spawn/call. Deadline30s/cancel propagate; no silent new run. Partial/failed specialist visible, no invented completion/confidence.

Python/TS tests genuine parent-child trace, grant attenuation, recursive delegation rejection, concurrency/deadline, duplicate send, parent/child model budget race, 429/retry consumption dan partial synthesis without loop. Nama specialist dalam prompt/health endpoint sahaja tidak lulus.

## Verification, review dan continuation

**PLANNED** E2E `tests/e2e/copilot-generative-ui.spec.ts`, `copilot-approval.spec.ts`, `copilot-subagents.spec.ts`: semua7 approaches, role denial, thread switch/replay, tampered resource/message, schema failures, keyboard/mobile/themes, approval->actual receipt dan delegation trace.

```powershell
bun test ./tests/copilot
uv run --project agents/google-adk pytest agents/google-adk/tests
bun run lint
bun run build
bun run test:platform
bun run test:e2e tests/e2e/copilot-generative-ui.spec.ts tests/e2e/copilot-approval.spec.ts tests/e2e/copilot-subagents.spec.ts
```

Gunakan Python locked fallback02 jika uv unavailable, mapped paths01 bagi tests lama dan QA fixture verified. Synthetic protocol/browser fixtures dilabel; one live allowed tool journey selepas model gates memberi bukti tambahan, bukan mengatasi negative tests.

Independent TS/Python/security review mesti menyemak scope, parsers, SDK-major boundary, real receipts dan budget accounting. Register per GUI/CPK mempunyai source hash, command/result, protocol trace, viewport/theme/locale dan environment. Missing MCP/A2UI/hosting gates block rows tepat, kerja UI/contract lain diteruskan. Next [05 Intelligence](05-intelligence.md); jangan claim7 approaches complete daripada komponen React sahaja.
