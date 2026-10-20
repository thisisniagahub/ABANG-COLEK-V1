# ABANGCOLEK — indeks dokumentasi

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](CURRENT-STATUS.md) · [Checklist](../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

**Mula dengan [CURRENT-STATUS](CURRENT-STATUS.md) dan [checklist](../PROJECT-CHECKLIST.md).** Main18c69b3 hanya release TypeScript/config; source integrasi/candidate dan85 requirement belum mempunyai full production certification. Fakta/receipt semasa mengatasi ringkasan baseline lama.

Diselaraskan: **20 Oktober 2026**. Blueprint ialah kontrak sasaran; source/runtime evidence menentukan apa yang benar-benar tersedia. `implemented`, `verified_local` dan `verified_production` ialah status berasingan. Tiada test/deployment baharu dibuat melalui alignment Markdown ini.

## Mula di sini

1. [Master Blueprint v2.4](ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) — kontrak bisnes, topology, Copilot dan acceptance.
2. [Source of Truth](ABANGCOLEK-SOURCE-OF-TRUTH.md) — source/data authority dan baseline berbanding sejarah.
3. [Prompt implementasi induk dan peringkat](prompts/README.md) — keputusan tetap, skills/tools, preflight, acceptance dan blocker rules.
4. [README projek](../README.md) — menjalankan dan memeriksa projek sedia ada.
5. [Platform architecture](ABANGCOLEK-PLATFORM-ARCHITECTURE.md) — domain dan runtime boundaries.
6. [Struktur repo sasaran](design/repository-structure.md) dan [research GitHub](research/2026-10-19-github-project-structure.md) — pemetaan, dependency rules dan migrasi berperingkat; belum bukti fail dipindahkan.

## Operations Copilot

- [Architecture](AI-AGENT-ARCHITECTURE.md) dan [roadmap](AI-AGENT-ROADMAP.md).
- [Tujuh pendekatan Generative UI](design/copilot-generative-ui-seven-approaches.md).
- [10 ciri CopilotKit](design/copilotkit-ten-features.md) — Chat, Streams, Learning, Generative/Declarative UI, HITL, Frontend tools, Shared state, Headless UI, Sub-agents.
- [32 logical capabilities dan 10 modul](design/copilot-advanced-tools.md) — registry, scope, deterministic calculations dan execution.
- [Pelan implementasi terperinci](superpowers/plans/2026-10-19-copilotkit-ten-features.md).
- [Free-only policy](research/2026-10-19-free-model-policy.md) dan [activation register](AI-PROVIDER-FREE-MODELS-REGISTER.md).
- [JEV](../JEV.md) — current LOCAL_RULES boundaries diikuti research sejarah; bukan native provider proof.
- [JEV × TypeSafe System One](architecture/JEV-TYPESAFE-NATIVE-PROVIDER.md) — adapter native wujud, gate kelayakan/terma/data handling masih tertutup, tiada panggilan live.

Tujuh UI approaches—Display Only, Interactive, Tool Rendering, State Rendering, MCP Apps, A2UI, Your Components—diperinci melalui blueprint/design/prompt. Intelligence Streams/Learning kekal gated jika entitlement, kos atau data policy belum tersedia. Model percuma tidak menjadikan servis Intelligence percuma.

## Operasi, keselamatan dan recovery

- [Production release](production-release.md) — Vercel/Bun + authoritative Supabase CAS, evidence dan exact release SHA.
- [Recovery](runbooks/platform-recovery.md) — local selectors, backup/restore dan cloud reconciliation.
- [Credential audit](runbooks/credential-revocation-audit.md) — rotate/revoke tanpa nilai rahsia.
- [Design QA](design-qa.md) — current acceptance dengan evidence sejarah berasingan.
- [Decisions](decisions/) — ADR; semak status accepted/superseded bersama blueprint semasa.
- [Handover A–Z](handover/AGENT-HANDOVER-A-Z.md), [capabilities](handover/CAPABILITY-MATRIX.md) dan [Markdown alignment register](handover/MARKDOWN-ALIGNMENT-REGISTER.md).

## Research dan sejarah

- [Review chat/blueprint](handoffs/2026-10-19-blueprint-finalization-review.md).
- [Product social research](../reports/RESEARCH_PRODUK_SOSIAL_ABANGCOLEK_2026-10-03.md) dan [image inventory](../reports/INVENTORI_IMEJ_PRODUK_ABANGCOLEK_2026-10-03.md).
- [Research index 2 Oktober](../reports/research/2026-10-02/README.md).
- [Archive](archive/legacy-oct2026/) dan [status 16 Oktober](archive/legacy-oct2026/ABANGCOLEK-PLATFORM-STATUS-2026-10-16.md) ialah dated references; bukan live proof.

`docs/design` ialah sasaran, `docs/prompts` execution packets, `docs/runbooks` prosedur, `docs/decisions` governance, `reports` evidence/research bertarikh. `var` runtime private; `.agents/skills` dan `skills` ialah instructions, bukan dependencies aplikasi. Jangan mengemas kini vendor skills hanya untuk menukar produk blueprint.
