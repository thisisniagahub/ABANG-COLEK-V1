/**
 * AbangColek Sovereign GrowthOS — ADV-05..ADV-08 Commerce Tools
 *
 * diagnose_checkout, reconcile_payments, preview_refund and propose_refund all
 * read the canonical order / payment / commission records and reuse the
 * platform domain evaluators (payment reconciliation, largest-remainder
 * allocation, cumulative commission reversal).
 */

import { createHash } from 'node:crypto';
import { defineTool, fail, resolveContext } from './common';
import { provenance } from '../runtime';
import type { ToolDefinition } from '../types';
import {
  activeReservations,
  allLots,
  catalogueProducts,
  catalogueVersion,
  commissionPolicies,
  commissionsForOrder,
  paymentsForOrder,
  policyForVersion,
  readOrder,
} from '../records';
import { orderAccessCode, outletAccessCode } from '../scope';
import {
  allocateCumulativeRefundAcrossLines,
  calculateCumulativeReversal,
} from '../../../platform/paymentReconciliation';
import { Loyalty } from '../../../platform/loyalty';
import { detectCheckoutConflicts, summariseCheckoutConflicts } from './advCheckoutConflicts';
import type { OrderRecord, StockLot } from '../../../../shared/platform-contracts';

const availableUnits = (
  lots: StockLot[],
  reservations: Array<{ productId: string; quantity: number; locationId: string; orderId?: string }>,
  productId: string,
  locationId: string | undefined,
  excludingOrderId: string,
): number => {
  const physical = lots
    .filter(
      (lot) =>
        lot.productId === productId &&
        (!locationId || lot.locationId === locationId) &&
        lot.status === 'available' &&
        (!lot.expiryAt || lot.expiryAt > new Date().toISOString()),
    )
    .reduce((sum, lot) => sum + lot.quantity, 0);
  const held = reservations
    .filter(
      (reservation) =>
        reservation.productId === productId &&
        (!locationId || reservation.locationId === locationId) &&
        reservation.orderId !== excludingOrderId,
    )
    .reduce((sum, reservation) => sum + reservation.quantity, 0);
  return physical - held;
};

const staffOrderAccess = (
  actor: import('../scope').ScopedActor,
  order: OrderRecord,
): string | null => {
  const outlet = outletAccessCode(actor, order.outletId);
  if (outlet) return outlet;
  return orderAccessCode(actor, order);
};

export const commerceTools: ToolDefinition[] = [
  // ADV-05: diagnose_checkout (S)
  defineTool({
    logicalCapabilityId: 'ADV-05',
    registrationName: 'diagnose_checkout',
    riskClass: 'S',
    description:
      'Mendiagnos checkout sebenar: sama ada satu pesanan (orderId) atau satu bakul (lines), dengan menyemak baki stor fizikal, versi katalog, status bayaran dan lima kelas konflik checkout (tanpa reservasi baharu).',
    requiredRole: 'customer',
    inputSchema: {
      orderId: { type: 'string', min: 1, max: 120 },
      lines: {
        type: 'array',
        maxItems: 50,
        items: {
          type: 'object',
          fields: {
            productId: { required: true, type: 'string', min: 1, max: 120 },
            /**
             * Relaxed from `integer` on purpose: a fractional / negative / zero
             * quantity must REACH the conflict detector so it can be reported as
             * a typed conflict instead of being swallowed by the schema.
             */
            quantity: { required: true, type: 'number', min: -1_000_000, max: 1_000_000 },
          },
        },
      },
      /** Catalogue version the draft was priced against. Absent => no reprice evidence. */
      catalogueVersion: { type: 'integer', min: 0 },
      /** Fulfilment mode claimed by the cart. A value outside the canonical
       *  modes is reported as CHECKOUT_INVALID_FULFILMENT, never accepted. */
      fulfilment: { type: 'string', min: 1, max: 40 },
      /** Loyalty points the cart claims to redeem (cart mode). */
      redeemPoints: { type: 'integer', min: 0, max: 10_000_000 },
      $oneOf: { type: 'array', items: { type: 'string' } },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const at = ctx.runtime.clock();
      const lots = allLots(store);
      const reservations = activeReservations(store).filter(
        (reservation) => reservation.expiresAt > at,
      );
      const currentCatalogueVersion = catalogueVersion(store);
      const catalogue = catalogueProducts(store);
      const loyalty = new Loyalty(store);
      const catalogueEntries = catalogue.map((product) => ({
        id: product.id,
        priceSen: product.priceSen,
        publishedVersion: product.publishedVersion,
      }));

      // --- Cart diagnosis: no order exists yet, price and stock come from the
      //     canonical catalogue and the live inventory ledger.
      if (!input.orderId) {
        const requestedLines = (input.lines as Array<{ productId: string; quantity: number }>) ?? [];
        const issues: string[] = [];
        const lines = requestedLines.map((line) => {
          const product = catalogue.find((candidate) => candidate.id === line.productId) ?? null;
          if (!product) {
            issues.push(`PRODUKT_TIDAK_DITEMUI: ${line.productId}`);
            return {
              productId: line.productId,
              requestedQuantity: line.quantity,
              availableQuantity: 0,
              sufficient: false,
              priceSen: null,
              knownProduct: false,
            };
          }
          const free = Math.max(
            0,
            availableUnits(lots, reservations, line.productId, undefined, ''),
          );
          const sufficient = free >= line.quantity;
          if (!sufficient) {
            issues.push(`STOK_MENCUKUPI: ${line.productId} perlu ${line.quantity}, ada ${free}`);
          }
          return {
            productId: line.productId,
            requestedQuantity: line.quantity,
            availableQuantity: free,
            sufficient,
            priceSen: product.priceSen,
            knownProduct: true,
          };
        });
        const blocking = issues.filter(
          (issue) => issue.startsWith('STOK_MENCUKUPI') || issue.startsWith('PRODUKT_TIDAK_DITEMUI'),
        );
        // A cart is priced from the live catalogue; reprice is only required when
        // the caller states the catalogue version it was drafted against.
        const draftedCatalogueVersion = input.catalogueVersion as number | undefined;
        const requiresReprice =
          draftedCatalogueVersion !== undefined && draftedCatalogueVersion !== currentCatalogueVersion;
        if (requiresReprice) {
          issues.push(
            `KATALOG_UFUK: draf pada versi ${draftedCatalogueVersion} vs semasa ${currentCatalogueVersion}`,
          );
        }
        // Money stays integer Sen. A line whose quantity is not a valid
        // non-negative integer cannot contribute a whole-sen amount, so it is
        // excluded here and reported as a conflict instead of being rounded.
        const estimatedTotalSen = lines.reduce((sum, line) => {
          if (line.priceSen === null) return sum;
          if (!Number.isInteger(line.requestedQuantity) || line.requestedQuantity < 0) return sum;
          return sum + line.priceSen * line.requestedQuantity;
        }, 0);
        const hasInvalidQuantity = lines.some(
          (line) => !Number.isInteger(line.requestedQuantity) || line.requestedQuantity < 0,
        );

        // A cart has no customer record of its own: the loyalty claim is
        // attributed to the calling actor (the cart's owner) and is only
        // evaluated when the caller actually claims points.
        const claimedPoints = (input.redeemPoints as number | undefined) ?? 0;
        const cartOwnerId = actor.principal.user.id;
        const cartOwnerEntries = loyalty.getEntries(cartOwnerId);
        const conflicts = detectCheckoutConflicts({
          mode: 'cart',
          lines: requestedLines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
          catalogueVersion: currentCatalogueVersion,
          catalogue: catalogueEntries,
          draftCatalogueVersion: draftedCatalogueVersion ?? null,
          orderAmountSen: estimatedTotalSen,
          fulfilment: (input.fulfilment as string | undefined) ?? null,
          loyalty:
            claimedPoints > 0
              ? {
                  claimedPoints,
                  claimedDiscountSen: loyalty.pointsToDiscountSen(claimedPoints),
                  balancePoints: cartOwnerEntries.length
                    ? loyalty.getBalance(cartOwnerId, at)
                    : null,
                }
              : null,
        });
        const summary = summariseCheckoutConflicts(conflicts);
        const blockingConflicts = conflicts.filter((conflict) => conflict.blocking);

        return {
          ok: true,
          mode: 'cart',
          valid: blocking.length === 0 && blockingConflicts.length === 0,
          requiresReprice,
          itemCount: lines.length,
          lines,
          estimatedTotalSen,
          estimatedTotalExcludesInvalidQuantityLines: hasInvalidQuantity,
          catalogueVersion: currentCatalogueVersion,
          issues,
          conflicts,
          conflictCount: summary.conflictCount,
          conflictClasses: summary.classes,
          blockingConflictCount: summary.blockingCount,
          blockingConflictClasses: [...new Set(blockingConflicts.map((c) => c.class))].sort(),
          blockingConflictCodes: [...new Set(blockingConflicts.map((c) => c.code))].sort(),
          mutated: false,
          diagnosedAt: at,
          provenance: provenance(
            ctx.runtime,
            ctx,
            ['catalogue', 'lots', 'reservations', 'loyalty_ledger'],
            'checkout-conflict-detector',
          ),
        };
      }

      const order = readOrder(store, input.orderId as string);
      if (!order) {
        return fail('ORDER_NOT_FOUND', `Pesanan ${String(input.orderId)} tidak ditemui.`);
      }
      const refusal = orderAccessCode(actor, order);
      if (refusal) return fail(refusal, 'Pesanan ini di luar skop akses pemeran.');

      const issues: string[] = [];
      const lines = order.lines.map((line) => {
        const orderReservation = reservations
          .filter((reservation) => reservation.orderId === order.id && reservation.productId === line.productId)
          .reduce((sum, reservation) => sum + reservation.quantity, 0);
        const free = availableUnits(lots, reservations, line.productId, order.outletId, order.id);
        const covered = orderReservation + Math.max(0, free);
        const sufficient = covered >= line.quantity;
        if (!sufficient) {
          issues.push(`STOK_MENCUKUPI: ${line.productId} perlu ${line.quantity}, ada ${Math.max(0, covered)}`);
        }
        if (line.publishedVersion !== currentCatalogueVersion) {
          issues.push(`KATALOG_UFUK: ${line.productId} harga versi ${line.publishedVersion} vs ${currentCatalogueVersion}`);
        }
        return {
          productId: line.productId,
          requestedQuantity: line.quantity,
          reservedQuantity: orderReservation,
          freeQuantity: Math.max(0, free),
          coveredQuantity: covered,
          sufficient,
          priceSen: line.priceSen,
        };
      });

      if (order.paymentState === 'rejected') issues.push('BAYARAN_DITOLAK');
      if (order.paymentState === 'pending') issues.push('BAYARAN_MENUNGGU_VERIFIKASI');
      if (order.fulfilmentStatus === 'cancelled') issues.push('PESANAN_DIBATALKAN');

      const blocking = issues.filter(
        (issue) => issue.startsWith('STOK_MENCUKUPI') || issue.startsWith('BAYARAN_DITOLAK') || issue.startsWith('PESANAN_DIBATALKAN'),
      );

      // The canonical order state is the only source of the loyalty claim.
      const claimedPoints = order.redeemPoints ?? 0;
      const claimedDiscountSen = order.loyaltyDiscountSen ?? 0;
      const customerEntries = loyalty.getEntries(order.customerId);
      const conflicts = detectCheckoutConflicts({
        mode: 'order',
        lines: order.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          priceSen: line.priceSen,
          publishedVersion: line.publishedVersion,
        })),
        catalogueVersion: currentCatalogueVersion,
        catalogue: catalogueEntries,
        orderAmountSen: order.amountSen,
        fulfilment: order.fulfilment,
        fulfilmentStatus: order.fulfilmentStatus,
        paymentState: order.paymentState,
        paidAmountSen: order.paidAmountSen,
        refundAmountSen: order.refundAmountSen,
        loyalty:
          claimedPoints > 0 || claimedDiscountSen > 0
            ? {
                claimedPoints,
                claimedDiscountSen,
                balancePoints: customerEntries.length
                  ? loyalty.getBalance(order.customerId, at)
                  : null,
              }
            : null,
      });
      const summary = summariseCheckoutConflicts(conflicts);
      const blockingConflicts = conflicts.filter((conflict) => conflict.blocking);

      return {
        ok: true,
        mode: 'order',
        orderId: order.id,
        valid: blocking.length === 0 && blockingConflicts.length === 0,
        requiresReprice: issues.some((issue) => issue.startsWith('KATALOG_UFUK')),
        itemCount: order.lines.length,
        lines,
        paymentState: order.paymentState,
        fulfilmentStatus: order.fulfilmentStatus,
        catalogueVersion: currentCatalogueVersion,
        issues,
        conflicts,
        conflictCount: summary.conflictCount,
        conflictClasses: summary.classes,
        blockingConflictCount: summary.blockingCount,
        blockingConflictClasses: [...new Set(blockingConflicts.map((c) => c.class))].sort(),
        blockingConflictCodes: [...new Set(blockingConflicts.map((c) => c.code))].sort(),
        mutated: false,
        diagnosedAt: at,
        provenance: provenance(
          ctx.runtime,
          ctx,
          ['orders', 'lots', 'reservations', 'catalogue', 'loyalty_ledger'],
          'checkout-conflict-detector',
        ),
      };
    },
  }),

  // ADV-06: reconcile_payments (Q)
  defineTool({
    logicalCapabilityId: 'ADV-06',
    registrationName: 'reconcile_payments',
    riskClass: 'Q',
    description:
      'Menyelaraskan lejar bayaran sebenar dengan rekod pesanan dan melaporkan drift sen yang dikira, tanpa menulis apa-apa.',
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
      const refusal = staffOrderAccess(actor, order);
      if (refusal) return fail(refusal, 'Pesanan ini di luar skop akses pemeran.');

      const payments = paymentsForOrder(store, order.id);
      const confirmedSen = payments
        .filter((payment) => payment.state === 'confirmed')
        .reduce((sum, payment) => sum + payment.amountSen, 0);
      const refundedSen = payments
        .filter((payment) => payment.state === 'refunded')
        .reduce((sum, payment) => sum + payment.amountSen, 0);
      const paidDriftSen = confirmedSen - order.paidAmountSen;
      const refundDriftSen = refundedSen - order.refundAmountSen;
      const reconciled = paidDriftSen === 0 && refundDriftSen === 0;

      return {
        ok: true,
        orderId: order.id,
        orderRevision: order.revision,
        orderPaymentState: order.paymentState,
        paymentRecordCount: payments.length,
        confirmedPaymentsSen: confirmedSen,
        refundedPaymentsSen: refundedSen,
        recordedPaidAmountSen: order.paidAmountSen,
        recordedRefundAmountSen: order.refundAmountSen,
        paidDriftSen,
        refundDriftSen,
        status: reconciled ? 'reconciled' : 'drift_detected',
        payments: payments.map((payment) => ({
          id: payment.id,
          amountSen: payment.amountSen,
          state: payment.state,
          method: payment.method,
          reference: payment.reference,
          createdAt: payment.createdAt,
        })),
        provenance: provenance(ctx.runtime, ctx, ['orders', 'payments'], 'payment-reconciliation-read'),
      };
    },
  }),

  // ADV-07: preview_refund (S)
  defineTool({
    logicalCapabilityId: 'ADV-07',
    registrationName: 'preview_refund',
    riskClass: 'S',
    description:
      'Pratonton refund menggunakan agihan Largest-Remainder sebenar dan pembalikan komisen kumulatif daripada lejar platform (tanpa menulis).',
    requiredRole: 'staff',
    inputSchema: {
      orderId: { required: true, type: 'string', min: 1, max: 120 },
      amountSen: { required: true, type: 'integer', min: 1, max: 1_000_000_000 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const order = readOrder(store, input.orderId as string);
      if (!order) {
        return fail('ORDER_NOT_FOUND', `Pesanan ${String(input.orderId)} tidak ditemui.`);
      }
      const refusal = staffOrderAccess(actor, order);
      if (refusal) return fail(refusal, 'Pesanan ini di luar skop akses pemeran.');

      const amountSen = input.amountSen as number;
      const refundableSen = order.paidAmountSen - order.refundAmountSen;
      if (refundableSen <= 0) {
        return fail('NO_REFUNDABLE_BALANCE', `Pesanan ini tiada baki boleh dipulangkan (${refundableSen} sen).`);
      }
      if (amountSen > refundableSen) {
        return fail(
          'REFUND_EXCEEDS_PAID_BALANCE',
          `Amaun refund (${amountSen} sen) melebihi baki boleh dipulangkan (${refundableSen} sen).`,
        );
      }

      const allocations = allocateCumulativeRefundAcrossLines(
        amountSen,
        order.refundAmountSen,
        order.lines,
      );
      const allocatedTotalSen = allocations.reduce((sum, allocation) => sum + allocation.allocatedSen, 0);

      // Naive proportional rounding drift — the real amount largest-remainder avoids.
      const totalWeight = order.lines.reduce((sum, line) => sum + line.priceSen * line.quantity, 0);
      const naiveTotalSen =
        totalWeight > 0
          ? order.lines.reduce((sum, line) => {
              const weight = BigInt(line.priceSen * line.quantity);
              return sum + Number((weight * BigInt(amountSen)) / BigInt(totalWeight));
            }, 0)
          : 0;

      const commissions = commissionsForOrder(store, order.id);
      const policies = commissionPolicies(store);
      const reversal = commissions
        .filter((entry) => entry.amountSen > 0)
        .map((entry) => {
          const policy = policyForVersion(store, entry.policyVersion) ?? policies[policies.length - 1] ?? null;
          const rateBasisPoints = policy?.rateBasisPoints ?? 0;
          const alreadyReversedSen = commissions
            .filter(
              (candidate) =>
                candidate.status === 'reversed' &&
                candidate.amountSen < 0 &&
                candidate.contraOfId === entry.id,
            )
            .reduce((sum, candidate) => sum + Math.abs(candidate.amountSen), 0);
          const cumulative = calculateCumulativeReversal({
            originalAmountSen: entry.amountSen,
            cumulativeRefundSen: order.refundAmountSen + amountSen,
            rateBasisPoints,
            previouslyReversedSen: alreadyReversedSen,
          });
          return {
            commissionId: entry.id,
            policyVersion: entry.policyVersion,
            rateBasisPoints,
            originalAmountSen: entry.amountSen,
            previouslyReversedSen: alreadyReversedSen,
            targetCumulativeReversalSen: cumulative.targetCumulativeReversalSen,
            currentReversalDeltaSen: cumulative.currentReversalDeltaSen,
          };
        });

      const at = ctx.runtime.clock();
      const expiresAt = new Date(Date.parse(at) + 5 * 60 * 1000).toISOString();
      const latestPolicyVersion = policies.length > 0 ? policies[policies.length - 1].version : null;
      const previewRefHash = createHash('sha256')
        .update(
          JSON.stringify({
            orderId: order.id,
            orderRevision: order.revision,
            policyRevision: latestPolicyVersion,
            requestedRefundSen: amountSen,
            refundableBalanceSen: refundableSen,
            allocatedTotalSen,
          }),
        )
        .digest('hex');

      return {
        ok: true,
        orderId: order.id,
        requestedRefundSen: amountSen,
        refundableBalanceSen: refundableSen,
        status: 'preview_ready',
        mutated: false,
        previewRefHash,
        revisions: {
          orderRevision: order.revision,
          policyRevision: latestPolicyVersion,
        },
        expiresAt,
        lineAllocations: allocations,
        allocatedTotalSen,
        // Computed difference between the request and the allocated total.
        estimatedDriftSen: amountSen - allocatedTotalSen,
        // Computed drift that naive proportional rounding would have introduced.
        naiveFloorDriftSen: amountSen - naiveTotalSen,
        commissionReversal: reversal,
        provenance: provenance(ctx.runtime, ctx, ['orders', 'commission_ledger', 'commission_policies'], 'largest-remainder-allocator'),
      };
    },
  }),

  // ADV-08: propose_refund (D)
  defineTool({
    logicalCapabilityId: 'ADV-08',
    registrationName: 'propose_refund',
    riskClass: 'D',
    description:
      'Mencipta cadangan refund yang kekal (proposal + approval) untuk kelulusan founder. Tiada mutasi pada rekod pesanan.',
    requiredRole: 'staff',
    inputSchema: {
      orderId: { required: true, type: 'string', min: 1, max: 120 },
      amountSen: { required: true, type: 'integer', min: 1, max: 1_000_000_000 },
      reason: { type: 'string', min: 3, max: 2000 },
      reference: { type: 'string', min: 1, max: 200 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const order = readOrder(store, input.orderId as string);
      if (!order) {
        return fail('ORDER_NOT_FOUND', `Pesanan ${String(input.orderId)} tidak ditemui.`);
      }
      const refusal = staffOrderAccess(actor, order);
      if (refusal) return fail(refusal, 'Pesanan ini di luar skop akses pemeran.');

      const amountSen = input.amountSen as number;
      const refundableSen = order.paidAmountSen - order.refundAmountSen;
      if (refundableSen <= 0) {
        return fail('NO_REFUNDABLE_BALANCE', `Pesanan ini tiada baki boleh dipulangkan (${refundableSen} sen).`);
      }
      if (amountSen > refundableSen) {
        return fail(
          'REFUND_EXCEEDS_PAID_BALANCE',
          `Amaun refund (${amountSen} sen) melebihi baki boleh dipulangkan (${refundableSen} sen).`,
        );
      }

      const proposal = ctx.runtime.approvalService.createProposal({
        kind: 'refund.execute',
        scope: `order:${order.id}#refund`,
        payload: {
          orderId: order.id,
          amountSen,
          reason: input.reason ?? 'Refund dicadangkan oleh kakitangan',
          ...(input.reference ? { reference: input.reference } : {}),
        },
        amountSen,
        proposedBy: ctx.actorId,
        proposerRole: ctx.role,
        sourceRefs: [`orders:${order.id}@${order.revision}`],
      });

      return {
        ok: true,
        proposalId: proposal.id,
        proposalNonce: proposal.nonce,
        version: proposal.version,
        kind: proposal.kind,
        scope: proposal.scope,
        orderId: order.id,
        amountSen,
        reason: proposal.payload.reason,
        proposedBy: proposal.proposedBy,
        proposerRole: proposal.proposerRole,
        status: proposal.status,
        createdAt: proposal.createdAt,
        expiresAt: proposal.expiresAt,
        amountSenBound: proposal.amountSen,
        refundableBalanceSen: refundableSen,
        mutated: false,
        authoritativeStateMutated: false,
        persistence: ctx.runtime.approvalStore.persistence,
        provenance: provenance(ctx.runtime, ctx, proposal.sourceRefs, 'proposal-store-write'),
      };
    },
  }),
];
