import { describe, expect, test } from 'bun:test';
import { evaluateMarginContribution } from '../../server/platform/marginGuardian';
import type { MarginSimulationInput } from '../../shared/growth-contracts';

describe('FIN-01 Financial Integrity v2.4 — Exact Margin Boundaries & Rules Own The Money', () => {
  const baseInput: MarginSimulationInput = {
    netSalesExTaxSen: 100000, // RM 1,000.00
    cogsSen: 75000,          // RM 750.00
    packagingSen: 0,
    paymentFeesSen: 0,
    fulfilmentVariableCostSen: 0,
    deliverySubsidySen: 0,
    agentCommissionSen: 0,
    rewardCostSen: 0,
    expectedReturnLossSen: 0,
    minimumContributionSen: 0,
    minimumContributionMarginPct: 25, // Min 25.00%
  };

  test('FIN-01 exact comparison: blocks 24.996% even when display rounding rounds to 25.00%', () => {
    // netSalesExTaxSen = 100,000, cogsSen = 75,004 -> contribution = 24,996 sen
    // Raw margin = 24.996%. Display rounds to 25.00%.
    // Exact BigInt arithmetic: 24,996 * 10,000 = 249,960,000 < 100,000 * 2,500 = 250,000,000.
    // MUST FAIL margin percentage check.
    const input: MarginSimulationInput = {
      ...baseInput,
      cogsSen: 75004,
    };

    const res = evaluateMarginContribution(input);

    expect(res.contributionSen).toBe(24996);
    expect(res.contributionMarginPct).toBe(25); // Display rounds to 25%
    expect(res.isContributionPass).toBe(true);
    expect(res.isMarginPctPass).toBe(false);    // Exact comparison MUST fail
    expect(res.allowed).toBe(false);
    expect(res.reasonCode).toBe('INSUFFICIENT_PERCENT_MARGIN');
  });

  test('FIN-01 exact threshold: passes when margin meets exact 25.000% threshold', () => {
    // netSalesExTaxSen = 100,000, cogsSen = 75,000 -> contribution = 25,000 sen (exact 25.00%)
    const input: MarginSimulationInput = {
      ...baseInput,
      cogsSen: 75000,
    };

    const res = evaluateMarginContribution(input);

    expect(res.contributionSen).toBe(25000);
    expect(res.contributionMarginPct).toBe(25);
    expect(res.isContributionPass).toBe(true);
    expect(res.isMarginPctPass).toBe(true);
    expect(res.allowed).toBe(true);
    expect(res.reasonCode).toBe('PASS');
  });

  test('Zero sales boundary: net sales <= 0 must never create margin ratio eligibility', () => {
    // When netSalesExTaxSen = 0 and minimumContributionMarginPct = 0,
    // zero sales must not pass margin ratio check even if contribution meets minimumContributionSen.
    const zeroSalesInput: MarginSimulationInput = {
      ...baseInput,
      netSalesExTaxSen: 0,
      cogsSen: 0,
      minimumContributionSen: 0,
      minimumContributionMarginPct: 0,
    };

    const res = evaluateMarginContribution(zeroSalesInput);

    expect(res.contributionSen).toBe(0);
    expect(res.isContributionPass).toBe(true);
    expect(res.isMarginPctPass).toBe(false); // Zero sales must NOT pass ratio
    expect(res.allowed).toBe(false);
    expect(res.reasonCode).toBe('INSUFFICIENT_PERCENT_MARGIN');
  });

  test('Safe integer validation: rejects negative variable costs', () => {
    const invalidCostInput: MarginSimulationInput = {
      ...baseInput,
      cogsSen: -100,
    };

    expect(() => evaluateMarginContribution(invalidCostInput)).toThrow(RangeError);
  });

  test('Safe integer validation: rejects fractional sen amounts', () => {
    const fractionalInput: MarginSimulationInput = {
      ...baseInput,
      cogsSen: 75000.5,
    };

    expect(() => evaluateMarginContribution(fractionalInput)).toThrow(TypeError);
  });

  test('Safe integer validation: rejects NaN and Infinite amounts', () => {
    const nanInput: MarginSimulationInput = {
      ...baseInput,
      netSalesExTaxSen: Number.NaN,
    };
    expect(() => evaluateMarginContribution(nanInput)).toThrow(TypeError);

    const infInput: MarginSimulationInput = {
      ...baseInput,
      netSalesExTaxSen: Number.POSITIVE_INFINITY,
    };
    expect(() => evaluateMarginContribution(infInput)).toThrow(TypeError);
  });

  test('Policy validation: rejects invalid minimumContributionMarginPct', () => {
    const negativePctInput: MarginSimulationInput = {
      ...baseInput,
      minimumContributionMarginPct: -5,
    };
    expect(() => evaluateMarginContribution(negativePctInput)).toThrow(RangeError);

    const over100PctInput: MarginSimulationInput = {
      ...baseInput,
      minimumContributionMarginPct: 105,
    };
    expect(() => evaluateMarginContribution(over100PctInput)).toThrow(RangeError);

    const nanPctInput: MarginSimulationInput = {
      ...baseInput,
      minimumContributionMarginPct: Number.NaN,
    };
    expect(() => evaluateMarginContribution(nanPctInput)).toThrow(TypeError);
  });

  test('Negative contribution handling: cash failure overrides percent failure reason code', () => {
    const lossInput: MarginSimulationInput = {
      ...baseInput,
      netSalesExTaxSen: 10000,
      cogsSen: 15000, // Loss of 5,000 sen
      minimumContributionSen: 1000,
      minimumContributionMarginPct: 10,
    };

    const res = evaluateMarginContribution(lossInput);

    expect(res.contributionSen).toBe(-5000);
    expect(res.isContributionPass).toBe(false);
    expect(res.isMarginPctPass).toBe(false);
    expect(res.allowed).toBe(false);
    expect(res.reasonCode).toBe('INSUFFICIENT_CASH_MARGIN');
  });
});
