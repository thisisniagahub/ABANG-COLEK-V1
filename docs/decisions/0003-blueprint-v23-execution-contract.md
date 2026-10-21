# ADR-0003 — Blueprint v2.4 Execution Contract

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Tarikh asal:19 Oktober 2026; disemak20 Oktober 2026. Status: DECIDED_FOR_IMPLEMENTATION_PROMPTS; compatibility/resolver/runtime/deployment tetap gate berasingan. Filename v23 dikekalkan untuk continuity pautan. Authority: [master blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) v2.4 dan [execution contract](../prompts/AGENT-EXECUTION-CONTRACT.md). Mengatasi cadangan lama yang bercanggah, termasuk local-only/cloud-rejected topology ADR-0002. Data/root runtime tidak diubah oleh ADR ini.

## Keputusan tetap

### Amendment Commerce & Growth — 21 Oktober 2026

Setiap Agent/Stokis aktif wajib mendapat Online Store public sendiri dan Dealer Workspace private dalam canonical platform yang sama. Reuse membership/grants; direct signup tidak memerlukan pembelian terdahulu. Server memisahkan store owner, buyer, customer referrer dan fulfiller serta mengekalkan snapshot order/policy. Referral pelanggan satu peringkat dua hala; margin wholesale, komisen, referral reward dan points berasingan. MadConomy lima tingkat/kadar competitor hanya research; top-up/cash withdrawal/native wajib tidak diaktifkan. Ikut [spec](../design/commerce-growth.md) dan [handover](../prompts/COMMERCE-GROWTH-HANDOVER-20261021.md), dengan subcriteria di bawah 85 ID dan bukti sebenar sebelum tick. Keputusan ini menambah kontrak produk, bukan acceptance siap.

| Bidang | Pilihan pelaksana wajib |
|---|---|
| Source | `D:\ABANGCOLEK-PLATFORM`; preserve dirty changes; jangan clone/recreate/reset |
| Aplikasi | Satu modular monolith React/Vite + Bun; satu package/lock sedia ada; tiada Next.js/Hono/framework migration |
| Source folders | Ikut `docs/design/repository-structure.md` secara batch; kekalkan `api/` discovery dan entry stabil |
| Commerce authority | Runtime local SQLite dipilih secara eksplisit; cloud whole-snapshot Supabase CAS seperti source; jangan anggap backup-only atau ganti Postgres schema sendiri |
| Copilot | React SDK `/v2`, TypeScript Fetch runtime dan Google ADK Python service melalui AG-UI/HttpAgent |
| Agent ID | `abangcolek_ops`; subagents `commerce_reader`, `qc_jev_reviewer`, `marketing_drafter` |
| Port local default | Existing UI 3000, canonical API 3010, Copilot runtime 3020, ADK 8030; bind loopback. Jika occupied tidak sepadan, lapor blocker; jangan kill/reassign sendiri |
| Python | Python 3.12 dalam `agents/google-adk/.venv`; gunakan `uv` jika tersedia, jika tiada gunakan `python -m venv` dan `python -m pip` dengan interpreter explicit |
| Generative UI | Ketujuh-tujuh GUI approaches; A2UI Fixed Schema; dynamic schema dan secondary LLM auto-injection disabled |
| MCP App | First-party read-only Operations Brief, `/api/copilot-mcp` pada runtime service; tiada generic third-party server auto-enable |
| JEV | LOCAL_RULES review-only melalui canonical evaluator; tiada native/vision/calibrated-confidence claim tanpa bukti |
| Public tracking expiry | Token initial14 hari dari creation; pada confirmed handover, token yang masih sah/tidak revoked mendapat expiry14 hari dari handover. Token expired/revoked tidak dihidupkan semula; reissue hanya melalui authenticated owner flow. Event/reissue idempotent, token hash sahaja disimpan |
| Models | Free-only primary `gemini-3.6-flash`, fallback `gemini-3.5-flash-lite`, kemudian `nvidia/nemotron-3-super-120b-a12b:free` melalui OpenRouter; setiap exact offering mesti lulus account/privacy/price/tool gates dan synthetic eval dahulu |
| Model unavailable | Skip candidate tidak layak, cooldown terhad, kemudian local rules/unavailable. Tiada model baharu/paid route dipilih sendiri; tiada inference bagi data tidak sesuai dengan terms |
| Intelligence | Disabled dahulu; activate hanya jika offering sedia ada disahkan percuma, sesuai dan credentials tersedia. Jika tidak, CPK-02/03 blocked_external; jangan ganti custom feature dan claim siap |
| Rollout | Founder read/draft pilot -> approved commands -> role-specific journeys; tiada public unrestricted Copilot |
| Release | Local/preview checks dahulu; production hanya selepas gate lulus dan authorization deployment sah. Dokumen ini bukan deployment receipt |

Model selection order ialah keputusan operational awal, bukan dakwaan ranking terbaik. Benchmark policy boleh menolak calon; jika tiada calon lulus, laporkan blocked capability, bukan tukar calon sendiri. Perubahan senarai memerlukan evidence dan keputusan direkod sebelum aktivasi.

## Pin awal dari metadata registry rasmi

Exact metadata npm/PyPI disemak semula20 Oktober 2026: kesemua9 pin npm dan7 pin Python asal tersedia pada endpoint registry. Metadata exports React/runtime `/v2` hadir dan peer React19 disokong. Ini bukan resolver/import/round-trip proof; tiada pakej dipasang dalam task dokumentasi ini.

| Package | Pin |
|---|---|
| `@copilotkit/react-core`, `@copilotkit/runtime`, `@copilotkit/a2ui-renderer` | `1.79.1` menggunakan exports `/v2` bila tersedia; nombor pakej bukan nama API v2 |
| `@ag-ui/client`, `@ag-ui/core` | `1.0.2`, sepadan dependencies runtime yang diperiksa; jangan gunakan client latest 1.0.3 secara berasingan |
| `zod` | `4.6.7` |
| `@modelcontextprotocol/sdk` | `1.32.1` |
| `@modelcontextprotocol/ext-apps` | `2.0.3` |
| `@modelcontextprotocol/core`, `@modelcontextprotocol/client`, `@modelcontextprotocol/server` | `2.0.0`; peer/host boundary bagi ext-apps2, bukan pengganti SDK1 dalam runtime |
| `copilotkit` development CLI | `4.29.0`; berbeza daripada nombor pakej runtime |
| `google-adk` | `2.12.0` |
| `ag-ui-adk` | `0.10.0` |
| `fastapi`, `uvicorn`, `pydantic` | `0.141.1`, `0.54.0`, `2.14.1` — `fastapi` dipinda daripada `0.146.0` pada 20 Oktober 2026, lihat "Pembetulan pin fastapi" di bawah |
| `httpx` runtime dependency untuk provider adapter | `0.28.1` |
| `pytest` test dependency | `9.1.1` |

Runtime metadata exports `./v2` dan React 19 peer support ditemukan. Bridge metadata memerlukan google-adk >=1.28.1,<3 dan Python dependency lain; ini hanya metadata-level compatibility. Resolver, imports, AG-UI, browser dan Bun behavior masih gate implementasi.

### Pembetulan MCP major boundary —20 Oktober

`@modelcontextprotocol/ext-apps@2.0.3` memerlukan core/client `^2.0.0`; server2 ialah optional peer package tetapi diperlukan untuk first-party host yang dipilih. Pin `@modelcontextprotocol/sdk@1.32.1` sahaja tidak mencukupi. Ketiga-tiga package2.0.0 juga tersedia pada registry ketika semakan. `@copilotkit/runtime@1.79.1` masih bergantung pada SDK1; jangan replace/cast objek server/client antara major.

Keputusan tetap: kekalkan SDK1 pada adapter/runtime yang memerlukannya; first-party MCP App host menggunakan exact v2 trio+ext-apps2.0.3, diasingkan melalui authenticated MCP HTTP wire. Jangan mengimport `McpServer` v2 ke function yang menerima class v1 atau menyelesaikan konflik dengan `as any`. Sebelum GUI-05 dilabel siap: exact lock resolver, smoke import setiap entry point, MCP initialize/version negotiation, tools/list+call, resources/read, UI-resource metadata, host iframe/message/CSP dan scoped session tests mesti lulus. Kegagalan menjadi `MCP_MAJOR_COMPATIBILITY_BLOCKED`; jangan menukar pin/host stack sendiri.

Official references: [runtime metadata](https://registry.npmjs.org/@copilotkit%2fruntime/1.79.1), [ext-apps metadata](https://registry.npmjs.org/@modelcontextprotocol%2fext-apps/2.0.3), [MCP Apps source](https://github.com/modelcontextprotocol/ext-apps). Metadata transitive ranges dibekukan oleh generated lock semasa fasa implementasi; tarikh semakan bukan lockfile.

### Pembetulan pin fastapi —20 Oktober 2026 (resolver evidence, bukan metadata)

Set pin asal **tidak satisfiable**. Bukti sebenar daripada `uv pip install -r agents/google-adk/requirements.txt`:

```
Using Python 3.12.13 environment at: agents\google-adk\.venv
  × No solution found when resolving dependencies:
  ╰─▶ Because google-adk==2.12.0 depends on opentelemetry-api>=1.39,<=1.42.1
      and fastapi==0.146.0 depends on opentelemetry-api>=1.44.0, we can
      conclude that fastapi==0.146.0 and google-adk==2.12.0 are incompatible.
```

Akar masalah disahkan terhadap metadata PyPI, bukan diteka:

- `google-adk 2.12.0` → `opentelemetry-api>=1.39,<=1.42.1` (siling keras)
- `fastapi 0.142.0` ke atas → `opentelemetry-api>=1.44.0` (floor keras, bukan extra)
- `fastapi 0.141.1` ke bawah → tiada dependency `opentelemetry-api` langsung

**Keputusan:** pin ADK adalah yang paling kritikal — keseluruhan tujuan servis ini ialah runtime Google ADK sebenar. `fastapi` ialah detail pengangkutan, dan `google-adk` sendiri hanya memerlukan `fastapi>=0.133,<1`. Maka `fastapi` dipinda ke **`0.141.1`**, release terkini tanpa floor `opentelemetry-api` keras, yang memenuhi kedua-dua syarat `fastapi>=0.133` dan siling `opentelemetry-api<=1.42.1`.

Semua pin lain kekal tepat. Bukti penuh: `agents/google-adk/DEPENDENCY-NOTES.md`.

Kesan: `agents/google-adk/requirements.txt` kini memuat `fastapi==0.141.1`, `uvicorn==0.54.0`, `pydantic==2.14.1`, `httpx==0.28.1`, `google-adk==2.12.0`, `ag-ui-adk==0.10.0`, `pytest==9.1.1` — 75 pakej resolved, 23 ujian pytest lulus.

Nota tambahan: pakej `ag-ui-adk` melaporkan `__version__ == '0.1.0'` dalam kodnya sendiri, tetapi **versi distributions** yang dipasang ialah `0.10.0` (sahkan dengan `importlib.metadata.version("ag-ui-adk")`). Pin kekal pada `0.10.0`.

Nota persekitaran: interpreter sistem `C:\Users\megat\AppData\Local\Programs\Python\Python312\python.exe` rosak pada hos ini (exit `-1066598274`, `0xC06D007E`, STATUS_DLL_NOT_FOUND) — `python -c "print(1)"` pun gagal. Virtualenv `uv`-managed dengan CPython 3.12.13 (`agents/google-adk/.venv`) ialah satu-satunya interpreter yang berfungsi untuk servis ini.

### Keputusan operational tambahan

#### Adapter model ADK yang tetap

Gemini candidates menggunakan native ADK Gemini model adapter daripada `google-adk@2.12.0`; exact class/import/config dibuktikan melalui pinned source, bukan menyalin snippet main branch. Fallback OpenRouter **tidak** didaftarkan sebagai bare ADK model string dan tidak menggunakan LiteLLM. Gunakan app-owned subclass `BaseLlm` pada `agents/google-adk/models/free_openrouter.py`, berasaskan existing pinned `httpx@0.28.1`; tiada dependency model-router tambahan.

Wire target tetap ialah HTTPS `https://openrouter.ai/api/v1/chat/completions`, model field tepat `nvidia/nemotron-3-super-120b-a12b:free`, key server-side `OPENROUTER_API_KEY`. Bukan `openrouter/` prefix, arbitrary base URL atau provider global pilihan browser. Instance adapter diberikan kepada ADK agent; runtime TypeScript tidak melakukan provider call kedua.

Adapter memetakan ADK `LlmRequest`/`LlmResponse` kepada messages, allowlisted function declarations, tool-call IDs/results, genuine incremental deltas, final response, finish reason dan usage. Tolak unknown/malformed tool calls; jangan memanggil tool daripada parser transport. Stream parsing mesti mengendalikan fragmented JSON/multiple tool calls/cancel/deadline/429/disconnect, tidak memecah completed text untuk meniru native streaming. Raw model thoughts tidak dipaparkan atau disimpan sebagai reasoning. Semua attempts/usage menggunakan shared reservation/budget.

Kelayakan account/endpoint/fees/overflow/privacy dan tool/schema support masih wajib. Optional paid plugins, grounding dan auxiliary inference tidak diaktifkan. Provider routing fields hanya digunakan selepas schema rasmi disahkan; jika zero-fee/no-overflow tidak boleh dikuatkuasakan, candidate disabled. Jangan menukar model atau memilih LiteLLM sebagai workaround.

Planned tests tepat: `agents/google-adk/tests/test_free_openrouter_model.py` untuk request/response/tool mapping, fragmented stream/final consistency, malformed output, cancellation, shared budget dan no hidden network calls. SDK imports/synthetic HTTP transport diuji tanpa key/live provider. Exact pin yang tiada extension signature menghasilkan `MODEL_ADAPTER_INCOMPATIBLE`; fallback kekal unavailable sementara Gemini yang qualified boleh diteruskan. [Source rasmi BaseLlm](https://github.com/google/adk-python/blob/main/src/google/adk/models/base_llm.py) diperiksa20Oktober pada main sebagai design reference, bukan proof exact2.12.0 imports.

- Budgets/context/deadline dan technical approval TTL tepat ditetapkan dalam execution contract§4. Tiada automatic budget increase atau default hidden model call.
- Financial eligibility menggunakan integer cross-multiplication sebelum display rounding. Allocation menggunakan largest remainder dengan tie-break stable line ID; entitlement/rates masih polisi bisnes berversi.
- Modul tambahan ialah specialization yang dipetakan kepada32 logical ADV capabilities dalam registry; agent tidak memilih sama ada menambah logical capability ke33.
- AG-UI protocol lifecycle boleh diuji dengan synthetic model tanpa Intelligence. CPK-02 Streams danCPK-03 Learning hanya verified melalui actual Intelligence offering/project yang lulus semua gate; persistence/manual SOP tidak ditukar label.
- Google ADK A2UI Fixed Schema surfaces ialah read-only bagi pilot; interactive approval/draft controls menggunakan supported frontend callbacks yang kembali ke canonical server. Jangan menggunakan showcase button inert sebagai evidence HITL.
- Production Bun setting kekal `bunVersion: "1.x"`; SPA fallback dengan `cleanUrls:true` menggunakan destination `/`. Jangan undurkan pembaikan release `main` ketika menggabungkan branch integrasi.

Pin dependencies langsung, simpan lockfiles, semak optional peers sebelum pemasangan. Jangan pasang semua peer optional atau enable model SDK berbayar semata-mata ia disenaraikan. Jika exact pin tidak resolve/import/protocol-compatible, jangan upgrade/downgrade secara teka-teki; rekod error, research root cause dan sediakan keputusan pembetulan yang boleh direview. Teruskan batch bebas yang tidak terjejas.

## Skill, MCP dan plugin policy

Ikut manifest [prompt utama](../prompts/IMPLEMENT-ABANGCOLEK.md). Skill fail yang wujud dibaca mengikut task. Configured MCP bukan connected MCP. Plugin bukan dependency aplikasi dan bukan bukti tools tersedia. Tiada install/auth MCP, channel Slack/Teams atau pembelian untuk memenuhi senarai kosmetik.

## Rollback

Kekalkan DB/evidence dan receipts. Matikan feature flags baharu, pulihkan UI/entry yang sesuai tanpa mengaktifkan fake financial actions. Setiap move mempunyai manifest/hashes; reverse moves hanya jika tiada perubahan pengguna selepas batch. Schema/data rollback mempunyai gate tersendiri; jangan gunakan git reset sebagai recovery business data.
