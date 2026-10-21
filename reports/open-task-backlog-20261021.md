# Backlog Tersusun Semula — Task Belum Siap (ABANGCOLEK-PLATFORM)

<!-- COMMERCE-GROWTH-20261021:BEGIN -->
> **Amendment 21 Oktober 2026 — TARGET_DESIGN:** Queue Commerce & Growth semasa: P0 CG-01..06 store/workspace, attribution/fulfilment, checkout/reconciliation/tracking; P1 CG-07..08 approved referral satu peringkat dua hala + ledger/refund; P2 CG-09..10 reorder dan consented retention, disertai CG-11 Copilot serta CG-12 release. Semua mapped kepada85ID sedia ada. Kekalkan prerequisite global, audit source dahulu; jadual landed/active/next dan counts di bawah ialah snapshot berturutan, bukan semakan live task ini. Commit hanya apabila pengguna semasa mengarahkannya; top-up coding-agent lama bukan kelulusan wallet produk.
>
> Rujukan: [spesifikasi canonical](../docs/design/commerce-growth.md) · [handover lengkap](../docs/prompts/COMMERCE-GROWTH-HANDOVER-20261021.md). Generated acceptance kekal berasaskan ledger dan receipt, bukan nota ini.
<!-- COMMERCE-GROWTH-20261021:END -->


**Tarikh:** 21 Oktober 2026
**Asas:** sintesis chat log (`reports/chat-log-synthesis-20261021.md`), ledger `reports/implementation/acceptance-status.json` (85 baris, snapshot `60311aa`), `docs/CURRENT-STATUS.md`, dan baki kerja sebenar yang dilaporkan oleh 9 subagent yang mati pada had step.
**Status:** plan kerja, **bukan** acceptance. Setiap baris perlu ditanda `verified_local` hanya selepas receipt sebenar.

---

## 0. Prinsip susunan

1. **Fakta dulu, kerja kemudian.** Tiada gate luar — evidence hygiene dulu, kerana setiap keputusan selepas ini bergantung pada baseline yang boleh dipercayai.
2. **Dependency beats priority.** Cookie scope → thread store → surface catalog → HITL. Yang paling banyak ID belum ditutup (15+) bergantung pada 4 langkah pertama.
3. **Satu owner satu lane.** Backend / frontend / tests / docs dipisah; jangan ulang isu bercampur.
4. **Definition of Done wajib:** diff + `bun run lint` exit 0 + `bun run build` exit 0 + `bun test <suite>` ×2 (no-flake) + receipt bertarikh + hash source.
5. **Jangan overclaim.** Laporan "DONE" tanpa arahan verifikasi = belum siap.
6. **Gate luar = BLOCKED, bukan pending.** Jangan ulang attempt tanpa prerequisite.

## 0a. Status pelaksanaan (dikemas kini 21 Okt 2026, ~22:05)

**Wave 0 — selesai (resept: `reports/w0-evidence-20261021.md`)**

| Item | Status |
|---|---|
| BL-01 | `bun run lint` exit 0, `bun run build` exit 0 pada `6c5b16e`; suite penuh diukur selepas wave |
| BL-02 | **Moot** — 2 ralat `TS2345` tidak wujud pada HEAD semasa (`bun run lint` exit 0) |
| BL-07 | Selesai — 290 fail dirty berada di worktree candidate, bukan repo utama; `git add -A` dielakkan |
| BL-08 | Dicatat dalam resept W0 (asas claim C5/C6 dibetulkan) |
| BL-09 | **Semua 4 semakan lulus** (fence 0 ganjil, rahsia 0 hit, 489/188 reproduce, candidate lane 290 fail) |
| BL-10 | Selesai — `CPK-01`/`EXT-03`/`EXT-06` direkonsiliasi |
| BL-11 | Selesai — authority table dikemas kini ke HEAD `6c5b16e` |

**Wave 1 — implementasi (13 lane diberi, 4 masih aktif)**

| Item | Status | Bukti |
|---|---|---|
| BL-14 | **Landed** — `Path=/` + multi-`Set-Cookie` + `revokePresentedSessions`; `host-security.test.ts` hijau | `server/platform/sessionCookie.ts`, `auth.ts`, `app.ts` |
| BL-15 | **Landed** — `AguiThreadStore` di-mount, `GET /copilot/threads/:id/events` SSE replay, `X-Thread-Id` | `server/platform/aguiThreads.ts`, `app.ts` |
| BL-16…BL-20 | Belum (§4 W1) | — |
| BL-21 | **Landed** — 409 `VISION_INFERENCE_UNAVAILABLE` + `QUALIFIED_VISION_MODEL_REQUIRED`, tiada hash direka | `app.ts`, `api/copilotkit.ts`, `api/platform/copilot/v2.ts` |
| BL-22 | **Landed** — 404 produksi, 403 customer, snapshot sebenar `{generatedAt, threads, totals, persistence, locality}` | `server/platform/inspection/inspector.ts` |
| BL-23 | **Landed** — kontrak null + `projectJevAssessment` + rehidrasi + drift | `shared/jev-contracts.ts`, `server/platform/jev/dimensions.ts` |
| BL-24 | **Landed** — kad null-safe, typed margin failure, `pickAllowedProps` | `src/features/copilot/cards/**`, `A2UIFixedRenderer.tsx` |
| BL-25 | **Hijau** — `toBeNull()` + 3 kes (rehidrasi, luar taksonomi, drift) | `tests/jev/null-semantics.test.ts`, `taxonomy-drift.test.ts` |
| BL-26 | **Landed** — `issueClass` dihantar, `incidentType` dibuang dari props | `server/platform/domainTools.ts` |
| BL-27 | **Landed** — `confidenceScore` wajib dalam kontrak + renderer | `shared/copilot-contracts.ts`, `JevAssessmentCard.tsx` |
| BL-28 | **Landed** — complete-token match, longest wins, `ORDER_ID_AMBIGUOUS` fail-closed, refund negation-aware | `shared/order-reference-contracts.ts` |
| BL-29 | **Separuh** — typed margin failure landed; parser pendua `server/platform/adkAgent.ts` belum dipurnai | `server/platform/domainTools.ts` |
| BL-30 | **Landed** — bajet 3 panggilan/30s/token caps, `LOCAL_RULES_BUDGET_EXHAUSTED`, label `local_rules` jujur | `server/platform/freeModelRouter.ts` |
| BL-31 | **Hijau** — assertion dipecah 2 kes (tiada provider vs bajet beku) | `tests/platform/copilot-adk.test.ts` |
| BL-32 | Belum (lihat §4) | — |
| BL-40 | **Selesai** — `test:ext` + skrip agregat `test`; `test:platform` (gate CI) tidak disentuh | `package.json`, `scripts/test-all.ts` |
| BL-45 (partial) | `verify-acceptance.ts` belum dijalankan | — |
| BL-58 (partial) | **Separuh tempatan landed**: callback HMAC `X-Signature` + idempotency `eventId` + laluan pulangan baca-sahaja | `server/platform/paymentCallbacks.ts`, `paymentCallbackRoutes.ts` |

**Ledger 85 baris selepas bukti live (21 Okt):** `verified_local` **40** (dari 38), `implemented_unverified` 36, `blocked_external` 8, `not_run` 1 (REF-01) → **45 belum ditutup** (dari 47).
`CPK-01` dan `AI-01` dinaik taraf kepada `verified_local` / `live_verified` atas bukti probe live sebenar (`reports/implementation/live-provider-evidence-20261021.json`).

### Kemas kini selepas Wave 2 (21 Okt, ~00:20)

| Item | Status | Bukti |
|---|---|---|
| REF-01 risk engine | **verified_local** | `tests/platform/loyalty-redemption-risk.test.ts` — 7 ujian / 87 assertion (isyarat hilang ⇒ unknown, bukan 0; OTP tanpa provider ⇒ 503 `OTP_PROVIDER_UNAVAILABLE`; rayuan ⇒ state machine + `INVALID_APPEAL_TRANSITION`; gate persetujuan umur) |
| DR-01 RTO | **verified_local** | `tests/platform/backup-restore-rto.test.ts` — 3 ujian / 61 assertion (anti-fake: masa sebenar, marker disahkan terhadap fail SQLite dipulihkan, `not_met` ⇒ `RTO_TARGET_NOT_MET`) |
| CPK-02 thread store | **verified_local** (separuh hosted kekal gated) | `tests/platform/intelligence-agui-threads-mount.test.ts` — 6 ujian |
| MOD-01 cart draft | **verified_local** | `tests/platform/cart-revalidate-consent.test.ts` — draf unsent, tiada order/tempahan, `requiresReprice` |
| MOD-08 cost basis | **verified_local** | `tests/copilot/mod-08-cost-basis.test.ts` — 6 ujian (integer sen, basis points, 24.996% ≠ 25%, `COST_BASIS_SOURCE_CHANGED`) |
| MOD-09 citations | **verified_local** | `tests/copilot/mod-09-citations.test.ts` — 6 ujian (tiada luput ⇒ `EXPIRY_NOT_RECORDED`) |
| OFF-01 revalidation | **verified_local** | `tests/platform/cart-revalidate-consent.test.ts` — konflik medan ⇒ `REVALIDATION_CONFLICT`, command tak dijalankan |
| PD-01 consent | implemented_unverified | Gate `ASSET_CONSENT_NOT_GRANTED` + laluan `POST /campaigns/consent` sudah selesai dan diuji (rekod hilang ⇒ ditolak); **kes opted-out (`DISPATCH_OPTED_OUT`) belum ada ujian** |
| PAY-01/02 | blocked_external (gate tepat) | 12 ujian hijau untuk separuh tempatan (HMAC, idempotency, redirect baca-sahaja); baki = kredensial merchant gateway + `PLATFORM_PAYMENT_WEBHOOK_SECRET` |
| REL-01 | implemented_unverified | `VERCEL_TOKEN` dalam env **tidak sah** ⇒ tiada deployment receipt boleh diambil; 38 spec e2e masih gagal (punca sedang diklaster) |

**Ledger selepas kemas kini ini:** `verified_local` **47** (dari 40), `implemented_unverified` 30, `blocked_external` 8 → **38 belum ditutup** (dari 47).

---


| Kumpulan | Bilangan item | nature |
|---|---:|---|
| W0 — Evidence & hygiene | 13 | Tiada gate luar; boleh mula sekarang |
| W1 — Core runtime (4 langkah, ~20 ID dependent) | 9 | Tiada gate luar; kunci kepada 15+ ID |
| W2 — Domain completeness | 14 | Tiada gate luar, ada pergantungan W1 |
| W3 — Evidence closure & release | 6 | Perlu W0–W2 |
| W4 — Bina baharu + gate pengguna | 8 | Perlu akaun/krediti/zarf |
| **Jumlah item** | **50** | — |

Ledger (21 Okt 2026, selepas wave 1 + evidence): **38 rekod belum ditutup** (30 implemented_unverified, 8 blocked_external, 0 not_run, 0 partial) — 47 verified_local. Lihat `reports/implementation/acceptance-status.json` sebagai sumber kebenaran tunggal..

---

## 2. W0 — Evidence & hygiene (mula sekarang, tanpa gate)

| ID | Task | Sumber | Owner | DoD |
|---|---|---|---|---|
| BL-01 | Jalankan `bun run lint`, `bun run build`, `bun test` penuh **dua kali** pada working tree `6c5b16e`; rekod count sebenar (baseline semasa: 1122/1120/2 gagal) | audit test suite | tests | Receipt JSON + dua run identik |
| BL-02 | Baiki 2 `TS2345` dalam `tests/platform/copilot-runtime-contract-*.test.ts` (blok repo-wide lint) | board Writer I/K | tests | `bun run lint` exit 0 |
| BL-03 | Sahkan 16 ralat `TS2345` masih wujud (audit tak boleh run lint) | audit test suite | tests | Output sebenar dilampirkan |
| BL-04 | Jalankan `bun scripts/maintenance/verify-acceptance.ts` — gate sebenar projek | audit test suite | orchestrator | Count 41 baris `testName` tak match + senarai turunan |
| BL-05 | Baca & nilai `scripts/maintenance/fix-acceptance-test-names.ts` **sebelum** tulis semula apa-apa (mungkin sudah cover F-15) | audit test suite | orchestrator | Nota: guna skrip sedia ada, jangan tulis semula dua kali |
| BL-06 | Baca `scripts/maintenance/audit-ledger-closure.ts` | audit test suite | orchestrator | Pemahaman gate kedua |
| BL-07 | **Jangan `git add -A`.** 50 fail bukan-Markdown staged (`package.json`, `bun.lock`, `vercel.json`, `tsconfig.json`, 12 `server/**`, 4 `shared/**`, 13 `src/**`, 10 test) — pisahkan commit | audit documentation | orchestrator | Commit dipisah, setiap satu satu sebab |
| BL-08 | Betulkan asas claim C5/C6: "byte-identical vs git HEAD" → "vs pre-task snapshot ledger" (`.kilo/`, `.vscode/`, `.agents/teamwork/`, `session-ses_eb0a.md`); commit 4 fail `.kilo/agents/*.md` supaya claim boleh disahkan | audit documentation | docs | Claim boleh direka semula |
| BL-09 | Jalankan 4 semakan baki C4/C7/C8/C9: (a) kira ``` fence setiap `.md` berubah, (b) grep rahsia (`AKIA…`, `-----BEGIN … PRIVATE KEY`, `gh[pousr]_…`, `sk-…`, URL dengan `:pass@`), (c) reproduce 489/188 exclusion set, (d) `git -C …/codex-completion-20261020 status --short` | audit documentation | orchestrator | Output file:line + count sahaja |
| BL-10 | Reconcile ledger ↔ dokumen: `CPK-01` JSON=`partial` vs `CURRENT-STATUS.md`=`blocked_external`; tambah `EXT-03` & `EXT-06` ke jadual "Semua rekod belum selesai" | ledger vs md | docs | `CURRENT-STATUS.md` selaras dengan JSON |
| BL-11 | Refresh `docs/CURRENT-STATUS.md` ke HEAD `6c5b16e` + Working tree state (sekarang masih rujuk `60311aa`) | stale doc | docs | Header + authority table dikemas kini |
| BL-12 | Commit `tests/playwright.config.ts` (+3/−1) yang tertinggal | working tree | orchestrator | `git status` bersih |
| BL-13 | Lengkapkan anotasi "would pass with hardcoded constant" untuk ~100 fail platform yang belum dibaca (audit hanya baca ~25/130) | audit test suite | tests | Anotasi per test |

---

## 3. W1 — Core runtime (4 langkah membebaskan ~20 ID belum ditutup)

| ID | Task | Ledger ID Dependent | Owner | DoD |
|---|---|---|---|---|
| BL-14 | Betulkan skop cookie `platform_session`: `Path=/api/platform` → laluan `/api/copilotkit` & `/api/copilot-mcp` perlu sesi browser sebenar (TDD: hantar cookie, migrasi cookie lama, logout/revocation, authorization; preserve Supabase CAS boundary) | GUI-05, CPK-02, CPK-07 | backend | Ujian browser + unit hijau; bukti cookie dihantar |
| BL-15 | Mount AG-UI thread store + resume route dalam `server/platform/app.ts` | CPK-02 | backend | Route exists + resume berfungsi |
| BL-16 | Versioned declarative surface catalog (startup-loaded) + laluan middleware AG-UI → renderer, dengan had depth/cyclic tree | CPK-04, CPK-05, GUI-06, GUI-01 | backend | Catalog versioned; middleware ada had |
| BL-17 | Pisahkan entity revision vs policy revision; view GUI-04 & GUI-08Against live server-issued state store | GUI-04, GUI-08, CPK-08 | backend + frontend | Dua revision berasingan, store live |
| BL-18 | HITL universal: daftarkan executor untuk semua approved action types (sekarang refund.execute sahaja → `EXECUTOR_UNAVAILABLE` yang lain) | CPK-06 | backend | Tiada `EXECUTOR_UNAVAILABLE` untuk action type yang diluluskan |
| BL-19 | Preview result: tambah preview reference hash, revisions, expiry | ADV-07 | backend | Preview carries hash+expiry |
| BL-20 | Revocation path + expiry handover (bukan creation-time sahaja) | SEC-01 | backend | Revoke berfungsi, expiry ikut handover |
| BL-21 | Passthrough `attachmentIds` pada laluan copilot + vision inference | EXT-07 | backend + frontend | Attachment sampai ke model |
| BL-22 | Mount dev-only inspector route dalam platform app | EXT-01 | backend | Route mounted, dev-only |

**Nota keutamaan:** BL-14 adalah **enabler #1** — GUI-05/CPK-02/CPK-07 semuanya mati pada laluan yang sama. Buat dulu, baru 7 langkah lain.

---

## 4. W2 — Domain completeness (selepas W1 stabil)

### 4.1 Gelombang JEV (tiga lane, satu kontrak)

Wave 1a/1b/1c mati separuh jalan — **jangan ulang tiga-tiga sekali gus; satu gelombang, tiga owner, satu gerak.**

| ID | Task | Lane | Detail |
|---|---|---|---|
| BL-23 | JEV null-semantik: server kini pulangkan `null` (bukan `0`/`false`) untuk semua primitive/dimension tak dikira | backend | Wave 1a — sudah separuh siap |
| BL-24 | Frontend cards ikut semantik `null`; `MarginSummaryCard` paparkan `MARGIN_INPUTS_INVALID` + `invalidInputKeys` | frontend | Wave 1b — belum `bun run build` |
| BL-25 | Test contract: `tests/jev/execution-policy.test.ts:21` `toEqual({})` → `toBeNull()`, tambah 3 kes (null rehydrate, out-of-taxonomy, drift path `UNKNOWN` + `taxonomyDrift`) | tests | Wave 1c — Wave 1b dah sahkankaus mock.module` berfungsi |
| BL-26 | `server/platform/domainTools.ts:1489-1496` hantar `incidentType:'batch_audit'` yang tiada dalam renderer allowlist → kad JEV render "insufficient-data" | backend + frontend | Butuh keputusan server atau allowlist |
| BL-27 | `shared/copilot-contracts.ts:92-98` (`JevAssessmentCardProps`) tak deklarasikan `confidenceScore` walaupun server hantar field | shared | Tutup divergence wire type |

### 4.2 Fungsi yang belum siap

| ID | Task | Ledger ID | Owner |
|---|---|---|---|
| BL-28 | **Wrong-money order match** — exact order-id resolution (canonical-id-as-complete-token, longest id menang), tiada jumlah + reason code bila unresolved, affirmative (negation-aware) refund intent | CPK-07 / REF jalur | backend |
| BL-29 | Ujian negatif untuk `unknown_outcome` + exact-order + typed margin failure (`MARGIN_INPUTS_NOT_PROVIDED` / `MARGIN_INPUTS_INVALID` + `invalidKeys`) — tiada test ditulis sebelum ini | AI-03 | tests |
| BL-30 | `freeModelRouter.complete` terima `CopilotRunBudgetPolicy` (default `COPILOT_RUN_BUDGET`): max 3 calls, deadline 30s, cap token per-call & kumulatif, label jujur `local_rules` bila budget blok failover | — | backend (Wave 1a separuh) |
| BL-31 | Semak semula assertion `tests/platform/copilot-adk.test.ts:43` — ia mengekod kontrak failover tanpa had; atas mesin ber-key ia akan gagal dengan `LOCAL_RULES_BUDGET_EXHAUSTED` | — | tests |
| BL-32 | `unknown_outcome` state benar-benar wujud di server (UI sedia ada render, server tiada) + tool-lifecycle event source | AI-03, GUI-03 | backend |
| BL-33 | Cart-draft frontend tool + UI path memandu cart diagnosis | MOD-01 | frontend |
| BL-34 | Public-token projection diasingkan daripada private order dalam laluan copilot | MOD-02 | backend |
| BL-35 | Canonical cost ledger → `get_operational_kpi` hantar nilai, bukan `null` + `COST_BASIS_UNAVAILABLE` | MOD-08 | backend |
| BL-36 | Citation / version / expiry output contract pada hasil search & task | MOD-09 | backend |
| BL-37 | Conflict classes lengkap (stale price, ineligible loyalty, fractional/negative quantity, duplicate line, invalid fulfilment) | ADV-05 | backend |
| BL-38 | Remediation (bukan sekadar detect/explain/score) untuk ADV-15, ADV-17, ADV-21 | ADV-15/17/21 | backend |
| BL-39 | Export quota + re-authorization at download time | ADV-20 | backend |
| BL-40 | Outbound-send consent guard pada draft | ADV-23 | backend |
| BL-41 | Steps grant-aware (bukan capability-id sahaja) | ADV-24 | backend |
| BL-42 | Reconcile sebagai 3 operasi berasingan (`inspect_action_receipt`, `refresh_external_action_status`, `apply_verified_action_outcome`) | ADV-26 | backend |
| BL-43 | Revalidate-on-reconnect + server-side revision compare sebelum retry + per-field conflict resolution | OFF-01 | backend |
| BL-44 | Opt-out gate at dispatch (publish disekat outright → tiada dispatch path) + asset consent field structured | PD-01 | backend |

---

## 5. W3 — Evidence closure & release (perlu W0–W2)

| ID | Task | DoD |
|---|---|---|
| BL-45 | Jalankan `verify-acceptance.ts` + `audit-ledger-closure.ts` selepas semua fix; regenerate `acceptance-status.json` pada HEAD baru | Snapshot baru dengan sourceCommit = HEAD, generatedAt baharu |
| BL-46 | Sync `PROJECT-CHECKLIST.md` + `prompts/ACCEPTANCE-REGISTER.md` dengan ledger baru — tick hanya ikut ledger | Tiada tick manual; semua tick terhasil renderer |
| BL-47 | Jalankan Playwright browser suite **against live server** + deployment receipt (artifact id, deployment URL) | REL-01 — receipt sebenar, bukan "belum pernah dijalankan" |
| BL-48 | Jalankan `bun test` penuh 2× pada working tree final + `bun run lint` + `bun run build` exit 0 | Receipt final untuk `main` release |
| BL-49 | Async: kemas kini `docs/CURRENT-STATUS.md` (rujukan HEAD, angka suite sebenar, blocking gates) | Dokumen = indeks fakta terkini |
| BL-50 | Satu report induk: gabungkan `reports/rea/2026-10-20-rea-session-report.md` + `docs/JEV-TYPESAFE-SESSION-REPORT-2026-10-21.md` + sintesis chat log ke satu indeks dengan kolum *claimed vs verified* | `reports/MASTER-STATUS-20261021.md` |

---

## 6. W4 — Bina baharu & gate milik pengguna

### 6.1 Gate luar (BLOCKED — owner: pengguna)

| ID | Gate | ID ledger |_perlucan_ |
|---|---|---|---|
| BL-51 | `OPENCODE_ZEN_API_KEY` baharu (401 `api_key_expired`) | — | pengguna |
| BL-52 | GitHub Actions billing unlock (2 job tak bermula) | — | pengguna (akaun) |
| BL-53 | CopilotKit Intelligence account + terms | CPK-03, EXT-02 | pengguna |
| BL-54 | Hosted User Memories (terms) | EXT-02 | pengguna |
| BL-55 | Slack/Teams: provider account + app + signing secret + permission | EXT-04 | pengguna |
| BL-56 | Live MCP browser client + own-app registration | EXT-05 | pengguna/environment |
| BL-57 | Payment gateway credentials (callback + HMAC + success redirect) | PAY-01, PAY-02 | pengguna |
| BL-58 | Gemini free-tier quota (20 req/hari, ~19 jam recovery) | CPK-01, AI-01 | jadual probe |

### 6.2 Bina baharu (perlu gate atas)

| ID | Task | ID ledger | Nota |
|---|---|---|---|
| BL-59 | Risk engine: OTP, device/velocity/age signals, reason codes, appeal path | REF-01 | Baris queue asal superseded oleh kemas kini Wave 2 di atas: source/tests risk engine wujud. Revalidate existing engine dan exact provider/integration gaps; jangan bina engine kedua atau menganggap semua skop CG-07 sudah verified. |
| BL-60 | RTO diukur: 30-minit drill + timing assertion + production drill + key-recovery evidence | DR-01 | Perlu persekitaran drill |

---

## 7. 9 subagent yang perlu diulang (baki sebenar dari log)

| Subagent mati | Baki sebenar (dari laporan sendiri) | Item backlog |
|---|---|---|
| Wave 1a backend | 5 fix belum dibuat (order resolution, budget router, duplicate parser purge, typed margin failure) + verifikasi tsc/test | BL-28, BL-30, BL-29 |
| Wave 1b frontend | `bun run build` tak dijalankan; 5 fail frontend tak disentuh; out-of-scope: incidentType allowlist + `confidenceScore` | BL-24, BL-26, BL-27, BL-01 |
| Wave 1c tests | Suite masih 2 RED; `package.json` `test:ext` script tak ditambah; `tests/ext/ext-webmcp-probe.test.ts` orphaned | BL-25, BL-40 |
| Fix wrong-money order match | Tiada output langsung (output limit) — kerja belum bermula | BL-28 |
| Fix provider error leak + budget | Ujian negatif tiada; lint/build tak run; assertion `copilot-adk.test.ts:43` berisiko | BL-31, BL-48 |
| Fix RED tests + gap pins | 5 task siap (sebenar) — pengesahan sahaja | BL-01 |
| Audit documentation alignment | C4/C7/C8/C9 tak jalan; asas claim C5/C6 salah; 50 fail bukan-MD staged | BL-07, BL-08, BL-09 |
| Audit acceptance ledger | T2 adjudication 18 baris hanya source-reference; bash denied | BL-04, BL-13 |
| Audit test suite integrity | ~100 anotasi test tak siap; flake check belum; verifier tak jalan | BL-01, BL-04, BL-13 |
| Adversarial code review | Terhenti tengah baca MCP session bridge | BL-46 |

---

## 8. Guardrail (dipakai untuk semua item atas)

1. **Offline mode untuk suite**: `ABANGCOLEK_DISABLE_LIVE_PROVIDERS=1` (sudah dimuat via `bunfig.toml`) — jangan consume kuota free tier dalam unit test.
2. **Model percuma untuk subagent**: guna `nvidia/z-ai/glm-5.3` (ada dalam config global) atau top-up kredit — 1 subagent mati dengan "Add credits to continue".
3. **Budget step lebih tinggi** untuk kerja multi-file, atau pecah kepada item lebih kecil (Wave 1a/1b/1c mati sebab saturief terlalu besar).
4. **Lane-exclusive**: backend agent tak edit `tests/**` dan sebaliknya — pemisahan ini punca separuh-setengah.
5. **Tiada `git add -A`**, tiada `bun *` tanpa `-p`/`--` yang jelas, tiada claim tanpa verifikasi.
6. **Satu perubahan = satu commit**, Conventional Commits.

---

## 9. Lima tindakan berikutnya (untuk orkestrator)

1. **BL-01** — jalankan lint/build/test penuh dua kali, tulis receipt baseline. Tanpa ini, semua item lain sukar Namely.
2. **BL-14** — betulkan skop cookie `platform_session` (enabler #1; membebaskan GUI-05, CPK-02, CPK-07).
3. **BL-23→BL-25 sebagai satu gelombang** — selaraskan server/frontend/tests JEV dalam satu putaran dengan owner berasingan.
4. **BL-28** — traitor job: `wrong-money order match` yang belum bermula.
5. **BL-04 + BL-05** — jalankan `verify-acceptance.ts` selepas `fix-acceptance-test-names.ts` disemak; ini yang menentukan berapa banyak ID benar-benar boleh ditutup.

---

## 10. Rujukan

- Sintesis penuh: `reports/chat-log-synthesis-20261021.md`
- Status kanonik (perlu refresh): `docs/CURRENT-STATUS.md`
- Ledger 85 baris: `reports/implementation/acceptance-status.json`
- Gate ledger: `scripts/maintenance/verify-acceptance.ts`, `scripts/maintenance/audit-ledger-closure.ts`
- Receipt release `main`: `reports/implementation/main-typescript-release-20261020.json`
