# Project: ABANGCOLEK Platform v2.4

## Architecture
- **Paradigma**: Modular Monolith tunggal berasaskan React 19 / Vite + Bun runtime. Tiada migrasi ke Next.js / framework luar (ADR-0003).
- **Autoriti Pangkalan Data & Transaksi**: Autoriti transaksi tempatan adalah SQLite (`PlatformStore`). Autoriti awan adalah Supabase CAS whole-snapshot. Ejen AI/Copilot dilarang membuka fail SQLite secara langsung.
- **Lapisan Server & Modul**:
  - `server/modules/`: Modul domain berkanun (commerce, inventory, loyalty, payment, margin, cpk).
  - `server/application/`: Aliran kerja orkestratif peringkat aplikasi (checkout, refunds, reconciliation).
  - `server/agents/tools/`: Registri alatan terurus (AT-0 hingga AT-3) dengan skema input/output ketat.
  - `shared/`: Kontrak bersama jenis data TypeScript (`platform-contracts.ts`, `growth-contracts.ts`, `copilot-contracts.ts`).
- **Komunikasi Rangkaian & Loopback Ports**:
  - Web UI: port `3000`
  - Canonical API: port `3010`
  - CopilotKit Runtime Fetch v2: port `3020` (`/api/platform/copilot/v2` diproksi oleh Vite)
  - Python Google ADK Service: port `8030` (`agents/google-adk/`)
- **Protokol Sifar Kos Model Percuma (Zero-New-Paid-Cloud-Spend)**:
  - Urutan mutlak: `gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> OpenRouter `nvidia/nemotron-3-super-120b-a12b:free`.
  - Fallback mutlak: Mod Aturan Tempatan (`LOCAL_RULES`), tiada fallback berbayar.
- **Integriti Kewangan (Rules Own The Money)**:
  - Integer Sen arithmetic & perbandingan BigInt tepat tanpa salah laku pembundaran (rounding fraud).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | FIN-01: BigInt Sen Margin Guardian | Pengiraan margin sumbangan BigInt tepat menolak kes 24.996% | M1 | ORIGINAL_REQUEST §R1, growth-contracts.ts |
| 2 | CPK-06: HITL Expiry & Blocked Reason | Semakan luput 409, `executionReceipt: undefined`, `executionBlockedReason: 'EXECUTOR_UNAVAILABLE'` | M1 | ORIGINAL_REQUEST §R1, hitl-execution-v24.test.ts |
| 3 | PAY-01..03: Billplz Reconciliation | Idempotent callback, redirect non-mutation, Largest-Remainder cumulative refund allocation | M1 | ORIGINAL_REQUEST §R1, paymentReconciliation.ts |
| 4 | LINT-FIX: Export PaymentRecord | Eksport `PaymentRecord` dalam `shared/platform-contracts.ts` agar linter TS2305 lulus | M1 | explorer_2 handoff, refund-allocation-v24.test.ts |
| 5 | STK-01: Last-Unit Stock Concurrency | Kawalan persaingan stok unit terakhir dengan pengesahan CAS | M1 | ORIGINAL_REQUEST §R1, spec_miner_1 |
| 6 | OPS-01: Quarantined Lot Exclusion | Pengecualian stok kuarantin/tamat tempoh daripada kuantiti boleh jual | M1 | ORIGINAL_REQUEST §R1, spec_miner_1 |
| 7 | LOY-01: Atomic Loyalty Ledger | Operasi lejar kesetiaan atomik dengan perlindungan pembatalan pulangan balik | M1 | ORIGINAL_REQUEST §R1, spec_miner_1 |
| 8 | ARCH-01: Modular Monolith Layout | Susunan modul modular monolith (server/modules, server/application, server/agents/tools) | M2 | ORIGINAL_REQUEST §R1 (2026-10-20T04:55:04Z), ADR-0003 |
| 9 | ARCH-03: Media Asset Relocation | Pemindahan selamat arkib zip produk ke references/media/ tanpa perubahan hash | M2 | ORIGINAL_REQUEST §R1 (2026-10-20T04:55:04Z) |
| 10 | ARC-01: Dependency Boundaries | Pemeriksaan sempadan import (scripts/maintenance/check-boundaries.ts & tests/architecture/dependency-boundaries.test.ts) | M2 | ORIGINAL_REQUEST §R1 (2026-10-20T04:55:04Z) |
| 11 | RT-01: CopilotRuntime Fetch v2 | Runtime Fetch v2 pada /api/platform/copilot/v2 diproksi Vite ke port 3020 | M3 | ORIGINAL_REQUEST §R2 (2026-10-20T04:55:04Z), ADR-0003 |
| 12 | RT-02: HttpAgent to Python ADK | Penyambung HttpAgent ke perkhidmatan Python Google ADK pada port 8030 | M3 | ORIGINAL_REQUEST §R2 (2026-10-20T04:55:04Z), ADR-0003 |
| 13 | MDL-01: Zero-Spend Free Model Router | Router model percuma: Gemini 3.6 Flash -> Gemini 3.5 Flash-Lite -> Nemotron Free | M3 | ORIGINAL_REQUEST §R2 (2026-10-20T04:55:04Z) |
| 14 | BUD-01: 30s / 6 Tools / 3 LLM Budget | Penguatkuasaan had bajet operasi interaktif per run | M3 | ORIGINAL_REQUEST §R2, AGENT-EXECUTION-CONTRACT |
| 15 | REG-01: AT-0 Strict Tool Registry | Rangka kerja pendaftaran 32 alatan dengan skema Zod ketat dan had bajet 6 alatan | M4 | ORIGINAL_REQUEST §R3 (2026-10-20T04:55:04Z) |
| 16 | REG-02: Contextual Tool Discovery | Pendedahan maksimum 8 alatan layak pada setiap langkah interaksi mengikut peranan | M4 | ORIGINAL_REQUEST §R3 (2026-10-20T04:55:04Z) |
| 17 | SEC-02: Cross-Scope IDOR Control | Perlindungan privasi dan sekatan skop (PD-01, SEC-02) merentas org ejen dan cawangan | M4 | ORIGINAL_REQUEST §R3 (2026-10-20T04:55:04Z) |
| 18 | GUI-01: Canonical Card Rendering | Render 5 kad A2UI (JevAssessmentCard, MarginSimulatorCard, OrderTrackingBadge, OperationsBriefCard, RefundImpactPanel) | M5 | ORIGINAL_REQUEST §R4 (2026-10-20T04:55:04Z) |
| 19 | GUI-06: A2UI Fixed Schema System | Penghuraian kad tetap A2UI (Fixed Renderer) dengan integriti skema tanpa dynamic HTML | M5 | ORIGINAL_REQUEST §R4 (2026-10-20T04:55:04Z) |
| 20 | GUI-02: Interactive Workspace Copilot | Integrasi borang interaktif dan tindakan HITL terus dalam komponen Workspace UI | M5 | ORIGINAL_REQUEST §R4 (2026-10-20T04:55:04Z) |
| 21 | E2E-01: 100% Domain Test Suite Pass | Pelaksanaan dan kelulusan 100% suite ujian domain dan integrasi | M6 | ORIGINAL_REQUEST §Acceptance Criteria |
| 22 | E2E-02: Clean Lint & TypeScript | Sifar ralat linter dan TypeScript (bun run lint exit code 0) | M6 | ORIGINAL_REQUEST §Acceptance Criteria |
| 23 | E2E-03: Clean Production Build | Kompilasi pengeluaran melepasi 100% tanpa sebarang ralat (bun run build exit code 0) | M6 | ORIGINAL_REQUEST §Acceptance Criteria |
| 24 | E2E-04: Atomic Acceptance Register | Pengemaskinian atomik PROJECT-CHECKLIST.md dan ACCEPTANCE-REGISTER.md dengan resit sahih | M6 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Fasa 03A: Integriti Kewangan, Lejar & HITL | FIN-01 BigInt Sen, CPK-06 HITL lifecycle, Billplz PAY-01..03, fix PaymentRecord export | none | DONE |
| M2 | Fasa 01: Modular Monolith & Media Relocation | Susunan kod modular monolith, check-boundaries.ts, dependency-boundaries.test.ts, pemindahan arkib ZIP media ke references/media/ | M1 | IN_PROGRESS |
| M3 | Fasa 02: CopilotKit Runtime & Python ADK | Endpoint /api/platform/copilot/v2, HttpAgent -> port 8030 Python ADK, model-router.ts percuma | M2 | PLANNED |
| M4 | Fasa 03B: Registri 32 Tools & Kawalan Privasi | Registri alatan terurus AT-0..3, skema Zod ketat, had bajet 6 alatan, sekatan IDOR SEC-02 | M2, M3 | PLANNED |
| M5 | Fasa 04: Generative UI & A2UI Fixed Cards | Rendering 5 kad kanonikal A2UI di src/features/copilot/components/, a2ui-registry.ts | M3, M4 | PLANNED |
| M6 | Fasa Akhir: 100% E2E Pass & Pengerasan Liputan | Lulus 100% ujian domain, bun run lint exit 0, bun run build exit 0, pengesahan resit | M1-M5 | PLANNED |

## Interface Contracts
### `scripts/maintenance/check-boundaries.ts` & `tests/architecture/dependency-boundaries.test.ts`
- Pemeriksaan sempadan import:
  - `src/` (client) dilarang mengimport daripada `server/` (secrets/database leak).
  - `shared/` dilarang mengimport daripada `src/` atau `server/`.
  - Pakej modul `server/modules/*` dilarang mempunyai import bulat (circular dependencies).
  - Exit code 0 jika tiada pelanggaran, exit code 1 jika terdapat pelanggaran.

### CopilotKit Runtime (`server/agents/copilot/runtime.ts` / `/api/platform/copilot/v2`) ↔ Python Google ADK (`port 8030`)
- `HttpAgent` menghantar POST ke `http://127.0.0.1:8030/run` dengan payload `{ messages, agent: 'abangcolek_ops' | specialist, budget: { tools: 6, llm: 3, timeoutMs: 30000 } }`.
- Respons di-stream balik melalui format Server-Sent Events (SSE) stesen CopilotKit Fetch v2.
- `model-router.ts`:
  - Urutan: `gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> `nvidia/nemotron-3-super-120b-a12b:free`.
  - Tiada panggilan API berbayar.

### `server/agents/tools/registry.ts` & `definitions.ts`
- Skema Zod ketat dengan `.strict()` (menolak medan asing).
- Enforce had bajet: maksimum 6 invocation alatan setiap sesi permintaan.
- Pendedahan kontekstual: maksimum 8 alatan relevan berdasarkan peranan pengguna/ejen.
- Isolasi penyewa / org ejen (SEC-02, PD-01) memastikan ejen cawangan tidak dapat mengakses rekod cawangan lain.

### `src/features/copilot/a2ui-registry.ts` & Komponen Kad Kanonikal
- Rendering selamat kad kanonikal berasaskan skema A2UI tetap:
  1. `JevAssessmentCard`
  2. `MarginSimulatorCard`
  3. `OrderTrackingBadge`
  4. `OperationsBriefCard`
  5. `RefundImpactPanel`
- Menolak sebarang suntikan HTML mentah / elemen tidak berdaftar.

## Code Layout
- `server/modules/`: Modul domain kanonikal terpencil (commerce, inventory, margin, payment, cpk).
- `server/application/`: Aliran kerja orkestratif (checkout, refunds, reconciliation).
- `server/agents/tools/`: Registri alatan terurus ADV-01..32 dengan skema Zod.
- `shared/`: Kontrak jenis data (`platform-contracts.ts`, `growth-contracts.ts`, `copilot-contracts.ts`).
- `src/features/copilot/`: Frontend React 19 / Vite UI shell dan komponen A2UI Fixed Renderer.
- `references/media/product-2026-10-17/`: Arkib aset media resolusi tinggi dipindahkan dari root.
- `docs/architecture/`, `docs/product/`, `docs/runbooks/`: Dokumentasi disusun mengikut taksonomi rasmi.
- `tests/platform/`: Suite ujian domain dan integrasi E2E.
- `tests/architecture/`: Suite ujian sempadan import arkitek.
