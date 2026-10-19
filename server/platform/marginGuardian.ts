import type { MarginSimulationInput, MarginSimulationResult } from '../../shared/growth-contracts';

/**
 * Margin Guardian Engine (v2.1)
 * Menentukan kelayakan kempen atau diskaun berlandaskan Sumbangan Margin Sebenar.
 * P0 FIX: Memisahkan secara ketat sumbangan tunai (Sen/RM) dan peratusan margin (%).
 */
export function evaluateMarginContribution(input: MarginSimulationInput): MarginSimulationResult {
  const totalVariableCostsSen =
    input.cogsSen +
    input.packagingSen +
    input.paymentFeesSen +
    input.fulfilmentVariableCostSen +
    input.deliverySubsidySen +
    input.agentCommissionSen +
    input.rewardCostSen +
    input.expectedReturnLossSen;

  const contributionSen = input.netSalesExTaxSen - totalVariableCostsSen;
  const rawMarginPct =
    input.netSalesExTaxSen > 0
      ? (contributionSen / input.netSalesExTaxSen) * 100
      : 0;
  const contributionMarginPct = Math.round(rawMarginPct * 100) / 100;

  const isContributionPass = contributionSen >= input.minimumContributionSen;
  const isMarginPctPass = contributionMarginPct >= input.minimumContributionMarginPct;

  if (!isContributionPass) {
    return {
      contributionSen,
      contributionMarginPct,
      isContributionPass: false,
      isMarginPctPass,
      allowed: false,
      reasonCode: 'INSUFFICIENT_CASH_MARGIN',
    };
  }

  if (!isMarginPctPass) {
    return {
      contributionSen,
      contributionMarginPct,
      isContributionPass: true,
      isMarginPctPass: false,
      allowed: false,
      reasonCode: 'INSUFFICIENT_PERCENT_MARGIN',
    };
  }

  return {
    contributionSen,
    contributionMarginPct,
    isContributionPass: true,
    isMarginPctPass: true,
    allowed: true,
    reasonCode: 'PASS',
  };
}

