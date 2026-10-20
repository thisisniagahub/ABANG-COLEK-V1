# AbangColek Google ADK Agent Service

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../docs/CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Development Python 3.12 service using Google ADK agent/runner classes and an AG-UI event translator. These source imports and local tests do not certify the production CopilotKit-to-ADK integration.

Authority sasaran: Blueprint v2.4 & ADR-0003. Default bind: `127.0.0.1:8030`.

---

**Current limits:** sessions are in memory; a local policy model is not proof of an eligible live free provider. The custom request envelope is not the target signed, owned HttpAgent run contract. `requirements.txt` uses FastAPI0.141.1 whereas the ADR target is0.146.0; resolver notes record a deviation, not approval. See [current status](../../docs/CURRENT-STATUS.md).

## 1. Source components observed; integration gaps remain

| Concern | Implementation |
| --- | --- |
| Agents | `google.adk.agents.LlmAgent` — master `abangcolek_ops` + 3 specialists |
| Delegation | ADK's own `transfer_to_agent` (master → specialist sub-agent) |
| Runner | `google.adk.runners.Runner` |
| Sessions | `google.adk.sessions.InMemorySessionService` |
| Model | `google.adk.models.base_llm.BaseLlm` |
| AG-UI | `ag_ui_adk.EventTranslator` (ag-ui-adk `0.10.0`) |
| Platform data | Existing specialists read local SQLite; this conflicts with the target canonical tool/grant boundary and must be replaced before integration acceptance |

There is **no keyword router**. The previous `app.py` matched substrings and
called plain Python functions; it imported nothing from `google.adk`. That has
been replaced by a real ADK agent tree where the master agent transfers to a
specialist agent, ADK executes the specialist's `FunctionTool`, and the AG-UI
translator converts the resulting ADK event stream into AG-UI protocol events.

## 2. Model policy (honest by construction)

The platform runs on a zero-paid-spend policy, so the service **never claims a
live model it cannot reach**:

* Default: `LocalPolicyLlm` — a genuine `BaseLlm` implementation that plans
  deterministic tool calls offline. Reported as `kind: "local_policy"`,
  `live: false`.
* Existing source can select a hosted Gemini model through
  `ABANGCOLEK_ADK_MODEL` and a server credential. This is **observed source
  behavior, not an approved activation recipe**. Do not set an arbitrary model
  or run a hosted probe from this guide. The exact candidates and order in
  [ADR-0003](../../docs/decisions/0003-blueprint-v23-execution-contract.md)
  require existing account/free-only eligibility, privacy, compatibility and
  tool-evaluation receipts before activation. A credential is not proof of free
  access. Source-side policy enforcement remains part of the unfinished bridge.

`GET /health` reports the runtime it actually imported, never a hardcoded
string. If `google.adk` cannot be imported the payload reports
`"runtime": "unavailable"`, `runtimeAvailable: false` and the import error.

## 3. Install

```powershell
uv venv --python 3.12 agents/google-adk/.venv
uv pip install -r agents/google-adk/requirements.txt
```

Never install into the system Python and never at the repository root. See
`DEPENDENCY-NOTES.md` for the resolved version list and the one ADR pin
deviation that the resolver forced.

## 4. Run

```powershell
agents/google-adk/.venv/Scripts/python.exe agents/google-adk/app.py
# or
agents/google-adk/.venv/Scripts/python.exe -m uvicorn app:app --host 127.0.0.1 --port 8030 --app-dir agents/google-adk
```

Tests:

```powershell
agents/google-adk/.venv/Scripts/python.exe -m pytest agents/google-adk/tests -q
```

## 5. Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Truthful runtime + model readiness |
| GET | `/agents` | Agent/tool inventory and the AG-UI event vocabulary |
| POST | `/agent/specialists/commerce_reader` | Real catalogue read (read-only) |
| POST | `/agent/specialists/qc_jev_reviewer` | Real case / JEV / lot review (read-only) |
| POST | `/agent/specialists/marketing_drafter` | Real Margin Guardian evaluation |
| POST | `/agent/abangcolek_ops` | Master agent, real ADK delegation |
| POST | `/agent/abangcolek_ops/stream` | AG-UI SSE event stream (master) |
| POST | `/agent/specialists/{name}/stream` | AG-UI SSE event stream (specialist) |

Request envelope:

```json
{ "message": "semak katalog", "payload": { "query": "semak katalog" } }
```

Response envelope: `{ "ok": true, "data": { ... } }`.

## 6. AG-UI events emitted by the stream

The streaming endpoints emit Server-Sent Events with an AG-UI protocol JSON
payload per frame:

```
event: RUN_STARTED
data: {"type":"RUN_STARTED","thread_id":"...","run_id":"..."}
```

| Event | Emitted when |
| --- | --- |
| `RUN_STARTED` | First frame of every stream |
| `TOOL_CALL_START` | ADK emitted a tool call |
| `TOOL_CALL_ARGS` | Arguments of that tool call (JSON) |
| `TOOL_CALL_END` | Tool call arguments complete |
| `TOOL_CALL_RESULT` | The tool returned a result (real payload) |
| `TEXT_MESSAGE_START` | The agent produced a text message |
| `TEXT_MESSAGE_CONTENT` | Text message body |
| `TEXT_MESSAGE_END` | Text message complete |
| `STATE_SNAPSHOT` | Final state snapshot (agent, delegated agent, real result) |
| `STATE_DELTA` | The ADK event carried a non-empty `state_delta` |
| `RUN_FINISHED` | Last frame of a successful stream |
| `RUN_ERROR` | The run raised (instead of `RUN_FINISHED`) |

`GET /health` and `GET /agents` both return this vocabulary under `aguiEvents`.

A master run therefore produces, in order:
`RUN_STARTED` → `TOOL_CALL_START/ARGS/END` (`transfer_to_agent`) →
`TOOL_CALL_RESULT` → `TOOL_CALL_START/ARGS/END` (specialist tool) →
`TOOL_CALL_RESULT` → `TEXT_MESSAGE_START/CONTENT/END` → `STATE_SNAPSHOT` →
`RUN_FINISHED`.

## 7. Honest domain behaviour

The service is **read-only**. It opens the platform store with SQLite's
`mode=ro` flag and never writes.

### commerce_reader
Reads `records` where `kind='catalogue'` and keeps only `status == 'published'`,
mirroring `server/platform/commerce.ts`. Availability is derived from real
`lots` minus active `reservations` at the HQ business location.

* Real catalogue with published products → `status: "success"`, real names,
  prices and quantities.
* Store reachable but nothing published → `status: "success"`,
  `reasonCode: "CATALOGUE_EMPTY"`, `publishedProducts: 0`.
* Store unreachable → `status: "unavailable"`,
  `reasonCode: "CATALOGUE_STORE_UNAVAILABLE"`.

It never claims a fixed SKU count.

### qc_jev_reviewer
Reads real `cases`, `qc` (JEV assessments) and `lots` records.

* Matching case → the real case, the real JEV assessment, the real quarantine
  lots.
* No matching case → `reasonCode: "CASE_RECORD_NOT_FOUND"`, `case: null`.
  **No complaint is ever claimed to have been recorded.**
* Store unreachable → `status: "unavailable"`, `reasonCode: "STORE_UNAVAILABLE"`.

Invariants preserved: `rootCauseStatus` stays `UNDETERMINED` until a supplier
lot review completes, `confidenceScore` is always `null` (never a fabricated
float), and every action is emitted with `executed: false` and
`requiresOperatorAction: true`.

### marketing_drafter
Computes the margin with the Margin Guardian rule (port of
`evaluateMarginContribution` in `shared/growth-contracts.ts`):

* All amounts are **integer sen**.
* Contribution = net sales − Σ variable costs.
* Gate 1: `contributionSen >= minimumContributionSen` (default **2000** sen).
* Gate 2: exact basis-point comparison
  `contributionSen * 10000 >= netSalesSen * minimumMarginBps`.
* The displayed percentage is rounded for presentation only and is **never**
  used for the verdict, so 24.996% is rejected even though it displays as
  25.00%.

Reason codes: `PASS`, `INSUFFICIENT_CASH_MARGIN`, `INSUFFICIENT_PERCENT_MARGIN`,
`MISSING_MARGIN_INPUTS`, `INVALID_MARGIN_INPUT`. When the financial inputs are
absent the specialist returns `marginSafe: null`, `marginStatus: "UNAVAILABLE"`
and no approval action — it does not guess a margin.

## 8. Provenance

Every response carries:

```json
"provenance": {
  "source": "platform_sqlite",
  "timestamp": "2026-10-20T12:04:17.438Z",
  "agent": "commerce_reader",
  "tool": "read_published_catalogue",
  "toolStatus": "completed",
  "persistence": "read_only",
  "detail": "...",
  "databasePath": "..."
}
```

`timestamp` is always the moment of emission — there are no frozen timestamps
anywhere in the service (a regression test enforces this). `source` is one of
`platform_sqlite`, `local_rules`, `adk_agent` or `unavailable`; `persistence` is
one of `none`, `read_only`, `computed` or `unavailable`.

## 9. Environment variables

| Variable | Purpose |
| --- | --- |
| `PLATFORM_DATABASE` | Path to the platform SQLite store (default `<repo>/var/lib/platform/platform.sqlite`) |
| `ABANGCOLEK_ADK_MODEL` | Existing source selector only; hosted activation remains gated by the exact ADR candidate/eligibility/privacy receipts |
| `ABANGCOLEK_ADK_API_KEY` | Explicit API key for the hosted model (highest priority) |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Hosted model credentials (fallback) |

Historical credential observation, not a fresh connectivity result or activation instruction: credential precedence in source is `ABANGCOLEK_ADK_API_KEY` → `GEMINI_API_KEY` →
`GOOGLE_API_KEY`. `GEMINI_API_KEY` is preferred over `GOOGLE_API_KEY` because
`google.adk` resolves `GOOGLE_API_KEY` first
(`google/adk/utils/_gcp_metadata.py`), and on this machine `GOOGLE_API_KEY` is
present but rejected by the API (HTTP 403 "Your project has been denied
access") while `GEMINI_API_KEY` works. The key is passed explicitly to
`Gemini(client_kwargs={"api_key": ...})` so the denied key is never picked up
implicitly. `/health` reports which env var was found as `credentialSource`
(the secret itself is never echoed).

## 10. Layout

```
agents/google-adk/
├── app.py                  FastAPI app, routes, health
├── runtime.py              ADK runtime: agents, Runner, sessions, model probe
├── policy_model.py         LocalPolicyLlm (a real BaseLlm implementation)
├── agui.py                 AG-UI event emission (ag_ui_adk.EventTranslator)
├── domain/
│   ├── margin.py           Margin Guardian (integer sen + basis points)
│   ├── platform_store.py   Read-only platform store access
│   ├── provenance.py       Timestamps and provenance blocks
│   ├── intent.py           Deterministic routing rules for the master agent
│   ├── a2ui.py             A2UI v1 card helpers
│   └── reason_codes.py     Machine-readable reason codes
├── specialists/
│   ├── commerce_reader.py
│   ├── qc_jev_reviewer.py
│   └── marketing_drafter.py
└── tests/
    ├── conftest.py         Real platform-store fixtures
    └── test_agents.py
```
