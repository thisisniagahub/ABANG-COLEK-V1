# COPY-READY — Implement ABANGCOLEK Blueprint v2.4

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

**Executor semasa:** Codex inline dalam candidate `D:/ABANGCOLEK-WORKTREES/codex-completion-20261020`. Pengguna menghentikan AGY/Kilo/Copilot/Hermes implementation agents. Baca [CURRENT-STATUS](../CURRENT-STATUS.md), [checklist](../../PROJECT-CHECKLIST.md) dan checkpoint sebelum sambung; jangan menggunakan prompt delegation lama untuk memulakan sesi luar. Blueprint dan skop CopilotKit kekal sama.

Tarikh:20 Oktober 2026. Ini prompt pelaksanaan apabila pengguna mengarahkan implementasi; membaca/review dokumen tidak mengaktifkan provider, migration, merge, push atau deployment.

## Prompt yang perlu diberi kepada integrator

Anda ialah integrator projek sedia ada `D:\ABANGCOLEK-PLATFORM`; pelaksanaan aplikasi semasa dibuat secara inline dalam candidate `D:/ABANGCOLEK-WORKTREES/codex-completion-20261020`, sambil memelihara source asal yang dirty. Siapkan implementasi sebenar blueprint mengikut prerequisite yang telah diputuskan. Jangan berhenti pada pelan, scaffolding atau laporan subagent. Jangan meminta pengguna memilih stack, model, protocol, worktree lane, jumlah worker, nama tool atau susunan fasa.

**Wajib baca dan kemas kini [PROJECT-CHECKLIST.md](../../PROJECT-CHECKLIST.md).** Selepas setiap task, integrator memeriksa evidence dan menukar `[ ]` kepada `[x]` hanya apabila keseluruhan acceptance item itu selesai. Source separa, blocked, failed dan not-run kekal unchecked. Sync checklist, acceptance register dan checkpoint, serta rekod current/next task sebelum handoff atau tamat sesi. Worker menghantar bukti; mereka tidak menulis tick canonical serentak. Kontrak lengkap ialah execution contract§10.

Baca mengikut urutan:

1. `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md` v2.4.
2. `docs/decisions/0003-blueprint-v23-execution-contract.md` (filename legacy; keputusan semasa di dalam).
3. `docs/prompts/AGENT-EXECUTION-CONTRACT.md` — semua defaults, identity, financial invariants, skill/plugin/MCP manifest dan reason codes wajib.
4. `docs/prompts/ACCEPTANCE-REGISTER.md` —78 requirement teras dan7ekstensi berasingan.
5. `reports/blueprint-review-20261020.md` serta laporan domain yang dipautkan.
6. `docs/design/repository-structure.md`, `docs/design/copilotkit-ten-features.md`, `docs/design/copilot-generative-ui-seven-approaches.md` dan `docs/design/copilot-advanced-tools.md`.
7. `docs/research/2026-10-19-free-model-policy.md`.
8. Prompt fasa00..06. Checkpoint ialah evidence ledger untuk diaudit, bukan authority mengatasi source.

## Hasil yang mesti diserahkan

- Satu source/worktree manifest yang jelas dan satu implementation canonical; jangan menindih kerja agent/pengguna.
- Official CopilotKit TypeScript runtime + AG-UI + ADK, accessible shared Chat pada workspace/Pet, tools berizin dan genuine protocol lifecycle.
- Kesemua10 CPK: Chat, AG-UI Streams, Automatic Learning, Generative UI, Declarative UI, Human-in-the-loop, Frontend tools, Shared state, Headless UI, Sub-agents. Dua Intelligence capabilities boleh kekal `blocked_external` hanya jika prerequisite sebenar tidak tersedia; jangan menandakan10/10 siap.
- Kesemua7 GUI: Display Only, Interactive, Tool Rendering, State Rendering, first-party read-only MCP App, A2UI Fixed Schema, Your Components.
- Kesemua10 MOD dan32 logical ADV capabilities; semua specializations/risk-split registrations mengikut registry. Jangan menambah33logical capability atau menggunakan generic tool untuk menutup jurang.
- EXT-01..07 mempunyai explicit activation state dan tests/disabled reason: Inspector, User Memories, Capture/Analytics, Channels, WebMCP, Voice, Attachments. Ini bukan7CPK tambahan; jangan auto-enable external processing atau outbound messaging.
- Tiada fabricated facts, fake financial receipt, unsafe role/history trust atau paid fallback.
- Acceptance receipts setiap ID dan laporan local/preview/production yang berasingan. Tests wujud tidak semestinya tests pernah dijalankan.

## Langkah pertama — jangan edit aplikasi dahulu

1. Rekod timestamp Malaysia, cwd, `git rev-parse HEAD`, branch, origin, worktrees, tracked/untracked/index/working diffs, hashes fail owned dan listener/runtime identity. Jangan output secret, cookies, token atau business rows.
2. Baseline audit asal ialah root integration60311aa/main e736856; ia historical. Receipt lebih baharu merekod main18c69b3 bagi patch11 fail konfigurasi sahaja. Sahkan actual HEAD/dirty source; jangan checkout/reset kepada mana-mana nilai lama.
3. Sambung candidate `codex-completion-20261020` berdasarkan manifest takeover. Worktree lama `copilot-completion`, frontend/backend dan multi-CLI bukan lane aktif; preserve index/HEAD/MERGE_HEAD/dirty changes masing-masing. Jangan memulihkan, membersihkan atau menggunakan lane lama secara automatik.
4. Bandingkan release main dengan integrasi. Kekalkan pembaikan landing/deployment/Bun/SPA yang sudah disahkan. Kod HITL/fixed facts dalam integrasi belum layak masuk main sehingga03A/02/03B lulus.
5. Gunakan baseline receipt yang masih sepadan dengan manifest; jalankan checks yang diperlukan untuk perubahan aplikasi semasa dan final-source release. Rekod command/result serta failures/timeout; jangan mewarisi count lama atau mengulang semua baseline untuk task Markdown sahaja. Runner browser/fixture yang berkongsi data tidak dijalankan serentak.
6. Inventori actual skills/tools/plugins, exact SDK metadata/exports/peers dan provider configured status sahaja. Review npm/PyPI20 Oktober membuktikan availability metadata, bukan compatibility installation.
7. Pelihara baseline dan activation artifacts sedia ada. Append receipt baharu apabila ada evidence; jangan mengosongkan atau membina semula ledger85-ID daripada78-row prompt lama. Paparan snapshot bukan verified publish; verifier/renderer mesti menerima fresh receipt sebelum final acceptance ditutup.

## Pelaksanaan berfasa — urutan tunggal

| Urutan | Prompt | Gate untuk bergerak |
|---|---|---|
|00|[Baseline](00-baseline.md)| Source/ownership/dependencies/permissions dan baseline diketahui; tests gagal direkod, bukan disembunyikan |
|03A|[Integriti dahulu](03-domains-and-tools.md#fasa-03a--integriti-sebelum-struktur)| Margin/allocation/refund/payment/tracking/loyalty/CAS negative tests serta domain/security review |
|01|[Struktur](01-structure.md)| Move/caller/hash/dependency boundaries sah; tiada content/data hilang |
|02|[Runtime dan Chat](02-copilot-foundation.md)| Official pinned SDK/ADK imports+synthetic protocol, verified identity dan shared controller; live rows berasingan |
|03B|[Tools dan modul](03-domains-and-tools.md#fasa-03b--registry-tools-dan-modul)|32 logical/semua registrations+MOD10 scoped outputs, nofakefacts/receipt |
|04|[UI dan subagents](04-ui-and-agents.md)| GUI7+CPK UI/state/HITL/headless/delegation acceptance sebenar |
|05|[Intelligence](05-intelligence.md)| Existing free account/privacy gates; jika tiada, blocked record dan teruskan06untuksubset yang lulus |
|06|[Verification dan release](06-release.md)| Exact artifact/restore/security/QA/compatibility dan release authority; tiada whole-project claim jika blocked |

Jika prerequisite phase tertentu gagal, teruskan hanya task bebas yang tidak bergantung padanya. Jangan menukar urutan untuk menanda phase dependent lengkap. Satu gate luar tidak memberi lesen menangguhkan semua local/synthetic work.

## Ownership dan collaboration

Integrator memiliki composition/shared contracts/dependencies/moves/checkpoint/release. Sesi semasa dilaksanakan inline; jangan melancarkan implementation workers walaupun collaboration tools tersedia. Lane backend, frontend dan Python ialah pembahagian scope kerja Codex, bukan arahan spawn. Penggunaan semula worker hanya boleh dipertimbangkan selepas pengguna mengaktifkan delegation semula; ketika itu setiap lane mesti mempunyai fail owned, interface snapshot, negative tests dan exit gate, serta memelihara perubahan pihak lain.

Gunakan `executing-plans` secara inline untuk sambungan semasa. Jangan bertanya pengguna jumlah agent atau menunggu proses yang tidak pernah bermula. Report lama hanyalah input semakan; integrator mesti membaca diff dan mengesahkan output tests pada source yang berkaitan.

Selepas implementasi, jadualkan TypeScript/Python/security/database/domain reviewer yang berkaitan. Reviewer read-only dahulu; pembetulan kembali kepada owner. Reviewer yang tidak tersedia direkod sebagai limitation, bukan independent pass palsu.

## Stack dan dependency yang terkunci

React/Vite+Bun; official runtime imports `/v2`; `HttpAgent`; Google ADK Python3.12 + AG-UI bridge; agent `abangcolek_ops`. Pins tepat ADR-0003, termasuk MCPv2host peers bersama runtimeSDKv1 melalui authenticated HTTP boundary. Jangan menyalin example Node/Express/Next.js atau Built-in Agent secara membuta tuli. Gunakan SDK Fetch handler yang disahkan pada Bun; CLI wiring check selepas true runtime tersedia.

A2UI Fixed Schema tiada secondary-model schema injection. Fixed surfaces OperationsBrief/RefundImpact read-only; supported GUI-02 callbacks mengendalikan draft/approval. MCP App mesti mempunyai initialize/tool/UI-resource/host protocol, sandbox/CSP/origin/resource grants. Kad statik tidak memenuhi protocol acceptance.

Ports/UI routing/session paths, input/rate/token/tool/model budgets dan expiry tepat ialah execution contract. Jangan memilih port/model/provider/had sendiri. Config deployment mesti mengekalkan Bun1.x dan cleanURLs-safe SPA fallback.

## Model, account dan privacy gate

Calon sahaja: `gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> OpenRouter `nvidia/nemotron-3-super-120b-a12b:free`. Exact offering, account, tool compatibility, fees/overflow, privacy dan verification TTL wajib disahkan sebelum call. Nama model/free suffix/pricingpublic tidak mencukupi. Benchmark minimum60synthetic cases hanya melalui calon yang telah lulus gate; synthetic provider tanpa model boleh digunakan untuk protocol/security tests.

Adapter ditetapkan ADR: native ADK Gemini; OpenRouter menggunakan app-owned `BaseLlm` subclass melalui pinned httpx pada `agents/google-adk/models/free_openrouter.py`, exact OpenRouter chat-completions endpoint/model field. Tiada LiteLLM/optional router dipilih sendiri, bare external model string atau duplicated TypeScript provider call. Import/transport compatibility yang gagal menghasilkan `MODEL_ADAPTER_INCOMPATIBLE`, bukan pertukaran stack.

Jika semua calon tidak layak, expose labeled unavailable/local_rules sahaja. Jangan mengarang harga, data atau provider success untuk membuat chat nampak aktif. Model order tidak disusun semula oleh eval secara automatik. JEV kekal LOCAL_RULES tanpa vision/confidence/native claim palsu.

CPK-02/03 memerlukan Intelligence yang benar-benar diluluskan dan percuma untuk penggunaan tersebut. Native ADK persistence dan manual SOP review tidak dilabel sebagai produk Intelligence. Jangan login/create project/subscribe/pay/menghantar history untuk menutup gap.

## Skills, plugins dan MCP

Baca manifest execution contract§6/7 untuk exact paths dan fallback. CopilotKit skill+current docs/pinned source ialah wajib bagi API; Context7 primary jika callable. GitHub/Vercel/Supabase/Playwright plugins hanya digunakan jika actual tool dan authorization tersedia. CLI `gh`/`vercel` yang telah disahkan ialah fallback, bukan token yang direka. Jangan menambah MCP servers, bulk skills atau plugins sebagai kerja kosmetik.

Development MCP bukan first-party MCP App dalam aplikasi. JEV tidak memerlukan native model skill untuk local deterministic evaluator. Channels/Slack/Teams, WebBridge authenticated browser dan voice/vision skills hanya dibaca pada task berkaitan; tiada mesej/perkongsian luar tanpa arahan sebenar.

## Kontrak bukti dan syarat siap

Untuk setiap ID: source/hash/commit+dirty manifest, test path/name, command, actual exit/result, environment/timestamp, protocol/browser/provider/receipt artifact, cost/privacy state, reviewer dan batas bukti. Bezakan `implemented_unverified`, `verified_synthetic`, `verified_local`, `verified_preview`, `verified_production`, `blocked_external`, `failed`, `not_run`. Jangan menaikkan source presence kepada verified.

Jalankan baseline/final `bun run lint`, `bun run build`, `bun run test:platform`, locked Python tests dan scoped browser suites mengikut phase. Jangan tambah coverage claim tanpa denominator. Failure injection mesti meliputi expired/revoked/forged grants, cross-user threads, history/tool injection, stale approvals, duplicate execution, CAS uncertainty, abort, quota, server restart, malformed MCP/A2UI dan worker reconciliation.

Update `docs/handover/IMPLEMENTATION-CHECKPOINT.md` selepas setiap batch; supersede dakwaan lama yang tidak disokong, jangan memadam historical evidence. Exact next ready task dan blocker diperlukan. Jangan berhenti untuk meminta pengguna memilih seni bina yang sudah ditetapkan. Jika external action memerlukan user, sediakan hasil yang boleh direview dan nyatakan hanya tindakan/prerequisite yang diperlukan sambil meneruskan kerja bebas.

Owned atomic commits dan push/deploy hanya selepas checks serta authorization sesi yang masih sah. Tiada force-push/bulk-stage; tiada deploy branch integrasi dengan fake success. Jika GitHub CI account billing blocked, rekod anotasi dan jangan claim greenCI. Vercel Ready tidak cukup: semak exact SHA, automatic custom-domain assignment, direct/login routes, API JSON, asset MIME dan browser actual.

Laporan akhir mesti menyatakan subset yang siap, semua requirement blocked/not-run dan tindakan seterusnya yang executable.10 features hanya lengkap apabila semua10 CPK mempunyai bukti pada environment yang dinyatakan. Menyiapkan dokumen atau landing tidak bermakna Copilot siap.
