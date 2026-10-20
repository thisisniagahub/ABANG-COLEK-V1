# Dependency Pin Resolution — ADR-0003 vs Registries (2026-10-20)

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../docs/CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Purpose: establish, with actual registry evidence, whether the official CopilotKit /
AG-UI / MCP / Google-ADK stack pinned by ADR-0003 and the execution contract is
installable. This is the prerequisite for Fasa 02 / 04 / 05.

**Method:** live registry queries (`npm view`, `npm search`, PyPI JSON API) executed
2026-10-20. Every row below is a real registry response, not a recollection.

## 1. Current install state — nothing from the official stack is installed

`node_modules/` contains **none** of:

```
@copilotkit/react-core        installed=false
@copilotkit/runtime           installed=false
@copilotkit/a2ui-renderer     installed=false
@ag-ui/client                 installed=false
@ag-ui/core                   installed=false
@modelcontextprotocol/sdk     installed=false
@modelcontextprotocol/ext-apps installed=false
zod                           installed=false
```

`package.json` declares no `@copilotkit/*`, no `@ag-ui/*`, no `@modelcontextprotocol/*`.
This is the mechanical reason every "CopilotKit" artefact in the repo is a facade:
the official packages were never installed, so the code was hand-rolled to look like
them.

## 2. Pin resolution table

| ADR-0003 / brief §G pin | Registry | Resolves? | Correct package name | Evidence |
|---|---|---|---|---|
| CopilotKit react-core `1.79.1` | npm | YES | `@copilotkit/react-core@1.79.1` | `npm view @copilotkit/react-core@1.79.1 version` → `1.79.1` |
| CopilotKit runtime `1.79.1` | npm | YES | `@copilotkit/runtime@1.79.1` | → `1.79.1` |
| CopilotKit a2ui-renderer `1.79.1` | npm | YES | `@copilotkit/a2ui-renderer@1.79.1` | → `1.79.1` |
| AG-UI client `1.0.2` | npm | YES | `@ag-ui/client@1.0.2` | → `1.0.2` |
| AG-UI core `1.0.2` | npm | YES | `@ag-ui/core@1.0.2` | → `1.0.2` |
| MCP SDK `1.32.1` | npm | YES | `@modelcontextprotocol/sdk@1.32.1` | → `1.32.1` (also `latest`) |
| MCP core/client/server `2.0.0` | npm | YES | `@modelcontextprotocol/core@2.0.0` → `2.0.0`; `@modelcontextprotocol/client@2.0.0`; `@modelcontextprotocol/server@2.0.0` | → `2.0.0` |
| **ext-apps `2.0.3`** | npm | **YES — the ADR pin is already correct and scoped** | **`@modelcontextprotocol/ext-apps@2.0.3`** | The ADR (`docs/decisions/0003-...:39`) already writes the **scoped** name. `npm view ext-apps@2.0.3` (unscoped) → **E404**, which is expected; `npm view @modelcontextprotocol/ext-apps@2.0.3` → `2.0.3`, "MCP Apps SDK — Enable MCP servers to display interactive user interfaces in conversational clients." **Correction to an earlier note of mine: the ADR did not need a scope fix.** |
| zod `4.6.7` | npm | YES | `zod@4.6.7` | → `4.6.7` |
| CopilotKit diagnostic CLI `4.29.0` | npm | YES | `copilotkit@4.29.0` | `npm view copilotkit versions --json` contains `"4.29.0"` |
| Google ADK `2.12.0` | **PyPI** | YES | `google-adk==2.12.0` | PyPI JSON: latest `2.12.0`, `2.12.0` present, `requires_python >=3.11` |
| ag-ui-adk `0.10.0` | **PyPI** | YES | `ag-ui-adk==0.10.0` | PyPI JSON: latest `0.10.0`, `0.10.0` present, `requires_python >=3.10,<3.16` |

## 3. Conclusion

**Every pin in ADR-0003 §G is installable.** The only defect in the pin list is a
missing npm scope on the MCP Apps SDK: `ext-apps` must be
`@modelcontextprotocol/ext-apps`. That is a *naming* defect in the ADR, not an
availability blocker.

Consequences for the execution plan:

1. The "no official SDK available" branch is **not** applicable. The official
   CopilotKit TypeScript runtime, AG-UI client/core, MCP SDK, MCP Apps
   (`@modelcontextprotocol/ext-apps`) and the Google ADK Python package are all
   obtainable at the pinned versions.
2. **One pin set is NOT satisfiable, and the fix is now recorded in ADR-0003.**
   The Python side (`google-adk==2.12.0` + `fastapi==0.146.0`) is contradictory:
   `google-adk 2.12.0` requires `opentelemetry-api>=1.39,<=1.42.1` while
   `fastapi 0.142.0+` requires `opentelemetry-api>=1.44.0`. The `uv` resolver
   rejects the combination outright. ADR-0003 was amended on 2026-10-20 to pin
   `fastapi==0.141.1` (the newest release with no hard otel floor). Evidence:
   `agents/google-adk/DEPENDENCY-NOTES.md` and the dated amendment in
   `docs/decisions/0003-blueprint-v23-execution-contract.md`.
2. `server/agents/copilot/runtime.ts` (echo), `api/platform/copilot/v2.ts` (dead
   static route shadowing the catch-all), `server/platform/app.ts` custom
   `/copilot/v2` keyword router, and `agents/google-adk/app.py` (FastAPI keyword
   router, no `google.adk` import) are all **replaceable with the genuine
   artefacts** rather than requiring a re-scope of the blueprint.
3. `agents/google-adk/requirements.txt` must be corrected to the ADR pins:
   `google-adk==2.12.0`, `ag-ui-adk==0.10.0`, `fastapi==0.146.0`,
   `uvicorn==0.54.0`, `pydantic==2.14.1`, `httpx==0.28.1`, `pytest==9.1.1`.
   Current pins are `fastapi==0.115.6`, `uvicorn==0.34.0`, `pydantic==2.10.4`,
   `httpx==0.28.1`, `pytest==8.3.4` — i.e. ADR pins never applied.
4. `package.json` `test:platform` must be widened: it currently runs only
   `bun test ./tests/jev ./tests/platform ./tests/dashboard-model.test.ts`, which
   **excludes** `tests/copilot/` (9 files, 114 pass), `tests/frontend/`
   (13 files), `tests/architecture/` (1 file) and `tests/landing-brand-theme.test.ts`.
   Any "74 tests / 430 assertions" figure produced by that command cannot include
   them.

## 4. Constraints that still apply

- Zero new paid cloud spend. The SDKs are libraries, not paid services.
- Dependency/lockfile edits are **single-writer** (execution contract §F): one
  worker owns `package.json` + `bun.lock` + `agents/google-adk/requirements.txt`
  at a time, and no other worker may touch them concurrently.
- `node_modules` in the integration lane may be a junction to
  `D:/ABANGCOLEK-OS/node_modules` (brief §G). Do not mutate a shared target;
  install into a workspace-private location and verify the junction state first.
- Pin failure must produce exact incompatibility evidence, never an arbitrary
  "latest" upgrade.
- `copilotkit@4.29.0 verify --round-trip` performs a **real model call** and is
  only permitted after the free-tier/credential/privacy gates pass. It is not
  evidence until then.
