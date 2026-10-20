# E2E Test Infra: ABANGCOLEK Platform v2.4

## Test Philosophy
- Opaque-box, requirement-driven. Derivated from `ORIGINAL_REQUEST.md`, Master Blueprint v2.4, and ADR-0003.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinations + Real-World Commercial Workload.
- Pass/Fail semantics: All domain unit tests and integration tests must pass with exit code 0 under Bun test runner.
- Linter & TypeScript: Strict zero-error policy (`bun run lint` exit code 0).
- Production build: Clean bundle emission (`bun run build` exit code 0).

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Coverage) | Tier 2 (BVA/Corner) | Tier 3 (Cross-Feature) | Tier 4 (Workload) |
|---|---------|-------------|:-----------------:|:-------------------:|:----------------------:|:-----------------:|
| 1 | FIN-01 BigInt Margin Guardian | ORIGINAL_REQUEST §R1 | financial-integrity-v24 | 24.996% rejection, negative/zero sales | marginGuardian + checkout | Real checkout campaign |
| 2 | CPK-06 HITL Lifecycle | ORIGINAL_REQUEST §R1 | hitl-execution-v24 | 409 Expired, EXECUTOR_UNAVAILABLE | HITL + Payment reversal | Founder campaign approval |
| 3 | PAY-01..03 Billplz Reconciliation | ORIGINAL_REQUEST §R1 | payment-reconciliation | Late paid exception, 0-cent drift | Reconciler + stock release | Partial refund contra |
| 4 | Modular Monolith & Relocation | ORIGINAL_REQUEST §R2 | repository layout | Missing file, hash preservation | Import boundaries | Clean production build |
| 5 | CopilotKit & Python ADK | ORIGINAL_REQUEST §R3 | /api/platform/copilot/v2 | Free model sequence failover | Copilot runtime + ADK bridge | Live interactive prompt |
| 6 | 32 Managed Tools Registry | ORIGINAL_REQUEST §R4 | tool registry AT-0 | Unknown keys rejection, budget limit | Tool budget + IDOR scope | Multi-tool session run |
| 7 | Generative UI & A2UI Cards | ORIGINAL_REQUEST §R5 | 6 canonical A2UI cards | Unsupported schema rejection | UI renderer + HITL proposal | End-to-end user cockpit |

## Test Architecture & Execution Semantics
- Test runner: `bun test`
- Verification commands:
  - `bun test tests/platform/financial-integrity-v24.test.ts`
  - `bun test tests/platform/hitl-execution-v24.test.ts`
  - `bun test tests/platform/growth-margin.test.ts`
  - `bun test tests/platform/payment-reconciliation-v24.test.ts`
  - `bun test tests/platform/refund-allocation-v24.test.ts`
- Static Analysis: `bun run lint`
- Production Build: `bun run build`

## Signal Protocol
- E2E Testing Track signals test readiness via `TEST_READY.md`.
