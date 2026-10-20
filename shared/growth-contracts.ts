/**
 * AbangColek Sovereign GrowthOS & Orbit — Canonical Growth Contracts v2.1
 * Pematuhan Prinsip: Rules Own The Money • Zero-New-Paid-Cloud-Spend • Two-Sided 1-Level Referral
 */

export type CommissionLedgerStatus =
  | 'pending'
  | 'eligible'
  | 'approved'
  | 'paid'
  | 'reversed'
  | 'disputed';

export interface CommissionTransaction {
  id: string;
  orderId: string;
  dealerOrgId: string;
  agentUserId: string;
  amountSen: number;
  status: CommissionLedgerStatus;
  eligibleAt: string;
  approvedAt?: string;
  paidAt?: string;
  reversedAt?: string;
  contraReason?: string;
  contraOfId?: string;
  settledAt?: string;
  settledInCommissionId?: string;
  absorbedAmountSen?: number;
  policyVersion: number;
  createdAt: string;
}

export interface DealerCommissionSummary {
  dealerOrgId: string;
  totalEarnedSen: number;
  pendingSen: number;
  eligibleSen: number;
  approvedSen: number;
  paidSen: number;
  reversedContraSen: number;
  netPayableSen: number;
  unsettledDeficitSen: number;
}

export type LoyaltyEventType =
  | 'earned'
  | 'redeemed'
  | 'expired'
  | 'reversed'
  | 'adjustment';

export interface LoyaltyLedgerEntry {
  id: string;
  userId: string;
  pointsDelta: number;
  monetaryEquivalentSen: number;
  eventType: LoyaltyEventType;
  sourceOrderId?: string;
  expiryAt?: string;
  description: string;
  createdAt: string;
}

export const LOYALTY_EARN_RATE_SEN_PER_POINT = 100;
export const LOYALTY_REDEMPTION_POINTS_PER_RM = 100;
export const LOYALTY_POINT_VALUE_SEN = 1;

export function calculateLoyaltyPointsEarned(amountSen: number): number {
  if (!Number.isSafeInteger(amountSen) || amountSen <= 0) return 0;
  return Math.floor(amountSen / LOYALTY_EARN_RATE_SEN_PER_POINT);
}

export function loyaltyPointsToDiscountSen(points: number): number {
  if (!Number.isSafeInteger(points) || points <= 0) return 0;
  return points * LOYALTY_POINT_VALUE_SEN;
}

export function discountSenToLoyaltyPoints(discountSen: number): number {
  if (!Number.isSafeInteger(discountSen) || discountSen <= 0) return 0;
  return Math.ceil(discountSen / LOYALTY_POINT_VALUE_SEN);
}

export interface MarginSimulationInput {
  netSalesExTaxSen: number;
  cogsSen: number;
  packagingSen: number;
  paymentFeesSen: number;
  fulfilmentVariableCostSen: number;
  deliverySubsidySen: number;
  agentCommissionSen: number;
  rewardCostSen: number;
  expectedReturnLossSen: number;
  minimumContributionSen: number;
  minimumContributionMarginPct: number;
}

export interface MarginSimulationResult {
  contributionSen: number;
  contributionMarginPct: number;
  isContributionPass: boolean;
  isMarginPctPass: boolean;
  allowed: boolean;
  reasonCode: 'PASS' | 'INSUFFICIENT_CASH_MARGIN' | 'INSUFFICIENT_PERCENT_MARGIN' | 'EXCEPTION_OVERRIDE_REQUIRED';
}

function assertSafeSen(val: unknown, name: string, allowNegative = false): asserts val is number {
  if (typeof val !== 'number' || !Number.isSafeInteger(val)) {
    throw new TypeError(`${name} mesti integer sen yang sah (bukan NaN, infiniti atau pecahan).`);
  }
  if (!allowNegative && val < 0) {
    throw new RangeError(`${name} tidak boleh bernilai negatif.`);
  }
}

function assertValidMarginPct(val: unknown): asserts val is number {
  if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
    throw new TypeError('minimumContributionMarginPct mesti nombor finite yang sah.');
  }
  if (val < 0 || val > 100) {
    throw new RangeError('minimumContributionMarginPct mesti antara 0 dan 100.');
  }
}

/**
 * Margin Guardian Engine (v2.4 - Rules Own The Money)
 * Menentukan kelayakan kempen atau diskaun berlandaskan Sumbangan Margin Sebenar.
 * FIN-01: Perbandingan nisbah menggunakan aritmetik integer tepat (BigInt) sebelum rounding paparan.
 * Net sales <= 0 tidak menghasilkan kelayakan nisbah margin.
 */
export function evaluateMarginContribution(input: MarginSimulationInput): MarginSimulationResult {
  assertSafeSen(input.netSalesExTaxSen, 'netSalesExTaxSen', false);
  assertSafeSen(input.cogsSen, 'cogsSen', false);
  assertSafeSen(input.packagingSen, 'packagingSen', false);
  assertSafeSen(input.paymentFeesSen, 'paymentFeesSen', false);
  assertSafeSen(input.fulfilmentVariableCostSen, 'fulfilmentVariableCostSen', false);
  assertSafeSen(input.deliverySubsidySen, 'deliverySubsidySen', false);
  assertSafeSen(input.agentCommissionSen, 'agentCommissionSen', false);
  assertSafeSen(input.rewardCostSen, 'rewardCostSen', false);
  assertSafeSen(input.expectedReturnLossSen, 'expectedReturnLossSen', false);
  assertSafeSen(input.minimumContributionSen, 'minimumContributionSen', true);
  assertValidMarginPct(input.minimumContributionMarginPct);

  const minimumMarginBps = BigInt(Math.round(input.minimumContributionMarginPct * 100));

  const totalVariableCostsSenBig =
    BigInt(input.cogsSen) +
    BigInt(input.packagingSen) +
    BigInt(input.paymentFeesSen) +
    BigInt(input.fulfilmentVariableCostSen) +
    BigInt(input.deliverySubsidySen) +
    BigInt(input.agentCommissionSen) +
    BigInt(input.rewardCostSen) +
    BigInt(input.expectedReturnLossSen);

  if (totalVariableCostsSenBig > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Jumlah kos pembolehubah melebihi julat integer selamat.');
  }

  const netSalesSenBig = BigInt(input.netSalesExTaxSen);
  const contributionSenBig = netSalesSenBig - totalVariableCostsSenBig;

  if (
    contributionSenBig < BigInt(Number.MIN_SAFE_INTEGER) ||
    contributionSenBig > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new RangeError('Sumbangan margin melebihi julat integer selamat.');
  }

  const contributionSen = Number(contributionSenBig);

  const rawMarginPct =
    input.netSalesExTaxSen > 0
      ? (contributionSen / input.netSalesExTaxSen) * 100
      : 0;
  const contributionMarginPct = Math.round(rawMarginPct * 100) / 100;

  const isContributionPass = contributionSenBig >= BigInt(input.minimumContributionSen);

  // Exact BigInt comparison: contributionSen * 10000 >= netSalesSen * minimumMarginBps
  // Net sales <= 0 must never create ratio eligibility.
  const isMarginPctPass =
    input.netSalesExTaxSen > 0 &&
    contributionSenBig * 10000n >= netSalesSenBig * minimumMarginBps;

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

export interface PublicOrderTrackingRecord {
  trackingToken: string;
  orderId: string;
  orderState: 'placed' | 'confirmed' | 'processing' | 'ready_for_pickup' | 'shipped' | 'delivered' | 'cancelled';
  fulfilmentState: 'not_packed' | 'packed' | 'handed_to_carrier' | 'in_transit' | 'ful_delivered' | 'exception';
  carrier?: string;
  consignmentNo?: string;
  updatedAt: string;
}

export interface ReferralAttribution {
  referralCode: string;
  referrerUserId?: string;
  referrerOrgId?: string;
  refereeDiscountSen: number;
  referrerRewardSen: number;
  appliedAt: string;
  fraudRiskScore: number;
  isSelfReferralBlocked: boolean;
}

export const DEFAULT_HQ_WHATSAPP = '601112345678';
export const REFERRAL_CODE_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

export function isValidReferralCode(code: unknown): code is string {
  if (typeof code !== 'string') return false;
  const trimmed = code.trim();
  return REFERRAL_CODE_REGEX.test(trimmed);
}

export function sanitizeReferralCode(code: unknown): string | undefined {
  if (typeof code !== 'string') return undefined;
  const trimmed = code.trim();
  return REFERRAL_CODE_REGEX.test(trimmed) ? trimmed : undefined;
}

export function formatWhatsAppUrl(phoneNumber?: string | null, message: string = ''): string {
  const raw = phoneNumber && phoneNumber.trim() ? phoneNumber.trim() : DEFAULT_HQ_WHATSAPP;
  const cleanPhone = raw.replace(/[^0-9]/g, '');
  const malaysianPhone = cleanPhone.startsWith('60')
    ? cleanPhone
    : cleanPhone.startsWith('0')
      ? `60${cleanPhone.slice(1)}`
      : cleanPhone.length > 0
        ? `60${cleanPhone}`
        : DEFAULT_HQ_WHATSAPP;
  return `https://wa.me/${malaysianPhone}?text=${encodeURIComponent(message)}`;
}
