<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PELAN / PROMPT LAMA — superseded sebagai arahan execution oleh prompt pelaksanaan canonical di bawah. Checkbox, command, model, path runtime dan keputusan reka bentuk lama dikekalkan untuk provenance; jangan jalankan secara literal. Baseline, migrasi dan bukti semasa mesti ditentukan oleh blueprint dan prompt canonical.
>
> Rujukan semasa: [Master Growth Blueprint](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Prompt sambungan pembangunan ABANGCOLEK

Anda mengambil alih kerja sebenar yang sudah berjalan. Baca handoff ini, semak keadaan workspace terkini, kemudian teruskan pelaksanaan. Jangan restart projek dari kosong, ulang audit besar tanpa sebab, atau berhenti pada cadangan sahaja.

## 1. Objektif dan arahan pengguna

Pengguna mahu:

1. Semua task release yang tertangguh diselesaikan, diuji dan direview.
2. Browser tab menggunakan logo ABANGCOLEK sebenar.
3. Perubahan dipush ke `main`, autodeploy Vercel, dan behavior production disahkan dengan bukti sebenar.
4. Backend production menggunakan Supabase yang telah dipilih.
5. Semakan seluruh repo dan pembaikan isu sebenar, bukan sekadar build hijau.
6. AI agent asal ABANGCOLEK-OS disemak dan disambungkan semula dengan betul. Pengguna menegaskan agent itu MEMANG SUDAH ADA. Jangan mencadangkan membina pengganti baru seolah-olah agent asal tidak pernah wujud.
7. MCP dibiarkan dahulu. Jangan sambung setup/authentication MCP atau ulang pemasangan skills kecuali pengguna meminta semula.

Pengguna sudah memberi kebenaran untuk fix, test, commit, push `main` dan deployment. Jangan meminta izin semula untuk tindakan rutin dalam skop itu. Jangan deploy dengan credential palsu atau menganggap provider yang belum tersedia sudah berfungsi. Penjelasan guna Bahasa Melayu dengan technical English, ringkas dan berasaskan bukti. Pengguna sangat menekankan: check live sebelum kata dah fix.

## 2. Workspace dan identiti projek

- Workspace utama: `D:\ABANGCOLEK-PLATFORM`
- Shell: PowerShell / Windows; timezone `Asia/Kuala_Lumpur`.
- Repo: `https://github.com/thisisniagahub/ABANG-COLEK-V1.git`
- Branch: `main`; repo GitHub public.
- Vercel: team `niaga-hub-pro`, project `abang-colek-v1`.
- Vercel project ID: `prj_Nkz71FEhQqXKOCnalq9e46hLft8S`.
- Domain production sebenar: `https://abangcolek.gangniaga.my`.
- Supabase project: `yeszjvcnjxumujxinahz`.
- Supabase URL: `https://yeszjvcnjxumujxinahz.supabase.co`.
- Supabase org: `oustyzojbyibizpatetu`.
- `D:\ABANGCOLEK-OS` ialah checkout rujukan lama yang memang wujud. Boleh inspect read-only; jangan edit/overwrite/clone semula tanpa keperluan.
- Domain lama `abangcolek-os.vercel.app` dan Supabase project lama `bktksvhcgszaoqkdyhil` BUKAN target release ini.

## 3. Git: sudah commit lokal tetapi BELUM push

Snapshot terakhir:

- Remote `origin/main`: `a3f38bb1e88a03530301da7f473e4fb088db230c`.
- Tiga commit lokal di atasnya:
  - `3fcbb22 chore: stop tracking generated browser profile`
  - `dd5951c fix: patch vulnerable transitive dependencies`
  - `56bfa93 fix: harden platform authority and prepare persistent production runtime`
- HEAD terakhir: `56bfa93`.
- Banyak perubahan release-completion selepas HEAD masih UNCOMMITTED. Pada snapshot terakhir tiada fail staged.
- `.mcp.json` untracked, telah dikonfigurasi tetapi authentication belum siap; pengguna mahu biarkan dahulu.

PENTING: terdapat dirty changes milik pengguna yang tidak berkaitan: deletion sekitar 17 fail `.manus/mcp-results/*`, deletion `public/assets/brand/icon128.png`, ZIP/media import, `.work`, outputs, laporan lama dan plan 2026-10-17. Jangan `git add .`, restore, clean, reset hard atau commit semuanya. Stage fail release yang telah direview secara explicit. Folder Chrome profile yang dikeluarkan daripada Git oleh commit `3fcbb22` masih disimpan di disk; jangan padam data lokal atau rewrite history.

## 4. State Supabase / Vercel yang SUDAH berubah

Pengguna telah menjalankan `supabase/sql/platform-runtime.sql`. Ia bukan lagi semata-mata dakwaan: probe HTTPS sebenar telah berjaya menggunakan credential yang diberi pengguna:

- `platform_runtime_load` dengan server secret: HTTP 200, revision 0, payload null pada masa probe.
- RPC sama dengan public key: HTTP 401, tidak boleh membaca snapshot private.
- Private bucket `platform-evidence`: service upload/read HTTP 200, public read ditolak HTTP 400.
- Probe storage sementara telah dibersihkan; tiada dummy customer/order/product ditambah.
- Supabase Auth public settings: `external.google === true`.

Vercel CLI `59.1.3` telah login sebagai `thisisniagahub-7253` dan boleh akses project yang betul. Git integration telah disahkan menunjuk repo betul dan production branch `main`.

Environment Production kini disenaraikan termasuk:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PUBLISHABLE_KEY
SUPABASE_JWKS_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
PLATFORM_WORKSPACE_ID
PLATFORM_ALLOWED_ORIGINS
PLATFORM_BOOTSTRAP_TOKEN
CRON_SECRET
```

JANGAN salin nilai credential ke prompt, source, laporan, terminal output atau Git. Secret pernah diberikan dalam chat; perlu rotate melalui proses selamat selepas sambungan dikendalikan. Jangan ulang nilainya. Presence env bukan bukti nilainya betul dalam deployed bundle; verifikasi deployment masih wajib. `VITE_SUPABASE_ANON_KEY` mesti publishable/anon sahaja, tidak sekali-kali server secret.

Kod baru menyokong modern `SUPABASE_SECRET_KEY` dengan fallback legacy `SUPABASE_SERVICE_ROLE_KEY`. Modern `sb_secret_` dihantar pada header `apikey`, bukan bearer JWT. User access token Google pula dihantar sebagai `Authorization: Bearer <user-token>` untuk `/auth/v1/user`. Semak juga fallback apabila variable modern kosong, bukan sekadar undefined.

Fail operator ignored berikut wujud; jangan print atau commit kandungannya:

```text
var/run/production-owner-bootstrap.token
var/run/production-cron.token
```

GitHub Actions pada SHA remote lama gagal sebelum runner bermula kerana account billing. Itu berasingan daripada Vercel Git integration. Semak semula status; jangan disable validation atau dakwa billing selesai. Workflow baru menjalankan lint/test/build tanpa syarat, CLI deploy optional jika `VERCEL_TOKEN` ada; jika tiada ia memberi notice bahawa native Git integration mengurus deployment.

## 5. Architecture dan pembaikan yang sudah ada

React/Vite frontend + canonical Bun/SQLite domain API. Production baru menggunakan native Vercel Bun functions, dengan snapshot Supabase sebagai authority:

- `server/platform/supabasePersistence.ts`: load checksum/header verified SQLite, temp database per request, CAS commit sebelum melepaskan response/cookie. Missing row sahaja boleh initialize; network failure tidak fallback ke empty DB.
- GET/HEAD conflict retry terhad; mutations tidak auto replay.
- SQL private RLS tables/RPC service-only; restrictive Storage policy untuk `platform-evidence`; commit receipt retention 24 jam.
- `EvidenceStorage` injected, remote immutable files, size/hash verification dan revalidation selepas await. Jangan delete remote object apabila commit outcome uncertain.
- Snapshot cap 16 MiB; bukan normalized PostgreSQL migration atau high-concurrency backend.
- `api/platform.ts` dan `api/platform/[...path].ts` ialah canonical function/catch-all; SPA rewrite mengecualikan API.
- `scripts/public-database.ts` + prerender kini boleh baca cloud snapshot secara read-only dan fail closed untuk configured cloud yang gagal; local default masih baca DB sebenar. SEO ialah build snapshot, perlu rebuild selepas catalogue berubah.
- Client file limit 3.8 MB; hosted request 4 MB; response helper baru memberi bounded failure untuk download besar.
- Official favicon sudah ditukar dalam source kepada `/assets/brand/ABANG-COLEX-LOGO-2.png`.
- Cart stale stock/pack removal, pagination selection, pending form values dan quote refresh telah diperbaiki.
- Business freight/founder context tidak lagi boleh diakses customer. Workspace fake external success dibuang.
- Onboarding input validation/idempotency, rollback provenance/dependency guards, webhook raw signed bytes, observed database health telah diperbaiki.
- Dependency overrides ditampal: `@grpc/grpc-js@1.13.6`, `source-map-js@1.2.2`; audit bersih pada run terakhir.

## 6. Perubahan terbaru yang BELUM commit

Baca diff sebenar dahulu. Antara fail yang terlibat:

```text
api/platform.ts
api/platform-worker.ts                         NEW
scripts/public-database.ts
server/automation/automation.ts
server/automation/cloudWorker.ts                NEW
server/automation/definitions.ts
server/platform/app.ts
server/platform/auth.ts
server/platform/googleIdentity.ts               NEW
server/platform/hostedResponse.ts               NEW
server/platform/migration/legacyMaps.ts
server/platform/migration/migrationReconciler.ts
server/platform/onboarding.ts
server/platform/supabasePersistence.ts
server/platform/whatsapp.ts
shared/automation-contracts.ts
shared/onboarding-contracts.ts
src/features/platform/AppRouter.tsx
src/features/workspaces/ProductOnboarding.tsx
src/services/supabaseConfiguration.ts
vercel.json
docs/superpowers/plans/2026-10-18-release-completion.md NEW
```

Ujian baru termasuk `cloud-worker`, `google-identity`, `google-platform`, `hosted-response`, `onboarding-settings-integrity`, `outbound-safety` di `tests/platform/` dan `tests/e2e/onboarding-policy-completion.spec.ts`. Existing import-integrity, legacy-migration, product-onboarding dan supabase-persistence tests turut diubah.

Behavior terbaru:

- WhatsApp/Postiz local intent claim sebelum provider await, actor/input idempotency, ambiguous result unknown, bounded transport/cancel/reconcile dan fresh authority. Ini durable untuk LOCAL SQLite sahaja. Jangan inject provider dalam snapshot cloud kerana local claim belum remote-committed sebelum effect. Cloud external outbox masih memerlukan reka bentuk dua fasa sebelum activation.
- `drainLocalJobs(jobs,{maximumJobs,workerId})` menjalankan first-party work sahaja. Standard cloud request pump drain maksimum 2 sebelum request; dedicated worker maksimum 10 melalui authenticated cron.
- `/api/platform-worker` GET menggunakan timing-safe bearer `CRON_SECRET`, bukan browser cookie. `vercel.json` ada daily cron `0 2 * * *` (10 pagi Malaysia).
- Free-text automation belum ada executor sebenar. Enable ditolak; legacy saved enabled diproject sebagai paused + readiness reason tanpa mutate source. Jangan sekadar menukar flag untuk mendakwa scheduler siap.
- Onboarding approved location/dealer terms kini disimpan secara canonical dengan `expectedSettingsVersion`. Approval manual, verified date/hours/address wajib untuk approved location. Settings-only packet dengan `products:[]` disokong. Opening stock memerlukan lokasi approved dalam packet atau canonical existing policy; transaction reject jika tidak.
- Historical Delivered/Refunded tidak lagi mencipta verified payment/refund. Imported line total conserve amount; allocation/provenance unknown/estimated dinyatakan.
- Google PKCE bridge baru: trusted Supabase user verification, confirmed email/Google identity, stable issuer+subject binding, customer-only creation, no email auto-link/takeover, revoked membership ditolak. Existing local email mendapat ACCOUNT_LINK_REQUIRED, gunakan password dahulu. Frontend tab-bound pending state 10 min dan explicit PKCE exchange. GET `/auth/providers` ialah configured capability, bukan bukti interactive Google OAuth telah lulus.
- Root sudah wire `/auth/google`, `/auth/providers`, modern key alias, request worker pump, hosted response bound dan redacted API logger. Full final integration masih perlu diuji.

## 7. AI AGENT ASAL: fakta penting, jangan salah tafsir lagi

User betul. AI agent asal sudah wujud dan source masih dikekalkan dalam kedua-dua repo.

- `src/services/gemini.ts:110`: master AI Operations Agent ABANGCOLEK-OS v4.2.
- `src/services/gemini.ts:47`: `MODEL_NAME = "gemini-3.8-flash"`.
- `src/App.tsx`: Virtual Assistant chat, streaming response, agent process steps; handler sekitar 982 memanggil `sendMessageToAgentStream`, chat UI sekitar 1083.
- `src/components/WorkspaceSidebar.tsx`: menu asal Pembantu AI / chat.
- 38 declared tools: sales, shipping, sentiment, JEV, drafts, reports, Google Workspace, sub-agent, plugins, freight, order/refund dan lain-lain.
- Hash `gemini.ts` dan `geminiClient.ts` dibandingkan dengan `D:\ABANGCOLEK-OS` dan didapati sama pada semakan.

Kenapa tidak kelihatan: `src/main.tsx` mount `AppRouter`, bukan `App.tsx`. Founder legacy route memaparkan `IntegrationWorkspace`, yang tidak mempunyai chat. Founder navigation belum ada assistant section.

Mismatch yang mesti dibetulkan semasa reconnect:

- Client `gemini.ts` menggunakan `generateContentStream` + `tools`.
- Server `legacyAi.ts` hanya menerima `:generateContent`, input allowlist tidak menerima `tools`.
- Existing AI server adapter founder-only dan memerlukan `PLATFORM_ENABLE_LEGACY_AI=true` serta SERVER `GEMINI_API_KEY`.
- `geminiClient.ts` sudah guna same-origin proxy + CSRF. Jangan kembali expose model key pada VITE/browser.
- Legacy financial actions memanggil browser `store.ts` / localStorage; beberapa provider paths menggunakan fallback/mock. Remount seluruh App dan enable semua tools akan mengembalikan false-success dan data-authority issues.
- `start_ai_agent` memang memanggil model tambahan tetapi menyimpan rekod dalam `MOCK_DB.agents`; itu bukan durable multi-agent runtime.

Pulihkan agent sedia ada melalui canonical founder route, persona/chat/JEV concepts yang dikekalkan dan tools yang dipetakan kepada backend sebenar. Bermula dengan scoped read/context + drafts. Write kewangan/provider mesti melalui canonical approval/idempotency/evidence. Jangan beritahu pengguna agent tidak pernah ada atau terus cadangkan framework baru. Jangan enable AI paid calls tanpa actual server configuration/budget yang sesuai. Tiada `GEMINI_API_KEY` ditemui daripada scan nama variable dalam fail env top-level kedua-dua checkout; jangan menganggap provider key tersedia.

## 8. Task yang belum selesai — turutan pelaksanaan

### A. Stabilkan kerja yang telah dibuat

1. Baca current git diff dan plan release-completion. Jangan menunggu subagent sesi lama; tidak semua handle agent masih wujud.
2. Selesaikan TypeScript/regressions selepas semua perubahan disatukan. Jangan menganggap ujian lama meliputi source terbaru.
3. Semak ProductOnboarding UI dengan API QA terbaru. Browser regression baru telah ditulis tetapi keputusan final belum direkodkan semasa handoff.
4. Semak Google login callback, capability, negative exchange dan identity isolation; interactive real Google login/redirect allowlist belum dibuktikan.
5. Update `.env.example`, `docs/production-release.md` dan audit status yang kini stale: secret/SQL tidak lagi blocker yang belum diberikan; worker/Google/onboarding sudah mempunyai implementation baru tetapi live release belum disahkan. Jangan masukkan actual key.

### B. Founder proposal execution MASIH BELUM siap

Snapshot handoff mengesahkan `LegacyPilotsService.executeFounderProposal` masih hanya flip status + audit. Kerja yang dirancang belum terimplementasi; jangan lapor siap.

Contract yang dicadangkan:

```typescript
type FounderProposalExecutor = (proposal: FounderAssistantProposal) => {
  resultRef: string;
  resultKind: 'case_review' | 'stock_review' | 'campaign_draft';
};
```

Method menerima executor, melakukan callback writes + receipt/status/audit dalam transaksi atomik. Tiada executor -> unavailable, bukan fake completed. Repeat verified receipt tidak menghasilkan duplicate artifact. Legacy executed tanpa result proof mesti explicit unverified.

Parent app route perlu supply executor canonical: scoped case/stock snapshot, atau `Marketing.save` untuk real draft (bukan publish). Store/result lookup founder-only. Update shared proposal fields + regression tests. Proposer context kini menggunakan kind inventory yang mungkin bukan canonical lots; semak dan betulkan. Ini berasingan daripada LLM chat restoration.

### C. Pulihkan agent asal dengan boundaries sebenar

Trace old implementation sebelum mengubah. Tulis plan kecil. Reuse persona/UX/tools yang berguna, tambah route/menu dan canonical server adapter, support response/tool protocol yang sepadan. Jangan expose mock refund/order or unsolicited external sends. Test unauthorized isolation, real data grounding, missing provider configuration dan tool receipts. Jika model key masih tiada, complete code dan tunjuk state unconfigured secara jujur; minta pengguna configure key terus di provider/Vercel, bukan paste chat.

### D. Finish release dan deployment

1. Independent code/security review selepas final source; review findings mesti diselesaikan, bukan sekadar dicatat approved.
2. Run strict lint/types, full platform tests/coverage, production build dan browser suite pada isolated QA.
3. Uji cloud persistence melalui real configured repo, worker auth/CAS, session/API routes, evidence private scope. Probe awal hanya RPC/Storage, BUKAN deployed Vercel app proof. Jangan create dummy business users/products/orders dalam production atau import local DB secara senyap.
4. Verify build/function packaging/routing Bun di Vercel; current cloud snapshot 16 MiB compatibility limitations mesti didokumenkan.
5. Stage explicit reviewed files, secret scan staged additions, Conventional Commits, fresh remote reconcile, non-force `git push origin main`.
6. Observe autodeploy exact SHA, inspect logs and served JS/favicon, actual rendered app, JSON API, private evidence and durable reload. Ready/root 200 sahaja tidak mencukupi.
7. Laporkan exact commit/deployment, passed checks dan external blockers. Jangan dakwa fully functional untuk provider yang tidak mempunyai credential/transport atau human OAuth yang belum diuji.

## 9. Tests, runtime dan arahan praktikal

Evidence SEBELUM latest uncommitted batch: 303 tests passed / 1,746 assertions / 70 files, 87.19% line coverage dan 83.46% function coverage. Full browser 52/52, lint/build/audit lulus. Ini historical baseline sahaja.

Latest focused runs: Google bridge 8 pass; API Google/worker/entry 16 pass; response+snapshot+public DB 19 pass; onboarding integrity fix 14 pass; outbound 6 regressions pass; source security review Google/API/response 10 pass dan tiada P0/P1. Tiada full final gate selepas SEMUA latest changes. Jangan recycle baseline sebagai final proof.

```powershell
git status --short
git diff --stat
git log -5 --oneline
git ls-remote origin refs/heads/main
bun run lint
bun run test:platform
bun audit --json
bun run build
$env:PLATFORM_TEST_URL='http://127.0.0.1:3001'
bun run test:e2e
vercel env ls production --scope niaga-hub-pro --project abang-colek-v1
```

Server pada snapshot terakhir (verify semula sebelum reuse/stop):

- Business UI 3000 / API 3010; PID UI 32752, API 8872.
- Isolated QA UI 3001 / API 3011; PID UI 19396, API 25020.
- Business launcher session 18062 dan QA API session 75367 mungkin tidak boleh digunakan dalam thread baru.
- QA fixture berada di ignored `var/run/e2e-fixture.json`; gunakan credential melalui harness tanpa print.
- QA API perlu restart apabila backend source berubah. Verify process command line/port identity dahulu; jangan kill listener lain.
- `scripts/qa-platform.ts` menyediakan isolated DB; jangan replace business DB untuk mendapatkan test pass.
- Node modules mungkin resolve path checkout OS kerana existing dependency layout. Process UI 3001 telah disahkan command line menunjuk D:\ABANGCOLEK-PLATFORM; jangan anggap stack path sahaja bermakna app salah.

Laporan/plan berguna:

```text
docs/superpowers/plans/2026-10-18-production-release.md
docs/superpowers/plans/2026-10-18-release-completion.md
docs/production-release.md
reports/reviews/repository-2026-10-18/REVIEW.md
reports/reviews/repository-2026-10-18/inventory.json
reports/reviews/2026-10-18/backend-boundaries.md
```

Laporan ini mengandungi snapshot terdahulu dan perlu dibaca bersama state terbaru di atas. Jangan ulang diagnosis startup lama sebagai keadaan semasa: anonymous production check terakhir menunjukkan landing render tanpa captured JS error, tetapi catalogue/session API 404 dan favicon masih lama pada deployment SHA a3f38bb. Tiada push berlaku selepas itu dalam sesi ini.

## 10. Cara bekerja dan menjaga context

- Mulakan dengan ringkasan ringkas apa yang sudah difahami dan task pertama, kemudian execute.
- Baca fail relevan sahaja sebelum setiap patch; gunakan rg, batch independent reads, dan subagent dengan ownership jelas jika berfaedah. Agent instructions pengguna mengizinkan delegation. Jangan overwrite perubahan rakan.
- TDD untuk business/security changes; reviewer selepas perubahan kod. Test meaningful behavior, bukan mirror implementation.
- Jangan reinstall/clone/recreate projek, wipe cache/data, tambah provider baru atau redesign seluruh UI untuk menyelesaikan integration seam.
- Jangan read/print browser auth files, cookies, tokens atau secrets untuk mengatasi access restrictions. Browser approval/authentication mesti dihormati.
- Jangan mengulang prompt ini dalam jawapan. Gunakan sebagai working context. Simpan checkpoint ringkas dalam handoff apabila commit/test/deploy state berubah supaya sesi baru tidak perlu mengulang semua audit.
- User mahu sambung development dan settle release; recommendation AI sahaja tidak mencukupi. Restore existing agent, selesaikan wiring dan buktikan behavior sebenar.
