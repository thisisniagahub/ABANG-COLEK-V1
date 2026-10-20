# Wave Plan — Writers D, E, F, G (dispatch order, exclusive ownership)

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../docs/CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Prepared by the orchestrator after the 2026-10-20 double-check audit. Execution
contract: `docs/prompts/AGENT-EXECUTION-CONTRACT.md`; brief:
`docs/prompts/CONTINUE-AGY-AUTONOMOUS-TEAMWORK-20261020.md`.

**Cap: 3 concurrent implementation writers.** Slots are released when a writer
returns its report. Read-only reviewers/auditors do not consume a writer slot.

**Dependency/lockfile rule (contract §F):** `package.json`, `bun.lock` and
`agents/google-adk/requirements.txt` are **single-writer**. Only Writer D may
touch them, and only while D is running. No other writer may edit them.

---

## WRITER D — Official SDK adoption (the stack was never installed)

**Priority: highest.** The entire "CopilotKit / AG-UI / MCP / Google ADK" claim
in the repo is a facade because **not one of the official packages is installed**.
Registry evidence that all pins resolve: `reports/audits/2026-10-20-dependency-pin-resolution.md`.

**Exclusive ownership**
- `package.json`, `bun.lock`
- `agents/google-adk/requirements.txt`, `agents/google-adk/**`
- `api/copilotkit.ts` (new), `api/platform/copilot/**`
- `server/platform/app.ts` — **only** the route-registration sections needed to
  mount the MCP server and the `/api/copilotkit` handler (do not rewrite domain
  routes; do not touch the fixture tools in `domainTools.ts`)
- `server/agents/mcp/**` (new) — first-party MCP server
- `shared/copilot-contracts.ts` is owned by Writer B until B returns; coordinate
  by reading, do not edit until B is done.

**Read-only**: `server/platform/domainTools.ts`, `server/platform/adkAgent.ts`,
`src/**`, `server/agents/tools/**`.

**Tasks**
1. Install the pinned stack, exact versions, no "latest":
   `@copilotkit/react-core@1.79.1`, `@copilotkit/runtime@1.79.1`,
   `@copilotkit/a2ui-renderer@1.79.1`, `@ag-ui/client@1.0.2`,
   `@ag-ui/core@1.0.2`, `@modelcontextprotocol/sdk@1.32.1`,
   `@modelcontextprotocol/core@2.0.0`, `@modelcontextprotocol/client@2.0.0`,
   `@modelcontextprotocol/server@2.0.0`,
   `@modelcontextprotocol/ext-apps@2.0.3` (the ADR already writes the **scoped**
   name — the unscoped `ext-apps@2.0.3` 404s, which is expected),
   `zod@4.6.7`, and the `copilotkit@4.29.0` diagnostic CLI as a devDependency.
   Python: `google-adk==2.12.0`, `ag-ui-adk==0.10.0`, `fastapi==0.146.0`,
   `uvicorn==0.54.0`, `pydantic==2.14.1`, `httpx==0.28.1`, `pytest==9.1.1`.
   **Check whether `node_modules` in this workspace is a junction to
   `D:/ABANGCOLEK-OS/node_modules` before installing** (brief §G) and install into
   a workspace-private location if it is. Do not mutate a shared target.
2. Replace `agents/google-adk/app.py` with a **real** Google ADK service:
   actual `google.adk` imports, real `Agent`/`LlmAgent` subclasses for the three
   specialists `commerce_reader`, `qc_jev_reviewer`, `marketing_drafter`, a real
   master `abangcolek_ops` agent, AG-UI event emission via `ag-ui-adk`, a
   `Runner`, and a session service. Keep the same endpoint paths
   (`GET /health`, `POST /agent/specialists/*`, `POST /agent/abangcolek_ops`).
   **Remove the frozen `"timestamp": "2026-10-19T06:00:00Z"` and the hardcoded
   `margin = 28.5`** — the marketing specialist must call the canonical margin
   evaluator contract, and the commerce specialist must not assert a 3-SKU
   catalogue that the system does not have (the real catalogue reports 0
   published products). If the ADK library cannot be installed or imported,
   report the exact error and leave the service honestly labelled as
   `ADK_HOSTING_UNCONFIGURED` — do **not** keep advertising
   `"runtime": "google-adk-python3.12"` for a FastAPI keyword router.
3. Wire the TS runtime to the Python service over a **server-to-server grant**
   (never trust a browser `user_id`); the runtime must degrade to a truthful
   `unavailable` state when the ADK service is not reachable.
4. Build a real first-party MCP server (`server/agents/mcp/**`) implementing
   `initialize`, `tools/list`, `tools/call`, `resources/read` with the official
   SDK, exposing the operations brief as a **UI resource** with real
   `@modelcontextprotocol/ext-apps` metadata, plus a sandboxed host path
   (iframe + CSP + message boundary) for GUI-05. The current
   `server/platform/mcp/operationsBrief.ts` fixture values must be replaced by
   real store reads (Writer E owns the fixture purge; coordinate — D may read
   the store but must not rewrite `domainTools.ts`).
5. Mount the public app-origin route `/api/copilotkit` as a genuine CopilotKit
   TypeScript runtime Fetch handler. **Fix D-17**: `api/platform/copilot/v2.ts`
   is a static Vercel function that shadows the catch-all and returns 405 on GET
   and a body without `ok` on POST, so the frontend's runtime check always fails
   in production. Either remove the static shadow or make the route behave
   correctly; the frontend calls it at `src/features/platform/client.ts:49-51`
   and `src/features/workspaces/CopilotWorkspace.tsx:86,130`.
6. Widen the test script. `package.json:11` `test:platform` currently excludes
   `./tests/copilot`, `./tests/frontend`, `./tests/architecture` and
   `tests/landing-brand-theme.test.ts`. Add them (or add a `test:acceptance`
   script that runs everything) so the acceptance suites are inside the default
   command.

**Acceptance closed:** CPK-01, CPK-02 (protocol half), CPK-04, CPK-05, CPK-09,
CPK-10, GUI-05, GUI-06, AI-01 (protocol half), REL-01 (deployment evidence half).

**Verification**: `bun run lint`, `bun run build`, `bun run test:platform`,
`bun test ./tests/copilot`, `bun test ./tests/frontend`,
`bun test ./tests/architecture`, `uv run --project agents/google-adk pytest agents/google-adk/tests`
(or the pinned `.venv` fallback per prompt 02), plus a real MCP handshake test
(`initialize` → `tools/list` → `tools/call` → `resources/read`) and a real
CopilotKit runtime round-trip over a controlled transport.

**Report**: exact installed versions, exact lockfile diff, MCP handshake
transcript, ADK import evidence, route-wiring proof, exact commands + exit codes.

---

## WRITER E — Fabricated-provenance purge in `server/platform/**`

**Priority: high.** This is the AI-02 violation and the reason 18 of 21 mounted
tools return literals. Defects D-01..D-05, D-10, D-11, D-12..D-16, D-19, D-21,
D-33, D-36.

**Exclusive ownership**
- `server/platform/adkAgent.ts`
- `server/platform/domainTools.ts`
- `server/platform/mcp/operationsBrief.ts`
- `server/platform/freeModelRouter.ts`
- `server/automation/runtimeTransports.ts`
- `server/platform/app.ts` (the route sections listed in §G / D-16 / D-19 / D-36)
  — coordinate with Writer D; **D owns `app.ts` while D runs — E must wait for D
  to return before editing `app.ts`**, or E may do everything else first.
- `tests/platform/domain-tools.test.ts`, `tests/platform/mcp-brief.test.ts`,
  `tests/platform/copilot-adk.test.ts`, `tests/platform/agent-runtime.test.ts`
  (the vacuous ones: D-24, D-25, D-26, D-27, D-15)

**Read-only**: `server/agents/**`, `src/**`, `shared/**`, `agents/**`.

**Tasks**
1. Replace every hardcoded financial/domain constant with a real call into the
   canonical domain layer:
   - margin → `evaluateMarginContribution` (`shared/growth-contracts.ts:131`)
   - catalogue/orders/inventory/loyalty/dealers/operations → `server/platform/commerce.ts`,
     `loyalty.ts`, `dealers.ts`, `operations.ts`
   - JEV → `server/platform/jev/assessment.ts` + `policyEngine.ts`
   - day-close/finance → `server/platform/operations.ts`, `reports.ts`
   Every A2UI payload must carry **real** `provenance` — the record id, the
   revision, the evaluator version — and the evaluator name must be one that
   actually ran. A payload with a hardcoded value may still be emitted, but its
   `provenance.source` must not claim `canonical_evaluator` or `database`.
2. `freeModelRouter.ts` fallback must return a truthful `providerId` of
   `local_rules` and a status that says so, never the active provider id
   (D-10). Remove the false action claims from the fallback prose (D-11).
3. `runtimeTransports.ts` local transports must not report `published`/`sent`
   unconditionally. They must return an explicit "transport unavailable / not
   performed" outcome with a reason code, and the test must assert that.
4. `app.ts:169` `/quotas` must not report `null` observations as if they were
   telemetry — return an explicit `observation: 'unavailable'` with a reason.
5. `app.ts:127` dealer-terms gate must check `membership.status === 'active'`
   (D-19) — add a regression test for a revoked membership.
6. `commerce.ts:288` — the customer-initiated cancellation branch has an empty
   body (D-21). Implement it correctly and test it.
7. `app.ts:191-201` — the `/copilot/v2` descriptor advertises
   `runtime:'copilotkit-v2-agui'`, `version:'2.0.0'`, `schema:'a2ui.v1'` for a
   protocol that is not implemented (D-33). Either the route becomes real (Writer
   D) or the descriptor must state the truth.
8. Fix the vacuous tests (D-23, D-24, D-25, D-26, D-27): each must drive the
   real path or be deleted. `tests/platform/domain-tools.test.ts:50` has a
   missing `await` — the authorization assertion never executes.
9. Add `tests/copilot/mod-07-marketing.test.ts` (the only missing MOD file).
10. Consider a CI guard: a test that fails if the copilot surface contains a
    literal financial constant or a `provenance.source` value with no backing
    lookup. This is the enforcement mechanism the blueprint lacks (blueprint:300).

**Acceptance closed**: AI-02, AI-01 (truthfulness half), MOD-01..MOD-10 (tool
binding half), GUI-01, CPK-04 (real payloads), SEC-02 (with D-19 fixed),
MOD-10, ADV-19, ADV-20.

**Verification**: `bun run lint`, `bun run build`, `bun test ./tests/platform`
(0 fail, no regression), `bun test ./tests/copilot`, `bun test ./tests/frontend`.

---

## WRITER F — Fasa 01 structure + a boundary checker that proves itself

**Priority: medium.** ARC-01 is `partial` and its only architecture test is
self-referential (D-30 overclaims).

**Exclusive ownership**
- `scripts/maintenance/check-boundaries.ts`
- `tests/architecture/**`
- the file moves themselves (docs, media, `server/platform` → `server/modules`)

**Read-only**: `server/platform/**` source content (only paths may change — do
NOT change behaviour), `src/**`, `shared/**`.

**Tasks**
1. Rewrite `check-boundaries.ts` so it can be **driven by tests**:
   - accept an injectable file set (or a root directory) so a synthetic
     violating tree can be scanned;
   - detect multiline imports (`import {\n x\n} from '../../server/foo'`);
   - detect dynamic `import('...')`;
   - detect deep relative paths (`../../../../server/...`);
   - detect aliased/tsconfig-path imports;
   - implement the cycle rule its own header comment claims (rule 3) — with
     `server/modules` in place.
2. Replace `tests/architecture/dependency-boundaries.test.ts:27-35` with real
   **negative fixtures**: a temp tree containing a genuine `src → server` import
   that the checker MUST flag, plus a genuine `shared → src` import, plus a
   genuine cycle. The current test only evaluates `LEGACY_EXCEPTIONS.some(...)`
   against a made-up path and proves nothing.
3. Resolve the two stale `LEGACY_EXCEPTIONS` entries (`src/features/jev/index.ts`,
   `src/services/jevEngine.ts`, both `removalBatch:'03B'` — a batch already
   complete): either extract the JEV evaluator into `shared/` and remove the
   exceptions, or re-base the removal batch with a real owner and reason.
4. Perform the Fasa 01 move per `docs/design/repository-structure.md` and
   `docs/prompts/01-structure.md`, in the documented stages, with before/after
   SHA-256 hashes for every media/binary file, updating consumers, relative
   links, case-sensitive paths and discovery scripts:
   - `server/platform/*` → `server/modules/<domain>/*` per the mapping table
   - product media → `references/media/product-2026-10-17/` (246 files + a large
     `.zip`; these are **gitignored**, so confirm before touching that the
     relocation does not break any path reference — and get the hash manifest)
   - `docs/handoffs/` vs `docs/handover/` overlap → consolidate
   - preserve `bunVersion: "1.x"` and the existing SPA fallback
   - **the media move is a scheduled write window** — do it while no other writer
     is active, and never mid-flight over another worker's files.
5. Never blanket-exempt existing violations; never duplicate an old and a new
   service; a temporary facade must have an owner and a removal batch.

**Acceptance closed**: ARC-01 (with genuine negative fixtures), Fasa 01.

---

## WRITER G — Fasa 05 Intelligence + the 7 EXT gates

**Priority: low, and partly external.** The honest outcome for several rows is
`blocked_external`, and that must be recorded as a gate with exact evidence, not
papered over.

**Exclusive ownership**
- `server/platform/founder-intelligence.ts`, `shared/founder-intelligence-contracts.ts`
- `src/services/supabaseAgentPerformance.ts` (EXT-03)
- `src/features/pet/speechService.ts` (EXT-06)
- `server/platform/evidenceFiles.ts` + the copilot attachment surface (EXT-07)
- new `server/agents/intelligence/**`

**Tasks**
1. CPK-02 AG-UI Streams: real replay/reconnect with state/cards and an owned
   identity. Local persistence alone does not close it. The existing
   `tests/platform/copilot-intelligence.test.ts` asserts CPK-02 is
   `blocked_external` — that assertion is a *policy gate*, not a substitute for
   the protocol work; implement the local half and keep the external half
   explicitly blocked.
2. CPK-03 / ADV-28: evidence → insight → skill candidate → eval → **human
   publish** → version-pinned compatible delivery → rollback. Automated publish
   is forbidden. Requires a real skill store, which does not exist yet.
3. EXT-03: `src/services/supabaseAgentPerformance.ts` is 723 lines seeded with a
   40-row `INITIAL_PERFORMANCE_SEED` mock dataset, and its schema stores
   `user_query` and `tokens_used` — both outside EXT-03's allowlist. Remove the
   seed data, remove or aggregate the prohibited fields, and add the opt-out,
   delete and allowlist behaviour. This is a customer-data hygiene defect, not
   just a checklist row.
4. EXT-01/02/04/05: implement the **gated local paths** and the typed
   `unavailable` behaviour. Live activation for EXT-02/04 requires account,
   eligibility, privacy and send-authorisation gates that are external.
5. EXT-06: real gesture/mic-permission indicator, a shared controller with the
   copilot thread, and processing-location disclosure. Do not claim an external
   STT/TTS service that is not configured.
6. EXT-07: an attachment **reference** in the copilot surface. Upload is
   already real; vision inference is not, and must not be claimed.

**Verification**: `bun run lint`, `bun run build`, `bun test ./tests/platform`,
`bun test ./tests/frontend`, plus targeted tests for each implemented gate and
an explicit negative test per gate.

---

## Cross-cutting rules for every writer

- **Never** fabricate a provider, approval, receipt, or external effect.
- **Never** label a mock/fixture as an integration, and always state the
  persistence mode (`in_memory` / `file` / `sqlite` / `remote`) in tool output.
- **Never** revert another agent's work; the working tree is dirty on purpose.
- Write regression tests **before** claiming a defect is fixed; preserve the
  failing case and its provenance.
- Report exact commands, exit codes, and real pass/fail counts — never "SUCCESS".
- The orchestrator is the **single writer** for `PROJECT-CHECKLIST.md`,
  `docs/prompts/ACCEPTANCE-REGISTER.md`, `docs/handover/IMPLEMENTATION-CHECKPOINT.md`
  and `reports/implementation/evidence/<ID>.json`. Workers suggest statuses and
  hand over evidence; they do not tick.
