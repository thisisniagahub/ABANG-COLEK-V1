# ADR-0001 — project authority dan continuity

<!-- ABANGCOLEK-CURRENT-STATUS:BEGIN -->
> **Alignment20Oktober2026:** [Status semasa](../CURRENT-STATUS.md) · [Checklist](../../PROJECT-CHECKLIST.md). Panduan aktif mengikut skop fail ini. Fakta source/runtime dan ownership semasa dirujuk di atas; arahan atau baseline bertarikh lama memerlukan revalidation. Tiada acceptance aplikasi ditutup oleh alignment dokumentasi.
<!-- ABANGCOLEK-CURRENT-STATUS:END -->

> **Alignment 19 Oktober 2026:** Keputusan source PLATFORM dan pemisahan evidence kekal. Snapshot runtime/data/proses di bawah ialah sejarah 3–4 Oktober. [ADR-0003](0003-blueprint-v23-execution-contract.md) dan [master blueprint v2.4](../ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md) mengatasi pilihan topology/provider yang bercanggah. Tiada data cutover dilakukan melalui dokumentasi ini. Arahan pelaksanaan semasa: [prompt utama](../prompts/IMPLEMENT-ABANGCOLEK.md).

**Tarikh:** 2026-10-03. **Status:** ACCEPTED_DOCUMENTATION_WITH_LATER_AMENDMENTS; bukan runtime cutover/release receipt. **Rujukan:** [Source of Truth](../ABANGCOLEK-SOURCE-OF-TRUTH.md), [handover](../handover/AGENT-HANDOVER-A-Z.md), [historical backlog](../archive/legacy-oct2026/PROJECT-ALIGNMENT-BACKLOG.md).

## Context

Chat/research/report lama, dua checkout, environment AI Studio dan deployment frontend menyebabkan status bercampur. Handover memerlukan satu authority semasa sambil mengekalkan bukti sejarah, data lokal dan perubahan belum committed. Snapshot3Oktober stopped; local source-only startup4Oktober kini PLATFORM dengan data OS, receipt berasingan dalam capability matrix.

## Decisions

| ID | Keputusan diterima | Consequence/gate |
|---|---|---|
| DEC-01 | PLATFORM ialah canonical source untuk kerja baharu | OS retained/data/reference; tiada switch dibuat oleh ADR |
| DEC-09 | Pengguna memilih kekalkan runtime/data di `D:\ABANGCOLEK-OS\var` dahulu pada 3 Oktober 2026 | Source-only local switch4Oktober; fresh recovery/identity/business-row reconciliation; tiada migration ke root baharu; production/onboarding berasingan |
| DEC-02 | Kekalkan modular monolith React/Vite+Bun+SQLite | No third shell/backend; cloud runtime/persistence separate C gates |
| DEC-03 | Empat auth roles, dealer organization linked Customer | UI proposal tidak mengubah server capability/ownership |
| DEC-04 | Evidence→JEV assessment→policy→authorization→execution→receipt | Native/latency/calibration claim memerlukan transport/benchmark proof |
| DEC-05 | Zero-new-spend dan resources sedia ada | Tidak menjamin free unlimited; provider usage/rights approval scoped |
| DEC-06 | Original brand + premium consistent theme + Emons interaction direction | Pengguna resumes Emons4Oktober2026; DONE_LOCAL14core E2E+4layout+25unit; product catalogue lengkap masih verification gate |
| DEC-07 | Current registry/backlog atas dated reports/research/skill library | Semua Markdown inventoried/classified; historical content retained with authority context |
| DEC-08 | Separate source/test/runtime/data/release/business acceptance | No DONE_ALL from local test/build/docs success |

**Amendment 21 Oktober 2026 — DEC-03:** empat auth roles/membership ialah baseline authorization, bukan larangan Dealer Workspace tersendiri. Setiap Agent/Stokis aktif wajib mendapat public store dan private workspace; direct signup tidak memerlukan pembelian dahulu. Ikut [Commerce & Growth](../design/commerce-growth.md) dan blueprint semasa. Tiada auth privilege/production status diberi melalui amendment dokumentasi.

## Alternatives dan sebab

- Membina app ketiga atau mereset OS menambah divergence dan berisiko hilang data; tidak dipilih.
- Menganggap semua research sebagai connected adapters menghasilkan status palsu; tidak dipilih.
- Menulis semula semua historical reports atau SKILL frontmatter menghilangkan provenance/merosakkan library; gunakan banner/register dan errata berfokus.
- Runtime-root source-only dipilih pengguna: kekalkan OS data dahulu. Restore ke root baharu ialah pilihan masa hadapan dengan keputusan dan verified recovery sendiri; ia bukan cutover semasa.

## Validation dan revisiting

Verified paths/scripts/provider source, read-only runtime/Git/DB snapshot dan document link/semantic review menyokong authority ini. Release/production/business onboarding belum dibuktikan. Revisit apabila owner memilih topology/runtime, role model berubah atau provider receipt diperoleh. Setiap keputusan baharu perlu date, reason, affected tasks, validation dan rollback; update current registry dan handover.

## Rollback

Documentation decisions boleh diganti melalui ADR baharu dan diff yang reviewable. Jangan revert business DB atau uncommitted source sebagai rollback ADR. Data/source cutover menggunakan runbook dan reconciliation gates sendiri.
