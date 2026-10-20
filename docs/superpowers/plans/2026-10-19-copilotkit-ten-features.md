# CopilotKit Ten Features Implementation Plan

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. This document is a plan, not authorization to install, deploy or spend.

**Goal:** Integrate and verify all ten named CopilotKit capabilities for real ABANGCOLEK workflows, with explicit Intelligence activation gates.

**Architecture:** Retain React/Vite and canonical Bun commerce. Add a TypeScript CopilotRuntime connected by HttpAgent/AG-UI to a separate Google ADK Python service. Domain mutations execute only through authenticated canonical API requests with durable receipts; agent sessions and Intelligence history are separate from commerce authority.

**Tech Stack:** Existing React/TypeScript/Bun, proposed CopilotKit v2/AG-UI, Python Google ADK + ag-ui-adk/FastAPI. Pin compatible versions during Task 0; no unverified package versions or provider models are prescribed here.

**Spec:** [Ten-feature design](../../design/copilotkit-ten-features.md); [master blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md); [repository structure](../../design/repository-structure.md).

**Status:** Target plan under blueprint v2.3. [ADR-0003](../../decisions/0003-blueprint-v23-execution-contract.md) fixes implementation decisions; [canonical execution prompt](../../prompts/IMPLEMENT-ABANGCOLEK.md) resolves sequencing and capability fallbacks. No implementation tasks have been executed through this document. Intelligence cost/availability and production Python hosting remain external gates.

## Global Constraints

- No new paid inference/subscriptions without explicit authorization. No silent paid failover.
- Preserve existing worktree changes. Do not reset, clean, reinstall or scaffold over the application.
- Do not combine the broad repository restructure with this feature integration. New files below use proposed target folders; adapt imports to verified existing paths.
- Keep canonical role/ownership, CSRF, request limits, revision/idempotency, audit and CAS commit semantics.
- No raw server keys in client/Python agent tools. No fabricated operational values or provider attribution.
- BM/English visible output; mobile/keyboard accessibility; Pet remains optional.
- All ten means all ten verified. An Intelligence blocker is reported explicitly, not replaced by a similarly named custom feature.

## Review Focus

1. Streaming continues after request-scoped SQLite closes: agent tools must use fresh canonical requests, never a retained temporary store.
2. User/role/session switches or stale approvals: revalidate identity and reset scoped state; replay cannot repeat commands.
3. Provider quota/timeouts/tool-call incompatibility: bounded cancellation/failover and accurate unavailable/local fallback.
4. Model-generated UI/state/tool args: schema/size limits and deny client assertions of price, role or paid state.
5. Intelligence unavailable, service restart or agent quota: honest capability status, retained receipts and no claims of server-crash recovery.

## Ownership and proposed files

| Area | Proposed files / existing integration points |
|---|---|
| Contracts | `shared/copilot-contracts.ts` initially; future relocation follows structure manifest |
| Runtime/security | `server/agents/copilot/runtime.ts`, `server/agents/copilot/identity.ts`, `server/agents/tools/registry.ts`, `server/agents/providers/policy.ts` |
| Domain bridge | `server/platform/app.ts`, `server/platform/auth.ts`, `server/agents/approvals/service.ts`; reuse domain services |
| Python service | `agents/google-adk/pyproject.toml`, lockfile, `app.py`, `agent.py`, `tools.py`, `sessions.py`, `subagents.py`, `tests/` |
| Frontend | `src/features/copilot/provider.tsx`, `chat.tsx`, `cards/`, `declarative/`, `frontend-tools.ts`, `state.ts`; integrate existing `CopilotWorkspace.tsx` and `PetCompanion.tsx` |
| Intelligence | `server/agents/copilot/intelligence.ts`, `agents/google-adk/skills.py`, operations/evidence documentation |
| Tests | `tests/platform/copilot-*.test.ts`, `tests/e2e/copilot-*.spec.ts`, Python integration tests |

Separate `agents/google-adk/` exists because Python is an independently running service, unlike TypeScript server agents. Before extraction, record this addition in the structure design/ADR; do not copy Python implementations into `server/` as a second agent authority. Individual worker names/file ownership are assigned at execution time. Workers must accommodate others' edits.

### Task 0 — Baseline, versions and decision gates

**Files:** Existing package/lock/config, `docs/decisions/` new numbered ADR after checking current sequence, evidence under `reports/`.
**Output:** Version compatibility matrix, baseline results, chosen service/session hosting and cost/identity decisions.

- [ ] Record HEAD plus worktree manifest and existing callers of legacy/current agent.
- [ ] Run baseline `bun run lint`, `bun run build`, `bun run test:platform`; record pre-existing failures separately.
- [ ] Verify supported CopilotKit/AG-UI/Python package versions and lock strategy in official docs/registries; verify actual free-provider tool-call capability.
- [ ] Record Python local/production lifecycle, session persistence, runtime-to-agent identity contract and Intelligence terms/cost/data gates.
- [ ] Assign file ownership and reviewers. Do not claim architecture ready if unresolved hosting blocks deployment.

### Task 1 — Protocol, identity and tools foundation

**Files:** Contracts, runtime/identity, registry, Python app/agent/tools; existing app/auth adapters; `tests/platform/copilot-auth.test.ts`, Python `tests/test_bridge.py`.
**Interface:** Verified principal and scoped grant -> run context -> schema-validated query/command; canonical receipt returned after commit.

- [ ] Write failing tests: forged user/workspace, expired/revoked grant, invalid history role, arbitrary tool name and expired browser session.
- [ ] Confirm failures, then add minimal official runtime/ADK bridge behind a default-off feature flag with pinned dependencies.
- [ ] Verify `/info` and genuine AG-UI lifecycle with a deterministic test model; inspect tool-call events, not split completed text.
- [ ] Add shared abort/deadline/token/concurrency budget and one approved model adapter; no calls unless configured/allowed.
- [ ] Test tools after runtime HTTP handler returns and during CAS conflict; no retained request-scoped SQLite access or pre-commit success.
- [ ] Run TS/Python tests and independent code/security review; fix findings before commit.

### Task 2 — Chat and Headless UI (CPK-01, CPK-09)

**Files:** Provider/chat, existing Copilot workspace, Pet; `tests/e2e/copilot-chat.spec.ts` and provider failure tests.
**Interface:** Signed-in identity + stable thread -> one run; both surfaces observe the same run state.

- [ ] Write failing tests for scoped conversation, role switch, cancel, timeout and duplicate send.
- [ ] Wire provider to the existing React tree; build one accessible BM/English headless surface and optional Pet entry.
- [ ] Mark real provider/local rules/unavailable accurately. Remove fixed financial claims from current fallback path.
- [ ] Test mobile, keyboard, reconnect messaging, surface switch without duplicate run and denied cross-user history.
- [ ] Verify one real permitted model response separately from mock-based test results; review and commit coherent change.

### Task 3 — Frontend tools and Shared state (CPK-07, CPK-08)

**Files:** `frontend-tools.ts`, `state.ts`, existing router/client; `tests/platform/copilot-state.test.ts`, E2E tools/state.
**Interface:** Versioned UI-only context; validated route/filter/draft actions; server refresh owns business truth.

- [ ] Write failing tests for forbidden route/URL, malicious args, spoofed payment/role, stale revision and switch-thread leakage.
- [ ] Add allowlisted navigate/select/filter/draft tools with AGUIToolset bridge; do not expose arbitrary eval/fetch or mutations.
- [ ] Publish minimal context; synchronize allowed fields and clear on user/workspace/thread change.
- [ ] Verify refresh after canonical writes, and simultaneous tabs cannot overwrite authority through shared state.
- [ ] Run focused tests, review and commit.

### Task 4 — Generative UI and Declarative UI (CPK-04, CPK-05)

**Files:** Cards/declarative renderer and contracts; existing JEV/margin query adapters; schema and E2E UI tests.
**Interface:** Canonical typed tool result -> fixed card; validated declarative document -> approved component composition.

- [ ] Write failing tests for missing provenance, invented amount/confidence, unknown component, event/action injection and oversized/deep document.
- [ ] Render order/tracking, margin and JEV LOCAL_RULES cards with source/revision, error and insufficient-data states.
- [ ] Verify the fixed A2UI renderer/protocol pins against installed source; implement the allowlisted component catalog using existing UI primitives. Architecture selection is closed by ADR-0003.
- [ ] Use A2UI Fixed Schema as fixed by ADR-0003. Implement all [GUI-01..07](../../design/copilot-generative-ui-seven-approaches.md), including the first-party read-only MCP App; do not choose another protocol or enable dynamic secondary-model generation.
- [ ] Keep CPK-04 and CPK-05 acceptance separate; arbitrary model HTML/JavaScript is never executed.
- [ ] Compare card amounts with canonical response, test accessibility/reduced motion, review and commit.

### Task 5 — Human-in-the-loop execution (CPK-06)

**Files:** Approval service, tool registry, existing app/domain proposal adapters, frontend approval card; TS/Python and `copilot-approval.spec.ts`.
**Interface:** Proposal with payload hash/revision/expiry -> authorized decision -> separately revalidated canonical command -> durable receipt.

- [ ] Write failing tests for reject/expire, non-founder approval, forged Boolean input, changed payload, revoked session, double-click and failed CAS.
- [ ] Integrate framework HITL presentation without treating browser response as server authorization.
- [ ] Start with campaign draft or reversible internal workflow; enable refund/quarantine only when their real domain contracts pass.
- [ ] Verify retry/replay cannot execute twice; unknown outcome requires reconciliation; payout is never inferred from approval status.
- [ ] Run domain regression tests plus integration/E2E; require security and code review before commit.

### Task 6 — Bounded sub-agents (CPK-10)

**Files:** Python subagents, tools/scopes and UI run trace; `tests/test_subagents.py`, scoped integration tests.
**Interface:** Parent context -> scoped delegated task -> typed result with provenance; child budget is charged against parent budget.

- [ ] Write failing tests for delegation loop, privilege escalation, quota exhaustion, sibling failure and cancellation.
- [ ] Add three specialists: Commerce Reader, QC/JEV Reviewer, Marketing Drafter. No autonomous financial executor.
- [ ] Initial limits: maximum delegation depth 1, specialist concurrency 2, total specialist calls 3 per run; tokens/deadline use one configured run budget.
- [ ] Show actual delegated start/end/outcome; no fabricated swarm progress. Child failure cannot fabricate a completed parent result.
- [ ] Verify all tools reauthorize independently; run tests, review and commit.

### Task 7 — Intelligence Streams pilot (CPK-02)

**Files:** Intelligence adapter, identity/thread mapping, thread UI and runbook; `tests/e2e/copilot-streams.spec.ts`.
**Gate:** Suitable Intelligence project/deployment with verified costs/terms, data/retention policy and configured server credentials. Otherwise `blocked_external`.

- [ ] Write failing tests for cross-user thread access, expired session, replayed mutation, reconnect and worker death.
- [ ] Connect only approved/redacted pilot runs; map user/thread/ADK session and retention/deletion explicitly.
- [ ] Verify page refresh and second-device replay restore tool cards without reexecuting commands.
- [ ] Distinguish browser disconnection from stop and server-crash recovery. Record what keeps running and what fails.
- [ ] Validate project access, export/deletion and cost controls; review before pilot activation.

### Task 8 — Reviewed Automatic Learning (CPK-03)

**Files:** Intelligence adapter and Python skill delivery; evaluation fixtures plus learning runbook/evidence.
**Gate:** Task 7, completed permitted runs, learning availability, reviewers and verified project threshold/schedule.

- [ ] Write failing tests for unpublished/foreign-project skill delivery, financial-policy override, PII retention and incompatible skill revision.
- [ ] Use one QC/complaint-triage container; ingest only completed eligible redacted workflows.
- [ ] Review supporting evidence, evaluate candidate skill, publish a version and pin delivery to the intended agent.
- [ ] Verify delivered skill changes SOP assistance only, respects grants and can roll back; rejection never changes behavior.
- [ ] Record actual scheduled learning output. No immediate-learning promise; if insufficient evidence or quota, keep pending.

### Task 9 — Full release verification

**Files:** Existing CI/deployment config only as needed, feature/capability register and `reports/` receipts.

- [ ] Run `bun run lint`, `bun run build`, `bun run test:platform` plus new Python tests using the recorded locked environment.
- [ ] Run focused Playwright journeys with actual backend/provider modes identified; no production writes without authorized test scope.
- [ ] Verify preview runtime/agent connectivity, cookies/CSRF, SSE, timeouts, route discovery and service restart behavior.
- [ ] Verify no secrets/PII/reasoning traces entered client bundles, telemetry or unintended Intelligence exports.
- [ ] Independently review security, dependencies and test coverage. Report coverage denominator; do not claim 80% without measurement.
- [ ] Validate rollback flags, retained receipts and session compatibility. Release founder-only pilot before broader roles.
- [ ] Record CPK-01..10 as verified-local/preview/production or blocked, with exact evidence. Never mark all ten complete while Intelligence gates remain open.

## Execution order and stopping rules

### Expansion — advanced tools and free-only model selection

Specifications: [Advanced Tool Registry](../../design/copilot-advanced-tools.md) and [free-only policy](../../research/2026-10-19-free-model-policy.md). These extend the same canonical tool architecture; do not create a parallel agent authority. All tasks below remain unexecuted.

- [ ] AT-0: extend contracts/registry with Q/S/D/C/X classifications, resource grants, provenance, availability, cache scope and shared run budgets; write negative tests before implementation.
- [ ] MOD-01..10: implement the ten-module coverage matrix in `docs/design/copilot-advanced-tools.md` as a separate acceptance dimension. Specify catalogue search/comparison/cart draft, scoped tracking, dealer settlement explanation, document summarization and automation proposal gaps before registry registration; classify specialization versus new capability and update counts honestly.
- [ ] For each module, verify one real scoped read/draft journey, missing/stale-data handling and cross-role denial. Record module availability independently from CPK-01..10; neither feature count nor tool count establishes complete app coverage.
- [ ] FM-0: inspect existing provider configuration without exposing keys. Verify exact free offering/account/terms and all request charges; disable incompatible/unverified providers. No inference until eligibility is confirmed.
- [ ] FM-1: build synthetic BM/English eval fixtures and provider/tool compatibility tests; evaluate eligible candidates, publish measured primary/fallback ranking and retain exact versions/receipts. No winner is assumed from model size.
- [ ] FM-2: test zero-fee allowlist, expired pricing, quota exhaustion, hidden auxiliary calls and overflow denial; re-evaluate when provider availability or terms change.
- [ ] AT-1: ship read/evaluation tools from the catalog after Task 1, including context bundles, margin/FEFO/day-close and citation support; integrate UI during Tasks 2–4.
- [ ] AT-2: add preview/draft workflows during Task 5, including stale-data handling and immutable proposal refs; keep financially incomplete domains disabled.
- [ ] AT-3: add bounded canonical execution/reconciliation/private export only after Task 5 tests; unknown external outcomes require reconciliation before retry.
- [ ] AT-4: integrate reviewed skill candidate evaluation only after Tasks 7–8 and Intelligence gates; local manual SOP review is labeled separately.
- [ ] Measure workflow duration, manual steps, p50/p95, grounded success, tool/model calls/tokens and denied/duplicate actions against baseline. Record evidence before efficiency claims.
- [ ] Independent domain/security review covers mixed-scope batches, revoked-cache access, stale previews, retries/CAS, pricing drift and role/subagent boundaries before activation.

Overall execution follows the canonical prompt: baseline -> integrity03A -> structure01 -> foundation02 -> tools03B -> UI/agents04 -> Intelligence05 -> release06. Within the Copilot-specific portion, Tasks0 -> 1 -> 2 -> 3/4 -> 5 -> 6 -> 7 -> 8 -> 9 remain dependencies, with integrity03A closed before Task1 activation. Tasks3/4 may run in parallel only after contracts/ownership are stable. Preserve a coherent test/review boundary per commit; do not push all dirty files.

If the same implementation approach fails twice, stop and research the cause. Provider/Intelligence costs or hosting unavailability are explicit gates; continue independent open-source work without claiming the missing capabilities. No time-to-completion guarantee is made before the compatibility and baseline gates are closed.
