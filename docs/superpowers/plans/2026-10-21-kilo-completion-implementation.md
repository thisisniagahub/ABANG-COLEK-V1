# Pelan Implementasi Kilo Completion — 21 Oktober 2026

**Ibu:** `docs/prompts/KILO-COMPLETE-PROJECT-20261021.md` · **Matriks:** `docs/prompts/KILO-TASK-MATRIX-20261021.md`
**Preflight:** `reports/implementation/kilo-completion-preflight-20261021.md`
**Roster & had:** maksimum **3 writer aktif** (satu bagi setiap lane) + **1 auditor**; setiap assignment = **satu acceptance ID**; brief wajib §7 prompt.

---

## 1. Corollary order (satu acceptance ID satu assignment)

### 1a. Skill yang WAJIB dibaca oleh setiap lane (bukan skill rawak)

`.agents/skills/` dalam repo diutamakan (prompt §6). Baca `SKILL.md` sebenar **sebelum** mula; jangan tulis "menggunakan skill" tanpa membacanya.

| Pakej | Skill (baca dahulu, dalam turutan) | Global fallback |
|---|---|---|
| KILO-00/09/11 perancangan & ledger | `writing-plans`, `dispatching-parallel-agents` | `using-git-worktrees` jika isolation perlu |
| KILO-01 `api/copilot-mcp.ts` (MCP + persistence) | **`.agents/skills/copilotkit/SKILL.md`**, **`.agents/skills/copilotkit-cli/SKILL.md`** | `supabase` + `supabase-postgres-best-practices` jika ada perubahan SQL/RLS |
| KILO-01 `api/copilotkit.ts` (runtime v2, identifyUser, threads) | **`.agents/skills/copilotkit/SKILL.md`**, **`.agents/skills/copilotkit-cli/SKILL.md`** | `.agents/skills/intelligence-docs/SKILL.md` hanya jika menyentuh Intelligence |
| KILO-02 auth/persistence | `supabase`, `supabase-postgres-best-practices` | `security-review` (auth/authority) |
| KILO-03 payment/refund/exactly-once | `systematic-debugging` (reproduce dahulu), `test-driven-development` | `security-review` |
| KILO-04 Pet/workspace lifecycle | `systematic-debugging`, `react-patterns` (state ownership) | `e2e-testing` untuk browser |
| KILO-05 ADK/delegation/budget | **`.agents/skills/copilotkit/SKILL.md`**, `typesafe-ai` (kontrak JEV typed) | `python-testing` untuk jambatan Python |
| KILO-06 Gen-UI/A2UI/your-components | **`.agents/skills/copilotkit/SKILL.md`** (A2UI catalog), `typesafe-ai` (typed props) | `frontend-a11y`, `make-interfaces-feel-better` |
| KILO-07 domain/JEV/ADV tools | **`typesafe-ai`** (JEV: choice/score/noul, no-match/UNKNOWN, abstention) | `docs/design/copilot-advanced-tools.md` sebagai kontrak input/output |
| KILO-08 learning/memories/channels/EXT | **`.agents/skills/copilotkit-channels/SKILL.md`**, `setup-slack-channel` (Slack sahaja) | `.agents/skills/intelligence-docs/SKILL.md` untuk memories |
| KILO-09 ledger/verifier/renderer | `tdd-workflow`, `verification-before-completion` | `requesting-code-review` untuk review bebas |
| KILO-10 browser/CI | **`e2e-testing`** (Playwright), `systematic-debugging` | `git-workflow` (workflow CI) |
| KILO-11 release/verify | **`vercel-cli-with-tokens`**, `git-workflow`, `verification-before-completion` | `canary-watch` (probe selepas deploy) |
| Audit (semua lane auditor) | `code-reviewer`, `requesting-code-review` | `production-audit` |

### 1b. Peta assignment

| Pakej | ID (satu assignment = satu ID) | Owner | Fail eksak | Red test (file:locus) | Reviewer |
|---|---|---|---|---|---|
| **KILO-01** | CPK-01 (route parity + cold start) | writer-backend | `api/copilot-mcp.ts` (baru), `api/copilotkit.ts`, `vercel.json`, `package.json` | `tests/platform/production-route-restore.test.ts` (tambah: `/api/copilot-mcp` wujud, `/api/copilotkit/info` ⇒ descriptor) | auditor |
| **KILO-01b** | (dependency fix) | integrator (root config) | `package.json` + `bun.lock` | `tests/platform/production-route-restore.test.ts` (hujah: `uuid` & `pkce-challenge` declared) | auditor |
| **KILO-02** | MOD-02 / SEC-01 (public token expiry + MCP membership) | writer-backend | `server/agents/mcp/{actor,http,server}.ts`, `server/platform/auth.ts`, `server/platform/publicOrderProjection.ts` | `tests/platform/order-tracking-token.test.ts`, `tests/platform/mcp-*.test.ts` | auditor |
| **KILO-03** | PAY-01 (payment progression vs replay) | writer-backend | `server/platform/paymentReconciliation.ts`, `server/platform/paymentCallbacks.ts` | `tests/platform/payment-callback-hmac.test.ts` | auditor |
| **KILO-03b** | CPK-06 (HITL executor + exactly-once) | writer-backend | `server/agents/executor/**`, `server/agents/approval/**` | `tests/platform/adv-tools-approval-execution.test.ts` | auditor |
| **KILO-04** | CPK-08 / CPK-09 (Pet/workspace lifecycle + privasi) | writer-frontend | `src/features/platform/AppRouter.tsx`, `src/features/pet/**`, `src/features/workspaces/CopilotWorkspace.tsx`, `src/features/copilot/agui/**` | `tests/frontend/pet-*.test.tsx`, `tests/frontend/workspace-*.test.tsx` | auditor |
| **KILO-05** | CPK-10 (delegation + budget ledger) | writer-backend | `agents/google-adk/**` (Python), `server/agents/copilot/**` | `agents/google-adk/tests/**`, `tests/platform/copilot-runtime-pipeline.test.ts` | auditor |
| **KILO-06** | GUI-04 / GUI-06 (state + A2UI catalog pada live route) | writer-frontend | `src/features/copilot/declarative/**`, `src/features/copilot/state-rendering/**` | `tests/frontend/a2ui/**`, `tests/frontend/gui03-04-state-tool/**` | auditor |
| **KILO-06b** | CPK-07 (frontend tools ke agent) | writer-backend | `api/copilotkit.ts`, `server/agents/copilot/**` | `tests/frontend/frontend-tool-adapters/**` | auditor |
| **KILO-07** | MOD-08 / MOD-09 (cost basis + citations real) | writer-backend | `server/platform/costLedger.ts`, `server/agents/tools/capabilities/discovery.ts` | `tests/copilot/mod-08-finance.test.ts`, `tests/copilot/mod-09-tasks-sop.test.ts` | auditor |
| **KILO-07b** | ADV-05 / ADV-15 / ADV-17 / ADV-21 | writer-backend | `server/agents/tools/capabilities/{commerce,growth,operations}.ts` | `tests/platform/adv-tools-*.test.ts` | auditor |
| **KILO-08** | EXT-06 (STT transport) / EXT-07 (vision) | writer-backend | `server/agents/intelligence/**`, `server/platform/evidenceFiles.ts` | `tests/platform/ext-*.test.ts` | auditor |
| **KILO-08b** | CPK-03 / EXT-01..EXT-05 (activation records) | integrator (docs/reports) | `reports/implementation/activation-decisions.json` | `tests/platform/intelligence-ext-local.test.ts` | auditor |
| **KILO-09** | 85-row ledger + verifier + register | integrator (reports/scripts) | `scripts/maintenance/{verify-acceptance,render-acceptance-register}.ts` | `tests/platform/acceptance-*.test.ts` (negative tests renderer/verifier) | auditor |
| **KILO-10** | 3 browser failures + CI recipe | writer-tests + integrator (CI) | `tests/e2e/**`, `.github/workflows/ci.yml` | `tests/e2e/*.spec.ts` | auditor |
| **KILO-11** | final verification + release package | integrator | — | — | auditor + integrator |

## 2. Kontrak yang mengikat semua assignment

- **Wang**: integer sen; margin/rasio guna **BigInt basis points**; tiada float untuk amaun/peratus; "tidak dikira" ⇒ `null` + reason code (bukan `0`/`false`/`PASS`).
- **Authority**: pelayan memiliki role/tenant/grants/price/policy/approval/outcome. `X-Actor`/body/localhost bukan bukti.
- **Idempotency**: terikat `principal + operation + canonical payload hash`.
- **Simulasi/draf**: tidak membuat order, reserve, settlement, publish atau hantar.
- **Budget** (mewarisi merentas parent/child/retry/fallback): 30 s total · 3 model calls · 6 tool dispatch · 8192 in /1024 out setiap call · 24576 in /3072 out keseluruhan · specialist depth 1, concurrency 2.
- **Model order**: `gemini_free/gemini-3.6-flash` → `gemini_free/gemini-3.5-flash-lite` → `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free`. Tiada paid fallback tersembunyi.
- **Ui bounds**: 2 surfaces/run · 64 components/surface · depth 8 · 128 patch ops/event · 512 ops/run · 64 KiB envelope.

## 3. Urutan kemas kini evidence (setiap subtask yang dibuktikan)

1. `reports/implementation/evidence/<ID>.json` — command/cwd/version/exit/count/time, hash source+lock+policy, named assertions, environment, data class, receipt refs, reviewer, limits. Tanpa CoT/secret/cookie.
2. `reports/implementation/acceptance-status.json` — row turun status HANYA jika bukti menunjukkan jurang; `blocked_external` mesti senaraikan baki tempatan berasingan.
3. `bun scripts/maintenance/verify-acceptance.ts` → `bun scripts/maintenance/render-acceptance-register.ts` (JANPAI tick manual).
4. `docs/CURRENT-STATUS.md` + `docs/handover/IMPLEMENTATION-CHECKPOINT.md` + `reports/open-task-backlog-20261021.md`.

## 4. Gate (hanya integrator, tree senyap)

```powershell
git diff --check
bun run lint
bun scripts/maintenance/check-boundaries.ts
bun run build
bun run test:platform      # dua kali berturut-turut
& .\agents\google-adk\.venv\Scripts\python.exe -m pytest agents/google-adk/tests -q
bun scripts/maintenance/verify-acceptance.ts
bun scripts/maintenance/render-acceptance-register.ts
```

Browser QA (dua proses milik sesi sahaja, port 3011 API + 3001 UI):

```powershell
bun run qa:server
$env:PLATFORM_API_TARGET='http://127.0.0.1:3011'; bun .\node_modules\vite\bin\vite.js --host 127.0.0.1 --port 3001 --strictPort
$env:PLATFORM_TEST_URL='http://127.0.0.1:3001'; bun run test:e2e
```

## 5. External gates (tidak dicuba, tidak dipalsukan)

`VERCEL_TOKEN` tidak sah (tiada deploy/receipt) · GitHub Actions billing lock · CopilotKit Intelligence (account+terms+project+key) · OpenCode Zen kunci mati · payment gateway credential · katalog production kosong (data perniagaan perlu kelulusan pengguna) · Google ADK venv belum disahkan (provision terasing dengan `agents/google-adk/requirements.txt`, bukan pip global).

## 6. Batas commit/push/deploy (§1, §8 KILO-11)

Sesi ini **tidak** commit, push atau deploy. Yang perlu: reviewed owned file list, base/target/source manifest, dependency/lock changes, migration preconditions + rollback, test/protocol/browser receipts, external gates, cadangan Conventional Commits atomik, deployment plan + rollback, known limits, tanpa secret/DB/media terstage.

## 7. Checkpoint

Setiap subtask: checkpoint di `docs/handover/IMPLEMENTATION-CHECKPOINT.md` (task, files/interface hash, red/green, commands, reason gagal, next edit/test, worker/task ID). Jangan tinggalkan fail separuh ditulis.
