/**
 * AbangColek Platform — Pengesahan Input Simulasi Margin (TEGAS)
 *
 * Sumber kebenaran tunggal untuk mengesahkan input margin sebelum ia sampai
 * kepada penilai kanonikal `evaluateMarginContribution` (shared/growth-contracts).
 *
 * Matlamat:
 * - Tiada input komersial => MARGIN_INPUTS_NOT_PROVIDED (bukan nilai rekaan).
 * - Input yang rosak (sen pecahan, sen negatif, peratusan di luar 0..100,
 *   nilai bukan nombor) => MARGIN_INPUTS_INVALID + senarai kunci rosak.
 * - Tiada `TypeError` / `RangeError` daripada penilai boleh keluar ke lapisan HTTP.
 *
 *Semua laluan (chat dan domain tool) mesti menggunakan pengesahan ini supaya
 * tidak ada dua validator yang berbeza.
 */

import type { MarginSimulationInput } from '../../shared/growth-contracts';

export type MarginSimulationParseFailure = {
  ok: false;
  reason: 'MARGIN_INPUTS_NOT_PROVIDED' | 'MARGIN_INPUTS_INVALID';
  invalidKeys: string[];
};

export type MarginSimulationParseResult =
  | { ok: true; input: MarginSimulationInput }
  | MarginSimulationParseFailure;

/** Kunci yang mesti berada dalam sen (integer, bukan negatif). */
export const MARGIN_SEN_INPUT_KEYS: ReadonlyArray<keyof MarginSimulationInput> = [
  'netSalesExTaxSen',
  'cogsSen',
  'packagingSen',
  'paymentFeesSen',
  'fulfilmentVariableCostSen',
  'deliverySubsidySen',
  'agentCommissionSen',
  'rewardCostSen',
  'expectedReturnLossSen',
  'minimumContributionSen',
];

/** Kunci wajib untuk sebarang simulasi margin. */
export const MARGIN_REQUIRED_INPUT_KEYS: ReadonlyArray<keyof MarginSimulationInput> = [
  'netSalesExTaxSen',
  'cogsSen',
  'minimumContributionMarginPct',
];

function readNumber(source: Record<string, unknown>, key: keyof MarginSimulationInput): number | null {
  const value = source[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return Number.NaN;
  return value;
}

export function parseMarginSimulationInput(
  raw: unknown,
  options: { defaultMinimumContributionSen?: number } = {}
): MarginSimulationParseResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'MARGIN_INPUTS_NOT_PROVIDED', invalidKeys: [] };
  }
  const source = raw as Record<string, unknown>;

  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of MARGIN_REQUIRED_INPUT_KEYS) {
    const value = readNumber(source, key);
    if (value === null) missing.push(key);
    else if (Number.isNaN(value)) invalid.push(key);
  }
  if (missing.length) {
    return { ok: false, reason: 'MARGIN_INPUTS_NOT_PROVIDED', invalidKeys: missing };
  }

  for (const key of MARGIN_SEN_INPUT_KEYS) {
    const value = readNumber(source, key);
    if (value === null) continue;
    if (Number.isNaN(value) || !Number.isInteger(value) || value < 0) invalid.push(key);
  }

  const marginPct = readNumber(source, 'minimumContributionMarginPct');
  if (marginPct !== null && !Number.isNaN(marginPct) && (marginPct < 0 || marginPct > 100)) {
    invalid.push('minimumContributionMarginPct');
  }

  if (invalid.length) {
    return { ok: false, reason: 'MARGIN_INPUTS_INVALID', invalidKeys: [...new Set(invalid)] };
  }

  const optional = (key: keyof MarginSimulationInput): number => readNumber(source, key) ?? 0;
  const minimumContributionSen = readNumber(source, 'minimumContributionSen');

  return {
    ok: true,
    input: {
      netSalesExTaxSen: readNumber(source, 'netSalesExTaxSen') as number,
      cogsSen: readNumber(source, 'cogsSen') as number,
      packagingSen: optional('packagingSen'),
      paymentFeesSen: optional('paymentFeesSen'),
      fulfilmentVariableCostSen: optional('fulfilmentVariableCostSen'),
      deliverySubsidySen: optional('deliverySubsidySen'),
      agentCommissionSen: optional('agentCommissionSen'),
      rewardCostSen: optional('rewardCostSen'),
      expectedReturnLossSen: optional('expectedReturnLossSen'),
      minimumContributionSen: minimumContributionSen ?? options.defaultMinimumContributionSen ?? 0,
      minimumContributionMarginPct: marginPct as number,
    },
  };
}
