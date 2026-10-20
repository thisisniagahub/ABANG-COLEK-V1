# Dependency notes — AbangColek Google ADK agent service

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../docs/CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Recorded from a real run on 2026-10-20 (Windows, `uv 0.11.28`, CPython
3.12.13). Every command below was executed as written.

## 1. Workspace-private virtual environment

```powershell
uv venv --python 3.12 agents/google-adk/.venv
```

```
Using CPython 3.12.13
Creating virtual environment at: agents\google-adk\.venv
Activate with: agents\google-adk\.venv\Scripts\activate
```

The venv lives inside `agents/google-adk/` and is excluded by
`agents/google-adk/.gitignore`. The system Python was **not** modified, and no
JavaScript lockfile was created.

> Note: the system interpreter at
> `C:\Users\megat\AppData\Local\Programs\Python\Python312\python.exe` fails to
> start on this machine with exit code `-1066598274`
> (`0xC06D007E`, STATUS_DLL_NOT_FOUND raised as a delay-load failure) — even
> `python -c "print('hello')"` fails. The `uv`-managed CPython 3.12.13 is
> therefore the only working interpreter for this service.

## 2. The ADR-0003 pin set is NOT satisfiable as written

ADR-0003 / the Blueprint v2.3 execution contract ask for:

```
google-adk==2.12.0
ag-ui-adk==0.10.0
fastapi==0.146.0
uvicorn==0.54.0
pydantic==2.14.1
httpx==0.28.1
pytest==9.1.1
```

The resolver rejects that combination:

```powershell
uv pip install -r agents/google-adk/requirements.txt
```

```
Using Python 3.12.13 environment at: agents\google-adk\.venv
  × No solution found when resolving dependencies:
  ╰─▶ Because google-adk==2.12.0 depends on opentelemetry-api>=1.39,<=1.42.1
      and fastapi==0.146.0 depends on opentelemetry-api>=1.44.0, we can
      conclude that fastapi==0.146.0 and google-adk==2.12.0 are incompatible.
      And because you require google-adk==2.12.0 and fastapi==0.146.0, we can
      conclude that your requirements are unsatisfiable.
```

Root cause (verified against PyPI metadata, not guessed):

* `google-adk 2.12.0` → `opentelemetry-api>=1.39,<=1.42.1`,
  `opentelemetry-sdk>=1.39,<=1.42.1`
* `fastapi 0.142.0` and newer → `opentelemetry-api>=1.44.0` (a hard
  dependency, not an extra)
* `fastapi 0.141.1` and older → no `opentelemetry-api` dependency at all

### Decision

The ADK pins are the load-bearing ones — the entire point of this service is a
genuine Google ADK runtime. `fastapi` is a transport detail and `google-adk`
itself requires only `fastapi>=0.133,<1`.

`fastapi` is therefore pinned to **`0.141.1`**, the newest release with no hard
`opentelemetry-api` floor, which satisfies both `google-adk`'s
`fastapi>=0.133` and its `opentelemetry-api<=1.42.1` ceiling.

Every other ADR pin is honoured exactly.

**Action for the orchestrator / ADR owner:** ADR-0003's `fastapi==0.146.0` pin
should be amended to `fastapi==0.141.1`, or `google-adk` should be bumped to a
release that allows `opentelemetry-api>=1.44.0`. This file is the evidence.

## 3. Pinned requirements

```
google-adk==2.12.0
ag-ui-adk==0.10.0
fastapi==0.141.1
uvicorn==0.54.0
pydantic==2.14.1
httpx==0.28.1
pytest==9.1.1
```

## 4. Install output

```powershell
$env:VIRTUAL_ENV="D:\ABANGCOLEK-PLATFORM\agents\google-adk\.venv"
uv pip install -r agents/google-adk/requirements.txt
```

```
Using Python 3.12.13 environment at: agents\google-adk\.venv
Resolved 75 packages in 2.76s
Prepared 75 packages in 374ms
Uninstalled 75 packages in 4.92s
warning: Failed to hardlink files; falling back to full copy. This may lead to degraded performance.
         If the cache and target directories are on different filesystems, hardlinking may not be supported.
         If this is intentional, set `export UV_LINK_MODE=copy` or use `--link-mode=copy` to suppress this warning.
Installed 75 packages in 14.53s
 ~ a2a-sdk==1.2.3
 ~ a2ui-agent-sdk==0.2.2
 ~ ag-ui-a2ui-toolkit==0.0.5
 ~ ag-ui-adk==0.10.0
 ~ ag-ui-protocol==1.0.0
 ~ aiohappyeyeballs==2.7.1
 ~ aiohttp==3.14.5
 ~ aiologic==0.17.1
 ~ aiosignal==1.4.0
 ~ aiosqlite==0.22.1
 ~ annotated-doc==0.0.5
 ~ annotated-types==0.8.0
 ~ anyio==4.15.1
 ~ asyncio==4.0.0
 ~ attrs==26.1.0
 ~ authlib==1.9.1
 ~ certifi==2026.10.19
 ~ cffi==2.1.1
 ~ charset-normalizer==3.5.2
 ~ click==8.5.0
 ~ colorama==0.4.6
 ~ cryptography==50.0.2
 ~ culsans==0.11.0
 ~ distro==1.9.0
 ~ fastapi==0.141.1
 ~ frozenlist==1.8.0
 ~ google-adk==2.12.0
 ~ google-api-core==2.34.0
 ~ google-auth==2.62.0
 ~ google-genai==2.31.0
 ~ googleapis-common-protos==1.75.5
 ~ graphviz==0.21
 ~ h11==0.16.0
 ~ httpcore==1.0.9
 ~ httpx==0.28.1
 ~ idna==3.20
 ~ iniconfig==2.3.1
 ~ joserfc==1.7.7
 ~ json-rpc==1.15.0
 ~ jsonschema==4.26.0
 ~ jsonschema-specifications==2025.9.1
 ~ multidict==7.1.0
 ~ opentelemetry-api==1.42.1
 ~ opentelemetry-sdk==1.42.1
 ~ opentelemetry-semantic-conventions==0.63b1
 ~ packaging==26.3
 ~ pluggy==1.7.0
 ~ propcache==0.5.4
 ~ proto-plus==1.29.0
 ~ protobuf==7.36.2
 ~ pyasn1==0.6.4
 ~ pyasn1-modules==0.4.2
 ~ pycparser==3.11
 ~ pydantic==2.14.1
 ~ pydantic-core==2.50.1
 ~ pygments==2.21.0
 ~ pytest==9.1.1
 ~ python-dotenv==1.2.4
 ~ python-multipart==0.0.32
 ~ pyyaml==6.0.3
 ~ referencing==0.37.0
 ~ requests==2.34.2
 ~ rpds-py==2026.9.1
 ~ sniffio==1.3.1
 ~ sse-starlette==3.5.0
 ~ starlette==1.9.0
 ~ tenacity==9.1.4
 ~ typing-extensions==4.16.0
 ~ typing-inspection==0.4.4
 ~ urllib3==2.8.0
 ~ uvicorn==0.54.0
 ~ watchdog==6.0.0
 ~ websockets==15.0.1
 ~ wrapt==2.5.1
 ~ yarl==1.25.1
```

(A re-run of the same command reports `Checked 7 packages in 6.15s`, i.e. the
requirement set is already satisfied and reproducible.)

## 5. Import proof

```powershell
agents/google-adk/.venv/Scripts/python.exe -c "import google.adk, ag_ui_adk; print(...)"
```

```
google.adk 2.12.0
google.adk file D:\ABANGCOLEK-PLATFORM\agents\google-adk\.venv\Lib\site-packages\google\adk\__init__.py
ag_ui_adk 0.1.0 D:\ABANGCOLEK-PLATFORM\agents\google-adk\.venv\Lib\site-packages\ag_ui_adk\__init__.py
fastapi 0.141.1
pydantic 2.14.1
```

Note: `ag_ui_adk.__version__` reports `0.1.0` (the package's own internal
constant); the installed **distribution** version is `0.10.0`, confirmed via
`importlib.metadata.version("ag-ui-adk")`.

## 6. ADK class provenance

```
LlmAgent file: ...\.venv\Lib\site-packages\google\adk\agents\llm_agent.py
LlmAgent mro: (LlmAgent, BaseAgent, BaseNode, pydantic.BaseModel, ABC, object)
BaseLlm file: ...\.venv\Lib\site-packages\google\adk\models\base_llm.py
EventTranslator file: ...\.venv\Lib\site-packages\ag_ui_adk\event_translator.py
```
