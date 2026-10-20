
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../../CURRENT-STATUS.md) · [Checklist](../../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** PELAN / PROMPT LAMA — superseded sebagai arahan execution oleh prompt pelaksanaan canonical di bawah. Checkbox, command, model, path runtime dan keputusan reka bentuk lama dikekalkan untuk provenance; jangan jalankan secara literal. Baseline, migrasi dan bukti semasa mesti ditentukan oleh blueprint dan prompt canonical.
>
> Rujukan semasa: [Master Growth Blueprint](../../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../../prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# Reusable REA Website Forensics and EMONS Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or native session implementation. Steps use checkbox syntax for tracking.

**Goal:** Install a reusable REA web-forensics skill and deliver accurate EMONS hero evidence reports plus a standalone accessible React/Tailwind hero/navigation component.

**Architecture:** Keep the reusable method in the user’s `~/.agents/skills/rea-web-forensics` directory. Keep task-specific reports, brand asset dependency, and TSX source in `outputs/`; retain raw REA JSON under `.work/rea/`. Correct the earlier inventory’s false equivalence between a news-slider tablist and the hero category links.

**Tech Stack:** REA CLI Evidence JSON, Markdown, React 19, TypeScript, Tailwind CSS v4.

**Spec:** User request across this conversation: reusable `/skill-creator` REA process, DOM/accessibility-to-WCAG comparison, endpoints/static assets for the five EMONS hero categories, and React/Tailwind hero/navigation implementation.

## Global Constraints

- Target `https://www.emons.de/en`; the user has affirmed ownership/permission to reproduce it.
- Keep findings tied to captured Evidence IDs and distinguish direct DOM/network observations from inference.
- Never treat the news-region `role=tablist` as the five hero categories; actual category selectors are links and map to `#hero_first`…`#hero_fifth`.
- Do not expose signed query strings or opaque Dropbox tokens in reports or code.
- Do not alter the ABANGCOLEK application source; deliver the requested component separately in `outputs/`.
- Do not claim full WCAG conformance from a DOM-only assessment; label untested keyboard, focus, contrast, and motion conditions.

## Review Focus

- **Control identity:** confirm labels, element roles, hrefs, panel/section relationship, active state, and the separate news tablist.
- **Network provenance:** separate click-specific transactions from initial-load and late/unattributed requests; redact secret query values.
- **API classification:** distinguish business APIs from static JSON/media, analytics, and third-party widgets.
- **Accessibility semantics:** recommend keyboard operability and programmatic state without imposing `role=tab` on non-tab controls.
- **Component dependency:** include the official inline SVG logo as a relative asset; make the moving video source optional and provide a poster fallback.

---

### Task 1: Reusable REA web-forensics skill

**Files:**
- Create: `C:\Users\megat\.agents\skills\rea-web-forensics\SKILL.md`
- Validate: `C:\Users\megat\.manus\skills\skill-creator\scripts\quick_validate.py`

**Interfaces:** The skill guides future REA CLI/MCP analyses of live web UI, accessibility, network resources, and evidence-based reconstruction.

- [x] Record the earlier false mapping as the concrete failure case; add guardrails for DOM ancestry, separate carousel identity, active-state verification, request baselines/initiators, API-vs-asset taxonomy, and limitations.
- [ ] Complete post-skill pressure scenarios; the official Python quick-validator could not run because local Python startup hung, so equivalent frontmatter/section/placeholder checks were run in Node.
- [x] No initializer placeholder files were left in the skill directory.

**Validation note:** `init_skill.py` was attempted; the local Python interpreter did not return, so the skill directory was written directly after the attempt was stopped. `quick_validate.py` was inspected but not run for the same interpreter limitation. A custom Node structural validator passed. The pre-skill pressure agent did not reproduce the historical misclassification, but the actual task history documents it.

### Task 2: Corrected EMONS evidence reports

**Files:**
- Create: `outputs/EMONS_HERO_WCAG_AUDIT.md`
- Create: `outputs/EMONS_HERO_API_ASSET_INVENTORY.md`
- Update: `outputs/EMONS_UI_COMPONENTS_REA.md` (correct the news slider vs hero category statement)

**Interfaces:** Reports cite REA Evidence IDs and give a confidence/limitation column for every inferred relation.

- [x] Record the five actual category links/sections and map each to the corresponding section ID.
- [x] Inventory shared hero assets and report no per-category business endpoint observed; mark analytics/chat/late requests as non-attributable.
- [x] Assess WCAG 2.2-relevant criteria with observed evidence, severity, confidence, and recommended remediations; identify tests still needed.

### Task 3: Standalone React/Tailwind component

**Files:**
- Create: `outputs/EmonsHeroNavigation.tsx`
- Create: `outputs/EmonsHeroNavigation.css`
- Create: `outputs/EMONS_COMPONENT_README.md`
- Create: `outputs/assets/emons-logo.svg`

**Interfaces:** Export `EmonsHeroNavigation({ videoSrc?, logoSrc? })`; provide semantic navigation, responsive menu, search affordance, freight CTA, active category controls, headline/copy/CTAs, and poster fallback.

- [x] Extract the official logo SVG from the saved DOM into a relative asset.
- [x] Implement accessible button controls with programmatic active state and reduced-motion-aware media behavior.
- [x] Type-check the component with the installed TypeScript toolchain and run focused SSR regression tests.

### Task 4: Final verification and delivery

**Files:** Verify all created outputs and installed skill.

- [ ] Confirm all intended files exist, are non-empty, parse/validate, and contain no private query tokens.
- [ ] Report limitations and provide direct links to each deliverable.

---

**Review note:** The captured visual reference (1912×948) is supplied and resolves layout direction. Use restrained fidelity to the white header/red brand CTA, large full-bleed hero, lower-left translucent content card, and five numbered category controls; do not invent a hero image asset per category where the REA evidence only shows shared media.
