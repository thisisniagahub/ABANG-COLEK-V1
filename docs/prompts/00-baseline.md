# Prompt 00 — Baseline, Identity dan Activation Preflight

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Checklist wajib selepas setiap task:** baca [PROJECT-CHECKLIST.md](../../PROJECT-CHECKLIST.md). Integrator mengekalkan `[ ]` semasa in_progress/separa/blocked/failed/not_run; tukar kepada `[x]` hanya selepas acceptance item lulus dengan actual tests, environment, source manifest dan reviewer. Tambah evidence link yang wujud, sync acceptance register/checkpoint/counters dan rekod exact next task sebelum handoff. Worker menghantar bukti, bukan mengedit tick canonical serentak. Ikut execution contract§10; jangan menutup parent feature hanya kerana child task selesai.


Status: **arahan implementasi masa hadapan**, bukan receipt aplikasi siap. Baca [master prompt](IMPLEMENT-ABANGCOLEK.md), [execution contract](AGENT-EXECUTION-CONTRACT.md), [acceptance register](ACCEPTANCE-REGISTER.md), [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md) dan [domain review](../../reports/blueprint-review-20261020-domain.md). Jalankan dahulu; next ialah **03A**, bukan 01. Jangan memilih stack, model, hosting atau business policy baharu.

## Input, ownership dan output

Integrator memiliki baseline dan checkpoint; reviewer membaca tanpa mengubah source. Skop fasa ini ialah inventory, read-only diagnostics, ujian menggunakan fixture/temp storage dan penulisan evidence. Ia tidak mengizinkan inference, perubahan DB sebenar, restart runtime, restore, merge atau deploy. Dependency installation fasa 02 memerlukan compatibility plan dahulu.

| Output PLANNED | Kandungan wajib |
|---|---|
| `reports/implementation/00-baseline.md` | Masa MYT, repo/worktree/HEAD identity, source observations, commands/results dan batas pemeriksaan |
| `reports/implementation/00-file-manifest.json` | Path, tracked/untracked/dirty state, SHA-256 fail batch seterusnya; tiada secret values |
| `reports/implementation/00-capability-availability.md` | Skill/plugin/MCP/CLI sebenar, probe, status callable/configured-only/auth-required/unavailable dan fallback |
| `reports/implementation/domain-policy-decisions.md` | Commercial/privacy/recovery decision table; reference approval sebenar |
| `reports/implementation/activation-decisions.json` | Exact activation schema execution contract §8; tiada credentials |
| `reports/implementation/acceptance-evidence.md` | Semua 78 requirement rows daripada acceptance register dengan status/evidence berasingan |
| `docs/handover/IMPLEMENTATION-CHECKPOINT.md` | Current/next task, ownership, dirty manifest, blockers, disabled states dan rollback |

Fail yang wujud sahaja tidak memberi policy approval atau test pass. Jangan load semua skills/library ke context; baca hanya skill manifest yang relevan dalam execution contract §6–7.

## 00.1 — Checkout dan dirty-state evidence

Jalankan dari `D:\ABANGCOLEK-PLATFORM`, tanpa Git mutation:

```powershell
Get-Location
git rev-parse --show-toplevel
git rev-parse HEAD
git status --short
git worktree list --porcelain
git remote -v
Get-Item -LiteralPath node_modules | Select-Object FullName,LinkType,Target
```

Jangkaan: cwd/root sepadan, actual state direkod. Historical snapshot penyediaan prompt: root integrasi `60311aa`, main release `e736856`, dan worktree `copilot-completion` mempunyai interrupted integration. **Reverify** HEAD/index/diffs/unmerged entries/`MERGE_HEAD`; ketiadaan `MERGE_HEAD` tidak membuktikan reconciliation selesai. Jangan memakai worktree itu sebelum reconciliation khusus; jangan reset/clean/clone/recreate/reinstall atau bulk-stage dirty files.

Inventory source batch 03A dengan `rg --files`, `git diff --name-status` dan `Get-FileHash -Algorithm SHA256`. Re-read sebelum edit jika hash berubah. Redact token dalam remote URL. Jangan dump `.env`, DB rows, cookies atau credential values.

## 00.2 — Trace source dan runtime authority

Baca entry/callers berikut; **EXISTING observations** perlu diperiksa semula pada checkout semasa:

- `package.json`, `bun.lock`, `index.html`, `src/main.tsx`, `vite.config.ts`, TypeScript/Vercel config, `scripts/dev.ts`, `tests/playwright.config.ts` dan `tests/e2e/fixtures.ts`.
- `api/platform.ts`, `api/platform/[...path].ts`, `server/index.ts`, `server/platform/app.ts`, `auth.ts`, `store.ts`, `supabasePersistence.ts`, `runtimeControls.ts`.
- `server/platform/adkAgent.ts`, `freeModelRouter.ts`, `domainTools.ts`, `mcp/operationsBrief.ts`, `shared/copilot-contracts.ts`, `shared/growth-contracts.ts`.
- `agents/google-adk/app.py`, `requirements.txt`, `specialists/`, `tests/test_agents.py`; inspect imports/event shape. Custom FastAPI/SSE atau health label bukan proof ADK/AG-UI SDK.
- `src/features/workspaces/CopilotWorkspace.tsx` serta existing `src/features/copilot/interactive/MarginSimulatorForm.tsx`, `mcp-apps/OperationsBriefApp.tsx`, `components/frontendToolAdapters.ts`. Komponen/parser bukan proof runtime/MCP iframe integration.

Rekod browser -> canonical API -> local SQLite atau Supabase snapshot CAS -> private evidence chain. Sahkan data-root/runtime identity tanpa membaca business rows. Map UI3000/API3010/runtime3020/ADK8030 kepada checkout/runtime ID; port terbuka sahaja tidak mencukupi. Proses lain pada port tetap -> `RUNTIME_IDENTITY_MISMATCH`; jangan kill/reassign.

Trace lifecycle temporary commerce store dan tempat tools memerlukan fresh canonical requests. `var/lib/copilot/` ialah target session local yang berasingan, bukan commerce authority baharu. Rekod local dan cloud persistence/backup secara berasingan.

## 00.3 — Baseline commands dan discovery

Commands **EXISTING scripts** selepas baca config:

```powershell
bun --version
bun run lint
bun run build
bun run test:platform
bun run test:e2e --list
```

Jangkaan lulus: exit 0, actual test counts/discovered paths direkod. Capture cwd, duration, exit/stdout/stderr yang disunting dan artifact refs. `--list` hanya discovery, bukan browser pass. Tool unavailable -> `not_run`; actual failure -> baseline `failed`, bukan regression. Jangan padam/disable test untuk menjadikan baseline hijau.

QA fixture `var/run/e2e-fixture.json` dan target URL mesti disposable/verified sebelum browser bootstrap. Jangan gunakan production. Rekod bahawa current `test:platform` tidak semestinya memasukkan `tests/frontend`, future `tests/copilot` atau `tests/architecture`; fasa 01 mesti memastikan discovery parity dan explicit commands.

## 00.4 — SDK, Python dan docs preflight

Baca repo-local CopilotKit/CLI skills, discover Context7/docs tools sebenar, dan ikut fallback execution contract. Rekod official URL/version/export bagi setiap API yang akan dipakai. Jangan meneka hooks, middleware atau AG-UI events daripada contoh versi lain.

Semua 16 base npm/PyPI pins ADR pernah ditemui pada registry; **metadata availability bukan install/import/protocol proof**. Semak exact dependencies/optional peers dan plan locked resolver/import tests. MCP `ext-apps@2.0.3` memerlukan `core/client/server@2.0.0`, sementara runtime menggunakan `sdk@1.32.1`: dua dependency graphs diasingkan melalui HTTP. Plan tests imports, initialize, tools/resources dan iframe; jangan cast/share `McpServer` merentas major.

Semak Python3.12, `uv` dan interpreter `.venv` sedia ada tanpa overwrite. Jangan install optional model SDK secara pukal. Failure -> `DEPENDENCY_INCOMPATIBLE` dengan exact error; teruskan independent source integrity. Metadata sahaja tidak menutup gate.

## 00.5 — Policy dan external activation decisions

Setiap domain decision menyimpan ID, owner, effective version, approved/not-approved state, purpose/channel, data classes, processor/account tier, retention/deletion/export, evidence ref, review/expiry, affected requirements dan safe disabled behavior. Activation JSON ikut exact shared schema. Unknown bukan approved; synthetic fixture bukan approval production.

1. Commercial: approved cost/provenance, margin amount/bps, refund/shipping/fee entitlement, commission earning/attribution/stacking, reward expiry dan post-payout offset. Algoritma teknikal largest remainder tidak meluluskan nilai komersial.
2. Models: exact offering/account/region/quota, semua fee components, privacy/training/retention, allowed data dan configured status secret sahaja. Candidate order tetap, belum ada inference baseline.
3. Intelligence: existing free project/account owner, server credentials, approved data export/retention/delete dan deployment. Missing gate -> CPK-02/03 `blocked_external`; jangan login/create project/subscribe.
4. Recovery: setiap authorized runtime local/cloud mempunyai historical snapshot target, private evidence export, scheduler identity, retention, encryption/key recovery dan alarm owner. Latest CAS blob/local timer bukan historical cloud DR.
5. Billplz/outbound: sandbox activation/test account, approved marketing transport/consent/durable intent/worker. Tiada external message dihantar dalam baseline.

## 00.6 — Acceptance dan checkpoint

Instantiate **78 core requirements**: CPK10+GUI7+MOD10+ADV32+master19. Registered functions boleh melebihi32; ini bukan jumlah tests. Ikut status vocabulary execution contract §9; source presence ialah observation. Bezakan future test/implementation path daripada actual existing file dan command yang sudah dijalankan. Adjacent ecosystem EXT rows kekal registry berasingan; jangan menambahnya kepada78 atau auto-enable kerana SDK dipasang.

Tulis plan 03A dengan ownership fail/test, prerequisite, red test, implementation, green test, reviewer, exit gate dan next task. Maksimum3 workers hanya jika actual slots tersedia; failed spawn -> inline lane, jangan mengaku agent telah berjalan. Workers tidak revert edit orang lain.

## Exit gate dan continuation

00 lulus apabila source/runtime inventory boleh diaudit, baseline outcomes direkod, 78 rows ada initial state, decision/MCP/SDK gates explicit dan independent read-only review selesai. Tiada claim runtime/provider/production verified daripada metadata.

Next: [03A integriti](03-domains-and-tools.md#fasa-03a--integriti-sebelum-struktur). `POLICY_UNCONFIGURED`, `PROVIDER_ELIGIBILITY_UNVERIFIED` atau Intelligence blocker menyekat capability tepat; synthetic/domain work bebas diteruskan. Runtime identity unknown menyekat restart/data mutation/restore. Checkpoint blocker mesti mempunyai reason, evidence, owner, safe state dan next executable task.
