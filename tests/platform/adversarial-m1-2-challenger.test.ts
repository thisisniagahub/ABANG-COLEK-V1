import { describe, expect, test } from 'bun:test';
import { ToolRegistry, type ToolDispatchContext } from '../../server/agents/tools/registry';
import { ADVANCED_TOOLS_DEFINITIONS } from '../../server/agents/tools/definitions';
import { FreeModelRouter, createBudget, type ModelCallBudget } from '../../server/agents/providers/model-router';
import { evaluateMarginContribution } from '../../server/platform/marginGuardian';

describe('Adversarial Verification Suite M1-2: ToolRegistry & FIN-01 (Challenger M1-2)', () => {
  // =========================================================================
  // FOCUS AREA 1: ToolRegistry Limits, Quotas, Deadline & RBAC Enforcement
  // =========================================================================
  describe('1. ToolRegistry Adversarial Stress Testing', () => {
    function makeCtx(
      role: 'customer' | 'staff' | 'founder' | 'developer' | any = 'customer',
      dispatchesCount = 0,
      maxDispatches = 6,
      runId = 'run-adversarial-m1-2'
    ): ToolDispatchContext {
      return {
        actorId: 'challenger-agent-002',
        role,
        runId,
        dispatchesCount,
        maxDispatches,
      };
    }

    describe('1.1 Tool Budget Quota Enforcement (>6 Dispatches)', () => {
      test('Dispatch #7 is strictly rejected with TOOL_BUDGET_EXCEEDED when maxDispatches=6', async () => {
        const reg = new ToolRegistry(6);
        const ctx = makeCtx('customer', 0, 6);

        // Run exactly 6 legitimate dispatches
        for (let i = 1; i <= 6; i++) {
          const res = await reg.dispatchTool('discover_capabilities', {}, ctx);
          expect(res.ok).toBe(true);
          expect(ctx.dispatchesCount).toBe(i);
        }

        expect(ctx.dispatchesCount).toBe(6);

        // Dispatch #7 MUST fail with TOOL_BUDGET_EXCEEDED
        const res7 = await reg.dispatchTool('discover_capabilities', {}, ctx);
        expect(res7.ok).toBe(false);
        if (!res7.ok) {
          expect(res7.code).toBe('TOOL_BUDGET_EXCEEDED');
          expect(res7.message).toContain('6/6');
        }
        // Counter must remain at 6
        expect(ctx.dispatchesCount).toBe(6);

        // Subsequent dispatch #8 also rejected
        const res8 = await reg.dispatchTool('discover_capabilities', {}, ctx);
        expect(res8.ok).toBe(false);
        if (!res8.ok) {
          expect(res8.code).toBe('TOOL_BUDGET_EXCEEDED');
        }
        expect(ctx.dispatchesCount).toBe(6);
      });

      test('Server-owned dispatch counter: a client-seeded dispatchesCount can neither grant nor deny budget', async () => {
        // WHY CHANGED: the old test seeded `ctx.dispatchesCount = 6` and
        // expected an immediate TOOL_BUDGET_EXCEEDED — the caller owned the
        // counter, so a browser could deny itself budget, and (in the mirror
        // direction) hand itself an inflated allowance. The counter is now
        // owned by the registry and keyed by runId: a client-supplied value is
        // ignored and overwritten, so it can neither grant nor deny budget.
        const reg = new ToolRegistry(6);

        // A client that claims "I already used 6 dispatches" must still be
        // allowed its first real dispatch.
        const inflated = makeCtx('founder', 6, 6, 'run-adversarial-m1-2-seeded-high');
        const resInflated = await reg.dispatchTool(
          'simulate_campaign',
          { netSalesSen: 100000, cogsSen: 50000 },
          inflated,
        );

        expect(resInflated.ok).toBe(true);
        // The mirrored counter reflects only the dispatches actually made.
        expect(inflated.dispatchesCount).toBe(1);
        expect(reg.runBudgetState(inflated.runId)).toEqual({ used: 1, limit: 6 });

        // A client that claims "I have negative dispatches" gets no extra
        // budget either — the first real dispatch is still the first one.
        const negative = makeCtx('founder', -5, 6, 'run-adversarial-m1-2-seeded-negative');
        const resNegative = await reg.dispatchTool(
          'simulate_campaign',
          { netSalesSen: 100000, cogsSen: 50000 },
          negative,
        );

        expect(resNegative.ok).toBe(true);
        expect(negative.dispatchesCount).toBe(1);
        expect(reg.runBudgetState(negative.runId)).toEqual({ used: 1, limit: 6 });

        // A client that claims "I have zero dispatches" cannot skip the queue
        // either: the server counter starts empty and is advanced by the call.
        const zero = makeCtx('founder', 0, 6, 'run-adversarial-m1-2-seeded-zero');
        const resZero = await reg.dispatchTool(
          'simulate_campaign',
          { netSalesSen: 100000, cogsSen: 50000 },
          zero,
        );

        expect(resZero.ok).toBe(true);
        expect(zero.dispatchesCount).toBe(1);
        expect(reg.runBudgetState(zero.runId)).toEqual({ used: 1, limit: 6 });
      });

      test('Genuine server-side exhaustion: the 7th real dispatch is rejected with TOOL_BUDGET_EXCEEDED', async () => {
        // WHY ADDED: the budget limit must be enforced against the dispatches
        // the server actually performed, not against a number the caller
        // supplied. Six real successful dispatches exhaust the server budget;
        // the seventh call is refused and the server counter does not move.
        const reg = new ToolRegistry(6);
        const ctx = makeCtx('customer', 0, 6, 'run-adversarial-m1-2-exhaustion');

        for (let i = 1; i <= 6; i++) {
          const res = await reg.dispatchTool('discover_capabilities', {}, ctx);
          expect(res.ok).toBe(true);
          expect(reg.runBudgetState(ctx.runId).used).toBe(i);
        }

        expect(reg.runBudgetState(ctx.runId)).toEqual({ used: 6, limit: 6 });

        // Dispatch #7 MUST fail with TOOL_BUDGET_EXCEEDED
        const res7 = await reg.dispatchTool('discover_capabilities', {}, ctx);
        expect(res7.ok).toBe(false);
        if (!res7.ok) {
          expect(res7.code).toBe('TOOL_BUDGET_EXCEEDED');
          expect(res7.message).toContain('6/6');
        }
        // The refused call did not consume budget.
        expect(reg.runBudgetState(ctx.runId)).toEqual({ used: 6, limit: 6 });
        expect(ctx.dispatchesCount).toBe(6);
      });

      test('Failed validation does not consume dispatch quota', async () => {
        const reg = new ToolRegistry(6);
        const ctx = makeCtx('founder', 0, 6);

        // Send invalid payload to simulate_campaign
        const badRes = await reg.dispatchTool('simulate_campaign', { invalid: true }, ctx);
        expect(badRes.ok).toBe(false);
        if (!badRes.ok) {
          expect(badRes.code).toBe('TOOL_INPUT_INVALID');
        }
        // Quota should still be 0
        expect(ctx.dispatchesCount).toBe(0);
      });
    });

    describe('1.2 Timeout & Deadline Enforcement (>30s Deadline)', () => {
      test('Model call budget enforces strict 30s deadline (MODEL_DEADLINE_EXCEEDED)', () => {
        const router = new FreeModelRouter();
        const budget: ModelCallBudget = createBudget(3, 30000);

        // Simulate time passing: simulate budget started 30,001 ms ago
        budget.startedAt = Date.now() - 30001;

        expect(() => {
          router.selectNextCandidate(budget);
        }).toThrow(/MODEL_DEADLINE_EXCEEDED/);
      });

      test('Model call budget strictly rejects call #4 (max 3 calls)', () => {
        const router = new FreeModelRouter();
        const budget: ModelCallBudget = createBudget(3, 30000);
        budget.callsMade = 3;

        expect(() => {
          router.selectNextCandidate(budget);
        }).toThrow(/MODEL_BUDGET_EXCEEDED/);
      });

      test('Empirical Boundary: ToolRegistry lacks native deadline tracking in ToolDispatchContext', async () => {
        // ToolDispatchContext has no deadlineMs or startedAt field.
        // Verifies ToolRegistry executes when context has no time checks.
        const reg = new ToolRegistry();
        const ctx = makeCtx('customer', 0, 6);

        const res = await reg.dispatchTool('discover_capabilities', {}, ctx);
        expect(res.ok).toBe(true);
      });
    });

    describe('1.3 Unauthorized Role Privilege Escalation Rejection', () => {
      test('Customer role cannot execute preview_refund (requires staff)', async () => {
        const reg = new ToolRegistry();
        const ctx = makeCtx('customer');

        const res = await reg.dispatchTool(
          'preview_refund',
          { orderId: 'ord-100', amountSen: 5000 },
          ctx
        );

        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.code).toBe('FORBIDDEN_STAFF_REQUIRED');
        }
        expect(ctx.dispatchesCount).toBe(0);
      });

      test('Customer role cannot execute propose_refund (requires staff)', async () => {
        const reg = new ToolRegistry();
        const ctx = makeCtx('customer');

        const res = await reg.dispatchTool(
          'propose_refund',
          { orderId: 'ord-100', amountSen: 5000, reason: 'unauthorized proposal' },
          ctx
        );

        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.code).toBe('FORBIDDEN_STAFF_REQUIRED');
        }
        expect(ctx.dispatchesCount).toBe(0);
      });

      test('Customer role cannot execute simulate_campaign (requires founder)', async () => {
        const reg = new ToolRegistry();
        const ctx = makeCtx('customer');

        const res = await reg.dispatchTool(
          'simulate_campaign',
          { netSalesSen: 100000, cogsSen: 60000 },
          ctx
        );

        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.code).toBe('FORBIDDEN_FOUNDER_REQUIRED');
        }
        expect(ctx.dispatchesCount).toBe(0);
      });

      test('Staff role cannot execute simulate_campaign (requires founder)', async () => {
        const reg = new ToolRegistry();
        const ctx = makeCtx('staff');

        const res = await reg.dispatchTool(
          'simulate_campaign',
          { netSalesSen: 100000, cogsSen: 60000 },
          ctx
        );

        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.code).toBe('FORBIDDEN_FOUNDER_REQUIRED');
        }
        expect(ctx.dispatchesCount).toBe(0);
      });

      test('Staff role cannot execute execute_approved_action (requires founder)', async () => {
        const reg = new ToolRegistry();
        const ctx = makeCtx('staff');

        const res = await reg.dispatchTool(
          'execute_approved_action',
          { proposalId: 'prop-1', approvalId: 'app-1' },
          ctx
        );

        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.code).toBe('FORBIDDEN_FOUNDER_REQUIRED');
        }
        expect(ctx.dispatchesCount).toBe(0);
      });

      test('Developer role cannot execute preview_refund or simulate_campaign', async () => {
        const reg = new ToolRegistry();
        const ctx = makeCtx('developer');

        const resRefund = await reg.dispatchTool(
          'preview_refund',
          { orderId: 'ord-1', amountSen: 1000 },
          ctx
        );
        expect(resRefund.ok).toBe(false);
        if (!resRefund.ok) {
          expect(resRefund.code).toBe('FORBIDDEN_STAFF_REQUIRED');
        }

        const resCamp = await reg.dispatchTool(
          'simulate_campaign',
          { netSalesSen: 100000, cogsSen: 50000 },
          ctx
        );
        expect(resCamp.ok).toBe(false);
        if (!resCamp.ok) {
          expect(resCamp.code).toBe('FORBIDDEN_FOUNDER_REQUIRED');
        }
      });

      test('Arbitrary spoofed roles (admin, superuser, root, empty) fail closed', async () => {
        const reg = new ToolRegistry();
        const spoofedRoles = ['admin', 'superuser', 'root', 'manager', ''];

        for (const role of spoofedRoles) {
          const ctx = makeCtx(role);

          const res = await reg.dispatchTool(
            'simulate_campaign',
            { netSalesSen: 100000, cogsSen: 50000 },
            ctx
          );
          expect(res.ok).toBe(false);
          if (!res.ok) {
            expect(res.code).toBe('FORBIDDEN_FOUNDER_REQUIRED');
          }
        }
      });
    });
  });

  // =========================================================================
  // FOCUS AREA 2: FIN-01 Margin Calculation Stress Testing (Integer Sen vs Float)
  // =========================================================================
  describe('2. FIN-01 Margin Calculation Stress Testing', () => {
    describe('2.1 simulate_campaign Tool (ADV-13) Integer Boundary Arithmetic', () => {
      test('Rejects 24.996% margin: netSales=100,000 sen, cogs=75,004 sen (2499 bps < 2500 bps)', async () => {
        const reg = new ToolRegistry();
        const ctx: ToolDispatchContext = {
          actorId: 'founder-01',
          role: 'founder',
          runId: 'run-fin01-test',
          dispatchesCount: 0,
          maxDispatches: 6,
        };

        // 100,000 sen - 75,004 sen = 24,996 sen contribution
        // 24,996 / 100,000 = 24.996%
        // Floating point rounding (Math.round(24.996)) would round to 25.00%!
        // But integer sen basis points calculation: (24996n * 10000n) / 100000n = 2499 bps
        const res = await reg.dispatchTool(
          'simulate_campaign',
          {
            netSalesSen: 100000,
            cogsSen: 75004,
          },
          ctx
        );

        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.result.contributionSen).toBe(24996);
          expect(res.result.marginBasisPoints).toBe(2499); // 24.99%, NOT 25.00%
          expect(res.result.passed).toBe(false);
          expect(res.result.reason).toBe('MARGIN_RATIO_FAILED');
        }
      });

      test('Approves exact 25.000% margin: netSales=100,000 sen, cogs=75,000 sen (2500 bps >= 2500 bps)', async () => {
        const reg = new ToolRegistry();
        const ctx: ToolDispatchContext = {
          actorId: 'founder-01',
          role: 'founder',
          runId: 'run-fin01-test',
          dispatchesCount: 0,
          maxDispatches: 6,
        };

        const res = await reg.dispatchTool(
          'simulate_campaign',
          {
            netSalesSen: 100000,
            cogsSen: 75000,
          },
          ctx
        );

        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.result.contributionSen).toBe(25000);
          expect(res.result.marginBasisPoints).toBe(2500); // exactly 2500 bps (25.00%)
          expect(res.result.passed).toBe(true);
          expect(res.result.reason).toBe('MARGIN_PASSED');
        }
      });

      test('Rejects sub-basis point boundary: 24.999% margin (netSales=1,000,000 sen, cogs=750,010 sen)', async () => {
        const reg = new ToolRegistry();
        const ctx: ToolDispatchContext = {
          actorId: 'founder-01',
          role: 'founder',
          runId: 'run-fin01-test',
          dispatchesCount: 0,
          maxDispatches: 6,
        };

        // Contribution = 249,990 sen -> 24.999%
        const res = await reg.dispatchTool(
          'simulate_campaign',
          {
            netSalesSen: 1000000,
            cogsSen: 750010,
          },
          ctx
        );

        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.result.marginBasisPoints).toBe(2499);
          expect(res.result.passed).toBe(false);
          expect(res.result.reason).toBe('MARGIN_RATIO_FAILED');
        }
      });

      test('Rejects negative netSales by strict validation and handles zero netSales without NaN or divide-by-zero', async () => {
        // WHY CHANGED: the old contract silently simulated a negative netSales
        // and reported it as a normal result, so broken money input looked like
        // a valid simulation. The new contract is strict validation: money is a
        // non-negative integer amount of sen, so a negative amount is rejected
        // outright, while a zero amount must still evaluate safely (no
        // division by zero, no NaN/Infinity, and never a passing margin).
        const reg = new ToolRegistry();
        const ctx: ToolDispatchContext = {
          actorId: 'founder-01',
          role: 'founder',
          runId: 'run-fin01-zero-negative',
          dispatchesCount: 0,
          maxDispatches: 6,
        };

        // Negative netSales is refused by strict validation — nothing throws.
        const resNegative = await reg.dispatchTool(
          'simulate_campaign',
          { netSalesSen: -100, cogsSen: 50 },
          ctx,
        );
        expect(resNegative.ok).toBe(false);
        if (!resNegative.ok) {
          expect(resNegative.code).toBe('TOOL_INPUT_INVALID');
          expect(resNegative.detail).toBe('INVALID_VALUE:netSalesSen');
        }
        const negativePayload = JSON.stringify(resNegative);
        expect(negativePayload).not.toContain('NaN');
        expect(negativePayload).not.toContain('Infinity');
        // A rejected input consumes no dispatch budget.
        expect(ctx.dispatchesCount).toBe(0);

        // Zero netSales is handled safely.
        const resZero = await reg.dispatchTool(
          'simulate_campaign',
          { netSalesSen: 0, cogsSen: 0 },
          ctx,
        );
        expect(resZero.ok).toBe(true);
        if (resZero.ok) {
          const result = resZero.result;
          // No division by zero and no NaN / Infinity in the reported ratio.
          expect(Number.isFinite(result.marginBasisPoints)).toBe(true);
          expect(Number.isNaN(result.marginBasisPoints)).toBe(false);
          expect(Number.isFinite(result.contributionMarginPct)).toBe(true);
          expect(Number.isNaN(result.contributionMarginPct)).toBe(false);
          expect(result.marginBasisPoints).toBe(0);
          expect(result.contributionMarginPct).toBe(0);
          // Zero sales can never claim a passing margin.
          expect(result.passed).toBe(false);
          expect(result.allowed).toBe(false);
          expect(result.isMarginPctPass).toBe(false);
          expect(result.reason).toBe('MARGIN_RATIO_FAILED');
          expect(result.reasonCode).toBe('INSUFFICIENT_PERCENT_MARGIN');
          const zeroPayload = JSON.stringify(result);
          expect(zeroPayload).not.toContain('NaN');
          expect(zeroPayload).not.toContain('Infinity');
        }
      });
    });

    describe('2.2 evaluateMarginContribution Domain Engine Integer Arithmetic', () => {
      test('Prevents float rounding bypass: 24.996% displays as 25.00% but allowed is FALSE', () => {
        // netSales = 100,000 sen (RM 1,000)
        // cogs = 75,004 sen (RM 750.04)
        // Contribution = 24,996 sen (24.996%)
        // Display rounding rounds 24.996% to 25.00%!
        const result = evaluateMarginContribution({
          netSalesExTaxSen: 100000,
          cogsSen: 75004,
          packagingSen: 0,
          paymentFeesSen: 0,
          fulfilmentVariableCostSen: 0,
          deliverySubsidySen: 0,
          agentCommissionSen: 0,
          rewardCostSen: 0,
          expectedReturnLossSen: 0,
          minimumContributionSen: 1,
          minimumContributionMarginPct: 25.0,
        });

        // The display percentage is 25.00% due to Math.round(24.996 * 100) / 100
        expect(result.contributionMarginPct).toBe(25);

        // BUT the exact BigInt integer comparison (24996n * 10000n >= 100000n * 2500n) FAILS
        expect(result.isMarginPctPass).toBe(false);
        expect(result.allowed).toBe(false);
        expect(result.reasonCode).toBe('INSUFFICIENT_PERCENT_MARGIN');
      });

      test('Approves exact 25.000% margin (25,000 / 100,000 sen)', () => {
        const result = evaluateMarginContribution({
          netSalesExTaxSen: 100000,
          cogsSen: 75000,
          packagingSen: 0,
          paymentFeesSen: 0,
          fulfilmentVariableCostSen: 0,
          deliverySubsidySen: 0,
          agentCommissionSen: 0,
          rewardCostSen: 0,
          expectedReturnLossSen: 0,
          minimumContributionSen: 1,
          minimumContributionMarginPct: 25.0,
        });

        expect(result.contributionSen).toBe(25000);
        expect(result.contributionMarginPct).toBe(25);
        expect(result.isMarginPctPass).toBe(true);
        expect(result.allowed).toBe(true);
        expect(result.reasonCode).toBe('PASS');
      });

      test('Strictly rejects non-integer sen inputs with TypeError', () => {
        expect(() => {
          evaluateMarginContribution({
            netSalesExTaxSen: 10000.5 as any, // Float sen
            cogsSen: 5000,
            packagingSen: 0,
            paymentFeesSen: 0,
            fulfilmentVariableCostSen: 0,
            deliverySubsidySen: 0,
            agentCommissionSen: 0,
            rewardCostSen: 0,
            expectedReturnLossSen: 0,
            minimumContributionSen: 1,
            minimumContributionMarginPct: 25.0,
          });
        }).toThrow(TypeError);
      });

      test('Strictly rejects negative sen amounts with RangeError', () => {
        expect(() => {
          evaluateMarginContribution({
            netSalesExTaxSen: 10000,
            cogsSen: -500, // Negative COGS
            packagingSen: 0,
            paymentFeesSen: 0,
            fulfilmentVariableCostSen: 0,
            deliverySubsidySen: 0,
            agentCommissionSen: 0,
            rewardCostSen: 0,
            expectedReturnLossSen: 0,
            minimumContributionSen: 1,
            minimumContributionMarginPct: 25.0,
          });
        }).toThrow(RangeError);
      });
    });
  });
});
