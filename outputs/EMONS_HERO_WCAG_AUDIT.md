<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** REKOD SEJARAH / RUJUKAN — pemerhatian, metrik ujian, status deployment, harga/model dan cadangan di bawah terikat kepada tarikh serta skop asal. Ia bukan checklist execution semasa atau pengesahan bahawa dapatan masih benar. Kekalkan bukti asal; revalidate sebelum mendakwa fixed, connected atau production-ready.
>
> Rujukan semasa: [Master Growth Blueprint](../docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../docs/prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# EMONS `/en` — hero and navigation accessibility review

**Target:** [https://www.emons.de/en](https://www.emons.de/en)  
**Capture:** REA CLI 6.5.0; Edge temporary profile; viewport 1912 × 948; document language `en-GB`; service workers blocked.  
**Evidence:** page DOM/accessibility capture `ev_a1ac59d7fc71f4a7261a083f2906e88a193f565e62b5c8022ebd783cbcbbf43`; control-identity/news-slider DOM evidence `ev_d4a5a15890de9fba86d095f286b2b56c39b5e1384ac8eed4d929986c737af1d9`; controlled five-hero-category run `ev_ff197f0993486c23e036d211982b240cdd47735794208820a4a26314022991a7`.

## Executive summary

The page exposes a named primary navigation, search control, one main heading, a labelled hero, and five focusable hero selectors. The selectors are links with `href="#"` that change the visible hero section, but the captured accessibility state does not expose which category is active. **Do not confuse them with the separate five-tab news slider**: its `role="tablist"` is inside `.slider_controls.is-news`.

This is a targeted DOM/accessibility-tree assessment, not a full WCAG conformance audit. Keyboard and screen-reader operation, focus appearance, color contrast, responsive target size, reduced-motion behavior, and timed media behavior were not fully tested.

## Findings

| Area / WCAG 2.2 criterion | Observed evidence | Status and severity | Confidence | Recommended improvement |
|---|---|---|---|---|
| Hero category state — **4.1.2 Name, Role, Value (A)** | Five `<a class="btn_anim_wrap" href="#">` controls are in the hero selector row. The `data-video-section="0"…"4"` attributes belong to the section nodes, not the links. Controlled activation moved the corresponding section (`#hero_first`…`#hero_fifth`) to `translateY(0)`; the accessibility snapshot still exposes the controls as links and no `aria-current`/`aria-selected` state was observed. | **Potential issue · moderate** | High for captured DOM and interaction; medium for conformance impact | If these controls switch mutually exclusive hero panels, implement native buttons with an appropriate tab pattern (`tablist`/`tab`/`tabpanel`) and keyboard model; otherwise use a clearly named button group with `aria-pressed`. Keep each state programmatically exposed. Do not use `role=tab` unless the complete tab interaction model is implemented. |
| Hero category keyboard operation — **2.1.1 Keyboard (A)** | Links are natively focusable, but no keyboard activation or focus-order run was captured. `href="#"` does not by itself prove the script-driven section change works with Enter or assistive technology. | **Not tested · unknown** | Low | Test Tab/Shift+Tab and Enter on all five controls. Verify that activation changes content without moving focus unexpectedly and that no keyboard trap occurs. |
| Focus visible / not obscured — **2.4.7 Focus Visible (AA), 2.4.11 Focus Not Obscured (AA)** | DOM capture does not establish visible focus treatment. A sticky header is present. | **Not tested · unknown** | Low | Inspect keyboard focus at desktop and mobile sizes; ensure a visible indicator and that focused items are not hidden behind the sticky header. |
| Hero CTA accessible names — **2.4.4 Link Purpose (A), 4.1.2 (A)** | The captured accessibility artifact exposed two hero CTA links without names, while page DOM text includes “Services overview” and “For the freight request.” This discrepancy requires a computed-name check before classifying as a confirmed failure. | **Potential issue · moderate** | Medium | Inspect the rendered accessible names for both links. Ensure visible text contributes to the accessible name; add concise hidden text only if needed. |
| English page with German text — **3.1.2 Language of Parts (AA)** | Document declares `lang="en-GB"`; the hero body copy, Rail section, FAQ heading, and a news title include German strings in the captured evidence. A matching `lang="de"` annotation on each German text region was not established. | **Potential issue · moderate** | High for mixed language; medium for missing local language annotations | Wrap German passages in `lang="de"` or provide the intended English translation. Verify `lang` annotations in the final rendered DOM. |
| Background video / movement — **2.2.2 Pause, Stop, Hide (A); 2.3.3 Animation from Interactions (AAA)** | A muted inline hero video and poster are present. The supplied capture does not establish duration, autoplay behavior, a persistent pause control, or `prefers-reduced-motion` handling. | **Not fully tested; potential issue if it autoplays for >5 seconds alongside other content** | Medium for media presence; low for behavior | Provide a persistent pause/play control; do not auto-play when reduced motion is requested; retain the poster fallback and ensure any essential information is not available only in motion. Test the runtime. |
| Text and control contrast — **1.4.3 Contrast (Minimum) (AA); 1.4.11 Non-text Contrast (AA)** | Screenshot/DOM evidence does not include a complete contrast measurement for text over the hero or inactive selectors. | **Not tested · unknown** | Low | Measure each text and control state against its rendered background, including translucent overlays, hover, selected, and focus states. |
| Target size — **2.5.8 Target Size (Minimum) (AA)** | No bounding-box measurement was included for the five selectors or header controls at mobile breakpoints. | **Not tested · unknown** | Low | Measure the rendered pointer targets at mobile widths; ensure they meet 24 × 24 CSS px or a valid exception, with 44 × 44 px preferred for touch. |
| Main landmark and heading — **1.3.1 Info and Relationships (A), 2.4.6 Headings and Labels (AA)** | One `main` landmark and a descriptive H1 (“Emons - your forwarding company for transport & logistics”) were captured. | **No issue observed in this limited capture** | High | Preserve the single page-level H1 and meaningful heading hierarchy in the reconstruction. |
| Search control — **1.3.1 (A), 3.3.2 Labels or Instructions (A)** | The search control is exposed as a searchbox named “Enter search term.” | **No issue observed in this limited capture** | High | Retain an associated visible or visually-hidden label and verify focus/submit behavior. |

## Reconstruction changes made

The delivered React component deliberately improves the five hero selectors rather than copying the observed semantic gap: it renders native tab buttons, one `aria-selected="true"`, a persistent matching panel for every `aria-controls` reference, roving focus, and Left/Right/Home/End keyboard navigation. It also includes a skip link, labelled search, focus rings, a 44 px minimum control height for key actions, optional video controls, and a reduced-motion preference check.

These implementation choices improve the component’s semantics; they **do not establish WCAG conformance** for the original site or for an integrated build. Re-test the rendered app at desktop/mobile sizes with keyboard, screen reader, contrast tools, and reduced-motion settings.

## Scope and limitations

- The hero categories were activated one at a time in a temporary browser. No forms were submitted and no consent choices were made.
- The news-slider tablist is a separate DOM component; its state must not be used as evidence about the hero selectors.
- No full-page Lighthouse/axe audit, manual keyboard pass, screen-reader session, zoom/high-contrast test, or measured contrast/target-size test was recorded.
- Findings labelled *potential* or *not tested* are not confirmed WCAG failures. The 2.2.2 condition depends on actual autoplay duration and concurrent content.
