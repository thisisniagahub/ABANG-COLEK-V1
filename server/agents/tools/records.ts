/**
 * AbangColek Sovereign GrowthOS — Canonical Record Readers for Agent Tools
 *
 * Thin, read-only accessors over the authoritative platform store. They never
 * invent a record: a missing id resolves to `null` so the caller can answer
 * NOT_FOUND instead of fabricating a plausible row.
 */

import type { PlatformStore } from '../../platform/store';
import type {
  CaseRecord,
  CampaignRecord,
  CatalogueProduct,
  CommissionPolicy,
  DayCloseRecord,
  ExpenseRecord,
  JobRecord,
  KnowledgeEntry,
  OrderRecord,
  QcRecord,
  RestockRecord,
  StockLot,
  TaskRecord,
} from '../../../shared/platform-contracts';
import type { CommissionTransaction } from '../../../shared/dealer-contracts';
import type { PaymentRecord } from '../../platform/commerce';
import type { DealerReturnRecord, DealerSettlement, DealerSettlementPayment } from '../../../shared/dealer-contracts';

export const readOrder = (store: PlatformStore, orderId: string): OrderRecord | null =>
  store.get<OrderRecord>('orders', orderId);

export const readOrderByTracking = (store: PlatformStore, tokenHash: string): OrderRecord | null =>
  store.all<OrderRecord>('orders').find((order) => order.trackingTokenHash === tokenHash) ?? null;

export const readCase = (store: PlatformStore, caseId: string): CaseRecord | null =>
  store.get<CaseRecord>('cases', caseId);

export const readTask = (store: PlatformStore, taskId: string): TaskRecord | null =>
  store.get<TaskRecord>('tasks', taskId);

export const readLot = (store: PlatformStore, lotId: string): StockLot | null =>
  store.get<StockLot>('lots', lotId);

export const readCampaign = (store: PlatformStore, campaignId: string): CampaignRecord | null =>
  store.get<CampaignRecord>('campaigns', campaignId);

export const readRestock = (store: PlatformStore, restockId: string): RestockRecord | null =>
  store.get<RestockRecord>('restocks', restockId);

export const readJob = (store: PlatformStore, jobId: string): JobRecord | null =>
  store.get<JobRecord>('jobs', jobId);

export const readKnowledge = (store: PlatformStore, knowledgeId: string): KnowledgeEntry | null =>
  store.get<KnowledgeEntry>('knowledge', knowledgeId);

export const readDayClose = (store: PlatformStore, dayCloseId: string): DayCloseRecord | null =>
  store.get<DayCloseRecord>('dayclose', dayCloseId);

export const readExpense = (store: PlatformStore, expenseId: string): ExpenseRecord | null =>
  store.get<ExpenseRecord>('expenses', expenseId);

export const readQc = (store: PlatformStore, qcId: string): QcRecord | null =>
  store.get<QcRecord>('qc', qcId);

export const paymentsForOrder = (store: PlatformStore, orderId: string): PaymentRecord[] =>
  store.all<PaymentRecord>('payments').filter((payment) => payment.orderId === orderId);

export const allPayments = (store: PlatformStore): PaymentRecord[] => store.all<PaymentRecord>('payments');

export const commissionsForOrder = (store: PlatformStore, orderId: string): CommissionTransaction[] =>
  store.all<CommissionTransaction>('commission_ledger').filter((entry) => entry.orderId === orderId);

export const allCommissions = (store: PlatformStore): CommissionTransaction[] =>
  store.all<CommissionTransaction>('commission_ledger');

export const commissionPolicies = (store: PlatformStore): CommissionPolicy[] =>
  store.all<CommissionPolicy>('commission_policies');

export const policyForVersion = (store: PlatformStore, version: number): CommissionPolicy | null =>
  commissionPolicies(store).find((policy) => policy.version === version) ?? null;

export const catalogueProducts = (store: PlatformStore): CatalogueProduct[] =>
  store.all<CatalogueProduct>('catalogue');

export const catalogueVersion = (store: PlatformStore): number =>
  Number(store.metadata('catalogue_version') ?? '0');

export const productById = (store: PlatformStore, productId: string): CatalogueProduct | null =>
  catalogueProducts(store).find((product) => product.id === productId) ?? null;

export const lotsForBatch = (store: PlatformStore, batchId: string): StockLot[] =>
  store.all<StockLot>('lots').filter((lot) => lot.batchId === batchId);

export const allLots = (store: PlatformStore): StockLot[] => store.all<StockLot>('lots');

export const activeReservations = (store: PlatformStore): Array<{ id: string; orderId: string; productId: string; quantity: number; expiresAt: string; locationId: string; ownerId: string }> =>
  store
    .all<{ id: string; orderId: string; productId: string; quantity: number; expiresAt: string; locationId: string; ownerId: string; status: string }>('reservations')
    .filter((reservation) => reservation.status === 'active')
    .map(({ id, orderId, productId, quantity, expiresAt, locationId, ownerId }) => ({
      id,
      orderId,
      productId,
      quantity,
      expiresAt,
      locationId,
      ownerId,
    }));

export const dealerReturns = (store: PlatformStore): DealerReturnRecord[] =>
  store.all<DealerReturnRecord>('dealer_returns');

export const dealerSettlements = (store: PlatformStore): DealerSettlement[] =>
  store.all<DealerSettlement>('dealer_settlements');

export const dealerSettlementPayments = (store: PlatformStore): DealerSettlementPayment[] =>
  store.all<DealerSettlementPayment>('dealer_settlement_payments');

export const approvedKnowledge = (store: PlatformStore, at: string): KnowledgeEntry[] =>
  store
    .all<KnowledgeEntry>('knowledge')
    .filter((entry) => entry.status === 'approved' && (!entry.expiresAt || entry.expiresAt > at));

/** Local business day (Asia/Kuala_Lumpur) of an ISO instant. */
export const localDay = (stamp: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(stamp));

/** Days between two instants, rounded down. */
export const daysBetween = (from: string, to: string): number =>
  Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);
