# Source-Level Acceptance Audit — 85 IDs (2026-10-20)

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../docs/CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Auditor: read-only source audit subagent (static reading; no test execution).
Companion: `2026-10-20-double-check-findings.md` (orchestrator, command-verified) and
`2026-10-20-dependency-pin-resolution.md` (registry-verified).

**Method note:** the auditor had no shell access, so every "test" row below is a
*reading* of the named test file, not an observed run. Rows marked
`implemented_verified` are justified by tests that clearly bind to a real
store/HTTP surface and assert computed values. Command-verified counts come from
the orchestrator's own runs (see the companion findings file).

**Register claim being tested:** `docs/prompts/ACCEPTANCE-REGISTER.md:5` claims
`60/78 core verified_local`, 74 passing tests, 430 assertions. The register's
`verified_local` column was **not** used as input.

---

## Status table

Legend — Status: `implemented_verified` (real impl + test exercises required
behaviour) · `partial` (named part missing) · `not_run` (no impl) ·
`blocked_external`. Test quality: `REAL` · `FIXTURE` (asserts a value the impl
also hardcodes, or asserts a detector without driving it) · `NONE`.

### CPK — 10

| ID | Status | Source | Test | Quality | Gap |
|---|---|---|---|---|---|
| CPK-01 Chat | partial | `server/platform/app.ts:454`; `server/platform/adkAgent.ts:162`; `server/agents/copilot/runtime.ts:44` | `copilot-v2-runtime.test.ts:66`; `copilot-adk.test.ts:101` | FIXTURE (asserts the echo: expects the user's own `ORD-001` string back) | no SDK, no grounded record query, no record/revision citation, no timeout/429/cancel, no cross-user denial |
| CPK-02 AG-UI Streams | partial | `server/platform/app.ts:468` (custom SSE) | `copilot-adk.test.ts:101` | REAL (framing only) | no AG-UI protocol, no thread replay/resume, no re-authorize-on-restore |
| CPK-03 Automatic Learning | not_run | NONE | NONE | — | no evidence→insight→skill→eval→review→publish→pin→rollback pipeline |
| CPK-04 Generative UI | partial | `src/features/copilot/declarative/A2UIFixedRenderer.tsx:135`; `server/platform/adkAgent.ts:189` | `a2ui-components.test.tsx`; `copilot-gui06-a2ui.test.tsx:22` | REAL (renderer rejection) | server card props hardcoded; no canonical receipt lookup |
| CPK-05 Declarative UI | partial | `src/features/copilot/a2ui-registry.ts:30`; `A2UIFixedRenderer.tsx:350` | `a2ui-components.test.tsx` | REAL | no versioned surface catalog, no depth/cycle limits, no AG-UI middleware |
| CPK-06 Human-in-the-loop | partial | `server/platform/adkAgent.ts:103`; `app.ts:190` | `hitl-execution-v24.test.ts:74,125,160,201,238` | REAL | no execution phase, no payload hash/revision, no CAS, no `unknown_outcome` |
| CPK-07 Frontend tools | partial | `src/features/copilot/components/frontendToolAdapters.ts:90` | `frontend-tool-adapters.test.ts:8,35,58` | REAL | **never instantiated outside tests**; no `AGUIToolset()`, no server round-trip |
| CPK-08 Shared state | partial | `src/features/copilot/state-rendering/ScopedStateView.tsx:158` | `gui03-04-state-tool.test.tsx:92,113,138,166,218` | REAL | **never mounted**; no live store, no server-issued revision, no patch application |
| CPK-09 Headless UI | partial | `src/features/pet/PetCompanion.tsx:224`; `CopilotWorkspace.tsx:105` | NONE | — | Pet calls legacy `/api/platform/copilot/chat`, workspace calls `/copilot/v2` → two surfaces, no shared thread/run |
| CPK-10 Sub-agents | not_run | NONE in TS (only orphaned Python stubs) | `adk-specialists.test.ts` | FIXTURE (mocks built inside the test; imports nothing from `agents/google-adk`) | no delegation, no trace, no depth/concurrency/budget caps |

### GUI — 7

| ID | Status | Source | Test | Quality | Gap |
|---|---|---|---|---|---|
| GUI-01 Display Only | partial | `src/features/copilot/cards/*`, `components/*` | `gui01-display-only.test.tsx` (13 tests) | REAL | no real data binding; only `A2UIFixedRenderer → OperationsBriefApp` is mounted, fed by hardcoded props |
| GUI-02 Interactive | partial | `src/features/copilot/interactive/MarginSimulatorForm.tsx:12` | `gui02-interactive.test.tsx` (7) | REAL | **never mounted**; no server callback; no decision→revalidation→receipt path |
| GUI-03 Tool Rendering | partial | `src/features/copilot/tool-rendering/ToolStatusView.tsx:45` | `gui03-04-state-tool.test.tsx:10,35,52,71` | REAL | **never mounted**; no tool-lifecycle event source |
| GUI-04 State Rendering | partial | `src/features/copilot/state-rendering/ScopedStateView.tsx:158` | `gui03-04-state-tool.test.tsx:92…218` | REAL | **never mounted**; no state store; revision not separated from entity/policy revision |
| GUI-05 MCP Apps | partial | `src/features/copilot/mcp-apps/OperationsBriefApp.tsx:3`; `server/platform/mcp/operationsBrief.ts:30` | `gui05-mcp-app-view.test.tsx`; `mcp-brief.test.ts` | FIXTURE (asserts the impl's own `28`/`94500`/`1`) | **no MCP protocol at all** — no initialize/tools/list/tools/call/resources/read, no UI-resource metadata, no iframe host, no CSP |
| GUI-06 A2UI | partial | `shared/copilot-contracts.ts:36`; `a2ui-registry.ts:30`; `A2UIFixedRenderer.tsx:135` | `a2ui-components.test.tsx`; `copilot-gui06-a2ui.test.tsx` | REAL | allowlist + inert rendering real; missing startup catalog, depth/cycle limits, AG-UI path, real server payloads |
| GUI-07 Your Components | partial | `src/features/copilot/cards/*`, `components/*` | `copilot-gui07-components.test.tsx:8` | REAL | not mounted, not on the same API data path, no reduced-motion/theme coverage on the copilot surface |

### MOD — 10

> `tests/copilot/` is a real, substantial, **mostly-unwired** suite: 9 files
> (`mod-01`…`mod-06`, `mod-08`…`mod-10`). **There is no `mod-07` (Marketing).**
> `package.json:11` `test:platform` **excludes** `./tests/copilot`,
> `./tests/frontend`, `./tests/architecture` and `tests/landing-brand-theme.test.ts`.

| ID | Status | Source | Test | Quality | Gap |
|---|---|---|---|---|---|
| MOD-01 Storefront | partial | `server/platform/commerce.ts:119`; `src/features/flows/customer-cart.ts`; `domainTools.ts:234` | `mod-01-storefront.test.ts` (8) | REAL | ADV-02/03 absent; `domainTools.ts:247` falls back to a hardcoded 3-SKU catalogue; `diagnose_checkout` asserts `valid===true` without a detector |
| MOD-02 Orders/tracking | partial | `commerce.ts`; `app.ts:100,376`; `paymentReconciliation.ts:233` | `mod-02-orders.test.ts`; `order-tracking-token.test.ts` | REAL | ADV-04 absent; public-token projection not separated inside the copilot path; `PaymentReconciler` unmounted |
| MOD-03 Inventory | partial | `commerce.ts:100,220,263,390`; `domainTools.ts:311` | `mod-03-inventory.test.ts` (4) | REAL | ADV-09/10/11/12 absent; `domainTools.ts:328,353` hardcoded warehouses/allocation |
| MOD-04 QC/JEV | partial | `server/platform/jev/*`; `operations.ts`; `app.ts:151` | `mod-04-qc-jev.test.ts`; `tests/jev/**` (7 files) | REAL — strongest suite | ADV-11/12/21/23/24/29 absent; copilot path bypasses the evaluator and emits a hardcoded card |
| MOD-05 Dealer/komisen | partial | `server/platform/dealers.ts`; `app.ts:125` | `mod-05-dealers.test.ts`; `dealer-commission-ledger.test.ts`; `dealer-approval.test.ts`; `dealer-completion.test.ts` | REAL | ADV-14 absent; `domainTools.ts:560` hardcoded commission summary; no due-vs-recorded-paid in the copilot surface |
| MOD-06 Loyalty/referral | partial | `server/platform/loyalty.ts:100`; `commerce.ts` (referral) | `mod-06-loyalty.test.ts` (6); `loyalty-redemption.test.ts` | REAL | ADV-15/16 absent; **REF-01 (risk engine) not implemented anywhere**; `domainTools.ts:615` hardcoded tier/balance |
| MOD-07 Marketing | partial | `server/platform/marketing.ts`; `marginGuardian.ts` → `shared/growth-contracts.ts:131`; `app.ts:119` | `growth-margin.test.ts`; `marketing-publish.test.ts` | REAL | **no `tests/copilot/mod-07-*` file**; ADV-13 unmounted, ADV-32 absent; `domainTools.ts:686` hardcodes `margin = 28.5` |
| MOD-08 Finance/day-close | partial | `operations.ts`; `operationalAmendments.ts`; `reports.ts`; `app.ts:108` | `mod-08-finance.test.ts`; `financial-integrity-v24.test.ts` | REAL | ADV-06/17/18/19/20 absent; `domainTools.ts:500,784,810` hardcoded ledger/daily/KPI; `app.ts:169` `/quotas` returns null observations for 4 providers |
| MOD-09 Tasks/SOP | partial | `server/platform/work.ts`; `app.ts:106`; `reports.ts` | `mod-09-tasks-sop.test.ts`; `work-collaboration*.test.ts` | REAL | ADV-02/23/24/29/30 absent; no citation/version/expiry output contract; `work.knowledge` is plain lexical search with no ACL/versioning at the copilot boundary |
| MOD-10 Automations | partial | `server/automation/*`; `app.ts:156` | `mod-10-automations.test.ts`; `automation-completion*.test.ts`; `cloud-worker.test.ts` | FIXTURE (`agent-runtime.test.ts:121` asserts a string produced by the local stub) | ADV-24/26/27/31 absent; `LocalPostizTransport`/`LocalWhatsAppTransport` return `published`/`sent` unconditionally |

### ADV — 32

| ID | Status | Source | Test | Quality | Gap |
|---|---|---|---|---|---|
| ADV-01 discover_capabilities | partial | `definitions.ts:23` | `advanced-tools-registry.test.ts:16` | REAL (role filter only) | unmounted; no intent/domain filter; no availability reason; role model ≠ canonical 4-role grant model |
| ADV-02 search_records | not_run | NONE | NONE | — | no scoped entity enum, cursor, per-hit source/revision, ownership-mix rejection |
| ADV-03 build_context_bundle | partial | `domainTools.ts:827` (`get_operations_brief` only) | `mcp-brief.test.ts:6` | FIXTURE | no entity/field/revision bundle; hardcoded metrics; no max-20 bound; no mixed-revision labelling |
| ADV-04 explain_record | not_run | NONE | NONE | — | no timeline, policy-version or receipt-link projection |
| ADV-05 diagnose_checkout | partial | `definitions.ts:47` | `mod-01-storefront.test.ts:182` | FIXTURE | unconditional `valid:true`; no conflict detection at all |
| ADV-06 reconcile_payments | not_run | NONE (`paymentReconciliation.ts:233` exists but is not a tool) | NONE | — | no registration; no expected/recorded/matched/missing/uncertain report |
| ADV-07 preview_refund | partial | `definitions.ts:68` | NONE | — | `status:'simulated_ok'`, `estimatedDriftSen:0`; no allocation, no refundable balance, no preview ref/hash/revisions/expiry |
| ADV-08 propose_refund | partial | `definitions.ts:91` | NONE | — | `proposalId: prop-ref-<Date.now()>`; nothing persisted; no preview-ref/hash binding; no write-grant distinct from read |
| ADV-09 assess_expiry_risk | not_run | NONE | NONE | — | no FEFO risk tiers, timezone boundary, missing-expiry handling |
| ADV-10 plan_restock | not_run | NONE | NONE | — | no lead-time/sales-window derivation; no `insufficient_data` path |
| ADV-11 trace_batch | not_run | NONE | NONE | — | no lot→movements/receipts/consignments/cases traversal |
| ADV-12 propose_quarantine | not_run | NONE (`commerce.quarantine` exists at `commerce.ts:394`) | NONE | — | no bounded proposal, no affected-available-units, no stale-stock revalidation |
| ADV-13 simulate_campaign | partial | `definitions.ts:117` | `advanced-tools-registry.test.ts:91,109` | REAL (BigInt ratio) | unmounted; **no minimum-amount threshold**; does not reuse `evaluateMarginContribution` (`shared/growth-contracts.ts:131`) |
| ADV-14 explain_commission | not_run | NONE (`domainTools.ts:544` is not a tool of this name) | NONE | — | no earning/held/paid/contra/dispute timeline |
| ADV-15 audit_loyalty | not_run | NONE | NONE | — | no earned/redeemed/expired/reversed reconciliation, no duplicate-ledger-event detection |
| ADV-16 assess_referral | not_run | NONE | NONE | — | no attribution policy evaluation, no review-required path, no `unknown` for absent signals |
| ADV-17 reconcile_dayclose | not_run | NONE | NONE | — | no float/sales/expense/cash variance computation exposed |
| ADV-18 build_finance_digest | not_run | NONE | NONE | — | no timezone-aware period, exclusions, source cutoff, freshness |
| ADV-19 trace_transaction | not_run | NONE | NONE | — | no payment↔stock↔commission↔loyalty effect linking |
| ADV-20 export_report | partial | `app.ts:174` (`GET /reports/export`, CSV-injection-safe) | `report-builder.test.ts` | REAL (route) | not a tool; no artifact hash/expiry/download-ref; no quota; publish blocked (`PUBLISHER_UNAVAILABLE`) |
| ADV-21 triage_case | partial | `server/platform/jev/assessment.ts`, `policyEngine.ts` (real) | `tests/jev/*`; `mod-04-qc-jev.test.ts` | REAL (evaluator) | not registered as a tool; copilot route bypasses the evaluator |
| ADV-22 plan_consignment | not_run | NONE (`legacyPilots.ts` is a data constant) | NONE | — | no checklist/allocation, no capacity/conflict refs, no ETA fabrication guard |
| ADV-23 draft_customer_reply | partial | `server/platform/work.ts` `prepareMessage`/`confirmMessage`; `app.ts:226` | backend-workflows family | REAL (domain) | not a tool; no source citation in the draft; no outbound-send/consent guard |
| ADV-24 build_action_plan | not_run | NONE | NONE | — | no planner, no grant-aware steps, no `propose_automation` D specialization |
| ADV-25 execute_approved_action | partial | `definitions.ts:146` | `advanced-tools-registry.test.ts:49` | FIXTURE (asserts `status==='confirmed'` on a receipt never stored) | no proposal lookup, no hash/revision check, **no store write**, no CAS, no idempotency key, no approval validation |
| ADV-26 reconcile_action | not_run | NONE | NONE | — | no `inspect_action_receipt` / `refresh_external_action_status` / `apply_verified_action_outcome` |
| ADV-27 inspect_runtime | partial | `app.ts:159,169,179` | `agent-runtime.test.ts:43`; `backend-boundaries.test.ts` | REAL (health) | not a tool; `/quotas` hardcoded nulls; no job/backup/lease diagnostic; no redaction test |
| ADV-28 review_skill_candidate | not_run | NONE | NONE | — | no candidate/eval/review/publish/rollback (Intelligence dependency also external) |
| ADV-29 search_sop | partial | `app.ts:114` → `work.ts` | `flow-answers.test.ts`; `mod-09-tasks-sop.test.ts` | REAL (domain) | not a tool; no cited snippets/version/expiry; no ACL/revoked/stale exclusion proof at the copilot boundary; no prompt-injection-as-text test |
| ADV-30 propose_task | partial | `app.ts:229` (idempotent via `postRoute` `app.ts:93`) | `backend-flows-jobs.test.ts`; `mod-09-tasks-sop.test.ts` | REAL (domain) | not a tool; no source/action-plan linkage; no assignee/outlet scope check in the tool |
| ADV-31 evaluate_job_retry | partial | `server/automation/jobs.ts` | `automation-completion.test.ts`; `cloud-worker.test.ts`; `worker-process-recovery.test.ts` | REAL (job) | no safe/unsafe/unknown evaluator; no evidence+prerequisite+next-allowed-action output |
| ADV-32 draft_campaign | partial | `server/platform/marketing.ts`; `app.ts:241`; FIN-01 at `shared/growth-contracts.ts:131` | `growth-margin.test.ts:87`; `marketing-publish.test.ts` | REAL (domain) | not a tool; no simulation hash/version binding; no rights/locale/product eligibility check; no duplicate-draft guard |

### Master — 19

| ID | Status | Source | Test | Quality | Gap |
|---|---|---|---|---|---|
| FIN-01 | **implemented_verified** | `shared/growth-contracts.ts:131`; `server/platform/marginGuardian.ts:5`; `marketing.ts`; `app.ts:139` | `growth-margin.test.ts:21,34,61,87,182,205` | REAL — amount **and** ratio gates, staff-vs-founder override, `INSUFFICIENT_CASH_MARGIN` precedence, zero-sales NaN guard | none at acceptance level (the copilot surface's hardcoded 28.5% is CPK-04/AI-02, not FIN-01) |
| PAY-01 | partial | `paymentReconciliation.ts:233` (dedupe at `:287`) | `payment-reconciliation-v24.test.ts:97` | REAL (class) | **no HTTP callback route**; **no HMAC X-Signature verification**; external gate = Billplz sandbox |
| PAY-02 | partial | `commerce.ts:289` (`PAYMENT_NOT_VERIFIED`) | `payment-reconciliation-v24.test.ts` | REAL (domain) | no success-redirect route and no callback route → journey never exercised end-to-end; external gate = Billplz sandbox |
| PAY-03 | partial | `paymentReconciliation.ts:90` (Hamilton-Hare) | `refund-allocation-v24.test.ts` | REAL — 0-cent drift, cumulative contra, line allocation | unmounted; no post-payout boundary against recorded `paidAmountSen`; no order-level cap/dedupe |
| STK-01 | **implemented_verified** | `commerce.ts:100,220,263,105`; all inside `store.atomic` via `app.ts:512` | `mod-03-inventory.test.ts`; `backend-lifecycle.test.ts:58`; `dealer-completion.test.ts:80,83,96,119` | REAL — quarantine transitions, custody hold, expiry-at-receipt quarantine | local single-process CAS only (blueprint:377 flags cloud contention) — acceptable at `verified_local` |
| OFF-01 | partial | `src/features/platform/client.ts:35` (fingerprint + Idempotency-Key + `PENDING_RECONCILIATION`), `:72` (generation counter) | `offline-cache.test.ts`; `client-retry.test.ts`; `client-session-race.test.ts`; `tests/e2e/privacy-offline.spec.ts` | REAL | no revalidate-on-reconnect; no server-side revision compare before retry; no per-field conflict resolution |
| REF-01 | not_run | NONE | NONE | — | no risk engine, no OTP, no device/velocity/age signals, no reason codes, no appeal path |
| REF-02 | **implemented_verified** | `commerce.ts` (referral validation + `SELF_REFERRAL_DISALLOWED`); `dealers.ts` (`benefits`, `createCommissionFromOrder`) | `agent-storefront-referral.test.ts:401,257,473`; `mod-06-loyalty.test.ts:201,216` | REAL — case-insensitive self-referral match; dealer vs customer reward separate ledgers | none at acceptance level |
| LOY-01 | **implemented_verified** | `loyalty.ts:242` (atomic redeem, `sourceOrderId` dedup), `:138` (expire), `:294` (idempotent reversal) | `loyalty-redemption.test.ts:192,199,223,380`; `mod-06-loyalty.test.ts` | REAL — over-redemption rejected, cancel reversal, expiry boundary | cloud-conflict evidence absent (blueprint:381) — out of `verified_local` scope |
| SEC-01 | partial | `commerce.ts` (`trackingToken` raw 32-byte, hash, expiry); `app.ts:101,376`; `shared/upload-limits.ts` | `order-tracking-token.test.ts:112,120,151,176,255,300,350`; `mod-02-orders.test.ts` | REAL — token ≥43 chars, hash stored not raw, expiry rejection, hash not leaked | **revocation not implemented**; handover-based expiry is creation-time only; no referrer-policy/revocation test |
| SEC-02 | implemented_verified (conditional) | `app.ts:127` (dealer terms gated on `dealerOrgId`), `:131` (per-org commission scoping); `commerce.ts:390` (inventory scoped) | `dealer-approval.test.ts`; `dealer-completion.test.ts`; `backend-boundaries.test.ts`; `mod-05-dealers.test.ts` | REAL | `app.ts:127` does not check `m.status==='active'` (see D-19) — a disabled membership would still grant read access |
| DR-01 | partial | `backup.ts:20` (transactional serialize + evidence hash + manifest), `:39` (restore + `PRAGMA integrity_check` + count + referenced-evidence check); `backupScheduler.ts:281` (RPO ≤ 4h) | `backup-restore.test.ts` | REAL (integrity) | **RTO never measured** (no 30-min drill, no timing assertion); no production drill; no cloud snapshot history / encryption-key recovery (blueprint:359) |
| AI-01 | partial | `server/platform/freeModelRouter.ts:242` (3.5s timeout), `:285` (failover), `:292` (fallback) | `copilot-adk.test.ts:14` | FIXTURE — asserts `providerId==='nvidia'` for a fallback where **no provider was contacted** | fallback returns the *active* provider id/model while serving a locally generated string → `local_rules` masquerades as `live_model` (violates blueprint:293) |
| AI-02 | not_run (actively violated) | NONE | NONE | — | fixed 28.5% + `PASSED` with `provenance.source:'canonical_evaluator'`; hardcoded order id/hash with `provenance.source:'database'`; fallback prose claims a complaint "telah direkodkan" and quarantine "telah dimulakan" without receipts; brief claims "Lejar bayaran atomik disahkan seimbang" |
| AI-03 | partial | `adkAgent.ts:131` (expiry `:136`, already-decided `:140`, founder-only `:132`) | `hitl-execution-v24.test.ts:160,201,238` | REAL | no CAS, no stale-policy/entity-revision revalidation, no durable execution, no `unknown_outcome`, no provider-timeout-after-dispatch reconciliation |
| PD-01 | partial | `operationalAmendments.ts:181` (`notification_preferences.allowedTopics`); `marketing.ts:21` (per-asset `rights`/`consent`) | `operational-amendments*.test.ts`; `tests/e2e/founder-complete.spec.ts:89` | REAL (storage) | **no opt-out gate at dispatch** — publish is blocked outright (`PUBLISHER_UNAVAILABLE`) so no dispatch path exists to gate; no queued-dispatch re-check; asset `consent` is a free-text string, not a consent record (blueprint:276) |
| OPS-01 | **implemented_verified** | `commerce.ts:270` (consume only from `status==='available'` lots → quarantine excluded), `:277` (movement recorded), `:394` (quarantine); `dealers.ts` (receipt into quarantine) | `mod-03-inventory.test.ts:150,156,173`; `dealer-completion.test.ts:80,83,96,119,154` | REAL — incl. "quarantine never reduces saleable stock from another batch" | cloud-CAS movement audit not evidenced (out of local scope) |
| ARC-01 | partial | `scripts/maintenance/check-boundaries.ts:89`; `src/features/platform/routes.ts:54` | `dependency-boundaries.test.ts`; `import-integrity.test.ts:11` | REAL (layers 1–2) | **cycle detection not implemented** despite the doc comment at `check-boundaries.ts:88`; no forbidden-import negative fixture; no "client bundle contains no server secret" test; `reports/implementation/evidence/ARC-01.json:8` overclaims |
| REL-01 | partial | `vercel.json`; `api/platform.ts:28`; `package.json:9`; `server/runtime-config.ts`; `server/runtime-identity.ts` | `vercel-entry.test.ts:5,13,19,23,26,30`; `runtime-config.test.ts`; `runtime-identity.test.ts` | REAL (fail-closed config) | `reports/implementation/evidence/REL-01.json:9` cites `testPath: "package.json"` (a build manifest, not a test) and reports `environment: "local_build"` as `verified_local`; no preview/production artifact ID, no deployment receipt, no browser/API evidence (blueprint:391) |

### EXT — 7

| ID | Status | Source | Test | Gap |
|---|---|---|---|---|
| EXT-01 Inspector local | not_run | NONE | NONE | no inspector, no thread/tool/state/latency view, no redaction, no dev-only gating |
| EXT-02 User Memories | not_run | NONE | NONE | no preference store, no provenance/permission/retention/delete; Intelligence account+terms gate external |
| EXT-03 Analytics/collector | partial | `src/services/supabaseAgentPerformance.ts:8,48` | NONE | 723-line file seeded with a hardcoded 40-row mock dataset (`:48` `INITIAL_PERFORMANCE_SEED`); schema stores `user_query` (`:17`) and `tokens_used` (`:15`) — both prohibited by EXT-03's allowlist; no opt-out, no delete, no allowlist |
| EXT-04 Slack/Teams Channels | not_run | NONE | NONE | no adapter, no synthetic contract test; account/provider/signature/permission gate external |
| EXT-05 WebMCP own-app | not_run | NONE | NONE | no browser support probe, no grants, no typed `unavailable` |
| EXT-06 Voice | partial | `src/features/pet/speechService.ts`; `PetCompanion.tsx` | NONE | browser Web Speech only; no gesture/mic-permission indicator, no shared controller with the copilot thread, no privacy/processing-location disclosure |
| EXT-07 Attachments/multimodal | partial | `server/platform/evidenceFiles.ts`; `app.ts:365,407`; `shared/upload-limits.ts` | `upload-limits.test.ts`; `upload-revocation.test.ts`; `remote-evidence.test.ts` | upload side real (size/MIME/hash/permission/revocation); missing attachment *reference* in the copilot surface, no vision inference, no qualified-model gate |

---

## Tally

| Status | Count |
|---|---|
| `implemented_verified` (core) | **5** — FIN-01, STK-01, REF-02, LOY-01, OPS-01 (+ SEC-02 conditional on D-19) |
| `partial` | **62** |
| `not_run` | **18** — CPK-03, CPK-10, ADV-02, ADV-04, ADV-06, ADV-09, ADV-10, ADV-11, ADV-12, ADV-14, ADV-15, ADV-16, ADV-17, ADV-18, ADV-19, ADV-22, ADV-24, ADV-26, ADV-28, AI-02, REF-01, EXT-01, EXT-02, EXT-04, EXT-05 (25 distinct across core+EXT) |
| `blocked_external` as sole blocker | **0** — the two genuine external gates (Billplz sandbox for PAY-01/02; CopilotKit Intelligence for CPK-02/03, EXT-02/04) are each accompanied by internal, non-external gaps, so `blocked_external` would be the wrong label |

**Register claim vs source:** register says 60 `verified_local`; source supports **5**
core rows at `implemented_verified`. The register overstates by roughly 55 rows.

---

## Defects observed in source (36)

### S1 — Fabricated financial / domain values presented as canonical

- **D-01** `server/platform/adkAgent.ts:253-286` — `contributionSen: 2800`,
  `contributionMarginPct: 28.5`, `status:'PASSED'` hardcoded for **any** message
  containing `margin`/`kempen`/`diskaun`, with `provenance.source:'canonical_evaluator'`.
  No evaluator ran. Violates blueprint:300. `copilot-adk.test.ts:298` asserts
  `toBe(28.5)` — the test encodes the constant as expected behaviour.
- **D-02** `server/platform/adkAgent.ts:287-308` — `orderId:'ord-2026-1019-01'`,
  `trackingTokenRedactedHash:'hash_redacted_9f82ab7e'`, `expiryDaysRemaining:14`
  hardcoded with `provenance.source:'database'`. No database read.
- **D-03** `server/platform/adkAgent.ts:310-318` — Operations brief metric
  `'Pesanan Menunggu'='14'` hardcoded; `'Status AI'='Zero-Cost Active'`.
- **D-04** `server/platform/domainTools.ts` — **18 of 21** mounted tools return
  literals: `:247-251` (3 SKUs), `:328-331` (warehouses), `:353-354` (allocation),
  `:381-385` (`totalSen: 3100`), `:413` (14/5), `:437-441` (manifest),
  `:466-470` (tracking), `:500-505` (ledger `1425000/1390000/35000`),
  `:560-562` (commission `18500`), `:591` (`contraLedgerBalanced:true`),
  `:615` (tier Emas/420 pts), `:662-664` (1250 sent / 78.4% read rate),
  `:686-696` (`margin = 28.5`), `:727-730` (3× `PASS`), `:760`
  (`casStatus:'VERIFIED_CLEAN'`), `:784` (`28`/`94500`/`3375`), `:810-812`
  (14.2h/0.4%/31.8%). Only `:252-266` binds `ctx.commerce.catalogue()`.
- **D-05** `server/platform/mcp/operationsBrief.ts:34-117` — MCP App has **no store
  dependency at all**. Metrics `28 / 94500 / 8 / 0 / 1` and the highlight
  *"1 tindakan HITL menunggu keputusan Founder: Refund bagi botol pecah ORD-9988"*
  (`:88`) are constants stamped `provenance.source:'local_authoritative'`. A
  fictional order id is presented as a live HITL queue item.
- **D-06** `server/agents/tools/definitions.ts:57-64` — `diagnose_checkout` returns
  unconditional `valid:true`, `requiresReprice:false`, `itemCount`.
- **D-07** `server/agents/tools/definitions.ts:80-87` — `preview_refund` returns
  `status:'simulated_ok'`, `estimatedDriftSen:0`.
- **D-08** `server/agents/tools/definitions.ts:105,111,163` — durable-sounding
  ids from `Date.now()`; `execute_approved_action` returns `status:'confirmed'`
  **without writing to any store** — a receipt no server lookup can resolve.
- **D-09** `server/agents/copilot/runtime.ts:80-94` — echo implementation; the
  router it uses has no model-calling method at all.
- **D-10** `server/platform/freeModelRouter.ts:292-300` — fallback returns
  `providerId: active.id` and `model: active.defaultModel` while serving a locally
  generated string → `local_rules` masquerades as `live_model` (blueprint:293).
- **D-11** `server/platform/freeModelRouter.ts:307-319` — fallback prose claims a
  complaint "telah direkodkan" and quarantine "telah dimulakan" with no receipt;
  hardcodes 28.5% at `:313`.

### S2 — Fabricated external-provider effects

- **D-12** `server/automation/runtimeTransports.ts:99-107` — `LocalPostizTransport.publish`
  returns `status:'published'` unconditionally with a fake `https://postiz.local/...`
  URL and `reasonCode:'POSTIZ_PUBLISHED'`. No network, no Postiz.
- **D-13** `server/automation/runtimeTransports.ts:110-120` — `reconcile` also always
  returns `'published'`/`'RECONCILED'`.
- **D-14** `server/automation/runtimeTransports.ts:140-153` — `LocalWhatsAppTransport.sendTemplate`
  returns `status:'sent'` with a fabricated `messageId`.
- **D-15** `server/automation/runtimeTransports.ts:36-44` — `LocalHermesTransport.run`
  computes a `summary` and **never returns it**; returns `artifactIds` with no
  artifact persisted.
- **D-16** `server/platform/app.ts:169` — `GET /quotas` returns
  `{observedUnits:null, limitUnits:null, available:false}` for all four providers.

### S3 — Missing route wiring / dead code

- **D-17** `api/platform/copilot/v2.ts:8-11` + `api/platform/[...path].ts` + `vercel.json`
  — a static Vercel function shadows the catch-all. `GET` → **405**;
  `POST` → body without a boolean `ok`, so `src/features/platform/client.ts:51`
  throws `INVALID_RESPONSE`. Chat never enables in production. (Derive from
  Vercel filesystem routing; confirm against the live deployment.)
- **D-18** `server/agents/tools/registry.ts` — `ToolRegistry` has **no production
  importer** (only tests). 0 of 32 ADV capabilities are reachable at runtime.
- **D-19** `server/platform/app.ts:127` — dealer-terms gate checks `dealerOrgId`
  presence but **not `m.status==='active'`** (cf. `domainTools.ts:34`,
  `commerce.ts:391`). A revoked membership still grants the read.
- **D-20** `src/features/copilot/tool-rendering/ToolStatusView.tsx:45`,
  `state-rendering/ScopedStateView.tsx:158`, `mcp-apps/OperationsBriefApp.tsx:114`,
  `interactive/MarginSimulatorForm.tsx:76`, `components/frontendToolAdapters.ts:156`
  — **five of six client surfaces exist only in tests.** Only `A2UIFixedRenderer`
  is mounted (`CopilotWorkspace.tsx:4,238`).
- **D-21** `server/platform/commerce.ts:288` — customer-initiated cancellation
  branch has an **empty body**; the cancellation silently does nothing.
- **D-22** `agents/google-adk/**` — no `*.ts` file references port 8030 or
  `agents/`. The Python service is fully orphaned.

### S4 — Self-referential / vacuous tests

- **D-23** `tests/platform/adk-specialists.test.ts:39-78` — imports **nothing**
  from `agents/google-adk`; builds `mockJevA2UI`/`mockCommerceA2UI` inside the
  test and asserts its own literals. Zero coverage of the real specialists.
- **D-24** `tests/platform/domain-tools.test.ts:50` — missing `await`; the
  promise is never awaited, so the authorization assertion never executes and the
  test cannot fail on a regression.
- **D-25** `tests/platform/domain-tools.test.ts:8-16,110-116` — context passes
  `store: {} as any` and no `commerce`, so the hardcoded fallbacks are returned
  and then asserted.
- **D-26** `tests/platform/mcp-brief.test.ts:11-13,26` — asserts the
  implementation's own constants.
- **D-27** `tests/platform/copilot-adk.test.ts:34-39` — asserts `providerId==='nvidia'`
  for a fallback that made no provider call.
- **D-28** `tests/platform/advanced-tools-registry.test.ts:49-65` — asserts
  `status==='confirmed'` on a receipt that was never persisted, using ids
  (`prop-100`, `appr-200`) the implementation never looks up.

### S5 — Documentation / evidence claims unsupported by source

- **D-29** `docs/prompts/ACCEPTANCE-REGISTER.md:5,11-20,26-32,53-84,99-108` —
  claims 60/78 `verified_local`.
- **D-30** `reports/implementation/evidence/ARC-01.json:8` — claims "boundary
  import & cycle rejection"; no cycle detection exists.
- **D-31** `reports/implementation/evidence/REL-01.json:8-12` — `testPath: "package.json"`.
- **D-32** `reports/implementation/evidence/CPK-01.json:8-19` — cites the **echo
  runtime** as CPK-01 evidence.
- **D-33** `server/platform/app.ts:191-201` — `GET /copilot/v2` returns
  `runtime:'copilotkit-v2-agui'`, `version:'2.0.0'`, `schema:'a2ui.v1'` — a
  protocol claim for a protocol that is not implemented.
- **D-34** `server/platform/adkAgent.ts:5-11` — header claims "Automatic Learning
  (Memory & Episodic Invariant Records)"; no learning code exists.
- **D-35** `server/agents/tools/definitions.ts:2` — "32 Advanced Tools Definitions";
  6 registered.
- **D-36** `server/platform/app.ts:192,197-199` — the `/copilot/v2` descriptor is
  served without the `auth.operational` check the sibling `/copilot/providers`
  route applies at `:189`.

---

## What genuinely exists and is substantial (do not disturb)

- **`server/platform/**`** — 30+ domain modules, genuinely domain-bound: `app.ts`
  (~150 routes, auth/CSRF/rate-limit/atomicity), `store.ts` (SQLite + `atomic()` +
  audit + dedupe), `auth.ts` (sessions/CSRF/roles/grants/memberships), `commerce.ts`
  (catalogue versioning, idempotency with `input_hash` conflict detection,
  reservations, FEFO consume, referral validation, tracking tokens), `loyalty.ts`
  (append-only ledger, atomic redemption, expiry, reversal), `dealers.ts`,
  `marketing.ts`, `operations.ts`, `operationalAmendments.ts`, `work.ts`,
  `flows.ts`, `reports.ts`, `jev/` (7 test files), `evidenceFiles.ts`, `backup.ts`,
  `backupScheduler.ts`, `paymentReconciliation.ts`, `marginGuardian.ts`,
  `mcp/operationsBrief.ts` (fixture-only), `domainTools.ts` (21 tools, mostly
  fixture), `adkAgent.ts` (keyword router, fixture cards), `freeModelRouter.ts`
  (real fetch + failover, mislabelled fallback), `social.ts`, `googleIdentity.ts`,
  `hostedResponse.ts`, `legacyPilots.ts`, `onboarding.ts`, `migration/`,
  `supabasePersistence.ts`, `whatsapp.ts`, `runtimeControls.ts`,
  `founder-intelligence.ts`, `assetBundle.ts`.
- **`server/automation/**`** — `automation.ts`, `definitions.ts`, `jobs.ts`
  (lease/claim/execute), `adapters.ts`, `runtimeTransports.ts` (synthetic),
  `sourcePolicy.ts` (SSRF allowlist), `cloudWorker.ts`.
- **`tests/**`** — ~123 files: `tests/platform/**` 86, `tests/jev/**` 7,
  `tests/copilot/**` 9, `tests/frontend/**` 13, `tests/e2e/**` 16 specs / 46 tests
  (landing, nav a11y, commerce, dealer, marketing, founder/shift, offline privacy
  — **zero Copilot/AG-UI/MCP coverage**), `tests/architecture/**` 1.
- **`src/features/**`** — 74 files; `src/services/**` 31, incl. real Supabase and
  Google Workspace clients.
