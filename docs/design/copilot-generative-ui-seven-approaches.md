# ABANGCOLEK — Seven Generative UI Approaches

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Kontrak sasaran kekal di bawah blueprint v2.4; scope reka bentuk dan keputusan tetap bukan bukti semua fungsi telah diimplementasi. Semak status per-ID dan environment sebelum mendakwa siap atau production-ready.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Tarikh semakan: 20 Oktober 2026. Status: Kontrak sasaran GUI-01..07; beberapa komponen tempatan wujud, SDK/protocol wiring belum verified. Authority: [master blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md).

## Pilihan yang telah ditetapkan

Gunakan Google ADK Python melalui AG-UI dan TypeScript CopilotKit v2 runtime. React/Vite kekal. Pakai komponen ABANGCOLEK, data canonical serta renderer/schema yang disahkan dalam pinned packages. Jangan gunakan Built-in Agent hanya kerana halaman contoh generik menggunakannya. Tiada dynamic schema secondary-model inference.

| ID | Use case dan implementasi sasaran | Acceptance |
|---|---|---|
| GUI-01 Display Only | Kad order, expiry, margin dan komisen tanpa callback mutasi | Server projection/revision; tiada angka rekaan; empty/error/loading states; redaction |
| GUI-02 Interactive | Product picker, input simulation dan draft review; frontend tool melalui AGUIToolset | Callback schema, keyboard/focus, cancel dan duplicate click; tiada bypass domain approval |
| GUI-03 Tool Rendering | Paparkan queued/running/succeeded/failed/unknown berdasarkan event dan receipt | Malformed tool output ditolak; replay render sahaja; partial/error tidak digambarkan berjaya |
| GUI-04 State Rendering | Selected order, filter, draft state dan workflow progress | Thread/user/workspace isolation, schema/revision, reset selepas switch; client tidak spoof paid/role/price |
| GUI-05 MCP Apps | First-party read-only Operations Brief App menggunakan data minimum daripada registry | Tools mempunyai UI resources; runtime/renderer negotiated; iframe sandbox/CSP dan origin/message validation; tiada credentials di UI resource; scoped data sahaja |
| GUI-06 A2UI | Fixed Schema JSON untuk Operations Brief dan Refund Impact panels, data diisi oleh query/evaluator | Catalog allowlist, size/depth limits, unknown component ditolak, stable IDs, cancel/replay; dynamic injection disabled dan tiada auxiliary paid calls |
| GUI-07 Your Components | Adapter kepada cards/panels/forms ABANGCOLEK untuk semua surface | Theme/light-dark, mobile, keyboard, reduced motion dan BM/English; component props schema dan source data sama |

## Maksud lengkap bagi setiap approach

Tujuh approach ialah acceptance IDs projek yang tetap. Dokumentasi CopilotKit semasa turut mengelompokkan generative UI kepada controlled/declarative/open-ended; jangan menganggap tujuh nama projek ialah tujuh pakej rasmi atau mengganti framework ADK dengan built-in agent. Setiap approach mesti menunjukkan protokol yang berkenaan dan kegunaan bisnes, bukan tujuh demo mock terasing. Satu komponen boleh memenuhi beberapa IDs dengan bukti berasingan.

### GUI-01 — Display Only

Wajib: OrderSummary/Tracking, StockExpiry, MarginImpact, CommissionExplanation dan JevLocalRules cards. Input hanya projection berizin dengan source refs, revisions, observedAt, missingData dan policy version. Gunakan `null`/unknown untuk nilai tiada; sifar hanya apabila sumber benar-benar sifar. Format duit integer sen kepada RM pada presentation; contribution ratio nullable apabila denominator tidak sesuai. JEV menyatakan `LOCAL_RULES`, sebab, evidence refs dan batas; tiada label vision/confidence daripada nama fail gambar.

Flow: scoped domain result -> output validator -> pure view model -> komponen. Read-only cards tidak menambah cart/order/reservation atau menukar ledger ketika mount, refresh atau replay. Link rekod kembali kepada route allowlist dan authorize ketika rekod dibuka.

Acceptance: loading, empty, denied, insufficient data, stale, malformed dan server error; teks berbahaya dirender sebagai teks; source URL tidak boleh `javascript:`/arbitrary origin. Uji harga stale, contribution negatif/zero sales, multiple revisions dan dealer/customer scope. Screenshot dengan fixture bukan bukti live canonical data.

### GUI-02 — Interactive

Wajib: PublishedProductPicker, MarginSimulationForm, CampaignDraftReview dan ApprovalReview. Product picker menyediakan unsent cart draft; tiada reservation/checkout automatik. Margin form menghantar product/quantity/discount/cost refs kepada server evaluator; formula atau margin tetap dalam browser bukan authority. Draft review menyimpan draf melalui tool D berizin. Approval review memaparkan proposal immutable beserta impact, revisions, payload hash dan expiry.

Flow: AG-UI frontend tool -> validated browser handler -> input user -> structured result kepada agent; proposal decision -> canonical approval endpoint berasingan. Cancel/close boleh menyelesaikan interaction dengan canceled; ia tidak mencipta success receipt. UI disabled/unavailable jika callback atau dependency tiada; callback resolved tidak dianggap business success.

Acceptance: keyboard/tab/focus return, associated labels/errors, mobile, invalid quantity/sen/discount, duplicate click/two tabs, user dismisses, expired proposal, stale preview, role revoke dan timeout. Success badge hanya daripada server-verified command outcome. Uji interaction benar melalui ADK `AGUIToolset()` dan replay tanpa effect; local `onClick` test hanya `component_present`.

### GUI-03 — Tool Rendering

Wajib renderer lookup menurut registration name/version, bukan substring tool name atau model-generated component code. Paparkan pending arguments/queued, running, result, canceled, failed dan unknown outcome mengikut normalized SDK lifecycle. Normalized UI state bukan nama event SDK yang direka; adapter mesti memetakan events yang benar pada pinned AG-UI/SDK. Tool result menyatakan class Q/S/D/C/X supaya pengguna tahu simulasi, draf dan mutasi sebenar.

Flow: redacted AG-UI tool events + validated domain envelope -> indexed `(thread, run, toolCallId)` -> deterministic renderer. Partial JSON tidak dibaca sebagai complete financial value. Committed receipt boleh muncul selepas stream terputus melalui authorized lookup; jangan fabricate final event untuk menutup spinner.

Acceptance: fragmented arguments, out-of-order/duplicate event, unknown registration/version, malformed output, stale event daripada thread lama, disconnect selepas commit dan tool timeout sebelum/selepas dispatch. Replay menukar paparan sahaja; command execution count kekal satu. Capture protocol trace dan canonical receipt count, bukan screenshot success card sahaja.

### GUI-04 — State Rendering

Wajib state projection untuk selected record, scoped filters, draft fields, active proposal ref dan workflow progress. State patch mempunyai schema/revision dan thread/run scope. Semua entity refs direauthorize; server-owned role/grants/prices/payment/stock tidak diterima sebagai authority daripada patch. Clear subscriptions dan pending interaction pada account/workspace/thread switch.

Flow: UI/agent allowed state patch -> validator -> revision check -> shared projection store -> render; canonical domain refs dibaca semula apabila freshness diperlukan. Session state bukan database commerce, dan patch tidak menutup order atau approve proposal.

Acceptance: UI-to-agent dan agent-to-UI update pada thread sama, concurrent stale patch, oversized/deep payload, prototype keys, forged paid/role/price, deleted selected entity, reconnect dan switch identity. State memory/cache pengguna lama tidak kelihatan selepas switch. Forwarded state mesti melalui ADK session adapter sebenar; React local state sahaja tidak lulus.

### GUI-05 — First-party MCP Apps Operations Brief

Tetapkan `serverId` stabil `abangcolek-operations-brief`, endpoint runtime-service `/api/copilot-mcp`, resource URI `ui://abangcolek/operations-brief/v1` dan capability `operations_brief.read`. Resource berisi aset pihak pertama read-only; tool `get_operations_brief` menyediakan projection minimum, source/revisions dan resource metadata mengikut SDK rasmi. Tool ini specialization ADV-03, bukan capability logical ke-33. Semua input/output/tool/resource schema dipin dan diuji. Resource tidak membawa access token, service key, raw env, PII tersembunyi atau mutation tool.

Flow wajib: authenticated runtime -> HTTP MCP initialize/capability negotiation -> tools/list + resources contract -> scoped tool call -> associated UI resource fetch -> CopilotKit MCP Apps activity -> sandboxed iframe -> OperationsBriefApp projection. Bukan route React biasa yang diberi label MCP. Runtime MCP middleware tidak diaktifkan pada agents yang tidak memerlukannya. Reauthorize ketika tool/resource dibaca semula; URL/resource ID tidak menjadi bearer authority.

Kontrak dependencies mengikut ADR: runtime boleh menggunakan `@modelcontextprotocol/sdk` v1 secara dalaman; host ext-apps v2 menggunakan `@modelcontextprotocol/core`, `client` dan `server` v2. Isolasi melalui HTTP wire; jangan cast/share instance `McpServer` antara major versions. Import smoke kedua-dua graph, initialize, tool/resource negotiation, auth forwarding dan iframe rendering wajib lulus sebelum `protocol_verified`. Pin registry tersedia tidak membuktikan compatibility.

Security: default-deny CSP/frame/network policy, only first-party approved resources, origin+source+message schema validation, scoped short-lived server-mediated access, no unrestricted proxy/arbitrary URL dan no credentials dalam iframe. Snapshot yang direstore mesti direauthorize; revoked owner mendapat denied/redacted state. SDK sandbox default perlu diuji pada deployment sebenar.

Acceptance: real initialize/tool/resource/iframe trace; denied/expired session, unsupported resource MIME/capability, malicious origin/message, attempted external fetch, CSP violation dan resource tamper. Putus/reconnect tidak execute tool effect; jika Streams blocked, uji render/local restore sahaja dan label batas. Current `OperationsBriefApp.tsx` ialah komponen, bukan bukti keseluruhan flow ini. [MCP Apps rasmi](https://docs.copilotkit.ai/google-adk/generative-ui/mcp-apps) mengaitkan tools dengan UI resources dan mengesyorkan `serverId` stabil; projek menetapkan read-only/scope controls tambahan.

### GUI-06 — A2UI Fixed Schema

Tetapkan catalog ID `copilotkit://abangcolek-ops-v1`, surfaces `operations-brief-v1` dan `refund-impact-v1`; instance surface ID mesti unik dalam thread/run untuk mengelakkan hasil order berbeza saling menimpa. JSON schema dimuat pada startup dan dimasukkan version/hash dalam manifest. Komponen katalog terhad: layout Card/Row/Column, Text/Heading, StatusBadge, MoneyValue, SourceReference, MissingDataNotice dan RecordLink. Tiada HTML/JS/custom import/URL arbitrari. Tree bukan output LLM; agent hanya meminta surface bagi refs yang dibenarkan.

Flow wajib: canonical query/preview -> server-validated data model -> fixed operations container -> A2UI middleware -> registered matching catalog/renderer. Semakan dokumentasi semasa menunjukkan `createSurface`, `updateComponents`, `updateDataModel`; implementasi mesti memakai wire version dan nested shape yang disahkan pada pinned packages, bukan event pseudo-SSE sendiri. JSON Pointer hanya membaca approved projection, prototype paths ditolak dan missing binding tidak menyebabkan React crash.

Dynamic schema dan secondary LLM injection disabled. Runtime policy `injectA2UITool: false` ialah setting yang ditunjukkan docs semasa; semak actual pin sebelum menulis config. Tiada route/model tambahan untuk menjana schema. Button kejayaan/optimistic approval dalam showcase tidak disalin.

Fixed surfaces ini read-only. Approval sebenar berada pada GUI-02 di luar surface dengan canonical proposal reference. Ini keputusan tetap: tidak bergantung pada Python `action_handlers` yang docs ADK semasa menyatakan belum disokong oleh helper `a2ui.render`. Maka GUI-06 tidak boleh diklaim interactive server execution hanya kerana butang berubah label. [Fixed Schema ADK](https://docs.copilotkit.ai/google-adk/generative-ui/a2ui/fixed-schema).

Acceptance: dua surfaces daripada domain refs sebenar, catalog/schema mismatch, unknown component/prop/path, missing source data, duplicate operations, orphan component ID, cycle, excessive depth/count dan replay. Uji currency/ratio binding dan output dalam BM/English, light/dark/mobile. Verify tiada secondary provider call dan tool injection disabled. Valid tree sahaja tidak meluluskan permission/data provenance.

### GUI-07 — Your Components

Adapt komponen/primitives sedia ada kepada view-models yang sama untuk workspace, Pet, tool rendering dan A2UI/MCP projections. Pisahkan framework adapters daripada pure cards/forms. Prop contract ketat; component tidak membaca token, localStorage ledger atau membuat financial side effect ketika mount. Jangan menambah design system atau provider/runtime kedua.

Acceptance: parity nilai/source/status antara chat dan canonical workspace; 320px viewport, keyboard-only, focus/error announcement, contrast WCAG AA, light/dark, reduced motion dan BM/English. Semak dependency/bundle diff dan lazy loading renderer berat selepas baseline ukuran. Source component/hook tests membuktikan rendering sahaja; cross-surface thread/agent test membuktikan integrasi CPK-09.

## Envelope dan states bersama

Payload projek memisahkan `schemaVersion`, `surfaceId`, `threadId/runId`, `data`, `sourceRefs`, `entityRevisions`, `policyVersion`, `observedAt`, `missingData` dan `status`. Ini domain envelope projek, bukan API props rasmi CopilotKit. Sediakan adapter explicit kepada pinned SDK. UI state minimum ialah loading, empty, denied, insufficient_data, ready, stale, canceled, failed dan unknown_outcome yang relevan; tiada fallback financial sample pada production.

Bound ukuran/tree/message berpunca daripada execution contract dan registry; adapter mesti menolak sebelum render/dispatch serta menguji tepat pada limit dan limit+1. Limit SDK/provider yang lebih ketat menang. Mengasingkan iframe atau memvalidasi JSON tidak menggantikan authorization canonical. Request mutations cookie-based kekal CSRF protected; read-only MCP tidak menerima command terselindung melalui field input.

## Fail dan boundary

Frontend: `src/features/copilot/cards/`, `interactive/`, `tool-rendering/`, `state-rendering/`, `mcp-apps/`, `declarative/`, `components/`. Sebahagian fail komponen sudah ada; lengkapi secara additive selepas source scan. Create destinasi belum ada hanya apabila implementasi wujud; jangan salin design system kedua. Interface framework dipisah daripada komponen pure.

Server: `server/agents/copilot/runtime.ts`, `server/agents/tools/registry.ts`, `server/agents/mcp/operations-brief.ts` dan `server/agents/mcp/ui-resource.ts`. First-party MCP endpoint berada di runtime service `/api/copilot-mcp`; ia berautentikasi dan tidak menjadi unrestricted tool proxy. Browser/resource tidak menerima service-role key atau grant server-to-server. SDK bridge/token exchange mesti mengikuti kontrak rasmi pinned version dan diuji.

Python: fixed-schema surfaces pada `agents/google-adk/ui_surfaces.py`, state adapters pada `sessions.py`. Semua actions kembali kepada canonical authorization; A2UI state hanya projection, bukan authority.

## Sumber dan verification

- [Display Only](https://docs.copilotkit.ai/generative-ui/display), [Interactive](https://docs.copilotkit.ai/generative-ui/interactive): halaman generik berlabel Built-in Agent; semak adapter ADK.
- [Tool Rendering](https://docs.copilotkit.ai/google-adk/generative-ui/tool-rendering), [State Rendering](https://docs.copilotkit.ai/google-adk/generative-ui/state-rendering).
- [MCP Apps](https://docs.copilotkit.ai/google-adk/generative-ui/mcp-apps), [A2UI](https://docs.copilotkit.ai/google-adk/generative-ui/a2ui), [Your Components](https://docs.copilotkit.ai/google-adk/generative-ui/your-components).

Semakan web/Context7 `/copilotkit/copilotkit` pada 20 Oktober 2026 ialah sumber API/pattern, bukan bukti SDK tempatan. Fail/endpoint ialah destinasi yang diputuskan kecuali source observation explicit di atas. Capture GUI-01..07 melalui synthetic protocol tests dan browser journeys sebelum live activation. Intelligence history/replay ialah gate tambahan; local render tidak membuktikan cross-device restoration.

Evidence setiap GUI: `integrationStage` (`designed/component_present/sdk_wired/protocol_verified/live_verified/release_verified`) **dan** canonical `status`+`environment` mengikut execution contract§9. `blocked_external/failed` ialah canonical status, bukan integration stage. Rekod file hashes, pinned exports, source result/receipt refs, test command/result, event/resource/surface trace, viewport/theme/locale, redacted browser screenshot dan reviewer/date. Parent CPK status tidak dinaikkan secara automatik daripada GUI stage. Jangan tandakan GUI-05 verified dengan komponen React, atau GUI-06 verified dengan JSON fixture tanpa middleware/renderer sebenar.
