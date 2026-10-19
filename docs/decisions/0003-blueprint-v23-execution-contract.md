# ADR-0003 — Blueprint v2.3 Execution Contract

Tarikh: 19 Oktober 2026. Status: DECIDED_FOR_IMPLEMENTATION_PROMPTS; belum runtime/deployment verified. Authority: [master blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md). Mengatasi cadangan lama yang bercanggah, termasuk local-only/cloud-rejected topology dalam ADR-0002. Data/root runtime tidak diubah oleh ADR ini.

## Keputusan tetap

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

Metadata npm/PyPI dibaca pada 19 Oktober 2026; tiada pakej dipasang atau compatibility runtime diuji dalam dokumentasi ini.

| Package | Pin |
|---|---|
| `@copilotkit/react-core`, `@copilotkit/runtime`, `@copilotkit/a2ui-renderer` | `1.79.1` menggunakan exports `/v2` bila tersedia; nombor pakej bukan nama API v2 |
| `@ag-ui/client`, `@ag-ui/core` | `1.0.2`, sepadan dependencies runtime yang diperiksa; jangan gunakan client latest 1.0.3 secara berasingan |
| `zod` | `4.6.7` |
| `@modelcontextprotocol/sdk` | `1.32.1` |
| `@modelcontextprotocol/ext-apps` | `2.0.3` |
| `copilotkit` development CLI | `4.29.0`; berbeza daripada nombor pakej runtime |
| `google-adk` | `2.12.0` |
| `ag-ui-adk` | `0.10.0` |
| `fastapi`, `uvicorn`, `pydantic` | `0.146.0`, `0.54.0`, `2.14.1` |
| `pytest`, `httpx` test dependencies | `9.1.1`, `0.28.1` |

Runtime metadata exports `./v2` dan React 19 peer support ditemukan. Bridge metadata memerlukan google-adk >=1.28.1,<3 dan Python dependency lain; ini hanya metadata-level compatibility. Resolver, imports, AG-UI, browser dan Bun behavior masih gate implementasi.

Pin dependencies langsung, simpan lockfiles, semak optional peers sebelum pemasangan. Jangan pasang semua peer optional atau enable model SDK berbayar semata-mata ia disenaraikan. Jika exact pin tidak resolve/import/protocol-compatible, jangan upgrade/downgrade secara teka-teki; rekod error, research root cause dan sediakan keputusan pembetulan yang boleh direview. Teruskan batch bebas yang tidak terjejas.

## Skill, MCP dan plugin policy

Ikut manifest [prompt utama](../prompts/IMPLEMENT-ABANGCOLEK.md). Skill fail yang wujud dibaca mengikut task. Configured MCP bukan connected MCP. Plugin bukan dependency aplikasi dan bukan bukti tools tersedia. Tiada install/auth MCP, channel Slack/Teams atau pembelian untuk memenuhi senarai kosmetik.

## Rollback

Kekalkan DB/evidence dan receipts. Matikan feature flags baharu, pulihkan UI/entry yang sesuai tanpa mengaktifkan fake financial actions. Setiap move mempunyai manifest/hashes; reverse moves hanya jika tiada perubahan pengguna selepas batch. Schema/data rollback mempunyai gate tersendiri; jangan gunakan git reset sebagai recovery business data.
