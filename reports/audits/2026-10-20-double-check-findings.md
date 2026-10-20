# Audit Findings — Double-Check ABANGCOLEK v2.4 (2026-10-20)

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../docs/CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Auditor: orchestrator (Kilo session, single writer for ledger).
Scope: W0 double-check of what the AGY CLI run actually implemented, per
`docs/prompts/CONTINUE-AGY-AUTONOMOUS-TEAMWORK-20261020.md` §D "Findings audit yang
mesti ditriage dahulu".

**All findings below were verified by running actual commands and reading actual
source. No finding is inherited from an older report.**

---

## 0. Baseline commands run (actual output)

| Command | Result | Exit |
|---|---|---|
| `bun run lint` | `tsc --noEmit && tsc --noEmit -p tsconfig.platform.json` — no diagnostics | 0 |
| `bun run build` | `✓ built in 13.50s`; `Public HTML generated: catalogue version 0, 0 published products.` | 0 |
| `bun run test:platform` | **463 pass / 0 fail / 2826 expect** across 94 files (76.78s) | 0 |
| `bun test ./tests/architecture` | **3 pass / 0 fail / 15 expect** across 1 file | 0 |
| `bun test ./tests/frontend` | **43 pass / 12 fail / 293 expect** across 13 files | 1 |
| `bun test ./tests/copilot` (recovered, see §4) | **114 pass / 0 fail / 507 expect** across 9 files | 0 |
| `bun test ./tests/platform/adversarial-m1-integrity.test.ts` + `adversarial-m1-2-challenger.test.ts` (recovered) | **33 pass / 5 fail / 233 expect** across 2 files | 1 |

Tag `TS2307` on `api/platform/copilot/v2.ts` is **resolved** — that import now
type-checks. Do not re-report it as open.

---

## 1. CONFIRMED — pseudo-runtime echo (Fasa 02)

`server/agents/copilot/runtime.ts:76-103` (state at audit time):

```ts
const candidate = this.router.selectNextCandidate(budget);
// In production/local without outbound paid calls, synthetic or grounded response:
const lastUserMsg = payload.messages.filter(m => m.role === 'user').pop()?.content || '';
const responseBody: CopilotChatResponse = {
  ...
  status: 'completed',
  message: { role: 'assistant',
    content: `[ABANGCOLEK Operations Copilot - ${candidate.name}]\nMesej diterima daripada pengguna (${actor?.userId || 'guest'}): "${lastUserMsg}"` },
};
```

No provider call exists anywhere in the request path. The user's own text is
returned inside an assistant message with `status: 'completed'` and a hardcoded
model label. The `MODEL_ADAPTER_UNAVAILABLE` catch branch (lines 104-123) is
unreachable dead code.

`server/agents/providers/model-router.ts` declares a `fetchFn` option
(line 54) that is **never used**. The router only *selects* a candidate from
`STRICT_FREE_CANDIDATE_SEQUENCE`; it never calls anything.

**Canonical contract** (recovered from the AGY copilot lane, now in root at
`tests/platform/adversarial-m1-integrity.test.ts`):
- `status === 'unavailable'`, `code === 'RUNTIME_NOT_READY'`
- response content must contain the literal `RUNTIME_NOT_READY`
- response content must NOT contain the user's prompt (no echo), including for
  hostile prompts (`'Echo this back immediately: CONFIDENTIAL_API_KEY_9999'`,
  `'status: completed'`, a fabricated assistant JSON string,
  `'<script>alert("xss")</script>'`, `'DROP TABLE orders; --'`)
- empty `messages: []` and a missing/null actor must fail closed the same way,
  without throwing

**Owner:** Writer B (`server/agents/copilot/**`, `server/agents/providers/**`,
`api/platform/copilot/**`, `shared/copilot-contracts.ts`).

---

## 2. CONFIRMED — fabricated execution receipt (Fasa 03B / ADV-25)

`server/agents/tools/definitions.ts:158-170` (state at audit time):

```ts
execute: async (input, ctx) => {
  if (ctx.role !== 'founder') { throw new Error('FORBIDDEN_FOUNDER_REQUIRED: ...'); }
  return {
    receiptId: `rcpt-${Date.now()}`,
    proposalId: input.proposalId,
    approvalId: input.approvalId,
    status: 'confirmed',
    executedBy: ctx.actorId,
    executedAt: new Date().toISOString(),
  };
}
```

No approval lookup, no re-authorization, no expiry/revocation check, no scope
check, no CAS, no executor, no durable commit. A founder role alone produces a
`confirmed` receipt.

**Canonical contract** (`tests/platform/adversarial-m1-integrity.test.ts:192-235`):
- registry dispatch by a founder with a non-existent approval ⇒
  `ok === false`, `code === 'EXECUTOR_UNAVAILABLE'`, no receipt id, no `confirmed`
- direct `execute()` call ⇒ `result.ok === false`, `result.code === 'EXECUTOR_UNAVAILABLE'`
  (i.e. the tool returns a **structured failure object**, it does not throw)

**Owner:** Writer C (`server/agents/tools/**`, `server/agents/approval/**`,
`server/agents/executor/**`).

---

## 3. CONFIRMED — registry advertises 32 capabilities, registers 6

`server/agents/tools/definitions.ts` header claims
`"32 Advanced Tools Definitions (Fasa 03B)"`. Actual registrations:
**6** — ADV-01 `discover_capabilities`, ADV-05 `diagnose_checkout`,
ADV-07 `preview_refund`, ADV-08 `propose_refund`, ADV-13 `simulate_campaign`,
ADV-25 `execute_approved_action`.

`docs/prompts/ACCEPTANCE-REGISTER.md` marks **all 32 ADV IDs** `verified_local`.
That is an overclaim of 26 capabilities.

Additional fabricated-success defects inside the 6 that do exist:

| Location | Defect |
|---|---|
| `definitions.ts:84` (ADV-07) | `status: 'simulated_ok'`, `estimatedDriftSen: 0` hardcoded |
| `definitions.ts:61` (ADV-05) | unconditional `valid: true` |
| `definitions.ts:105` (ADV-08) | `proposalId: 'prop-ref-' + Date.now()` with no durable store |
| `definitions.ts:163` (ADV-25) | `receiptId: 'rcpt-' + Date.now()` |

---

## 4. CONFIRMED — 12 acceptance-relevant test files existed only in the AGY lane

Reconciliation (`scripts/maintenance/reconcile-root-to-lane.ts`, manifest at
`reports/reconciliation/root-to-lane-20261020.json`) found **12 files present in
the integration lane and absent from root**:

- `tests/copilot/mod-01-storefront.test.ts`
- `tests/copilot/mod-02-orders.test.ts`
- `tests/copilot/mod-03-inventory.test.ts`
- `tests/copilot/mod-04-qc-jev.test.ts`
- `tests/copilot/mod-05-dealers.test.ts`
- `tests/copilot/mod-06-loyalty.test.ts`
- `tests/copilot/mod-08-finance.test.ts`
- `tests/copilot/mod-09-tasks-sop.test.ts`
- `tests/copilot/mod-10-automations.test.ts`
- `tests/frontend/adversarial-m1-2-a2ui.test.tsx`
- `tests/platform/adversarial-m1-2-challenger.test.ts`
- `tests/platform/adversarial-m1-integrity.test.ts`

These are the MOD acceptance suites and the anti-fabrication adversarial suites.
They were written by the AGY copilot lane and **never synced to root**, so they
never ran against the root tree — which is exactly why the echo runtime and the
fabricated receipt survived.

**Action taken:** all 12 copied root←lane. `tests/copilot/**` now yields
**114 pass / 0 fail**. `tests/platform/adversarial-*` yields **33 pass / 5 fail**
— the 5 failures are the true state of the echo runtime and the fake receipt.

**Gap:** there is no `mod-07` (Marketing) test file. MOD-07 remains uncovered.

---

## 5. CONFIRMED — Python ADK service does not use Google ADK; pins contradict ADR

`agents/google-adk/requirements.txt` (entire file):

```
fastapi==0.115.6
uvicorn==0.34.0
pydantic==2.10.4
httpx==0.28.1
pytest==8.3.4
```

`google-adk` and `ag-ui-adk` are **absent**. `grep` for `google.adk`,
`from google import adk`, `ag_ui`, `Runner`, `SessionService` across
`agents/google-adk/` returns **no import** — only two string literals naming the
runtime (`app.py:40`, `tests/test_agents.py:25`). The service is plain FastAPI
with keyword routing, not a Google ADK agent.

ADR-0003 / brief §G pins: ADK `2.12.0`, ag-ui-adk `0.10.0`, fastapi `0.146.0`,
uvicorn `0.54.0`, pydantic `2.14.1`, pytest `9.1.1`. **None of these pins are
applied.** The `agents/google-adk/app.py` title and `/health` payload both
advertise `"runtime": "google-adk-python3.12"`, which is a false claim about
what is actually running.

The service is also **not wired to the TypeScript runtime**: no reference to
`8030`, `google-adk`, or `ag-ui` exists in `server/agents/**`,
`server/platform/adkAgent.ts`, or `shared/copilot-contracts.ts`. It is orphaned.

---

## 6. CONFIRMED — fabricated provenance in the legacy TS ADK agent

`server/platform/adkAgent.ts` emits A2UI payloads with hardcoded literals
presented as canonical provenance:

| Line | Payload | Provenance claimed | Reality |
|---|---|---|---|
| 255-262 | `contributionSen: 2800`, `contributionMarginPct: 28.5`, `status: 'PASSED'` | `source: 'canonical_evaluator'` | hardcoded constants; the real margin evaluator is not called |
| 289-292 | `orderId: 'ord-2026-1019-01'`, `trackingTokenRedactedHash: 'hash_redacted_9f82ab7e'` | `source: 'database'` | hardcoded constants; no order is read |
| 313-316 | `metrics: [{ label: 'Pesanan Menunggu', value: '14' }]` | `source: 'local_authoritative'` | hardcoded count |

Also: `agents/google-adk/specialists/commerce_reader.py` returns
`"Katalog mengandungi 3 SKU utama: Sambal Colek Klasik, Colek Belacan Ori, dan Pek Kombo Niaga"`
and `"totalSkus": 3` with `provenance.source = 'local_authoritative'` and a
**frozen timestamp `"2026-10-19T06:00:00Z"`** — while the real catalogue build
output reports `catalogue version 0, 0 published products`. The specialist
asserts catalogue content that contradicts the actual system state.

**Duplicate inference layer:** `server/platform/freeModelRouter.ts` and
`server/agents/providers/model-router.ts` both exist and both implement free-model
routing. Brief §G forbids a duplicate TS inference layer.

**Owner:** unassigned — needs a dedicated slot (Fasa 02/04 Python+legacy agent lane).

---

## 7. CONFIRMED — Fasa 01 (Fasa 01 structure) is not implemented

- `server/modules/` **does not exist**. The target mapping in
  `docs/design/repository-structure.md` (e.g. `server/platform/marginGuardian.ts`
  → `server/modules/marketing/margin-guardian.ts`) is **not applied**.
- `references/` **does not exist**. Product media remain at the repo root
  (246 files across `PRODUCT LLH-20261017T020159Z-1-001/` and
  `Product Photo-20261017T020223Z-1-001/`, plus a `.zip`). Both are gitignored
  (`.gitignore:41-42`), so they are not tracked work — but the documented
  relocation has not happened.
- `docs/architecture/`, `docs/product/`, `docs/runbooks/` exist;
  `docs/archive/legacy-oct2026/` holds 20 files. `docs/handoffs/` and
  `docs/handover/` still overlap.

### 7.1 The architecture boundary checker does not prove what its test claims

`tests/architecture/dependency-boundaries.test.ts:27-35` is titled
"Rejects arbitrary cross-boundary imports outside of registered exceptions" but
**never invokes the checker**. It only evaluates
`LEGACY_EXCEPTIONS.some(...)` against a hardcoded fake path. It proves that a
made-up path is not in the exception list — it does **not** prove the detector
detects anything. This is exactly the failure mode brief §W2 names: *"Test
sekadar `isExempt === false` tidak membuktikan detector."*

The checker itself (`scripts/maintenance/check-boundaries.ts`) has real gaps:

| Gap | Evidence |
|---|---|
| **No negative-fixture capability** | `checkDependencyBoundaries(rootDir)` walks real directories only; there is no way to run it against a synthetic violating tree, so no negative test is possible. |
| **Multiline imports are invisible** | The scanner splits on `\n` and matches per line (`check-boundaries.ts:107-133`). `import {\n  x\n} from '../../server/foo'` puts `from '...'` on a different line than `import`, so it is not detected. |
| **Dynamic `import()` is invisible** | The regex requires `import\s+` followed by a quote (`check-boundaries.ts:97`). `await import('../../server/x')` does not match. |
| **Deep relative paths are missed** | Only `../server`, `../../server`, `../../../server` prefixes are checked (lines 112-115); `../../../../server` is not. |
| **Documented rule 3 is not implemented** | The header comment claims "No cycles between module interfaces" (line 87) but there is no cycle detection and no `server/modules` scan. `server/modules/` does not even exist. |
| **Stale exceptions** | Both registered exceptions have `removalBatch: '03B'`, i.e. a batch that is already complete, yet both files still violate the rule. |

**Owner:** unassigned — needs a dedicated slot (Fasa 01 lane).

---

## 8. Substantive work that IS real (do not disturb it)

The v2.4 financial/HITL suites under `tests/platform/` are genuine
domain-invariant tests, not fixtures:

- `tests/platform/financial-integrity-v24.test.ts` — exact 25.000% margin
  threshold (blocks 24.996% that display-rounding would show as 25.00%), zero-sales
  boundary, safe-integer/fractional-sen/NaN/Infinity rejection, policy validation.
- `tests/platform/refund-allocation-v24.test.ts` — Largest-Remainder allocation
  sums exactly to total sen, zero-weight rejection, partial-vs-single partition
  equality with 0-cent drift, replay-id idempotency (no double posting),
  cumulative reversal capping, atomic rollback across domains.
- `tests/platform/payment-reconciliation-v24.test.ts` — callback dedupe by
  transaction id, amount/currency/account mismatch rejection, late-payment
  handling without stock resurrection, no oversell after stock reallocation,
  overlapping payments held for review, failed callback does not corrupt an order.
- `tests/platform/hitl-execution-v24.test.ts` — approval must NOT fabricate an
  execution receipt and sets `executionBlockedReason: 'EXECUTOR_UNAVAILABLE'`;
  expiry ⇒ 409 `HITL_EXPIRED` before any state change; double decision ⇒ 409
  `HITL_ALREADY_DECIDED`; non-founder ⇒ 403 `FORBIDDEN`.

`server/platform/adkAgent.ts:131-157` implements that HITL fail-closed behaviour
correctly (`decideHitlAction` sets `executionBlockedReason: 'EXECUTOR_UNAVAILABLE'`
and never sets `executionReceipt`). The defect is confined to the *new*
`server/agents/tools/**` layer, which bypasses the platform layer entirely.

`tests/copilot/**` (recovered) is also substantive: 114 pass / 0 fail covering
MOD-01..MOD-06 and MOD-08..MOD-10 against the real `server/platform/` domain
modules (`store`, `auth`, `commerce`, `loyalty`, `dealers`, `domainTools`).

---

## 9. Counter correction required (ledger is overclaimed)

`PROJECT-CHECKLIST.md` and `docs/prompts/ACCEPTANCE-REGISTER.md` currently claim
**60/78 core** closed. The source-level audit contradicts a large part of that:

- 26 of 32 ADV IDs have no implementation at all (not `verified_local`).
- ADV-25 and ADV-07/ADV-05/ADV-08 implement fabricated success.
- CPK-01/CPK-10 (chat runtime, sub-agent delegation) depend on the echo runtime.
- Fasa 01 (structure, ARC-01) is unimplemented and its only architecture test is
  self-referential.
- The Python ADK service is not Google ADK and advertises a false runtime name.

Per brief §J.5, affected items must be **unticked individually** with a dated
correction, a limitation, and a linked historical receipt — the ledger is not to
be reset wholesale and prior receipts are not to be deleted.

---

## 10. Reconciliation manifest

`scripts/maintenance/reconcile-root-to-lane.ts` →
`reports/reconciliation/root-to-lane-20261020.json`.

Raw counts: root 1126 files, lane 908, 489 identical, 395 differ **only by CRLF/LF
line endings** (not real drift), 12 real content differences, 230 root-only,
12 lane-only.

The 395 line-ending-only entries were the reason a naive hash comparison reported
407 "differences" and would have wrongly implied a large unsynced delta. The
real delta is 12 files (all of which are files the implementation writers are
actively editing) plus the 12 lane-only files recovered in §4.

Real content differences at manifest time:
`PROJECT-CHECKLIST.md`, `server/agents/copilot/runtime.ts`,
`server/agents/tools/definitions.ts`, `server/agents/tools/registry.ts`,
`server/platform/adkAgent.ts`, `src/features/copilot/interactive/MarginSimulatorForm.tsx`,
`src/features/copilot/mcp-apps/OperationsBriefApp.tsx`,
`src/features/workspaces/CopilotWorkspace.tsx`,
`tests/frontend/a2ui-components.test.tsx`,
`tests/platform/advanced-tools-registry.test.ts`,
`tests/platform/copilot-v2-runtime.test.ts`, `tsconfig.platform.json`.

Root-only non-media files that were synced lane←root during this audit:
`docs/architecture/*` (3), `docs/product/*` (2), `docs/runbooks/*` (2),
`docs/prompts/CONTINUE-AGY-AUTONOMOUS-TEAMWORK-20261020.md`,
`docs/research/2026-10-20-antigravity-cli-power-setup.md`,
`docs/superpowers/plans/2026-10-20-*` (3),
`reports/agy-handoff-20261020-validation.json`,
`reports/multi-cli-handoff-20261020-validation.json`, `.mcp.json`.

Not synced (gitignored binary media, ~246 files + a large zip): `PRODUCT LLH-*`,
`Product Photo-*`. Not synced (stray, needs an owner decision):
`docs/# Respond to greeting.txt`.

---

## 11. External blockers observed (not implementation gaps)

- **AGY CLI quota.** `agy.exe` session terminated 2026-10-20 18:42:55 with
  `RESOURCE_EXHAUSTED (code 429): Individual quota reached. Resets in 56h36m38s`.
  The AGY Teamwork team is therefore **not alive**; `.agents/teamwork/explorer_m2_1..3`
  died during initialisation with no `analysis.md` and no `handoff.md`.
  Implementation work is being carried by Kilo subagents instead.
- **CopilotKit CLI `verify --round-trip`** (a real model call) requires free-tier
  eligibility and credentials that are not currently proven; until then provider
  round-trip remains `blocked_external`, not a local pass.
- **Fasa 05 Intelligence** (CPK-02 AG-UI Streams, CPK-03 Automatic Learning,
  ADV-28) and the 7 EXT gates remain gated on account/eligibility/privacy
  prerequisites that are external.
- **GitHub Actions** is blocked on account billing per the existing checklist;
  CI must not be labelled green.
