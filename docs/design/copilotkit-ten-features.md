# ABANGCOLEK — Reka Bentuk Penggunaan 10 Kemampuan CopilotKit

Tarikh: 19 Oktober 2026. Status: Kontrak sasaran di bawah blueprint v2.3; belum dilaksanakan atau diaktifkan. [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md) menetapkan pilihan pelaksana. [Prompt utama](../prompts/IMPLEMENT-ABANGCOLEK.md) menetapkan urutan tanpa pemilihan seni bina baharu.

## Matlamat dan batas

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

Dokumentasi disemak melalui web dan Context7. Pin versi dependencies yang serasi sebelum implementasi; jangan gabungkan contoh v1/v2 atau menganggap model contoh masih tersedia/percuma. Rujukan source repo ialah baseline yang perlu diperiksa semula kerana worktree masih berubah.

## Seni bina dicadangkan

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

Intelligence: adapter pilihan untuk Streams dan Learning
ADK sessions: persistence agent tersendiri, bukan ledger commerce
```

### Keputusan utama

1. Pilihan utama ialah laluan Google ADK Python yang didokumenkan. Python service memerlukan lifecycle/hosting sendiri; Vercel frontend sahaja tidak menjalankannya secara automatik. Jika servis percuma yang sesuai tidak tersedia, buktikan secara local dahulu dan rekod blocker production.
2. TypeScript CopilotRuntime berbeza daripada agent Python. Pilihan ini tidak memerlukan Python CopilotKit runtime atau migrasi frontend Next.js.
3. Runtime baru tidak dibungkus terus dalam `createDurableHandler` commerce. Streaming boleh terus berjalan selepas handler memulangkan Response dan selepas store sementara ditutup. Tools memanggil API canonical melalui request tersendiri dan menunggu durable receipt.
4. Auth browser disahkan pada runtime; Python tidak mempercayai `user_id`, role atau workspace daripada payload browser. Gunakan grant server-to-server terhad dengan audience, expiry, scope, thread/run dan identiti yang boleh direvalidate/revoke pada command boundary. Tiada unrestricted service-role access untuk agent.
5. Stable mapping `(workspace, user, thread) -> ADK session`; session storage tidak berkongsi fail SQLite commerce secara terus. Rekod keputusan persistence/deployment dan retention sebelum release.
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

## Data, tools dan approvals

[GUI-01..07](copilot-generative-ui-seven-approaches.md) memperincikan Display Only, Interactive, Tool Rendering, State Rendering, MCP Apps, A2UI dan Your Components. Semuanya mempunyai acceptance sendiri, termasuk first-party read-only MCP App dan A2UI Fixed Schema; bukan semua approach sudah diimplementasi.

Pengembangan registry: [Advanced Tool Registry](copilot-advanced-tools.md) mengandungi 32 calon tool, empat workflow dan efficiency/permission contracts. [Free-only model policy](../research/2026-10-19-free-model-policy.md) menetapkan hard gates dan benchmark pemilihan model bagi semua inference; model yang belum diuji tidak dilabel terbaik.

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

Rollback: matikan runtime/feature flags baharu dan pulihkan UI yang sesuai tanpa mengaktifkan semula mock financial actions; tiada automatic replay command. Session/history export dan perubahan schema memerlukan compatibility/backup. Jangan padam audit/receipts bagi menyembunyikan kegagalan.
