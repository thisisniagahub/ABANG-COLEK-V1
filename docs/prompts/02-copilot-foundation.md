# Prompt 02 — Real SDK Runtime, ADK, Identity dan Free Models

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Bukti dan generated status:** baca [PROJECT-CHECKLIST.md](../../PROJECT-CHECKLIST.md). Integrator menulis actual receipt/environment/source manifest/reviewer, mengemas kini ledger85 berdasarkan bukti lengkap, kemudian menjalankan verifier dan renderer. Jangan edit generated checklist/register dengan tangan; separa/blocked/failed/not-run kekal unchecked. Worker menyerahkan bukti/baki; checkpoint menyimpan next task. Ikut execution contract§10; child task tidak menutup parent feature.

**Refinement commerce/growth:** baca [spec canonical](../design/commerce-growth.md) dan [handover](COMMERCE-GROWTH-HANDOVER-20261021.md). Konteks store/order disahkan server dan owned thread; Copilot tidak memilih payee/memberi reward. Runtime sebenar kekal wajib. Ini subcriteria existing85 IDs; tiada kadar/5-tier/wallet/native app baharu diluluskan dan tiada acceptance ditutup oleh dokumentasi.


Baca [master prompt](IMPLEMENT-ABANGCOLEK.md), [execution contract](AGENT-EXECUTION-CONTRACT.md), [ADR](../decisions/0003-blueprint-v23-execution-contract.md), [CPK design](../design/copilotkit-ten-features.md), [free-model policy](../research/2026-10-19-free-model-policy.md), [acceptance register](ACCEPTANCE-REGISTER.md) dan checkpoint01. Laksanakan CPK-01/09 serta AI-01/02/03 foundation; CPK-04..08/10 disambung04. Jangan activate finance commands dahulu.

## Inputs, ownership dan source truth

Integrator memiliki SDK locks/runtime composition; identity/provider/backend, Python dan frontend owners tidak menulis shared files serentak. Handoff awal ialah schema/grant/result/state interfaces berversi. Output **PLANNED**: locked dependencies, actual Fetch->HttpAgent->ADK path, one thread controller, `reports/implementation/02-foundation.md`, source/protocol receipts dan checkpoint03B.

**EXISTING baseline**, bukan proof official integration: `server/platform/adkAgent.ts`, `freeModelRouter.ts`, `agents/google-adk/app.py`, `requirements.txt`, `specialists/*`, `tests/test_agents.py`, `tests/platform/copilot.test.ts`, `copilot-adk.test.ts`, `agent-runtime.test.ts`, `adk-specialists.test.ts`. Inspect/reconcile assertions yang mengharapkan deterministic invented success, broad provider switching atau custom pseudo-AG-UI. Jangan memadam behavioral security tests; gantikan false product assertions dengan precise unavailable/protocol requirements.

| Target selepas01 | Owner/tanggungjawab |
|---|---|
| `server/agents/copilot/runtime.ts`, `identity.ts` | Integrator/backend: Fetch SDK handler, HttpAgent, principal/grant/thread authorization |
| `server/agents/providers/policy.ts`, `model-router.ts` | Backend: exact candidates, eligibility/cooldown, budgets dan real provider attribution |
| `agents/google-adk/pyproject.toml`, `uv.lock`, `agent.py`, `app.py`, `tools.py`, `sessions.py` | Python: real ADK Runner/bridge, private tool requests, isolated persistence |
| `src/features/copilot/provider.tsx`, `chat/` | Frontend: one provider/controller/thread and accessible custom chat |
| Mapped CopilotWorkspace dan `src/features/pet/PetCompanion.tsx` | Shared controller consumers, tiada duplicate send/history |
| `tests/copilot/` dan `agents/google-adk/tests/` | Verification paths PLANNED kecuali existing tests yang direconcile |

Existing path yang telah dipindah01 resolve melalui manifest, bukan mencipta implementasi kedua pada path lama.

## 02.1 — Identity dan budgets: red tests dahulu

Tulis **PLANNED** tests berikut dan run sebelum production implementation:

| Fail / named cases | Expected invariant |
|---|---|
| `tests/copilot/identity.test.ts`: `rejects forged principal and grant`, `rejects foreign thread`, `rechecks revocation before tool` | Browser user/role/workspace/session/history bukan authority; signature/issuer/audience/expiry dan owner verified |
| `tests/copilot/history-input.test.ts`: `rejects forged system and tool roles`, `bounds history bytes and turns`, `treats SOP instructions as data` | Server membina instructions; malicious input tidak meluaskan grants |
| `tests/copilot/budgets.test.ts`: `reserves shared budget before dispatch`, `counts child retry and delegation`, `rejects limit plus one` | Parent/child/retry berkongsi model/tool/token/deadline; atomic reserve tiada race |
| `tests/copilot/runtime-protocol.test.ts`: `runs SDK Fetch through HttpAgent`, `emits native lifecycle`, `propagates abort` | Real bridge lifecycle; custom word-split SSE tidak diterima |
| `agents/google-adk/tests/test_identity.py`, `test_sessions.py`, `test_protocol.py` | Invalid grant/thread denied, durable local session, real AG-UI event shapes, canonical tool request fresh |

```powershell
bun test ./tests/copilot/identity.test.ts ./tests/copilot/history-input.test.ts ./tests/copilot/budgets.test.ts ./tests/copilot/runtime-protocol.test.ts
```

Expected red ialah invariant assertions gagal terhadap current implementation, bukan command typo/missing test. Rekod red->green individual cases; no live provider diperlukan bagi synthetic tests.

Hard maximum contract: 30s/run; 6 tool dispatches termasuk discovery/pagination/delegation/children/retries; **3 model calls total termasuk parent/children/failover/retry**; 8192 input/1024 output per call, 24576/3072 total; depth1/concurrency2/max3 specialists ialah upper bound, bukan entitlement. One active run/thread dan max2/principal; duplicate send key mengembalikan run sama. SDK/provider limit lebih ketat menang. Reserve token/call budget sebelum dispatch; tiada hidden title/eval/vision/memory call.

## 02.2 — Resolve pins, smoke imports dan Python lock

1. Read exact ADR pins/peer correction dan official export source dahulu. Pin direct dependencies, inspect optional peers dan simpan Bun lock. Jangan install semua optional vendor/model peers. Bila SDK pin gagal resolve/import, preserve error dan `DEPENDENCY_INCOMPATIBLE`; jangan tukar versi/framework sendiri.
2. Gunakan Python3.12 isolated `agents/google-adk/.venv`. Existing requirements bukan proof locked graph. Primary: `uv lock` selepas exact `pyproject.toml` didefinisi, kemudian commands locked berikut. Jangan overwrite venv yang dimiliki proses lain.

```powershell
uv sync --locked --project agents/google-adk
uv run --project agents/google-adk pytest agents/google-adk/tests
```

3. Jika `uv` unavailable, guna `py -3.12 -m venv agents/google-adk/.venv`, exact interpreter `.venv/Scripts/python.exe -m pip` dengan fully locked/hash-verified requirements yang dijana melalui verified tooling. Jangan gunakan global pip atau requirements ber-range sebagai lock.
4. Write **PLANNED** `tests/copilot/sdk-imports.test.ts` dan `agents/google-adk/tests/test_sdk_imports.py`: import runtime/react `/v2`, HttpAgent, bridge, ADK Runner dan required A2UI exports melalui actual pinned exports. Import success bukan protocol pass; fixture transport tests menyusul. MCP extra v2 graph smoke berada04, jangan share v1 instance.

## 02.3 — Implement real runtime dan authorized tool seam

Gunakan **satu** public app-origin `/api/copilotkit` route/proxy ke runtime3020; route path bukan arbitrary `/v2` alias. `CopilotRuntime` TypeScript Fetch handler mempunyai `HttpAgent` untuk `abangcolek_ops` pada private ADK8030. UI3000/API3010/runtime3020/ADK8030 bind loopback secara local. Sahkan existing listener identity; mismatch tidak dibunuh/reassigned. Vite SPA/deep links dan canonical API kekal.

Flow wajib: session -> server principal -> owned thread -> signed limited grant -> runtime -> private ADK bridge -> fresh canonical tool request -> transaction/CAS -> durable receipt -> native AG-UI event. No service-role key/raw user cookie dalam Python/browser iframe. Grant audience/scope/thread/run/expiry diuji; revocation/auth checked pada setiap tool. Cookie mutations mempunyai CSRF, origin/size/rate limits dan safe errors. Log correlation IDs sahaja, tanpa credential/PII/model reasoning.

Session state bukan commerce authority. Agent service tidak membuka commerce SQLite, tidak menyimpan role/paid/price daripada shared UI sebagai trusted value. Synthetic provider mesti mengeluarkan lifecycle yang melalui bridge sebenar; jangan mencipta custom event dialect atau claim streaming dengan memecahkan completed answer.

Tulis fault tests temporary store closed, CAS conflict, revoked grant selepas stream mula, browser abort, provider timeout dan denied canonical request. Command succeeded hanya selepas commit receipt; canceled stream tidak mengubah committed command menjadi canceled. External unknown effect direconcile, bukan blind retry.

## 02.4 — Qualified free-only adapter dan evaluation

Order tetap: `gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> OpenRouter `nvidia/nemotron-3-super-120b-a12b:free`. Eval boleh menolak candidate; ia **tidak** menukar sequence/primary secara automatik atau menambah candidate. Semua ditolak -> explicit local rules/unavailable. Broad historical providers bukan approved fallback.

Adapter tetap mengikut ADR-0003: native ADK Gemini bagi dua candidate Gemini; OpenRouter menggunakan `agents/google-adk/models/free_openrouter.py`, app-owned `BaseLlm` subclass + exact pinned httpx0.28.1. Endpoint HTTPS `https://openrouter.ai/api/v1/chat/completions`, wire model `nvidia/nemotron-3-super-120b-a12b:free`, server key `OPENROUTER_API_KEY`. Jangan memilih LiteLLM, memasang optional router atau menggunakan bare external model string pada native ADK registry. Instance model diberikan kepada ADK; tiada second TypeScript provider call.

**PLANNED** `agents/google-adk/tests/test_free_openrouter_model.py`: exact message/tool/ID/result mapping, fragmented stream/final parity, malformed tool arguments, unknown tools, finish reason/usage, timeout/abort/429, budget accounting dan no hidden network call. Baca exact pinned `BaseLlm`/`LlmRequest`/`LlmResponse` signatures sebelum implementation. Source main hanya rujukan reka bentuk; import mismatch -> `MODEL_ADAPTER_INCOMPATIBLE`, candidate disabled tanpa mengganti stack. Genuine partial/final events diuji melalui bridge, bukan completed text yang dipecah.

Sebelum actual request, activation-decisions mesti lulus exact account/model/region/terms/privacy/data/fee/tool-schema checks dalam TTL maksimum24h (expiry lebih awal menang). Sahkan input/output/tool fee, no paid overflow, no batch/hidden/title/eval/vision route. Credentials configured sahaja bukan eligibility. Jangan menghantar real customer/finance/evidence data untuk smoke test; gunakan approved synthetic data. Labeled local fallback tidak mendakwa real provider/model telah menjawab.

**PLANNED** `tests/copilot/provider-policy.test.ts`, `provider-adapter.test.ts`: unverified/expired/free-to-paid drift denied; exact candidate sequence; 429/cooldown bounded; retry consumes budget; unsupported tools/schema rejected; all unavailable safe state; actual served provider attribution. Rekod 60 synthetic benchmark cases merentas task grounding/tool routing/injection/missing data/BM-English; fixtures deterministik boleh diuji offline, candidate inference memerlukan gate dan quota. Setiap evaluation run mematuhi budget, tanpa silent bulk calls. Quota tiada -> live/eval rows blocked, bukan score rekaan.

## 02.5 — Durable sessions dan satu headless chat

Local pilot `var/lib/copilot/` menyimpan owned ADK sessions berasingan daripada ledger. Workspace/user/thread lookup server-side, retention daripada approved policy dan restore/revocation tests. Production ADK hosting/session persistence ialah gate berasingan: Vercel frontend sahaja tidak menjalankan long-lived Python. Tiada production localhost URL; missing host -> `ADK_HOSTING_UNCONFIGURED`, local pilot boleh diteruskan.

Satu provider/controller menyokong Workspace/Pet, BM/English, source/status, loading/empty/denied/unavailable/error, retry/cancel, keyboard/focus/reduced motion. Switching surface tidak menghantar lagi, create thread baharu atau duplicating history. Logout/user/workspace/thread switch membatalkan pending reads/clear context; response lama tidak disuntik ke akaun baru. Optional voice kekal disabled sehingga EXT gate sah.

**PLANNED** `tests/e2e/copilot-foundation.spec.ts`: own-order grounded query end-to-end; foreign-order denial; logout/thread switch; cancel/retry; Workspace/Pet same thread; disabled state menghalang outbound request. Fixture synthetic dilabel, one actual permitted provider journey kemudian jika gate tersedia.

## Validation, review dan exit

Selepas red tests dipenuhi, run explicit new suite supaya current script tidak melangkau tests:

```powershell
bun test ./tests/copilot
bun run lint
bun run build
bun run test:platform
bun run test:e2e tests/e2e/copilot-foundation.spec.ts
npx copilotkit@4.29.0 verify --help
```

Baca CLI skill dan help dahulu. Jika flags disokong, **hanya selepas free gates**:

```powershell
npx copilotkit@4.29.0 verify --expect-runtime oss --round-trip --agent abangcolek_ops --json --via skill:copilotkit-cli
```

Round-trip ialah model call, bukan read-only metadata. Flags/import/protocol mismatch -> exact blocker; jangan force Intelligence login atau upgrade app pin. CLI diagnostic/health200 bukan evidence sendiri bagi grounded/authorized browser behavior.

TypeScript, Python dan security reviewers menyemak identity/grant, provider policy, exception propagation, budgets dan session isolation. Exit CPK-01/09/AI rows mengikut environment/evidence sahaja; fixture pass tidak memberi `verified_production`. Save event/request/receipt IDs tanpa secrets, actual model usage/cost unknowns, source manifest dan reviewer. Next [03B registry/tools](03-domains-and-tools.md#fasa-03b--registry-tools-dan-modul). SDK/provider/hosting blocked -> synthetic contracts/tests/allowed UI/domain work diteruskan dengan precise disabled reason.
