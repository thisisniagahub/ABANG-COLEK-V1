# DISPATCH — Milestone 1 Worker (worker_m1)

## Identity & Role
- Role: teamwork_preview_worker
- Working Directory: d:\ABANGCOLEK-PLATFORM\.agents\teamwork\worker_m1
- Parent Orchestrator: orchestrator_1 (69f0e8df-5db9-4eb4-aae4-75264c0674f4)
- Authoritative Requirements: d:\ABANGCOLEK-PLATFORM\.agents\teamwork\ORIGINAL_REQUEST.md
- Project Scope: d:\ABANGCOLEK-PLATFORM\.agents\teamwork\orchestrator_1\PROJECT.md

## Write Ownership (Exclusive Files)
Worker ini memiliki pemilikan eksklusif ke atas fail-fail berikut:
- `shared/platform-contracts.ts`
- `server/platform/commerce.ts`
- `shared/growth-contracts.ts`
- `server/platform/marginGuardian.ts`

## Explorer Findings To Read
1. `d:\ABANGCOLEK-PLATFORM\.agents\teamwork\explorer_m1_1\handoff.md` & `analysis.md` (Penyelesaian TS2305 PaymentRecord)
2. `d:\ABANGCOLEK-PLATFORM\.agents\teamwork\explorer_m1_2\handoff.md` & `analysis.md` (FIN-01 BigInt sen margin & alias exports)
3. `d:\ABANGCOLEK-PLATFORM\.agents\teamwork\explorer_m1_3\handoff.md` & `analysis.md` (HITL CPK-06 & Billplz PAY-01..03)

## Task Description
1. **Selesaikan Ralat Linter TS2305**:
   - Pastikan `shared/platform-contracts.ts` mengeksport antaramuka kanonikal `PaymentRecord`:
     ```typescript
     export interface PaymentRecord {
       id: string;
       orderId: string;
       amountSen: number;
       method: 'cash' | 'bank';
       reference: string;
       state: 'confirmed' | 'refunded';
       confirmedBy: string;
       createdAt: string;
     }
     ```
   - Dalam `server/platform/commerce.ts`:
     - Tambahkan `PaymentRecord` ke import dari `../../shared/platform-contracts` (baris 2).
     - Gantikan takrifan setempat `PaymentRecord` pada baris 83 dengan `export type { PaymentRecord };`.
2. **Tambah Alias Kontrak FIN-01 (jika belum ada)**:
   - Dalam `shared/growth-contracts.ts` dan `server/platform/marginGuardian.ts`:
     - `export const evaluateContributionMargin = evaluateMarginContribution;`
     - `export type MarginInput = MarginSimulationInput;`
3. **Jalankan Ujian & Lint**:
   - `bun test tests/platform/financial-integrity-v24.test.ts`
   - `bun test tests/platform/hitl-execution-v24.test.ts`
   - `bun test tests/platform/growth-margin.test.ts`
   - `bun test tests/platform/payment-reconciliation-v24.test.ts`
   - `bun test tests/platform/refund-allocation-v24.test.ts`
   - `bun x tsc --noEmit -p tsconfig.platform.json`
   - `bun run lint`
4. **Tulis Laporan Penyerahan**:
   - Tulis `d:\ABANGCOLEK-PLATFORM\.agents\teamwork\worker_m1\handoff.md` dengan bukti output arahan ujian verbatim.
   - Kemas kini `progress.md`.
   - Hantar mesej penyiapan kepada parent menggunakan `send_message`.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-10-20T04:50:33Z
[Message] timestamp=2026-10-20T04:50:33Z sender=69f0e8df-5db9-4eb4-aae4-75264c0674f4 priority=MESSAGE_PRIORITY_HIGH
Identity: You are worker_m1 (teamwork_preview_worker).
Your working directory is d:\ABANGCOLEK-PLATFORM\.agents\teamwork\worker_m1.
Your parent orchestrator is orchestrator_1 (conversation ID: 69f0e8df-5db9-4eb4-aae4-75264c0674f4).

Please read:
1. Authoritative request: d:\ABANGCOLEK-PLATFORM\.agents\teamwork\ORIGINAL_REQUEST.md
2. Master project scope: d:\ABANGCOLEK-PLATFORM\.agents\teamwork\orchestrator_1\PROJECT.md
3. Your dispatch instructions: d:\ABANGCOLEK-PLATFORM\.agents\teamwork\worker_m1\DISPATCH.md
4. Explorer findings:
   - d:\ABANGCOLEK-PLATFORM\.agents\teamwork\explorer_m1_1\handoff.md
   - d:\ABANGCOLEK-PLATFORM\.agents\teamwork\explorer_m1_2\handoff.md
   - d:\ABANGCOLEK-PLATFORM\.agents\teamwork\explorer_m1_3\handoff.md

Write Ownership:
You have exclusive write ownership over:
- shared/platform-contracts.ts
- server/platform/commerce.ts
- shared/growth-contracts.ts
- server/platform/marginGuardian.ts

Task:
1. Implement the fix for PaymentRecord:
   - Ensure shared/platform-contracts.ts exports canonical PaymentRecord:
     export interface PaymentRecord {
       id: string;
       orderId: string;
       amountSen: number;
       method: 'cash' | 'bank';
       reference: string;
       state: 'confirmed' | 'refunded';
       confirmedBy: string;
       createdAt: string;
     }
   - Update server/platform/commerce.ts:
     - Add PaymentRecord to imports from ../../shared/platform-contracts.
     - Replace local definition on line 83 with: export type { PaymentRecord };
2. Export aliases in shared/growth-contracts.ts and server/platform/marginGuardian.ts:
   - export const evaluateContributionMargin = evaluateMarginContribution;
   - export type MarginInput = MarginSimulationInput;
3. Run tests and verification:
   - bun test tests/platform/financial-integrity-v24.test.ts
   - bun test tests/platform/hitl-execution-v24.test.ts
   - bun test tests/platform/growth-margin.test.ts
   - bun test tests/platform/payment-reconciliation-v24.test.ts
   - bun test tests/platform/refund-allocation-v24.test.ts
   - bun x tsc --noEmit -p tsconfig.platform.json
   - bun run lint
4. Document all changes and test outputs in d:\ABANGCOLEK-PLATFORM\.agents\teamwork\worker_m1\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Notify parent via send_message when complete.
