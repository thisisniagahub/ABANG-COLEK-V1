# Original User Request

## 2026-10-20T04:18:17Z

Pembangunan dan integrasi autonomi menyeluruh platform ABANGCOLEK v2.4 berlandaskan Master Blueprint v2.4, ADR-0003, CONTINUE-AGY-20261020.md, dan PROJECT-CHECKLIST.md untuk operasi perniagaan Liurleleh House Malaysia (Megat Shaifulreza / Epull).

Working directory: d:\ABANGCOLEK-PLATFORM
Integrity mode: development

## Requirements

### R1. Fasa 03A: Integriti Kewangan, Lejar, dan Kitaran Hayat HITL
- Menguatkuasakan prinsip Rules Own The Money: Pengiraan margin sumbangan (FIN-01) menggunakan aritmetik integer Sen dan perbandingan BigInt tepat tanpa salah laku pembundaran peratusan (contoh: 24.996% mesti ditolak walaupun paparan dibundar ke 25.00%).
- Kitaran Human-In-The-Loop (HITL / CPK-06): Semakan tarikh luput (expiry) sebelum sebarang mutasi, tiada resit pelaksanaan palsu (executionReceipt: undefined) dijana semasa kelulusan, dan status diluluskan dilabelkan executionBlockedReason: 'EXECUTOR_UNAVAILABLE' sehingga executor fizikal disahkan.
- Penyelarasan pembayaran Billplz (PAY-01..03) dan penguntukan pembalikan bayaran balik (refund allocation) terkumpul berasaskan kuota tanpa pembalikan berganda.

### R2. Fasa 01: Struktur Monolith Modular & Pindaan Aset Selamat
- Penyelarasan struktur modular monolith (server/modules/, server/application/, server/agents/tools/) tanpa memecahkan rujukan import atau mencipta perkhidmatan berganda.
- Pemindahan arkib media resolusi tinggi ke folder rujukan media tanpa menjejaskan hash integriti fail.

### R3. Fasa 02: CopilotKit Runtime & Python Google ADK Free Bridge
- Pemasangan dan integrasi runtime rasmi CopilotKit Fetch v2 (/api/platform/copilot/v2) bersama penyambung HttpAgent ke perkhidmatan Python Google ADK FastAPI (agents/google-adk/).
- Penguatkuasaan ketat Protokol Sifar Kos (Zero-New-Paid-Cloud-Spend): router model percuma mengikut urutan tetap tanpa fallback berbayar (gemini-3.6-flash -> gemini-3.5-flash-lite -> OpenRouter Nemotron Free).

### R4. Fasa 03B: Registri 32 Advanced Tools & 10 Modul Berkanun
- Registri alatan terurus (AT-0 hingga AT-3) dengan skema input/output ketat, penolakan kunci tidak dikenali, had bajet 6 unit alatan per sesi, dan isolasi mutasi pangkalan data.
- Perlindungan privasi dan kawalan skop (PD-01 & SEC-02) merentas org ejen, cawangan, dan founder.

### R5. Fasa 04: 7 Pendekatan Generative UI & Antaramuka A2UI Fixed Schema
- Rendering komponen visual kad kanonikal (JevAssessmentCard, MarginSimulator, OrderTrackingBadge, OperationsBriefCard, RefundImpactPanel) berasaskan skema A2UI tetap.
- Penyeragaman interaktif Workspace Copilot bersama sokongan cadangan HITL terus ke UI.

## Acceptance Criteria

### Pengesahan Berprogramatik & Integriti
- [ ] Semua ujian unit domain lulus (bun test tests/platform/financial-integrity-v24.test.ts, tests/platform/hitl-execution-v24.test.ts, tests/platform/growth-margin.test.ts).
- [ ] Keseluruhan kod bebas daripada sebarang ralat linter dan kompilasi TypeScript (bun run lint exit code 0).
- [ ] bun run build melepasi kompilasi pengeluaran tanpa sebarang ralat bundle.
- [ ] Sifar panggilan API berbayar: semua routing disahkan melalui senarai model percuma yang dibenarkan.
- [ ] PROJECT-CHECKLIST.md dan ACCEPTANCE-REGISTER.md dikemas kini secara atomik dengan pautan resit bukti ujian yang sahih.

## 2026-10-20T04:55:04Z

Pembangunan dan integrasi autonomi menyeluruh platform ABANGCOLEK v2.4 berlandaskan Master Blueprint v2.4, ADR-0003, CONTINUE-AGY-20261020.md, dan PROJECT-CHECKLIST.md untuk operasi perniagaan Liurleleh House Malaysia (Megat Shaifulreza / Epull).

Working directory: d:\ABANGCOLEK-PLATFORM
Integrity mode: development

## Status & Konteks Semasa
- Fasa 03A (FIN-01, CPK-06 HITL Lifecycle, PAY-01..03, STK-01) TELAH LULUS 100% dengan 40 ujian unit dan resit rasmi di reports/implementation/03a-integrity-receipt.json. JANGAN ulangi kerja Fasa 03A.
- Pasukan perlu memfokuskan usaha pada Fasa 01, Fasa 02, Fasa 03B, Fasa 04, dan Fasa 06.

## Requirements

### R1. Fasa 01: Struktur Monolith Modular & Pindaan Aset Selamat
- Sediakan scripts/maintenance/check-boundaries.ts dan tests/architecture/dependency-boundaries.test.ts untuk menguatkuasakan sempadan import arkitek (client tidak import server, shared tidak import client/server).
- Pindahkan dokumen dan aset mengikut peta tepat Fasa 01:
  - docs/ABANGCOLEK-PLATFORM-ARCHITECTURE.md & docs/AI-AGENT-ARCHITECTURE.md -> docs/architecture/
  - docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md & docs/AI-AGENT-ROADMAP.md -> docs/product/
  - docs/AI-PROVIDER-FREE-MODELS-REGISTER.md -> docs/architecture/
  - docs/production-release.md & docs/design-qa.md -> docs/runbooks/
  - Pindahkan arkib media resolusi tinggi PRODUCT LLH* ke references/media/product-2026-10-17/ dengan integriti hash terpelihara.

### R2. Fasa 02: CopilotKit Runtime Fetch v2 & Python Google ADK Free Bridge
- Pemasangan dan integrasi runtime rasmi CopilotKit Fetch v2 (server/agents/copilot/runtime.ts dan /api/platform/copilot/v2) bersama penyambung HttpAgent ke perkhidmatan Python Google ADK FastAPI (agents/google-adk/).
- Penguatkuasaan ketat Protokol Sifar Kos (Zero-New-Paid-Cloud-Spend): router model percuma di server/agents/providers/model-router.ts mengikut urutan tetap tanpa fallback berbayar (gemini-3.6-flash -> gemini-3.5-flash-lite -> OpenRouter nvidia/nemotron-3-super-120b-a12b:free).

### R3. Fasa 03B: Registri 32 Advanced Tools & 10 Modul Berkanun
- Registri alatan terurus di server/agents/tools/registry.ts dan server/agents/tools/definitions.ts (AT-0 hingga AT-3) dengan skema Zod ketat, had bajet 6 alatan per sesi, dan isolasi mutasi data.
- Perlindungan privasi dan kawalan skop (PD-01 & SEC-02) merentas org ejen, cawangan, dan founder.

### R4. Fasa 04: 7 Pendekatan Generative UI & Antaramuka A2UI Fixed Schema
- Rendering komponen visual kad kanonikal di src/features/copilot/components/ (JevAssessmentCard, MarginSimulatorCard, OrderTrackingBadge, OperationsBriefCard, RefundImpactPanel) berasaskan skema A2UI tetap.
- Registri A2UI di src/features/copilot/a2ui-registry.ts dengan penolakan suntikan skema rawak.

## Acceptance Criteria

### Pengesahan Berprogramatik & Integriti
- [ ] Ujian architecture lulus: bun test ./tests/architecture/dependency-boundaries.test.ts.
- [ ] Ujian domain platform sedia ada kekal lulus: bun test ./tests/platform/financial-integrity-v24.test.ts ./tests/platform/hitl-execution-v24.test.ts ./tests/platform/payment-reconciliation-v24.test.ts ./tests/platform/refund-allocation-v24.test.ts ./tests/platform/growth-margin.test.ts.
- [ ] Keseluruhan kod melepasi linting: bun run lint (tsc exit code 0).
- [ ] bun run build melepasi kompilasi pengeluaran tanpa ralat bundle.
- [ ] PROJECT-CHECKLIST.md dan ACCEPTANCE-REGISTER.md dikemas kini secara atomik dengan pautan resit bukti ujian yang sahih.
