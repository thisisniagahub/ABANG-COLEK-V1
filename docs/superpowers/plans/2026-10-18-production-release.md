
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PELAN / PROMPT LAMA — superseded sebagai arahan execution oleh prompt pelaksanaan canonical di bawah. Checkbox, command, model, path runtime dan keputusan reka bentuk lama dikekalkan untuk provenance; jangan jalankan secara literal. Baseline, migrasi dan bukti semasa mesti ditentukan oleh blueprint dan prompt canonical.
>
> Rujukan semasa: [Master Growth Blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# ABANGCOLEK production release implementation plan

> Execute the authorized repair, verification and main-branch push continuously. Independent startup/integration and cart work may be delegated; run one whole-change security/code review before commit.

**Goal:** publish the approved favicon and reviewed customer-commerce changes, fix verified release defects, trigger the existing Vercel Git integration, and verify the resulting production deployment without claiming unavailable integrations work.

**Specification:** the user's instruction to push main, ensure functionality and Vercel autodeploy, constrained by the verified startup crash, missing production API and GitHub billing blockage documented in `reports/ui-ux/2026-10-18/PRODUCTION_DIAGNOSIS.md`.

**Architecture:** preserve the React/Vite frontend and canonical Bun/SQLite domain API. The user selected Supabase for production persistence. Run canonical domain code in Vercel Bun functions with isolated request-local SQLite hydrated from a private Supabase snapshot, CAS commits and private evidence storage. This bounded compatibility backend is documented in docs/production-release.md. Missing configuration fails closed; never inject fake production keys or records, import local business data implicitly, or discard the operational database.

## Scope and constraints

- Work in the existing checkout on main so reviewed uncommitted cart changes are retained; no clone/reinstall/new database or unrelated cleanup.
- Preserve the running local server and business database. Browser acceptance uses the existing QA fixture harness on separate ports and an isolated database.
- Include favicon, reviewed cart/flow source/tests, startup fixes, deployment wiring and current release instructions. Do not stage `.manus`, ZIP/media imports, screenshots, old audit dumps or unrelated deletions.
- Never print/publish credentials. Missing external credentials/hosting/billing are explicit blockers, not reasons to fabricate successful receipts or disable configured providers.
- User has explicitly authorized the final commit, push to main and deployment; no repeat approval required.

## Plan

1. **Inventory and remote checks:** verify Git HEAD/upstream, targeted dirty files, existing Vercel integration, current workflow/check status and authenticated access. Ask for missing Vercel session/backend URL while continuing independent local repairs.
2. **Startup/integration fix (TDD):** add tests for missing/invalid Supabase config and unavailable executor behavior; implement a guarded real client/accessor, visible login fallback and safe legacy consumers without fake rows. Preserve configured OAuth and explicit failures.
3. **Cart/flow fixes (TDD):** pin stale-stock/pack recovery, removal, pagination selection retention and quote refresh behavior; fix the reviewed commerce changes without redesigning unrelated pages.
4. **Production wiring:** confirm current Vercel runtime/CLI docs; correct team/project workflow targeting, add canonical Bun API functions and the user-selected Supabase persistence adapter. Apply reviewed service-only SQL to the confirmed project and configure server-only environment; never use ephemeral SQLite as authority.
5. **Validation:** run strict TypeScript/lint, complete platform tests, brand/config/cart tests, production build without placeholder keys, and browser acceptance against isolated QA. Investigate failures with root-cause evidence; rerun affected and final gates after fixes.
6. **Review and commit:** fresh security/TypeScript review of final diff, secret/data scan of explicitly staged paths, `git diff --check`, atomic Conventional Commit(s), then non-force `git push origin main` after reconciling upstream.
7. **Deployment verification:** poll GitHub commit/Vercel deployment status, test served HTML/favicon/assets, browser startup, JSON API/session/catalogue and core routes. Record exact commit/deployment and any unresolved external blocker; do not equate Ready or root HTTP 200 with full functionality.

## Completion criteria

- No missing-key import crash; real integrations either work with verified config or show truthful unavailable state.
- Cart can recover from stale stock/pack and quotes; selections survive pagination.
- All relevant local checks pass on final source; explicit staged files only are pushed.
- Vercel autodeploy is observed for the pushed SHA and production smoke checks pass. If access, hosting or billing prevents this, report the concrete failed gate and the work actually delivered; do not claim fully functional production.

## Whole-backend security follow-up
1. Add regression coverage for customer access to business pilots, honest unavailable Workspace execution, and byte-exact signed webhooks without browser Origin.
2. Gate business logistics and founder proposals at canonical HTTP authorization; preserve manual logistics records and repair status route matching.
3. Remove invented Workspace completion receipts, validate consent scopes, and process only configured signed webhook bodies before the browser Origin gate.
4. Run focused backend tests and platform typecheck, then request independent review before release.

## Dependency advisory follow-up
The repository-wide audit found three advisories across two transitive packages. Verify patched registry versions against the published advisories, add exact dependency overrides for `@grpc/grpc-js` and `source-map-js`, and refresh only the lockfile/install resolution without deleting existing dependencies. Re-run `bun audit`, strict typechecks and the production build; distinguish installed advisory exposure from a proven reachable production exploit.

## Public build snapshot source
Add a separately tested source helper that loads the authoritative Supabase snapshot when server credentials are configured, opens its temporary SQLite copy read-only, and always removes the temporary directory. Preserve the existing local build source when no cloud configuration is provided. Partial configuration and failed cloud reads fail the build rather than silently publishing an empty or stale local catalogue. Keep the existing published-only projection and test cleanup, missing snapshots, local behavior and failure boundaries before integrating the helper.

## Onboarding and migration integrity follow-up
- Reject malformed/nonnumeric onboarding packets before writes; bind each packet to a durable replay receipt, reject existing SKU replacement and ambiguous opening stock across multiple products.
- Persist imported order hashes with migration receipts. Rollback requires exact unchanged imported bytes and no subsequently linked operational records, otherwise fail closed without deleting records.
- Test invalid numbers, stock replay, changed product conflict and linked/changed rollback rejection before implementation.
