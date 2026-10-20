
<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../docs/CURRENT-STATUS.md) · [Checklist](../PROJECT-CHECKLIST.md). Rekod historical/research/proposal; dapatan, copy, angka, approvals dan kebolehsediaan dalam badan asal bukan pengesahan status semasa. Keputusan blueprint v2.4 dan receipt semasa mengatasi cadangan lama; tiada kelulusan founder atau penghantaran proposal dianggap berlaku.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** REKOD SEJARAH / RUJUKAN — pemerhatian, metrik ujian, status deployment, harga/model dan cadangan di bawah terikat kepada tarikh serta skop asal. Ia bukan checklist execution semasa atau pengesahan bahawa dapatan masih benar. Kekalkan bukti asal; revalidate sebelum mendakwa fixed, connected atau production-ready.
>
> Rujukan semasa: [Master Growth Blueprint](../docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../docs/prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# EMONS Hero + Navigation component

`EmonsHeroNavigation.tsx` is a standalone React component styled with Tailwind CSS v4. It uses `lucide-react` for icons, the local `assets/emons-logo.svg` wordmark, and the official shared hero poster URL captured by REA.

## Integration

1. Copy `EmonsHeroNavigation.tsx`, `EmonsHeroNavigation.css`, and `assets/emons-logo.svg` into your React app, preserving the asset relationship.
2. Import the CSS once in the app entry point; the stylesheet registers the captured Clash Grotesk WOFF2 fonts and `.emons-hero-navigation` family.
3. Add the `emons-hero-navigation` class to the outer wrapper (already present in the component) and place the logo at `/assets/emons-logo.svg`, or pass a different `logoSrc`.
4. Optionally pass `videoSrc` with an authorized, working MP4 URL. The signed Dropbox query values were intentionally excluded. Without it, the component shows the official static poster only.
5. Override `navigationItems`, `freightInquiryHref`, or `searchAction` when the integrating project’s route structure differs.

The five hero controls use a complete ARIA tabs pattern with selected state, tab-to-panel relationships, roving focus, and Left/Right/Home/End keyboard support. This deliberately improves the original page’s five `<a href="#">` selectors rather than repeating their semantic state gap. The hero description and slide-card copy are English; the Rail card description was translated from the German source passage.
