# ABANGCOLEK-PLATFORM — Full Project Review (adversarial)

**Date:** 2026-10-20 · **Lane:** `integrate/blueprint-v23` @ `60311aa` (+ uncommitted working tree) · **Release main:** `18c69b3` (11-file TypeScript/config patch only)
**Method:** 4 independent read-only audits (documentation alignment, ledger integrity, test-contract integrity, TypeSafe/System-One architecture) + 2 adversarial code-review passes + 5 implementation waves. Every finding below is anchored to a file:line in this tree.
**Scope note:** static source and test evidence only. No deployment, no live provider, no account login, no browser session was exercised. Anything requiring those is marked UNKNOWN, not PASS.

---

## 1. Executive verdict

The documentation is now internally honest, and the platform test suite is green. But **the acceptance ledger was overstating readiness before this review**: several rows were ticked on evidence that did not exist, and the code review found real wrong-money and wrong-permission defects in the live chat path.

| Dimension | State before review | State now |
|---|---|---|
| Platform test suite | 1122 tests / 1120 pass / **2 fail / 1 error** | **1148 / 1138 pass / 0 fail / 0 error / 10 todo** (green twice) |
| Typecheck (`tsc --noEmit`, platform + root) | 16 × TS2345 in `tests/platform/**` | **exit 0 / exit 0** |
| Acceptance ledger | 85 rows, counts unverifiable against own gate | 85 rows, **0 mismatch** ledger ↔ checklist ↔ register |
| Snapshot counts | 40 / 37 / 7 / 1 (= 45 open) claimed | **38 / 37 / 9 / 1 (= 47 open)** after two re-tiers |
| Cited evidence files | 1 missing, 4 wrong, 41 unresolvable names | **all 85 `testFile` paths resolve on disk** |
| Provider error bodies reaching browser | yes (2 paths) | **closed** (3 paths) |
| Unbounded provider spend in chat runtime | up to 7 calls | **3 calls / 30 s** |
| "Not computed" encoded as `0`/`false` | 8 sites | **`null`** (absence ≠ verdict) |

**Not a release.** 47 of 85 requirements are open, 9 of those are externally gated, and the full Copilot implementation has never been released to `main`.

---

## 2. Documentation claims vs verified reality

| Claim (pre-review) | Verdict | Evidence |
|---|---|---|
| "188 documents aligned, 1650 local paths checked, 0 missing" | PARTIAL | Path/fence/inventory checks are real and reproducible. But the 1650 count is not reproducible from any in-repo artifact — the validator is an out-of-repo utility, so the number is unsupported. |
| "Both checklists have 85 unique IDs with no status mismatch" | TRUE | Independently re-verified: 85 unique IDs in both, 0 status mismatch, and now 0 path mismatch after corrections. |
| "301 protected files byte-identical" | UNVERIFIABLE | The 301 file list is not stored in-repo; only a hash file per entry in the inventory. A git-level check of protected paths found 0 modifications, which is consistent but not the same as the claim. |
| "0 application changes" | FALSE as stated | The working tree carries **50 non-Markdown changed files** (12 `server/**`, `package.json`, `bun.lock`, 10 test files). The alignment task itself did not author them, and the report does say so at line 37 — but a reader scanning the summary would take "0 application changes" as "the tree contains only docs". It does not. |
| "Main is a release with 305 passing platform tests" | MISLEADING | The 305/1778 figures are the counts of that 11-file patch's own suites, not the full suite. The tree's real suite is 1148 tests. |
| "11 files" in release `18c69b3` | was UNENUMERATED | Now enumerated in `reports/implementation/main-typescript-release-20261020.json` → `files[]`: `.gitignore`, `.vscode/settings.json`, `api/tsconfig.json`, `package.json`, `scripts/tsconfig.json`, `server/tsconfig.json`, `shared/tsconfig.json`, `tests/architecture/typescript-projects.test.ts`, `tests/tsconfig.json`, `tsconfig.json`, `tsconfig.platform.json`. |

---

## 3. Acceptance-ledger defects found and corrected

| ID | Defect | Correction |
|---|---|---|
| CPK-07 | `testFile` = `tests/frontend/frontend-tool-adapters.test.tsx` — **file does not exist**; real file is `.ts` | fixed; `testNameKind: "title"` + verbatim title |
| AI-02 | Cited `provenance-truth-commerce-cancellation.test.ts`, which contains only order-cancellation tests. The real guard is `tests/platform/provenance-truth-guard.test.ts` | re-pointed; gap rewritten (guard is green but is **static source analysis only**) |
| OFF-01 | Cited `offline-cache.test.ts`; the fingerprint / Idempotency-Key / PENDING_RECONCILIATION proof lives in `client-retry.test.ts` and `client-session-race.test.ts` | re-pointed to `client-retry.test.ts` |
| SEC-02 | Cited `tests/copilot/mod-05-dealers.test.ts`; the revoked-membership regression is `tests/platform/agent-runtime.test.ts` | re-pointed; `gap` set to `null` (the gate **is** implemented — the old text claimed it was not) |
| PAY-02 | Cited `payment-reconciliation-v24.test.ts`; `PAYMENT_NOT_VERIFIED` is asserted in `backend-lifecycle.test.ts` | re-pointed; source line corrected `289` → `299` |
| CPK-09 | `gap` claimed the Pet side still needed `attachIdentity` and the controller lacked a trust-downgrade path — **both already implemented**; the cited test was RED | `gap` set to `null`; the RED test is now fixed and green |
| CPK-10 | Cited `agents/google-adk/tests/test_agents.py` as proving a delegation transcript. It has no such test, is run by **no** npm script and **no** CI job. The TS evidence replays a hardcoded `REAL_AGUI_TRANSCRIPT` | re-pointed to `tests/platform/copilot-adk-bridge.test.ts`; gap rewritten to state the fixture is not a live transcript |
| EXT-03 | `status: verified_local` while its own `activationDecisionRef` entry in `activation-decisions.json` says `blocked_external` | re-tiered → `blocked_external` |
| EXT-06 | same contradiction | re-tiered → `blocked_external` |
| 21 × ADV | all cited `adv-tools-capability-coverage.test.ts:437-448`, which asserts **shape only** (`toBeDefined`, `Array.isArray`). A tool returning a hardcoded constant passes | **evidence strength downgraded to shape-only in this report.** The value-bearing proof exists in `adv-tools-scope-idor.test.ts:304-332` (`allocatedTotalSen === 1000`, `estimatedDriftSen === 0`, `naiveFloorDriftSen !== 0`) and `advanced-tools-registry.test.ts:78-83` (`count === 32`) but was not cited |
| 41 rows | `testName` is a **prose paraphrase**, not a test title, so the project's own rule ("a testName matching no observed testcase is a hard error") was unenforceable | scripts now carry an explicit `testNameKind` discriminator (`title` = must resolve; `prose` = file must exist); the value set is single-sourced from `verify-acceptance.ts` |

**Consequence:** the honest open count is **47**, not 45, and the honest `verified_local` count is **38**, not 40.

---

## 4. Real code defects (not documentation)

Severity is impact-if-shipped. "Fixed" means landed and verified in this tree.

### 4.1 Critical — wrong money / double refund

| # | Defect | Evidence | State |
|---|---|---|---|
| C1 | Order resolved by **substring**, then its amount attached to a founder refund approval. `ORD-001` also matches `ORD-0010`; any token fragment matches. | `server/platform/adkAgent.ts:220-240` (match), `:365` (amount attached) | Fix in flight |
| C2 | A **negated** phrase ("no refund", "bukan ganti rugi") opens a founder refund approval — `String.includes('refund')` with no negation check. | `server/platform/adkAgent.ts:363` | Fix in flight |
| C3 | **No `unknown_outcome` in the server contract.** A proposal is CAS'd to `executing` *before* the executor runs and rolled back to `approved` on failure. If the executor's outcome is indeterminate (crash, lost receipt), the proposal is indistinguishable from "never ran" → a retry can **double-refund**. The frontend already renders `unknown_outcome`; only the server lacks it. | `server/agents/copilot/runtime.ts:80`, `server/agents/approval/types.ts:12-19`, `server/agents/tools/capabilities/governance.ts:163-167,188-192` | **OPEN — highest-severity remaining item** |
| C4 | A duplicate, looser margin parser accepted **fractional sen** and could throw an uncaught `TypeError`/`RangeError` to the HTTP layer (500 / raw error SSE frame). Canonical strict reader exists but was bypassed. | `server/platform/adkAgent.ts:247-300` vs canonical `server/platform/domainTools.ts:280-307`; `shared/growth-contracts.ts:107-114` | Fix in flight |

### 4.2 High — security / trust boundary

| # | Defect | Evidence | State |
|---|---|---|---|
| S1 | Raw provider error bodies (400 chars) reached the browser through `attempts[].detail` → `reasonDetail` → `message`. Provider bodies carry account-level model entitlement, account identifiers and internal request ids. | `server/agents/providers/model-adapters.ts:137-152` → `runtime.ts:504-541,817-843,993-1013` → `api/platform/copilot/v2.ts:109` | **FIXED** — classified info only; raw body redacted to a server-side log |
| S2 | Same class via the second chat runtime's SSE error frame. | `server/platform/freeModelRouter.ts:281` → `server/platform/app.ts:527` | **FIXED** — fixed message + stable code |
| S3 | Same class via the **Python ADK bridge**: `detail.slice(0, 200)` of the bridge body embedded in an error message. | `server/agents/adk-bridge/client.ts:191,291` | **FIXED** — body redacted to server log only |
| S4 | The legacy AI path returned the **entire provider response object** to the browser. | `server/platform/legacyAi.ts:22` | **FIXED** — projected to the fields the UI needs (gating unchanged) |
| S5 | The chat "verified actor" gate passes for **every anonymous browser request**: the public route uses a guest actor with `membershipVersion: 0`. | `server/agents/copilot/runtime.ts:158-163,318`; `server/agents/copilot/runtime-instance.ts:24-28`; `api/copilotkit.ts:190`; `api/platform/copilot/v2.ts:75` | **OPEN** — needs a distinct guest budget + per-IP rate limit |

### 4.3 Medium — cost, correctness, honesty

| # | Defect | Evidence | State |
|---|---|---|---|
| M1 | The platform chat runtime could make **7 sequential provider calls** at 3.5 s each (~24 s, whole free tier) with **no budget bound** — unlike the Copilot runtime (3 calls / 30 s). | `server/platform/freeModelRouter.ts:194-326,260` vs `server/agents/copilot/runtime.ts` | **FIXED** — shares `COPILOT_RUN_BUDGET` via `shared/copilot-contracts.ts`; new `LOCAL_RULES_BUDGET_EXHAUSTED` + `budgetBlockReason`; no boundary cycle introduced |
| M2 | "Not computed" was encoded as `0` / `false`. `isRefundEligible.isAffirmative = false` at probability 0 reads downstream as "determined: not eligible" — a wrong-money conclusion from **absence of data**. | `src/services/jevEngine.ts:115,127-131` | **FIXED** — now `null`; consumers render "Belum Nilai"; storage validator accepts `null` but still rejects garbage |
| M3 | Two JEV vocabularies joined by an **unchecked cast** — a pack value outside the frontend taxonomy was persisted and rehydrated unchallenged. | `src/services/jevEngine.ts:113-114` vs `server/platform/jev/questionRegistry.ts` | **FIXED** — membership check; drift maps to `UNKNOWN` and is recorded, never stored as a taxonomy value |
| M4 | `provenance.source: 'jev_local_rules'` was a **literal** on a card, but JEV was never invoked on that path. | `server/platform/adkAgent.ts:400,416`; `server/platform/domainTools.ts:1498` | **OPEN** — must become a derived value |
| M5 | The provenance guard is **static source analysis over 4 files**; nothing verifies a model-produced claim against a record. | `tests/platform/provenance-truth-guard.test.ts:27-32` | **OPEN** — documented honestly now; needs a runtime check |

---

## 5. TypeSafe / System-One verdict on the AI layer

**JEV (`server/platform/jev/**`, `shared/jev-contracts.ts`) is already a typed-judgment primitive system** — `choice` / `score` / `noul`, distribution + confidence, a no-match (`UNKNOWN`) branch, an abstention state (`ABSTAIN` / `INVALID` / `LOCAL_RULES_UNCALIBRATED`), a held-out evaluation harness with an explicit calibration statement, named structured state with tri-state facts, a server-side `entityRevision` compare, and a deterministic authority gate. It is the closest thing in the repo to the System One model, and in several places more disciplined than the agent layer.

**Neither live chat path uses it.** `server/platform/adkAgent.ts` imports no JEV module and hand-writes a JEV-shaped card; `server/agents/copilot/runtime.ts` dispatches **zero** tools and returns the model's prose verbatim as the answer. The 32 ADV tools are deterministic store readers (no LLM calls — verified by grep) and are the best correctness machinery in the repo, but they are **unreachable from a chat turn**.

**Recommendation: adopt JEV as the judgment layer for both chat paths.** Replace the four keyword branches (`adkAgent.ts:344,363,425,502`) with one `support`-pack assessment over the same `JevState`, resolve the order by id, render the assessment instead of a hand-written card, and move `evaluateExecutionPolicy` out of test-only into the real authority gate. Keep native TypeSafe **dormant** — its own gates (entitlement, terms, transport, evaluation, deadline/quota, a real provider receipt) are unmet, and the local evaluator is honest about being uncalibrated.

---

## 6. Test-contract state

- Suite: **1148 tests / 1138 pass / 0 fail / 0 error / 10 todo**, green twice. `bun run lint` exit 0. `check-boundaries.ts`: 254 files, 787 imports, 0 unauthorized violations.
- The previously-failing `tests/frontend/copilot-agui-runtime.test.tsx` loaded **0 assertions** (module-level `SyntaxError`). It is now rewritten against the real contract with 15 executing tests.
- `tests/frontend/copilot-run-identity-shared.test.tsx` asserted the retired legacy JSON-answer path. Now drives official AG-UI frames and asserts a JSON answer is refused.
- `tests/ext/ext-webmcp-probe.test.ts` (EXT-05's only local evidence) was **orphaned by every npm script and by CI**. `package.json` now includes `./tests/ext` in `test:platform`; the file passes (4/0).
- `tests/platform/open-gaps.test.ts` (new) pins the 10 unclosed requirements as `test.todo` with the exact assertion each needs — so a gap can no longer be silently ticked.
- `tests/frontend/**` is in **no** tsconfig `include` list, so frontend test files are not type-checked by the lint gate. 5 pre-existing type errors remain in `copilot-run-identity-shared.test.tsx` (lines 21, 75, 76, 78, 221) and are invisible to `bun run lint`.

---

## 7. Externally gated requirements — not closable by code

| Gate | Blocks |
|---|---|
| Gemini / OpenRouter quota or paid key | CPK-01 |
| CopilotKit Intelligence account + terms | CPK-03, EXT-02 |
| Slack app + signing secret + permissions | EXT-04 |
| Billplz sandbox credential | PAY-01, PAY-02 |
| Browser-side MCP client API + own-app registration | EXT-05 |
| GitHub Actions billing (both jobs never started) | CI signal |
| Vercel deployment of the full Copilot build | release parity |
| Swift / Kotlin app build receipt | ARC-01 cycle |

---

## 8. Repo hygiene — act before committing

The working tree carries **290 changed files, 50 of them non-Markdown** (12 `server/**`, `package.json`, `bun.lock`, 10 test files) alongside ~240 documentation files. A `git add -A` would ship unreviewed source and the whole documentation rewrite in one commit.

Recommended split, in order:
1. `chore(release)`: the 11-file TypeScript/config patch (already on `main` as `18c69b3`).
2. `fix(copilot)`: the provider-leak, budget, JEV-null and order-match fixes — with their new tests.
3. `docs(alignment)`: the documentation rewrite, **after** the ledger corrections in §3 are the source of truth.
4. `test(contract)`: the RED-test fixes, `open-gaps.test.ts`, and the `testNameKind` discriminator.

After the tree is quiet, regenerate the receipt: `bun scripts/maintenance/verify-acceptance.ts --skip-build --skip-e2e` — the current receipt is stale (`sourceStable: false`, `lint exit=2` recorded, no per-testcase evidence), which is why the register renderer currently refuses to publish.

---

## 9. Unknowns

- No deployment, environment, or live-provider behaviour was inspected. `main` = `18c69b3` was verified by git only.
- Production browser tests (8 passing in the release receipt) were not re-run here.
- The Python ADK suite (`agents/google-adk/tests/test_agents.py`) is executed by **no** npm script and **no** CI job; its delegation behaviour is unverified in CI terms.
- `tests/platform/supabase-query.test.ts` shows an intermittent `ReferenceError: localStorage is not defined` from `src/services/pluginService.ts:432` (green in 4/5 runs) — pre-existing, not introduced here, and not yet root-caused.
- The 10 `test.todo` gap pins are declarations of intent, not proof that the gaps still exist in the exact form they will be closed.
