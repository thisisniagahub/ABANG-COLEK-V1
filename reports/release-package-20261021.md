# Release Package — ABANGCOLEK-PLATFORM (21 Oktober 2026)

**Verdik: `LOCAL_COMPLETE` untuk 47 baris `verified_local`; `RELEASE_BLOCKED` untuk 8 baris `blocked_external` dan untuk sebarang deploy (tiada token Vercel yang sah, tiada arahan release untuk perubahan semasa).**

**Base:** `1fc218e5784efb890641bba1e46ac97f617639a3` (branch `integrate/blueprint-v23`)
**Target:** working tree semasa (27 fail diubah + 21 fail baharu = 48 laluan)
**Ledger:** 85 baris — **47 verified_local · 30 implemented_unverified · 8 blocked_external · 0 not_run · 0 partial** → **38 belum ditutup**

---

## 1. Gate sebenar (exit code + kiraan sebenar)

| Gate | Perintah | Exit | Hasil |
|---|---|---:|---|
| Lint (dua projek tsc) | `bun run lint` | **0** | 0 ralat di `src/`, `server/`, `api/`, `shared/`, `tests/` |
| Build | `bun run build` | **0** | Vite + prerender; "catalogue version 0, 0 published products" |
| Boundaries | `bun scripts/maintenance/check-boundaries.ts` | **0** | 0 unauthorized boundary violation, tiada FORBIDDEN_MODULE_CYCLE, tiada STALE_REGISTERED_CYCLE |
| **Acceptance** | `bun scripts/maintenance/verify-acceptance.ts` | **0** | **11/11 suite, 1257 ujian lulus, 0 gagal, 8125 assertion, 0 unavailable**, `sourceStable: true` |
| **Register** | `bun scripts/maintenance/render-acceptance-register.ts` | **0** | 85/85 baris, **0 error, 0 warning**, `docs/prompts/ACCEPTANCE-REGISTER.md` ditulis semula |
| Suite penuh (isolat) | `bun test --isolate ./tests` | **0** | 1193 pass / 11 todo / 0 fail (1204 ujian, 165 fail) |

**Ujian yang TIDAK dijalankan / dikecualikan:** `tests/e2e/**` dikecualikan oleh `bunfig.toml` daripada `bun test` (ia jalan melalui `bun run test:e2e` dengan UI+API hidup); suite Python `agents/google-adk/tests` tidak dijalankan dalam sesi ini (venv project tidak disahkan di environment ini) — lihat §6.

## 2. Apa yang ditutup dalam sesi ini (ringkas, rujukan fail:baris)

| Domain | Perubahan | Bukti |
|---|---|---|
| Akses awam | `api/copilotkit` dikunci sesi sebenar + had 10 run creations/minit/principal (BLOCKER-1 audit backend) | lane `BE-KILO01B` |
| MCP canonical | `api/copilot-mcp.ts` facade atas implementasi + auth yang sama | lane `BE-KILO01` |
| Routing produksi | `vercel.json`: rewrite `/api/copilotkit/:route*` + `/api/copilot-mcp/:route*`; `includeFiles` untuk `uuid` + `pkce-challenge` | integrator |
| Dependency produksi | `uuid@11.1.1` + `pkce-challenge@5.0.1` sebagai **direct** dependencies (punca 500 `Cannot find package`); `vite` diduplikasi dibuang | integrator + `bun.lock` |
| Sejarah pelayar | `app.ts`: history dipotong 20 rujukan + role `system`/`tool` dibuang (prompt injection), had mesej 8192, body 64 KiB ⇒ 413, pagination 50 rekod/halaman, had 60 tool + 120 control requests/minit | integrator |
| TTL | Proposal 5 minit, kelulusan berisiko tinggi 15 minit, `ttlMs` pemanggil dihimpit server | integrator |
| Null-honesty | `expiryDaysRemaining: null` + `expiryReasonCode` bila expiry tidak direkod | integrator + `shared/copilot-contracts.ts` |
| Fail mati | `src/App.tsx` (65 KB, 0 importer) dihapus + pagar `tests/frontend/app-entrypoint.test.ts` (4 ujian) | integrator |
| Evidence | 8 fail `reports/implementation/evidence/*.json` mengikut skema repo | integrator |
| Ledger | 13 rujukan `.tsxx` → `.tsx`; 7 `remainingRequirement` dikosongkan; naratif REF-01/PAY-01/02/OFF-01/MOD-01/AI-02/PD-01/EXT-07/REL-01 diselaraskan | integrator |
| Dokumen | `CURRENT-STATUS.md` dijana semula (jadual 38 baris dari ledger), jadual baki, versi blueprint v2.4 di 6 fail, pautan mati backlog, salinan register ditandakan superseded | integrator + `scripts/maintenance/*` |

## 3. Baki setiap ID (38 belum ditutup)

| Status | Bilangan | Ringkasan |
|---|---:|---|
| `implemented_unverified` | 30 | sudah ada kodnya; yang kurang ialah **assertion acceptance** (contoh CPK-04/05/06/07/08/10, GUI-01..07) dan beberapa item domain (MOD-03/04/05/07/10, ADV-* sebahagian, SEC-01, EXT-01/05, AI-03) |
| `blocked_external` | 8 | CPK-03 (CopilotKit Intelligence: akaun+terms+project+key+Learning container+15 thread), EXT-02 (hosted memories), EXT-03 (Product Analytics offering), EXT-04 (Slack/Teams: provider app + Channel Code + host), EXT-05 (live MCP browser client), EXT-06 (kredensial STT — **bukan** akaun Intelijen), PAY-01/02 (kredensial merchant gateway) |

Butiran setiap baris: jadual yang dijana dalam `docs/CURRENT-STATUS.md` (bahagian "Semua rekod belum selesai") — sumbernya ledger, bukan teks tangan.

## 4. External gates (tidak boleh dipalsukan, tidak dicuba)

| Gate | Keperluan tepat | Status |
|---|---|---|
| Vercel | token `VERCEL_TOKEN` **tidak sah** (`vercel whoami` → "not valid") ⇒ tiada deploy, tiada deployment receipt | BLOCKED |
| GitHub Actions | akaun dikunci billing ⇒ workflow `main` tidak bermula | BLOCKED |
| CopilotKit Intelligence | akaun + Self-Service Agreement + organization (Developer) + project + `CPK_INTELLIGENCE_API_KEY` + Learning container + 15 eligible threads | BLOCKED |
| OpenCode Zen | kunci tamat tempoh (401 `api_key_expired`) | BLOCKED |
| Payment gateway | kredensial merchant (Billplz/FPX) + `PLATFORM_PAYMENT_WEBHOOK_SECRET` | BLOCKED |
| Data perniagaan | katalog production 0 produk yang diterbitkan ⇒ perlu data diluluskan pengguna | BLOCKED |
| Python ADK | `agents/google-adk/.venv` tidak disahkan dalam environment ini ⇒ pytest tidak dijalankan | NOT RUN |

**Checklist human untuk gate akaun:** `docs/copilotkit-intelligence-activation-checklist.md` (Fasa A akaun → B perubahan kod → C bukti → D Slack/Teams → E EXT-03/06).

## 5. Fail yang diubah (owned) — ringkas

**Backend (`server/`, `api/`, `shared/`)** — `app.ts` (had input/rate/history, TTL, `expiryReasonCode`), `adkAgent.ts` (HITL TTL 15 minit, `expiryDaysRemaining: null`), `approval/service.ts` (TTL clamp), `copilot-contracts.ts` (`expiryDaysRemaining: number | null` + `expiryReasonCode`), `copilot-mcp.ts` (baru), `copilotkit.ts` (descriptor rasmi + principal), `paymentCallbacks.ts`/`paymentCallbackRoutes.ts` (baru), `costLedger.ts` (baru), `publicOrderProjection.ts` (baru), `cartDraft.ts` (baru), `reconnectRevalidation.ts` (baru), `dispatchConsent.ts` (baru), `risk/*` (baru), `recovery/*` (baru), `surfaceCatalog.ts` + `copilot/surfaceMiddleware.ts` (baru), `aguiThreads.ts` (baru), `inspection/inspector.ts` (baru), `paymentCallbackRoutes.ts`.

**Frontend (`src/`)** — `features/copilot/cards/jevValueSemantics.ts` (baru), `cards/JevPrimitivesCard.tsx` (baru), `cards/JevAssessmentCard.tsx`, `cards/MarginSummaryCard.tsx`, `declarative/A2UIFixedRenderer.tsx`, `workspaces/JevEvaluationWorkspace.tsx`, `components/{OperationsBriefCard,RefundImpactPanel,OrderTrackingBadge,MarginSimulatorCard}.tsx`, `agui/aguiClient.ts` + `agui/aguiEvents.ts` (kode ralat dikekalkan), `App.tsx` **dihapus** (fail mati).

**Tests (`tests/`)** — 8 fail acceptance baharu dalam acceptance-area (loyalty-redemption-risk, backup-restore-rto, intelligence-agui-threads-mount, client-retry-revalidation, operational-amendments-consent, mod-01-cart-draft, mod-08-cost-basis, mod-09-citations), `app-entrypoint.test.ts` (pagar), `production-route-restore.test.ts`, `payment-callback-hmac.test.ts`, `ref-01-risk-engine`/`dr-01-recovery-rto`/`thread-store-mount`/`mod-08`/`mod-09` (nama lama dipindah).

**Docs/reports** — `AGENTS.md` (baru), `docs/CURRENT-STATUS.md`, `docs/handover/IMPLEMENTATION-CHECKPOINT.md`, `docs/prompts/ACCEPTANCE-REGISTER.md` (dijana), `PROJECT-CHECKLIST.md` (dijana), `docs/copilotkit-*.md` (2 baru), `docs/superpowers/plans/2026-10-21-kilo-completion-implementation.md` (baru), `reports/{chat-log-synthesis,open-task-backlog,w0-evidence,wave1-checkpoint}-20261021.md`, `reports/implementation/{kilo-completion-preflight-20261021.md,live-provider-evidence-20261021.json,acceptance-verification.json,evidence/*.json}`.

**Skrip (`scripts/`)** — `maintenance/{apply-ledger-evidence,fix-ledger-narrative,align-ledger-narrative,align-docs,render-current-status-open-records,write-kilo-evidence,bind-ledger-tests,split-acceptance-tests}-20261021.ts` (sekali guna, boleh dibuang selepas resept).

**Perubahan pihak lain yang dipelihara:** `docs/prompts/KILO-COMPLETE-PROJECT-20261021.md`, `docs/prompts/KILO-TASK-MATRIX-20261021.md`, `reports/founder-skills-research-20261021.md`, `reports/founder-skill-deep-research-20261021.md`, `reports/fnb-company-structure-guidelines-malaysia-20261021.md`, `docs/prompts/README.md` — **tidak** disentuh oleh integrator.

## 6. Known limits (tidak“” tanpa bukti)

1. **Python ADK**: `agents/google-adk/tests/test_agents.py` mempunyai 23 fungsi ujian tetapi TIDAK dijalankan dalam sesi ini (venv tidak disahkan). Angka "23 lulus" dalam ADR-0003 ialah run bersejarah, bukan bukti sesi ini.
2. **Browser e2e**: 61 spec, 23 lulus / 38 gagal pada larian 21 Okt. 29 kegagalan = satu punca akar (fixture log masuk); 7 spec Emons (hotspot/CTA/dialog) dan 1 mismatch tajuk `Colek.` vs `DuniaABANGCOLEK.` masih dalam investigates lane `KILO-10`. E2e **belum** pernah dijalankan terhadap preview/production.
3. **AG-UI client** belum mengendalikan `CUSTOM`/`TOOL_CALL_*`/`STATE_*` dan belum hantar `tools`/`state` dalam `RunAgentInput` (audit V-M3) — skop CPK-08/GUI-03, belum bermula.
4. **Surface catalog + middleware** (BL-16) masih **tidak di-mount** ke laluan yang dilayani (audit MAJ-7) — Modulariti digital belum menutup; ledger jujur (CPK-04/05 `implemented_unverified`).
5. **AI-02** guard provenance = static analysis + unit, bukan bukti runtime production.
6. **SEC-01** revocation path + handover expiry masih belum ada; **EXT-01** inspector route sudah ada tetapi belum ada bukti live.
7. `REVALIDATION_CONFLICT` diuji pada laluan kemas kini kempen sahaja; gelung henti-sambung penuh di browser belum dibuktikan.

## 7. Cadangan commit atomik (tiada commit dibuat — Arahan release diperlukan)

```
1. fix(deps): declare uuid + pkce-challenge as direct dependencies (production 500 cause)
2. fix(routes): restore multi-segment /api/copilotkit + /api/copilot-mcp routing on Vercel
3. feat(mcp): mount first-party MCP facade at /api/copilot-mcp (same implementation + auth)
4. feat(security): session-gate /api/copilotkit + per-principal run/tool/control rate limits
5. fix(security): sanitize browser history (cap 20 refs, drop system/tool roles) + §4 input bounds
6. fix(approval): clamp proposal TTL to 5 min and high-risk approval TTL to 15 min
7. fix(contract): expiryDaysRemaining null + expiryReasonCode when expiry is not recorded
8. refactor(ui): remove the unmounted second app tree (src/App.tsx) + entrypoint guard test
9. test(acceptance): move acceptance contracts into their acceptance areas + bind ledger rows
10. chore(ledger): align verified rows with code, fix .tsxx references, refresh evidence
11. docs: regenerate register/checklist from ledger; refresh CURRENT-STATUS + checkpoint
```

Setiap commit mesti dipilih fail (`git add <path>`), **bukan** `git add -A` — tree bercampur dengan kerja pihak lain (worktree candidate 290 fail dirty) dan `git add -A` pernah menyapu commit orang lain.

## 8. Deployment plan + rollback

- **Deploy**: `vercel deploy --prod` hanya selepas token yang sah + SHA tepat yang pushing. Semak `vercel inspect <deployment-id> --logs`, kemudian probe feature sebenar (bukan root 200): `GET /api/copilotkit/info`, `POST /api/platform/auth/login`, `POST /api/mcp` (initialize), `GET /api/copilotkit/descriptor`, `/api/copilot-mcp`.
- **Rollback**: `git revert` commit Atomic (bukan `git reset`), atau deploy ke SHA known-good `be45a84` yang sudah READY di `abangcolek.gangniaga.my`.
- **Nota**: deployment `dpl_4PgXXTsfhjnBrGzYBWCq5c2wrMYu` (dinyata oleh sesi paralel) dibina daripada **dirty tree**, jadi ia **tidak** boleh dikaitkan sebagai resept release untuk mana-mana SHA.

## 9. Perintah yang dijalankan dalam sesi ini (jejak penuh)

`bun run lint` · `bun run build` · `bun scripts/maintenance/check-boundaries.ts` · `bun scripts/maintenance/verify-acceptance.ts` · `bun scripts/maintenance/render-acceptance-register.ts` · `bun test --isolate ./tests` · `bun test ./tests/platform/...` (fokus) · `bun test ./tests/frontend/...` · `npx copilotkit@latest verify --json` (4/4 PASS) · `vercel whoami` (token tidak sah) · `bun install` (lock dikemas kini) — semuanya dengan exit code sebenar dalam §1.
