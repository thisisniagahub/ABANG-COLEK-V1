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
| 8 | ARCH-01: Modular Monolith Layout | Susunan modul modular monolith (server/modules, server/application, server/agents/tools) | M2 | ORIGINAL_REQUEST §R2, ADR-0003 |
| 9 | ARCH-03: Media Asset Relocation | Pemindahan selamat arkib zip produk ke references/media/ tanpa perubahan hash | M2 | ORIGINAL_REQUEST §R2, explorer_1 handoff |
| 10 | ARC-01: Dependency Boundaries | Pemeriksaan sempadan import menghalang client->server secrets & circular dependencies | M2 | ORIGINAL_REQUEST §R2, spec_miner_1 |
| 11 | RT-01: CopilotRuntime Fetch v2 | Runtime Fetch v2 pada /api/platform/copilot/v2 diproksi Vite ke port 3020 | M3 | ORIGINAL_REQUEST §R3, ADR-0003 |
| 12 | RT-02: HttpAgent to Python ADK | Penyambung HttpAgent ke perkhidmatan Python Google ADK pada port 8030 | M3 | ORIGINAL_REQUEST §R3, ADR-0003 |
| 13 | MDL-01: Zero-Spend Free Model Router | Router model percuma: Gemini 3.6 Flash -> Gemini 3.5 Flash-Lite -> Nemotron Free | M3 | ORIGINAL_REQUEST §R3, CONTINUE-AGY-20261020 |
| 14 | BUD-01: 30s / 6 Tools / 3 LLM Budget | Penguatkuasaan had bajet operasi interaktif per run | M3 | ORIGINAL_REQUEST §R3, AGENT-EXECUTION-CONTRACT |
| 15 | REG-01: AT-0 Strict Tool Registry | Rangka kerja pendaftaran 32 alatan dengan skema Zod ketat dan penolakan kunci asing | M4 | ORIGINAL_REQUEST §R4, copilot-advanced-tools.md |
| 16 | REG-02: Contextual Tool Discovery | Pendedahan maksimum 8 alatan layak pada setiap langkah interaksi mengikut peranan | M4 | ORIGINAL_REQUEST §R4, copilot-advanced-tools.md |
| 17 | SEC-02: Cross-Scope IDOR Control | Perlindungan privasi dan sekatan skop (PD-01, SEC-02) merentas org ejen dan cawangan | M4 | ORIGINAL_REQUEST §R4, ACCEPTANCE-REGISTER.md |
| 18 | GUI-01: Canonical Card Rendering | Render 6 kad A2UI (JevAssessment, MarginSimulator, OrderTrackingBadge, OperationsBrief, RefundImpact, Commission) | M5 | ORIGINAL_REQUEST §R5, explorer_1 handoff |
| 19 | GUI-06: A2UI Fixed Schema System | Penghuraian kad tetap A2UI (Fixed Renderer) dengan integriti skema tanpa dynamic HTML | M5 | ORIGINAL_REQUEST §R5, ADR-0003 |
| 20 | GUI-02: Interactive Workspace Copilot | Integrasi borang interaktif dan tindakan HITL terus dalam komponen Workspace UI | M5 | ORIGINAL_REQUEST §R5, ADR-0003 |
| 21 | E2E-01: 100% Domain Test Suite Pass | Pelaksanaan dan kelulusan 100% suite ujian domain dan integrasi | M6 | ORIGINAL_REQUEST §Acceptance Criteria |
| 22 | E2E-02: Clean Lint & TypeScript | Sifar ralat linter dan TypeScript (bun run lint exit code 0) | M6 | ORIGINAL_REQUEST §Acceptance Criteria |
| 23 | E2E-03: Clean Production Build | Kompilasi pengeluaran melepasi 100% tanpa sebarang ralat (bun run build exit code 0) | M6 | ORIGINAL_REQUEST §Acceptance Criteria |
| 24 | E2E-04: Atomic Acceptance Register | Pengemaskinian atomik PROJECT-CHECKLIST.md dan ACCEPTANCE-REGISTER.md dengan resit sahih | M6 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Fasa 03A: Integriti Kewangan, Lejar & HITL | FIN-01 BigInt Sen, CPK-06 HITL lifecycle, Billplz PAY-01..03, fix PaymentRecord export | none | IN_PROGRESS |
| M2 | Fasa 01: Modular Monolith & Media Relocation | Susunan kod modular monolith, pemindahan arkib ZIP media ke references/media/ | M1 | PLANNED |
| M3 | Fasa 02: CopilotKit Runtime & Python ADK | Endpoint /api/platform/copilot/v2, HttpAgent -> port 8030 Python ADK, model percuma | M1 | PLANNED |
| M4 | Fasa 03B: Registri 32 Tools & Kawalan Privasi | Registri alatan terurus AT-0..3, had bajet 6 alatan, sekatan IDOR SEC-02 | M2, M3 | PLANNED |
| M5 | Fasa 04: Generative UI & A2UI Fixed Cards | Rendering 6 kad kanonikal A2UI, sokongan cadangan HITL terus ke UI | M3, M4 | PLANNED |
| M6 | Fasa Akhir: 100% E2E Pass & Pengerasan Liputan | Lulus 100% ujian domain, bun run lint exit 0, bun run build exit 0, pengesahan resit | M1-M5 | PLANNED |

## Interface Contracts
### `server/modules/margin` ↔ `server/application`
- `evaluateContributionMargin(input: MarginInput): MarginSimulationResult`
  - Input: `{ netSalesExTaxSen: number, costSen: number, minimumContributionMarginSen: number, minimumContributionMarginPct: number }`
  - Output: `{ allowed: boolean, contributionSen: number, contributionMarginPct: number, reasonCode?: string }`
  - Rule: `contributionSenBig * 10000n >= netSalesSenBig * minimumMarginBps`.

### `server/modules/cpk` ↔ `server/platform/app`
- `decideHitlAction(actionId: string, approve: boolean, actor: SessionUser): HitlActionRequest`
  - Semakan luput `new Date(action.expiry) <= new Date()` -> throw 409 `HITL_EXPIRED`.
  - Keputusan: `status: approve ? 'approved' : 'rejected'`, `executionReceipt: undefined`, `executionBlockedReason: approve ? 'EXECUTOR_UNAVAILABLE' : undefined`.

### `shared/platform-contracts.ts` ↔ Test Suites
- Eksport `PaymentRecord` dengan medan kanonikal:
  - `{ id: string, orderId: string, provider: string, referenceId: string, amountSen: number, status: 'pending' | 'paid' | 'failed' | 'refunded', createdAt: string, signature?: string }`

### CopilotKit Runtime (`/api/platform/copilot/v2`) ↔ Python Google ADK (`port 8030`)
- `HttpAgent` menghantar POST ke `http://127.0.0.1:8030/run` dengan payload `{ messages, agent: 'abangcolek_ops' | specialist, budget: { tools: 6, llm: 3, timeoutMs: 30000 } }`.
- Respons di-stream balik melalui format Server-Sent Events (SSE) stesen CopilotKit.

## Code Layout
- `server/modules/`: Modul domain kanonikal terpencil (commerce, inventory, margin, payment, cpk).
- `server/application/`: Aliran kerja orkestratif (checkout, refunds, reconciliation).
- `server/agents/tools/`: Definisi 32 alatan terurus ADV-01..32 dengan skema Zod.
- `shared/`: Kontrak jenis data (`platform-contracts.ts`, `growth-contracts.ts`, `copilot-contracts.ts`).
- `src/`: Frontend React 19 / Vite UI shell dan komponen A2UI Fixed Renderer (`src/features/platform/copilot/`).
- `references/media/`: Arkib aset media resolusi tinggi dipindahkan dari root.
- `tests/platform/`: Suite ujian domain dan integrasi E2E.
