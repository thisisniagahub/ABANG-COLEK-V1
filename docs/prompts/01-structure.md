# Prompt 01 — Restructure Berperingkat dan Dependency Enforcement

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Bukti dan generated status:** baca [PROJECT-CHECKLIST.md](../../PROJECT-CHECKLIST.md). Integrator menulis actual receipt/environment/source manifest/reviewer, mengemas kini ledger85 berdasarkan bukti lengkap, kemudian menjalankan verifier dan renderer. Jangan edit generated checklist/register dengan tangan; separa/blocked/failed/not-run kekal unchecked. Worker menyerahkan bukti/baki; checkpoint menyimpan next task. Ikut execution contract§10; child task tidak menutup parent feature.

**Refinement commerce/growth:** baca [spec canonical](../design/commerce-growth.md) dan [handover](COMMERCE-GROWTH-HANDOVER-20261021.md). Pelihara identity/attribution snapshot dan transaksi canonical ketika move; jangan bina backend commerce kedua atau pindah data roots. Ini subcriteria existing85 IDs; tiada kadar/5-tier/wallet/native app baharu diluluskan dan tiada acceptance ditutup oleh dokumentasi.


Baca [master prompt](IMPLEMENT-ABANGCOLEK.md), [execution contract](AGENT-EXECUTION-CONTRACT.md), [acceptance register](ACCEPTANCE-REGISTER.md), [structure design](../design/repository-structure.md) dan checkpoint **03A**. Integriti mendahului move. Satu React/Vite+Bun modular monolith telah diputuskan; jangan memilih framework, monorepo atau directory architecture baharu.

## Input, ownership dan output

Migration integrator memiliki move manifest, aliases/configs dan maintained links. Frontend/backend owners menerima fail berasingan; seorang owner sahaja memindah fail tertentu. Reviewer menyemak hashes/import graph/discovery. Semua dirty changes fasa00/03A mesti dipelihara.

Output **PLANNED**: `reports/implementation/01-structure.md`, `reports/implementation/01-move-manifest.json`, dependency exception register dan checkpoint02. Manifest row: old/new path, before/after SHA-256, operation, owner, consumer list, verification command/result dan rollback condition. Tiada DB/evidence/secrets/tool directories dipindahkan.

## 01.1 — Preflight dan TDD checker

1. Re-read HEAD/status/diffs dan hashes owned files. Jika berubah selepas inventory, reconcile dengan owner sebelum move; jangan overwrite.
2. Resolve absolute paths dan containment dalam workspace, termasuk case-only collisions Windows. Setiap recursive move memerlukan target check dahulu. Gunakan native `Move-Item -LiteralPath`, tiada cross-shell deletion/move.
3. Record discovered test paths/names, routes, aliases, `import.meta.dir`, fixture cwd dan assets. `api/platform.ts`, `api/platform/[...path].ts`, worker entry serta `server/index.ts` kekal discovery entry.
4. Tulis **PLANNED** `tests/architecture/dependency-boundaries.test.ts`: client->server, shared->app/server, feature->app/feature internals, forbidden alias/re-export dan cycle semuanya ditolak; valid edges diterima.
5. Implement **PLANNED** `scripts/maintenance/check-boundaries.ts` dengan TypeScript resolver/AST yang memahami aliases/re-exports. `rg` bukan resolver lengkap. Existing TypeScript dependency digunakan dahulu; jangan tambah toolchain baru tanpa bukti keperluan.

```powershell
bun test ./tests/architecture/dependency-boundaries.test.ts
```

Red yang sah ialah behavioral assertion gagal kerana forbidden edge belum ditolak, kemudian green selepas checker. Missing-file invocation sahaja bukan TDD proof. Legacy exception memerlukan exact edge, owner, reason dan removal batch; jangan blanket allow source tree.

## 01.2 — Stage A: docs/media, exact map

Ikut full exact map structure design; ringkasan tetap:

| Current | Target |
|---|---|
| `docs/ABANGCOLEK-PLATFORM-ARCHITECTURE.md`, `docs/AI-AGENT-ARCHITECTURE.md` | `docs/architecture/`, basename sama |
| `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md`, `docs/AI-AGENT-ROADMAP.md` | `docs/product/`, basename sama |
| `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md` | `docs/architecture/`, basename sama |
| `docs/production-release.md`, `docs/design-qa.md` | `docs/runbooks/`, basename sama |
| `docs/handoffs/*` | `docs/handover/*`, per-file collision review |
| `outputs/` | `reports/external/outputs/`, intact asset/export tree |
| `manus-slides/` | `references/presentations/manus/`, intact tree |
| Product ZIP/extraction basenames dalam structure design exact map | `references/media/product-2026-10-17/`, basename sama |

`docs/ABANGCOLEK-SOURCE-OF-TRUTH.md` kekal stable entry. Root `index.tsx`, `index.css`, `metadata.json` hanya archive selepas repository-wide consumer verification. Active `index.html -> src/main.tsx` kekal.

Update maintained indexes/links dan actual consumers pada batch sama. Historical payload kekal dengan obsolete-path migration map; jangan rewrite transcript. Media reference bukan automatik public/Git approved. Stage gate: hash/count parity, intended link edits accounted for dan sibling export assets resolve. Jangan claim byte parity bagi fail yang memang diedit.

## 01.3 — Stage B: frontend shell dan HTTP client dahulu

| Existing source | Target/treatment tetap |
|---|---|
| `src/features/platform/AppRouter.tsx` | `src/app/router/app-router.tsx` |
| `src/features/platform/WorkspaceNavigation.tsx` | `src/app/layouts/workspace-navigation.tsx` |
| `src/features/platform/client.ts` | `src/lib/http/client.ts` |
| `src/features/workspaces/WorkspaceContent.tsx` | `src/app/router/workspace-content.tsx`, composition sahaja |
| `src/features/workspaces/CopilotWorkspace.tsx` | `src/features/copilot/copilot-workspace.tsx` |
| `src/features/workspaces/marketing.tsx` | `src/features/marketing/marketing-workspace.tsx` |
| `src/features/workspaces/commerce.tsx` | Map exports/callers dahulu, split storefront/orders/inventory/dealers |

Canonical HTTP/session client mendahului feature moves. Feature tidak import router untuk fetch. Pisahkan pure UI daripada business-aware components; business margin/pricing bukan generic formatter. Semak `src/services/*` per caller dan authority; legacy full app tidak dimount semula.

Run lint/build/checker dan **EXISTING** E2E `workspace-navigation.spec.ts`, `platform-shell.spec.ts`, `privacy-offline.spec.ts`, `platform-commerce.spec.ts` pada disposable QA. Expected navigation/auth/logout/deep links dan data values kekal; screenshot sahaja bukan proof session boundary.

## 01.4 — Stage C: server tanpa duplicate authority

Extract bootstrap/config/request adapters kepada `server/bootstrap/`, `server/http/app.ts`, `server/http/routes/` dahulu. `server/platform/app.ts` boleh menjadi facade sementara dengan consumers/removal phase dan satu implementation sahaja.

Fixed maps: `adkAgent.ts -> server/agents/copilot/agent.ts`; `freeModelRouter.ts -> server/agents/providers/model-router.ts`; `supabasePersistence.ts -> server/infrastructure/persistence/supabase-snapshot.ts`; backup files -> `server/infrastructure/backups/`; `marginGuardian.ts -> server/modules/marketing/margin-guardian.ts`; `loyalty.ts -> server/modules/loyalty/service.ts`.

Jangan blanket move `commerce.ts`, `dealers.ts`, `store.ts`, `whatsapp.ts`. Inventori methods/callers/transaction contexts; cross-domain checkout/refunds berpindah ke `server/application/` sambil mengekalkan satu transaction/CAS commit. Shared tidak menyimpan duplicate financial algorithms. 03A guards/fixes dipelihara; move commit tidak mengubah polisi kewangan.

**EXISTING** regression inputs: `backend-boundaries.test.ts`, `backend-domains.test.ts`, `dealer-commission-ledger.test.ts`, `loyalty-redemption.test.ts`, `supabase-persistence.test.ts`, `production-persistence.test.ts` serta tests03A baharu. Expected last-unit race satu allocation; refund failure rollback penuh; CAS failure tiada success; stream tiada temporary-store capture.

## 01.5 — Stage D: shared/tests/scripts dan facade removal

Move DTO kepada `shared/contracts/`, deliberately shared validators kepada `shared/validation/`; tiada dependency shared->src/server/storage/env. Group actual tests/scripts mengikut design. Jangan cipta mandatory empty layers.

**Update discovery globs dan scripts apabila tests berpindah.** Current `test:platform` memasukkan `tests/jev`, `tests/platform`, `tests/dashboard-model.test.ts`; future `tests/architecture`, `tests/copilot` dan existing `tests/frontend` memerlukan explicit commands/discovery. Test-name/path list old->new ialah evidence parity, count sahaja tidak cukup. Semua commands prompt berikut mesti resolve melalui move manifest.

Semak fixture/`import.meta.dir`/cwd, Linux casing, Vite/TS aliases, prerender/bundle/API discovery. Buang facade selepas zero consumers; reverse move hanya apabila tiada subsequent edit. Jika fail berubah, reconcile content, jangan overwrite.

## Commands, ARC-01 exit dan continuation

Commands **EXISTING scripts**, kecuali planned architecture test; gunakan mapped paths selepas move:

```powershell
bun run lint
bun run build
bun run test:platform
bun test ./tests/architecture/dependency-boundaries.test.ts
bun run test:e2e --list
bun run test:e2e tests/e2e/workspace-navigation.spec.ts tests/e2e/platform-shell.spec.ts tests/e2e/privacy-offline.spec.ts tests/e2e/platform-commerce.spec.ts
```

Expected exit0, discovery parity, zero introduced forbidden edges, semua paths/content accounted for dan public routes kekal. Baseline failures direkod berasingan, bukan disembunyikan. Independent code/architecture review menyemak manifest/config/transaction preservation sebelum owned commit jika authorized.

ARC-01 local/source evidence bukan production verification; preview/deployed routes dalam06. Collision/concurrent-edit block batch tepat; external model/Intelligence tiada tidak menghalang moves bebas. Checkpoint next: [02 foundation](02-copilot-foundation.md).
