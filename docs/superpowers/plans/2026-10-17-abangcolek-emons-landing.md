
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PELAN / PROMPT LAMA — superseded sebagai arahan execution oleh prompt pelaksanaan canonical di bawah. Checkbox, command, model, path runtime dan keputusan reka bentuk lama dikekalkan untuk provenance; jangan jalankan secara literal. Baseline, migrasi dan bukti semasa mesti ditentukan oleh blueprint dan prompt canonical.
>
> Rujukan semasa: [Master Growth Blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# ABANGCOLEK Landing Page EMONS-Inspired Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the ABANGCOLEK public landing page using EMONS-inspired hero composition while preserving ABANGCOLEK identity, routes, content and interaction contracts.

**Architecture:** Keep the existing `LandingPage` and `ScrollWorldHero` as the implementation. Make a bounded navigation/hero presentation update, retain the four current chapters and all scene-controller behavior, and document brand assets/tokens. Deliver an early v0 preview for user correction before completing the full polish.

**Tech Stack:** React 19, TypeScript, Vite, existing CSS, Bun 1.4.2, Playwright tests (existing only; browser acceptance is not part of this task unless separately requested).

**Spec:** `docs/superpowers/plans/2026-10-17-abangcolek-emons-landing-spec.md`

## Global Constraints

- Follow the preserve spec; copy only the EMONS layout pattern, not its identity, names, imagery, or logistics labels. Derive landing theme colors from `public/assets/brand/ABANG-COLEX-LOGO-2.png`.
- Use logo gold `#F2AE12` as the primary accent, logo red `#DC1D3F` as CTA/supporting accent, black `#000000` and white `#FFFFFD` as core neutrals, and leaf green `#488420` sparingly. Replace lime/lavender UI accents on the public landing only; do not change shared workspace theme tokens.
- Preserve public routes, navigation labels, catalogue behavior, theme toggle, SEO metadata, and all four existing hero chapters.
- Do not change the scene controller, hotspot/dialog behavior, accessibility semantics, photo attribution, touch/keyboard input, or reduced-motion fallback.
- Keep work local. Do not deploy, push, commit, stage unrelated changes, or edit API/backend/catalogue data.
- Existing worktree contains unrelated dirty/untracked items; leave them untouched and stage only files explicitly changed for this task if staging ever becomes necessary.

## Review Focus

- Dark and light theme: header and hero CTA retain readable text and focus indicators.
- Narrow mobile (320–400px): navigation, chapter controls, copy and product photo do not overflow or overlap.
- Short viewport/reduced motion: existing static chapter path remains intact.
- Chapter interaction: all four labels, `aria-current`, route targets and scroll/touch/keyboard behavior remain unchanged.
- Product and trust claims: only use existing approved copy and assets; do not invent stock, locations or performance claims.

---

### Task 1: Create an early visual v0

**Files:**
- Create: `docs/design/brand-spec.md`
- Modify: `src/features/landing/landing.css`
- Modify: `src/features/landing/scroll-world.css`
- Modify: `src/features/landing/AnimatedColekWorld.tsx`
- Modify: `src/features/landing/animated-colek-world.css`
- Read-only regression reference: `tests/e2e/landing-emons.spec.ts`, `tests/e2e/landing-emons-touch.spec.ts`

**Interfaces:**
- Consumes: `LandingPage` navigation (`Produk`, `Lokasi`, `Ejen & stokis`, `Bantuan`, `Masuk`) and existing `.ac-world-*` classes.
- Produces: v0 polish that retains the current DOM contracts and can be visually reviewed before full refinement.

- [ ] Create a task branch from `main` without staging or modifying unrelated working-tree entries.
- [ ] Record the attached logo, live landing logo, world art, product photo, sampled palette and fonts in `docs/design/brand-spec.md`; note source paths and any unavailable UI screenshot honestly.
- [ ] Implement only the v0: introduce logo-derived gold/red/black/white/leaf-green theme tokens, replace public-landing lime/lavender accents (including SVG hero accents), strengthen hero-copy contrast, and refine the four-button chapter rail. Keep fruit/parcel colors, DOM, labels, active-state semantics and handlers unchanged.
- [ ] Start the existing UI-only preview locally and capture one desktop and one mobile v0 screenshot under `.work/` for review; stop before full refinement.
- [ ] **Checkpoint:** share the v0 screenshots and ask whether to continue or adjust the composition. Do not proceed to Task 2 until the user responds.

### Task 2: Complete the approved polish and verify source contracts

**Files:**
- Modify: `src/features/landing/LandingPage.tsx` only if a minimal markup adjustment is needed to apply the approved visual hierarchy; do not change destinations or labels.
- Modify: `src/features/landing/landing.css`
- Modify: `src/features/landing/scroll-world.css`
- Create/update: `docs/design/brand-spec.md`

**Interfaces:**
- Consumes: the user-approved v0 composition and unchanged landing props/routes.
- Produces: complete responsive visual polish with the existing `LandingPage` and `ScrollWorldHero` APIs.

- [ ] Refine the sticky masthead hierarchy without changing its destinations, height contract (`--ac-world-header`), theme behavior, or login route.
- [ ] Refine copy panel spacing, logo-color contrast, CTA emphasis and active chapter treatment across the existing desktop/mobile breakpoints; retain natural food/parcel illustration colors.
- [ ] Preserve focus-visible treatment, 44px+ controls, reduced-motion behavior, short-viewport static mode, and all route/scene attributes.
- [ ] Run `bun run lint` and `bun run build`; expected result: both exit successfully.
- [ ] Review `git diff --check` and a path-limited diff; confirm no unrelated file, content, route, API, or deployment change.
- [ ] Do not execute the Playwright browser acceptance suites unless the user separately asks for browser/visual QA.

## Execution Notes

- Recommended execution method: **Native**, because this is one tightly coupled React/CSS visual change with an early user checkpoint, not several independent subsystems.
- No commit is requested or authorized.
