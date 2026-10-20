/**
 * AbangColek Sovereign GrowthOS — ADV-13..ADV-18 Growth & Finance Tools
 *
 * The margin evaluation reuses the canonical Margin Guardian
 * (`evaluateMarginContribution`), the commission benefit uses the canonical
 * `calculateEarnedBenefit`, and the finance digest uses the canonical
 * `Reports.financeSummary`.
 */

import { defineTool, fail, resolveContext } from './common';
import { provenance } from '../runtime';
import type { ToolDefinition } from '../types';
import {
  commissionPolicies,
  commissionsForOrder,
  localDay,
  policyForVersion,
  readOrder,
} from '../records';
import { outletAccessCode } from '../scope';
import { evaluateMarginContribution } from '../../../platform/marginGuardian';
import { calculateEarnedBenefit } from '../../../platform/dealers';
import { isValidReferralCode } from '../../../../shared/growth-contracts';
import { Loyalty } from '../../../platform/loyalty';
import { Auth } from '../../../platform/auth';
import { Commerce } from '../../../platform/commerce';
import { Work } from '../../../platform/work';
import { Operations } from '../../../platform/operations';
import { Reports } from '../../../platform/reports';
import type { CommissionTransaction } from '../../../../shared/dealer-contracts';

const FIN01_MINIMUM_MARGIN_PCT = 25;

export const growthTools: ToolDefinition[] = [
  // ADV-13: simulate_campaign (S)
  defineTool({
    logicalCapabilityId: 'ADV-13',
    registrationName: 'simulate_campaign',
    riskClass: 'S',
    description:
      'Menyimulasikan sumbang margin kempen melalui Margin Guardian sebenar (integer Sen, nisbah BigInt, dasar policies FIN-01 25%).',
    requiredRole: 'founder',
    inputSchema: {
      netSalesExTaxSen: { type: 'integer', min: 0, max: 1_000_000_000 },
      /** @deprecated legacy alias for netSalesExTaxSen (kept for API continuity). */
      netSalesSen: { type: 'integer', min: 0, max: 1_000_000_000 },
      cogsSen: { required: true, type: 'integer', min: 0, max: 1_000_000_000 },
      packagingSen: { type: 'integer', min: 0, max: 1_000_000_000 },
      paymentFeesSen: { type: 'integer', min: 0, max: 1_000_000_000 },
      fulfilmentVariableCostSen: { type: 'integer', min: 0, max: 1_000_000_000 },
      deliverySubsidySen: { type: 'integer', min: 0, max: 1_000_000_000 },
      agentCommissionSen: { type: 'integer', min: 0, max: 1_000_000_000 },
      rewardCostSen: { type: 'integer', min: 0, max: 1_000_000_000 },
      expectedReturnLossSen: { type: 'integer', min: 0, max: 1_000_000_000 },
      minimumContributionSen: { type: 'integer', min: 0, max: 1_000_000_000 },
      minimumContributionMarginPct: { type: 'number', min: 0, max: 100 },
      $oneOf: { type: 'array', items: { type: 'string' } },
    },
    execute: async (input, ctx) => {
      const legacyAliasUsed = input.netSalesExTaxSen === undefined && input.netSalesSen !== undefined;
      const netSalesExTaxSen = (input.netSalesExTaxSen ?? input.netSalesSen) as number;
      const defaultsApplied: string[] = [];
      const cost = (key: string): number => {
        if (typeof input[key] === 'number') return input[key] as number;
        defaultsApplied.push(`${key}=0`);
        return 0;
      };
      const minimumContributionSen =
        typeof input.minimumContributionSen === 'number'
          ? (input.minimumContributionSen as number)
          : (defaultsApplied.push('minimumContributionSen=0'), 0);
      const minimumContributionMarginPct =
        typeof input.minimumContributionMarginPct === 'number'
          ? (input.minimumContributionMarginPct as number)
          : (defaultsApplied.push(`minimumContributionMarginPct=${FIN01_MINIMUM_MARGIN_PCT}`), FIN01_MINIMUM_MARGIN_PCT);

      const simulation = {
        netSalesExTaxSen,
        cogsSen: input.cogsSen as number,
        packagingSen: cost('packagingSen'),
        paymentFeesSen: cost('paymentFeesSen'),
        fulfilmentVariableCostSen: cost('fulfilmentVariableCostSen'),
        deliverySubsidySen: cost('deliverySubsidySen'),
        agentCommissionSen: cost('agentCommissionSen'),
        rewardCostSen: cost('rewardCostSen'),
        expectedReturnLossSen: cost('expectedReturnLossSen'),
        minimumContributionSen,
        minimumContributionMarginPct,
      };

      const result = evaluateMarginContribution(simulation);
      const netSales = BigInt(simulation.netSalesExTaxSen);
      const marginBasisPoints =
        netSales > 0n ? Number((BigInt(result.contributionSen) * 10000n) / netSales) : 0;

      return {
        ok: true,
        netSalesSen: simulation.netSalesExTaxSen,
        contributionSen: result.contributionSen,
        contributionMarginPct: result.contributionMarginPct,
        marginBasisPoints,
        passed: result.allowed,
        reason:
          result.allowed
            ? 'MARGIN_PASSED'
            : result.isContributionPass
              ? 'MARGIN_RATIO_FAILED'
              : 'MARGIN_CASH_FAILED',
        reasonCode: result.reasonCode,
        isContributionPass: result.isContributionPass,
        isMarginPctPass: result.isMarginPctPass,
        allowed: result.allowed,
        policy: {
          source: 'FIN-01',
          minimumContributionMarginPct: simulation.minimumContributionMarginPct,
        },
        input: simulation,
        defaultsApplied,
        legacyAliasUsed,
        evaluator: 'margin-guardian:evaluateMarginContribution',
        mutated: false,
        provenance: provenance(ctx.runtime, ctx, ['shared/growth-contracts:evaluateMarginContribution'], 'margin-guardian'),
      };
    },
  }),

  // ADV-14: explain_commission (Q)
  defineTool({
    logicalCapabilityId: 'ADV-14',
    registrationName: 'explain_commission',
    riskClass: 'Q',
    description:
      'Menerangkan komisen ejen bagi satu pesanan: kelayakan, kadar polisi, amaun dan pembalikan kontra (lejar sebenar).',
    requiredRole: 'staff',
    inputSchema: {
      orderId: { required: true, type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const order = readOrder(store, input.orderId as string);
      if (!order) {
        return fail('ORDER_NOT_FOUND', `Pesanan ${String(input.orderId)} tidak ditemui.`);
      }
      const refusal = outletAccessCode(actor, order.outletId);
      if (refusal) return fail(refusal, 'Pesanan ini di luar skop akses pemeran.');

      const entries = commissionsForOrder(store, order.id);
      const policies = commissionPolicies(store);
      const explanations: string[] = [];
      if (!entries.length) explanations.push('TIADA_TRANSAKSI_KOMISEN');
      if (!policies.length) explanations.push('POLISI_KOMISEN_BELUM_DILULUSKAN');

      const detailed = entries.map((entry: CommissionTransaction) => {
        const policy = policyForVersion(store, entry.policyVersion) ?? policies[policies.length - 1] ?? null;
        const benefit = policy
          ? calculateEarnedBenefit(
              {
                orderId: order.id,
                paidAmountSen: order.paidAmountSen,
                refundAmountSen: order.refundAmountSen,
                paymentConfirmedAt: order.paidAmountSen > 0 ? order.updatedAt : undefined,
                productIds: order.lines.map((line) => line.productId),
              },
              policy,
            )
          : null;
        return {
          id: entry.id,
          dealerOrgId: entry.dealerOrgId,
          agentUserId: entry.agentUserId,
          amountSen: entry.amountSen,
          status: entry.status,
          policyVersion: entry.policyVersion,
          rateBasisPoints: policy?.rateBasisPoints ?? null,
          eligibleProductIds: policy?.eligibleProductIds ?? null,
          derivedBenefit: benefit,
          contraReason: entry.contraReason ?? null,
          contraOfId: entry.contraOfId ?? null,
          createdAt: entry.createdAt,
        };
      });

      return {
        ok: true,
        orderId: order.id,
        orderRevision: order.revision,
        orderPaymentState: order.paymentState,
        orderFulfilmentStatus: order.fulfilmentStatus,
        commissionCount: entries.length,
        commissions: detailed,
        explanations,
        provenance: provenance(ctx.runtime, ctx, ['commission_ledger', 'commission_policies', 'orders'], 'dealer-benefit-calculator'),
      };
    },
  }),

  // ADV-15: audit_loyalty (Q)
  defineTool({
    logicalCapabilityId: 'ADV-15',
    registrationName: 'audit_loyalty',
    riskClass: 'Q',
    description:
      'Mengesan lejar kesetiaan sebenar: baki FIFO, mata luput belum direkod, dan sebarang anomali invarian (baca sahaja).',
    requiredRole: 'staff',
    inputSchema: {
      userId: { required: true, type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store } = resolved;
      const userId = input.userId as string;
      const at = ctx.runtime.clock();
      const loyalty = new Loyalty(store);
      const entries = loyalty.getEntries(userId);
      const summary = loyalty.getSummary(userId, at);
      const anomalies: string[] = [];

      const earnedPoints = entries
        .filter((entry) => entry.eventType === 'earned')
        .reduce((sum, entry) => sum + entry.pointsDelta, 0);
      const redeemedPoints = entries
        .filter((entry) => entry.eventType === 'redeemed')
        .reduce((sum, entry) => sum + Math.abs(entry.pointsDelta), 0);
      const reversedPoints = entries
        .filter((entry) => entry.eventType === 'reversed')
        .reduce((sum, entry) => sum + entry.pointsDelta, 0);
      const netPoints = entries.reduce((sum, entry) => sum + entry.pointsDelta, 0);

      if (!entries.length) anomalies.push('LEDAR_KOSONG');
      if (summary.balancePoints < 0) anomalies.push('BAKI_NEGATIF');
      if (summary.totalExpiredPoints > 0) anomalies.push('MATA_LUPUT_DIREKOD');
      if (loyalty.getExpiredPoints(userId, at) > 0) anomalies.push('MATA_LUPUT_BELUM_DIREKOD');
      if (netPoints !== earnedPoints - redeemedPoints + reversedPoints) {
        anomalies.push('JUMLAH_MATA_TIDAK_SEIMBANG');
      }
      if (entries.some((entry) => entry.expiryAt && entry.expiryAt < entry.createdAt)) {
        anomalies.push('TARIKH_LUPUT_LEBIH_LAMPAU_DARI_PENCIPTAAN');
      }
      const monetaryValueSen = summary.balancePoints * 1;
      if (monetaryValueSen !== summary.monetaryValueSen) anomalies.push('NILAI_MONETARI_TIDAK_SEIMBANG');

      return {
        ok: true,
        userId,
        balancePoints: summary.balancePoints,
        totalEarnedPoints: summary.totalEarnedPoints,
        totalRedeemedPoints: summary.totalRedeemedPoints,
        totalExpiredPoints: summary.totalExpiredPoints,
        totalReversedPoints: summary.totalReversedPoints,
        monetaryValueSen: summary.monetaryValueSen,
        entriesCount: summary.entriesCount,
        unrecordedExpiredPoints: loyalty.getExpiredPoints(userId, at),
        byEventType: {
          earned: earnedPoints,
          redeemed: redeemedPoints,
          reversed: reversedPoints,
        },
        anomalies,
        status: anomalies.length === 0 ? 'clean' : 'anomalies_detected',
        provenance: provenance(ctx.runtime, ctx, ['loyalty_ledger'], 'loyalty-ledger-read'),
      };
    },
  }),

  // ADV-16: assess_referral (S)
  defineTool({
    logicalCapabilityId: 'ADV-16',
    registrationName: 'assess_referral',
    riskClass: 'S',
    description:
      'Menilai atribusi referral bagi satu pesanan: kesahihan kod, rujukan sendiri, status bayaran dan skor risiko referral yang dikira.',
    requiredRole: 'staff',
    inputSchema: {
      orderId: { required: true, type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const order = readOrder(store, input.orderId as string);
      if (!order) {
        return fail('ORDER_NOT_FOUND', `Pesanan ${String(input.orderId)} tidak ditemui.`);
      }
      const refusal = outletAccessCode(actor, order.outletId);
      if (refusal) return fail(refusal, 'Pesanan ini di luar skop akses pemeran.');

      const referralCode = order.referralCode ?? null;
      const attributedOrgId = order.dealerOrgId ?? null;
      if (!referralCode) {
        return {
          ok: true,
          orderId: order.id,
          referralCode: null,
          status: 'no_referral_attribution',
          fraudRiskScore: 0,
          reasons: ['TIADA_KOD_REFERRAL'],
          mutated: false,
          provenance: provenance(ctx.runtime, ctx, ['orders'], 'referral-rules-read'),
        };
      }

      const validCode = isValidReferralCode(referralCode);
      const selfReferralBlocked = Boolean(attributedOrgId && attributedOrgId.toLowerCase() === referralCode.toLowerCase());
      const paymentConfirmed = order.paidAmountSen > 0 && order.paymentState !== 'pending';
      const sameCodeOrders = store
        .all<import('../../../../shared/platform-contracts').OrderRecord>('orders')
        .filter((candidate) => candidate.referralCode === referralCode);

      let fraudRiskScore = 0;
      const reasons: string[] = [];
      if (!validCode) {
        fraudRiskScore += 40;
        reasons.push('KOD_REFERRAL_TIDAK_SAH');
      }
      if (selfReferralBlocked) {
        fraudRiskScore += 50;
        reasons.push('RUJUKAN_SENDIRI_DISEKAT');
      }
      if (!paymentConfirmed) {
        fraudRiskScore += 25;
        reasons.push('BAYARAN_BELUM_DISAHKAN');
      }
      if (sameCodeOrders.length > 3) {
        fraudRiskScore += 15;
        reasons.push('KOD_DIGUNAKAN_BERAPA_KALI');
      }
      if (reasons.length === 0) reasons.push('ATRIBUSI_VALID');

      const policy = commissionPolicies(store)[commissionPolicies(store).length - 1] ?? null;
      const referrerRewardSen = policy
        ? Number((BigInt(Math.max(0, order.paidAmountSen - order.refundAmountSen)) * BigInt(policy.rateBasisPoints)) / 10000n)
        : null;

      return {
        ok: true,
        orderId: order.id,
        referralCode,
        attributedOrgId,
        validCode,
        selfReferralBlocked,
        paymentConfirmed,
        orderAmountSen: order.amountSen,
        paidAmountSen: order.paidAmountSen,
        refundAmountSen: order.refundAmountSen,
        refereeDiscountSen: order.loyaltyDiscountSen ?? 0,
        referrerRewardSen,
        commissionPolicyVersion: policy?.version ?? null,
        fraudRiskScore: Math.min(100, fraudRiskScore),
        ordersUsingSameCode: sameCodeOrders.length,
        status: selfReferralBlocked ? 'blocked' : validCode && paymentConfirmed ? 'attribution_confirmed' : 'attribution_incomplete',
        reasons,
        mutated: false,
        provenance: provenance(ctx.runtime, ctx, ['orders', 'commission_policies'], 'referral-rules-read'),
      };
    },
  }),

  // ADV-17: reconcile_dayclose (S)
  defineTool({
    logicalCapabilityId: 'ADV-17',
    registrationName: 'reconcile_dayclose',
    riskClass: 'S',
    description:
      'Menyelaraskan rekod day close dengan bayaran tunai sebenar pada hari tersebut dan mengesan drift (baca sahaja).',
    requiredRole: 'staff',
    inputSchema: {
      dayCloseId: { required: true, type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const record = store.get<import('../../../../shared/platform-contracts').DayCloseRecord>('dayclose', input.dayCloseId as string);
      if (!record) {
        return fail('DAY_CLOSE_NOT_FOUND', `Rekod day close '${String(input.dayCloseId)}' tidak ditemui.`);
      }
      const refusal = outletAccessCode(actor, record.outletId);
      if (refusal) return fail(refusal, 'Day close ini di luar skop akses pemeran.');

      const auth = new Auth(store);
      const commerce = new Commerce(store, auth);
      const work = new Work(store, auth, commerce);
      const operations = new Operations(store, auth, commerce, work);
      const cashPayments = operations.cashPayments(record.outletId, record.date);
      const expectedCashSen = cashPayments.reduce(
        (sum, payment) => sum + (payment.state === 'confirmed' ? payment.amountSen : -payment.amountSen),
        0,
      );
      const sourceChanged = expectedCashSen !== record.expectedCashSen;
      const discrepancySen = record.countCashSen - expectedCashSen;

      return {
        ok: true,
        dayCloseId: record.id,
        outletId: record.outletId,
        date: record.date,
        recordStatus: record.status,
        recordedExpectedCashSen: record.expectedCashSen,
        recomputedExpectedCashSen: expectedCashSen,
        countCashSen: record.countCashSen,
        discrepancySen,
        sourceChanged,
        cashPaymentCount: cashPayments.length,
        cashPaymentRefs: cashPayments.map((payment) => payment.id),
        status: sourceChanged ? 'source_changed' : discrepancySen === 0 ? 'matched' : 'variance',
        mutated: false,
        provenance: provenance(ctx.runtime, ctx, ['dayclose', 'payments', 'orders'], 'dayclose-cash-evaluator'),
      };
    },
  }),

  // ADV-18: build_finance_digest (Q)
  defineTool({
    logicalCapabilityId: 'ADV-18',
    registrationName: 'build_finance_digest',
    riskClass: 'Q',
    description:
      'Membina digest kewangan sebenar daripada Reports.financeSummary platform serta kiraan operasi bagi tempoh yang diminta.',
    requiredRole: 'founder',
    inputSchema: {
      from: { type: 'string', min: 10, max: 10 },
      to: { type: 'string', min: 10, max: 10 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const auth = new Auth(store);
      const commerce = new Commerce(store, auth);
      const work = new Work(store, auth, commerce);
      const reports = new Reports(store, auth, commerce, work);
      const summary = reports.financeSummary(actor.principal);

      const from = input.from as string | undefined;
      const to = input.to as string | undefined;
      const inRange = (stamp: string): boolean => {
        const day = localDay(stamp);
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      };
      const orders = store.all<import('../../../../shared/platform-contracts').OrderRecord>('orders');
      const scopedOrders = orders.filter((order) => inRange(order.createdAt));

      return {
        ok: true,
        from: from ?? null,
        to: to ?? null,
        finance: summary,
        operations: {
          orderCount: scopedOrders.length,
          grossOrderValueSen: scopedOrders
            .filter((order) => order.fulfilmentStatus !== 'cancelled')
            .reduce((sum, order) => sum + order.amountSen, 0),
          cancelledOrderCount: scopedOrders.filter((order) => order.fulfilmentStatus === 'cancelled').length,
          openCaseCount: store
            .all<import('../../../../shared/platform-contracts').CaseRecord>('cases')
            .filter((entry) => entry.status !== 'resolved').length,
          openTaskCount: store
            .all<import('../../../../shared/platform-contracts').TaskRecord>('tasks')
            .filter((entry) => entry.status !== 'done').length,
        },
        metricScope: summary.scope,
        provenance: provenance(ctx.runtime, ctx, ['payments', 'orders', 'expenses', 'cases', 'tasks'], 'reports-finance-summary'),
      };
    },
  }),
];
