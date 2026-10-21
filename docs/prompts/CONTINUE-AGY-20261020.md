# Sambung ABANGCOLEK v2.4 — AGY CLI sebagai integrator dan pelaksana

**Supersession21Oktober:** dokumen ini rekod sesi sejarah. Entry semasa ialah [Kilo master](KILO-COMPLETE-PROJECT-20261021.md), [commerce/growth handover](COMMERCE-GROWTH-HANDOVER-20261021.md) dan [spec canonical](../design/commerce-growth.md), bersama arahan pengguna semasa. Jangan memulakan semula agent/candidate lama atau menyalin ticks; receipt → ledger85 → verifier → renderer ialah aliran status semasa. Badan asal dipelihara untuk provenance.

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Tarikh:20 Oktober 2026, Asia/Kuala_Lumpur. Arahan pengguna terkini: gantikan Copilot CLI dengan AGY CLI kerana Copilot mencapai limit; fokus AGY sahaja. Ini arahan pelaksanaan, bukan laporan siap. AGY ialah integrator dan pelaksana semua baki fasa, termasuk frontend, Python ADK, tools, review dan release. Copilot CLI dipark kerana limit; Hermes dipark atas arahan pengguna; Kilo tidak diperlukan untuk continuation ini. Jangan melancarkan atau menunggu CLI tersebut, spawn sub-agent Codex, tukar akaun untuk memintas limit, atau cuba repair Hermes. Jangan minta pengguna memilih stack, architecture, model aplikasi, urutan fasa atau bilangan worker.

Pertukaran ini hanya menukar alat pembangunan. Semua10ciri CopilotKit dan seluruh acceptance blueprint kekal wajib; limit GitHub Copilot CLI tidak membuang CopilotKit daripada aplikasi.

## 1. Lokasi dan sumber authority

- Cwd pelaksanaan: D:/ABANGCOLEK-WORKTREES/multi-cli-integration-20261020.
- Branch calon: work/multi-cli-integration-20261020; baseline snapshot60311aad5a1695eb2804e830488a3133e182397f. Reverify actual HEAD/status sebelum perubahan; jangan reset kepada SHA ini.
- Repo asal D:/ABANGCOLEK-PLATFORM mengandungi perubahan pengguna/agent lain, termasuk CopilotWorkspace.tsx dan dealer-approval.test.ts. Preserve semuanya; bukan tempat bulk-edit aplikasi bagi run ini.
- Canonical docs/checklist ialah versi terkini dalam repo asal, bukan snapshot lama dalam branch worker. Baca PROJECT-CHECKLIST.md, docs/prompts/IMPLEMENT-ABANGCOLEK.md, AGENT-EXECUTION-CONTRACT.md, ACCEPTANCE-REGISTER.md, blueprint v2.4 dan ADR-0003 yang dirujuk. Bandingkan hash dan selaraskan salinan dokumen secara terpilih; jangan menindih perubahan baru dengan snapshot lama.
- Gunakan phase prompt yang berkaitan sahaja; jangan membaca seluruh chat/semua skills pada setiap task. Fasa wajib:00 ->03A ->01 ->02 ->03B ->04 ->05 ->06.
- Branch release main snapshot e7368565d77cebe94b35fe5b7e1f87a0714b344e mengandungi pembaikan landing/Bun/SPA/media; belum digabungkan ke calon ini. Preserve dan reconcile sebelum release. Jangan publish seluruh branch60311aa yang masih mengandungi fake facts/receipt.

## 2. Ambil alih keadaan semasa; jangan ulang kerja

Baca D:/ABANGCOLEK-WORKTREES/multi-cli-control-20261020/delegation-status.json dan reports/implementation/ dalam calon integrasi. Baca actual exit/report bagi setiap job, bukan status proses sahaja.

| Executor | Lane | Hasil run terakhir | Fail owned |
|---|---|---|---|
| AGY CLI | D:/ABANGCOLEK-WORKTREES/multi-cli-agy-20261020 |03A-FIN menghasilkan diff3fail; exit0 tetapi print timeout600s, belum accepted; conversation31cc6c98-629c-4932-b843-c10ae9944b74 | server/platform/marginGuardian.ts, shared/growth-contracts.ts, tests/platform/financial-integrity-v24.test.ts |
| Kilo CLI | D:/ABANGCOLEK-WORKTREES/multi-cli-kilo-20261020 | Run terdahulu03A-HITL hanya proposal; kini dipark untuk fokus AGY | server/platform/adkAgent.ts, shared/copilot-contracts.ts satu field executionBlockedReason, tests/platform/hitl-execution-v24.test.ts |
| Copilot CLI | D:/ABANGCOLEK-WORKTREES/multi-cli-copilot-20261020 | PARKED: user melaporkan limit; laporan baseline lama sahaja | Jangan launch/resume; evidence lama boleh dibaca sebagai data |
| Hermes | Lane lama multi-cli-hermes-20261020 | PARKED oleh pengguna | Tiada task dianggap siap; Python ADK kini tanggungjawab AGY CLI |

Snapshot terakhir12:00MYT: kedua-dua invocation telah tamat. AGY exit0 dengan stderr printtimeout600s; ada diff3fail tetapi tiada finalreceipt lengkap. Kilo exit0 dengan cadangan kod sahaja: model hanya mendapat glob/grep/read, edit/bash tidak tersedia. Tiada perubahan aplikasi atau red-green daripada Kilo. Recheck actualprocess/trace/source sebelum mengambilalih; exit0 bukan task acceptance. Jangan menyalin snippet proposal Kilo sebagai kod diuji; beberapa fixtures/type assumptions masih perlu dibuktikan. Jangan melancarkan worker kedua pada task/fail yang sama sebelum worker asal berhenti dan ownership diserahkan. Jangan membunuh proses pengguna. Jika job sendiri melepasi had masa, sahkan PID/parent/masa/command identity sebelum menghentikan hanya job itu; nativeAGY print timeout boleh memberi exit0/statusSUCCESS dengan response kosong dan task belum siap.

Logs/receipts: agy-03a-fin.*, kilo-03a-hitl.*, baseline-*.exit.json dan baseline logs dalam control directory. No commit/push daripada batch ini telah disahkan pada snapshot. Jangan anggap dirty changes sebagai commit.

## 3. Apa yang sudah dibuktikan

- Lint dan build pada baseline calon60311aa: exit0.
- Full test:platform:416pass,3fail kerana timeout5000ms,2624assertions,419tests/88files. Ini masih failed baseline.
- Focused rerun dua fail tanpa ubahsource/timeout:8pass,0fail,65assertions. Ia tidak menggantikan fullsuitegreen.
- Browser discovery sahaja:53tests/16files. Tiada browser pass baharu dalam task baseline ini.
- Independent Copilot gate review membenarkan kerja local/synthetic03A bebas dengan policy/provider/runtime gates kekal tertutup; bukan fullplatform/runtimegreen.
- node_modules dalam lane ialah junction kepada dependency sedia ada D:/ABANGCOLEK-OS/node_modules. Jangan install/ubah shared directory itu. Sebelum dependency install phase02, sediakan dependency workspace-private secara terkawal dan update lock calon sahaja; jangan memadam target junction.
- Python3.12 tersedia; CopilotKit runtime/AG-UI belum installed pada baseline. Registry metadata/pin availability bukan import/compatibility/protocol proof.
- Semua78core dan7EXT masih belum ditutup sebagai acceptance penuh. NEXT tasks kecil yang ditick tidak menutup parent feature.

## 4. Urutan kerja yang mesti dilaksanakan

1. Revalidate source/worktree/index/dirty hashes dan current jobs. Lengkapkan follow-up00-02/04 menggunakan evidence; jangan reset/clean interrupted copilot-completion lane. Calon baharu digunakan untuk implementation; oldlane dipelihara dan source yang perlu mesti dipindah per-file selepas review.
2. Ambil report/diff/red-green evidence AGY-FIN. HITL belum diimplementasi dalam run Kilo yang direkod: AGY mesti reverify source dan mengimplementasinya dalam batch owned selepas revalidasi interface. Jadualkan review TypeScript/security dalam sesi AGY CLI berasingan yang menerima diff/brief terhad dan beroperasi read-only. Reviewer tidak mengulang semua tests pada source yang sama; integrator memeriksa actual outputs. Jika bukti red/green tiada, jangan label TDD pass. Fix kembali kepada owner; integrasikan hanya fail owned yang diterima dan jalankan coveringtests pada calon integrasi.
3. Teruskan baki03A mengikut prompt03 dan domain review: canonical costs/provenance, exact sen/BPS, largestremainder/refund, verifiedpayment/dedupe/latepayment, stock/loyalty/CAS, approval expiry/revocation/stale/unknownoutcome, scope/consent dan recovery gates. Business policy unknown mesti disabled, bukan fixture dijadikanproductionconfig.
4. Laksanakan01 structure/moves/import checker/discovery mengikut map tetap, selepas integriti. Preserve allsource/data; maintain links/facades dan hashes. Jangan cipta duplicate service lama+baru.
5. Laksanakan02 official CopilotKit TypeScript /v2 Fetch runtime + HttpAgent + genuine Google ADK Python3.12/AG-UI, identity grants/thread ownership/budgets dan satu frontendcontroller. AGY mengambil semua Python ADK/session/model-adapter tasks Hermes serta frontend/provider/chat/shared-state yang sebelum ini dibahagikan kepada CLI lain. Kerjakan batch berurutan dengan interface yang diuji; shared contract/lock/composition hanya satu owner.
6. Laksanakan03B semua32logicalADV dan10MOD menggunakan canonical scoped data/receipts; jangan tutup modul dengan function registry atau static cards sahaja.
7. Laksanakan04 semua7GUI dan CPKUI/state/HITL/headless/frontendtools/subagents: MCP tool+UIresource+host, A2UI Fixed Schema, actual SDK tool/state lifecycle, shared Pet/workspace thread/run, allowed UI actions dan genuine ADK delegation.
8. Laksanakan05 real Intelligence Streams/Learning serta EXT gates hanya jika existing eligible free account/project dan privacy/data authorization dibuktikan. Local history/SOP bukan substitute Intelligence. Missing external gate tidak membenarkan fakepass; teruskan kerja bebas.
9. Laksanakan06 fullfinal tests, browser journeys, protocol/security/restore/negativecases, preview/production evidence dan release rollback. Jangan claim100%/fullyfunctional jika ada mandatory acceptance blocked/notrun/failed.
10. Hasil usable: actual local startup command/URL/routes, verified login/role journeys menggunakan auth sebenar, approved catalogue/business configuration dan exact deployed artifact. Jangan mereka email/password/produk/harga/stok, bootstrap founderproduction atau data approval. Akaun/data prerequisite sebenar direkod dengan tindakan tepat.

## 5. Cara kerja yang jimat dan tetap

Satu sesi AGY menulis aplikasi pada satu masa. Integrator AGY memiliki shared contracts, composition, dependencies, moves dan checklist. Setiap batch mempunyai fail owned, interface snapshot, red test, green commands, report path dan stop conditions. Untuk review, guna sesi AGY berasingan dengan diff/brief terhad dan mode plan; reviewer read-only selepas diff stabil. Jika independent review tidak berjaya, rekod sebagai belum direview dan jangan tutup acceptance/release dengan self-review sahaja.

Jangan fork seluruh chat, ulang audit repo, load semua skills atau jalankan full suite pada setiap batch. Run targeted tests per batch dan full suite pada integration gates. Jangan menindih/revert perubahan orang lain. Gunakan hasil AGY-FIN dan laporan Kilo/Copilot terdahulu sebagai input untuk disahkan; laporan bukan bukti implementasi. Jangan launch/resume Copilot CLI untuk review, Python atau release sehingga pengguna sendiri mengubah arahan parked itu. Jangan membaiki Kilo/Hermes untuk memulakan task ini.

AGY CLI1.4.2 telah diperiksa melalui actual help. Set cwd ke lane integrasi; mode accept-edits untuk pelaksanaan. Command ialah arahan CLI, bukan bukti task lulus. Untuk sesi panjang pengguna, gunakan interactive AGY. Untuk batch headless yang benar-benar diperlukan, satu baris pointer kepada task file lokal, output JSON/text dan had masa berpatutan; jangan anggap print timeout sebagai selesai. Run terdahulu tamat pada180s/600s dengan exit0/statusSUCCESS tetapi kerja belum ditutup. Semak stderr, task completion, diff, actual test exits dan final receipt.

Native executable: C:/Users/megat/AppData/Local/agy/bin/agy.exe. Verified options: --mode=accept-edits, --sandbox, --add-dir, --output-format, --print-timeout, --print dan --conversation. --print ialah optional argument; gunakan --print=<single-line pointer> supaya flag seterusnya tidak dimakan sebagai prompt. Jangan guna --dangerously-skip-permissions atau auto-approve menyeluruh untuk mengelak error. Recheck help jika versi berubah; mode/sandbox bukan bukti complete OS isolation.

Untuk integrator, mulakan sesi pada lane multi-cli-integration-20261020. Jangan sambung conversation lama31cc6c98-629c-4932-b843-c10ae9944b74 sebagai integrator kerana workspace asal conversation itu ialah lane margin. Conversation itu hanya historical source of evidence; resume pada lane asal hanya jika bounded margin follow-up diperlukan dan ownership sudah disahkan.

AGY terminal terdahulu memuat PowerShell profile yang menghasilkan HUD/noise dan melambatkan commands. Gunakan no-profile shell jika actual run_command membenarkan konfigurasi shell itu; jika tidak, commands Windows-native yang ringkas, log output terpilih dan elak Unix test/sed assumptions. Jangan ubah profile global pengguna. Simpan report ringkas; tiada secrets, cookies atau model chain-of-thought.

## 6. Skills, plugin dan MCP

Baca exact skill manifest executioncontract§6/7 mengikut task: CopilotKit/currentdocs, TDD, systematicdebugging, verification-before-completion, code-review; Supabase/Postgres untuk SQL/RLS/CAS; Playwright untuk runtime/browser. Tiada bulk installskills/plugins/MCP. Current Context7 resolve/query berjaya; gunakan untuk SDK source/docs. Plugin/connector hanya jika actualcallable/authenticated/correctproject; configuredname bukan connected. Existing gh/vercelCLI ialah fallback selepas identitycheck; jangan output key/token/envvalues.

Fixed stack/pins/budgets/ports/candidate order/A2UI/MCP architecture kekal mengikut ADR/contract. No Next.js/frameworkmigration, no LiteLLM substitution, no DynamicA2UI, no paid applicationmodel/fallback/overflow, no arbitraryHTML/JS/genericSQL/shell/HTTP producttool. JEV kekal LOCAL_RULES; jangan mereka native/vision/confidence atau melabel upload evidence sebagai visionverified. Model AGY untuk coding berasingan daripada aplikasi; jangan ubah aplikasi kepada model yang kebetulan digunakan worker.

## 7. Checklist dan syarat siap

Selepas setiaptask: actualtests/diff/review -> receipt ID/status/environment/sourcehash/command/exit/artifact/reviewer/time -> integrator sync PROJECT-CHECKLIST.md, ACCEPTANCE-REGISTER.md dan IMPLEMENTATION-CHECKPOINT.md. Checkbox[x] hanya keseluruhan acceptance item dipenuhi; partial/blocked/failed/notrun tetap[ ]. Record DONE/NEXT di luar denominator78+7. Evidence invalidated oleh perubahanterkait -> untick affectedIDs dan preservehistoricreceipt. Unit/source/localpass tidak menutup gate yang mewajibkan runtime/provider/preview/production.

Jangan stop pada plan/scaffolding/reportworker. Teruskan ready task mengikut fixedprerequisites. Untuk credential/account/privacy/hosting/approval sebenar yang belum tersedia, siapkan segala kerja bebas dan hasil yang boleh direview dahulu, kemudian nyatakan blocker/tindakan tepat; jangan mereka access/cost/approval/status. No forcepush, bulkstage, rootcleanup, externalmessages atau liveDBoverwrite. Owned atomiccommits dan mainpush/deploy hanya selepas actualchecks/review dan authorization yang masih sah; historical request bukan alasan deploy insecurecode.

Laporan akhir: IDs selesai besertaenvironment/bukti, actual tests+failures/notrun, fullsource/worktree/artifactidentity, exactusage/startup/login instructions dan semua remainingexternalgates. Jangan gunakan100% sebagai anggaran atau janji tanpa semua acceptance yang relevan benar-benar lulus.
