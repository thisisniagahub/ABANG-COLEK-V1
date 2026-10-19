<!-- blueprint-alignment: 2026-10-19 -->
> **Penyelarasan autoriti — 19 Oktober 2026.** REKOD SEJARAH / RUJUKAN — pemerhatian, metrik ujian, status deployment, harga/model dan cadangan di bawah terikat kepada tarikh serta skop asal. Ia bukan checklist execution semasa atau pengesahan bahawa dapatan masih benar. Kekalkan bukti asal; revalidate sebelum mendakwa fixed, connected atau production-ready.
>
> Rujukan semasa: [Master Growth Blueprint](../docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) dan [prompt pelaksanaan canonical](../docs/prompts/IMPLEMENT-ABANGCOLEK.md). Blueprint menetapkan 10 kemampuan CopilotKit, 10 modul bisnes, 32 kemampuan tool dan tujuh pendekatan Generative UI sebagai skop sasaran, bukan status siap. Polisi free-only melarang paid fallback; local rules bukan native model, approval bukan execution dan transaksi cloud memerlukan durable CAS commit. Senarai skill, MCP atau plugin bukan bukti ia tersedia atau aktif. Kemas kini dokumentasi ini tidak menjalankan ujian aplikasi, benchmark model, migrasi atau deployment.

# EMONS `/en` — hero category API and asset inventory

**Target:** [https://www.emons.de/en](https://www.emons.de/en)  
**REA:** CLI 6.5.0; temporary Edge profile; viewport 1912 × 948.  
**Primary Evidence:** controlled five-category DOM/network run `ev_ff197f0993486c23e036d211982b240cdd47735794208820a4a26314022991a7`; initial DOM/news-slider evidence `ev_d4a5a15890de9fba86d095f286b2b56c39b5e1384ac8eed4d929986c737af1d9`. The capture retained 126 events / 42 transactions with no dropped events, but request initiator stacks and bodies were disabled.

## Finding

The five hero selectors are **not** the five `role="tab"` controls in the news carousel. They are five `<a href="#">` links in the hero selector row. The `data-video-section="0"…"4"` attributes belong to the section nodes, not to those links. A controlled REA run activated each link separately and verified the corresponding section (`#hero_first`…`#hero_fifth`) moved to `translateY(0)`. This establishes behavioral mapping for the captured run; no explicit ARIA link-to-panel relationship was observed.

**No first-party business/API request was observed as a result of activating the five hero categories in this bounded run.** The page exposes one shared hero video source, a common poster/imagery set, and shared presentation assets. This is a capture-scoped negative finding, not proof that no API exists in other consent, route, viewport, or session conditions.

## Category-to-section map

| Selector | DOM control | Section | State evidence | Category-specific business request |
|---|---|---|---|---|
| 01 Road | `<a class="btn_anim_wrap" href="#">` | `#hero_first` (`data-video-section="0"`) | `hero-road`: `#hero_first` transform is `translateY(0)` | None observed |
| 02 Logistics | `<a class="btn_anim_wrap" href="#">` | `#hero_second` (`data-video-section="1"`) | `hero-logistics`: `#hero_second` transform is `translateY(0)` | None observed |
| 03 Air & Sea | `<a class="btn_anim_wrap" href="#">` | `#hero_third` (`data-video-section="2"`) | `hero-air-sea`: `#hero_third` transform is `translateY(0)` | None observed |
| 04 Rail | `<a class="btn_anim_wrap" href="#">` | `#hero_fourth` (`data-video-section="3"`) | `hero-rail`: `#hero_fourth` transform is `translateY(0)` | None observed |
| 05 Digital | `<a class="btn_anim_wrap" href="#">` | `#hero_fifth` (`data-video-section="4"`) | `hero-digital`: `#hero_fifth` transform is `translateY(0)` | None observed |

The controlled DOM snapshots establish the selector-to-section relationship by activation and resulting section transform. The section index attribute is not a relationship attribute on the link itself. The evidence does not establish a unique media URL or business endpoint for each category.

## Shared hero/presentation resources observed

| Resource | Classification | Evidence / use | Confidence and caveat |
|---|---|---|---|
| `https://www.dropbox.com/scl/fi/250zdi0b12k0udljb6vtc/Emons-3D-Animation_250528_Web.mp4` | Shared hero video/media | One common MP4 source; redirect observed, followed by partial-content video delivery (`206`). Signed query parameters are intentionally omitted. | High that the shared source exists; sanitized URL may not be directly fetchable without its authorized access parameters. Do not reconstruct or publish signed query values. |
| `https://cdn.prod.website-files.com/66c856a2e1e5dc372a191eaa/687f8a88fe4d8f598c4109ed_Emons%203D%20Animation_250416_Thumbnail.webp` | Shared static poster/fallback | DOM `poster` / `.hero_video_thumbnail`; used for the shared hero media. | High |
| `https://cdn.prod.website-files.com/66c856a2e1e5dc372a191eaa/68404fa06a5fa9ce236d9bbf_LKW-Freigestellt.webp` | Shared static image | Truck image; DOM alternative text identifies a red Emons Mercedes-Benz Actros truck. | High that the image is present; not a per-category request. |
| `https://cdn.prod.website-files.com/66c856a2e1e5dc372a191eaa/68405f14210eb0c78bd9d88b_Emons-Planet-IMG.webp` | Shared static image | Planet imagery referenced by the hero composition. | High |
| `https://cdn.prod.website-files.com/66c856a2e1e5dc372a191eaa/68405f174cb849644561b1e4_Emons-Planet-Lottie.json` | Static animation/config asset (`xhr`) | Lottie document; observed as an asset, not a business-data API. | High for resource type/URL; payload was not inspected. |
| `https://cdn.prod.website-files.com/66c856a2e1e5dc372a191eaa/67040024cd02e0d2536f5ba8_ClashGrotesk-Light.woff2` | Shared font asset | Clash Grotesk Light, observed during page initialization. | High |
| `https://cdn.prod.website-files.com/66c856a2e1e5dc372a191eaa/67040024f9f32da66ec8952e_ClashGrotesk-Regular.woff2` | Shared font asset | Clash Grotesk Regular, observed during page initialization. | High |
| `https://cdn.prod.website-files.com/66c856a2e1e5dc372a191eaa/671a79fb19670e966650540a_ClashGrotesk-Medium.woff2` | Shared font asset | Clash Grotesk Medium, observed during page initialization. | High |

The official SVG wordmark used by the delivered component is extracted to `outputs/assets/emons-logo.svg`. It is a local project asset, not a separate category request.

## Requests explicitly not attributed to hero categories

| Host/path | Classification | Why it is excluded |
|---|---|---|
| `https://www.google-analytics.com/g/collect` | Analytics telemetry (`POST`, 204) | Not a content API; query/body values are not reproduced. |
| `https://unpkg.com/@rasahq/rasa-chat` and its widget script | Third-party chat/widget | Appeared at later scenario step indices, but the REA trace had no initiator stacks; timing alone does not show a hero-tab trigger. |
| `https://unpkg.com` widget/font resources | Third-party presentation assets | Same attribution limitation; not hero content. |

Header mega-menu card images (including `frame-cargo`, `frame-nav-03/04`, and `Frame 870`) are navigation imagery and intentionally excluded from the hero-specific inventory. Requests tied to the separate news slider are also not evidence of requests caused by hero category activation.

## Capture limits

- The run exercised the five selectors independently and recorded DOM/accessibility/network evidence; network request and response bodies and header values were disabled.
- No initiator stack was available. A request appearing at a later step is temporal association only unless supported by a controlled repeatable delta or initiator chain.
- “None observed” means no first-party business/API request was evidenced for these five activations in this run; it does not prove the whole site has no APIs.
- The signed Dropbox query values are intentionally omitted from this report and from the React component.
