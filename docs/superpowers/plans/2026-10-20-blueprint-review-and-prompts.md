# Blueprint v2.4 Review and Deterministic Prompt Pack

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` when collaboration is available, otherwise `executing-plans`. This plan is documentation-only; it does not authorize application, database or deployment changes.

**Goal:** Review the full blueprint and turn every implementation requirement into an explicit, testable instruction without delegating architecture or provider choices to the implementing agent.

**Architecture:** Preserve React/Vite + Bun, Google ADK Python through AG-UI, canonical domain commands and Supabase CAS. Keep design targets, observed source and verified runtime evidence separate.

**Tech Stack:** Existing repository, official CopilotKit/AG-UI/MCP/Google ADK documentation, npm/PyPI metadata, Markdown validation.

**Spec:** [Master blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md).

## Global Constraints

- Do not edit application code, install dependencies, call models, migrate databases, commit or deploy during this review.
- Preserve dirty files and the interrupted integration worktree; do not clean, reset or resume its application merge.
- Retain the fixed phase order `00 -> 03A -> 01 -> 02 -> 03B -> 04 -> 05 -> 06`.
- Cover 10 CPK, 7 GUI, 10 MOD, 32 ADV and 19 master acceptance IDs: 78 distinct requirements.
- Require free offering/account/privacy evidence before external inference; no paid fallback or hosted Intelligence activation.
- SDK metadata, passing synthetic tests and production verification are distinct evidence levels.

## Review Focus

- Fixed dependency pins can resolve yet require incompatible or missing peers.
- SSE/custom JSON and static HTML cards do not establish official framework/protocol integration.
- Approval receipts can claim success without canonical execution or durable commit.
- Rounded display values must not control financial eligibility.
- A tool/skill/plugin name is not proof it exists, is authenticated or grants production access.

## Tasks and Ownership

- [x] Task 1 — Read source, blueprint and phase contracts; record source/release/worktree identity and scope limitations. Owner: integrator.
- [x] Task 2 — Verify official docs and exact dependency registry metadata; record SDK/peer and hosting gates. Owner: integrator.
- [x] Task 3 — Review domain/finance/privacy/recovery gaps. Owner: domain reviewer; output `reports/blueprint-review-20261020-domain.md`.
- [x] Task 4 — Expand CPK/GUI/MOD/ADV design contracts. Owner: Copilot design worker; owns only the three `docs/design/copilot-*.md` contracts.
- [x] Task 5 — Update blueprint, ADR, execution contract, acceptance register, master prompt and all phase prompts. Owner: integrator.
- [x] Task 6 — Validate requirement counts, local links, Markdown fences, phase order, placeholder/decision language and diff scope. Owner: integrator.
- [x] Task 7 — Independent review, resolve findings, publish precise docs-only result and copy-ready starting prompt. Owner: integrator/reviewer.

## Completion Evidence

The final review report records documents changed, primary sources, actual validation results, unresolved account/business/hosting gates and the exact first implementation task. It must not claim application features became active through this documentation task.
