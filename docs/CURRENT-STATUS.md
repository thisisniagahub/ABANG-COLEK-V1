# ABANGCOLEK — Status Semasa dan Baki Kerja

Diselaraskan berdasarkan receipt bertarikh **20 Oktober 2026**. Dokumen ini ialah indeks fakta pelaksanaan semasa; blueprint v2.4 kekal kontrak sasaran. Dokumen ini tidak mengaktifkan fungsi atau menutup acceptance melalui penulisan sahaja.

## Authority dan lokasi kerja

| Lane | Identiti | Makna |
|---|---|---|
| Projek asal | `D:/ABANGCOLEK-PLATFORM`; `integrate/blueprint-v23` pada `60311aa` dengan perubahan belum commit | Source integrasi asal dipelihara; tidak sama dengan main |
| Pelaksana semasa | Codex inline dalam `D:/ABANGCOLEK-WORKTREES/codex-completion-20261020`, branch `work/codex-completion-20261020` | Calon pembetulan dan QA terasing; belum release keseluruhan |
| Release | `main` / `origin/main`: `18c69b32deb7acbd5134da6dea548823a041a614` | Sebelas fail pembetulan konfigurasi/editor TypeScript dan regression checks sahaja |

AGY, Kilo, Copilot CLI dan Hermes bukan executor aktif untuk sambungan ini. Pengguna menghentikan background implementation agents. Jangan melancarkan swarm atau sesi implementation luar daripada prompt lama. Bounded read-only review selepas diff stabil dibenarkan untuk semakan; ia bukan pengaktifan semula implementer. Extension backend `kilo serve` pernah respawn; jangan mendakwa semua proses latar telah hilang tanpa pemeriksaan baharu.

## Apa yang sudah dibuktikan pada main

| Pemeriksaan | Keputusan dan scope |
|---|---|
| Lint / build | Exit 0 / exit 0 pada patch release |
| Platform tests | **Measured 20 Oktober 2026 pada working tree integration (bukan patch release main): 1122 ujian / 1120 lulus / 2 gagal / 7,200 assertions / 156 fail.** Angka "305 pass, 0 fail; 1,778 assertions" dalam receipt release `18c69b3` hanya meliputi 11 fail konfigurasi sahaja dan **bukan** ukuran suite penuh semasa. |
| Browser tempatan | 16 pass, 0 fail; landing, commerce/shell, privacy/offline dan metadata yang dipilih |
| Browser production | 8 pass, 0 fail; public landing/login/access denial/route recovery; bukan transaksi founder sebenar |
| HTTP production | `/` 200; `/login` 200; `/api/platform/catalogue` 200 JSON; `/api/platform/session` 401 JSON untuk request tanpa sesi |
| Vercel Git autodeploy | READY, production, deployment `dpl_PYt7aW43nmPKT5Q6rkpqMaxG1KcC`, SHA tepat `18c69b3`, domain [abangcolek.gangniaga.my](https://abangcolek.gangniaga.my) |
| GitHub Actions | **blocked_external**: kedua-dua job tidak bermula kerana akaun dikunci akibat billing; bukan workflow hijau |

Bukti mesin: [main release receipt](../reports/implementation/main-typescript-release-20261020.json). [Run CI](https://github.com/thisisniagahub/ABANG-COLEK-V1/actions/runs/39447210722) dan [run deployment workflow](https://github.com/thisisniagahub/ABANG-COLEK-V1/actions/runs/39447210656) mempunyai gate akaun. Vercel native Git integration berjaya secara berasingan; itu tidak membetulkan billing GitHub.

**Copilot baharu belum direlease sepenuhnya ke main.** Kehadiran source/dependency dalam lane integrasi tidak membuktikan app production menggunakan keseluruhan ciri itu. Katalog diluluskan, Google login interaktif, transaksi authenticated dan semua konfigurasi cloud masih memerlukan bukti tersendiri.

## Pembaikan provider free — 20 Oktober 2026

Ralat HTTP yang muncul dalam suite telah dibetulkan pada source (bukti live dalam [register provider](AI-PROVIDER-FREE-MODELS-REGISTER.md)): trailing slash pada `baseUrl` Gemini menyebabkan URL berganda dan HTTP 404 untuk semua panggilan Gemini; calon OpenRouter ketiga `nvidia/nemotron-3-super-120b-a12b:free` mati untuk akaun ini (404) dan digantikan dengan `nvidia/nemotron-3-ultra-550b-a55b:free` (200); model NIM/Groq yang EOL (404/410) digantikan.

Suite ujian kini berjalan **offline** (`ABANGCOLEK_DISABLE_LIVE_PROVIDERS=1` dimuat melalui `bunfig.toml`): ujian unit tidak bergantung pada akaun orang lain dan tidak memakan kuota free tier produksi (Gemini: 20 permintaan/hari). Pengesahan live provider ialah gate berasingan, bukan sebahagian suite unit.

Gate luar yang masih terbuka: kuota free tier Gemini (pulih ~19 jam selepas probe 20 Oktober 2026) dan `OPENCODE_ZEN_API_KEY` yang telah tamat tempoh (401 `api_key_expired`) — kunci baharu diperlukan daripada pengguna.

## Ledger 85 requirement: rekod tempatan, bukan certification baharu

Snapshot [acceptance-status.json](../reports/implementation/acceptance-status.json) dijana pada `2026-10-20T13:30:00Z`, source commit `60311aad5a1695eb2804e830488a3133e182397f`. Hash/receipt source itu tidak diperbaharui oleh alignment Markdown ini. Renderer acceptance mesti terus menolak publish jika verification stale/gagal; jangan melangkau gate untuk menghasilkan tick.

| Status snapshot | Bilangan | Tafsiran |
|---|---:|---|
| verified_local | 38 | Label tempatan dalam snapshot; bukan 38 ciri production dan bukan fresh final-source certification |
| implemented_unverified | 37 | Ada implementasi separa atau requirement bernama masih belum selesai |
| blocked_external | 9 | Prasyarat luar belum dipenuhi; kerja tempatan yang bebas masih perlu dibuat |
| not_run | 1 | REF-01: risk engine belum dibuktikan |
| Jumlah | 85 | 78 teras + 7 ekstensi; 47 rekod belum ditutup dalam snapshot |

**Tiada certification penuh Copilot pada preview/production.** [Checklist](../PROJECT-CHECKLIST.md) menggunakan checkbox untuk final integration acceptance: label tempatan lama tidak ditukar secara automatik menjadi tick penuh. [Register](prompts/ACCEPTANCE-REGISTER.md) memaparkan status snapshot dan phase asal setiap ID.

## Jurang source yang tidak boleh ditutup oleh label snapshot

- Cookie `platform_session` masih menggunakan `Path=/api/platform`; laluan `/api/copilotkit` dan `/api/copilot-mcp` memerlukan bukti sesi browser sebenar. Ujian Request dengan cookie manual tidak membuktikan penghantaran cookie browser.
- Adapter rasmi CopilotKit wujud dalam source integrasi, tetapi `PlatformAguiAgent` masih membungkus runtime TypeScript; sasaran `HttpAgent -> Google ADK`, signed grants dan agent ID `abangcolek_ops` belum dibuktikan hujung ke hujung.
- Python menggunakan ADK/translator sebenar dalam ujian tempatan, tetapi `InMemorySessionService`, model polisi tempatan dan pembacaan SQLite oleh specialist belum memenuhi kontrak authority/session/tool bridge sasaran. 23 ujian Python terdahulu bukan live provider/release certification.
- Dependency CopilotKit/AG-UI kini disenaraikan dalam `package.json` lane integrasi. Ini membatalkan pemerhatian lama bahawa dependency/folder `server/agents` tiada, tanpa menutup integration acceptance.
- Candidate mempunyai pembetulan route canonical MCP, whitespace/framing AG-UI dan trust downgrade. Pemeriksaan terpilih lulus; suite candidate terdahulu 1,139 pass bukan fresh certification selepas setiap edit berikutnya dan bukan suite main 305 tests.
- PAY-01/02 mempunyai kerja callback/signature/idempotency tempatan selain gate akaun gateway. Menunggu credential bukan alasan meninggalkan kerja tempatan tersebut.
- FastAPI source requirements menggunakan 0.141.1, berbeza daripada sasaran ADR 0.146.0. Nota resolver ialah bukti ketidakserasian yang dilaporkan, bukan kelulusan senyap menukar kontrak pin.

## Urutan sambungan yang telah ditetapkan

1. **Dokumentasi selesai:**188 dokumen milik projek diselaraskan, inventori/pautan/status diperiksa dan dua finding bounded review dibetulkan. [Laporan](../reports/documentation-alignment-20261020.md). Ini tidak menutup acceptance aplikasi.
2. Dalam candidate, TDD penghantaran cookie sesi sebenar, migrasi cookie lama, logout/revocation dan authorization pada Copilot/MCP; preserve Supabase CAS request boundary.
3. Sambungkan SDK Fetch/HttpAgent kepada ADK dan scoped canonical tools; uji signed grants, IDs, streaming, budget dan fail-closed free-only eligibility.
4. Lengkapkan GUI/shared state/HITL/delegation/modul/domain mengikut prerequisite blueprint; setiap ID memerlukan bukti pada keseluruhan runtime yang berkaitan.
5. Jalankan QA browser authenticated, audit per-ID, recovery dan scoped release. Kos/akaun/entitlement/hosting/polisi yang belum tersedia kekal gate eksplisit.

Tiada pilihan stack/model/protocol baharu diperlukan. Gunakan [master prompt](prompts/IMPLEMENT-ABANGCOLEK.md), [execution contract](prompts/AGENT-EXECUTION-CONTRACT.md) serta skill/MCP/plugin yang benar-benar tersedia dan disahkan. Jangan install atau mendakwa connector authenticated berdasarkan nama semata-mata.

## Semua rekod belum selesai dalam snapshot

Gap berikut ialah teks rekod bertarikh di atas; ia bukan diagnosis live baharu bagi quota atau account. Jurang tambahan hasil source review dinyatakan sebelum jadual ini.

| ID | Status snapshot | Baki requirement / gate yang direkod |
|---|---|---|
| CPK-01 | blocked_external | Gemini free tier HTTP 429 "Quota exceeded ... limit: 20, model: gemini-3.6-flash. Please retry in 19h3m41s"; OpenRouter nvidia/nemotron-3-super-120b-a12b:free HTTP 404 "Function not found for account" |
| CPK-02 | implemented_unverified | The platform app.ts mount of the AG-UI thread store and the resume route are not implemented. |
| CPK-03 | blocked_external | The hosted Automatic Learning offering requires INTELLIGENCE_ACCOUNT_REQUIRED (CopilotKit Intelligence account + terms). |
| CPK-04 | implemented_unverified | The startup-loaded versioned declarative surface catalog and the AG-UI -> renderer middleware path are not implemented. |
| CPK-05 | implemented_unverified | The versioned surface catalog, the depth/cyclic-tree limits and the AG-UI middleware path are not implemented. |
| CPK-06 | implemented_unverified | Only ONE executor is registered (refund.execute); other approved action types still return EXECUTOR_UNAVAILABLE, so the HITL path is not universal. |
| CPK-07 | implemented_unverified | The adapter is never instantiated by a live agent run, so no server round-trip drives it. |
| CPK-08 | implemented_unverified | The view is not mounted against a live server-issued state store, and entity revision is not separated from policy revision. |
| CPK-10 | implemented_unverified | The TypeScript runtime has no parent-to-child delegation, no trace propagation and no budget inheritance. |
| GUI-01 | implemented_unverified | Cards other than the A2UI-rendered ones are still never mounted against a live data path. |
| GUI-02 | implemented_unverified | The form is not mounted and has no server callback, so decision -> revalidation -> receipt is not exercised. |
| GUI-03 | implemented_unverified | The view is not mounted against a live tool-lifecycle event source. |
| GUI-04 | implemented_unverified | No live state store feeds the view, and entity revision is not separated from policy revision. |
| GUI-05 | implemented_unverified | The browser cannot reach /api/mcp (session cookie scoped to Path=/api/platform returns 401) and the client host frame is not mounted. |
| GUI-06 | implemented_unverified | The startup-loaded versioned surface catalog and the AG-UI middleware path are not implemented. |
| GUI-07 | implemented_unverified | The components are not on the same API data path as the rest of the workspace, and theme/reduced-motion coverage on the copilot surface is not proven. |
| MOD-01 | implemented_unverified | No frontend cart-draft tool; the cart diagnosis mode exists but no UI path drives it. |
| MOD-02 | implemented_unverified | Public-token projection is not separated from the private order inside the copilot path. |
| MOD-08 | implemented_unverified | There is no canonical cost ledger, so get_operational_kpi returns null + COST_BASIS_UNAVAILABLE instead of a value. |
| MOD-09 | implemented_unverified | No citation / version / expiry output contract on the search and task results. |
| ADV-05 | implemented_unverified | Not every required conflict class is detected: stale price, ineligible loyalty, fractional/negative quantity, duplicate line and invalid fulfilment are not all implemented. |
| ADV-07 | implemented_unverified | No preview reference hash, revisions or expiry on the preview result. |
| ADV-15 | implemented_unverified | Detects and explains anomalies but does not remediate them. |
| ADV-17 | implemented_unverified | Recomputes variance but does not remediate it. |
| ADV-20 | implemented_unverified | No quota on exports and no download-time re-authorization contract. |
| ADV-21 | implemented_unverified | Scores priority but does not remediate the case. |
| ADV-23 | implemented_unverified | No outbound-send consent guard on the draft. |
| ADV-24 | implemented_unverified | Steps are bound to capability ids but are not grant-aware. |
| ADV-26 | implemented_unverified | Implemented as one reconciliation tool; the three separately-required operations (inspect_action_receipt, refresh_external_action_status, apply_verified_action_outcome) are not all present. |
| PAY-01 | blocked_external | No HTTP callback route is mounted and there is no HMAC X-Signature verification. |
| PAY-02 | blocked_external | No success-redirect route and no provider-callback route exist, so the journey is never exercised end to end. |
| OFF-01 | implemented_unverified | No revalidate-on-reconnect, no server-side revision compare before retry, no per-field conflict resolution. |
| REF-01 | not_run | No risk engine, no OTP, no device/velocity/age signals, no reason codes, no appeal path. |
| SEC-01 | implemented_unverified | No revocation path, and the expiry is creation-time only rather than handover-based. |
| DR-01 | implemented_unverified | RTO is never measured (no 30-minute drill, no timing assertion) and there is no production drill or key-recovery evidence. |
| AI-01 | implemented_unverified | PROVIDER_QUOTA_EXHAUSTED and the dead-candidate skip were still in flight at the time of this audit. |
| AI-02 | implemented_unverified | The provenance guard is static source analysis, not a runtime proof, and the guard test was still red at the time of the audit. |
| AI-03 | implemented_unverified | No unknown_outcome state when the outcome of an execution cannot be determined. |
| PD-01 | implemented_unverified | No opt-out gate at dispatch (publish is blocked outright, so no dispatch path exists to gate) and the asset consent field is still free text. |
| REL-01 | implemented_unverified | No deployment receipt: no preview/production artifact id, no deployment URL, and the Playwright browser suite has never been run against a live server. |
| EXT-01 | implemented_unverified | The dev-only inspector route is not mounted in the platform app. |
| EXT-02 | blocked_external | Hosted User Memories requires INTELLIGENCE_ACCOUNT_AND_TERMS_REQUIRED. |
| EXT-04 | blocked_external | Live Slack/Teams requires CHANNEL_PROVIDER_ACCOUNT_REQUIRED (provider account, app, signature, permission). |
| EXT-05 | blocked_external | The browser-side MCP client API and the live own-app registration are not available in this environment. |
| EXT-07 | implemented_unverified | The copilot route does not yet pass attachmentIds through, and there is no vision inference. |

## Scope alignment Markdown

Semua dokumen projek termasuk `outputs` proposal/research, nota REA `.work` dan empat roster `.kilo/agents` diperiksa. Vendor skills, agent coordination, cache, transkrip peribadi dan nested worktree berasingan dipelihara dengan hash. [Inventori per fail](handover/MARKDOWN-INVENTORY-20261020.md) dan [laporan alignment](../reports/documentation-alignment-20261020.md) merekod skop sebenar; tiada perubahan aplikasi atau cloud dibuat dalam task ini.

## Peraturan kemas kini selepas setiap task

Tulis exact source/dirty hashes, command/result, environment, scope dan reviewer dalam receipt. Kemudian sync ledger melalui verifier/renderer yang sah, register, checklist dan checkpoint. Tick hanya apabila keseluruhan acceptance yang dinyatakan selesai pada environment tersebut. Kejayaan unit/synthetic tidak menutup requirement live/browser/provider; blocked/partial/not-run kekal unchecked. Jika source berubah dan receipt tidak lagi sepadan, rekod status unverified tanpa memadam sejarah.
