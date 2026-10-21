# KILO-00 — Preflight dan perancangan closure (21 Oktober 2026)

**Pemilik:** primary integrator (Code) · **Skop:** `D:\ABANGCOLEK-PLATFORM`
**Rujukan:** `docs/prompts/KILO-COMPLETE-PROJECT-20261021.md` §4, `docs/prompts/KILO-TASK-MATRIX-20261021.md`
**Bukti audit:** `var/log/whole-project-audit-20261021/` (gitignored, masih wujud)

---

## 1. Identiti repo (read-only, disahkan)

| Perkara | Nilai sebenar |
|---|---|
| cwd | `D:\ABANGCOLEK-PLATFORM` |
| branch | `integrate/blueprint-v23` |
| HEAD | `1fc218e5784efb890641bba1e46ac97f617639a3` |
| `origin/main` | `be45a845f311d57212e7e1f1cc88f716cdfd2d93` (2 commit di belakang HEAD) |
| remote | `https://github.com/thisisniagahub/ABANG-COLEK-V1.git` |
| working tree | 7 entri berubah (2 fail modified + 5 untracked) — **bukan** bersih: `docs/prompts/README.md`, `reports/implementation/acceptance-verification.json`, `reports/implementation/verify-acceptance-clean-20261021.log`, `reports/implementation/full-suite-isolate-20261021.txt`, `scripts/maintenance/apply-ledger-evidence-20261021.ts` + 2 skrip sekali guna lain |
| worktrees | 8+ (root, `.kilo/worktrees/abangcolek-logo-theme-20261017`, `D:/ABANGCOLEK-WORKTREES/*`) — semuanya **bukan** milik sesi ini; tiada yang diambil alih |
| node_modules | **Directory sebenar** (bukan junction) → `bun install` terasing dibenarkan |
| versi | bun 1.4.2 · node v24.19.0 |

**Nota snapshot prompt:** prompt menyebut HEAD `9ffcbb2`; kini `1fc218e` (2 commit， daripada snapshot). `origin/main` masih `be45a84` seperti prompt — **tiada push dibuat dalam sesi ini** (§1 prompt: jangan commit/push/deploy tanpa arahan release eksplisit untuk perubahan semasa).

## 2. KEPUTUSAN PENTING — punca 500 production (bukti sebenar, bukan tekaan)

Daripada `var/log/whole-project-audit-20261021/vercel-errors.jsonl` (deployment `dpl_5kj1wZ2bGi5hnPqQprzGoXMi58AL`, domain `abangcolek.gangniaga.my`, branch `main`):

```
[ResolveMessage: Cannot find package 'pkce-challenge' imported from
  /var/task/node_modules/@modelcontextprotocol/client/dist/index.mjs]
  → GET /api/mcp          → 500 FUNCTION_INVOCATION_FAILED
[ResolveMessage: Cannot find package 'uuid' imported from
  /var/task/node_modules/@ag-ui/client/dist/index.mjs]
  → GET /api/copilotkit    → 500 FUNCTION_INVOCATION_FAILED
```

TQN `production-copilot-http.json` mengesahkan: `/api/copilotkit` 500, `/api/mcp` 500 (kedua-duanya `text/plain`, `FUNCTION_INVOCATION_FAILED`).

**Jejak (bukan andaian):**
- `bun.lock` **mengandungi** `uuid@11.1.1` dan `pkce-challenge@5.0.1` sebagai entri atas ✓
- `package.json` **tidak** mendeklarasikan `uuid` mahupun `pkce-challenge` (kedua-duanya hanya *transitive*):
  - `uuid` ← `@ag-ui/client@1.0.2` (deps `uuid ^11.1.0`)
  - `pkce-challenge` ← `@modelcontextprotocol/client@2.0.0` (deps `pkce-challenge ^5.0.0`) dan `@modelcontextprotocol/sdk@1.32.1`
- `vercel.json` menggunakan `installCommand: bun install --frozen-lockfile` + `framework: vite` + `outputDirectory: dist`.
- **Diagnosis:** penjejakan fail Vercel bring masuk `@ag-ui/client` dan `@modelcontextprotocol/client` tetapi **tidak** membawa dependensi transitif yang dirujuk sebagai bare specifier daripada fail `.mjs` → runtime Bun di `/var/task` gagal resolve. Fix minimum: `includeFiles` yang berminat dalam `vercel.json`, DAN menjadikan dua pakej itu **direct dependencies** (yang kedua penghilang Akar sebenar).

**Fix minimum yang dibuktikan perlu (KILO-01):**
1. `package.json` → `dependencies.uuid = "11.1.1"`, `dependencies["pkce-challenge"] = "5.0.1"` (versi terpasang tepat, tiada range longgar).
2. `vercel.json` → `includeFiles` untuk `node_modules/uuid/**` dan `node_modules/pkce-challenge/**` (permalinan, bukan sole solution).
3. `bun install` dalam root (node_modules directory sebenar) → kemas kini `bun.lock`.
4. Bukti: cold start proses BUN pada laluan `/api/copilotkit` dan `/api/mcp` (bukan source grep) ⇒ 200/401 bertyped, bukan 500.

## 3. Route parity (dapatan audit 1)

| Laluan | Status production | Kehendaki |
|---|---|---|
| `/api/copilotkit` | 500 | berfungsi (runtime sebenar) |
| `/api/copilotkit/info` | 404 | descriptor/info mesti dijawab |
| `/api/mcp` | 500 | **compatibility facade** sah (§5.1) — implementasi + auth yang SAMA |
| `/api/copilot-mcp` | 404 | **first-party MCP canonical** mesti wujud (tiada fail hari ini: `api/copilot-mcp.ts` tiada) |
| `/api/platform/**` | (rewrites sedia ada) | `api/platform/[...path].ts` + `api/platform.ts` |

## 4. Ledger & evidence (baca, bukan dipercayai bulat-bulat)

- 85 ID = **47 verified_local + 30 implemented_unverified + 8 blocked_external** (selepas kemas kini 21 Okt; prompt snapshot 47/30/8 sama).
- **7 baris `verified_local` baru** diikat kepada fail ujian sebenar (REF-01, DR-01, CPK-02, MOD-01, MOD-08, MOD-09, OFF-01) — semua fail berada dalam acceptance-area yang diminta renderer.
- `verify-acceptance.ts`: **11/11 suite, 1247 ujian, 0 fail, 8109 assertion**, `sourceStable: true` ✓
- `render-acceptance-register.ts`: **masih exit 1** → perlu digerakkan selepas semakan income.
- `bun test --isolate ./tests` penuh: **1327 pass / 11 todo / 0 fail** (171 s). Tanpa `--isolate`: 9 fail akibat penumpukan cross-file (bukan regresi produk).

## 5. Audit 12 dapatan — di mana bukti berada

`var/log/whole-project-audit-20261021/`: `REVIEW.md` (15.5 KB, dapatan penuh), `audit-summary.json`, `browser.json` (15 pass / 3 fail daripada 18), `money-security-probes.{ts,jsonl}`, `pet-browser-probes.log`, `vercel-errors.jsonl`, `launcher-focused.log` (10 pass), `python.log`.

**3pepijat browser yang tinggal (KILO-10):** (a) timeout perjalanan enam chapter; (b) butang fallback "Terokai dunia" tiada; (c) tajuk test `Colek.` bercanggah dengan DOM `DuniaABANGCOLEK.`.

## 6. Inventory perubahan sedia ada (perlu dipelihara, bukan ditimpa)

- `api/platform.ts`, `api/platform/[...path].ts`, `api/copilotkit.ts`, `api/mcp.ts`, `vercel.json`, `tests/platform/production-route-restore.test.ts` — semuanya **sudah ada** dan telah diubah oleh sesi ini (cookie scope, payment routes, thread mount). Jangan pulihkan versi candidate lama.
- Pemindahan fail ujian 21 Okt: `tests/platform/{ref-01-risk-engine→loyalty-redemption-risk, dr-01-recovery-rto→backup-restore-rto, thread-store-mount→intelligence-agui-threads-mount}` dan `tests/copilot/mod-{01,08,09}-*.test.ts`.
- `reports/implementation/acceptance-status.json` — 7 baris dinaik taraf ke `verified_local` + `testFile`/`testName` sebenar.

## 7. Queue dependency (KILO-01 → 11)

| Pakej | Kebergantungan | Status praflight |
|---|---|---|
| KILO-00 | — | **selesai (dokumen ini + plan implementasi)** |
| KILO-01 | KILO-00 | **mula** — uuid/pkce + route parity |
| KILO-02 | KILO-01 (runtime hidup) | queued |
| KILO-03 | KILO-02 (principal) | queued |
| KILO-04 | KILO-01 | queued |
| KILO-05 | KILO-01, KILO-02 | queued |
| KILO-06 | KILO-05 (runtime) | queued |
| KILO-07 | KILO-02/03 | queued |
| KILO-08 | KILO-07 | queued |
| KILO-09 | mana-mana lane yang sudah bukti | queued |
| KILO-10 | KILO-01 (browser harness) | queued |
| KILO-11 | semua | akhir |

## 8. External gates (tidak boleh dipalsukan, tidak dicuba)

| Gate | Status | Bukti |
|---|---|---|
| Vercel token | **TIDAK SAH** | `vercel whoami` → "The token provided via VERCEL_TOKEN environment variable is not valid" ⇒ tiada deploy boleh dibuat dan tiada deployment receipt boleh diambil dalam sesi ini |
| GitHub Actions | **billing lock** | `main` workflow tidak bermula (akaun, bukan kod) |
| CopilotKit Intelligence | account + terms + project key | tiada ⇒ CPK-03/EXT-02 kekal `blocked_external`; kerja tempatan terus |
| OpenCode Zen | kunci tamat tempoh (401) | kekal mati |
| Payment gateway | tiada kredensial merchant | PAY-01/02 kekal `blocked_external` selepas separuh tempatan lengkap |
| Katalog production | **kosong** ⇒ data perniagaan perlu kelulusan pengguna | `docs/CURRENT-STATUS.md` + §5.3 prompt: sediakan onboarding/import berizin + empty state jujur; **jangan** fabrikasi SKU/harga/testimoni |

## 9. Nota kepatuhan (§7 prompt)

- Maksimum **3 writer aktif** (satu bagi setiap lane) + auditor. Sekarang: 4 **auditor read-only** sedang berjalan (audit blueprint yang diminta pengguna sebelum prompt ini) — ia menambah liputan dan TIDAK menulis fail; tiada writer backend/frontend/tests lain yang aktif.
- Setiap assignment = satu acceptance ID, brief wajib §7 (TASK/BASE/OWNERSHIP/CONTRACT/RED TEST/IMPLEMENT/VERIFY/DO NOT/RETURN).
- Tiada commit/push/deploy dalam sesi prompt ini.