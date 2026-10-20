# ABANGCOLEK — Design QA contract dan dated evidence

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](CURRENT-STATUS.md) · [Checklist](../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Diselaraskan: **19 Oktober 2026**, mengikut [Master Blueprint v2.4](ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md). Bahagian Dashboard di bawah ialah **HISTORICAL_SNAPSHOT**; test/browser outcomes tidak dijalankan semula melalui alignment ini. Jangan menggunakan keadaan server atau paused/complete goal lama sebagai live status.

## Acceptance semasa

- Uji storefront/checkout/tracking, role workspaces dan Copilot pada phone/tablet/desktop, light/dark, keyboard/screen reader, focus return, reduced motion serta connection loss.
- Semak actual served source/SHA, API JSON, provenance, loading/empty/missing-data/error; root 200 atau screenshot sahaja bukan acceptance.
- Copilot: 10 ciri/10 modul/32 logical capabilities/7 UI approaches mempunyai coverage berasingan. Display-only tidak memberi interactive authority; frontend callbacks melalui fresh server checks.
- Fixed-schema A2UI dan komponen ABANGCOLEK; first-party read-only MCP App untuk pilot. Render schema ditolak jika unknown component, unsafe URL/HTML/code atau cross-scope reference.
- Kad margin/JEV/tracking menggunakan tool/state sebenar, timestamp/rule version dan insufficient-data. LOCAL_RULES bukan native confidence; evidence image bukan vision analysis.
- Approval menunjukkan payload/scope/revision/expiry; approve bukan success. Pending execution, committed receipt, rejected/stale/unknown dipaparkan berbeza.
- Workspace/Pet berkongsi thread tanpa duplicate run; stop/cancel/mute dan text fallback berfungsi. Voice inference free-only dan explicit microphone permission.
- Streams replay/reconnect tidak menjalankan action semula. Intelligence belum layak -> blocked_external berlabel. Tiada fake saved-run/learning success.
- Negative tests untuk role/ownership/revocation, URL/shared state tampering, logout cache dan prompt injection. Tiada secrets/PII tersembunyi dalam DOM, public HTML atau exports.

Evidence wajib: exact commit/dirty manifest, viewport/browser, screenshot/trace, commands/API responses, time, expected/actual dan limitations. Brand assets asli dikekalkan; research images bukan bukti SKU tersedia.

## Historical Dashboard QA
# Dashboard UI/UX — Design QA

Date: 2026-10-01
final result: passed
Scope: dashboard/sidebar/mobile navigation UI and local data interactions. This result does not certify production integrations or pixel-for-pixel reproduction of a selected mockup.

## Design intent and evidence

User redirected the task to improving the current app UI/UX. The action-first and calm executive concepts from the five-option set are design references; the existing application remains the implementation target. The design adapts their hierarchy and decision flow to existing routes and local records. It does not reproduce fictional businesses, statistics, navigation or capabilities in those generated images.

References opened together with the implementation screenshot in a single comparison input:

- Generated action-first concept: `exec-b06e2d61-82cc-48d0-a0a2-6e3fbd1d0f05.png` in the session generated_images folder.
- Generated executive concept: `exec-6ce01755-35ec-4974-b23d-79c8f09daf5c.png` in the same folder.
- [Desktop light](../reports/dashboard-ui/desktop-light.png), captured at 1440×1024 CSS viewport.
- [Desktop dark](../reports/dashboard-ui/desktop-dark.png), captured at 1440×1024 CSS viewport.
- [Mobile light](../reports/dashboard-ui/mobile-light.png), captured at 390×844 CSS viewport.

Saved screenshots were opened and visually inspected. The current Chrome screenshot capture has a warm appearance; computed dashboard light background was independently read as rgb(246,247,244), and dark background as rgb(19,25,24). Color reproduction of the screenshot alone is not a color-calibration test.

## Fixes and post-fix verification

| Finding | Fix | Verification |
|---|---|---|
| Agent performance dominated business overview | Business brief/KPIs/chart/attention queue now lead; AI performance is a shortcut | Desktop screenshots and DOM |
| Crowded, ungrouped navigation | Bisnes & operasi, Intelligence, Google Workspace groups; collapsible Workspace | Source review + live navigation |
| KPI and regional chart used unrelated figures | Both calculate from eligible local orders | Unit test + live Johor Bahru filter |
| Region drawer included excluded records | Drawer now receives same eligible records as chart | Source review |
| Generated dashboard secondary content dropped during refactor | Secondary chart and recent activity preserved in collapsed archive | Source review |
| Empty donut could collapse | Fixed chart slot height | Source review + empty-filter render |
| Many region labels hidden | Dynamic chart height and interval=0 | Desktop post-fix screenshot with all 11 labels |
| Theme only covered main panel | Sidebar and app shell follow dashboard theme | Dark screenshot |
| Mobile navigation had 12 scrolling items and omitted routes | Four primary tabs + grouped menu exposing all 18 routes | Mobile screenshot; navigation to Reports and back |
| Missing Firebase/AI configuration blanked entire app | Optional Firebase config and lazy Gemini client with no fake credentials | Live app load, typecheck, build, security review |

## Interaction checks

- Johor Bahru filter: RM155; four eligible records in KPI drawer, amounts RM45 + RM30 + RM35 + RM45.
- Native modal Escape closes; focus returns to originating KPI button.
- Seven-day + Penang filter produces no orders; empty table and zero-valued metrics instead of invented data.
- Search AC-ORD-1003 returns the matching row.
- Light/dark toggle verified through computed background and screenshot.
- Mobile page scrollWidth=390 with innerWidth=390: no page-level horizontal overflow. Wide record table scrolls within its own container.
- Mobile module menu contains 18 options; Reports page opens and dashboard can be restored.
- Export button produces the 20-record confirmation. Browser download-event capture timed out; the final saved download location/file has not been independently verified.
- No new app runtime error in the final successful render. An unrelated Chrome extension error was observed earlier. OAuth, staff role switching, Gemini calls and remote database operations were not exercised.

## Visual review

- Typography: DM Sans, tabular numeric values, distinct title/section/metadata hierarchy; no generated lettering in the app UI.
- Spacing: consistent card padding and gaps; mobile becomes a two-column KPI grid and single-column main layout.
- Tokens: scoped light/dark surfaces, yellow primary emphasis and differentiated statuses.
- Assets: existing supplied brand logo and installed Lucide icons; Recharts renders charts as actual UI.
- Content: concise BM copy; source and metric definitions available. Existing analytical artifacts remain labelled unverified.
- Accessibility: semantic buttons/selects/details/table; visible focus, native modal focus handling and reduced-motion styles. This is not a complete WCAG compliance certification.

## Technical verification

- `bun test tests/dashboard-model.test.ts`: 3 passed, 0 failed, 10 assertions.
- `bun run lint`: TypeScript check passed.
- `bun run build`: production build passed.
- `git diff --check`: no whitespace errors.
- Code reviewer confirmed dashboard and sidebar defects corrected; runtime prerequisites reviewed separately for security regressions.

## Remaining follow-up

- Production build still emits a large-bundle warning (approximately 2.06 MB uncompressed JS before route splitting). This is an existing all-views import architecture; UI completion does not establish Core Web Vitals.
- Actual Gemini/Firebase credentials and remote integration verification remain separate from this UI task.
- Underlying staff sign-in simulation and legacy JEV fallback remain existing issues. This task does not certify them.
- Confirm downloaded CSV file location/content on a browser that exposes its download artifact.
