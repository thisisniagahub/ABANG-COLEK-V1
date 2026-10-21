# Kilo Code — selesaikan ABANGCOLEK berasaskan bukti

Tarikh penyediaan: **21 Oktober 2026**. Sasaran blueprint: **v2.4**.

Dokumen ini ialah prompt implementasi. Ia tidak mengesahkan projek siap. Baca bersama [matriks semua 85 requirement](KILO-TASK-MATRIX-20261021.md). Penghasilan prompt ini tidak menjalankan Kilo, memasang dependency, mengubah acceptance, melakukan transaksi sebenar atau menerbitkan deployment.

## 1. Arahan kepada agent pelaksana

Kau ialah primary **Code agent / integrator** Kilo Code bagi `D:\ABANGCOLEK-PLATFORM`. Laksanakan semua baki kerja tempatan yang diperlukan oleh blueprint, bukan sekadar memberi cadangan, mengemas kini status atau membaiki compiler. Gunakan subagents secara terkawal mengikut ownership di bawah. Teruskan kerja bebas apabila satu integrasi luar tersekat. Jangan berhenti selepas satu batch untuk meminta pengguna memilih architecture, model, folder, urutan kerja atau kaedah implementasi yang sudah ditetapkan.

Hasil akhir yang dituntut ialah aplikasi yang benar-benar berfungsi: domain commerce selamat, Operations Copilot melalui runtime sebenar, semua UI berkaitan berfungsi, ujian relevan dilaksanakan, status tepat dan pakej release boleh direview. Status siap menyeluruh hanya boleh dilaporkan apabila semua requirement dan environment yang diwajibkan mempunyai bukti. Jika account, entitlement, polisi bisnes atau deployment belum tersedia, tulis baki tepat; jangan menukar makna siap untuk memenuhi objective.

Jangan menjanjikan “tanpa sebarang error” sebagai fakta sebelum verification. Tugas kau ialah mencari, membaiki dan menguji error sehingga tiada kegagalan yang diketahui dalam skop yang dibuktikan; laporkan perkara yang belum dapat diuji.

Kuasa sesi ini meliputi implementasi tempatan, regresi, dokumentasi, runtime QA terasing dan semakan read-only integrasi yang sudah dibenarkan. **Jangan commit/push/deploy dalam sesi prompt ini tanpa arahan release eksplisit yang terpakai kepada perubahan semasa.** Sediakan diff dan release plan dahulu. Jangan bayar, signup, menerima agreement, mencipta polisi perniagaan, meluluskan refund sebenar, menghantar mesej kempen atau memberi founder approval bagi pihak manusia. Ini tidak menyekat kerja kod yang bebas daripada perkara tersebut.

## 2. Autoriti dan pembacaan berperingkat

Baca dahulu, mengikut turutan:

1. `AGENTS.md` root dan mana-mana arahan lebih khusus dalam path tugas.
2. `docs/CURRENT-STATUS.md`, `docs/handover/IMPLEMENTATION-CHECKPOINT.md`, `reports/open-task-backlog-20261021.md`, `reports/wave1-checkpoint-20261021.md`.
3. `reports/implementation/acceptance-status.json`, `reports/implementation/acceptance-verification.json`, `reports/implementation/activation-decisions.json` dan `PROJECT-CHECKLIST.md`.
4. `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md`, `docs/decisions/0003-blueprint-v23-execution-contract.md`, `docs/prompts/AGENT-EXECUTION-CONTRACT.md`.
5. Dokumen ini dan `docs/prompts/KILO-TASK-MATRIX-20261021.md`.
6. Untuk task sahaja: `docs/design/copilotkit-ten-features.md`, `docs/design/copilot-generative-ui-seven-approaches.md`, `docs/design/copilot-advanced-tools.md`, `docs/design/repository-structure.md`, `DESIGN.md`, `docs/design/landing-page.md`, `docs/design/workspaces.md`, `docs/design/brand-spec.md`.
7. Prompt fasa `00-baseline.md`, `03-domains-and-tools.md`, `01-structure.md`, `02-copilot-foundation.md`, `04-ui-and-agents.md`, `05-intelligence.md`, `06-release.md` apabila fasa berkaitan bermula.

Jangan muat semua dokumen/skills/vendor source dalam setiap worker. Hantar petikan kontrak, exact paths dan satu acceptance item sahaja. Backlog BL dan laporan sejarah membantu pencarian; **ledger 85 ID** ialah inventori acceptance, sementara source/runtime/ujian sebenar menentukan kebenaran claim.

Jika ada konflik: arahan pengguna/sistem yang masih terpakai dan AGENTS mengawal cara bekerja; blueprint/ADR mengawal sasaran; canonical domain mengawal transaksi; ledger menyimpan status yang wajib disahkan semula. Rekod konflik semantik dan betulkan dokumen lama secara terpilih selepas source dibuktikan. Jangan menghidupkan semula candidate, model mati atau agent lama kerana teks sejarah menyebutnya.

## 3. Snapshot audit sebagai titik mula, bukan keadaan kekal

Pada audit 21 Oktober, root HEAD `9ffcbb24da55468ae075855700ecc0bf226cc05e`, branch `integrate/blueprint-v23`; remote main dan deployment production berada di `be45a845f311d57212e7e1f1cc88f716cdfd2d93`. **Revalidate sekarang**; nilai ini bukan arahan checkout. Candidate lama `codex-completion-20261020` bukan sumber terbaru secara automatik.

Ledger ketika dibaca: **85 ID = 47 verified_local + 30 implemented_unverified + 8 blocked_external**. Ini label, bukan 47 penerimaan yang sudah sah: audit menemui rujukan test rosak dan jurang tingkah laku dalam beberapa row verified. Jangan mengira baki projek dengan menolak angka ini sahaja.

Bukti audit jika masih tersedia:

- `var/log/whole-project-audit-20261021/REVIEW.md`
- `var/log/whole-project-audit-20261021/audit-summary.json`
- `var/log/whole-project-audit-20261021/checks.json`, `browser.json`, `money-security-probes.ts`, `money-security-probes.jsonl`, `pet-browser-probes.log`, `vercel-errors.jsonl`.

Folder audit tersebut gitignored; prompt ini menerangkan isu secara kendiri supaya ketiadaan log tidak menghalang reproduksi. Audit memperoleh lint/build/boundaries exit 0, Python 23 pass, browser **15 pass / 3 fail daripada 18**. Full platform suite baharu dihentikan selepas **240 saat**; focused launcher 10 pass. Log sejarah 1327 pass/11 todo bukan bukti full suite baharu selesai. Register generator exit 1 pada bukti CPK-09.

Production ketika audit: Vercel READY, tetapi `/api/copilotkit` dan `/api/mcp` HTTP 500; `/api/copilotkit/info` dan `/api/copilot-mcp` 404; katalog public kosong. Logs menunjukkan `uuid` hilang daripada import `@ag-ui/client`, dan `pkce-challenge` hilang daripada import `@modelcontextprotocol/client`. GitHub Actions main tidak bermula kerana billing account locked. Jangan menyamakan READY, root 200 atau push berjaya dengan fungsi aplikasi sihat.

## 4. Preflight sekali, kemudian incremental

Tulis `reports/implementation/kilo-completion-preflight-20261021.md`, `docs/superpowers/plans/2026-10-21-kilo-completion-implementation.md` dan checkpoint ringkas sebelum sebarang perubahan source. Plan implementasi mesti menyenaraikan dependency/urutan, satu acceptance ID per assignment, exact files, input/output contract, red test, langkah implementasi, commands, reviewer, gates dan next action. Ini pelaksanaan keputusan sedia ada; tiada design-approval menu baharu untuk pengguna:

1. Sahkan cwd, HEAD, branch, `git status --short`, `git diff --stat`, `git worktree list`, remote URL dan remote SHA read-only. Rekod manifest hash source/config/lock semasa, termasuk fail untracked relevan. Jangan mengeluarkan secrets atau fail media besar ke chat.
2. Inventori perubahan sedia ada dan ownership. Khususnya semak `.gitignore`, `api/platform.ts`, `vercel.json`, `tests/platform/production-route-restore.test.ts`, perubahan ledger dan pemindahan fail tests yang kelihatan dalam working tree pada 21 Oktober. Jangan menimpa, memulihkan atau menyalin versi candidate lama ke atasnya. Integrasikan perubahan yang benar-benar diperlukan melalui diff terpilih.
3. Periksa proses/listener hanya untuk menentukan ownership. Jangan hidupkan AGY/Copilot/Hermes/Kilo lama atau hentikan semua proses mengikut nama. Worker baharu hanya keturunan sesi Kilo ini. Jangan mengambil alih PID, DB atau port yang tidak terbukti milik sesi.
4. Sahkan versi Bun/Node/Python, lockfile, installed SDK exports, runtime paths dan config. Resolve `node_modules` secara fizikal; jika junction/shared dengan repo lain, **jangan install atau mengubahnya**. Untuk dependency work, integrator menyediakan install terasing mengikut lock di direktori kerja yang dibenarkan; jangan menyalin secret, business DB atau media pengguna.
5. Sahkan tools/MCP yang benar-benar callable serta auth status melalui operasi read-only minimum. Nama dalam AGENTS/config tidak membuktikan server tersedia. Rekod `available / unavailable / unauthenticated`, versi dan fallback. Jangan scan seluruh drive atau dump `.env`.
6. Jalankan baseline fokus bagi isu yang akan diubah. Reuse receipt sah jika source/dependency/recipe sama; jangan mengulang full baseline sebelum setiap task. Pemeriksaan final mesti menggunakan tree yang tenang.

Working directory pelaksanaan tetap root integration ini. Jika ownership aktif bertindih, hentikan write pada path itu sahaja dan teruskan lane bebas. Jika benar-benar memerlukan isolation, integrator menyediakan worktree baharu secara native, merekod base SHA serta patch terpilih yang perlu dibawa; **jangan menganggap worktree HEAD sahaja merangkumi dirty root**. Jangan clone/recreate projek atau bulk copy working tree.

## 5. Keputusan teknikal tetap

### 5.1 Stack, identiti dan authority

- Kekalkan React/Vite/TypeScript, Bun canonical platform, CopilotKit TypeScript runtime `/v2` imports dan Google ADK Python. Jangan migrasi framework, ORM atau database untuk menyelesaikan backlog.
- Kekalkan versi pin/lock yang disahkan; dependency tambahan minimum hanya jika import/tracing membuktikan keperluan. Jangan upgrade seluruh SDK secara rawak. Pisahkan MCP SDK generasi berbeza melalui HTTP seperti ADR; jangan mencampur API pakej berlainan major.
- Agent canonical sasaran `abangcolek_ops`; specialist tepat `commerce_reader`, `qc_jev_reviewer`, `marketing_drafter`. Agent ID legacy `abangcolek` hanya alias migrasi yang diuji dan didokumenkan; frontend, descriptor, runtime dan bridge mesti bersetuju.
- Laluan public canonical runtime `/api/copilotkit`; first-party MCP sasaran `/api/copilot-mcp`. Laluan sedia ada `/api/mcp` hanya compatibility facade kepada implementation dan auth yang sama, bukan server kedua dengan authority berbeza. Sahkan descriptor/info/subpaths dan deployment rewrites sebenar.
- Browser session -> verified principal -> workspace/outlet/dealer scope dan membership revision -> owned thread -> bounded run grant -> official runtime -> authenticated ADK bridge -> canonical tool -> revalidation -> durable domain transaction/receipt -> AG-UI -> UI. Python tidak membaca/menulis commerce database sebagai authority bebas.
- Server sahaja memiliki role, tenant, grants, prices, policy/revision, approval dan outcome. Payload browser/model, CORS, localhost atau X-Actor header bukan bukti authority. Revalidate pada setiap effect/resource read serta restore/reconnect.
- Wang integer sen. Ratio menggunakan BigInt basis points; allocation deterministik, zero drift, explicit zero-denominator. Unknown/not-computed menggunakan `null` serta reason code; jangan menghasilkan 0, false, PASS atau confidence rekaan.
- Simulasi/draf tidak membuat order, reserve stock, settlement, publication atau external send. Local transaction tidak dianggap cloud durable sebelum persistence/CAS berjaya. Idempotency terikat principal + operation + canonical payload hash.

### 5.2 Model dan budget aplikasi

Sumber literal semasa ialah **`STRICT_FREE_CANDIDATE_SEQUENCE`** dalam `shared/copilot-contracts.ts`; AGENTS mungkin menyebut nama generik PROVIDER_CANDIDATES. Jangan mencipta export itu jika tidak wujud. Snapshot order:

1. `gemini_free / gemini-3.6-flash`
2. `gemini_free / gemini-3.5-flash-lite`
3. `openrouter / nvidia/nemotron-3-ultra-550b-a55b:free`

Gunakan canonical register dan policy eligibility, bukan model name sahaja, untuk membuktikan free-only. Provider lain yang direkodkan hidup, termasuk NIM vision atau Groq, bukan lesen menukar susunan lalai; gunakan hanya melalui specialization/config yang telah diluluskan, kos/terms disahkan dan data grant sesuai. Jangan paid fallback tersembunyi untuk voice, vision, title, summarization, learning, evaluator atau memory.

Jangan probe semula calon mati yang disenaraikan dalam AGENTS. Jangan sengaja menghabiskan Gemini 20 panggilan/hari untuk menghasilkan 429. Gunakan unit/synthetic untuk branch quota, cooldown dan failover; live probe minimum apabila diperlukan dan ada quota. NIM 503 bukan semestinya key rosak. Bukti live bertarikh lama tidak mengatasi terms/entitlement semasa. Jika semua calon tidak layak, fail closed dengan reason code; deterministic domain reads boleh kekal tersedia tanpa menyamar sebagai jawapan model.

Had maksimum diwarisi **merentas parent, child, retry dan fallback**:

| Kawalan | Had |
|---|---|
| Run deadline | 30 saat total |
| Model calls | 3/run total |
| Tool dispatches | 6/run total, termasuk discovery/delegation/retry |
| Token setiap call | 8192 input / 1024 output |
| Token keseluruhan | 24576 input / 3072 output |
| Specialist | depth 1, concurrency 2, maksimum 3 calls dalam budget sama |
| Active runs | 1/thread, maksimum 2/principal; duplicate send key -> run asal |
| Rate limit | 10 run creations, 60 canonical tool requests, 120 control requests/min/principal; had domain lebih ketat kekal |
| Request/input | body 64 KiB, mesej 8192 chars, 20 verified history refs, tool args 16 KiB |
| Discovery/context | 8 tool schemas/step, 50 records/page, 20 refs/bundle |
| UI bounds | 2 surfaces/run, 64 components/surface, depth 8, 128 patch ops/event, 512 ops/run |
| UI bytes | 64 KiB envelope/postMessage, 4096 chars/text, 512 KiB cumulative stream |
| MCP resource | 1 MiB decoded UTF-8; first-party resource sahaja |
| Freshness | provider policy TTL <=24 jam atau terms expiry lebih awal; preview <=5 min; high-risk approval <=15 min atau domain expiry lebih awal |

Had SDK yang lebih ketat mengatasi jadual. Query/simulation network <=10 saat dan baki deadline. Reserve budget sebelum dispatch; jangan reset counter dalam Python atau child. Retry unknown external effect dilarang sehingga reconciliation membuktikan outcome.

### 5.3 UI dan produk

Gunakan komponen/token ABANGCOLEK, BM/English, light/dark, keyboard/focus, mobile, reduced motion dan WCAG 2.1 AA. Public landing mengikuti DESIGN.md dan storyboard enam bab dalam landing-page.md, termasuk founder, produk dahulu, CTA sebenar, camera journey/hotspot dan share berasaskan tindakan. Jangan mereka SKU Jerux, jenis buah, stok, harga, testimoni, aktiviti event terkini atau aset founder. Logo/favicon mesti aset ABANGCOLEK sebenar. Jangan menghasilkan semula aset balang/sticker yang telah ditolak pengguna.

Katalog production kosong memerlukan data bisnes diluluskan; sediakan onboarding/import berizin dan empty state yang jujur. Fixture QA bukan data untuk diterbitkan. Share menggunakan canonical published product dan URL sebenar, dengan cancel/clipboard fallback; tiada reward atau penghantaran sosial automatik.

## 6. Skills, plugins dan MCP: guna yang wujud

Baca SKILL.md sebenar apabila task bermula, kemudian dokumentasi/source versi terpasang. Jangan sekadar menulis “menggunakan skill”. Root repo `.agents/skills` diutamakan bagi CopilotKit; global fallback `C:\Users\megat\.agents\skills` dan `C:\Users\megat\.codex\skills` hanya jika boleh dibaca melalui permission semasa. Jangan melonggarkan `external_directory` untuk memaksa akses.

| Task | Skill perlu dibaca jika tersedia | Tool utama dan fallback tetap |
|---|---|---|
| Perancangan/ownership | writing-plans, dispatching-parallel-agents, using-git-worktrees jika isolation diperlukan | Native Kilo task + manifest; jika task tiada, integrator inline mengikut queue sama |
| Bug/regresi | systematic-debugging, test-driven-development, receiving-code-review | Source + red/green tests; selepas 2 percubaan gagal, berhenti meneka dan trace root cause/docs |
| CopilotKit/AG-UI/ADK | `.agents/skills/copilotkit/SKILL.md`, `.agents/skills/copilotkit-cli/SKILL.md` | CopilotKit docs MCP jika callable; selainnya llms.txt -> exact `.md` pages -> installed source. Context7 jika tersedia |
| Auth/persistence/SQL | supabase; supabase-postgres-best-practices sebelum sebarang SQL/RLS change | Supabase MCP read-only project-bound; fallback CLI/auth sedia ada atau migration+tests tempatan. Jangan migrate production tanpa authority |
| UI/browser | playwright; DESIGN.md; product-design audit hanya untuk audit visual yang perlu | Playwright MCP atau installed Playwright CLI. REA hanya jika bukti shipped/runtime forensics diperlukan, bukan source browsing biasa |
| Learning/memory/analytics | copilotkit dan privacy/domain contracts | Official Intelligence docs; gated disabled adapter + meaningful local tests jika entitlement belum ada |
| Channels | `.agents/skills/copilotkit-channels/SKILL.md`; channels-setup jika belum ada; setup-slack-channel hanya provider Slack belum disediakan | Persistent host dan official CLI/API; jangan menggantikan dengan webhook rekaan |
| JEV | typesafe-ai jika dapat dibaca; current JEV source/typed contract wajib | LOCAL_RULES baseline; native SDK/vision hanya dengan evidence sebenar |
| Review/release | requesting-code-review, verification-before-completion | Read-only auditor + integrator-run gates; GitHub/Vercel connector atau installed gh/vercel CLI |

Plugins `superpowers`, `code-review`, `security-guidance`, `context7`, `github`, `vercel` hanya digunakan jika benar-benar tersedia; nama plugin dalam dokumen bukan janji ada tool. Jangan memasang marketplace/plugin/MCP baharu untuk melengahkan implementation apabila fallback source/HTTP/CLI tersedia. Jangan menghantar source private ke servis baru tanpa authority.

Jalankan CopilotKit CLI discovery mengikut skill dan `--help` versi yang tersedia. Bezakan wiring check daripada `--round-trip`, kerana round-trip mungkin menggunakan model quota. Jangan menerima npx install prompt atau menukar dependencies projek tanpa pemeriksaan lock/cache/permission. `verify` lulus bukan pengganti browser/HITL/domain receipts.

## 7. Orchestration Kilo yang wajib

Gunakan **Code** dengan full tool access yang telah dibenarkan. Dedicated Orchestrator mode tidak diperlukan. Dokumen rasmi menerangkan `task` mempunyai context berasingan tetapi directory/worktree yang sama: **subagent bukan filesystem isolation**. Rujukan: [orchestration](https://kilo.ai/docs/code-with-ai/agents/orchestrator-mode), [custom subagents](https://kilo.ai/docs/customize/custom-subagents).

Semak agent registry dan permission yang sudah dimuat sebelum delegation. Roster existing:

| Agent | Owned writes | Batas |
|---|---|---|
| `abangcolek-writer-backend` | exact assigned `server/**`, `api/**`, `shared/**` | Satu acceptance item; tiada edit tests/src/config/docs |
| `abangcolek-writer-frontend` | exact assigned `src/**` | Satu acceptance item; tiada backend/tests/config |
| `abangcolek-writer-tests` | exact assigned `tests/**`, `scripts/**` | Satu acceptance item, tests dahulu; jangan mengubah expectation untuk menutup bug |
| `abangcolek-auditor` | Tiada source writes | Semak call chain, security, tests dan evidence; tidak menandakan sendiri ledger |
| Primary integrator | `agents/google-adk/**`, docs/reports, root config/lock/CI, reconciliation dan scheduling | Jangan edit owned file worker semasa worker aktif; backend/frontend/tests melalui lane berkenaan |

Maksimum **3 writer aktif, satu bagi setiap lane, dan 1 auditor**, tertakluk slot/session limit sebenar. Bukan arahan memenuhi semua slot. Parallel hanya untuk task bebas tanpa shared interface/source race. Jangan dua backend writer mengubah runtime yang sama. Worker tidak boleh fan-out; hanya primary menjadualkan. Tugas lebih besar dipecah kepada acceptance item tunggal dan langkah kecil; primary menyelaras multi-lane task secara sequential.

Untuk satu bug: tests writer menghasilkan failing regression -> handoff/keluar -> owner implementation -> ujian terpilih -> auditor selepas diff stabil -> integrator gates/receipt. Tests worker boleh mengerjakan item lain hanya jika tidak mengganggu fail/gate yang sedang diuji. Lint/build/final suite dijalankan integrator selepas writers pada closure berkenaan quiescent, bukan semua workers berlumba full build.

Jika custom agent belum dikenal registry, gunakan built-in `general` dengan exact ownership brief yang sama dan auditor read-only `explore` untuk source inspection; integrator menjalankan commands yang perlukan writes. Jangan restart seluruh IDE atau mengubah permission ceiling secara automatik. Jika fallback melanggar permission, kerjakan inline dalam authority primary atau catat task blocked, kemudian teruskan kerja bebas.

Periksa `edit`, `write`, `apply_patch`, `bash`, `task` dan `external_directory` semuanya. Ordered permission rule menggunakan last-match-wins; broad allow tidak membuktikan path isolation. Shell, repository scripts dan build boleh menulis walaupun auditor digelar read-only; primary sahaja menghasilkan receipt/build artifacts. Jangan bypass deny melalui shell/redirection atau menganggap pola command sebagai sandbox. Rujukan: [permission rasmi](https://kilo.ai/docs/customize/agent-permissions).

Jika goal tools benar-benar ada, root boleh menggunakan satu objective untuk completion dengan gates dokumen ini; worker tidak mencipta goal. `goal_report complete` ialah claim model, bukan verifier. Kegagalan command/permission mungkin memberhentikan loop; simpan checkpoint, selesaikan sebab yang dibenarkan, dan sambung hanya selaras arahan pengguna. Jangan resume selepas pengguna Stop/pause atau cuba tool yang diketahui denied untuk memaksa autonomy. Jika goal tiada, queue/checkpoint tetap wajib. Rujukan: [Session Goals](https://kilo.ai/docs/code-with-ai/agents/goals).

Brief wajib bagi **setiap** worker:

```text
TASK: <satu acceptance ID atau satu subtask kejuruteraan KILO-xx>
BASE: <cwd, HEAD, source/interface hashes dan task prerequisite>
OWNERSHIP: <exact files; read-only dependencies berasingan>
You are not alone in the codebase. Preserve all other edits. Do not revert others.
CONTRACT: <input/output, trusted principal, domain rules, budgets, typed failures>
RED TEST: <exact file/test, trigger, expected behavior dan negative case>
IMPLEMENT: <bounded steps; jangan reka SDK, data, approval atau outcome>
VERIFY: <exact focused command; primary owns broader gates>
DO NOT: <cross-lane writes, generic proxy, paid fallback, weakened tests, commits>
RETURN: changed file:line, commands/exit/counts, evidence proves/does not prove,
remaining action, blockers, interface changes dan exact continuation.
```

## 8. Queue pelaksanaan tetap dan 12 dapatan audit

`KILO-xx` di bawah ialah paket kejuruteraan, **bukan penambahan denominator 85**. Matriks companion memetakan semua requirement kepada paket ini. Dalam setiap paket, dispatch satu ID/subtask pada satu masa; jangan beri seluruh paket 10 feature kepada seorang worker. Reproduce dahulu; jika code sudah diperbaiki pihak lain, uji dan review fix tersebut, jangan reimplement.

### KILO-00 — preflight dan merancang closure

Lengkapkan §4. Bina dependency queue daripada ledger semasa, termasuk row verified yang disentuh oleh audit. Simpan ownership, exact files, readiness, external gates dan next action. Perbaiki lokasi bukti `.tsxx` selepas mencari actual `.tsx` atau moved files; jangan mencipta placeholder tests untuk memuaskan ledger. Jangan menutup acceptance dengan dokumentasi sahaja.

### KILO-01 — production cold-start dan route parity (dapatan 1)

Input utama: `api/copilotkit.ts`, `server/agents/mcp/**`, `api/**`, `vercel.json`, `package.json`, lock, bundler/SDK exports. Semak perubahan production-route-restore yang sedang ada sebelum menulis.

- Reproduce missing `uuid` dan `pkce-challenge` dalam install/package function terasing. Trace package declaration, lock resolution, conditional exports dan Vercel inclusion; bezakan import smoke daripada invocation sebenar. Tambah explicit dependency atau bundling rule minimum yang dibuktikan perlu.
- Pastikan Bun platform/SQLite entry tidak diimport ke Node function yang tak serasi; probe function runtime dan persistence boundary sebenar. Jangan menghapus domain handlers untuk membuat endpoint hidup.
- Canonical runtime descriptor/info/run dan MCP initialize/tools/resources berfungsi dalam local dev serta build deployment. Compatibility routes berkongsi auth/implementation. Tiada rewrite ke HTML SPA bagi JSON/SSE/MCP subpath. Asset/resource mesti MIME/CSP betul.
- Regresi sejuk: fresh process tanpa cache global, request sebenar, typed unauth response, authenticated descriptor/run dan MCP resource path. Jangan hanya assert source mengandungi package name.
- Public HTTP probe dan authenticated private feature probe dilakukan hanya pada deployment yang berizin; capture URL, SHA, deployment ID, status dan redacted logs. Billing-locked CI direkod sebagai external, bukan dibaiki dengan edit workflow yang melangkau check.

### KILO-02 — principal, MCP membership dan public credential expiry (dapatan 2, 9, 10)

Input: `server/agents/mcp/http.ts`, `server/agents/mcp/server.ts`, `server/agents/mcp/actor.ts`, `server/platform/auth.ts`, `server/platform/paymentCallbackRoutes.ts`, `server/platform/publicOrderProjection.ts`.

- Reproduce initialized founder MCP -> membership/role turun kepada customer, userId sama -> tool/resource private masih boleh dibaca. Initial actor closure tidak boleh menjadi authority kekal. Setiap request memerlukan principal segar dan matching workspace, membership version, role, outlet/dealer scope, expiry/revocation. Invalidate atau rebuild session/grants secara deterministic; reject safely apabila resolver gagal. Test tool serta resource reads, foreign tenant, downgrade, revoke, expiry dan concurrent requests.
- Bootstrap founder mempunyai customer membership terlebih dahulu. `toMcpActor` tidak boleh sekadar memilih active membership pertama. Pilih authority sah **dalam workspace dipilih**, deterministic terhadap reorder; jangan union grants seluruh workspace. Test founder/customer order, revoked membership, mixed outlets/dealer.
- Payment-return route kini memeriksa hash token tanpa expiry yang sama dengan tracking route. Gunakan canonical hashed credential expiry/revocation policy, no PII/existence leak, boundary-time tests dan migration non-destructive bagi token lama. Redirect tetap tidak membuktikan payment.
- CSRF/Origin pada state-changing browser endpoints, session cookies/scope, rate limiting dan redacted errors mesti survive melalui proxy/runtime/MCP bridge. Jangan mempercayai body/header role untuk menutup auth tests.

### KILO-03 — pembayaran, refund dan unknown outcome (dapatan 3, 4)

Input: `server/platform/paymentReconciliation.ts`, payment callbacks, `server/agents/tools/capabilities/governance.ts`, ApprovalService dan canonical ledgers.

- Reproduce signed `pending` event kemudian signed `paid` dengan event ID baharu tetapi transaction ID sama: paid mesti diterima sekali, bukan disekat `PAYMENT_EVENT_ALREADY_APPLIED`. Pisahkan event replay daripada progression transaction; bind provider/account/order/currency/amount. Duplicate paid tidak menggandakan ledger; paid tidak turun kepada pending; mismatch/conflict ditolak. Raw-body signature, timestamp/replay dan provider-specific canonicalization mengikut docs rasmi provider sebenar.
- Fault injection refund: domain side effect berjaya tetapi `saveReceipt` gagal. Keadaan ini pernah meninggalkan proposal executing, receipt hilang dan CAS conflict pada retry. Refund ID deterministik sudah ada; kekalkan dan buktikan exactly-once, jangan mendakwa double-refund sudah berlaku tanpa bukti.
- Simpan durable execution intent/operation identity sebelum effect; unknown outcome kekal unknown sehingga canonical ledger/provider reconciliation membuktikannya. Jika satu transaction boleh menjamin effect+receipt+audit, gunakan boundary canonical itu; bagi external effect gunakan durable intent dan reconciliation, bukan retry buta.
- Test crash/throw sebelum effect, selepas effect, sebelum/selepas receipt, sebelum status commit, timeout, restart dan concurrent replay. State/receipt/financial ledger akhirnya converge tanpa refund berganda atau resit kejayaan rekaan.
- ADV-26 registration mesti tiga: `inspect_action_receipt` Q, `refresh_external_action_status` X, `apply_verified_action_outcome` C. Jangan generic `reconcile_action` yang menukar risk mengikut args. Apply outcome memerlukan trusted verified evidence dan permission/CAS baharu.
- Lengkapkan canonical high-risk executor yang mandat blueprint: refund, quarantine, founder override dan commission contra, hanya apabila domain command/policy sebenar wujud. Unknown executor kekal unavailable, bukan success. Approval diuji expired/already-decided/revoked/revision-conflict/payload-swap; server receipts bukan teks model.

### KILO-04 — Pet/workspace lifecycle, stream dan privasi (dapatan 5, 6)

Input: `src/features/platform/AppRouter.tsx`, `src/features/pet/PetCompanion.tsx`, `src/features/workspaces/CopilotWorkspace.tsx`, run controller dan `src/features/copilot/agui/aguiClient.ts`. Revalidate path/import sebelum edit.

- Reproduce user A -> canary conversation -> logout -> buka Pet tanpa reload. Semua transcript, cached history, selected refs, draft, evidence, thread/run binding dan TTS/audio milik A mesti dibersihkan/diabort. Login B tidak boleh melihat A. Late callback/stream A tidak boleh memasukkan data ke state B. Reset berdasarkan verified identity+workspace epoch, bukan component visibility sahaja.
- Reuse satu shared headless controller/transcript store untuk Pet dan workspace; bukan dua histories yang berkongsi ID sahaja. Restore/reconnect memerlukan ownership semasa. Beralih surface mengekalkan satu run tanpa duplicated dispatch; logout membatalkan kedua-duanya.
- SSE parser mesti stateful merentas chunk, CRLF, split UTF-8 dan split JSON; handle tool/state/error/cancel/terminal events. HTTP 200 dengan error event bukan success. Empty reply tidak boleh menjadi “Tindakan telah diselaraskan…” atau success chime. Success mutation hanya daripada durable receipt.
- Browser tests mesti melaksanakan A -> logout -> B, streamed error, network interruption, cancel, duplicate send dan surface switching tanpa full page reload. Synthetic transport dilabel synthetic; turut uji route SDK sebenar.

### KILO-05 — official runtime, ADK dan thread protocol (dapatan 7, bahagian foundation)

Input: `api/copilotkit.ts`, `server/index.ts`, Copilot runtime/bridge, `agents/google-adk/runtime.py`, `agents/google-adk/app.py`, specialists dan persistence/thread store.

- Pasang verified session resolver pada **route sebenar**, bukan factory test sahaja. Anonymous public principal tidak boleh menjadi default business actor. Browser tidak menghantar actor untuk diterima server. User/session scope dirahsiakan daripada prompt tidak bererti bridge boleh kehilangan auth.
- Gunakan official CopilotKit runtime dan HttpAgent/AG-UI transport versi terpasang. Sambungkan tools dan domain secara end to end; adapter text-only RUN/TEXT/FINISHED tidak melengkapkan tool/state protocol.
- Python bridge mengekalkan owned thread/session dan validated bounded history; jangan fresh UUID/fixed user setiap request atau hantar last user message sahaja apabila requirement memerlukan konteks berterusan. Persistence per user/workspace/thread, purge/retention dan cancellation jelas.
- Propagate satu budget ledger parent/children/Python/retry/fallback. Trace delegation sebenar kepada tiga specialists tetap, narrow grants dan source refs, depth/concurrency/token bounds, timeout/cancel, permission denial dan child unavailable. Child text tidak boleh mengesahkan monetary effect.
- Local thread store/replay yang sudah ada wajib diuji melalui mounted canonical path: thread header, ordered SSE cursor/reconnect, no duplicate effects, cross-principal restore denial. Hosted saved runs/cross-device acceptance tidak ditutup oleh local fixture sahaja.
- Tambah Intelligence client/identifyUser melalui typed config/feature gate apabila SDK/docs memerlukannya. Jika key/account belum ada, constructor/wiring dan disabled behavior masih diuji; jangan fabricate project atau menyatakan local learning sama dengan hosted offering.

### KILO-06 — ketujuh-tujuh Generative UI dan real frontend tools (dapatan 7, bahagian UI)

Lengkapkan ketujuh-tujuh pendekatan melalui live route, bukan import atau mounted shell sahaja:

1. **GUI-01 Display Only:** real authorized tool output -> validated read-only card; source/revision/missing data, no fabricated values. Text tidak menjadi HTML/command.
2. **GUI-02 Interactive:** control callback -> session/CSRF/approval -> canonical executor -> durable receipt -> refreshed UI. Disable repeated/pending clicks dan handle denial/expiry/stale. `ApprovalReviewCard` tanpa callback tidak cukup.
3. **GUI-03 Tool Rendering:** real tool-call start/args/result/error/cancel lifecycle -> existing status components. Teks “sedang…” yang dikarang model bukan tool evidence.
4. **GUI-04 State Rendering:** real `STATE_SNAPSHOT`/`STATE_DELTA` -> validated scope/schema/revision -> UI; client draft revision berasingan daripada business/entity/policy revision. Reject stale/out-of-order/cross-scope patches; state tidak memberi write authority.
5. **GUI-05 MCP Apps:** first-party read-only Operations Brief tool metadata -> MCP UI resource -> actual host mount/iframe handshake -> rendered components. `mountMcpAppHost` perlu caller production; enforce origin/source checks, bounded messages, CSP, sandbox, no arbitrary proxy/remote script, current principal on resource reads.
6. **GUI-06 A2UI:** startup-loaded versioned surface catalog -> attached live AG-UI middleware -> fixed allowlisted schema -> inert renderer. Catalog loader/middleware yang tidak dipanggil route tidak cukup. Enforce limits §5, unknown action/component reject. Tiada Dynamic Schema/extra paid model.
7. **GUI-07 Your Components:** register/reuse komponen ABANGCOLEK sebenar, typed prop validation, themes, keyboard/a11y, loading/error/empty/reduced-motion/mobile, tanpa SDK demo branding atau raw business internals.

CPK-07 frontend tools mesti schemas/definitions sebenar sampai kepada agent dan callback sebenar sampai kepada browser: buka order berizin, set filter, highlight record, isi draf/cart published SKU. Ia tidak terus menulis business state. Allowlist route/action/field, positive quantities dan price revision; arbitrary JS/URL/path ditolak.

Satu acceptance ditutup hanya selepas browser merekod request -> real tool/state event -> rendered result/action -> canonical response/receipt. Unit/component tests kekal bukti lapisan masing-masing.

### KILO-07 — tools/domain lengkap, JEV dan struktur

Laksanakan semua **MOD-01..10, ADV-01..32 dan 19 requirement domain** dalam matriks. Audit row verified juga apabila source/claim bercanggah. Gunakan `docs/design/copilot-advanced-tools.md` untuk input/output dan acceptance boundary tepat bagi setiap tool, bukan katalog nama sahaja.

Jurang yang mesti ditutup termasuk:

- ADV-05: semua checkout conflicts price/stock/fulfilment/loyalty/voucher/stale catalogue, diagnosis read-only dan unsent draft yang memerlukan reprice; offline retry session/payload/idempotency revalidated.
- ADV-07/08/25: preview hash, entity/policy revision, expiry dan immutable proposal binding; missing allocation bukan 0 atau anggaran wang model.
- ADV-15/17/21: loyalty/day-close/QC diagnosis dengan remediation proposal canonical berizin; read-only audit bukan silent repair. JEV menilai evidence sebenar dengan LOCAL_RULES, provenance/reason/null confidence; tidak mengada native TypeSafe/vision/calibration. Integrasi chat mesti menggunakan verdict bertipe dan revalidation, bukan menyalin label PASS.
- ADV-20: export private, quota, CSV injection, bounded size, expiry dan **fresh download authorization/revocation**, bukan URL kekal berasaskan ID.
- ADV-23/24/30/32: drafts/plans/tasks berizin dan grounded; permissions/policy/input revisions dipin. Untrusted SOP/document tidak memberi tool authority. Cadangan task tidak sama dengan assignment dilaksanakan.
- MOD-02/SEC-01: public/private order projection, tracking token hash/expiry/revoke/rate limit dan URL hygiene. Order ID bukan public credential.
- MOD-05/06: dealer org scope, commission due vs payment provenance, refund reversal/contra, referral self/duplicate/OTP/device/velocity signals dan unknown inputs tanpa rekaan risk score. Risk engine sudah mempunyai source/tests; semak sebelum bina semula.
- MOD-08/09: real cost basis/day-close exclusions/MYT period dan citations source/version/permission/expiry; jangan kekalkan metadata NONE setelah code wujud atau claim historical test menutup new code.
- PD-01: consent provenance + preference + opt-out **pada masa dispatch** serta queued jobs dan asset consent; blanket publish-disabled bukan full implementation. Draft tidak send.
- DR-01: backup integrity/manifest, non-destructive restore isolated target, actual measured RPO/RTO dan failure drill. Existing helper tests bukan production recovery drill; jangan overwrite operational DB. Production key/hosting drill kekal gated jika authority belum ada.

Kekalkan Rules Own The Money bagi FIN/PAY/STK/LOY/REF/OFF/OPS. Lengkapkan approved modular structure stages A-D hanya selepas integrity/interface stabil: move manifest/hashes/import parity/test discovery dan boundary checks setiap stage. Tiada wholesale rename atau move runtime data roots. Arah module -> legacy platform sahaja; platform -> agents cycle tidak dibenarkan kecuali exception sah sedia direkodkan, bukan exception baru untuk menyembunyikan violation.

### KILO-08 — learning dan EXT: habiskan local work sebelum gate luar (dapatan 12)

Tulis activation records dengan `localWorkRemaining`, `externalRequirement`, `availabilityReason`, safe fallback dan next concrete action. Gunakan schema repo semasa; jangan mencipta enum sesuka hati.

| Ciri | Implementasi tempatan yang wajib | Gate sebenar yang tidak boleh dipalsukan |
|---|---|---|
| CPK-03 + ADV-28 | Evidence -> candidate -> runnable evaluation -> human publish -> pinned version -> rollback; official client/identifyUser/config wiring, retention dan denied behavior | Account/project key, applicable agreement, Learning container dan cukup eligible consented threads mengikut docs semasa |
| EXT-01 Inspector | Actual dev authorized inspection route/UI integration, redacted fields; production/customer ditolak | Tiada sebab memerlukan hosted entitlement untuk menutup local-only requirement jika source/docs mengesahkan |
| EXT-02 Memories | Identity-bound adapter, scope/filter, opt-out/delete/retention, deterministic unavailable behavior | Hosted project/entitlement dan privacy settings sebenar |
| EXT-03 Analytics | Redacted minimized event schema, opt-out, actual offering adapter dan disabled mode | Product analytics activation/terms; OSS collector sahaja tidak membuktikan hosted feature |
| EXT-04 Channels | Official declaration/activation lifecycle, durable authorized host, status/retry/idempotency/opt-out tests | Provider app, credentials, project dan persistent host; Vercel request function bukan long-running host; no unsolicited live message |
| EXT-05 WebMCP | Own-app allowlisted tool registration, schema/permission/user-activation, revocation/unregister lifecycle tests | Real compatible browser/client/session untuk live protocol proof; page probe sahaja tidak cukup |
| EXT-06 Voice | Actual STT/TTS transport seams, runtime transcriptionService, cancel/timeout, session-safe transcript, permission/retention dan typed unavailable path | Qualified free-only provider credential, quota/current terms dan mic/user consent; UI sahaja tidak membuktikan actual transcription transport. Entitlement hanya jika provider sebenar mensyaratkannya, bukan andaian gate CopilotKit Intelligence |
| EXT-07 Attachments | Canonical attachment ID, scope/MIME/size/content validation, authorized upload/download/delete, retention, bridge/tool passthrough dan provenance | Qualified allowed vision model bagi actual image understanding; file upload sahaja bukan vision |
| PAY-01/02 | Provider-specific callback/verification adapter + mismatch/replay tests + browser pending/paid paths | Merchant account/test credentials/payment config dan authorized test transaction |

Jangan label semua EXT blocked untuk mengelakkan code work. Jangan pula auto-enable capability dengan account kosong. Feature unavailable diberi sebab tepat dan tidak menunjukkan kejayaan palsu. Jika provider/key yang sah telah ada secara selamat, uji menggunakan authority sedia ada; jangan meminta pengguna menghantar secret dalam chat.

### KILO-09 — ledger, verifier, evidence dan docs (dapatan 8)

- Kekalkan **85 unique IDs**: 10 CPK + 7 GUI + 10 MOD + 32 ADV + 19 domain + 7 EXT. KILO task IDs bukan acceptance IDs tambahan.
- Cari/fix 10 rujukan `.tsxx` dalam snapshot. Semak pemindahan tests sedia ada; jangan restore fail deleted yang sudah dipindah dengan tests duplicate. Setiap testFile mesti wujud dan diliputi recipe/CI/typechecking yang sesuai.
- Betulkan semantik `status`, `environment`, `integrationStage`, `evidenceProves`, `remainingRequirement`, `gap`, `externalGate`, activation ref. Snapshot mempunyai 7 verified rows dengan remainingRequirement dan 9 mismatch checklist/register. Jangan sekadar null-kan baki atau ubah metadata tanpa implementasi/bukti.
- Renderer/verifier mesti fail closed bagi verified yang masih ada requirement wajib belum selesai, nonexistent test, test tidak dijalankan, missing source binding atau prose yang tidak mengenal pasti behavior assertion. Per-file pass membantu tetapi tidak membuktikan named acceptance assertion. Per-testcase/JUnit evidence dan review makna assertion diperlukan.
- Source/lock/policy/recipe manifest wajib; receipt generated tidak boleh mengesahkan dirinya sendiri melalui hash cycle. Bezakan receipt/output docs daripada inputs yang diikat manifest; simpan temp output kemudian publish atomically selepas pass. Jika source berubah semasa run, fail closure dan rerun impacted checks selepas quiescent.
- Restructure `verified_local` tidak menjadi preview/production. Hosted requirement belum diuji kekal terbuka walaupun helper local pass. Jangan menggunakan `testNameKind: prose` sebagai jalan keluar gate.
- Tambah negative tests verifier/renderer menggunakan fixture terasing, bukan merosakkan canonical ledger untuk mengetes rejection.
- Selepas task lulus, integrator menulis evidence dahulu, ledger kedua, kemudian generator checklist/register dan current-status/checkpoint/backlog. Jika generator gagal, jangan edit generated checkbox secara manual.
- Dokumen sejarah kekalkan hasil bertarikh dengan supersession link. Selaraskan dokumen aktif yang terkesan, termasuk README prompts, provider register dan runbooks; jangan global search/replace nombor/versi dalam vendor skills atau audit sejarah.

### KILO-10 — tests, landing/browser, Python dan CI (dapatan 11)

- Samakan recipe full suite dengan package `--isolate`; verifier tidak boleh menggunakan recipe berbeza lalu mendakwa suite sama. Trace hanging launcher/subprocess/port/file lock/mock leak dan cleanup; jangan tambah timeout tanpa root-cause proof atau membuang suite.
- Masukkan relevant frontend/ext test typechecks serta Python tests dalam gates/CI yang sesuai. Jangan mengaku strict-mode keseluruhan repo atau coverage 80% tanpa measured report. Untuk business/security changes, ukur coverage relevan dan tutup meaningful gaps; coverage percentage tidak menggantikan adversarial behavior.
- `test:e2e:list` hanya discovery. Laksanakan actual Playwright cases pada disposable QA DB, termasuk Copilot live SDK path serta customer/founder/staff/dealer/developer journeys yang dibenarkan, bukan mock-only surface tests.
- Betulkan tiga browser failures audit: enam chapter journey timeout; butang fallback “Terokai dunia” tiada; test heading `Colek.` bercanggah DOM `DuniaABANGCOLEK.`. Semak approved design/copy dan actual visible behavior untuk memutuskan contract sebenar; perubahan matcher mesti dijelaskan dengan source spec, bukan dilemahkan supaya hijau. Uji scroll/swipe/pointer layering, accessible dialogs, CTA/catalog/share, 4 viewport, keyboard dan reduced motion.
- GitHub billing block ialah account gate. Lengkapkan workflow code yang patut untuk lint/boundaries/tests/Python/browser/build/acceptance tanpa menghapus required checks. Bukti local tidak mengubah CI failure menjadi pass. Jangan menukar billing/account settings.

### KILO-11 — final source-stable verification dan release package

Quiesce semua writers milik sesi. Periksa full diff/import closure dan review business/security oleh auditor. Jika ada perubahan baru semasa gate, rebind manifest dan jalankan semula checks yang terkesan; jangan endlessly ulang semuanya tanpa sebab.

Minimum commands, dijalankan berasingan dari cwd root, exact exit/duration/count disimpan:

```powershell
git diff --check
bun run lint
bun scripts/maintenance/check-boundaries.ts
bun run build
bun run test:platform
bun run test:platform
```

Dua full passes berturut-turut hanya pada final stable tree, bukan setiap worker. Kegagalan/timeout bukan pass; todo/skipped dilaporkan dan tidak boleh mengandungi acceptance wajib yang dikatakan siap.

Python, menggunakan environment projek yang telah disahkan tanpa global pip mutation:

```powershell
& .\agents\google-adk\.venv\Scripts\python.exe -m pytest agents/google-adk/tests -q
```

Jika venv itu tiada, provision venv terasing dengan pinned `agents/google-adk/requirements.txt` dalam authority sedia ada; jangan pip install global. Record interpreter/version dan local/offline versus live-provider proof.

Browser QA memerlukan **dua owned services**, API 3011 disposable database dan UI 3001 proxy ke API itu. Sahkan port kosong/owned dahulu; jika diduduki asing jangan kill/reuse diam-diam. Tetapkan config/fixture origin secara konsisten atau catat port alternatif terasing yang disokong; jangan campur QA account dengan business DB. Jalankan API dan UI sebagai proses berasingan tersembunyi apabila perlu, simpan PID dan hanya hentikan PID yang dimulakan sesi:

```powershell
# Proses API QA, cwd root; bootstrap dan credentials kekal dalam ignored var/run.
bun run qa:server
```

```powershell
# Proses UI QA berasingan, cwd root; installed executable yang disahkan.
$env:PLATFORM_API_TARGET='http://127.0.0.1:3011'
bun .\node_modules\vite\bin\vite.js --host 127.0.0.1 --port 3001 --strictPort
```

```powershell
# Proses test, cwd root; pastikan UI/API ready serta fixture sesuai terlebih dahulu.
$env:PLATFORM_TEST_URL='http://127.0.0.1:3001'
bun run test:e2e
```

Sahkan executable Vite di atas wujud sebelum menjalankannya; jangan ubah default port pengguna. QA launcher sedia ada mungkin belum mount official runtime/MCP; **lengkapkan harness supaya real routes turut diuji**, tanpa menggantikan production services dengan mocks dan mendakwa live SDK pass. Existing config browser channel perlu installed Chrome atau compatible installed browser yang direkodkan, bukan silently skip.

Selepas membaiki verifier/ledger dan menambah bukti yang diperlukan:

```powershell
bun scripts/maintenance/verify-acceptance.ts
bun scripts/maintenance/render-acceptance-register.ts
git diff --check
```

Gunakan full mode dan baca actual script options. `--skip-build`/`--skip-e2e` sesuai untuk diagnostik, **bukan final release receipt**. Jika verifier recipe tidak melaksanakan Python/browser yang wajib, lampirkan receipts sebenar dan baiki enforcement; jangan menganggap satu exit 0 merangkumi commands yang tidak dipanggil.

Release package mesti mengandungi: reviewed owned file list; base/target/source manifest; dependency/lock changes; migration preconditions+rollback; test/protocol/browser/coverage receipts; account/entitlement/business gates; exact proposed atomic Conventional Commits; deployment plan/rollback; known limits; no secrets/runtime DB/media terstage.

Apabila arahan release eksplisit diterima, review concrete diff dan pastikan ownership, kemudian commit secara terpilih, push tanpa force dan periksa GitHub checks + Vercel deployment **untuk exact SHA**. Jangan `git add -A` pada mixed tree. Verify actual domain/runtime/MCP/auth/asset paths/cold start, feature probe dan persisted receipt selepas deployment; root 200 tidak cukup. Jika CI billing/merchant/Intelligence/hosting gate belum selesai, jangan kata production fully functional atau 100% siap. Sediakan rollback release kepada known-good SHA melalui operasi yang dibenarkan; jangan revert edit pihak lain secara buta.

## 9. Checkpoint, ticks dan sambungan tanpa pembaziran token

Primary mengemas kini selepas **setiap subtask yang dibuktikan**, bukan hanya hujung sesi:

1. `reports/implementation/evidence/<ID>.json` mengikut schema repo: command/cwd/version/exit/count/time, source/lock/policy hashes, named assertions, environment, data class, protocol/browser/receipt refs, reviewer dan limits. Jangan simpan chain-of-thought, prompt private penuh, secret atau cookie.
2. Ledger canonical: row boleh turun status jika bukti menunjukkan jurang. Jangan promote kerana code hadir atau worker berkata complete. Semua external row mesti menyenaraikan baki local work berasingan.
3. Render checklist/register melalui script hanya selepas receipt dan gate sah; verified pada environment yang dipenuhi sahaja. Checkbox unfinished tetap `[ ]`. `blocked_external` bukan tick siap.
4. `docs/CURRENT-STATUS.md`, `docs/handover/IMPLEMENTATION-CHECKPOINT.md`, backlog: exact ID selesai, baki, blocker, active workers/owned files, last good commands, next executable action. Jangan menduplikasi ledger manual yang akan drift.

Jika budget/context hampir habis, checkpoint dahulu: task, files/interface hash, red/green state, commands, reason gagal, exact next edit/test dan worker/task IDs. Resume child sedia ada jika supported, selainnya hantar brief bounded yang menyambung checkpoint; jangan ulang seluruh repo audit atau start semua workers semula. Jangan meninggalkan fail separuh ditulis; selesaikan unit edit, laporkan unfinished dan jangan rollback fail campuran pihak lain.

Ukuran operasi: bounded concurrent writers, focused tests sepanjang implementasi, broad gates hanya selepas batch relevan dan final tree stabil. Jangan bertukar model/CLI selepas satu error tanpa diagnosis. Provider 429 tidak diselesaikan dengan retry loop. Sesi coding-harness model/billing berasingan daripada policy free-only model dalam aplikasi.

## 10. Definition of Done dan format laporan

**Local completion** memerlukan semua local implementation yang diwajibkan selesai, meaningful tests positif/negatif, SDK/protocol/browser evidence yang sepadan, security review, lint/build/boundaries/full-suite/Python/browser hijau dan source-stable receipts. Local completion bukan production certification.

**Project completion sepenuhnya** memerlukan tambahan semua gated features yang wajib benar-benar activated/verified dengan authority, approved business catalogue/assets/policies, hosted/persistence/recovery proof, live provider/protocol evidence, authorized release exact SHA, CI lulus dan production routes/journeys sihat. Jangan melabel gated required feature “optional” secara sepihak untuk mencapai 100%.

Laporan akhir wajib ringkas tetapi boleh diperiksa:

- Verdict: `LOCAL_COMPLETE / RELEASE_BLOCKED` atau keadaan tepat yang disokong bukti; status bukan tambahan enum ledger.
- Counts semua 85 IDs mengikut status dan environment, tanpa mencampur component/synthetic/live/preview/production.
- Senarai ID yang ditutup dalam sesi, assertion/receipt dan file:line; senarai baki setiap ID dengan gap dan tindakan tepat.
- Exact commands, exit codes, pass/fail/error/todo/skip dan duration; nyatakan tests yang tidak dijalankan.
- Full changed-file list dan third-party dirty changes yang dipelihara, audit findings fixed versus remaining.
- Runtime URLs/PIDs milik sesi, login flow yang benar-benar diuji tanpa mendedahkan password; preview menggunakan source terkini.
- Commit/push/deploy status sebenar, SHA dan deployment ID jika authorized; jangan mengaitkan deployment lama dengan dirty local source.
- External gates: service/project/environment, requirement tepat, safe disabled behavior, kod tempatan sudah siap atau belum. Jangan meminta secret melalui chat.

**Mulakan sekarang dengan KILO-00; kemudian teruskan KILO-01 hingga KILO-11 mengikut dependencies, dengan tests-first dan subtask terasing. Jangan tamat pada pelan atau ringkasan sahaja.**
