# Prompt 06 — Full Verification, Recovery dan Release Evidence

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Checklist wajib selepas setiap task:** baca [PROJECT-CHECKLIST.md](../../PROJECT-CHECKLIST.md). Integrator mengekalkan `[ ]` semasa in_progress/separa/blocked/failed/not_run; tukar kepada `[x]` hanya selepas acceptance item lulus dengan actual tests, environment, source manifest dan reviewer. Tambah evidence link yang wujud, sync acceptance register/checkpoint/counters dan rekod exact next task sebelum handoff. Worker menghantar bukti, bukan mengedit tick canonical serentak. Ikut execution contract§10; jangan menutup parent feature hanya kerana child task selesai.


Baca [master prompt](IMPLEMENT-ABANGCOLEK.md), [execution contract](AGENT-EXECUTION-CONTRACT.md), [acceptance register](ACCEPTANCE-REGISTER.md), [recovery runbook](../runbooks/platform-recovery.md), [release runbook semasa](../production-release.md), [domain review](../../reports/blueprint-review-20261020-domain.md) dan semua checkpoint. Resolve runbook paths melalui manifest01 jika sudah dipindah. Ini release gate, bukan izin menyembunyikan incomplete features atau publish seluruh dirty integration branch.

## Input, ownership dan outputs

Integrator memiliki final source/lock/owned diff, environment/project identity, review dan release decision. Domain/security/Python/TS reviewers menyemak bidang masing-masing; E2E owner menggunakan satu QA harness/fixture. Recovery operator hanya menyentuh disposable recovery target yang identitinya disahkan. Tiada restore/cutover real data atau production deployment tanpa authorization sah.

Output **PLANNED** `reports/implementation/06-verification-release.md`, test/coverage/protocol/browser receipts, recovery manifest/drill timings, per-ID evidence JSON dan final checkpoint. Local/preview/production status berasingan. Source docs ini sendiri tidak membuat aplikasi verified.

## 06.1 — Freeze evidence scope dan acceptance audit

1. Re-read HEAD/branch/worktree/index/diff/unmerged state dan package/locks. Reconcile final hashes dengan batch manifests; source berubah selepas test membatalkan affected evidence. Jangan release unreviewed unrelated dirty changes.
2. Jangan assume root integrasi sama release `main` atau interrupted `copilot-completion` sudah reconciled. Verify source served oleh listener/bundle/runtime identity; historical60311aa/e736856 bukan current truth.
3. Audit tepat CPK10, GUI7, MOD10, ADV32 dan master19 =78 core requirements; adjacent7EXT registry berasingan. Actual registration names/risks/specializations termasuk ADV-26 boleh >32. Tiada requirement hilang kerana filter blocked/disabled.
4. Setiap row mempunyai exact source/hash, policy/lock refs, test name/path/command/exit, environment/timestamp, artifact/receipt refs, limitations dan reviewer. Nama fail/test/report sahaja bukan proof. Save canonical receipts `reports/implementation/evidence/<ID>.json`.
5. Scan source/routes/UI bagi fake margin/confidence/provider/native-vision/payment/approval success dan static business metrics. Existing legacy fixture tests yang mengharapkan invented facts mesti tidak menjadi release requirement.

19 master IDs mesti dinyatakan penuh: FIN-01, PAY-01, PAY-02, PAY-03, STK-01, OFF-01, REF-01, REF-02, LOY-01, SEC-01, SEC-02, DR-01, AI-01, AI-02, AI-03, PD-01, OPS-01, ARC-01, REL-01. Review evidence dependency closure, bukan CPK rows sahaja.

## 06.2 — Fresh commands dan discovery parity

Commands **EXISTING root scripts**, dengan new paths **PLANNED** hanya selepas corresponding phase implementation. Inspect actual package scripts/manifest sebelum run; current test:platform tidak automatik memasukkan frontend/copilot/architecture.

```powershell
bun run lint
bun run build
bun run test:platform
bun test ./tests/architecture/dependency-boundaries.test.ts
bun test ./tests/copilot
bun test ./tests/frontend
uv sync --locked --project agents/google-adk
uv run --project agents/google-adk pytest agents/google-adk/tests
bun run test:e2e --list
bun run test:e2e
```

Expected exit0 dan discovered case/path parity dengan final manifest; mapped old paths01 digunakan jika scripts/tests telah berpindah. Jangan melaporkan directory missing sebagai pass atau silently skipping planned suites. Missing tooling/browser/credential -> `not_run`/`blocked_external`, exact reason. Gunakan locked Python fallback02 jika uv tiada.

Measure actual coverage dengan existing verified test tooling; contoh Bun suite instrumented selepas modules diketahui: `bun test --coverage ./tests/copilot` dan mapped domain test paths. Sasaran business/security>=80% memerlukan denominator module/file/branch/line yang dilaporkan; tidak boleh claim80% seluruh repo daripada subset/synthetic coverage. Python coverage jika configured tool tersedia gunakan exact locked tool; jangan install latest untuk kosmetik. No tests disabled/deleted untuk meluluskan gate.

CLI verify pin4.29.0 baca skill/help dahulu. `--round-trip` hanya selepas exact free/account/data gates; no credentials -> blocked, bukan forced Intelligence login. Actual protocol/tool/resource/browser proof02/04 kekal diperlukan walaupun CLI exit0.

## 06.3 — Failure injection dan integrity closure

Tulis/run **PLANNED** `tests/copilot/release-failures.test.ts`, `tests/platform/recovery-readiness-v24.test.ts` dan affected tests03A. Gunakan synthetic storage/providers/disposable runtime; jangan corrupt source/production data.

| Injection | Expected outcome dan bukti |
|---|---|
| 429/timeout/provider price/privacy verification expiry | Bounded same-budget retry/cooldown, no paid/new model route, accurate unavailable reason |
| Budget/deadline/cancel ketika parent/child aktif | Total3model/6tool maxima enforced atomic, token limits/depth/concurrency, no hidden new run |
| Browser disconnect sesudah command dispatched | Committed receipt preserved; unknown effect reconciliation, no false cancellation/double retry |
| CAS conflict/store closed/restart | No success before durable commit; fresh tool request, no stream use-after-close |
| Revoked session/grant/consent ketika queued | Denied next query/command/send/download, no cache/restore leakage |
| Stale price/stock/policy/approval/replayed callback | Reprice/reapproval or conflict, same operation receipt, no duplicate mutation |
| Valid late paid/two paid attempts/out-of-order failed | Immutable receipt, `payment_exception_review` where needed, no order resurrection/double fulfilment |
| Partial refund residual/expiry/last-stock race | Canonical03A invariants, append-only caps and full rollback |
| Malformed MCP/A2UI/origin/CSP/resource/hash | Denied safe state, no arbitrary fetch/code/credential forwarding |
| SDK replay/reconnect/second device | Authorized display-only replay; real Intelligence proof only if05 gates pass |

Capture commands/results plus actual HTTP/event/ledger refs. Mock test verifies behavior under mock, not live gateway/project. Failed injection menghalang affected activation/REL dependency; jangan disable guard untuk menyelesaikan failure.

## 06.4 — DR-01 local dan cloud recovery secara berasingan

**EXISTING** source/test inputs: mapped `server/platform/backup.ts`, `backupScheduler.ts`, `supabasePersistence.ts`, `evidenceFiles.ts`, `tests/platform/backup-restore.test.ts`, `worker-process-recovery.test.ts`, `remote-evidence.test.ts`, `production-persistence.test.ts`. Local timer default4h/6snapshots atau metadata verified bukan measured recovery. Latest cloud CAS blob bukan historical backup.

1. Read00 approved recovery register bagi setiap actual runtime. Confirm historical snapshot target, scheduler identity/job receipts, encryption/key recovery, retention, private evidence export, monitoring/alarm owner dan authorized clean target. Missing cloud target/account -> cloud DR-01 `blocked_external`; jangan memilih storage provider baru atau memakai local drill sebagai cloud pass.
2. Export chosen authoritative snapshot **and** referenced private evidence with manifest/checksums/version/source/runtime. Verify recoverable bytes, bukan createdAt metadata. RPO readiness mesti mengambil latest physically recoverable verified snapshot/evidence dan job duration, bukan start interval sahaja.
3. Fault tests metadata masih verified tetapi file deleted/corrupt; evidence object missing; incomplete upload; missed run/scheduler restart; incompatible schema; invalid checksum/key unavailable. Readiness mesti degraded/unavailable, no fake RPO satisfied.
4. Restore hanya ke resolved clean disposable path/target dalam allowed workspace/explicit authorized recovery scope, containment checked sebelum recursive operation. No overwrite production/active commerce DB. Jangan launch second writer terhadap same data root.
5. After restore, verify latest recoverable transaction/event, ledger totals/commission/loyalty/payment/stock links, row/reference integrity, evidence bytes/hash dan private authorization. Login/grant/service access boundaries masih enforced; restored token/session tidak memberi stale access.
6. Measure actual RPO (last committed recoverable business point versus incident point) dan RTO (incident/recovery start until critical authenticated journeys operational) dengan timestamps. Targets blueprint RPO<=4h/RTO<=30min perlu measured evidence per runtime; record failure/unknown honestly.
7. Rehearse scheduler restart/missed run/alarm/recovery ownership. Backup job manifest yang cantik tidak menggantikan successful independent restore.

Domain/security reviewer membaca manifests/results tanpa business rows. Jangan claim DR-01 verified jika snapshot sahaja pulih tetapi evidence/ledger/journey belum lulus.

## 06.5 — Security, privacy, dependencies dan deployment identity

Semak secret scan pada owned diff, emitted client bundle/sourcemaps/logging dan iframe resources, dependency audit/locks, telemetry actual network, cookie/CSRF/origin/CORS/rate/size limits dan private artifact download after revoke. Report secret **locations/kinds sahaja**, no value. Preserve source media privacy/tracking/provenance, migration compatibility dan data policy versions.

Input limits/rate limits ikut shared contract: message8192characters/history20verified refs/body64KiB/tool args16KiB; principal10run creations/min,60canonical agent-tool/min,120control-descriptor-state/min atau stricter existing domain limit. Test exact limit/limit+1, 413/429+Retry-After sebelum provider dispatch. Jangan truncate identity/amount untuk menerima payload.

Preview hanya pada **existing matched authorized project**, CLI/connector identity verified. No project creation, production DB cutover, paid resource atau deploy permission inferred daripada dokumen. Missing auth/permission -> release `blocked_external`, local checks teruskan. GitHub Actions account billing blocker `CI_ACCOUNT_BILLING_BLOCKED`: record exact annotation; local/Vercel pass tidak memberi CI green.

Production ADK/session hosting/provider/free eligibility mesti disahkan semula. Vercel frontend cannot point to localhost Python. Streams/Learning/EXT integrations yang belum gated kekal disabled dengan user-safe reason, jangan hide unresolved status atau disable seluruh integrations sekadar menutup warning.

## 06.6 — Preview dan production critical journeys

Buktikan **served** commit/artifact/bundle/runtime IDs, canonical API responses, SPA deep links/prerender/metadata/favicon dan log correlation. Source file changed, rootHTTP200 atau Git push success sahaja tidak lulus.

Browser matrix actual environment: public landing/catalogue/cart/offline reprice; founder/staff/dealer/customer auth/logout/isolation; orders/tracking-token/privacy; stock/QC/day-close/commission; Copilot same thread/headless/state; all7GUI approaches; proposal->approve->execute->durable receipt; private export/revoke; Python restart/session persistence; canonical CAS persistence after restart. Check mobile/light-dark/keyboard/BM-English and regression production landing.

Separate synthetic test fixture data daripada real business data. Do not create real order/send/payout/refund for proof tanpa valid test scope/authorization. Gateway/Intelligence live credential absent -> relevant live journey blocked, no fake receipt.

Independent code/security/domain review dan relevant E2E evidence wajib sebelum production. If prior session authorized owned commits/push/deploy and still applicable, execute only reviewed owned atomic changes and matching project after gates. Jika tiada authorization, siapkan concrete diff/test/deployment plan/rollback dahulu dan minta satu approval terakhir untuk action tepat; jangan tanya technical choice yang telah diputuskan.

After actual release, verify deployed commit/build/runtime logs and critical journeys again. Git auto-deploy queued bukan completed deploy. Monitor typed error rates, cost/quota/rate limits, duplicate mutations, worker/recovery readiness dan rollout boundary. Rollback flags/routes tanpa reactivating fake financial behavior; no automatic replay business commands atau destructive data reset.

## Final gate dan laporan

REL-01 hanya verified untuk actual tested environment/release subset dengan dependency closure, reviews dan receipts. Seluruh10CPK memerlukan genuine CPK-02/03 proof; Intelligence blocked tidak menghalang laporan subset siap yang tepat. Semua78core/7EXT rows kekal kelihatan dengan status shared contract.

Laporan akhir menyatakan changed behavior/files, source/locks/worktree, commands/exits/counts/coverage denominator, protocol/browser/API evidence, measured RPO/RTO local/cloud, costs observed/unknown, local/preview/production status, rollback dan exact remaining owner/prerequisite/next executable task. Jangan claim whole project complete atau verified production berdasarkan documentation/synthetic tests.
