# Orchestrator Master Execution Plan — ABANGCOLEK Platform v2.4

## Objective
Pembangunan dan integrasi autonomi menyeluruh platform ABANGCOLEK v2.4 berlandaskan Master Blueprint v2.4, ADR-0003, docs/prompts/CONTINUE-AGY-20261020.md, dan PROJECT-CHECKLIST.md untuk operasi perniagaan Liurleleh House Malaysia (Megat Shaifulreza / Epull).

## Phase 0: Survey & Scope Mapping
- Spawn 3 Explorers / Spec Miners:
  1. `spec_miner_1`: Spec Miner on Master Blueprint, ADR-0003, docs/prompts/CONTINUE-AGY-20261020.md, PROJECT-CHECKLIST.md, ACCEPTANCE-REGISTER.md.
  2. `explorer_codebase`: Codebase & Architecture Explorer (server/modules/, server/application/, server/agents/, existing tests, file tree).
  3. `explorer_finance_hitl`: Financial Integrity (FIN-01, Sen arithmetic, BigInt, Billplz refund) & HITL / CPK-06 lifecycle & CopilotKit bridge requirements.
- Aggregate findings into `PROJECT.md` (Feature Inventory, Architecture, Milestones, Interface Contracts, Code Layout).

## Phase 1: Dual Track Decomposition
- Implementation Track:
  - M1: Fasa 03A Integriti Kewangan, Lejar, dan Kitaran Hayat HITL (Rules Own The Money, FIN-01, BigInt, CPK-06, Billplz PAY-01..03)
  - M2: Fasa 01 Modular Monolith & Safe Media Asset Relocation
  - M3: Fasa 02 CopilotKit Runtime Fetch v2 & Python Google ADK Free Bridge
  - M4: Fasa 03B Registry of 32 Tools & 10 Canonical Modules (AT-0..3, PD-01, SEC-02)
  - M5: Fasa 04 7 Generative UI Approaches & A2UI Fixed Schema Cards
- E2E Testing Track:
  - Spawn E2E Testing Orchestrator (or test writers) for opaque-box Tier 1-4 test suites derived from ORIGINAL_REQUEST.md.
  - Generates `TEST_INFRA.md` and signals `TEST_READY.md`.

## Phase 2: Implementation & Verification Loop
- For each milestone:
  - Spawn Explorer(s) -> Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor -> Gate check (`GATE_STATUS.md`).
  - Zero tolerance on integrity violations.

## Phase 3: Final Milestone — E2E Test Suite Pass (100%) & Coverage Hardening
- Pass 100% of domain tests and E2E tests:
  - `bun test tests/platform/financial-integrity-v24.test.ts`
  - `bun test tests/platform/hitl-execution-v24.test.ts`
  - `bun test tests/platform/growth-margin.test.ts`
- Lint & Typecheck clean: `bun run lint` (exit 0)
- Production build: `bun run build` (exit 0)
- Phase 2 Adversarial Coverage Hardening (Tier 5): Challenger gap analysis & test writer loop.

## Phase 4: Atomic Sign-off & Handover
- Atomic update of `PROJECT-CHECKLIST.md` and `ACCEPTANCE-REGISTER.md` with authentic test receipts.
- Produce comprehensive handoff report to parent agent.
