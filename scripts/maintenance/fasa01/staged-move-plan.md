# Fasa 01 — staged restructure plan (PLANNED, NOT EXECUTED)

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../../docs/CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

**Status: nothing in this document has been executed.** No file has been moved, renamed, copied,
deleted or modified. Two things block execution:

1. `server/platform/**` is an **active lane** — the module files are being rewritten right now. A
   move over an in-flight edit corrupts the other writer's work and the move manifest.
2. The product media relocation touches **gitignored binary assets** (1.25 GB). It needs a scheduled
   write window with no other writer active, and it needs the hash manifest to be taken *inside*
   that window.

The plan below is the evidence a later write window executes against.

Artifacts:

| Artifact | Purpose |
|---|---|
| `scripts/maintenance/fasa01/fasa01-move-manifest.json` | Machine-readable mapping: old/new path, SHA-256 before, operation, owner, **complete consumer list**, verification commands, rollback condition. |
| `scripts/maintenance/fasa01/product-media-sha256.manifest.json` | SHA-256 of every product media file and archive, plus the target path each one will occupy. |
| `scripts/maintenance/fasa01/build-move-plan.ts` | Regenerates the move manifest (read-only). |
| `scripts/maintenance/fasa01/build-media-manifest.ts` | Regenerates the media manifest (read-only). |

Regenerate both with:

```powershell
bun scripts/maintenance/fasa01/build-move-plan.ts
bun scripts/maintenance/fasa01/build-media-manifest.ts
```

---

## Stage A.1 — product media relocation

### Current state (read-only, verified)

```
PRODUCT LLH-20261017T020159Z-1-001/        231 files
Product Photo-20261017T020223Z-1-001/       15 files
PRODUCT LLH-20261017T020159Z-1-001.zip      595,183,102 bytes
Product Photo-20261017T020223Z-1-001.zip    32,406,085 bytes
                                     total 246 media files + 2 archives = 248 entries
                                             1,255,215,815 bytes
```

The execution brief describes "246 files + one large `.zip`". The repository actually holds **two**
archives: a 595 MB `PRODUCT LLH-…zip` and a 32 MB `Product Photo-…zip`. Both are hashed.

### Target

Every entry moves under `references/media/product-2026-10-17/`, keeping its basename and its
internal tree:

```
PRODUCT LLH-20261017T020159Z-1-001/  ->  references/media/product-2026-10-17/PRODUCT LLH-20261017T020159Z-1-001/
Product Photo-20261017T020223Z-1-001/ ->  references/media/product-2026-10-17/Product Photo-20261017T020223Z-1-001/
PRODUCT LLH-20261017T020159Z-1-001.zip -> references/media/product-2026-10-17/PRODUCT LLH-20261017T020159Z-1-001.zip
Product Photo-20261017T020223Z-1-001.zip -> references/media/product-2026-10-17/Product Photo-20261017T020223Z-1-001.zip
```

### Provenance — this is the part that changes the evidence story

The media paths are **gitignored**, verified with `git check-ignore -v`:

```
.gitignore:41:PRODUCT LLH-*/        PRODUCT LLH-20261017T020159Z-1-001
.gitignore:42:Product Photo-*/      Product Photo-20261017T020223Z-1-001
.gitignore:18:*.zip                 PRODUCT LLH-20261017T020159Z-1-001.zip
```

**A relocation of these paths produces no git history at all** — no rename detection, no blob
continuity, nothing a reviewer can diff. For gitignored paths the **SHA-256 manifest IS the
provenance**. `scripts/maintenance/fasa01/product-media-sha256.manifest.json` records, per entry:
source path, target path, byte length and SHA-256. That file is the evidence artefact, and it is
the only evidence artefact these paths can have.

> Correction to the brief: `docs/archive/legacy-oct2026/` is **not** gitignored. All 20 files there
> are tracked by git (`git ls-files docs/archive/legacy-oct2026` lists every one). A move of that
> directory therefore *does* have git provenance, and the SHA-256 manifest is a secondary check
> there, not the primary one. Only the media loses git provenance.

### Representative manifest sample

```
PRODUCT LLH-20261017T020159Z-1-001/PRODUCT LLH/._.DS_Store            4096  f81c4f284d788ce9f4bdd1a03833cbe57fd1f9cae7c6c5218bffe321e107e711
PRODUCT LLH-20261017T020159Z-1-001/PRODUCT LLH/.DS_Store               8196  6377791f8782f947c04d7533e6cc09747d3d39621381004f61512fb565869b2d
PRODUCT LLH-20261017T020159Z-1-001/PRODUCT LLH/1111.jpg               136953  e197b98592181c81ff70632c90edbb3ad3f5c64d90d89cd319a399793a924825
PRODUCT LLH-20261017T020159Z-1-001/PRODUCT LLH/222.jpg                136751  05c20cbf993ab9914380553ddd5e97e27653c8511d8cdb30a47d35f0dbc1cb47
PRODUCT LLH-20261017T020159Z-1-001/PRODUCT LLH/3333.jpg               285276  1cda647c55e537f75bb512444f3822dece6096b7d23c16717bd86e33c1278207
PRODUCT LLH-20261017T020159Z-1-001/PRODUCT LLH/ASAM BOI/APPLE.png      59261  853eafbb9393e4894eae43d4304eca504b9ec4e8344f429c84ab0034d5daad20
PRODUCT LLH-20261017T020159Z-1-001.zip                            595183102  9f73a950d04ad7773ff6249944f90fca2d6f045c467bcfd2499bc0062e5f7d13
Product Photo-20261017T020223Z-1-001.zip                           32406085  5d8d1f78a31bb9a390c6cbdd8a46c74fad31f86ed411b20e64501b8192ce1dd9
```

### Execution and verification (inside the write window)

```powershell
# 1. BEFORE the move — take the baseline
bun scripts/maintenance/fasa01/build-media-manifest.ts --out .work/media-before.json

# 2. Move with native PowerShell literal paths, no cross-shell deletion
New-Item -ItemType Directory -Path "references/media/product-2026-10-17" -Force
Move-Item -LiteralPath "PRODUCT LLH-20261017T020159Z-1-001"      -Destination "references/media/product-2026-10-17/"
Move-Item -LiteralPath "Product Photo-20261017T020223Z-1-001"    -Destination "references/media/product-2026-10-17/"
Move-Item -LiteralPath "PRODUCT LLH-20261017T020159Z-1-001.zip"  -Destination "references/media/product-2026-10-17/"
Move-Item -LiteralPath "Product Photo-20261017T020223Z-1-001.zip" -Destination "references/media/product-2026-10-17/"

# 3. AFTER the move — re-hash and compare entry by entry
bun scripts/maintenance/fasa01/build-media-manifest.ts --out .work/media-after.json
```

Byte-for-byte parity is established by comparing `entries[]` of the two manifests: same count (248),
same `bytes`, same `sha256`, with `targetPath` of the "after" manifest equal to the `sourcePath` of
the "before" manifest.

**Rollback:** move the two directories and two archives back to the repository root. The manifest
proves the bytes are unchanged in either direction.

**Safety note:** the media is reference material, not application assets. Nothing under `src/`,
`public/` or `server/` imports it, so the relocation cannot change runtime behaviour. It must not be
staged into git without a separate privacy/size review (the design document is explicit: raw
reference media placement does not automatically make it safe to publish).

---

## Stage A.2 — documentation consolidation

### Current state (verified)

The Stage A documentation destinations **already exist as byte-identical copies**, while the tracked
source files are still present at `docs/` root. The move is therefore half-executed: the copy landed,
the removal did not.

| Source (tracked) | Destination (currently untracked copy) | SHA-256 parity |
|---|---|---|
| `docs/ABANGCOLEK-PLATFORM-ARCHITECTURE.md` | `docs/architecture/ABANGCOLEK-PLATFORM-ARCHITECTURE.md` | identical |
| `docs/AI-AGENT-ARCHITECTURE.md` | `docs/architecture/AI-AGENT-ARCHITECTURE.md` | identical |
| `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md` | `docs/architecture/AI-PROVIDER-FREE-MODELS-REGISTER.md` | identical |
| `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md` | `docs/product/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md` | identical |
| `docs/AI-AGENT-ROADMAP.md` | `docs/product/AI-AGENT-ROADMAP.md` | identical |
| `docs/production-release.md` | `docs/runbooks/production-release.md` | identical |
| `docs/design-qa.md` | `docs/runbooks/design-qa.md` | identical |

Remaining work in this batch:

1. **Remove the tracked root originals** in the same batch that stages the destination copies, so the
   repository never carries two live copies of the same document. Each row's SHA-256 is recorded in
   `fasa01-move-manifest.json` under `docs[]`.
2. **Update maintained links and the documentation index** (`docs/README.md`, root `README.md`) in the
   same batch. The documents themselves are historical payload — do not rewrite them; record the
   obsolete-path migration map instead.
3. `docs/ABANGCOLEK-SOURCE-OF-TRUTH.md` stays at `docs/` root as the stable authority entry point.
4. `docs/runbooks/credential-revocation-audit.md` and `docs/runbooks/platform-recovery.md` already live
   in the target directory and are untouched.

### `docs/handoffs/` vs `docs/handover/` overlap

| `docs/handoffs/` (tracked, 2 files) | Target |
|---|---|
| `2026-10-18-continuation-prompt.md` | `docs/handover/2026-10-18-continuation-prompt.md` |
| `2026-10-19-blueprint-finalization-review.md` | `docs/handover/2026-10-19-blueprint-finalization-review.md` |

`docs/handover/` already holds 8 files (`AGENT-HANDOVER-A-Z.md`, `AGY-MASTER-IMPLEMENTATION-PROMPT.md`,
`CAPABILITY-MATRIX.md`, `COPILOT-DEPENDENCY-REQUESTS.md`, `COPILOT-FRONTEND-HANDOFF.md`,
`IMPLEMENTATION-CHECKPOINT.md`, `MARKDOWN-ALIGNMENT-REGISTER.md`, `MARKDOWN-INVENTORY-20261019.md`).
**There is no basename collision** between the two directories, so the consolidation is a plain
per-file move — no merge, no rename, no content rewrite. `docs/handoffs/` then disappears and the
repository has exactly one handover directory.

Note the near-duplicate name `docs/handover/AGY-MASTER-IMPLEMENTATION-PROMPT.md` versus the archived
`docs/archive/legacy-oct2026/AGY-MASTER-IMPLEMENTATION-PROMPT-20261019.md`. They are different
documents (one dated, one live) and the archive copy stays archived.

### `docs/archive/legacy-oct2026/` contents

20 tracked files, already in their target location. Contents:

```
ABANGCOLEK_DISCOVERY_AND_PLAN.md                              ABANGCOLEK_OS_UPGRADE_BLUEPRINT.md
ABANGCOLEK-PLATFORM-STATUS-2026-10-16.md                      AGY-MASTER-IMPLEMENTATION-PROMPT-20261019.md
AUDIT_TERPERINCI_KESELURUHAN_PROJEK_ABANGCOLEK_OS.md          AUDIT_TERPERINCI_REPO_ABANG_COLEK_ECOSYSTEM.md
CADANGAN_PENAMBAHBAIKAN_DAN_TEMA_LOGO_ABANGCOLEK.md           CARA_PENGOPERASIAN_SEPATUTNYA_ABANGCOLEK_OS.md
FORENSIK_AUDIT_LENGKAP_REPO_ABANG_COLEK.md                    JEV_ARCH.md
JEV_ECOSYSTEM_AUDIT_REPORT.md                                 KATALOG_DAN_PANDUAN_SKILL_EJEN_AI.md
KEDUDUKAN_DAN_ARKITEKTUR_JEV_DALAM_PROJEK.md                  PANDUAN_COMMAND_PALETTE.md
PANDUAN_DAN_PEMASANGAN_SUPERPOWERS_DAN_JEV_SKILLS.md          PROFILE_59_ATTESTATION.md
PROJECT-ALIGNMENT-BACKLOG.md                                  REVIEW_HERMES_AGENT_DAN_DEEPSEEK_JEV_MERGE.md
REVIEW-2026-10-16.md                                          STITCH_ABANGCOLEK_SPEC.md
```

No move is required for this directory. It is already at its destination and, unlike the media, it is
**tracked by git**, so it keeps normal git provenance.

### Documentation cleanup not covered by the exact map

`docs/# Respond to greeting.txt` is an untracked stray file at the documentation root. It should be
removed (or archived) in the same documentation batch; it is not part of any index.

---

## Stage C — `server/platform/*` → `server/modules/*` (and the rest of the target server tree)

`server/platform/` currently holds **38 files** with **424 import edges** pointing at them. The
complete per-file consumer list (every importer, source and test) is in
`scripts/maintenance/fasa01/fasa01-move-manifest.json` under `server[].consumers`.

### Mapping

| Current | Proposed destination | Operation | Status | Consumers |
|---|---|---|---|---|
| `server/platform/app.ts` | `server/http/app.ts` | extract-and-facade | fixed-by-design | 35 |
| `server/platform/store.ts` | `server/infrastructure/persistence/store.ts` | split | fixed-by-design | 100 |
| `server/platform/commerce.ts` | `server/modules/{catalogue,orders,inventory,payments}/service.ts` | split | fixed-by-design | 45 |
| `server/platform/dealers.ts` | `server/modules/{dealers,commissions}/service.ts` | split | fixed-by-design | 13 |
| `server/platform/whatsapp.ts` | `server/infrastructure/integrations/whatsapp-transport.ts` | split | fixed-by-design | 3 |
| `server/platform/marginGuardian.ts` | `server/modules/marketing/margin-guardian.ts` | rename | fixed-by-design | 6 |
| `server/platform/loyalty.ts` | `server/modules/loyalty/service.ts` | rename | fixed-by-design | 24 |
| `server/platform/adkAgent.ts` | `server/agents/copilot/agent.ts` | rename | fixed-by-design | 3 |
| `server/platform/freeModelRouter.ts` | `server/agents/providers/model-router.ts` | rename | fixed-by-design | 5 |
| `server/platform/supabasePersistence.ts` | `server/infrastructure/persistence/supabase-snapshot.ts` | rename | fixed-by-design | 5 |
| `server/platform/backup.ts` | `server/infrastructure/backups/backup.ts` | rename | fixed-by-design | 3 |
| `server/platform/backupScheduler.ts` | `server/infrastructure/backups/scheduler.ts` | rename | fixed-by-design | 2 |
| `server/platform/mcp/operationsBrief.ts` | `server/agents/mcp/operations-brief.ts` | rename | proposed | 3 |
| `server/platform/auth.ts` | `server/modules/identity/service.ts` | rename | proposed | 68 |
| `server/platform/googleIdentity.ts` | `server/modules/identity/google-identity.ts` | rename | proposed | 4 |
| `server/platform/domainTools.ts` | `server/agents/tools/domain-tool-definitions.ts` | rename | proposed | 12 |
| `server/platform/evidenceFiles.ts` | `server/infrastructure/evidence/service.ts` | rename | proposed | 5 |
| `server/platform/assetBundle.ts` | `server/infrastructure/evidence/asset-bundle.ts` | rename | proposed | 1 |
| `server/platform/hostedResponse.ts` | `server/http/hosted-response.ts` | rename | proposed | 2 |
| `server/platform/flows.ts` | `server/modules/operations/flows.ts` | rename | proposed | 2 |
| `server/platform/founder-intelligence.ts` | `server/modules/collaboration/founder-intelligence.ts` | rename | proposed | 1 |
| `server/platform/legacyAi.ts` | `server/legacy/legacy-ai.ts` | rename | proposed | 1 |
| `server/platform/legacyPilots.ts` | `server/modules/collaboration/legacy-pilots.ts` | rename | proposed | 3 |
| `server/platform/marketing.ts` | `server/modules/marketing/service.ts` | rename | proposed | 6 |
| `server/platform/onboarding.ts` | `server/application/onboarding/service.ts` | rename | proposed | 3 |
| `server/platform/operationalAmendments.ts` | `server/modules/operations/operational-amendments.ts` | rename | proposed | 2 |
| `server/platform/operations.ts` | `server/modules/operations/service.ts` | rename | proposed | 8 |
| `server/platform/paymentReconciliation.ts` | `server/modules/payments/reconciliation.ts` | rename | proposed | 6 |
| `server/platform/reports.ts` | `server/modules/reports/service.ts` | rename | proposed | 3 |
| `server/platform/runtimeControls.ts` | `server/modules/settings/runtime-controls.ts` | rename | proposed | 2 |
| `server/platform/social.ts` | `server/modules/marketing/social-connections.ts` | rename | proposed | 1 |
| `server/platform/work.ts` | `server/modules/collaboration/service.ts` | rename | proposed | 24 |
| `server/platform/jev/assessment.ts` | `server/modules/jev/assessment.ts` | rename | proposed | 10 |
| `server/platform/jev/evaluations.ts` | `server/modules/jev/evaluations.ts` | rename | proposed | 3 |
| `server/platform/jev/policyEngine.ts` | `server/modules/jev/policy-engine.ts` | rename | proposed | 2 |
| `server/platform/jev/questionRegistry.ts` | `server/modules/jev/question-registry.ts` | rename | proposed | 3 |
| `server/platform/migration/legacyMaps.ts` | `server/modules/settings/migration/legacy-maps.ts` | rename | proposed | 2 |
| `server/platform/migration/migrationReconciler.ts` | `server/modules/settings/migration/reconciler.ts` | rename | proposed | 3 |

`fixed-by-design` rows are quoted verbatim from `docs/design/repository-structure.md`
("Concrete source mapping") and `docs/prompts/01-structure.md` section 01.4. `proposed` rows are this
plan's proposals; 01-structure.md section 01.4 explicitly requires the method/caller/transaction
inventory to happen **before** those moves, and that inventory has not been performed.

### Batch order (dependency-driven, not alphabetical)

| Batch | Content | Rationale |
|---|---|---|
| **C1** | `assetBundle`, `hostedResponse`, `legacyAi`, `social`, `founder-intelligence`, `runtimeControls`, `legacyPilots`, `jev/policyEngine`, `jev/questionRegistry`, `migration/legacyMaps` | ≤ 3 consumers each, almost all of them `app.ts`. Leaf moves with no fan-out. |
| **C2** | `flows`, `operationalAmendments`, `reports`, `marketing`, `onboarding`, `operations`, `paymentReconciliation`, `work`, `googleIdentity`, `evidenceFiles`, `mcp/operationsBrief`, `jev/evaluations`, `jev/assessment`, `migration/migrationReconciler` | Domain services whose consumers are inside the platform plus the agent lanes. |
| **C3** | `marginGuardian`, `loyalty`, `dealers`, `whatsapp`, `backup`, `backupScheduler`, `supabasePersistence`, `freeModelRouter`, `adkAgent`, `domainTools` | Fixed-map rows that land in other target roots (`server/agents`, `server/infrastructure`). `server/agents/**` is another writer's lane — sequence after it lands. |
| **C4** | `commerce`, `store`, `auth` | The three heavy fan-in files (45, 100 and 68 consumers). `store.ts` carries `DomainError`/`fail`/`id`/`now` — those must land in exactly one shared place, not two. |
| **C5** | `app.ts` → `server/http/app.ts` + `server/bootstrap/` + `server/http/routes/` | The facade move. **This is the batch that breaks the module-interface cycle** (see below). |
| **C6** | remove the temporary facade once it has zero consumers | Per the design: "Buang facade selepas zero consumers". |

### The module-interface cycle this plan must break

The module-interface graph currently contains exactly one cycle:

```
server/platform  ->  server/automation  ->  server/platform
```

Evidence (from the boundary checker, `FORBIDDEN_MODULE_CYCLE`):

```
server/platform/app.ts        -> ../automation/jobs          (server/platform -> server/automation)
server/platform/app.ts        -> ../automation/definitions
server/platform/app.ts        -> ../automation/automation
server/platform/app.ts        -> ../automation/adapters
server/automation/adapters.ts -> ../platform/store           (server/automation -> server/platform)
server/automation/automation.ts -> ../platform/auth
server/automation/automation.ts -> ../platform/commerce
server/automation/automation.ts -> ../platform/marketing
```

It is registered in `LEGACY_CYCLE_BASELINE` in `scripts/maintenance/check-boundaries.ts` with owner
`server-structure-team` and removal batch `01C` (Fasa 01 Stage C). Batch C5 breaks it: once
`app.ts` becomes `server/http/app.ts` and the HTTP/bootstrap composition moves out of the platform
module, the platform module no longer calls back into automation, and the SCC disappears. The
checker will then report `STALE_REGISTERED_CYCLE` and the baseline entry must be retired in the same
commit — the checker tells you when.

### Verification per batch

```powershell
bun run lint
bun run build
bun run test:platform
bun test ./tests/architecture
bun run test:e2e --list
```

Regression inputs that must stay green (from 01-structure.md section 01.4):
`backend-boundaries.test.ts`, `backend-domains.test.ts`, `dealer-commission-ledger.test.ts`,
`loyalty-redemption.test.ts`, `supabase-persistence.test.ts`, `production-persistence.test.ts`.

Expected invariants: last-stock race resolves to one allocation, a failed refund rolls back fully, a
CAS failure produces no success, and no stream writes to the temporary store.

### Rollback

Every `rename` row records `sha256Before` and `sha256AfterExpected` (identical for a pure rename).
Rollback is: move the file back, restore the recorded import specifiers, and re-verify with the
commands above. `split` and `extract-and-facade` rows record `sha256AfterExpected: null` on purpose —
**no byte parity is claimed for a file that was rewritten**, and the rollback for those rows is
"restore from git and re-point the consumers listed in the manifest".

---

## What was deliberately NOT done

| Not done | Why |
|---|---|
| Moving `server/platform/**` | The lane is active; the files are being rewritten right now. |
| Moving the product media | Needs a scheduled write window; the brief says it has not been scheduled yet. |
| Moving `docs/**` | `docs/**` is owned by the orchestrator; the copies are already staged, only the tracked source removal and link updates remain. |
| Extracting the JEV evaluator to `shared/` | `src/**` and `server/**` belong to other writers. The two client-side exceptions were re-based onto Fasa 01 Stage D (`01D`) instead, with an owner and a real reason. |
| Adding a constant/provenance guard for the copilot surface | `server/platform/**` is another writer's lane. The boundary guard that is mine is in `tests/architecture/`. |
