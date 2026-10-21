# Repository Structure — Proposed Restructure

<!-- COMMERCE-GROWTH-20261021:BEGIN -->
> **Amendment 21 Oktober 2026 — TARGET_DESIGN:** Root blueprint/architecture/roadmap kekal canonical sehingga migration disahkan. Nested compatibility mirrors mesti disync dengan relative links apabila canonical berubah; jangan menyelenggara kontrak produk bebas. Reuse satu storefront/dealer domain dan canonical commerce authority; setiap dealer tidak memerlukan deploy/database/backend baharu.
>
> Rujukan: [spesifikasi canonical](commerce-growth.md) · [handover lengkap](../prompts/COMMERCE-GROWTH-HANDOVER-20261021.md). Generated acceptance kekal berasaskan ledger dan receipt, bukan nota ini.
<!-- COMMERCE-GROWTH-20261021:END -->


<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Kontrak sasaran kekal di bawah blueprint v2.4; scope reka bentuk dan keputusan tetap bukan bukti semua fungsi telah diimplementasi. Semak status per-ID dan environment sebelum mendakwa siap atau production-ready.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Date: 2026-10-19
Status: Target structure fixed for the execution prompts by ADR-0003. No source or assets moved by this design. [Execution contract](../decisions/0003-blueprint-v23-execution-contract.md) resolves choices; [master prompt](../prompts/IMPLEMENT-ABANGCOLEK.md) controls sequencing.

Research: [GitHub evidence and trade-offs](../research/2026-10-19-github-project-structure.md). Recommendation: one application with feature-oriented frontend and domain-oriented backend; migrate in independently verified stages. This document supersedes the initial docs-only target with a fuller destination below.

## Objective

Make application source, operational documentation, research exports and original media easy to locate. Preserve current behavior, local edits and source provenance. Do not combine repository organization with a framework migration or functional rewrite.

## Observed baseline

- Active browser entry: `index.html` -> `src/main.tsx`; Vite alias `@` -> `src`.
- Vercel function entries live in `api/`; business code lives in `server/` and contracts in `shared/`.
- Root contains original product ZIPs/extractions and Manus exports alongside application configuration.
- `outputs/` combines research, reviews, brand documents, screenshots, code examples and asset dependencies.
- `docs/handover/` and `docs/handoffs/` overlap.
- Historical documentation is already being relocated to `docs/archive/legacy-oct2026/`; tracked deletions and untracked destinations must be reconciled without undoing that work.
- Root `index.tsx` is a different sample application; the browser entry does not reference it. Its other consumers must be checked before archival.
- There are extensive uncommitted application changes. Preserve their exact contents; do not reset, clean, bulk-stage or commit unrelated work.

## Stage A: Documentation and reference cleanup

```text
api/                         Vercel-discovered entry points
src/                         Browser application
  components/                Existing shared and legacy components
  features/                  Existing product features
  services/                  Existing client integrations
  lib/                       Shared client helpers
  data/                      Client reference data
server/                      Server authority and integrations
  platform/                  Existing canonical domain services
  automation/                Existing automation boundaries
shared/                      Client/server contracts
tests/                       Existing unit, integration and E2E suites
scripts/                     Existing development and operational commands
supabase/                    Database SQL and platform configuration
public/                      Assets intentionally served to users
docs/
  README.md                  Documentation index
  architecture/              Platform and agent architecture
  product/                   Master blueprint and product roadmap
  runbooks/                  Release, recovery and operational procedures
  decisions/                 Existing architecture decisions
  handover/                  Consolidated continuity and handoff documents
  design/                    Design references and this structure specification
  research/                  Existing curated research
  archive/                   Historical documents and inactive samples
  superpowers/               Existing skill-managed plans/specs
reports/                     Dated findings and verification evidence
  external/                  Relocated outputs, preserving their internal paths
references/
  media/product-2026-10-17/   Original ZIPs and extracted product media
  presentations/manus/       Original Manus presentation exports
skills/                      Existing repository skills
var/                         Ignored runtime data and secrets
.work/                       Existing local working artifacts
```

## Exact first-batch mapping

| Current path | Proposed destination |
|---|---|
| `docs/ABANGCOLEK-PLATFORM-ARCHITECTURE.md` | `docs/architecture/ABANGCOLEK-PLATFORM-ARCHITECTURE.md` |
| `docs/AI-AGENT-ARCHITECTURE.md` | `docs/architecture/AI-AGENT-ARCHITECTURE.md` |
| `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md` | `docs/product/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md` |
| `docs/AI-AGENT-ROADMAP.md` | `docs/product/AI-AGENT-ROADMAP.md` |
| `docs/AI-PROVIDER-FREE-MODELS-REGISTER.md` | `docs/architecture/AI-PROVIDER-FREE-MODELS-REGISTER.md` |
| `docs/production-release.md` | `docs/runbooks/production-release.md` |
| `docs/design-qa.md` | `docs/runbooks/design-qa.md` |
| `docs/handoffs/*` | `docs/handover/*`, collision-checked |
| `outputs/` | `reports/external/outputs/`, as an intact tree |
| `manus-slides/` | `references/presentations/manus/`, as an intact tree |
| `PRODUCT LLH-20261017T020159Z-1-001.zip` | `references/media/product-2026-10-17/PRODUCT LLH-20261017T020159Z-1-001.zip` |
| `PRODUCT LLH-20261017T020159Z-1-001/` | Same basename under `references/media/product-2026-10-17/` |
| `Product Photo-20261017T020223Z-1-001.zip` | Same basename under `references/media/product-2026-10-17/` |
| `Product Photo-20261017T020223Z-1-001/` | Same basename under `references/media/product-2026-10-17/` |

Keep `docs/ABANGCOLEK-SOURCE-OF-TRUTH.md` as the stable authority entry point. Preserve root configuration, `JEV.md`, runtime storage, tool-managed directories, deployment entries and current source-module locations in this batch. Inventory root `index.tsx`, `index.css` and `metadata.json`; archive only if repository-wide consumer checks establish they are inactive.

## Why source modules remain in place during Stage A

The existing top-level source boundaries are coherent. Moving domain files and dozens of imports while unrelated feature work is dirty adds avoidable review ambiguity. This restructure first removes the actual root/document/export clutter. Any later split of `server/platform/` into domain modules needs a separate dependency map, coherent ownership and its own verification baseline.

## Stage B–D: Recommended application destination

This tree specifies ownership, not mandatory empty directories. Create a folder only when actual files move into it. Keep a single package manifest and existing build toolchain. Root `api/` remains the hosting entry point; do not conflate it with frontend API clients.

```text
src/
  main.tsx
  app/
    router/                   Router and route composition
    layouts/                  Founder/dealer/customer shells and navigation
    providers/                Session, theme and application-level providers
    styles/                   Global styles and tokens
  features/
    auth/
    onboarding/
    landing/
    storefront/               Browse, cart and checkout UI
    orders/                   Order management and tracking UI
    inventory/
    dealers/                  Dealer portal and commission views
    loyalty/
    marketing/
    operations/               QC, shifts and day-close
    collaboration/            Cases, tasks, documents and knowledge
    reports/
    settings/
    copilot/                  Chat, approval UI and generative cards
    jev/                      Evaluation and assessment UI
    automation/
    pet/                      Optional Copilot presentation and voice
  components/                 Product-independent UI and layout primitives
  lib/
    http/                     Canonical HTTP/session client
    format/                   Money/date presentation
  integrations/               Client-safe vendor integration code
  assets/                     Imported application assets
  legacy/                    Verified legacy callers during migration

server/
  index.ts                    Stable local launcher entry
  bootstrap/                  Composition, config and runtime identity
  http/
    app.ts                    Request handling and middleware composition
    routes/                   Thin request/response adapters by domain
    middleware/               Authentication, CSRF, request limits and errors
  application/
    checkout/                 Cross-domain checkout transaction orchestration
    refunds/                  Order/payment/commission/loyalty coordination
    onboarding/               Business setup coordination
    founder/                  Approved proposal execution
  modules/
    identity/
    catalogue/
    orders/
    inventory/
    payments/
    dealers/
    commissions/
    loyalty/
    marketing/                Includes margin guardian
    operations/
    collaboration/
    reports/
    settings/
    jev/
  agents/
    copilot/                  Orchestration and agent instructions
    providers/                Provider adapters, selection and cost policy
    tools/                    Authorized wrappers around application services
    approvals/                Proposal and execution lifecycle
    sessions/                 Agent conversation persistence when implemented
    evaluations/              Agent-specific regression fixtures/evaluation
  infrastructure/
    persistence/              SQLite store and Supabase CAS implementation
    evidence/                 Private files and evidence storage
    backups/                  Backup, restore and runtime-aware scheduling
    integrations/             WhatsApp, Google and other server transports
  automation/                 Existing job engine and automation definitions
  legacy/                     Explicitly isolated compatibility adapters

shared/
  contracts/                  Domain DTOs and protocol contracts
  validation/                 Only deliberately shared boundary validation
  constants/                  Pure shared constants and upload limits

tests/
  unit/                       Focused pure/domain tests
  integration/                HTTP, DB, persistence and cross-domain tests
  architecture/               Dependency and client/server boundary checks
  fixtures/                   Non-secret synthetic data and test helpers
  e2e/                        Browser journeys

scripts/
  dev/                        Local development and QA orchestration
  build/                      Build support and prerendering
  ops/                        Backup, recovery and deployment checks
  maintenance/                Import, migration and repository checks
```

An individual feature starts with a few explicit files, for example `orders-page.tsx`, `order-detail.tsx`, `orders-api.ts` and `orders-model.ts`. Add `components/`, `api/` or `hooks/` when enough real files justify them. An individual backend module starts with `service.ts` and any real `policy.ts` or `repository.ts` it needs. No mandatory five-layer template per small module.

### Dependency rules

- `src/app` composes features and shared frontend primitives. A feature does not import `src/app` or another feature's internals.
- `src/lib/http` owns the HTTP/session client. Features must not reach into a router feature to fetch data.
- Frontend imports only client-safe shared contracts. Backend classes, filesystem access and provider secrets stay server-side.
- `server/http` calls application workflows or authorized module queries; it does not own pricing or ledger calculations.
- `server/application` coordinates modules. Cross-domain mutations retain one transaction context; splitting files must not create separate commits.
- Modules depend on explicit capabilities/interfaces, pure shared contracts and their own rules. Infrastructure supplies storage/transports through composition.
- `server/agents/tools` uses the same application commands as human UI requests. Approval does not bypass domain authorization, versions or idempotency.
- Shared code cannot depend on `src`, `server`, storage SDKs or environment secrets.
- Prefer direct imports. Use a deliberate small module entry point only when it defines an actual contract; avoid broad re-export barrels.
- Enforce with a small repository checker or a narrowly chosen lint rule after checking current tooling. Record temporary legacy exceptions explicitly and require their removal as the corresponding batch migrates.

### Concrete source mapping

| Current source | Destination / treatment |
|---|---|
| `src/features/platform/AppRouter.tsx` | `src/app/router/app-router.tsx` |
| `src/features/platform/WorkspaceNavigation.tsx` | `src/app/layouts/workspace-navigation.tsx` |
| `src/features/platform/client.ts` | `src/lib/http/client.ts` |
| `src/features/workspaces/WorkspaceContent.tsx` | `src/app/router/workspace-content.tsx`, composition only |
| `src/features/workspaces/CopilotWorkspace.tsx` | `src/features/copilot/copilot-workspace.tsx` |
| `src/features/workspaces/marketing.tsx` | `src/features/marketing/marketing-workspace.tsx` |
| `src/features/workspaces/commerce.tsx` | Split exports into storefront/orders/inventory/dealers only after caller mapping |
| `src/features/workspaces/ui.tsx` | Split generic UI to `src/components/`; keep business-aware parts in their owning features |
| `src/features/workspaces/experience-model.ts` | Classify exports: pure formatting to lib, business-specific helpers to owning feature |
| `src/features/flows/` | Keep generic flow engine together; classify customer-cart separately; no blanket move |
| `server/platform/app.ts` | Extract bootstrap and route groups; retain compatibility path until callers migrate |
| `server/platform/store.ts` | Separate persistence implementation from reusable domain errors/validation; no blanket move |
| `server/platform/commerce.ts` | Inventory methods, callers and transaction boundaries before extracting modules |
| `server/platform/dealers.ts` | Separate dealer operations and commission rules without duplicating ledger authority |
| `server/platform/marginGuardian.ts` | `server/modules/marketing/margin-guardian.ts` |
| `server/platform/loyalty.ts` | `server/modules/loyalty/service.ts` |
| `server/platform/adkAgent.ts` | `server/agents/copilot/agent.ts`; framework identity remains an explicit integration decision |
| `server/platform/freeModelRouter.ts` | `server/agents/providers/model-router.ts` |
| `server/platform/supabasePersistence.ts` | `server/infrastructure/persistence/supabase-snapshot.ts` |
| `server/platform/backup.ts`, `backupScheduler.ts` | `server/infrastructure/backups/`, lifecycle preserved and reviewed |
| `server/platform/whatsapp.ts` | Split transport to infrastructure and notification policy to its owner only after method-level audit |
| `shared/*-contracts.ts` | `shared/contracts/`, preserve exports/types and update all consumers |
| `src/services/*` | Classify caller and authority; active integration to `src/integrations/`, legacy compatibility to `src/legacy/` |

### Transitional contracts and naming

- Retain `api/platform.ts`, `api/platform/[...path].ts`, worker discovery and `server/index.ts` during early stages. Internal imports can change without altering public URLs.
- Preserve case-sensitive path correctness for Linux/Vercel. Use kebab-case for newly organized module filenames; exported components/classes retain PascalCase.
- For case-only renames on Windows, use a collision-checked temporary name and verify Git sees the correct final casing.
- Compatibility re-exports are short-lived, explicitly listed and removed after consumers migrate. They do not become a second implementation.
- A source move is not evidence that old adapters are safe, enabled or production-connected.
- Never relocate live database, private evidence, credentials, browser profiles or tool-managed directories during this restructure.

### Migration stages

| Stage | Deliverable | Exit evidence |
|---|---|---|
| A | Docs/media cleanup from exact map above | Hash/count parity, maintained links, dependency consumers checked |
| B | Frontend shell, HTTP client and low-coupling features | Typecheck/build, architecture checks, navigation/auth/feature E2E |
| C | Server bootstrap, infrastructure, agents and domain extractions | Integration tests; last-stock race, refund/loyalty/commission rollback and CAS conflict checks |
| D | Shared contracts, test/script grouping and removal of temporary facades | Test discovery parity, scripts/import.meta.dir paths, Vercel preview and runtime evidence |

Each stage needs its own reviewed move manifest and baseline. Tests/contracts may migrate earlier where needed to keep a stage coherent. Moving a file and rewriting its financial behavior are separate changes. No broad functional rewrite is included.

### Hosting and deployment constraints

- Folder restructure does not alter the chosen persistence authority or migrate schema.
- Keep root Vite/Vercel/TypeScript/package configuration at their discovery locations unless a separately verified config change is needed.
- Recalculate paths based on `import.meta.dir`, fixture locations, process working directories and emitted assets after script/test moves.
- Validate cloud CAS commit-before-response behavior and local transaction rollback after server extraction; do not weaken guards to make tests pass.
- A backup folder or four-hour timer does not establish cloud RPO. Runtime lifecycle and recovery evidence remain separate requirements.
- Raw reference media placement does not automatically make it safe to publish. Check existing Git tracking, size and privacy before staging; serve only approved product assets from `public/`.

### Required architecture verification

Add behavioral architecture checks for forbidden edges, dependency cycles and accidental server imports into the client. Use a dependency parser/resolver compatible with TypeScript aliases and re-exports rather than treating a plain-text search as complete proof. Keep an explicit baseline for legacy cycles and remove it as modules migrate.

Before moving existing tests, record discovered test paths/counts and inspect test-config patterns. After moving, compare discovery and run the same applicable suite. Generated artifacts do not count as test discovery evidence. Review source references in fixtures and scripts as well as imports.

Review target-file ownership and final diff independently. Release evidence must include a preview build and critical browser journeys before the restructure is called production-verified.

## Execution and verification

1. Capture Git status, current commit, path inventory and file hashes before moves. Check for concurrent changes before each batch.
2. Record baseline typecheck/build results before application-adjacent edits; do not attribute pre-existing failures to moves.
3. Resolve every source and destination to an absolute path within this repository; reject collisions. Move with native PowerShell literal paths, preserving exact bytes.
4. Update maintained Markdown links, root README, documentation index and any verified script/config consumers. Keep historical transcripts immutable; record their obsolete paths in a migration map.
5. Preserve complete export trees so sibling assets and standalone examples keep their relative paths. Check references that escape those trees.
6. Verify pre/post hashes and counts for moved files. Check maintained links, import/config consumers and stale old-path references. Confirm no secret or runtime directory entered source assets.
7. Run typecheck and build. Run relevant platform tests if any executable consumer changed. Report baseline failures separately from regressions.
8. Obtain independent review of the final move map and diff before any commit. Do not stage or publish unrelated user changes.

## Acceptance

- Product ZIPs/extractions and presentation exports no longer clutter the root.
- Documentation has one handover directory and navigable category indexes.
- Application entry points and deployment paths still resolve.
- Every moved file is accounted for; content changes are restricted to intended references/indexes.
- Existing user changes and runtime data are preserved.
- Verification results and any unresolved historical links are documented honestly.

## Scope boundary

This design is repository organization. It does not finalize the growth blueprint, fix Copilot behavior, rotate credentials, migrate data or certify production readiness.
