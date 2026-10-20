# Current Documentation Alignment Implementation Plan

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **For agentic workers:** Use executing-plans inline. The user stopped background implementation agents; do not restart AGY/Kilo/Copilot/Hermes sessions. A bounded read-only review may check the final documentation changes.

**Goal:** Align every project-owned Markdown document with the measured main release, current executor and outstanding implementation requirements without rewriting vendor instructions or historical evidence.

**Architecture:** One current-status document records dated observations and links to receipts. Checklist and acceptance tables derive their displayed states from the existing ledger, explicitly distinguishing recorded local labels from current production certification. Active guides receive content corrections; dated evidence receives supersession context and retains its original observations.

**Tech stack:** Existing Markdown, Bun maintenance commands, local file hashes and path/fence validation. No application dependency, schema, runtime, inference or deployment change is required by this documentation task.

**Spec:** User request to update all project Markdown; blueprint v2.4 remains the target architecture.

## Constraints and review focus

- Main is `18c69b32deb7acbd5134da6dea548823a041a614`; only the eleven-file TypeScript/configuration patch was released. Vercel production deployment `dpl_PYt7aW43nmPKT5Q6rkpqMaxG1KcC` is READY for that SHA.
- Measured main checks: lint/build pass, 305 platform tests, 16 local browser tests and 8 public production browser tests pass. GitHub jobs did not start because the account is locked due to billing. These checks do not certify the unreleased Copilot implementation.
- Ledger snapshot records 38 verified_local, 37 implemented_unverified, 9 blocked_external and 1 not_run across 85 rows (EXT-03 and EXT-06 were re-tiered from verified_local to blocked_external on 2026-10-20 to match their own activation decisions). Preserve the snapshot provenance and do not promote it to fresh production acceptance.
- Preserve blueprint decisions and external gates. Payment rows include local unfinished callback work as well as external activation gates.
- Preserve skill/vendor bytes, private session transcripts, generated caches and agent coordination records. Inventory these exclusions explicitly.
- Snapshot changed Markdown before edits; retain original historical evidence and old counts only with clear supersession labels.
- Avoid stale executor instructions, unsupported COMPLETE claims, invalid status enums, broken relative paths, and new secrets.

## Tasks

- [x] Inventory all Markdown and classify active, historical, vendor, private and generated content; snapshot project documents and hash vendor files. Expanded scope includes outputs/proposals, REA notes and roster Markdown; nested checkout inventoried separately.
- [x] Create `docs/CURRENT-STATUS.md` with exact release scope, separate development lanes, current task, all outstanding IDs and receipt links.
- [x] Correct checklist counters/ticks, acceptance table statuses, checkpoint, README/index/source-of-truth, prompt ownership and active release documentation.
- [x] Add dated current-status links and role-specific context to every remaining project-owned Markdown file; retain historical observations as historical.
- [x] Generate a per-file inventory and validation report; check local target paths, fences, stale active claims, unique acceptance IDs and unchanged vendor hashes.
- [x] Obtain bounded read-only review, fix findings, synchronize the candidate documentation with preimage checks and report the actual scope. No unrelated source staged, committed or pushed by this documentation task.

Results and limits: [alignment report](../../../reports/documentation-alignment-20261020.md), [per-file inventory](../../handover/MARKDOWN-INVENTORY-20261020.md). Application continuation is NEXT-SESSION-01 in the isolated candidate.
