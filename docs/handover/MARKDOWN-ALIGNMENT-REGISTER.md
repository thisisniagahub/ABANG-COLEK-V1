# ABANGCOLEK — Markdown Alignment Register, 19 Oktober 2026

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Rekod historical; pemerhatian, angka ujian, tick dan executor dalam badan asal merujuk sesi asal sahaja. Arahan launch/delegation lama tidak aktif. Status semasa dan bukti release ditentukan oleh rujukan di atas; kandungan asal dipelihara untuk provenance.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

Authority semasa: [master blueprint v2.4](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md), [ADR-0003](../decisions/0003-blueprint-v23-execution-contract.md), [prompt utama](../prompts/IMPLEMENT-ABANGCOLEK.md).

Inventori awal sesi ini: **356 Markdown = 120 dokumen projek + 236 skill-library files**. Semua disenaraikan mengikut path/hash/category dalam [register per-file](MARKDOWN-INVENTORY-20261019.md). Kiraan akhir termasuk dokumen/prompt baharu direkod selepas verification; jangan guna kiraan sejarah di bawah sebagai denominator semasa.

Dokumen aktif disemak kandungan; dokumen sejarah mendapat supersession/authority context dan pembetulan pautan yang boleh disahkan. Skill vendor/managed di `skills/` dan `.agents/` dikekalkan dengan hashes; ia bukan business blueprint dan tidak ditulis semula atau didakwa semuanya dijalankan/semantic-audited. Generated/runtime/private/dependency trees dikecualikan daripada project documentation.

Dokumen, 10CPK/10MOD/7GUI/32logical capabilities, topology local/cloud, free-only, JEV LOCAL_RULES dan approval/receipt boundaries kini mempunyai sumber autoriti yang jelas. Ini bukan pengesahan source/runtime/release. Laporan penutupan: [alignment report](../../reports/documentation-alignment-20261019.md).

## Rekod sejarah sehingga 4 Oktober — bukan status semasa
# ABANGCOLEK — register seluruh Markdown dan alignment

**Asal:** 3 Oktober2026; **dikemas kini4Oktober2026**. **Scope:** canonical repo D:\ABANGCOLEK-PLATFORM. [Handover](AGENT-HANDOVER-A-Z.md), [Source of Truth](../ABANGCOLEK-SOURCE-OF-TRUTH.md), [backlog](../archive/legacy-oct2026/PROJECT-ALIGNMENT-BACKLOG.md).

## Coverage dan kaedah

- Sebelum handover:278 Markdown,60 dokumen projek,218 library files dengan172 SKILL.md.
- Selepas handover:282 Markdown,64 dokumen projek,218 library files dengan172 SKILL.md.
- Selepas penyediaan master prompt AGY4Oktober:283 Markdown,65 dokumen projek,218 library files unchanged.
- Selepas implementasi swarm Wave 3 4Oktober: 287 Markdown, 69 dokumen projek, 218 library files unchanged. Empat dokumen autoriti baharu ditambah: `AGY-MASTER-IMPLEMENTATION-PROMPT.md`, `credential-revocation-audit.md`, `0002-zero-new-spend-hosting-topology.md`, dan `RESEARCH-DISPOSITION-MATRIX.md`.
- 55 dokumen sejarah/research/legacy mendapat authority banner;10 mempunyai explicit errata/scope correction. Original body/frontmatter preserved; fingerprint annotation disimpan secara lokal di var/lib/handover/annotation-manifest.json.
- 13 current entries dipelihara/dikemas kini/dicipta;218 library Markdown kekal unchanged dan inventoried sebagai guidance.
- Ini bukan claim semua172 skills dijalankan atau semua218 library docs mendapat semantic re-audit. Semua project docs diberi authority context; konflik utama diaudit berfokus.
- Exclusions:node_modules,.git,var,dist,dist-ssr,.kilo dan symlink dependency trees; generated/private runtime bukan documentation authority. OS retained/reference, tidak ditulis selari.

## Hierarchy

| Jenis | Cara gunakan |
|---|---|
| CURRENT_AUTHORITY | Current decisions/status/procedures; refresh live receipt before action |
| IMPLEMENTATION_PROMPT | Task scope/ownership/acceptance untuk penerima; bukan execution receipt atau bukti provider connected |
| HISTORICAL_PLAN | Plan lama dan status asal; bukan instruction resume atau proof complete |
| HISTORICAL_SNAPSHOT | Dated implementation/review receipts; tidak mengatasi current registry |
| LEGACY_GUIDE | Source/navigation lama; AppRouter/scoped API sekarang authority |
| RESEARCH_REFERENCE | Dated vendor/business claims, bukan connected adapter/current product listing |
| SKILL_LIBRARY | Workflow guidance/templates/reference, bukan installed server/native SDK benchmark |

## Konflik yang dibetulkan melalui explicit errata

- **reports/FORENSIK_AUDIT_JEV_DAN_KOD_ABANGCOLEK_OS_2026.md**: Errata: ../../firebase-applet-config.json dari src/services menuju akar projek, bukan D:/; source semasa perlu dibaca semula. Supabase publishable bukan private credential; RLS/restrictions perlu audit. Maps exposure tidak membuktikan sebab quota error. Harga/saiz/pakej ialah historical assertions, bukan current approved catalogue.
- **docs/JEV_ARCH.md**: Errata: Production-Active, <50ms, strict100% dan confidence-calibration bukan proof runtime semasa. Current JEV ialah LOCAL_RULES; native unavailable. Nama model lama bukan availability guarantee.
- **docs/ABANGCOLEK_DISCOVERY_AND_PLAN.md**: Errata: 167snapshots/389native-results/11RLS-tables ialah assertions sejarah cloud, bukan OS SQLite snapshot semasa. Current data hanya customer1/flows5/founderfalse; cloud migration tidak dibuktikan.
- **docs/AUDIT_TERPERINCI_KESELURUHAN_PROJEK_ABANGCOLEK_OS.md**: Errata: compile/Supabase/production100% ialah assertions laporan asal, bukan fresh verification atau release receipt. Current local tests dan production gaps dalam registry mengatasi status asal.
- **docs/JEV_ECOSYSTEM_AUDIT_REPORT.md**: Errata: production-grade/complete dan harga/saiz bukan current acceptance. Native JEV unavailable; SKU belum onboarded. Salinan historical report juga berada di reports/JEV_ECOSYSTEM_AUDIT_REPORT.md; current registry ialah authority tunggal.
- **reports/JEV_ECOSYSTEM_AUDIT_REPORT.md**: Errata: production-grade/complete dan harga/saiz bukan current acceptance. Native JEV unavailable; SKU belum onboarded. Salinan historical report juga berada di docs/JEV_ECOSYSTEM_AUDIT_REPORT.md; current registry ialah authority tunggal.
- **JEV.md**: Errata: 15–70ms,100–400x-cost/speed ialah vendor/research assertions, bukan local benchmark, calibrated model atau free usage entitlement. Source semasa menggunakan LOCAL_RULES.
- **reports/DESIGN_QA_HERO_EMONS_2026-10-03.md**: Scope correction: PASS dalam badan merujuk hero/revision terdahulu. Current scene goal PAUSED; hotspot rearming regression dan fresh touch/reduced-motion QA belum complete.
- **reports/IMPLEMENTASI_HERO_EMONS_DAN_ASET_ASLI_ABANGCOLEK_2026-10-03.md**: Scope correction: COMPLETE_LOCAL dalam metadata asal tidak menutup current Emons scene goal PAUSED. Hotspot rearming regression dan final live acceptance masih backlog D06.
- **reports/SINTESIS_DAN_ALIGNMENT_ABANGCOLEK_2026-10-03.md**: Snapshot correction: runtime aktif OS dalam badan ialah observation terdahulu. Refresh3Oktober2026,20:25MYT: ports3000/3010 STOPPED; data tetap OS; tiada cutover.

Pada snapshot handover3Oktober, runtime STOPPED, Founder grouping masih proposal dan Emons PAUSED. Pengguna resumes4Oktober: Founder grouping kini implemented12unit+5E2E; Emons14core E2E+4layout+25unit lulus dan goal complete. Current [capability receipt](CAPABILITY-MATRIX.md) dan backlog mengatasi status snapshot/errata lama. Native providers masih unavailable. Exposed credentials tidak dicopy; full key/token patterns tidak ditemui dalam focused first-party scan. Rotation/audit owner belum dibuktikan.

## Validation

Penyediaan master prompt4Oktober menambah [AGY-MASTER-IMPLEMENTATION-PROMPT.md](AGY-MASTER-IMPLEMENTATION-PROMPT.md), pautan indeks/handover dan correction masa snapshot data dalam Source of Truth. Tiada status backlog implementation ditutup melalui penyediaan prompt; per-task acceptance kekal dalam backlog. Link/skill-path/encoding/whitespace checks dan independent review untuk perubahan dokumentasi ini direkodkan berasingan di var/log/agy-master-prompt.

Refresh4Oktober selepas implementation:282Markdown/64project/218library/172skills;600local links checked,0broken;55historical payload hashes retained;library diff0;whitespace gate PASS. Current registry memegang source PLATFORM+retained OSvar running lokal,210unit,24browser cases across scoped runs,6real-runtime checks,lint/final build dan reviewer receipts. Jadual berikut mengekalkan receipt handover3Oktober untuk provenance.

Receipt handover — 3 Oktober2026,20:45MYT, kemudian recheck selepas metadata akhir:

| Pemeriksaan | Hasil |
|---|---|
| Inventory | 282 Markdown;64project;218library;172SKILL entries |
| Local relative link existence | 596 checked;0 unresolved;370 daripada current entries |
| Historical payload preservation | 55/55 reconstructed SHA256 match;body/frontmatter asal retained |
| Skill library | 0 Git diff |
| Current document encoding | UTF8 tanpa BOM |
| Current docs credential-like values | Tiada full value dalam targeted pattern scan; bukan seluruh credential audit |
| Independent reviewer | APPROVE;0 actionable defects |
| git diff whitespace | PASS;CRLF normalization notices bukan whitespace error |

Receipt lokal: `var/lib/handover/doc-validation.json`, `annotation-manifest.json`, `historical-evidence-provenance.json`. Lapan public landing screenshot lama disalin byte-identical/hash-verified dari OS ke PLATFORM `var/log/hero-emons` untuk memulihkan16historical links. Ini **bukan QA baharu**. Artifacts ignored/local: clone baharu perlu bukti asal yang dibenarkan atau explicit unavailable annotation; jangan fabricate screenshot/receipt.

32 pautan file:///machine-specific lama dikekalkan sebagai provenance, bukan relative links portable atau verified current source. Tiada live server/API/DB cutover/provider/deploy/Emons resume dilakukan untuk menyiapkan handover. Test/build PASS dalam laporan alignment ialah receipt terdahulu, bukan rerun selepas documentation-only changes.

## Inventori satu row setiap fail

| # | Fail | Klasifikasi | Tindakan |
|---|---|---|---|
| 1 | [docs/ABANGCOLEK_DISCOVERY_AND_PLAN.md](../archive/legacy-oct2026/ABANGCOLEK_DISCOVERY_AND_PLAN.md) | HISTORICAL_PLAN | Authority banner + explicit errata; dipindahkan dari akar (F02); body preserved |
| 2 | [docs/ABANGCOLEK_OS_UPGRADE_BLUEPRINT.md](../archive/legacy-oct2026/ABANGCOLEK_OS_UPGRADE_BLUEPRINT.md) | HISTORICAL_PLAN | Authority banner; dipindahkan dari akar (F02); body preserved |
| 3 | [docs/design-qa.md](../design-qa.md) | HISTORICAL_SNAPSHOT | Authority banner; dipindahkan dari akar (F02); body preserved |
| 4 | [docs/ABANGCOLEK-SOURCE-OF-TRUTH.md](../ABANGCOLEK-SOURCE-OF-TRUTH.md) | CURRENT_AUTHORITY | Current entry; refresh receipt sebelum operasi |
| 5 | [docs/AUDIT_TERPERINCI_KESELURUHAN_PROJEK_ABANGCOLEK_OS.md](../archive/legacy-oct2026/AUDIT_TERPERINCI_KESELURUHAN_PROJEK_ABANGCOLEK_OS.md) | HISTORICAL_SNAPSHOT | Authority banner + explicit errata; body preserved |
| 6 | [docs/AUDIT_TERPERINCI_REPO_ABANG_COLEK_ECOSYSTEM.md](../archive/legacy-oct2026/AUDIT_TERPERINCI_REPO_ABANG_COLEK_ECOSYSTEM.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 7 | [docs/CADANGAN_PENAMBAHBAIKAN_DAN_TEMA_LOGO_ABANGCOLEK.md](../archive/legacy-oct2026/CADANGAN_PENAMBAHBAIKAN_DAN_TEMA_LOGO_ABANGCOLEK.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 8 | [docs/CARA_PENGOPERASIAN_SEPATUTNYA_ABANGCOLEK_OS.md](../archive/legacy-oct2026/CARA_PENGOPERASIAN_SEPATUTNYA_ABANGCOLEK_OS.md) | LEGACY_GUIDE | Authority banner; body preserved |
| 9 | [docs/decisions/0001-project-authority-and-continuity.md](../decisions/0001-project-authority-and-continuity.md) | CURRENT_AUTHORITY | Current entry; refresh receipt sebelum operasi |
| 10 | [docs/FORENSIK_AUDIT_LENGKAP_REPO_ABANG_COLEK.md](../archive/legacy-oct2026/FORENSIK_AUDIT_LENGKAP_REPO_ABANG_COLEK.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 11 | [docs/handover/AGENT-HANDOVER-A-Z.md](AGENT-HANDOVER-A-Z.md) | CURRENT_AUTHORITY | Current entry; refresh receipt sebelum operasi |
| 12 | [docs/handover/CAPABILITY-MATRIX.md](CAPABILITY-MATRIX.md) | CURRENT_AUTHORITY | Current entry; refresh receipt sebelum operasi |
| 13 | [docs/handover/MARKDOWN-ALIGNMENT-REGISTER.md](MARKDOWN-ALIGNMENT-REGISTER.md) | CURRENT_AUTHORITY | Current entry; refresh receipt sebelum operasi |
| 14 | [docs/JEV_ARCH.md](../archive/legacy-oct2026/JEV_ARCH.md) | HISTORICAL_SNAPSHOT | Authority banner + explicit errata; body preserved |
| 15 | [docs/JEV_ECOSYSTEM_AUDIT_REPORT.md](../archive/legacy-oct2026/JEV_ECOSYSTEM_AUDIT_REPORT.md) | HISTORICAL_SNAPSHOT | Authority banner + explicit errata; body preserved |
| 16 | [docs/KATALOG_DAN_PANDUAN_SKILL_EJEN_AI.md](../archive/legacy-oct2026/KATALOG_DAN_PANDUAN_SKILL_EJEN_AI.md) | LEGACY_GUIDE | Authority banner; body preserved |
| 17 | [docs/KEDUDUKAN_DAN_ARKITEKTUR_JEV_DALAM_PROJEK.md](../archive/legacy-oct2026/KEDUDUKAN_DAN_ARKITEKTUR_JEV_DALAM_PROJEK.md) | LEGACY_GUIDE | Authority banner; body preserved |
| 18 | [docs/PANDUAN_COMMAND_PALETTE.md](../archive/legacy-oct2026/PANDUAN_COMMAND_PALETTE.md) | LEGACY_GUIDE | Authority banner; body preserved |
| 19 | [docs/PANDUAN_DAN_PEMASANGAN_SUPERPOWERS_DAN_JEV_SKILLS.md](../archive/legacy-oct2026/PANDUAN_DAN_PEMASANGAN_SUPERPOWERS_DAN_JEV_SKILLS.md) | LEGACY_GUIDE | Authority banner; body preserved |
| 20 | [docs/PROJECT-ALIGNMENT-BACKLOG.md](../archive/legacy-oct2026/PROJECT-ALIGNMENT-BACKLOG.md) | CURRENT_AUTHORITY | Current entry; refresh receipt sebelum operasi |
| 21 | [docs/README.md](../README.md) | CURRENT_AUTHORITY | Current entry; refresh receipt sebelum operasi |
| 22 | [docs/REVIEW_HERMES_AGENT_DAN_DEEPSEEK_JEV_MERGE.md](../archive/legacy-oct2026/REVIEW_HERMES_AGENT_DAN_DEEPSEEK_JEV_MERGE.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 23 | [docs/runbooks/platform-recovery.md](../runbooks/platform-recovery.md) | CURRENT_AUTHORITY | Current entry; refresh receipt sebelum operasi |
| 24 | [docs/superpowers/plans/2026-10-02-platform-expansion.md](../superpowers/plans/2026-10-02-platform-expansion.md) | HISTORICAL_PLAN | Authority banner; body preserved |
| 25 | [docs/superpowers/plans/2026-10-03-emons-live-scene-upgrade.md](../superpowers/plans/2026-10-03-emons-live-scene-upgrade.md) | HISTORICAL_PLAN | Authority banner; body preserved |
| 26 | [docs/superpowers/plans/2026-10-03-emons-scroll-hero.md](../superpowers/plans/2026-10-03-emons-scroll-hero.md) | HISTORICAL_PLAN | Authority banner; body preserved |
| 27 | [docs/superpowers/plans/2026-10-03-project-alignment.md](../superpowers/plans/2026-10-03-project-alignment.md) | HISTORICAL_PLAN | Authority banner; body preserved |
| 28 | [JEV.md](../../JEV.md) | RESEARCH_REFERENCE | Authority banner + explicit errata; body preserved |
| 29 | [README.md](../../README.md) | CURRENT_AUTHORITY | Current entry; refresh receipt sebelum operasi |
| 30 | [reports/APA_YANG_DIBANGUNKAN_ABANGCOLEK_OS.md](../../reports/APA_YANG_DIBANGUNKAN_ABANGCOLEK_OS.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 31 | [reports/CODEX_REVIEW_MENYELURUH_ABANGCOLEK_OS_2026-10-01.md](../../reports/CODEX_REVIEW_MENYELURUH_ABANGCOLEK_OS_2026-10-01.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 32 | [reports/DASHBOARD_NEXT_LEVEL_2026-10-02.md](../../reports/DASHBOARD_NEXT_LEVEL_2026-10-02.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 33 | [reports/DASHBOARD_REFERENCE_REDESIGN_2026-10-02.md](../../reports/DASHBOARD_REFERENCE_REDESIGN_2026-10-02.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 34 | [reports/DASHBOARD_UI_UX_IMPLEMENTATION_2026-10-01.md](../../reports/DASHBOARD_UI_UX_IMPLEMENTATION_2026-10-01.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 35 | [reports/DELEGASI_JIMAT_TOKEN_AGY_HERMES_2026-10-03.md](../../reports/DELEGASI_JIMAT_TOKEN_AGY_HERMES_2026-10-03.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 36 | [reports/DESIGN_QA_HERO_EMONS_2026-10-03.md](../../reports/DESIGN_QA_HERO_EMONS_2026-10-03.md) | HISTORICAL_SNAPSHOT | Authority banner + explicit errata; body preserved |
| 37 | [reports/FORENSIK_AUDIT_JEV_DAN_KOD_ABANGCOLEK_OS_2026.md](../../reports/FORENSIK_AUDIT_JEV_DAN_KOD_ABANGCOLEK_OS_2026.md) | HISTORICAL_SNAPSHOT | Authority banner + explicit errata; body preserved |
| 38 | [reports/FORENSIK_AUDIT_LENGKAP_REPO_ABANG_COLEK.md](../../reports/FORENSIK_AUDIT_LENGKAP_REPO_ABANG_COLEK.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 39 | [reports/GLOBAL_THEME_SIDEBAR_IMPLEMENTATION_2026-10-02.md](../../reports/GLOBAL_THEME_SIDEBAR_IMPLEMENTATION_2026-10-02.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 40 | [reports/IMPLEMENTASI_HERO_EMONS_DAN_ASET_ASLI_ABANGCOLEK_2026-10-03.md](../../reports/IMPLEMENTASI_HERO_EMONS_DAN_ASET_ASLI_ABANGCOLEK_2026-10-03.md) | HISTORICAL_SNAPSHOT | Authority banner + explicit errata; body preserved |
| 41 | [reports/INVENTORI_IMEJ_PRODUK_ABANGCOLEK_2026-10-03.md](../../reports/INVENTORI_IMEJ_PRODUK_ABANGCOLEK_2026-10-03.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 42 | [reports/JEV_ECOSYSTEM_AUDIT_REPORT.md](../../reports/JEV_ECOSYSTEM_AUDIT_REPORT.md) | HISTORICAL_SNAPSHOT | Authority banner + explicit errata; body preserved |
| 43 | [reports/PLATFORM_EXPANSION_IMPLEMENTATION_2026-10-02.md](../../reports/PLATFORM_EXPANSION_IMPLEMENTATION_2026-10-02.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 44 | [reports/RECAP_SINTESIS_DAN_PELAKSANAAN_ABANGCOLEK_2026-10-02.md](../../reports/RECAP_SINTESIS_DAN_PELAKSANAAN_ABANGCOLEK_2026-10-02.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 45 | [reports/RESEARCH_DASHBOARD_WOW_FACTOR_RM300K_2026-10-01.md](../../reports/RESEARCH_DASHBOARD_WOW_FACTOR_RM300K_2026-10-01.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 46 | [reports/RESEARCH_PRODUK_SOSIAL_ABANGCOLEK_2026-10-03.md](../../reports/RESEARCH_PRODUK_SOSIAL_ABANGCOLEK_2026-10-03.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 47 | [reports/research/2026-10-02/01_GROK_BOT_OVERVIEW.md](../../reports/research/2026-10-02/01_GROK_BOT_OVERVIEW.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 48 | [reports/research/2026-10-02/02_META_MUSE.md](../../reports/research/2026-10-02/02_META_MUSE.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 49 | [reports/research/2026-10-02/03_OPENAI_INTRODUCING_DOTS.md](../../reports/research/2026-10-02/03_OPENAI_INTRODUCING_DOTS.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 50 | [reports/research/2026-10-02/04_DEEPSEEK_HARNESS_QUICKSTART.md](../../reports/research/2026-10-02/04_DEEPSEEK_HARNESS_QUICKSTART.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 51 | [reports/research/2026-10-02/05_HERMES_AGENT_DOCS.md](../../reports/research/2026-10-02/05_HERMES_AGENT_DOCS.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 52 | [reports/research/2026-10-02/06_JEV_SYNTHESIS_ABANGCOLEK_OS.md](../../reports/research/2026-10-02/06_JEV_SYNTHESIS_ABANGCOLEK_OS.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 53 | [reports/research/2026-10-02/07_PELAN_UPGRADE_ABANGCOLEK_OS.md](../../reports/research/2026-10-02/07_PELAN_UPGRADE_ABANGCOLEK_OS.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 54 | [reports/research/2026-10-02/08_WHATSAPP_FLOW_ZERO_COST.md](../../reports/research/2026-10-02/08_WHATSAPP_FLOW_ZERO_COST.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 55 | [reports/research/2026-10-02/09_PLATFORM_EXPANSION_ZERO_COST_MASTERPLAN.md](../../reports/research/2026-10-02/09_PLATFORM_EXPANSION_ZERO_COST_MASTERPLAN.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 56 | [reports/research/2026-10-02/10_AGENT_STOKIS_BUSINESS_SYSTEM.md](../../reports/research/2026-10-02/10_AGENT_STOKIS_BUSINESS_SYSTEM.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 57 | [reports/research/2026-10-02/11_MARKETING_SOCIAL_AUTOMATION_POSTIZ_AGENT_REACH.md](../../reports/research/2026-10-02/11_MARKETING_SOCIAL_AUTOMATION_POSTIZ_AGENT_REACH.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 58 | [reports/research/2026-10-02/12_JEV_PLATFORM_CAPABILITY_PLAN.md](../../reports/research/2026-10-02/12_JEV_PLATFORM_CAPABILITY_PLAN.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 59 | [reports/research/2026-10-02/README.md](../../reports/research/2026-10-02/README.md) | RESEARCH_REFERENCE | Authority banner; body preserved |
| 60 | [reports/REVIEW_GOOGLE_AI_STUDIO_ABANGCOLEK_2026-10-03.md](../../reports/REVIEW_GOOGLE_AI_STUDIO_ABANGCOLEK_2026-10-03.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 61 | [reports/REVIEW_KONSEP_EMONS_DAN_LANDING_ABANGCOLEK_2026-10-03.md](../../reports/REVIEW_KONSEP_EMONS_DAN_LANDING_ABANGCOLEK_2026-10-03.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 62 | [reports/REVIEW_LIVE_SCROLL_EMONS_2026-10-03.md](../../reports/REVIEW_LIVE_SCROLL_EMONS_2026-10-03.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 63 | [reports/REVIEW_SHARED_CHAT_6AC065B1_2026-10-03.md](../../reports/REVIEW_SHARED_CHAT_6AC065B1_2026-10-03.md) | HISTORICAL_SNAPSHOT | Authority banner; body preserved |
| 64 | [reports/SINTESIS_DAN_ALIGNMENT_ABANGCOLEK_2026-10-03.md](../../reports/SINTESIS_DAN_ALIGNMENT_ABANGCOLEK_2026-10-03.md) | HISTORICAL_SNAPSHOT | Authority banner + explicit errata; body preserved |
| 65 | [docs/handover/AGY-MASTER-IMPLEMENTATION-PROMPT.md](AGY-MASTER-IMPLEMENTATION-PROMPT.md) | IMPLEMENTATION_PROMPT | Master implementation brief untuk penerima; 18 work items |
| 66 | [docs/runbooks/credential-revocation-audit.md](../runbooks/credential-revocation-audit.md) | CURRENT_AUTHORITY | Prosedur audit dan pusingan token pemilik (B01) |
| 67 | [docs/decisions/0002-zero-new-spend-hosting-topology.md](../decisions/0002-zero-new-spend-hosting-topology.md) | CURRENT_AUTHORITY | Topologi hosting Bun + SQLite sifar kos (C02) |
| 68 | [docs/research/RESEARCH-DISPOSITION-MATRIX.md](../research/RESEARCH-DISPOSITION-MATRIX.md) | CURRENT_AUTHORITY | Matriks disposisi 5 aliran research (E05) |
| 65 | [skills/architecture-design/api-design-and-versioning/SKILL.md](../../skills/architecture-design/api-design-and-versioning/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 66 | [skills/architecture-design/api-gateway-configurator/SKILL.md](../../skills/architecture-design/api-gateway-configurator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 67 | [skills/architecture-design/clean-architecture-scaffolder/SKILL.md](../../skills/architecture-design/clean-architecture-scaffolder/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 68 | [skills/architecture-design/contract-first-api-development/SKILL.md](../../skills/architecture-design/contract-first-api-development/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 69 | [skills/architecture-design/distributed-system-patterns/SKILL.md](../../skills/architecture-design/distributed-system-patterns/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 70 | [skills/architecture-design/domain-driven-design-builder/SKILL.md](../../skills/architecture-design/domain-driven-design-builder/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 71 | [skills/architecture-design/event-driven-system-designer/SKILL.md](../../skills/architecture-design/event-driven-system-designer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 72 | [skills/architecture-design/hexagonal-architecture-builder/SKILL.md](../../skills/architecture-design/hexagonal-architecture-builder/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 73 | [skills/architecture-design/microservices-architect/SKILL.md](../../skills/architecture-design/microservices-architect/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 74 | [skills/architecture-design/modular-monolith-designer/SKILL.md](../../skills/architecture-design/modular-monolith-designer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 75 | [skills/architecture-design/monolith-to-microservices-migrator/SKILL.md](../../skills/architecture-design/monolith-to-microservices-migrator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 76 | [skills/architecture-design/multi-tenancy-architect/SKILL.md](../../skills/architecture-design/multi-tenancy-architect/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 77 | [skills/architecture-design/real-time-system-designer/SKILL.md](../../skills/architecture-design/real-time-system-designer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 78 | [skills/architecture-design/serverless-architecture-generator/SKILL.md](../../skills/architecture-design/serverless-architecture-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 79 | [skills/architecture-design/system-design-documentation/SKILL.md](../../skills/architecture-design/system-design-documentation/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 80 | [skills/codegen-scaffolding/api-mocking-server/SKILL.md](../../skills/codegen-scaffolding/api-mocking-server/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 81 | [skills/codegen-scaffolding/boilerplate-project-scaffolder/SKILL.md](../../skills/codegen-scaffolding/boilerplate-project-scaffolder/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 82 | [skills/codegen-scaffolding/cli-tool-builder/SKILL.md](../../skills/codegen-scaffolding/cli-tool-builder/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 83 | [skills/codegen-scaffolding/code-template-engine/SKILL.md](../../skills/codegen-scaffolding/code-template-engine/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 84 | [skills/codegen-scaffolding/component-library-creator/SKILL.md](../../skills/codegen-scaffolding/component-library-creator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 85 | [skills/codegen-scaffolding/crud-generator/SKILL.md](../../skills/codegen-scaffolding/crud-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 86 | [skills/codegen-scaffolding/database-schema-generator/SKILL.md](../../skills/codegen-scaffolding/database-schema-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 87 | [skills/codegen-scaffolding/dockerfile-generator/SKILL.md](../../skills/codegen-scaffolding/dockerfile-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 88 | [skills/codegen-scaffolding/full-stack-feature-generator/SKILL.md](../../skills/codegen-scaffolding/full-stack-feature-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 89 | [skills/codegen-scaffolding/github-actions-workflow/SKILL.md](../../skills/codegen-scaffolding/github-actions-workflow/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 90 | [skills/codegen-scaffolding/graphql-schema-builder/SKILL.md](../../skills/codegen-scaffolding/graphql-schema-builder/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 91 | [skills/codegen-scaffolding/mock-data-generator/SKILL.md](../../skills/codegen-scaffolding/mock-data-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 92 | [skills/codegen-scaffolding/openapi-code-generator/SKILL.md](../../skills/codegen-scaffolding/openapi-code-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 93 | [skills/codegen-scaffolding/react-hook-generator/SKILL.md](../../skills/codegen-scaffolding/react-hook-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 94 | [skills/codegen-scaffolding/terraform-module-generator/SKILL.md](../../skills/codegen-scaffolding/terraform-module-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 95 | [skills/data-analytics/analytics-dashboard-generator/SKILL.md](../../skills/data-analytics/analytics-dashboard-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 96 | [skills/data-analytics/cdc-pipeline/SKILL.md](../../skills/data-analytics/cdc-pipeline/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 97 | [skills/data-analytics/data-catalog-creator/SKILL.md](../../skills/data-analytics/data-catalog-creator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 98 | [skills/data-analytics/data-lake-architecture/SKILL.md](../../skills/data-analytics/data-lake-architecture/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 99 | [skills/data-analytics/data-mesh-implementation/SKILL.md](../../skills/data-analytics/data-mesh-implementation/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 100 | [skills/data-analytics/data-pipeline-builder/SKILL.md](../../skills/data-analytics/data-pipeline-builder/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 101 | [skills/data-analytics/data-quality-framework/SKILL.md](../../skills/data-analytics/data-quality-framework/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 102 | [skills/data-analytics/data-warehouse-designer/SKILL.md](../../skills/data-analytics/data-warehouse-designer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 103 | [skills/data-analytics/database-migration-orchestrator/SKILL.md](../../skills/data-analytics/database-migration-orchestrator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 104 | [skills/data-analytics/feature-store-builder/SKILL.md](../../skills/data-analytics/feature-store-builder/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 105 | [skills/data-analytics/graph-database-modeler/SKILL.md](../../skills/data-analytics/graph-database-modeler/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 106 | [skills/data-analytics/ml-model-deployment/SKILL.md](../../skills/data-analytics/ml-model-deployment/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 107 | [skills/data-analytics/sql-query-optimizer/SKILL.md](../../skills/data-analytics/sql-query-optimizer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 108 | [skills/data-analytics/stream-processing/SKILL.md](../../skills/data-analytics/stream-processing/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 109 | [skills/data-analytics/time-series-database/SKILL.md](../../skills/data-analytics/time-series-database/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 110 | [skills/devops-infra/alerting-and-monitoring/SKILL.md](../../skills/devops-infra/alerting-and-monitoring/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 111 | [skills/devops-infra/build-optimization/SKILL.md](../../skills/devops-infra/build-optimization/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 112 | [skills/devops-infra/ci-cd-pipeline-orchestrator/SKILL.md](../../skills/devops-infra/ci-cd-pipeline-orchestrator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 113 | [skills/devops-infra/cloud-migration/SKILL.md](../../skills/devops-infra/cloud-migration/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 114 | [skills/devops-infra/configuration-management/SKILL.md](../../skills/devops-infra/configuration-management/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 115 | [skills/devops-infra/container-orchestration/SKILL.md](../../skills/devops-infra/container-orchestration/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 116 | [skills/devops-infra/cost-optimization/SKILL.md](../../skills/devops-infra/cost-optimization/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 117 | [skills/devops-infra/database-administration-automation/SKILL.md](../../skills/devops-infra/database-administration-automation/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 118 | [skills/devops-infra/disaster-recovery-planner/SKILL.md](../../skills/devops-infra/disaster-recovery-planner/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 119 | [skills/devops-infra/gitops-workflow/SKILL.md](../../skills/devops-infra/gitops-workflow/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 120 | [skills/devops-infra/infrastructure-as-code-generator/SKILL.md](../../skills/devops-infra/infrastructure-as-code-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 121 | [skills/devops-infra/kubernetes-cluster-manager/SKILL.md](../../skills/devops-infra/kubernetes-cluster-manager/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 122 | [skills/devops-infra/logging-aggregation/SKILL.md](../../skills/devops-infra/logging-aggregation/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 123 | [skills/devops-infra/multi-region-deployment/SKILL.md](../../skills/devops-infra/multi-region-deployment/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 124 | [skills/devops-infra/network-infrastructure/SKILL.md](../../skills/devops-infra/network-infrastructure/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 125 | [skills/devops-infra/observability-stack/SKILL.md](../../skills/devops-infra/observability-stack/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 126 | [skills/devops-infra/rolling-update-strategies/SKILL.md](../../skills/devops-infra/rolling-update-strategies/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 127 | [skills/devops-infra/secret-injection/SKILL.md](../../skills/devops-infra/secret-injection/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 128 | [skills/devops-infra/serverless-framework/SKILL.md](../../skills/devops-infra/serverless-framework/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 129 | [skills/devops-infra/service-mesh-configurator/SKILL.md](../../skills/devops-infra/service-mesh-configurator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 130 | [skills/documentation-knowledge/api-documentation/SKILL.md](../../skills/documentation-knowledge/api-documentation/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 131 | [skills/documentation-knowledge/architecture-decision-records/SKILL.md](../../skills/documentation-knowledge/architecture-decision-records/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 132 | [skills/documentation-knowledge/changelog-automation/SKILL.md](../../skills/documentation-knowledge/changelog-automation/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 133 | [skills/documentation-knowledge/code-comment-enricher/SKILL.md](../../skills/documentation-knowledge/code-comment-enricher/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 134 | [skills/documentation-knowledge/database-schema-documentation/SKILL.md](../../skills/documentation-knowledge/database-schema-documentation/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 135 | [skills/documentation-knowledge/dependency-graph-visualizer/SKILL.md](../../skills/documentation-knowledge/dependency-graph-visualizer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 136 | [skills/documentation-knowledge/diagram-as-code/SKILL.md](../../skills/documentation-knowledge/diagram-as-code/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 137 | [skills/documentation-knowledge/incident-post-mortem/SKILL.md](../../skills/documentation-knowledge/incident-post-mortem/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 138 | [skills/documentation-knowledge/knowledge-base-builder/SKILL.md](../../skills/documentation-knowledge/knowledge-base-builder/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 139 | [skills/documentation-knowledge/living-documentation-generator/SKILL.md](../../skills/documentation-knowledge/living-documentation-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 140 | [skills/documentation-knowledge/onboarding-guide-creator/SKILL.md](../../skills/documentation-knowledge/onboarding-guide-creator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 141 | [skills/documentation-knowledge/performance-baseline-documentation/SKILL.md](../../skills/documentation-knowledge/performance-baseline-documentation/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 142 | [skills/documentation-knowledge/readme-generator/SKILL.md](../../skills/documentation-knowledge/readme-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 143 | [skills/documentation-knowledge/runbook-generator/SKILL.md](../../skills/documentation-knowledge/runbook-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 144 | [skills/documentation-knowledge/tutorial-generator/SKILL.md](../../skills/documentation-knowledge/tutorial-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 145 | [skills/jev-core/agentic-levels/jev-10-levels-agentic-engineers/SKILL.md](../../skills/jev-core/agentic-levels/jev-10-levels-agentic-engineers/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 146 | [skills/jev-core/agentic-levels/jev-advanced-use-cases/SKILL.md](../../skills/jev-core/agentic-levels/jev-advanced-use-cases/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 147 | [skills/jev-core/agents-that-act/agent-desktop/SKILL.md](../../skills/jev-core/agents-that-act/agent-desktop/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 148 | [skills/jev-core/agents-that-act/blink/SKILL.md](../../skills/jev-core/agents-that-act/blink/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 149 | [skills/jev-core/agents-that-act/jev-drone/SKILL.md](../../skills/jev-core/agents-that-act/jev-drone/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 150 | [skills/jev-core/agents-that-act/jev-ultrafast/SKILL.md](../../skills/jev-core/agents-that-act/jev-ultrafast/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 151 | [skills/jev-core/build-and-judge/canny/SKILL.md](../../skills/jev-core/build-and-judge/canny/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 152 | [skills/jev-core/build-and-judge/jev-curate/SKILL.md](../../skills/jev-core/build-and-judge/jev-curate/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 153 | [skills/jev-core/build-and-judge/json-render/SKILL.md](../../skills/jev-core/build-and-judge/json-render/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 154 | [skills/jev-core/build-and-judge/killmyidea/SKILL.md](../../skills/jev-core/build-and-judge/killmyidea/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 155 | [skills/jev-core/context-and-memory/fast-jev-compaction/SKILL.md](../../skills/jev-core/context-and-memory/fast-jev-compaction/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 156 | [skills/jev-core/context-and-memory/neo4jev/SKILL.md](../../skills/jev-core/context-and-memory/neo4jev/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 157 | [skills/jev-core/context-and-memory/semdecide/SKILL.md](../../skills/jev-core/context-and-memory/semdecide/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 158 | [skills/jev-core/context-and-memory/winnow/SKILL.md](../../skills/jev-core/context-and-memory/winnow/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 159 | [skills/jev-core/dev-workflow/jev-codex-router/SKILL.md](../../skills/jev-core/dev-workflow/jev-codex-router/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 160 | [skills/jev-core/dev-workflow/jev-mcp/SKILL.md](../../skills/jev-core/dev-workflow/jev-mcp/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 161 | [skills/jev-core/dev-workflow/jev-review/SKILL.md](../../skills/jev-core/dev-workflow/jev-review/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 162 | [skills/jev-core/dev-workflow/typesafe-mcp/SKILL.md](../../skills/jev-core/dev-workflow/typesafe-mcp/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 163 | [skills/jev-core/markets-and-play/jev-trader/SKILL.md](../../skills/jev-core/markets-and-play/jev-trader/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 164 | [skills/jev-core/markets-and-play/onevonejev/SKILL.md](../../skills/jev-core/markets-and-play/onevonejev/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 165 | [skills/jev-core/markets-and-play/prism/SKILL.md](../../skills/jev-core/markets-and-play/prism/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 166 | [skills/jev-core/markets-and-play/typesafe-mario/SKILL.md](../../skills/jev-core/markets-and-play/typesafe-mario/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 167 | [skills/maintenance-optimization/api-response-optimizer/SKILL.md](../../skills/maintenance-optimization/api-response-optimizer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 168 | [skills/maintenance-optimization/bundle-size-optimizer/SKILL.md](../../skills/maintenance-optimization/bundle-size-optimizer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 169 | [skills/maintenance-optimization/cache-strategy-implementer/SKILL.md](../../skills/maintenance-optimization/cache-strategy-implementer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 170 | [skills/maintenance-optimization/code-complexity-reducer/SKILL.md](../../skills/maintenance-optimization/code-complexity-reducer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 171 | [skills/maintenance-optimization/code-duplication-remover/SKILL.md](../../skills/maintenance-optimization/code-duplication-remover/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 172 | [skills/maintenance-optimization/container-image-optimizer/SKILL.md](../../skills/maintenance-optimization/container-image-optimizer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 173 | [skills/maintenance-optimization/database-query-optimizer/SKILL.md](../../skills/maintenance-optimization/database-query-optimizer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 174 | [skills/maintenance-optimization/dead-code-eliminator/SKILL.md](../../skills/maintenance-optimization/dead-code-eliminator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 175 | [skills/maintenance-optimization/dependency-updater/SKILL.md](../../skills/maintenance-optimization/dependency-updater/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 176 | [skills/maintenance-optimization/error-handling-standardizer/SKILL.md](../../skills/maintenance-optimization/error-handling-standardizer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 177 | [skills/maintenance-optimization/logging-optimizer/SKILL.md](../../skills/maintenance-optimization/logging-optimizer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 178 | [skills/maintenance-optimization/memory-leak-detector/SKILL.md](../../skills/maintenance-optimization/memory-leak-detector/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 179 | [skills/maintenance-optimization/performance-optimizer/SKILL.md](../../skills/maintenance-optimization/performance-optimizer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 180 | [skills/maintenance-optimization/smart-refactoring-engine/SKILL.md](../../skills/maintenance-optimization/smart-refactoring-engine/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 181 | [skills/maintenance-optimization/technical-debt-analyzer/SKILL.md](../../skills/maintenance-optimization/technical-debt-analyzer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 182 | [skills/meta/architecture-review-and-approval/SKILL.md](../../skills/meta/architecture-review-and-approval/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 183 | [skills/meta/change-management-and-rollback/SKILL.md](../../skills/meta/change-management-and-rollback/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 184 | [skills/meta/compliance-evidence-pack/SKILL.md](../../skills/meta/compliance-evidence-pack/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 185 | [skills/meta/delivery-checklist-and-handoff/SKILL.md](../../skills/meta/delivery-checklist-and-handoff/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 186 | [skills/meta/multi-skill-orchestration/SKILL.md](../../skills/meta/multi-skill-orchestration/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 187 | [skills/meta/performance-budgeting/SKILL.md](../../skills/meta/performance-budgeting/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 188 | [skills/meta/risk-and-assumption-tracker/SKILL.md](../../skills/meta/risk-and-assumption-tracker/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 189 | [skills/meta/skill-intake-and-triage/SKILL.md](../../skills/meta/skill-intake-and-triage/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 190 | [skills/meta/skill-quality-gate/SKILL.md](../../skills/meta/skill-quality-gate/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 191 | [skills/meta/stack-profile-manager/SKILL.md](../../skills/meta/stack-profile-manager/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 192 | [skills/security-compliance/access-control-matrix/SKILL.md](../../skills/security-compliance/access-control-matrix/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 193 | [skills/security-compliance/api-security-enforcer/SKILL.md](../../skills/security-compliance/api-security-enforcer/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 194 | [skills/security-compliance/audit-logger/SKILL.md](../../skills/security-compliance/audit-logger/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 195 | [skills/security-compliance/authentication-system-builder/SKILL.md](../../skills/security-compliance/authentication-system-builder/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 196 | [skills/security-compliance/certificate-manager/SKILL.md](../../skills/security-compliance/certificate-manager/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 197 | [skills/security-compliance/compliance-checker/SKILL.md](../../skills/security-compliance/compliance-checker/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 198 | [skills/security-compliance/container-security-scanner/SKILL.md](../../skills/security-compliance/container-security-scanner/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 199 | [skills/security-compliance/data-privacy-guardian/SKILL.md](../../skills/security-compliance/data-privacy-guardian/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 200 | [skills/security-compliance/penetration-testing-runner/SKILL.md](../../skills/security-compliance/penetration-testing-runner/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 201 | [skills/security-compliance/secrets-management/SKILL.md](../../skills/security-compliance/secrets-management/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 202 | [skills/security-compliance/security-hardening-auditor/SKILL.md](../../skills/security-compliance/security-hardening-auditor/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 203 | [skills/security-compliance/security-incident-response/SKILL.md](../../skills/security-compliance/security-incident-response/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 204 | [skills/security-compliance/supply-chain-security/SKILL.md](../../skills/security-compliance/supply-chain-security/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 205 | [skills/security-compliance/threat-modeling-framework/SKILL.md](../../skills/security-compliance/threat-modeling-framework/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 206 | [skills/security-compliance/zero-trust-architecture/SKILL.md](../../skills/security-compliance/zero-trust-architecture/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 207 | [skills/STACK_PROFILES.md](../../skills/STACK_PROFILES.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 208 | [skills/superpowers/brainstorming/SKILL.md](../../skills/superpowers/brainstorming/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 209 | [skills/superpowers/brainstorming/spec-document-reviewer-prompt.md](../../skills/superpowers/brainstorming/spec-document-reviewer-prompt.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 210 | [skills/superpowers/brainstorming/visual-companion.md](../../skills/superpowers/brainstorming/visual-companion.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 211 | [skills/superpowers/diagnosing-superpowers/prompts/analyst-common.md](../../skills/superpowers/diagnosing-superpowers/prompts/analyst-common.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 212 | [skills/superpowers/diagnosing-superpowers/prompts/cost-and-time.md](../../skills/superpowers/diagnosing-superpowers/prompts/cost-and-time.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 213 | [skills/superpowers/diagnosing-superpowers/prompts/plan-adherence.md](../../skills/superpowers/diagnosing-superpowers/prompts/plan-adherence.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 214 | [skills/superpowers/diagnosing-superpowers/prompts/quality-evidence.md](../../skills/superpowers/diagnosing-superpowers/prompts/quality-evidence.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 215 | [skills/superpowers/diagnosing-superpowers/prompts/repeated-work.md](../../skills/superpowers/diagnosing-superpowers/prompts/repeated-work.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 216 | [skills/superpowers/diagnosing-superpowers/prompts/request-conflicts.md](../../skills/superpowers/diagnosing-superpowers/prompts/request-conflicts.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 217 | [skills/superpowers/diagnosing-superpowers/prompts/scrub-audit.md](../../skills/superpowers/diagnosing-superpowers/prompts/scrub-audit.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 218 | [skills/superpowers/diagnosing-superpowers/prompts/scrub.md](../../skills/superpowers/diagnosing-superpowers/prompts/scrub.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 219 | [skills/superpowers/diagnosing-superpowers/prompts/similar-session.md](../../skills/superpowers/diagnosing-superpowers/prompts/similar-session.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 220 | [skills/superpowers/diagnosing-superpowers/prompts/skill-timeline.md](../../skills/superpowers/diagnosing-superpowers/prompts/skill-timeline.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 221 | [skills/superpowers/diagnosing-superpowers/prompts/stumbles.md](../../skills/superpowers/diagnosing-superpowers/prompts/stumbles.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 222 | [skills/superpowers/diagnosing-superpowers/references/context-safety.md](../../skills/superpowers/diagnosing-superpowers/references/context-safety.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 223 | [skills/superpowers/diagnosing-superpowers/references/github-issues.md](../../skills/superpowers/diagnosing-superpowers/references/github-issues.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 224 | [skills/superpowers/diagnosing-superpowers/references/redaction-policy.md](../../skills/superpowers/diagnosing-superpowers/references/redaction-policy.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 225 | [skills/superpowers/diagnosing-superpowers/references/session-discovery.md](../../skills/superpowers/diagnosing-superpowers/references/session-discovery.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 226 | [skills/superpowers/diagnosing-superpowers/SKILL.md](../../skills/superpowers/diagnosing-superpowers/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 227 | [skills/superpowers/diagnosing-superpowers/templates/bundle-README.md](../../skills/superpowers/diagnosing-superpowers/templates/bundle-README.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 228 | [skills/superpowers/diagnosing-superpowers/templates/case.md](../../skills/superpowers/diagnosing-superpowers/templates/case.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 229 | [skills/superpowers/diagnosing-superpowers/templates/issue.md](../../skills/superpowers/diagnosing-superpowers/templates/issue.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 230 | [skills/superpowers/diagnosing-superpowers/templates/report.md](../../skills/superpowers/diagnosing-superpowers/templates/report.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 231 | [skills/superpowers/dispatching-parallel-agents/SKILL.md](../../skills/superpowers/dispatching-parallel-agents/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 232 | [skills/superpowers/executing-plans/SKILL.md](../../skills/superpowers/executing-plans/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 233 | [skills/superpowers/finishing-a-development-branch/SKILL.md](../../skills/superpowers/finishing-a-development-branch/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 234 | [skills/superpowers/receiving-code-review/SKILL.md](../../skills/superpowers/receiving-code-review/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 235 | [skills/superpowers/requesting-code-review/code-reviewer.md](../../skills/superpowers/requesting-code-review/code-reviewer.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 236 | [skills/superpowers/requesting-code-review/SKILL.md](../../skills/superpowers/requesting-code-review/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 237 | [skills/superpowers/subagent-driven-development/implementer-prompt.md](../../skills/superpowers/subagent-driven-development/implementer-prompt.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 238 | [skills/superpowers/subagent-driven-development/re-review-prompt.md](../../skills/superpowers/subagent-driven-development/re-review-prompt.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 239 | [skills/superpowers/subagent-driven-development/SKILL.md](../../skills/superpowers/subagent-driven-development/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 240 | [skills/superpowers/subagent-driven-development/task-reviewer-prompt.md](../../skills/superpowers/subagent-driven-development/task-reviewer-prompt.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 241 | [skills/superpowers/systematic-debugging/condition-based-waiting.md](../../skills/superpowers/systematic-debugging/condition-based-waiting.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 242 | [skills/superpowers/systematic-debugging/CREATION-LOG.md](../../skills/superpowers/systematic-debugging/CREATION-LOG.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 243 | [skills/superpowers/systematic-debugging/defense-in-depth.md](../../skills/superpowers/systematic-debugging/defense-in-depth.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 244 | [skills/superpowers/systematic-debugging/root-cause-tracing.md](../../skills/superpowers/systematic-debugging/root-cause-tracing.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 245 | [skills/superpowers/systematic-debugging/SKILL.md](../../skills/superpowers/systematic-debugging/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 246 | [skills/superpowers/systematic-debugging/test-academic.md](../../skills/superpowers/systematic-debugging/test-academic.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 247 | [skills/superpowers/systematic-debugging/test-pressure-1.md](../../skills/superpowers/systematic-debugging/test-pressure-1.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 248 | [skills/superpowers/systematic-debugging/test-pressure-2.md](../../skills/superpowers/systematic-debugging/test-pressure-2.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 249 | [skills/superpowers/systematic-debugging/test-pressure-3.md](../../skills/superpowers/systematic-debugging/test-pressure-3.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 250 | [skills/superpowers/test-driven-development/SKILL.md](../../skills/superpowers/test-driven-development/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 251 | [skills/superpowers/test-driven-development/writing-good-tests.md](../../skills/superpowers/test-driven-development/writing-good-tests.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 252 | [skills/superpowers/using-git-worktrees/SKILL.md](../../skills/superpowers/using-git-worktrees/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 253 | [skills/superpowers/using-superpowers/references/antigravity-tools.md](../../skills/superpowers/using-superpowers/references/antigravity-tools.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 254 | [skills/superpowers/using-superpowers/references/claude-code-tools.md](../../skills/superpowers/using-superpowers/references/claude-code-tools.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 255 | [skills/superpowers/using-superpowers/references/codex-tools.md](../../skills/superpowers/using-superpowers/references/codex-tools.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 256 | [skills/superpowers/using-superpowers/references/gemini-tools.md](../../skills/superpowers/using-superpowers/references/gemini-tools.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 257 | [skills/superpowers/using-superpowers/references/hermes-tools.md](../../skills/superpowers/using-superpowers/references/hermes-tools.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 258 | [skills/superpowers/using-superpowers/references/muse-tools.md](../../skills/superpowers/using-superpowers/references/muse-tools.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 259 | [skills/superpowers/using-superpowers/references/pi-tools.md](../../skills/superpowers/using-superpowers/references/pi-tools.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 260 | [skills/superpowers/using-superpowers/SKILL.md](../../skills/superpowers/using-superpowers/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 261 | [skills/superpowers/verification-before-completion/SKILL.md](../../skills/superpowers/verification-before-completion/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 262 | [skills/superpowers/writing-plans/SKILL.md](../../skills/superpowers/writing-plans/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 263 | [skills/superpowers/writing-skills/anthropic-best-practices.md](../../skills/superpowers/writing-skills/anthropic-best-practices.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 264 | [skills/superpowers/writing-skills/examples/CLAUDE_MD_TESTING.md](../../skills/superpowers/writing-skills/examples/CLAUDE_MD_TESTING.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 265 | [skills/superpowers/writing-skills/persuasion-principles.md](../../skills/superpowers/writing-skills/persuasion-principles.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 266 | [skills/superpowers/writing-skills/SKILL.md](../../skills/superpowers/writing-skills/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 267 | [skills/superpowers/writing-skills/testing-skills-with-subagents.md](../../skills/superpowers/writing-skills/testing-skills-with-subagents.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 268 | [skills/testing-quality/accessibility-testing/SKILL.md](../../skills/testing-quality/accessibility-testing/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 269 | [skills/testing-quality/api-testing-suite/SKILL.md](../../skills/testing-quality/api-testing-suite/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 270 | [skills/testing-quality/chaos-engineering-runner/SKILL.md](../../skills/testing-quality/chaos-engineering-runner/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 271 | [skills/testing-quality/contract-testing/SKILL.md](../../skills/testing-quality/contract-testing/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 272 | [skills/testing-quality/cross-browser-testing/SKILL.md](../../skills/testing-quality/cross-browser-testing/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 273 | [skills/testing-quality/database-testing/SKILL.md](../../skills/testing-quality/database-testing/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 274 | [skills/testing-quality/fuzz-testing/SKILL.md](../../skills/testing-quality/fuzz-testing/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 275 | [skills/testing-quality/mobile-testing-framework/SKILL.md](../../skills/testing-quality/mobile-testing-framework/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 276 | [skills/testing-quality/performance-testing-framework/SKILL.md](../../skills/testing-quality/performance-testing-framework/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 277 | [skills/testing-quality/property-based-testing/SKILL.md](../../skills/testing-quality/property-based-testing/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 278 | [skills/testing-quality/security-testing-automation/SKILL.md](../../skills/testing-quality/security-testing-automation/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 279 | [skills/testing-quality/smoke-test-generator/SKILL.md](../../skills/testing-quality/smoke-test-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 280 | [skills/testing-quality/snapshot-testing/SKILL.md](../../skills/testing-quality/snapshot-testing/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 281 | [skills/testing-quality/test-automation-suite-generator/SKILL.md](../../skills/testing-quality/test-automation-suite-generator/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 282 | [skills/testing-quality/visual-regression-tester/SKILL.md](../../skills/testing-quality/visual-regression-tester/SKILL.md) | SKILL_LIBRARY | Unchanged; guidance sahaja |
| 283 | [docs/handover/AGY-MASTER-IMPLEMENTATION-PROMPT.md](AGY-MASTER-IMPLEMENTATION-PROMPT.md) | IMPLEMENTATION_PROMPT | All18work items, ownership, tools/skills, acceptance, input/provider gates dan continuation; bukan completion receipt |
 
## Current overlay — 16 Oktober 2026

Dokumen berikut ditambah selepas baseline 4 Oktober dan menjadi current authority untuk perubahan terbaru:

| Fail | Klasifikasi | Maksud |
|---|---|---|
| [docs/ABANGCOLEK-PLATFORM-STATUS-2026-10-16.md](../archive/legacy-oct2026/ABANGCOLEK-PLATFORM-STATUS-2026-10-16.md) | CURRENT_SNAPSHOT | Status runtime/UI Social, Plugins, Automation, Founder login dan verification terkini |
| [docs/AI-AGENT-ARCHITECTURE.md](../AI-AGENT-ARCHITECTURE.md) | CURRENT_DESIGN | Role packs, provider abstraction, tool access, approval dan mobile-first boundary |
| [docs/AI-AGENT-ROADMAP.md](../AI-AGENT-ROADMAP.md) | CURRENT_PLAN | Phase implementation dan definition of done; bukan receipt |
| [docs/AI-PROVIDER-FREE-MODELS-REGISTER.md](../AI-PROVIDER-FREE-MODELS-REGISTER.md) | RESEARCH_REGISTER | Catalog schema dan status verification provider/free model |

Historical reports dan `var/` logs tidak ditulis semula kerana ia mengekalkan provenance. `.kilo/worktrees/`, `node_modules/` dan `dist/` kekal di luar scope canonical docs. Jika dokumen lama bercanggah dengan overlay ini, gunakan current overlay bersama test/runtime receipt terbaru.
