/**
 * AbangColek Sovereign GrowthOS — Canonical Cost Ledger (MOD-08)
 *
 * APA YANG MODUL INI LAKUKAN:
 * Membaca asas kos yang BENAR-BENAR boleh dikira daripada state store:
 *   - hasil (jualan) daripada rekod `payments` yang disahkan (`state='confirmed'`),
 *   - kos daripada rekod `expenses` yang diluluskan (`status='approved'`),
 *   - margin dalam INTEGER BASIS POINTS (`marginSen * 10000n / netSalesSen`).
 *
 * APA YANG MODUL INI TIDAK LAKUKAN:
 *   - Tiada peratus floating point. Margin sentiasa integer basis points.
 *   - Tiada COGS. Tiada kos perolehan setiap unit disimpan di mana-mana,
 *     jadi `cogsSen` sentiasa `null` dengan reason code `COGS_NOT_RECORDED`.
 *     COGS tidak pernah dianggak.
 *   - Tiada angka rekaan. Apabila asas kos tidak boleh dikira, hasilnya ialah
 *     `CostBasisUnavailable` dengan `reasonCode` + `detail` yang boleh dibaca mesin.
 *
 * LEJAR TEMPOH KANONIKAL:
 * `ReconciliationRecord` (shared/platform-contracts.ts) ialah baris lejar
 * tempoh yang disahkan. Apabila satu lejar yang telah diluluskan exist untuk
 * tempoh yang diminta, hash sumbernya (`sourceHashes`) DITERUSKAN SEMULA; jika
 * mana-mana sumber berubah, lejar itu tidak lagi kanonikal dan platform gagal
 * tertutup dengan `COST_BASIS_SOURCE_CHANGED` — ia tidak melaporkan lejar basi.
 */

import { createHash } from 'node:crypto';
import type { PlatformStore } from './store';
import type {
  ExpenseRecord,
  OrderRecord,
  PaymentRecord,
  ReconciliationRecord,
} from '../../shared/platform-contracts';
import {
  COGS_NOT_RECORDED,
  COST_BASIS_AMOUNT_INVALID,
  COST_BASIS_UNAVAILABLE,
  type CanonicalCostBasis,
  type CostBasisOutcome,
  type CostBasisUnavailableDetail,
  type SourceCitation,
} from '../../shared/mod-contracts';

/** Skop baca untuk lejar kos. */
export interface CostBasisScope {
  /**
   * `all` (seluruh rekod), `YYYY-MM` (bulan) atau `YYYY-MM-DD` (hari).
   * Tempoh lain tidak dikenali ⇒ tiada rekod sepadan (bukan nilai rekaan).
   */
  period: string;
  /** Jika ditetapkan, hanya outlet ini dikira. */
  outletId?: string;
}

/** Tempoh "seluruh rekod". */
export const ALL_PERIODS = 'all';

const PERIOD_MONTH = /^\d{4}-\d{2}$/;
const PERIOD_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Hari tempatan (Asia/Kuala_Lumpur) — sama seperti alat domain lain. */
const localDay = (stamp: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(stamp));

/**
 * Adakah cap masa berada dalam tempoh yang diminta?
 * Tempoh yang tidak dikenali tidak sepadan dengan apa-apa (fail tertutup).
 */
export function periodMatches(stamp: string, period: string): boolean {
  if (period === ALL_PERIODS) return true;
  if (!stamp) return false;
  const day = localDay(stamp);
  if (PERIOD_MONTH.test(period)) return day.startsWith(period);
  if (PERIOD_DAY.test(period)) return day === period;
  return false;
}

/**
 * Hash satu rekod store — algorithma yang SAMA digunakan oleh
 * `Operations.reconciliationSources` (server/platform/operations.ts), supaya
 * `sourceHashes` yang ditulis di sana boleh disahkan semula di sini.
 */
function sourceHash(record: unknown): string {
  return createHash('sha256').update(JSON.stringify(record ?? null)).digest('hex');
}

function assertIntegerSen(amountSen: number, label: string): number {
  if (!Number.isSafeInteger(amountSen)) {
    throw new Error(`${COST_BASIS_AMOUNT_INVALID}: ${label} bukan integer sen yang sah.`);
  }
  return amountSen;
}

function unavailable(
  detail: CostBasisUnavailableDetail,
  scope: CostBasisScope,
  citations: SourceCitation[] = [],
): CostBasisOutcome {
  return {
    available: false,
    reasonCode: COST_BASIS_UNAVAILABLE,
    detail,
    period: scope.period,
    outletId: scope.outletId ?? null,
    cogsSen: null,
    cogsReasonCode: COGS_NOT_RECORDED,
    citations,
  };
}

/**
 * Baca asas kos kanonikal daripada store.
 *
 * @param store store platform; `null`/`undefined` bermaksud tiada state
 *   boleh dibaca ⇒ `PLATFORM_STORE_NOT_WIRED`.
 * @param scope tempoh + outlet yang diminta.
 */
export function readCanonicalCostBasis(
  store: PlatformStore | null | undefined,
  scope: CostBasisScope,
): CostBasisOutcome {
  const normalisedScope: CostBasisScope = {
    period: scope.period || ALL_PERIODS,
    ...(scope.outletId ? { outletId: scope.outletId } : {}),
  };
  if (!store) return unavailable('PLATFORM_STORE_NOT_WIRED', normalisedScope);

  const orders = store.all<OrderRecord>('orders');
  const outletOfOrder = new Map<string, string>();
  for (const order of orders) outletOfOrder.set(order.id, order.outletId);

  const paymentsById = new Map<string, PaymentRecord>();
  for (const payment of store.all<PaymentRecord>('payments')) paymentsById.set(payment.id, payment);

  const expensesById = new Map<string, ExpenseRecord>();
  for (const expense of store.all<ExpenseRecord>('expenses')) expensesById.set(expense.id, expense);

  const outletId = normalisedScope.outletId ?? null;

  /* --- 1. Lejar tempoh kanonikal (pilihan) ------------------------------- */
  // Hanya lejar tempoh yang DISAHKAN (status 'approved') boleh menjadi asas
  // kanonikal. Lejar 'review' belum kanonikal, jadi ia diabaikan dan tidak
  // menjadi punca kegagalan.
  const periodReconciliations =
    normalisedScope.period === ALL_PERIODS
      ? []
      : store
          .all<ReconciliationRecord>('reconciliations')
          .filter(record => record.period === normalisedScope.period);
  const approvedReconciliation = periodReconciliations.find(record => record.status === 'approved') ?? null;

  let selectedPayments: PaymentRecord[] = [];
  let selectedExpenses: ExpenseRecord[] = [];
  let reconciliationId: string | null = null;

  if (approvedReconciliation) {
    // Sumber mesti boleh disahkan semula. Hash yang hilang bermaksud lejar
    // tidak dapat diverifikasi ⇒ fail tertutup.
    const storedHashes = approvedReconciliation.sourceHashes;
    if (!storedHashes || Object.keys(storedHashes).length === 0) {
      return unavailable('COST_BASIS_SOURCE_CHANGED', normalisedScope);
    }
    for (const [key, expected] of Object.entries(storedHashes)) {
      const separator = key.indexOf(':');
      if (separator < 0) return unavailable('COST_BASIS_SOURCE_CHANGED', normalisedScope);
      const kind = key.slice(0, separator);
      const ref = key.slice(separator + 1);
      if (kind !== 'payments' && kind !== 'expenses') {
        return unavailable('COST_BASIS_SOURCE_CHANGED', normalisedScope);
      }
      const current = sourceHash(store.get(kind, ref));
      if (current !== expected) return unavailable('COST_BASIS_SOURCE_CHANGED', normalisedScope);
    }
    // Setiap rujukan mesti masih resolving — rujukan yang hilang adalah
    // perubahan sumber (fail tertutup), bukan "rekod tidak dijumpai".
    const referencedPayments: PaymentRecord[] = [];
    for (const ref of approvedReconciliation.paymentRefs) {
      const payment = paymentsById.get(ref);
      if (!payment) return unavailable('COST_BASIS_SOURCE_CHANGED', normalisedScope);
      referencedPayments.push(payment);
    }
    const referencedExpenses: ExpenseRecord[] = [];
    for (const ref of approvedReconciliation.expenseRefs) {
      const expense = expensesById.get(ref);
      if (!expense) return unavailable('COST_BASIS_SOURCE_CHANGED', normalisedScope);
      referencedExpenses.push(expense);
    }
    // Lejar tempoh tidak membawa dimensi outlet. Jika skop meminta satu
    // outlet, lejar hanya boleh digunakan apabila SEMUA sumbernya berada
    // dalam outlet tersebut.
    if (outletId !== null) {
      const paymentOutletsMatch = referencedPayments.every(
        payment => outletOfOrder.get(payment.orderId) === outletId,
      );
      const expenseOutletsMatch = referencedExpenses.every(expense => expense.outletId === outletId);
      if (!paymentOutletsMatch || !expenseOutletsMatch) {
        // Skop tidak sepadan: lejar ini bukan untuk outlet ini. Guna asas
        // terbitan yang diskop (bukan lejar), dan jangan tudingkan ID lejar.
        selectedPayments = [];
        selectedExpenses = [];
      } else {
        selectedPayments = referencedPayments;
        selectedExpenses = referencedExpenses;
        reconciliationId = approvedReconciliation.id;
      }
    } else {
      selectedPayments = referencedPayments;
      selectedExpenses = referencedExpenses;
      reconciliationId = approvedReconciliation.id;
    }
  }

  if (!reconciliationId) {
    // Asas terbitan daripada store: bayaran disahkan dalam tempoh/skop dan
    // perbelanjaan yang diluluskan dalam tempoh/skop.
    selectedPayments = [...paymentsById.values()].filter(payment => {
      if (!periodMatches(payment.createdAt, normalisedScope.period)) return false;
      if (outletId === null) return true;
      return outletOfOrder.get(payment.orderId) === outletId;
    });
    selectedExpenses = [...expensesById.values()].filter(expense => {
      if (expense.status !== 'approved') return false;
      if (!periodMatches(expense.createdAt, normalisedScope.period)) return false;
      if (outletId === null) return true;
      return expense.outletId === outletId;
    });
  }

  const citations: SourceCitation[] = [];
  let grossRevenueSen = 0;
  let refundedSen = 0;
  for (const payment of selectedPayments) {
    const amount = assertIntegerSen(payment.amountSen, `Bayaran ${payment.id}`);
    if (payment.state === 'confirmed') {
      grossRevenueSen += amount;
      citations.push({ kind: 'payment', id: payment.id, amountSen: amount, status: payment.state });
    } else if (payment.state === 'refunded') {
      refundedSen += amount;
      citations.push({ kind: 'payment', id: payment.id, amountSen: amount, status: payment.state });
    }
  }

  let costSen = 0;
  for (const expense of selectedExpenses) {
    if (expense.status !== 'approved') continue;
    const amount = assertIntegerSen(expense.amountSen, `Perbelanjaan ${expense.id}`);
    costSen += amount;
    citations.push({ kind: 'expense', id: expense.id, amountSen: amount, status: expense.status });
  }

  if (reconciliationId) {
    citations.push({
      kind: 'reconciliation',
      id: reconciliationId,
      status: 'approved',
      period: normalisedScope.period,
    });
  }

  /* --- 2. Gate: ada kos yang diluluskan? --------------------------------- */
  if (selectedExpenses.length === 0) {
    return unavailable('NO_APPROVED_COST_RECORDS', normalisedScope, citations);
  }

  const netSalesSen = grossRevenueSen - refundedSen;

  /* --- 3. Gate: ada asas jualan? ----------------------------------------- */
  if (netSalesSen <= 0) {
    return unavailable('ZERO_REVENUE_BASIS', normalisedScope, citations);
  }

  /* --- 4. Margin dalam INTEGER BASIS POINTS ------------------------------ */
  const marginSen = netSalesSen - costSen;
  // BigInt throughout: tiada satu pun langkah ini menggunakan float.
  const netOperatingMarginBasisPoints = Number(
    (BigInt(marginSen) * 10000n) / BigInt(netSalesSen),
  );

  const basis: CanonicalCostBasis = {
    available: true,
    period: normalisedScope.period,
    outletId,
    grossRevenueSen,
    refundedSen,
    netSalesSen,
    costSen,
    marginSen,
    netOperatingMarginBasisPoints,
    cogsSen: null,
    cogsReasonCode: COGS_NOT_RECORDED,
    reconciliationId,
    citations,
  };
  return basis;
}
