/**
 * AbangColek Sovereign GrowthOS — ADV-01..ADV-04 Discovery & Context Tools
 *
 * Every tool here reads the *live* registry or the *live* canonical records.
 * Nothing is a static list: discover_capabilities reports whatever the registry
 * actually holds at call time.
 */

import { defineTool, fail, matchesQuery, resolveContext } from './common';
import { provenance } from '../runtime';
import type { ToolDefinition } from '../types';
import {
  allLots,
  catalogueProducts,
  commissionsForOrder,
  daysBetween,
  paymentsForOrder,
  readCase,
  readLot,
  readOrder,
  readTask,
} from '../records';
import { orderAccessCode } from '../scope';
import type { OrderRecord, StockLot } from '../../../../shared/platform-contracts';
import { buildVersionedSourceCitation, type VersionedSourceCitation } from '../../../../shared/mod-contracts';
import { Loyalty } from '../../../platform/loyalty';

const STAFF_ONLY_KINDS = ['tasks', 'knowledge', 'lots', 'campaigns', 'restocks', 'commissions'] as const;

const visibleOrders = (store: import('../../../platform/store').PlatformStore, actor: import('../scope').ScopedActor): OrderRecord[] => {
  const all = store.all<OrderRecord>('orders');
  if (actor.isFounder) return all;
  return all.filter((order) => {
    if (orderAccessCode(actor, order)) return false;
    return true;
  });
};

export const discoveryTools: ToolDefinition[] = [
  // ADV-01: discover_capabilities (Q)
  defineTool({
    logicalCapabilityId: 'ADV-01',
    registrationName: 'discover_capabilities',
    riskClass: 'Q',
    description:
      'Melaporkan keupayaan sebenar yang didaftarkan dalam registri alatan untuk peranan pemeran, dikira secara langsung daripada registri.',
    requiredRole: 'customer',
    inputSchema: {
      riskClass: { type: 'string', enum: ['Q', 'S', 'D', 'C', 'X'] },
    },
    execute: async (input, ctx) => {
      const all = ctx.catalog(ctx.role);
      const filtered = input.riskClass ? all.filter((entry) => entry.riskClass === input.riskClass) : all;
      return {
        ok: true,
        count: filtered.length,
        registeredCapabilityCount: ctx.catalogTotal(),
        role: ctx.role,
        riskClassFilter: input.riskClass ?? null,
        capabilities: filtered.map((entry) => ({
          id: entry.logicalCapabilityId,
          name: entry.registrationName,
          risk: entry.riskClass,
          requiredRole: entry.requiredRole,
          description: entry.description,
        })),
        provenance: provenance(ctx.runtime, ctx, ['registry:live'], 'tool-registry'),
      };
    },
  }),

  // ADV-02: search_records (Q)
  defineTool({
    logicalCapabilityId: 'ADV-02',
    registrationName: 'search_records',
    riskClass: 'Q',
    description:
      'Mencari rekod kanonik sebenar (pesanan, kes, stok, bayaran, task, pengetahuan, kempen, restock, komisen) dalam skop pemeran.',
    requiredRole: 'customer',
    inputSchema: {
      kind: {
        required: true, type: 'string',
        enum: [
          'orders',
          'cases',
          'lots',
          'payments',
          'tasks',
          'knowledge',
          'campaigns',
          'restocks',
          'commissions',
        ],
      },
      query: { type: 'string', min: 1, max: 200 },
      limit: { type: 'integer', min: 1, max: 50 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      if ((STAFF_ONLY_KINDS as readonly string[]).includes(input.kind) && !actor.isStaff && !actor.isFounder) {
        return fail('FORBIDDEN', `Rekod '${input.kind}' memerlukan peranan kakitangan atau founder.`);
      }
      const query = input.query as string | undefined;
      const limit = (input.limit as number | undefined) ?? 20;
      const sources: string[] = [];
      const at = ctx.runtime.clock();
      let records: Array<Record<string, unknown> & { citation: VersionedSourceCitation }> = [];

      switch (input.kind) {
        case 'orders': {
          records = visibleOrders(store, actor)
            .filter((order) => matchesQuery([order.id, order.fulfilmentStatus, order.paymentState, order.outletId, order.contactRef], query))
            .slice(0, limit)
            .map((order) => ({
              id: order.id,
              outletId: order.outletId,
              customerId: order.customerId,
              dealerOrgId: order.dealerOrgId ?? null,
              amountSen: order.amountSen,
              paidAmountSen: order.paidAmountSen,
              refundAmountSen: order.refundAmountSen,
              paymentState: order.paymentState,
              fulfilmentStatus: order.fulfilmentStatus,
              revision: order.revision,
              createdAt: order.createdAt,
              citation: buildVersionedSourceCitation({
                sourceKind: 'order',
                sourceId: order.id,
                revision: order.revision,
                observedAt: at,
              }),
            }));
          sources.push('orders');
          break;
        }
        case 'cases': {
          records = store
            .all<import('../../../../shared/platform-contracts').CaseRecord>('cases')
            .filter((record) => {
              if (actor.isFounder) return true;
              if (record.customerId === actor.principal.user.id) return true;
              const order = readOrder(store, record.orderId);
              return order ? !orderAccessCode(actor, order) : false;
            })
            .filter((record) => matchesQuery([record.id, record.subject, record.status, record.description], query))
            .slice(0, limit)
            .map((record) => ({
              id: record.id,
              orderId: record.orderId,
              customerId: record.customerId,
              subject: record.subject,
              status: record.status,
              revision: record.revision,
              createdAt: record.createdAt,
              citation: buildVersionedSourceCitation({
                sourceKind: 'case',
                sourceId: record.id,
                revision: record.revision,
                observedAt: at,
              }),
            }));
          sources.push('cases');
          break;
        }
        case 'lots': {
          records = allLots(store)
            .filter((lot) => matchesQuery([lot.id, lot.productId, lot.batchId, lot.status, lot.locationId, lot.expiryAt], query))
            .slice(0, limit)
            .map((lot) => ({
              id: lot.id,
              productId: lot.productId,
              batchId: lot.batchId ?? null,
              quantity: lot.quantity,
              status: lot.status,
              locationId: lot.locationId,
              ownerId: lot.ownerId,
              expiryAt: lot.expiryAt ?? null,
              revision: lot.revision,
              citation: buildVersionedSourceCitation({
                sourceKind: 'stock_lot',
                sourceId: lot.id,
                revision: lot.revision,
                expiresAt: lot.expiryAt ?? null,
                observedAt: at,
              }),
            }));
          sources.push('lots');
          break;
        }
        case 'payments': {
          const orderIds = new Set(visibleOrders(store, actor).map((order) => order.id));
          records = store
            .all<import('../../../platform/commerce').PaymentRecord>('payments')
            .filter((payment) => orderIds.has(payment.orderId))
            .filter((payment) => matchesQuery([payment.id, payment.orderId, payment.reference, payment.state, payment.method], query))
            .slice(0, limit)
            .map((payment) => ({
              id: payment.id,
              orderId: payment.orderId,
              amountSen: payment.amountSen,
              method: payment.method,
              reference: payment.reference,
              state: payment.state,
              confirmedBy: payment.confirmedBy,
              createdAt: payment.createdAt,
              citation: buildVersionedSourceCitation({
                sourceKind: 'payment',
                sourceId: payment.id,
                observedAt: at,
              }),
            }));
          sources.push('payments');
          break;
        }
        case 'tasks': {
          records = store
            .all<import('../../../../shared/platform-contracts').TaskRecord>('tasks')
            .filter((task) => actor.isFounder || task.assigneeId === actor.principal.user.id || task.ownerId === actor.principal.user.id)
            .filter((task) => matchesQuery([task.id, task.title, task.status, task.entityId], query))
            .slice(0, limit)
            .map((task) => ({
              id: task.id,
              entityId: task.entityId,
              title: task.title,
              status: task.status,
              assigneeId: task.assigneeId,
              dueAt: task.dueAt ?? null,
              revision: task.revision,
              citation: buildVersionedSourceCitation({
                sourceKind: 'task',
                sourceId: task.id,
                revision: task.revision,
                observedAt: at,
              }),
            }));
          sources.push('tasks');
          break;
        }
        case 'knowledge': {
          const at = ctx.runtime.clock();
          records = store
            .all<import('../../../../shared/platform-contracts').KnowledgeEntry>('knowledge')
            .filter((entry) => entry.status === 'approved' && (!entry.expiresAt || entry.expiresAt > at))
            .filter((entry) => matchesQuery([entry.id, entry.title, entry.body, entry.documentId], query))
            .slice(0, limit)
            .map((entry) => ({
              id: entry.id,
              documentId: entry.documentId,
              version: entry.version,
              title: entry.title,
              expiresAt: entry.expiresAt ?? null,
              citation: buildVersionedSourceCitation({
                sourceKind: 'knowledge_entry',
                sourceId: entry.id,
                version: entry.version,
                expiresAt: entry.expiresAt ?? null,
                observedAt: at,
              }),
            }));
          sources.push('knowledge');
          break;
        }
        case 'campaigns': {
          records = store
            .all<import('../../../../shared/platform-contracts').CampaignRecord>('campaigns')
            .filter((campaign) => actor.isFounder || campaign.ownerId === actor.principal.user.id)
            .filter((campaign) => matchesQuery([campaign.id, campaign.title, campaign.status, campaign.objective], query))
            .slice(0, limit)
            .map((campaign) => ({
              id: campaign.id,
              title: campaign.title,
              status: campaign.status,
              ownerId: campaign.ownerId,
              revision: campaign.revision,
              createdAt: campaign.createdAt,
              citation: buildVersionedSourceCitation({
                sourceKind: 'campaign',
                sourceId: campaign.id,
                revision: campaign.revision,
                expiresAt: campaign.approvalExpiresAt ?? null,
                observedAt: at,
              }),
            }));
          sources.push('campaigns');
          break;
        }
        case 'restocks': {
          records = store
            .all<import('../../../../shared/platform-contracts').RestockRecord>('restocks')
            .filter((restock) => actor.isFounder || actor.dealerOrgIds.includes(restock.dealerOrgId))
            .filter((restock) => matchesQuery([restock.id, restock.dealerOrgId, restock.status], query))
            .slice(0, limit)
            .map((restock) => ({
              id: restock.id,
              dealerOrgId: restock.dealerOrgId,
              status: restock.status,
              totalSen: restock.totalSen,
              ownership: restock.ownership,
              revision: restock.revision,
              citation: buildVersionedSourceCitation({
                sourceKind: 'restock',
                sourceId: restock.id,
                revision: restock.revision,
                observedAt: at,
              }),
            }));
          sources.push('restocks');
          break;
        }
        case 'commissions': {
          records = store
            .all<import('../../../../shared/dealer-contracts').CommissionTransaction>('commission_ledger')
            .filter((entry) => actor.isFounder || actor.dealerOrgIds.includes(entry.dealerOrgId))
            .filter((entry) => matchesQuery([entry.id, entry.orderId, entry.dealerOrgId, entry.status], query))
            .slice(0, limit)
            .map((entry) => ({
              id: entry.id,
              orderId: entry.orderId,
              dealerOrgId: entry.dealerOrgId,
              amountSen: entry.amountSen,
              status: entry.status,
              policyVersion: entry.policyVersion,
              createdAt: entry.createdAt,
              citation: buildVersionedSourceCitation({
                sourceKind: 'commission',
                sourceId: entry.id,
                version: entry.policyVersion,
                observedAt: at,
              }),
            }));
          sources.push('commission_ledger');
          break;
        }
        default:
          return fail('UNSUPPORTED_RECORD_KIND', `Jenis rekod '${String(input.kind)}' tidak disokong.`);
      }

      return {
        ok: true,
        kind: input.kind,
        query: query ?? null,
        count: records.length,
        records,
        citations: records.map((record) => record.citation),
        citationContract: 'shared/mod-contracts.ts#VersionedSourceCitation',
        provenance: provenance(ctx.runtime, ctx, sources, 'platform-store-read'),
      };
    },
  }),

  // ADV-03: build_context_bundle (Q)
  defineTool({
    logicalCapabilityId: 'ADV-03',
    registrationName: 'build_context_bundle',
    riskClass: 'Q',
    description:
      'Membina satu pakej konteks lengkap daripada rekod kanonik sebenar (pesanan, kes, task, stok) berserta rekod berkaitan.',
    requiredRole: 'customer',
    inputSchema: {
      entityId: { required: true, type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const entityId = input.entityId as string;
      const at = ctx.runtime.clock();
      const sources: string[] = [];
      const bundle: Record<string, unknown> = {};
      // MOD-09: every record carried by the bundle is cited. A record without
      // source metadata must never leave this tool.
      const citations: VersionedSourceCitation[] = [];
      const cite = (citation: VersionedSourceCitation) => {
        citations.push(citation);
        return citation;
      };

      const order = readOrder(store, entityId);
      if (order) {
        const refusal = orderAccessCode(actor, order);
        if (refusal) return fail(refusal, 'Rekod ini di luar skop akses pemeran.');
        bundle.order = {
          ...order,
          citation: cite(buildVersionedSourceCitation({ sourceKind: 'order', sourceId: order.id, revision: order.revision, observedAt: at })),
        };
        bundle.payments = paymentsForOrder(store, order.id).map((payment) => ({
          ...payment,
          citation: cite(buildVersionedSourceCitation({ sourceKind: 'payment', sourceId: payment.id, observedAt: at })),
        }));
        bundle.commissions = commissionsForOrder(store, order.id).map((entry) => ({
          ...entry,
          citation: cite(buildVersionedSourceCitation({ sourceKind: 'commission', sourceId: entry.id, version: entry.policyVersion, observedAt: at })),
        }));
        const linkedCase = store
          .all<import('../../../../shared/platform-contracts').CaseRecord>('cases')
          .find((record) => record.orderId === order.id) ?? null;
        bundle.case = linkedCase
          ? {
              ...linkedCase,
              citation: cite(buildVersionedSourceCitation({ sourceKind: 'case', sourceId: linkedCase.id, revision: linkedCase.revision, observedAt: at })),
            }
          : null;
        bundle.tasks = store
          .all<import('../../../../shared/platform-contracts').TaskRecord>('tasks')
          .filter((task) => task.entityId === order.id)
          .map((task) => ({
            ...task,
            citation: cite(buildVersionedSourceCitation({ sourceKind: 'task', sourceId: task.id, revision: task.revision, observedAt: at })),
          }));
        bundle.evidence = store
          .all<import('../../../../shared/platform-contracts').EvidenceRecord>('evidence')
          .filter((evidence) => evidence.entityId === order.id)
          .map((evidence) => ({
            ...evidence,
            citation: cite(buildVersionedSourceCitation({ sourceKind: 'evidence', sourceId: evidence.id, observedAt: at })),
          }));
        bundle.loyaltyEntries = new Loyalty(store).getEntries(order.customerId).map((entry) => ({
          ...entry,
          citation: cite(buildVersionedSourceCitation({ sourceKind: 'loyalty_entry', sourceId: entry.id, expiresAt: entry.expiryAt ?? null, observedAt: at })),
        }));
        sources.push('orders', 'payments', 'commission_ledger', 'cases', 'tasks', 'evidence', 'loyalty_ledger');
      } else {
        const caseRecord = readCase(store, entityId);
        const taskRecord = readTask(store, entityId);
        const lot = readLot(store, entityId);
        if (caseRecord) {
          const linkedOrder = readOrder(store, caseRecord.orderId);
          if (linkedOrder) {
            const refusal = orderAccessCode(actor, linkedOrder);
            if (refusal) return fail(refusal, 'Rekod ini di luar skop akses pemeran.');
          } else if (caseRecord.customerId !== actor.principal.user.id && !actor.isFounder && !actor.isStaff) {
            return fail('FORBIDDEN', 'Rekod ini di luar skop akses pemeran.');
          }
          bundle.case = {
            ...caseRecord,
            citation: cite(buildVersionedSourceCitation({ sourceKind: 'case', sourceId: caseRecord.id, revision: caseRecord.revision, observedAt: at })),
          };
          bundle.order = linkedOrder
            ? {
                ...linkedOrder,
                citation: cite(buildVersionedSourceCitation({ sourceKind: 'order', sourceId: linkedOrder.id, revision: linkedOrder.revision, observedAt: at })),
              }
            : null;
          bundle.messages = store
            .all<import('../../../../shared/platform-contracts').CaseMessage>('messages')
            .filter((message) => message.caseId === caseRecord.id)
            .map((message) => ({
              ...message,
              citation: cite(buildVersionedSourceCitation({ sourceKind: 'case_message', sourceId: message.id, observedAt: at })),
            }));
          bundle.evidence = store
            .all<import('../../../../shared/platform-contracts').EvidenceRecord>('evidence')
            .filter((evidence) => evidence.entityId === caseRecord.id)
            .map((evidence) => ({
              ...evidence,
              citation: cite(buildVersionedSourceCitation({ sourceKind: 'evidence', sourceId: evidence.id, observedAt: at })),
            }));
          sources.push('cases', 'messages', 'evidence', 'orders');
        } else if (taskRecord) {
          if (!actor.isFounder && taskRecord.assigneeId !== actor.principal.user.id && taskRecord.ownerId !== actor.principal.user.id) {
            return fail('FORBIDDEN', 'Task ini di luar skop akses pemeran.');
          }
          bundle.task = {
            ...taskRecord,
            citation: cite(buildVersionedSourceCitation({ sourceKind: 'task', sourceId: taskRecord.id, revision: taskRecord.revision, observedAt: at })),
          };
          const linkedEntity = store.get<import('../../../../shared/platform-contracts').OrderRecord>('orders', taskRecord.entityId) ?? null;
          bundle.linkedEntity = linkedEntity
            ? {
                ...linkedEntity,
                citation: cite(buildVersionedSourceCitation({ sourceKind: 'order', sourceId: linkedEntity.id, revision: linkedEntity.revision, observedAt: at })),
              }
            : null;
          sources.push('tasks', 'orders');
        } else if (lot) {
          if (!actor.isStaff && !actor.isFounder) {
            return fail('FORBIDDEN', 'Rekod stok memerlukan peranan kakitangan atau staff.');
          }
          bundle.lot = {
            ...lot,
            citation: cite(buildVersionedSourceCitation({ sourceKind: 'stock_lot', sourceId: lot.id, revision: lot.revision, expiresAt: lot.expiryAt ?? null, observedAt: at })),
          };
          bundle.movements = store
            .all<import('../../../../shared/platform-contracts').InventoryMovement>('movements')
            .filter((movement) => movement.sourceEntityId === lot.id)
            .map((movement) => ({
              ...movement,
              citation: cite(buildVersionedSourceCitation({ sourceKind: 'inventory_movement', sourceId: movement.id, observedAt: at })),
            }));
          sources.push('lots', 'movements');
        } else {
          return fail('RECORD_NOT_FOUND', `Tiada rekod kanonik untuk '${entityId}'.`);
        }
      }

      return {
        ok: true,
        entityId,
        bundle,
        citations,
        citationContract: 'shared/mod-contracts.ts#VersionedSourceCitation',
        provenance: provenance(ctx.runtime, ctx, sources, 'platform-store-read'),
      };
    },
  }),

  // ADV-04: explain_record (Q)
  defineTool({
    logicalCapabilityId: 'ADV-04',
    registrationName: 'explain_record',
    riskClass: 'Q',
    description:
      'Menerangkan satu rekod kanonik sebenar: medan kunci, status, nombor semasa dan sebab terhasil yang dikira daripada rekod berkaitan.',
    requiredRole: 'customer',
    inputSchema: {
      entityId: { required: true, type: 'string', min: 1, max: 120 },
    },
    execute: async (input, ctx) => {
      const resolved = resolveContext(ctx);
      if (!resolved.ok) return resolved;
      const { store, actor } = resolved;
      const entityId = input.entityId as string;
      const at = ctx.runtime.clock();
      const sources: string[] = [];

      const order = readOrder(store, entityId);
      if (order) {
        const refusal = orderAccessCode(actor, order);
        if (refusal) return fail(refusal, 'Rekod ini di luar skop akses pemeran.');
        const payments = paymentsForOrder(store, order.id);
        const confirmed = payments.filter((payment) => payment.state === 'confirmed').reduce((sum, payment) => sum + payment.amountSen, 0);
        const refunded = payments.filter((payment) => payment.state === 'refunded').reduce((sum, payment) => sum + payment.amountSen, 0);
        const reasons: string[] = [];
        if (confirmed !== order.paidAmountSen) {
          reasons.push(`JUMLAH_BAYARAN_MENGAMBANG: rekod=${order.paidAmountSen} vs bayaran=${confirmed}`);
        }
        if (refunded !== order.refundAmountSen) {
          reasons.push(`JUMLAH_PULANGAN_MENGAMBANG: rekod=${order.refundAmountSen} vs pulangan=${refunded}`);
        }
        if (order.paymentState === 'pending') reasons.push('BAYARAN_BELUM_DISAHKAN');
        if (order.fulfilmentStatus === 'cancelled') reasons.push('PESANAN_DIBATALKAN');
        const orderCitation = buildVersionedSourceCitation({ sourceKind: 'order', sourceId: order.id, revision: order.revision, observedAt: at });
        const paymentCitations = payments.map((payment) =>
          buildVersionedSourceCitation({ sourceKind: 'payment', sourceId: payment.id, observedAt: at }),
        );
        return {
          ok: true,
          entityId,
          recordType: 'order',
          record: { ...order, citation: orderCitation },
          citation: orderCitation,
          citations: [orderCitation, ...paymentCitations],
          citationContract: 'shared/mod-contracts.ts#VersionedSourceCitation',
          derived: {
            confirmedPaymentsSen: confirmed,
            refundedPaymentsSen: refunded,
            outstandingSen: Math.max(0, order.amountSen - order.paidAmountSen),
            lineCount: order.lines.length,
            createdAgeDays: daysBetween(order.createdAt, at),
          },
          explanation: reasons.length ? reasons : ['REKOD_SELARIH_DENGAN_LEJAR_BAYARAN'],
          provenance: provenance(ctx.runtime, ctx, ['orders', 'payments'], 'payment-reconciliation-read'),
        };
      }

      const caseRecord = readCase(store, entityId);
      if (caseRecord) {
        const linkedOrder = readOrder(store, caseRecord.orderId);
        if (linkedOrder) {
          const refusal = orderAccessCode(actor, linkedOrder);
          if (refusal) return fail(refusal, 'Rekod ini di luar skop akses pemeran.');
        }
        const caseCitation = buildVersionedSourceCitation({ sourceKind: 'case', sourceId: caseRecord.id, revision: caseRecord.revision, observedAt: at });
        const linkedOrderCitation = linkedOrder
          ? buildVersionedSourceCitation({ sourceKind: 'order', sourceId: linkedOrder.id, revision: linkedOrder.revision, observedAt: at })
          : null;
        return {
          ok: true,
          entityId,
          recordType: 'case',
          record: { ...caseRecord, citation: caseCitation },
          citation: caseCitation,
          citations: linkedOrderCitation ? [caseCitation, linkedOrderCitation] : [caseCitation],
          citationContract: 'shared/mod-contracts.ts#VersionedSourceCitation',
          derived: {
            orderId: caseRecord.orderId,
            orderPaymentState: linkedOrder?.paymentState ?? null,
            orderFulfilmentStatus: linkedOrder?.fulfilmentStatus ?? null,
            ageDays: daysBetween(caseRecord.createdAt, at),
            hasDetermination: Boolean(caseRecord.determination),
          },
          explanation: [
            caseRecord.status === 'resolved'
              ? 'KES_SUDAH_DISELESAIKAN'
              : 'KES_MASIH_OPEN',
            caseRecord.determination ? 'DETERMINATION_DIREKODKAN' : 'DETERMINATION_BELUM_DIREKODKAN',
          ],
          provenance: provenance(ctx.runtime, ctx, ['cases', 'orders'], 'case-read'),
        };
      }

      const lot: StockLot | null = readLot(store, entityId);
      if (lot) {
        if (!actor.isStaff && !actor.isFounder) {
          return fail('FORBIDDEN', 'Rekod stok memerlukan peranan kakitangan atau founder.');
        }
        const expiresAt = lot.expiryAt ?? null;
        const expired = Boolean(expiresAt && expiresAt <= at);
        const lotCitation = buildVersionedSourceCitation({ sourceKind: 'stock_lot', sourceId: lot.id, revision: lot.revision, expiresAt: lot.expiryAt ?? null, observedAt: at });
        return {
          ok: true,
          entityId,
          recordType: 'stock_lot',
          record: { ...lot, citation: lotCitation },
          citation: lotCitation,
          citations: [lotCitation],
          citationContract: 'shared/mod-contracts.ts#VersionedSourceCitation',
          derived: {
            expired,
            daysToExpiry: expiresAt ? daysBetween(at, expiresAt) : null,
            productPriceSen: catalogueProducts(store).find((product) => product.id === lot.productId)?.priceSen ?? null,
          },
          explanation: [
            lot.status === 'quarantine' ? 'LOT_DALAM_KUARANTIN' : `LOT_STATUS_${lot.status.toUpperCase()}`,
            expired ? 'LOT_LEWAT_TARIKH' : 'LOT_BELUM_LEWAT_TARIKH',
          ],
          provenance: provenance(ctx.runtime, ctx, ['lots', 'catalogue'], 'inventory-read'),
        };
      }

      const taskRecord = readTask(store, entityId);
      if (taskRecord) {
        if (!actor.isFounder && taskRecord.assigneeId !== actor.principal.user.id && taskRecord.ownerId !== actor.principal.user.id) {
          return fail('FORBIDDEN', 'Task ini di luar skop akses pemeran.');
        }
        const taskCitation = buildVersionedSourceCitation({ sourceKind: 'task', sourceId: taskRecord.id, revision: taskRecord.revision, observedAt: at });
        return {
          ok: true,
          entityId,
          recordType: 'task',
          record: { ...taskRecord, citation: taskCitation },
          citation: taskCitation,
          citations: [taskCitation],
          citationContract: 'shared/mod-contracts.ts#VersionedSourceCitation',
          derived: { dueAt: taskRecord.dueAt ?? null, overdue: Boolean(taskRecord.dueAt && taskRecord.dueAt < at) },
          explanation: [taskRecord.status === 'done' ? 'TASK_DIABAIKAN' : 'TASK_BELUM_DIABAIKAN'],
          provenance: provenance(ctx.runtime, ctx, ['tasks'], 'task-read'),
        };
      }

      return fail('RECORD_NOT_FOUND', `Tiada rekod kanonik untuk '${entityId}'.`);
    },
  }),
];
