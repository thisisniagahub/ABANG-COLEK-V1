# ABANGCOLEK — Reka Bentuk Penggunaan 10 Kemampuan CopilotKit

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Kontrak sasaran kekal di bawah blueprint v2.4; scope reka bentuk dan keputusan tetap bukan bukti semua fungsi telah diimplementasi. Semak status per-ID dan environment sebelum mendakwa siap atau production-ready.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Tarikh semakan: 20 Oktober 2026. Status: Kontrak sasaran di bawah master blueprint semasa; integrasi SDK/protokol belum dibuktikan. [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md) menetapkan pilihan pelaksana. [Prompt utama](../prompts/IMPLEMENT-ABANGCOLEK.md) menetapkan urutan tanpa pemilihan seni bina baharu.

## Apa yang wujud dan apa yang masih sasaran

Pemerhatian awal20Oktober bahawa dependency rasmi dan `server/agents/` belum ada telah superseded: lane integrasi kini menyenaraikan CopilotKit/AG-UI dalam `package.json` dan mempunyai adapter runtime, MCP serta komponen frontend. Namun `api/copilotkit.ts` masih menggunakan `PlatformAguiAgent` yang membungkus runtime TypeScript; ini belum membuktikan sasaran `HttpAgent -> ADK`, identity grants atau UI/session end-to-end. Main `18c69b3` hanya mengandungi patch konfigurasi TypeScript, jadi jangan menyamakan source integrasi dengan fungsi production. Status setiap ID dan jurang cookie/session/bridge dicatat dalam [CURRENT-STATUS](../CURRENT-STATUS.md).

Gunakan field `integrationStage`: `designed` -> `component_present` -> `sdk_wired` -> `protocol_verified` -> `live_verified` -> `release_verified`. Ini berasingan daripada canonical `status` dan `environment` dalam execution contract§9; `blocked_external` menyatakan prerequisite luar dan `failed` menyatakan ujian gagal. Jangan menukar semua CPK/GUI kepada complete kerana komponen lulus tests atau checkpoint lama menyebut implementasi lengkap. Setiap receipt mesti mempunyai manifest tepat (root berbanding worktree frontend), status, environment dan bukti semasa; perubahan worktree boleh membatalkan bukti terdahulu.

## Matlamat dan batas

**TARGET_DESIGN — Commerce & Growth 21 Oktober:** [spesifikasi commerce](commerce-growth.md) mengikat customer/dealer journeys kepada public store setiap Agent/Stokis aktif dan dedicated private Dealer Workspace melalui membership/grants canonical. Empat auth roles source tidak menggugurkan pengalaman dealer. Public store browsing anonymous tidak memberi private tool grants. Konteks store owner/dealer, customer referrer dan fulfiller mesti datang daripada server, diasingkan mengikut principal/store/org dan revision; Pet/shared state dibersihkan ketika logout, revoke atau pertukaran scope.

Chat/cards/frontend tools membantu search, tracking dan penjelasan scoped sahaja. Cart/reorder ialah **unsent draft** yang direprice dan direvalidate canonical; model tidak menentukan payee, mengesahkan bayaran, menerbitkan kedai atau memberi reward. Wholesale margin, komisen dealer, referral pelanggan satu peringkat dua hala dan points kekal berasingan serta polisi approved menentukan eligibility/stacking. Share sahaja tiada reward; kadar lima tingkat Ahmad’s bukan polisi. Top-up, cash withdrawal dan native app wajib deferred. P0 ordering → P1 rewards → P2 retention ialah urutan domain dalam plan projek, tanpa melangkau integriti/runtime/CPK/GUI/release acceptance atau menutup tick melalui dokumentasi.

Gunakan 10 kemampuan yang dipaparkan pada halaman Google ADK CopilotKit untuk membantu kerja sebenar ABANGCOLEK. React/Vite dan domain backend Bun dikekalkan. Agent ABANGCOLEK-OS dipetakan semula kepada command canonical, bukan diaktifkan dengan financial actions legacy.

Pelan meliputi kesemua 10 kemampuan. Lapan kemampuan open-source dan dua kemampuan Intelligence mempunyai activation gates berasingan. Tiada langganan, bayaran inference, akaun cloud baharu atau penghantaran data kepada Intelligence dibenarkan hanya kerana dokumen ini ditulis. Jika Intelligence yang memenuhi syarat kos/data belum tersedia, dua kemampuan itu kekal `blocked_external`, bukan diganti dengan mock atau dilabel siap.

## Rujukan primer

- [Google ADK integration](https://docs.copilotkit.ai/google-adk): senarai 10 label dan agent Python melalui bridge.
- [Quickstart](https://docs.copilotkit.ai/google-adk/quickstart): agent dan runtime setup.
- [Runtime adapters](https://docs.copilotkit.ai/runtime-server-adapter): runtime TypeScript Fetch/Bun.
- [Open Source vs Intelligence](https://docs.copilotkit.ai/concepts/oss-vs-enterprise): sempadan kemampuan dan servis.
- [Generative UI](https://docs.copilotkit.ai/google-adk/generative-ui): tool/state rendering dan pendekatan UI.
- [Sub-agents](https://docs.copilotkit.ai/google-adk/multi-agent/subagents): integrasi subagent.
- [AG-UI Streams](https://docs.copilotkit.ai/threads): replay/reconnect dan batas server failure.
- [Automatic Learning](https://docs.copilotkit.ai/learning): completed runs, reviewed/versioned skills dan delivery.

Dokumentasi disemak melalui web dan Context7 (`/copilotkit/copilotkit`) pada 20 Oktober 2026. Landing ADK pada tarikh itu menyenaraikan sepuluh label dalam matriks di bawah. Gunakan pins/agent IDs/ports yang diputuskan dalam ADR-0003; pin masih perlu lulus resolver/import/protocol tests. Jangan gabungkan contoh v1/v2 atau menganggap model contoh masih tersedia/percuma. Rujukan source repo ialah baseline yang perlu diperiksa semula kerana worktree masih berubah.

## Seni bina yang ditetapkan

```text
React workspace / Pet
        |
CopilotKit React provider dan headless hooks
        |
TypeScript CopilotRuntime pada Bun / hosting yang disahkan
        |
HttpAgent -> AG-UI bridge -> Google ADK Python service
                                   |
                      bounded, authorized server tools
                                   |
                       canonical Bun domain commands
                                   |
                   SQLite local / Supabase CAS cloud commit

Intelligence: adapter digate untuk Streams dan Learning
ADK sessions: persistence agent tersendiri, bukan ledger commerce
```

### Keputusan utama

1. Pilihan utama ialah laluan Google ADK Python yang didokumenkan. Python service memerlukan lifecycle/hosting sendiri; Vercel frontend sahaja tidak menjalankannya secara automatik. Jika servis percuma yang sesuai tidak tersedia, buktikan secara local dahulu dan rekod blocker production.
2. TypeScript CopilotRuntime berbeza daripada agent Python. Pilihan ini tidak memerlukan Python CopilotKit runtime atau migrasi frontend Next.js.
3. Runtime baru tidak dibungkus terus dalam `createDurableHandler` commerce. Streaming boleh terus berjalan selepas handler memulangkan Response dan selepas store sementara ditutup. Tools memanggil API canonical melalui request tersendiri dan menunggu durable receipt.
4. Auth browser disahkan pada runtime; Python tidak mempercayai `user_id`, role atau workspace daripada payload browser. Gunakan grant server-to-server terhad dengan audience, expiry, scope, thread/run dan identiti yang boleh direvalidate/revoke pada command boundary. Tiada unrestricted service-role access untuk agent.
5. Stable mapping `(workspace, user, thread) -> ADK session`; session storage tidak berkongsi fail SQLite commerce secara terus. Persistence/deployment/retention mengikut execution contract; rekod bukti recovery sebelum release. Thread ID atau ADK session ID daripada client tidak boleh digunakan tanpa owner lookup.
6. Model adapter mesti menyokong tools, events dan format ADK sebenar. Router completion teks semasa bukan bukti keserasian. Uji satu provider yang dibenarkan dahulu; tambah failover hanya selepas keserasian dan kos disahkan. Tiada fallback model berbayar.
7. Parent/subagents tidak boleh menaikkan kuasa. Semua tool execution menyemak ownership/role/revision/idempotency pada server.

## Matriks penggunaan 10 kemampuan

| ID | Kemampuan | Penggunaan ABANGCOLEK | Acceptance minimum | Aktivasi |
|---|---|---|---|---|
| CPK-01 | Chat | Tanya order sendiri, ringkasan operasi berizin, SOP dan draf kempen | Jawapan berasaskan rekod/sumber; timeout/cancel/error jujur; tiada data silang pengguna | Open-source |
| CPK-02 | AG-UI Streams | Buka semula perbualan dan kad; reconnect selepas rangkaian terputus; sambung pada peranti lain | Replay tidak execute semula tool; user/thread scope; live reconnect diuji | Intelligence |
| CPK-03 | Automatic Learning | Completed complaint-triage workflows mencadangkan penambahbaikan SOP | Evidence -> insight -> skill -> review -> publish -> pinned delivery -> rollback | Intelligence |
| CPK-04 | Generative UI | Kad order/tracking, margin simulation dan JEV LOCAL_RULES daripada tool results | Schema, provenance/revision, loading/error; tiada angka/confidence rekaan | Open-source |
| CPK-05 | Declarative UI | Susun panel ringkasan operasi daripada katalog komponen diluluskan | Hanya schema komponen/layout allowlist, depth/count limits; tiada HTML/JS arbitrary | Open-source; renderer/adapter khusus perlu disahkan |
| CPK-06 | Human-in-the-loop | Founder menyemak refund/quarantine/override sebelum command | Reject/expire/stale/retry/CAS conflict tidak menghasilkan mutasi berganda; success ada receipt | Open-source |
| CPK-07 | Frontend tools | Buka order, set filter, sorot rekod dan isi draf | Route/parameter allowlist; tiada arbitrary eval/fetch; tool client tidak mengubah ledger | Open-source |
| CPK-08 | Shared state | Selected order, filters, draft inputs dan proposal reference selaras dengan chat | Field schema/revision; switch user/thread clears context; cannot spoof price/paid/role | Open-source |
| CPK-09 | Headless UI | Workspace custom dan Pet menggunakan agent/thread yang sama; UI BM/English | Accessible, mobile, reduced motion, retry/cancel; tiada duplicate run bila tukar surface | Open-source |
| CPK-10 | Sub-agents | Commerce reader, QC/JEV reviewer dan Marketing drafter di bawah Operations Copilot | Delegate sebenar dengan trace; tool scopes tidak melebar; depth/concurrency/time/token caps | Open-source integration |

Generative UI dan Declarative UI berkait, tetapi deliverable berbeza: CPK-04 memaparkan hasil tool dalam kad tetap; CPK-05 membenarkan komposisi deklaratif yang dibatasi schema. Headless UI menggunakan runtime sama; ia bukan backend kedua. STT/TTS ialah tambahan Pet, bukan label kemampuan ke-11 dalam senarai ini.

## Kontrak terperinci setiap kemampuan

Semua row berikut ialah deliverable wajib, bukan menu pilihan pelaksana. Pilot founder tidak menghapuskan acceptance dealer/customer/staff; journeys role lain kekal disabled sehingga diuji. `abangcolek_ops` ialah agent tunggal browser; specialist IDs mengikut ADR. Had query/run/delegation mengikut [registry](copilot-advanced-tools.md#4-efficiency-layer-yang-ditetapkan).

### CPK-01 — Chat yang grounded

Sediakan perbualan BM/English pada workspace serta Pet. Server membina system instruction dan context bundle minimum; setiap jawapan fakta mempunyai record/document ref, revision dan observed time. Bagi katalog, jawab fakta published sahaja; bagi rekod private, panggil query authorized terlebih dahulu. Tiada jawapan kewangan daripada localStorage, hardcoded examples atau client-supplied history. Jawapan tanpa rekod yang diperlukan menyatakan missing data dan tindakan seterusnya yang dibenarkan.

Acceptance: satu query order sendiri melalui browser -> runtime Fetch -> HttpAgent -> ADK -> canonical query -> streaming reply dengan citation; ID order pengguna lain ditolak tanpa mendedahkan kewujudan. Uji input kosong/terlalu besar, history dengan forged system/tool role, malicious SOP instruction, provider timeout/429, disconnect dan cancel. Stop UI tidak membatalkan command yang sudah committed. Tiada prompt dihantar apabila feature disabled. Rekod event trace dan hasil query; HTTP 200 sahaja tidak lulus.

### CPK-02 — AG-UI Streams

Tambahkan Intelligence kepada thread yang sama setelah external gates lulus. Simpan mapping framework session/thread dan identiti server; reconnection merender events/card/tool status terdahulu tanpa memanggil tool lagi. Reauthorize setiap restore, termasuk owner dan workspace yang telah berubah. Import sejarah ADK, jika diperlukan, ialah langkah explicit dengan permission/retention; ia bukan ongoing database mirror.

Acceptance: putuskan network ketika reply, reconnect dan pulihkan mesej/kad tanpa duplicate; ulang pada peranti kedua dengan owner sama; user lain dan access-revoked restore ditolak. Restart runtime/ADK diuji berasingan dan keterbatasan runner dinyatakan: delivery replay tidak membuktikan execution restart. Semak event ordering/duplicate serta receipt count sebelum/selepas reconnect. Jika Intelligence tidak tersedia secara percuma/sesuai, rekod `blocked_external` dengan sebab; sejarah aplikasi sendiri tidak diberi label Streams. [Semantik delivery dan thread lifecycle](https://docs.copilotkit.ai/threads).

### CPK-03 — Automatic Learning

Pilot hanya completed QC complaint workflows yang dibenarkan dan disunting untuk membuang data sensitif. Pipeline mesti mempunyai linked evidence/run IDs -> candidate insight/skill -> eval terhadap holdout dan regression -> human reviewer -> published version -> delivery kepada agent yang ditetapkan -> rollback. Prompt/tool injection daripada evidence tidak boleh menjadi instruction berautoriti. Learning tidak mengubah model weights, grants, margin policy atau kelulusan refund.

Acceptance: satu candidate sebenar daripada completed authorized runs boleh ditrace kepada evidence; failed eval/rejected review tidak diterbitkan; versi diterbitkan muncul pada run baharu dan rollback memulihkan versi terdahulu. Uji deletion/revocation source dan retention. Tiada training/collection outbound sebelum data/cost gates. Jika provider Learning memerlukan langganan atau akaun baharu, `blocked_external`; reviewed SOP manual hanya dilabel SOP manual. [Lifecycle learning rasmi](https://docs.copilotkit.ai/learning).

### CPK-04 — Generative UI daripada hasil domain

Wajib kad order/tracking, stock/expiry, refund impact, margin dan JEV LOCAL_RULES; setiap kad memakai result schema/version dan source refs sama seperti jawapan chat. Amount integer sen dan ratio dikira domain. Persetujuan di dalam kad hanya menghantar decision kepada approval service; tidak mengubah status kepada success secara optimistik.

Acceptance: GUI-01/02/03/07 lulus terhadap payload sebenar; corrupted/missing result -> error atau insufficient data, bukan fallback angka. Semak stale revision, negative contribution, zero denominator, quarantine stock, no-evidence JEV, failed commit dan `unknown_outcome`. Succeeded label memerlukan canonical receipt yang server lookup, bukan hanya string `receiptId` yang diterima komponen.

### CPK-05 — Declarative UI yang terkawal

Laksanakan GUI-06 sebagai A2UI Fixed Schema Operations Brief dan Refund Impact, menggunakan katalog ABANGCOLEK dan schema versioned yang dimuat pada startup. Agent memilih surface dan data refs dibenarkan; ia tidak menulis HTML/JS, tree baharu atau JSON Pointer kepada state private. Data financial diisi query/evaluator server, bukan angka model.

Acceptance: real A2UI operations sampai melalui middleware kepada renderer dan surface catalog yang betul; unknown catalog/component/path/prop dan oversized/cyclic tree ditolak. Replay tidak memanggil action. Matikan dynamic schema, auxiliary model dan runtime tool auto-injection. Read-only fixed surfaces tidak mempunyai butang kejayaan palsu; approval interaktif memakai CPK-06/GUI-02. Kontrak API mesti disemak pada pinned exports. [Fixed Schema ADK](https://docs.copilotkit.ai/google-adk/generative-ui/a2ui/fixed-schema).

### CPK-06 — Human-in-the-loop dengan domain approval

Urutan tetap: simulation/preview -> immutable proposal -> review payload/hash/impact/revisions/expiry -> approve atau reject -> server revalidation -> allowlisted canonical command -> durable outcome. Founder mendapat command grant tertentu; agent tidak meluluskan proposal sendiri. Approval dan execution mempunyai receipts/status berasingan. Paused agent atau Promise-based frontend interaction tidak menggantikan durable approval record.

Acceptance: approve, reject, cancel UI, expiry, stale policy/entity revision, role revoke selepas approve, duplicate click/two tabs dan server restart; hanya satu effect canonical. Mutasi cloud hanya succeeded selepas CAS commit. Provider timeout selepas dispatch menghasilkan unknown outcome dan reconciliation sebelum retry. Uji forged proposal/receipt/client decision, replayed frontend callback dan lost connection. ADK integration tidak boleh disalin daripada framework yang mempunyai native interrupt lain. [ADK HITL](https://docs.copilotkit.ai/google-adk/human-in-the-loop).

### CPK-07 — Frontend tools yang membantu kerja

Register actions untuk navigate, select record, set allowlisted filter, fill allowlisted draft fields dan request proposal review. Forward melalui ADK `AGUIToolset()` dengan SDK tool/result lifecycle sebenar; local `createFrontendToolAdapter` hanyalah consumer UI. Route enum tidak menerima URL luar, tool tidak mendapat fetch/eval/shell, dan input draf tidak memberi price/payment authority.

Acceptance: ADK mengeluarkan satu frontend tool event, browser menyemak schema/capability/event ID, menjalankan handler sekali dan memulangkan result kepada agent. Uji unmounted handler, rejected/duplicate/expired event, disallowed route/field, navigation pengguna ketika tool pending dan user/thread switch. Hasil `handled` bermaksud UI handler selesai; bukan order/refund succeeded. [Frontend tool wiring ADK](https://docs.copilotkit.ai/google-adk/frontend-tools).

### CPK-08 — Shared state sebagai projection

State allowlist: selected record reference, module filters, unsent draft fields, active proposal reference serta workflow progress. `workspaceId`, `userId`, role/grants dan session mapping berasal server. Ledger values, stock/paid/price/commission bukan writable shared state. Pisahkan state revision daripada entity/policy revision, dan stale patch ditolak atau disegarkan daripada server.

Acceptance: UI selection mempengaruhi context run seterusnya dan authorized agent patch merender UI tanpa duplicate run; malformed/oversized patch atau attempt mengubah role/paid ditolak. Switch thread/account/workspace membersihkan subscriptions, pending frontend tools, cache dan PII. Reconnect tidak memulihkan grant yang telah revoked. Data cross-thread tidak boleh bocor melalui provider/history cache.

### CPK-09 — Headless workspace dan Pet

Gunakan satu agent client/thread/run owner dengan subscriptions dikongsi; workspace dan Pet ialah dua surface kepada state sama. Surface switch tidak create thread/run automatik. Tampilkan source links, cards, approval status, stop/retry dan unread state dengan komponen ABANGCOLEK. Pet collapse/reduced motion tidak mengganggu operasi; voice kekal user-initiated dan boleh disabled tanpa mematikan chat.

Acceptance: mula run pada workspace, buka Pet, sambung thread yang sama, hide/show kedua-duanya dan pastikan satu provider run serta satu effect sahaja. Uji browser refresh, keyboard/screen reader, 320px mobile, light/dark dan reduced motion. `retry` jawapan tidak mengulang committed command. SDK headless entry/API disahkan melalui pinned exports; UI custom yang memanggil endpoint teks legacy tidak lulus CPK-09. [Headless rasmi](https://docs.copilotkit.ai/headless).

### CPK-10 — Delegation specialist sebenar

Operations parent mendelegasi `commerce_reader` kepada read/projection order/stock, `qc_jev_reviewer` kepada LOCAL_RULES/SOP/evidence review dan `marketing_drafter` kepada simulations/drafts. Specialist menerima context refs minimum, subset grants dan baki budget parent; tiada execute/publish/payment grants. Setiap result menyatakan specialist ID, trace/run linkage, sources, assumptions dan missing data. Parent menyatukan hasil; nama agent di prompt sahaja bukan delegation.

Acceptance: satu workflow complaint atau campaign menunjukkan parent-child trace sebenar dan cancellation propagation; specialist tidak boleh memanggil execute, membaca rekod luar scope, mendelegasi lagi atau mendapat budget baharu. Had tetap depth 1, concurrency 2, maksimum 3 specialist calls dalam 6 tool invocations keseluruhan; delegation dan child calls kedua-duanya dikira. Maksimum 3 model/provider attempts keseluruhan parent+children+retry+failover tetap mengatasi specialist-call ceiling; ini tidak membenarkan parent dan tiga model specialists menggunakan empat calls. Partial/failed specialist dipaparkan jujur. Uji convergence tanpa loop dan 429/cancel/deadline. [Sub-agents ADK](https://docs.copilotkit.ai/google-adk/multi-agent/subagents).

## Data, tools dan approvals

[GUI-01..07](copilot-generative-ui-seven-approaches.md) memperincikan Display Only, Interactive, Tool Rendering, State Rendering, MCP Apps, A2UI dan Your Components. Semuanya mempunyai acceptance sendiri, termasuk first-party read-only MCP App dan A2UI Fixed Schema; bukan semua approach sudah diimplementasi.

Pengembangan registry: [Advanced Tool Registry](copilot-advanced-tools.md) mengandungi 32 logical capabilities dengan fixed registrations/specializations, empat workflow dan efficiency/permission contracts. [Free-only model policy](../research/2026-10-19-free-model-policy.md) menetapkan hard gates dan benchmark bagi semua inference; model order tetap ADR dan eval hanya boleh menolak calon tidak layak, bukan memilih paid/offering baharu.

- `get_order_summary`, `list_low_stock`, `get_case_context`, `evaluate_margin` dan `assess_jev` ialah calon read/evaluation tools dengan output schema, sumber dan revision.
- `propose_refund`, `propose_quarantine`, `propose_campaign` mencipta proposal melalui domain, bukan melakukan payout/publish.
- Approval menyimpan payload hash, actor/entity revision, expiry dan sebab. Execution ialah command terpisah yang direvalidate; approved tidak bermaksud succeeded.
- Status: proposed, approved, rejected, expired, executing, succeeded, failed atau unknown_outcome. Reconcile outcome tidak pasti sebelum retry.
- Tiada model output menjadi price, confidence, payment proof, stock balance atau permission authority.
- Frontend tool result, retrieved SOP dan imported document dianggap input tidak dipercayai. Server tidak menerima role/system authority daripada sejarah client.
- Provider switching ialah polisi admin/account, bukan shared global preference yang boleh ditukar semua operational users.

## Intelligence gates

Sebelum CPK-02/03 aktif: sahkan deployment/terms/kelayakan kos, project ownership, credentials server-side, retention/deletion/export, PII redaction dan rekod yang boleh dihantar. Self-hosting tidak bermaksud tanpa kos atau tanpa licensing requirements.

Streams menambah delivery/replay; ia tidak menjamin pemulihan execution selepas server mati. Stop/disconnect mesti membezakan disconnect UI, cancel run dan tool command yang sudah committed.

Learning pilot hanya menggunakan completed QC workflows yang dibenarkan dan disunting. Threshold/schedule ikut project sebenar; jangan menjanjikan skill serta-merta. Skill tidak mengubah weights model. Reviewer memeriksa contoh sokongan dan eval sebelum publish, version pin serta rollback. Skills tidak boleh mengubah pricing, refund permission atau grants.

Jika gate gagal: lapan kemampuan lain masih boleh dibangunkan; sejarah aplikasi sendiri dilabel sebagai persistence sendiri, bukan CopilotKit AG-UI Streams. Reviewed SOP manual bukan dakwaan Automatic Learning aktif.

## Rollout dan kriteria siap

Mulakan founder-only read/draft pilot. Staff, dealer atau customer dibuka berperingkat selepas role/ownership tests; jangan anggap menu Copilot semasa sudah menyediakan semua role.

Setiap kemampuan memerlukan commit/worktree manifest, version lock, test command/result, environment, browser/API/protocol evidence, limit kos dan reviewer. Deterministic mock untuk tests dilabel mock; success live memerlukan real authorized provider. Kesemua 10 dianggap siap hanya selepas CPK-01 hingga CPK-10 mempunyai bukti sebenar termasuk Intelligence.

Evidence register per CPK wajib mengandungi: `capabilityId`, implementation status, files+hashes, exact dependency lock, runtime/agent ID, principal/role, fixture/data classification, test command+exit/result, redacted event/request/receipt IDs, browser capture, external cost/data gate, known limitations dan reviewer/date. Rekod `not_run` apabila ujian tidak dijalankan. Framework docs membuktikan API intent; ia tidak membuktikan source tempatan wired atau deployment tersedia.

Rollback: matikan runtime/feature flags baharu dan pulihkan UI yang sesuai tanpa mengaktifkan semula mock financial actions; tiada automatic replay command. Session/history export dan perubahan schema memerlukan compatibility/backup. Jangan padam audit/receipts bagi menyembunyikan kegagalan.
