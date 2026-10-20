/**
 * AbangColek Sovereign GrowthOS — ADV-09..ADV-12 Inventory Tools
 */

import { defineTool, fail, resolveContext } from './common';
import { provenance } from '../runtime';
import type { ToolDefinition } from '../types';
import {
  activeReservations,
  allLots,
  catalogueProducts,
  daysBetween,
  readLot,
} from '../records';
import { outletAccessCode } from '../scope';
import type { BusinessSettings, StockLot } from '../../../../shared/platform-contracts';

const freeUnits = (
  lots: StockLot[],
  reservations: Array<{ productId: string; quantity: number; locationId: string }>,
  productId: string,
  locationId?: string,
): number => {
  const physical = lots
    .filter(
      (lot) =>
        lot.productId === productId &&
        lot.status === 'available' &&
        (!locationId || lot.locationId === locationId) &&
        (!lot.expiryAt || lot.expiryAt > new Date().toISOString()),
    )
    .reduce((sum, lot) => sum + lot.quantity, 0);
  const held = reservations
    .filter(
      (reservation) =>
        reservation.productId === productId && (!locationId || reservation.locationId === locationId),
    )
    .reduce((sum, reservation) => sum + reservation.quantity, 0);
  return physical - held;
};

export const inventoryTools: ToolDefinition[] = [
  // ADV-09: assess_expiry_risk (S)
  defineTool({
    logicalCapabilityId: 'ADV-09',
    registrationName: 'assess_expiry_risk',
    riskClass: 'S',
    description:
      'Menilai risiko luput tempoh inventori daripada lot sebenar, batch dan harga katalog (tanpa sebarang mutasi).',
    requiredRole: 'staff',
    inputSchema: {
      productId: { type: 'string', min: 1, max: 120 },
      locationId: { type: 'string', min: 1, max: 120 },
      horizonDays: { type: 'integer', min: 1, max: 365 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const at = ctx.runtime.clock();
      const horizonDays = (input.horizonDays as number | undefined) ?? 30;
      const locationId = input.locationId as string | undefined;
      if (locationId) {
        const refusal = outletAccessCode(actor, locationId);
        if (refusal) return fail(refusal, 'Lokasi ini di luar skop akses pemeran.');
      }

      const products = catalogueProducts(store);
      const priceByProduct = new Map(products.map((product) => [product.id, product.priceSen]));
      const lots = allLots(store).filter(
        (lot) =>
          Boolean(lot.expiryAt) &&
          (!input.productId || lot.productId === input.productId) &&
          (!locationId || lot.locationId === locationId),
      );

      const assessed = lots.map((lot) => {
        const daysToExpiry = daysBetween(at, lot.expiryAt as string);
        const unitPriceSen = priceByProduct.get(lot.productId) ?? 0;
        return {
          lotId: lot.id,
          productId: lot.productId,
          batchId: lot.batchId ?? null,
          locationId: lot.locationId,
          quantity: lot.quantity,
          unitPriceSen,
          valueSen: unitPriceSen * lot.quantity,
          expiryAt: lot.expiryAt as string,
          daysToExpiry,
          expired: daysToExpiry < 0,
          expiringWithinHorizon: daysToExpiry >= 0 && daysToExpiry <= horizonDays,
        };
      });

      const expired = assessed.filter((entry) => entry.expired);
      const expiring = assessed.filter((entry) => entry.expiringWithinHorizon);
      const expiredValueSen = expired.reduce((sum, entry) => sum + entry.valueSen, 0);
      const atRiskValueSen = expiring.reduce((sum, entry) => sum + entry.valueSen, 0);

      return {
        ok: true,
        horizonDays,
        status: assessed.length === 0 ? 'no_inventory_matched' : 'assessed',
        matchedLotCount: assessed.length,
        expiredLotCount: expired.length,
        expiringLotCount: expiring.length,
        expiredValueSen,
        atRiskValueSen,
        lots: assessed,
        mutated: false,
        provenance: provenance(ctx.runtime, ctx, ['lots', 'catalogue'], 'expiry-risk-read'),
      };
    },
  }),

  // ADV-10: plan_restock (S)
  defineTool({
    logicalCapabilityId: 'ADV-10',
    registrationName: 'plan_restock',
    riskClass: 'S',
    description:
      'Menycadangkan pelan restock berdasarkan_termai dealer yang diluluskan, katalog live dan baki stok bebas (tanpa memesan).',
    requiredRole: 'staff',
    inputSchema: {
      productId: { type: 'string', min: 1, max: 120 },
      targetQuantity: { type: 'integer', min: 1, max: 1_000_000 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store } = resolved;
      const settings = store.get<BusinessSettings>('settings', 'business');
      const terms = settings?.approvedPolicies.dealer;
      if (!terms) {
        return fail('DEALER_POLICY_UNAVAILABLE', 'Terma dealer belum diluluskan dalam tetapan perniagaan.');
      }
      const at = ctx.runtime.clock();
      const lots = allLots(store);
      const reservations = activeReservations(store).filter((reservation) => reservation.expiresAt > at);
      const catalogue = catalogueProducts(store).filter((product) => product.status === 'published');
      const targetProducts = input.productId
        ? catalogue.filter((product) => product.id === input.productId)
        : catalogue;

      if (input.productId && !targetProducts.length) {
        return fail('PRODUCT_UNAVAILABLE', `Produk '${String(input.productId)}' tiada dalam katalog published.`);
      }

      const lines = targetProducts.map((product) => {
        const available = Math.max(0, freeUnits(lots, reservations, product.id));
        const target =
          (input.targetQuantity as number | undefined) ?? terms.minimumQuantity;
        const shortfall = Math.max(0, target - available);
        const packMultiple = Math.max(1, terms.packMultiple);
        const packs = Math.ceil(shortfall / packMultiple);
        const suggestedQuantity = packs * packMultiple;
        return {
          productId: product.id,
          name: product.name,
          priceSen: product.priceSen,
          availableUnits: available,
          targetUnits: target,
          shortfallUnits: shortfall,
          packMultiple,
          suggestedQuantity,
          suggestedValueSen: suggestedQuantity * product.priceSen,
          policySatisfied: shortfall === 0 || suggestedQuantity > 0,
        };
      });

      return {
        ok: true,
        dealerTerms: {
          version: terms.version,
          minimumQuantity: terms.minimumQuantity,
          packMultiple: terms.packMultiple,
          priceBasisPoints: terms.priceBasisPoints,
          ownership: terms.ownership,
        },
        lineCount: lines.length,
        lines,
        totalSuggestedValueSen: lines.reduce((sum, line) => sum + line.suggestedValueSen, 0),
        status: lines.length === 0 ? 'no_published_products' : 'planned',
        mutated: false,
        provenance: provenance(ctx.runtime, ctx, ['settings', 'catalogue', 'lots', 'reservations'], 'dealer-policy-read'),
      };
    },
  }),

  // ADV-11: trace_batch (Q)
  defineTool({
    logicalCapabilityId: 'ADV-11',
    registrationName: 'trace_batch',
    riskClass: 'Q',
    description:
      'Menjejak batch pengeluaran sebenar: lot, rekod QC dan pergerakan inventori yang menyertainya.',
    requiredRole: 'staff',
    inputSchema: {
      batchId: { required: true, type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store } = resolved;
      const batchId = input.batchId as string;
      const lots = allLots(store).filter((lot) => lot.batchId === batchId);
      if (!lots.length) {
        return fail('BATCH_NOT_FOUND', `Tiada lot bagi batch '${batchId}'.`);
      }
      const lotIds = new Set(lots.map((lot) => lot.id));
      const movements = store
        .all<import('../../../../shared/platform-contracts').InventoryMovement>('movements')
        .filter((movement) => lotIds.has(movement.sourceEntityId));
      const qcRecords = store
        .all<import('../../../../shared/platform-contracts').QcRecord>('qc')
        .filter((record) => record.batchId === batchId);

      return {
        ok: true,
        batchId,
        lotCount: lots.length,
        totalQuantity: lots.reduce((sum, lot) => sum + lot.quantity, 0),
        status: lots.every((lot) => lot.status === 'available')
          ? 'released'
          : lots.some((lot) => lot.status === 'quarantine')
            ? 'quarantined'
            : 'mixed',
        lots: lots.map((lot) => ({
          id: lot.id,
          productId: lot.productId,
          locationId: lot.locationId,
          ownerId: lot.ownerId,
          custodyId: lot.custodyId,
          quantity: lot.quantity,
          status: lot.status,
          expiryAt: lot.expiryAt ?? null,
          revision: lot.revision,
        })),
        qcRecords: qcRecords.map((record) => ({
          id: record.id,
          sopId: record.sopId,
          sopVersion: record.sopVersion,
          status: record.status,
          outletId: record.outletId,
          readings: record.readings,
          revision: record.revision,
        })),
        movements: movements.map((movement) => ({
          id: movement.id,
          productId: movement.productId,
          quantityDelta: movement.quantityDelta,
          operationKey: movement.operationKey,
          sourceEntityId: movement.sourceEntityId,
          createdAt: movement.createdAt,
        })),
        provenance: provenance(ctx.runtime, ctx, ['lots', 'movements', 'qc'], 'batch-trace-read'),
      };
    },
  }),

  // ADV-12: propose_quarantine (D)
  defineTool({
    logicalCapabilityId: 'ADV-12',
    registrationName: 'propose_quarantine',
    riskClass: 'D',
    description:
      'Meny-cadangkan kuarantin lot sebagai draf kelulusan. Lot fizikal TIDAK diubah oleh alatan ini.',
    requiredRole: 'staff',
    inputSchema: {
      lotId: { required: true, type: 'string', min: 1, max: 120 },
      reason: { required: true, type: 'string', min: 3, max: 2000 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const lot = readLot(store, input.lotId as string);
      if (!lot) {
        return fail('LOT_NOT_FOUND', `Lot '${String(input.lotId)}' tidak ditemui.`);
      }
      const refusal = outletAccessCode(actor, lot.locationId);
      if (refusal) return fail(refusal, 'Lot ini di luar skop akses pemeran.');

      const proposal = ctx.runtime.approvalService.createProposal({
        kind: 'inventory.quarantine',
        scope: `lot:${lot.id}#quarantine`,
        payload: {
          lotId: lot.id,
          reason: input.reason,
          currentStatus: lot.status,
          expectedRevision: lot.revision,
          productId: lot.productId,
          locationId: lot.locationId,
        },
        amountSen: 0,
        proposedBy: ctx.actorId,
        proposerRole: ctx.role,
        sourceRefs: [`lots:${lot.id}@${lot.revision}`],
      });

      return {
        ok: true,
        proposalId: proposal.id,
        kind: proposal.kind,
        scope: proposal.scope,
        lotId: lot.id,
        currentStatus: lot.status,
        proposedStatus: 'quarantine',
        reason: input.reason,
        status: proposal.status,
        createdAt: proposal.createdAt,
        expiresAt: proposal.expiresAt,
        mutated: false,
        authoritativeStateMutated: false,
        persistence: ctx.runtime.approvalStore.persistence,
        provenance: provenance(ctx.runtime, ctx, proposal.sourceRefs, 'proposal-store-write'),
      };
    },
  }),
];
