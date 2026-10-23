# ABANGCOLEK — Status Semasa dan Baki Kerja

Diselaraskan berdasarkan receipt bertarikh **21 Oktober 2026**. Dokumen ini ialah indeks fakta pelaksanaan semasa; blueprint v2.4 kekal kontrak sasaran. Dokumen ini tidak mengaktifkan fungsi atau menutup acceptance melalui penulisan sahaja.

## Pakej sintesis & backlog — 21 Oktober 2026

### Scope amendment Commerce & Growth — dokumentasi sahaja

[Spesifikasi canonical](design/commerce-growth.md) dan [handover pembangunan](prompts/COMMERCE-GROWTH-HANDOVER-20261021.md) menetapkan kedai public setiap Agent/Stokis + private workspace, direct signup, server-resolved store/referrer/fulfiller, referral satu peringkat dua hala, reorder dan consented retention. Research [dealer](research/2026-10-21-dealer-storefronts-proven-models.md)/[Ahmad’s](research/2026-10-21-ahmad-app-concept-review.md) bukan approval kadar, lima tingkat atau wallet.

**CG-01..12 masih subcriteria terancang yang memerlukan bukti.** Banner `?ref`/cart-draft/unit tests lama tidak membuktikan provisioned store A/B atau seluruh journey baharu. Nilai semula affected MOD/REF/LOY/PAY/SEC/PD/CPK/GUI/REL/DR rows menggunakan ledger 85 sedia ada. Task alignment ini tidak mengubah status/count/receipt generated di bawah, tidak mengesahkan listener atau production dan tidak melancarkan implementation agents.

| Dokumen | Kegunaan | Status |
|---|---|---|
| [Sintesis chat log](../reports/chat-log-synthesis-20261021.md) | Rekonstruksi kerja 18–21 Okt 2026 daripada `kilo.db` (127 sessions): kronologi, claim vs verified, 9 subagent mati pada had step | analisis fakta |
| [Backlog tersusun](../reports/open-task-backlog-20261021.md) | 50 item belum siap (W0 evidence → W1 core runtime → W2 domain → W3 closure → W4 bina baharu) + 8 gate akaun, dependency-ordered dengan owner lane dan Definition of Done | plan kerja |
| [Wave 1 checkpoint](../reports/wave1-checkpoint-20261021.md) | Bukti wave 1: gate, senarai fail, baki | checkpoint |
| [Preflight KILO-00](../reports/implementation/kilo-completion-preflight-20261021.md) + [pelan](../docs/superpowers/plans/2026-10-21-kilo-completion-implementation.md) | Jejak punca 500 production, peta assignment + skill setiap assignment, external gates | pelan pelaksanaan |
| [Audit parity emons.de](../reports/emons-parity-audit-20261021.md) | Recon live emons.de (E-001…E-009) berbanding pelaksanaan ABANGCOLEK; 3 regresi dijumpai & dibaiki | audit |
| [Commerce & Growth](../docs/design/commerce-growth.md) | Amendment rasmi: public store per dealer, workspace private, referral satu peringkat dua hala, ledger berasingan, sub-checklist CG-01…CG-12 | spesifikasi (TARGET_DESIGN) |

**Pekerjaan sedang berjalan (21 Okt):** closure item wajib — 3 lane delegasi (frontend AG-UI/state `CPK-08/09, GUI-03..07`; backend Commerce & Growth P0 `CG-01..04`; browser/release `REL-01, DR-01, CG-12`) + 1 auditor bebas. Bukti ditulis ke `reports/implementation/evidence/<ID>.json` **sebelum** ledger disentuh, kemudian `verify-acceptance` → `render-acceptance-register` → checklist.

Nota: seksyen di bawah disegarkan ke HEAD `0945e6d` bagi ledger, gate dan bukti provider. Working tree masih mempunyai kerja dalamVy (lihat `git status`) yang **belum** commit.

## Authority dan lokasi kerja

| Lane | Identiti | Makna |
|---|---|---|
| Projek asal | `D:/ABANGCOLEK-PLATFORM`; `integrate/blueprint-v23` pada `0945e6d` | Source integrasi asal dipelihara; tidak sama dengan main |
| Route integrasi | `main` / `origin/main`: `be45a84` (wave 1+2 sudah push 21 Okt) | `integrate/blueprint-v23` berada **2 commit** di hadapan `origin/main`; kerja selepas itu (wave 2/KILO) belum commit |
| Candidate lane | `D:/ABANGCOLEK-WORKTREES/codex-completion-20261020`, branch `work/codex-completion-20261020` | **290 fail berubah belum commit** pada 21 Okt 12:31 — jangan `git add -A` di situ; worktree itu dirty dan bercampur |

AGY, Kilo, Copilot CLI dan Hermes bukan executor aktif untuk sambungan ini. Pengguna menghentikan background implementation agents. Jangan melancarkan swarm atau sesi implementation luar daripada prompt lama. Bounded read-only review selepas diff stabil dibenarkan untuk semakan; ia bukan pengaktifan semula implementer. Extension backend `kilo serve` pernah respawn; jangan mendakwa semua proses latar telah hilang tanpa pemeriksaan baharu.

## Apa yang sudah dibuktikan pada main

| Pemeriksaan | Keputusan dan scope |
|---|---|
| Lint / build | Exit 0 / exit 0 pada patch release; **21 Okt 2026 pada branch integrasi: lint 0, build 0, boundaries 0** |
| Platform tests | **Measured 21 Oktober 2026 pada branch integrasi: 1193 pass / 11 todo / 0 fail** (suite penuh `--isolate`, 1204 ujian, 165 fail) dan **resit acceptance 11/11 suite, 1253 ujian, 0 fail, 8122 assertion, `sourceStable: true`**. Angka "1122 ujian / 1120 lulus / 2 gagal" ialah ukuran 20 Okt (kini lapuk). |
| Browser tempatan | 16 pass, 0 fail (20 Okt); larian e2e penuh 21 Okt: **61 spec, 23 lulus / 38 gagal** — 29 kegagalan satu punca akar (fixture log masuk), 7 spec Emons, 1 katalog kosong, 1 mismatch tajuk. |
| Browser production | 8 pass, 0 fail; public landing/login/access denial/route recovery; bukan transaksi founder sebenar |
| HTTP production | `/` 200; `/login` 200; `/api/platform/catalogue` 200 JSON; `/api/platform/session` 401 JSON untuk request tanpa sesi |
| Vercel Git autodeploy | READY, production, deployment `dpl_PYt7aW43nmPKT5Q6rkpqMaxG1KcC`, SHA tepat `18c69b3`, domain [abangcolek.gangniaga.my](https://abangcolek.gangniaga.my) |
| GitHub Actions | **blocked_external**: kedua-dua job tidak bermula kerana akaun dikunci akibat billing; bukan workflow hijau |

Bukti mesin: [main release receipt](../reports/implementation/main-typescript-release-20261020.json). [Run CI](https://github.com/thisisniagahub/ABANG-COLEK-V1/actions/runs/39447210722) dan [run deployment workflow](https://github.com/thisisniagahub/ABANG-COLEK-V1/actions/runs/39447210656) mempunyai gate akaun. Vercel native Git integration berjaya secara berasingan; itu tidak membetulkan billing GitHub.

**Copilot baharu belum direlease sepenuhnya ke main.** Kehadiran source/dependency dalam lane integrasi tidak membuktikan app production menggunakan keseluruhan ciri itu. Katalog diluluskan, Google login interaktif, transaksi authenticated dan semua konfigurasi cloud masih memerlukan bukti tersendiri.

## Pembaikan provider free — 20 Oktober 2026

Ralat HTTP yang muncul dalam suite telah dibetulkan pada source (bukti live dalam [register provider](AI-PROVIDER-FREE-MODELS-REGISTER.md)): trailing slash pada `baseUrl` Gemini menyebabkan URL berganda dan HTTP 404 untuk semua panggilan Gemini; calon OpenRouter ketiga `nvidia/nemotron-3-super-120b-a12b:free` mati untuk akaun ini (404) dan digantikan dengan `nvidia/nemotron-3-ultra-550b-a55b:free` (200); model NIM/Groq yang EOL (404/410) digantikan.

Suite ujian kini berjalan **offline** (`ABANGCOLEK_DISABLE_LIVE_PROVIDERS=1` dimuat melalui `bunfig.toml`): ujian unit tidak bergantung pada akaun orang lain dan tidak memakan kuota free tier produksi (Gemini: 20 permintaan/hari). Pengesahan live provider ialah gate berasingan, bukan sebahagian suite unit.

Gate luar yang masih terbuka: `OPENCODE_ZEN_API_KEY` yang telah tamat tempoh (401 `api_key_expired`) — kunci baharu diperlukan daripada pengguna. **Kuota Gemini pula pulih**: probe live 21 Okt menunjukkan `gemini-3.6-flash` dan `gemini-3.5-flash-lite` HTTP 200 (bukti: [live-provider-evidence-20261021.json](../reports/implementation/live-provider-evidence-20261021.json)). `VERCEL_TOKEN` dalam environment ini **tidak sah** ⇒ tiada deployment receipt boleh diambil.

## Ledger 85 requirement: rekod tempatan, bukan certification baharu

Ledger [acceptance-status.json](../reports/implementation/acceptance-status.json) disunting pada `2026-10-21T05:30:00Z` (source commit `0945e6d`). Renderer acceptance mesti terus menolak publish jika verification stale/gagal; jangan melangkau gate untuk menghasilkan tick.

| Status semasa | Bilangan | Tafsiran |
|---|---:|---|
| verified_local | 47 | Label tempatan; bukan 47 ciri production dan bukan fresh final-source certification |
| implemented_unverified | 30 | Ada implementasi separa atau requirement bernama masih belum selesai |
| blocked_external | 8 | Prasyarat luar belum dipenuhi; kerja tempatan yang bebas sudah dibuat |
| not_run / partial | 0 | Tiada baris `not_run` (REF-01 kini `verified_local`) |
| **Jumlah** | **85** | 78 teras + 7 ekstensi; **38 rekod belum ditutup** |

**Tiada certification penuh Copilot pada preview/production.** [Checklist](../PROJECT-CHECKLIST.md) menggunakan checkbox untuk final integration acceptance: label tempatan lama tidak ditukar secara automatik menjadi tick penuh. [Register](prompts/ACCEPTANCE-REGISTER.md) memaparkan status snapshot dan phase asal setiap ID.

## Jurang source yang tidak boleh ditutup oleh label snapshot

- Cookie `platform_session` masih menggunakan `Path=/api/platform`; laluan `/api/copilotkit` dan `/api/copilot-mcp` memerlukan bukti sesi browser sebenar. Ujian Request dengan cookie manual tidak membuktikan penghantaran cookie browser.
- Adapter rasmi CopilotKit wujud dalam source integrasi, tetapi `PlatformAguiAgent` masih membungkus runtime TypeScript; sasaran `HttpAgent -> Google ADK`, signed grants dan agent ID `abangcolek_ops` belum dibuktikan hujung ke hujung.
- Python menggunakan ADK/translator sebenar dalam ujian tempatan, tetapi `InMemorySessionService`, model polisi tempatan dan pembacaan SQLite oleh specialist belum memenuhi kontrak authority/session/tool bridge sasaran. 23 ujian Python terdahulu bukan live provider/release certification.
- Dependency CopilotKit/AG-UI kini disenaraikan dalam `package.json` lane integrasi. Ini membatalkan pemerhatian lama bahawa dependency/folder `server/agents` tiada, tanpa menutup integration acceptance.
- Candidate mempunyai pembetulan route canonical MCP, whitespace/framing AG-UI dan trust downgrade. Pemeriksaan terpilih lulus; suite candidate terdahulu 1,139 pass bukan fresh certification selepas setiap edit berikutnya dan bukan suite main 305 tests.
- PAY-01/02 mempunyai kerja callback/signature/idempotency tempatan selain gate akaun gateway. Menunggu credential bukan alasan meninggalkan kerja tempatan tersebut.
- FastAPI `0.141.1` telah direkod sebagai amendment eksplisit dalam [ADR-0003](decisions/0003-blueprint-v23-execution-contract.md), menggantikan sasaran asal `0.146.0`. Compatibility/import/runtime masih memerlukan bukti tersendiri; perbezaan dengan pin asal bukan lagi percanggahan kontrak yang belum diluluskan.

## Urutan sambungan yang telah ditetapkan

1. **Snapshot dokumentasi 20 Oktober:**188 dokumen milik projek diselaraskan ketika itu. [Laporan](../reports/documentation-alignment-20261020.md). Amendment Commerce & Growth 21 Oktober di atas menambah skop; kedua-duanya tidak menutup acceptance aplikasi.
2. Dalam candidate, TDD penghantaran cookie sesi sebenar, migrasi cookie lama, logout/revocation dan authorization pada Copilot/MCP; preserve Supabase CAS request boundary.
3. Sambungkan SDK Fetch/HttpAgent kepada ADK dan scoped canonical tools; uji signed grants, IDs, streaming, budget dan fail-closed free-only eligibility.
4. Lengkapkan GUI/shared state/HITL/delegation/modul/domain mengikut prerequisite blueprint; setiap ID memerlukan bukti pada keseluruhan runtime yang berkaitan.
5. Jalankan QA browser authenticated, audit per-ID, recovery dan scoped release. Kos/akaun/entitlement/hosting/polisi yang belum tersedia kekal gate eksplisit.

Tiada pilihan stack/model/protocol baharu diperlukan. Gunakan [master prompt](prompts/IMPLEMENT-ABANGCOLEK.md), [execution contract](prompts/AGENT-EXECUTION-CONTRACT.md) serta skill/MCP/plugin yang benar-benar tersedia dan disahkan. Jangan install atau mendakwa connector authenticated berdasarkan nama semata-mata.

## Semua rekod belum selesai dalam snapshot

Jadual ini **dijana** daripada `reports/implementation/acceptance-status.json` (21 Okt 2026) — jangan edit tangan; edit ledger, kemudian jana semula. Teks "Baki" ialah gabungan medan `gap` / `externalGate` / `remainingRequirement` daripada ledger.

| ID | Status | Baki requirement / gate yang direkod (dijana daripada ledger 21 Okt 2026) |
|---|---|---|
| CPK-03 | blocked_external (`protocol_verified`) | CopilotKit Intelligence account + Self-Service Agreement + organization on the free Developer plan + a selected project (project API key) + a Learning container created in the browser (stable id) + 15 eligible threads before the first learning run; Automatic Learning itself IS included in the free … |
| CPK-04 | implemented_unverified (`component_present`) | The startup-loaded versioned declarative surface catalog and the AG-UI -> renderer middleware path are not implemented. |
| CPK-05 | implemented_unverified (`component_present`) | The versioned surface catalog, the depth/cyclic-tree limits and the AG-UI middleware path are not implemented. |
| CPK-06 | implemented_unverified (`protocol_verified`) | The approval/executor/receipt chain is real, but only ONE executor is registered (refund.execute). Other approved action types still return EXECUTOR_UNAVAILABLE, so the HITL path is not universal. | Only ONE executor is registered (refund.execute); other approved action types still return EXECUTOR_… |
| CPK-07 | implemented_unverified (`component_present`) | Adapter logic is real and tested, but the adapter is never instantiated by a live agent run — no server round-trip drives it. | The adapter is never instantiated by a live agent run, so no server round-trip drives it. |
| CPK-08 | implemented_unverified (`component_present`) | Scope-clearing and authority-stripping are real, but the view is not mounted against a live server-issued state store. | The view is not mounted against a live server-issued state store, and entity revision is not separated from policy revision. |
| CPK-10 | implemented_unverified (`protocol_verified`) | Real ADK delegation exists on the Python side, but the cited Python test does not assert a delegation transcript and is executed by no npm script or CI job, and the TypeScript evidence replays a hardcoded transcript fixture. The TypeScript runtime has no parent-to-child delegation, no trace propaga… |
| GUI-01 | implemented_unverified (`component_present`) | Cards other than the A2UI-rendered ones are still never mounted against a live data path. |
| GUI-02 | implemented_unverified (`component_present`) | Validation and the double-submission gate are real and tested, but the form is not mounted and has no server callback, so decision -> revalidation -> receipt is not exercised. | The form is not mounted and has no server callback, so decision -> revalidation -> receipt is not exercised. |
| GUI-03 | implemented_unverified (`component_present`) | Rendering contracts are real, but the view is not mounted against a live tool-lifecycle event source. | The view is not mounted against a live tool-lifecycle event source. |
| GUI-04 | implemented_unverified (`component_present`) | Contracts are real, but no live state store feeds the view and entity revision is not separated from policy revision. | No live state store feeds the view, and entity revision is not separated from policy revision. |
| GUI-05 | implemented_unverified (`protocol_verified`) | The MCP server and the sandboxed UI resource are real and proven by a live protocol transcript, but the browser cannot reach it: the session cookie is scoped to Path=/api/platform, so /api/mcp returns 401, and the client host frame is not mounted yet. | The browser cannot reach /api/mcp (session co… |
| GUI-06 | implemented_unverified (`component_present`) | The startup-loaded versioned surface catalog and the AG-UI middleware path are not implemented. |
| GUI-07 | implemented_unverified (`component_present`) | The components are not on the same API data path as the rest of the workspace, and theme/reduced-motion coverage on the copilot surface is not proven. |
| MOD-02 | implemented_unverified (`component_present`) | Public-token projection is not separated from the private order inside the copilot path. |
| ADV-05 | implemented_unverified (`component_present`) | Not every required conflict class is detected: stale price, ineligible loyalty, fractional/negative quantity, duplicate line and invalid fulfilment are not all implemented. |
| ADV-07 | implemented_unverified (`component_present`) | No preview reference hash, revisions or expiry on the preview result. |
| ADV-15 | implemented_unverified (`component_present`) | Detects and explains anomalies but does not remediate them. |
| ADV-17 | implemented_unverified (`component_present`) | Recomputes variance but does not remediate it. |
| ADV-20 | implemented_unverified (`component_present`) | No quota on exports and no download-time re-authorization contract. |
| ADV-21 | implemented_unverified (`component_present`) | Scores priority but does not remediate the case. |
| ADV-23 | implemented_unverified (`component_present`) | No outbound-send consent guard on the draft. |
| ADV-24 | implemented_unverified (`component_present`) | Steps are bound to capability ids but are not grant-aware. |
| ADV-26 | implemented_unverified (`component_present`) | Implemented as one reconciliation tool; the three separately-required operations (inspect_action_receipt, refresh_external_action_status, apply_verified_action_outcome) are not all present. |
| PAY-01 | blocked_external (`component_present`) | Tiada jurang tempatan: laluan callback HTTP dengan pengesahan HMAC X-Signature (constant-time compare), idempotency eventId dalam store dan reason code penuh sudah dipasang dan diuji. Baki luaran: kredensial merchant gateway + adapter pembekal yang menghantar callback sebenar + PLATFORM_PAYMENT_WEB… |
| PAY-02 | blocked_external (`component_present`) | Tiada jurang tempatan: laluan pulangan (GET /payments/return) sudah dipasang dan hanya MEMBACA status yang tersimpan (status daripada klien diabaikan). Baki luaran: akaun gateway sebenar untuk melengkapkan perjalanan hujung-ke-hujung. | Laluan pulangan (GET /payments/return) sudah wujud dan hanya M… |
| SEC-01 | implemented_unverified (`component_present`) | Token generation, hashing and expiry are real and tested, but there is NO revocation path, and the expiry is creation-time only rather than handover-based. | No revocation path, and the expiry is creation-time only rather than handover-based. |
| AI-02 | implemented_unverified (`component_present`) | The fabricated constants in adkAgent.ts, domainTools.ts, operationsBrief.ts and runtimeTransports.ts have been removed and a static CI guard added; the guard test is green, but the guard is static source analysis only (no runtime proof against a real record) and the legacy freeModelRouter fallback … |
| AI-03 | implemented_unverified (`protocol_verified`) | No unknown_outcome state when the outcome of an execution cannot be determined. |
| PD-01 | implemented_unverified (`component_present`) | Separuh tempatan sudah wujud dan diuji: konsen berstruktur (server/platform/dispatchConsent.ts, rekod `asset_consents`), gate `ASSET_CONSENT_NOT_GRANTED` pada asset tanpa konsen granted, laluan `POST /campaigns/consent` untuk mencatat konsen, dan gate `DISPATCH_OPTED_OUT` pada preferensi opt-out pe… |
| REL-01 | implemented_unverified (`component_present`) | Playwright e2e SUDAH dijalankan terhadap pelayan hidup tempatan (reports/implementation/playwright-e2e-20261021.log: 61 spec, 23 lulus / 38 gagal — 29 kegagalan daripadanya satu punca akar: fixture log masuk tidak mengembalikan respons OK). Yang BELUM pernah dijalankan ialah e2e terhadap preview/pr… |
| EXT-01 | implemented_unverified (`component_present`) | The inspector, its 8 redaction rules and its production refusal are implemented and tested, but the dev-only route is not mounted in the platform app. | The dev-only inspector route is not mounted in the platform app. |
| EXT-02 | blocked_external (`component_present`) | Hosted User Memories requires INTELLIGENCE_ACCOUNT_AND_TERMS_REQUIRED. |
| EXT-03 | blocked_external (`component_present`) | Two different offerings were conflated. CopilotKit Product Analytics is Intelligence-only (it counts only runs that reach Intelligence through the project key; a local app without a project key is never counted) and needs the account + project + key; the OSS capture half (@copilotkit/learning stand… |
| EXT-04 | blocked_external | Live Slack/Teams requires a CopilotKit account + project + CPK_INTELLIGENCE_API_KEY (a DIRECT adapter does not mean standalone: the CopilotRuntime still owns the Channel lifecycle and uses an Intelligence connection), a provider-side app (Slack: create From a manifest, install to workspace, bot tok… |
| EXT-05 | blocked_external (`component_present`) | The probe, the typed WEBMCP_BROWSER_UNSUPPORTED outcome and the grant model are implemented and tested, but the browser MCP client API and the tool registration against the own-app surface are not yet wired. | The browser-side MCP client API and the live own-app registration are not available in th… |
| EXT-06 | blocked_external (`component_present`) | This gate was mislabelled: CopilotKit voice is a plain open-source runtime feature, not a hosted Intelligence offering. The documented path is a runtime transcriptionService (@copilotkit/voice TranscriptionServiceOpenAI) which makes /info advertise audioFileTranscriptionEnabled:true and the mic but… |
| EXT-07 | implemented_unverified (`component_present`) | The upload security model and the attachment reference surface are real and tested, but the copilot route does not yet pass attachmentIds through, and there is no vision inference. | Gate sebenar: model vision yang LAYAK untuk memahami imej (data scope diluluskan) — BUKAN akaun CopilotKit Intelijen… |
## Scope alignment Markdown

Semua dokumen projek termasuk `outputs` proposal/research, nota REA `.work` dan empat roster `.kilo/agents` diperiksa. Vendor skills, agent coordination, cache, transkrip peribadi dan nested worktree berasingan dipelihara dengan hash. [Inventori per fail](handover/MARKDOWN-INVENTORY-20261020.md) dan [laporan alignment](../reports/documentation-alignment-20261020.md) merekod skop sebenar; tiada perubahan aplikasi atau cloud dibuat dalam task ini.

## Peraturan kemas kini selepas setiap task

Tulis exact source/dirty hashes, command/result, environment, scope dan reviewer dalam receipt. Kemudian sync ledger melalui verifier/renderer yang sah, register, checklist dan checkpoint. Tick hanya apabila keseluruhan acceptance yang dinyatakan selesai pada environment tersebut. Kejayaan unit/synthetic tidak menutup requirement live/browser/provider; blocked/partial/not-run kekal unchecked. Jika source berubah dan receipt tidak lagi sepadan, rekod status unverified tanpa memadam sejarah.
