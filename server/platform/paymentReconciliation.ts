import type { OrderRecord, InventoryReservation } from '../../shared/platform-contracts';
import type { PaymentRecord } from './commerce';
import type { CommissionTransaction } from '../../shared/dealer-contracts';
import { fail, id, now, type PlatformStore } from './store';
import { Loyalty } from './loyalty';

export interface ProviderCallbackPayload {
  transactionId: string;
  orderId: string;
  amountSen: number;
  currency: string;
  merchantAccount: string;
  status: 'paid' | 'pending' | 'failed';
  signature?: string;
  paidAt?: string;
  provider?: string;
  rawPayload?: Record<string, unknown>;
}

export interface ProviderReceiptRecord {
  id: string; // transactionId
  orderId: string;
  provider: string;
  providerRef: string;
  amountSen: number;
  currency: string;
  merchantAccount: string;
  status: 'paid' | 'pending' | 'failed';
  receivedAt: string;
  outcome: 'verified' | 'payment_exception_review' | 'rejected' | 'duplicate_ignored';
  exceptionReason?: string;
  rawPayloadHash?: string;
}

export interface PaymentExceptionRecord {
  id: string;
  orderId: string;
  transactionId: string;
  reason: 'LATE_PAYMENT_AFTER_CANCELLATION' | 'PAYMENT_CONFLICT_HELD' | 'STOCK_ALREADY_REALLOCATED';
  amountSen: number;
  currency: string;
  heldAt: string;
  resolved: boolean;
  notes?: string;
}

export interface AllocationItem {
  id: string;
  weight: number;
}

export interface AllocationResult {
  id: string;
  allocatedSen: number;
}

export interface CumulativeReversalOptions {
  originalAmountSen: number;
  cumulativeRefundSen: number;
  rateBasisPoints: number;
  previouslyReversedSen: number;
}

export interface RefundRequest {
  refundId: string;
  orderId: string;
  amountSen: number;
  reason: string;
  actorId: string;
  reference?: string;
}

export interface RefundResult {
  isReplay: boolean;
  refundRecord: PaymentRecord;
  order: OrderRecord;
  lineRefunds: AllocationResult[];
  cumulativeReversalSen: number;
}

/**
 * Largest-Remainder Integer Allocation (Hamilton-Hare method)
 * Execution Contract §5:
 * - Exact quota calculated from non-negative weights
 * - Take floor
 * - Distribute residual 1-cent according to descending fractional remainder
 * - Tie-break: stable line ID ascending
 * - Sum allocations strictly equals totalSen
 * - Zero weights with non-zero totalSen throws error
 */
export function allocateLargestRemainder(
  totalSen: number,
  items: AllocationItem[]
): AllocationResult[] {
  if (typeof totalSen !== 'number' || !Number.isSafeInteger(totalSen)) {
    throw new TypeError('totalSen mesti integer sen yang sah.');
  }
  if (totalSen < 0) {
    throw new RangeError('totalSen tidak boleh bernilai negatif.');
  }
  if (!Array.isArray(items)) {
    throw new TypeError('items mesti array.');
  }

  for (const item of items) {
    if (typeof item.weight !== 'number' || !Number.isFinite(item.weight)) {
      throw new TypeError(`Pemberat untuk item ${item.id} mesti nombor yang sah.`);
    }
    if (item.weight < 0) {
      throw new RangeError(`Pemberat untuk item ${item.id} tidak boleh negatif.`);
    }
  }

  if (items.length === 0) {
    if (totalSen > 0) {
      throw new RangeError('Tiada item untuk diagihkan bagi jumlah sen bukan sifar.');
    }
    return [];
  }

  const sumWeights = items.reduce((sum, item) => sum + item.weight, 0);

  if (sumWeights === 0) {
    if (totalSen > 0) {
      throw new RangeError('Jumlah pemberat sifar tidak boleh mengagihkan nilai sen bukan sifar (ZERO_WEIGHT_NONZERO_TOTAL).');
    }
    return items.map(item => ({ id: item.id, allocatedSen: 0 }));
  }

  if (totalSen === 0) {
    return items.map(item => ({ id: item.id, allocatedSen: 0 }));
  }

  const sumWeightsBig = BigInt(Math.round(sumWeights * 10000));
  const totalSenBig = BigInt(totalSen);

  // Calculate integer floor and rational remainder for each item
  const quotas = items.map((item, index) => {
    const weightBig = BigInt(Math.round(item.weight * 10000));
    const numerator = weightBig * totalSenBig;
    const floorSen = Number(numerator / sumWeightsBig);
    const remainderNum = numerator % sumWeightsBig;
    return {
      index,
      id: item.id,
      floorSen,
      remainderNum,
    };
  });

  const sumFloor = quotas.reduce((acc, q) => acc + q.floorSen, 0);
  const residual = totalSen - sumFloor;

  if (residual < 0 || residual > items.length) {
    throw new Error(`Ralat agihan residual: residual ${residual} luar julat sah [0, ${items.length}].`);
  }

  // Sort by remainder descending, tie-break by stable id ascending
  const sorted = [...quotas].sort((a, b) => {
    if (a.remainderNum > b.remainderNum) return -1;
    if (a.remainderNum < b.remainderNum) return 1;
    return a.id.localeCompare(b.id);
  });

  const extraCentMap = new Map<string, number>();
  for (let i = 0; i < residual; i++) {
    const item = sorted[i];
    extraCentMap.set(item.id, (extraCentMap.get(item.id) ?? 0) + 1);
  }

  const results: AllocationResult[] = quotas.map(q => ({
    id: q.id,
    allocatedSen: q.floorSen + (extraCentMap.get(q.id) ?? 0),
  }));

  const verifiedTotal = results.reduce((sum, r) => sum + r.allocatedSen, 0);
  if (verifiedTotal !== totalSen) {
    throw new Error(`Ralat agihan largest remainder: jumlah ${verifiedTotal} != sasaran ${totalSen}.`);
  }

  return results;
}

/**
 * Agihkan amaun refund kumulatif ke atas baris pesanan (Order Lines)
 * Memastikan agihan separa konsisten tepat dengan agihan sekali gus (single refund).
 */
export function allocateCumulativeRefundAcrossLines(
  totalRefundSen: number,
  previousRefundSen: number,
  lines: { productId: string; priceSen: number; quantity: number }[]
): AllocationResult[] {
  if (lines.length === 0) return [];
  const items: AllocationItem[] = lines.map(line => ({
    id: line.productId,
    weight: line.priceSen * line.quantity,
  }));

  const cumulativeBefore = allocateLargestRemainder(previousRefundSen, items);
  const cumulativeAfter = allocateLargestRemainder(previousRefundSen + totalRefundSen, items);

  return cumulativeAfter.map((after, idx) => ({
    id: after.id,
    allocatedSen: after.allocatedSen - cumulativeBefore[idx].allocatedSen,
  }));
}

/**
 * Reversal kumulatif bagi komisen / caj / diskaun tanpa drifting pembundaran.
 * Execution Contract §5:
 * Target reversal dikira daripada cumulative successful refunds, tolak posting terdahulu.
 */
export function calculateCumulativeReversal(opts: CumulativeReversalOptions): {
  targetCumulativeReversalSen: number;
  currentReversalDeltaSen: number;
} {
  if (opts.originalAmountSen < 0 || opts.cumulativeRefundSen < 0 || opts.previouslyReversedSen < 0) {
    throw new RangeError('Parameter reversal tidak boleh bernilai negatif.');
  }

  const targetCumulative = Number(
    (BigInt(opts.cumulativeRefundSen) * BigInt(opts.rateBasisPoints)) / 10000n
  );
  const cappedTarget = Math.min(opts.originalAmountSen, targetCumulative);
  const delta = Math.max(0, cappedTarget - opts.previouslyReversedSen);

  return {
    targetCumulativeReversalSen: cappedTarget,
    currentReversalDeltaSen: delta,
  };
}

export class PaymentReconciler {
  constructor(
    readonly store: PlatformStore,
    readonly loyalty?: Loyalty,
    readonly expectedMerchantAccount: string = 'ABANGCOLEK-HQ-MERCHANT'
  ) {}

  /**
   * Memproses callback penyedia pembayaran (Billplz/FPX/dll.)
   * Menegakkan deduplikasi, pengesahan mata wang/akaun/amaun,
   * dan pengendalian bayaran lewat (late paid) tanpa membangkitkan stok.
   */
  processProviderCallback(payload: ProviderCallbackPayload): {
    outcome: 'verified' | 'payment_exception_review' | 'rejected' | 'duplicate_ignored';
    orderId: string;
    isDuplicate: boolean;
    receiptId: string;
    order?: OrderRecord;
    exception?: PaymentExceptionRecord;
  } {
    // 1. Deduplikasi Provider Receipt (Idempotency)
    const existingReceipt = this.store.get<ProviderReceiptRecord>('provider_receipts', payload.transactionId);
    if (existingReceipt) {
      const order = this.store.get<OrderRecord>('orders', payload.orderId) ?? undefined;
      return {
        outcome: 'duplicate_ignored',
        orderId: payload.orderId,
        isDuplicate: true,
        receiptId: existingReceipt.id,
        order,
      };
    }

    // 2. Pengesahan asas (Mata wang, akaun, order wujud)
    if (payload.currency !== 'MYR') {
      fail('PAYMENT_CURRENCY_MISMATCH', 400, `Mata wang tidak sah: ${payload.currency}, dijangka MYR.`);
    }

    if (payload.merchantAccount !== this.expectedMerchantAccount) {
      fail('PAYMENT_ACCOUNT_MISMATCH', 400, `Akaun peniaga tidak sepadan: ${payload.merchantAccount}.`);
    }

    const order = this.store.require<OrderRecord>('orders', payload.orderId);

    // 3. Pengesahan amaun pesanan
    if (payload.amountSen !== order.amountSen) {
      fail('PAYMENT_AMOUNT_MISMATCH', 409, `Jumlah bayaran (${payload.amountSen}) tidak sepadan dengan rekod pesanan (${order.amountSen}).`);
    }

    // Jika callback menyatakan bayaran gagal atau pending, simpan resit tanpa mengesahkan pesanan
    if (payload.status !== 'paid') {
      const receipt: ProviderReceiptRecord = {
        id: payload.transactionId,
        orderId: order.id,
        provider: payload.provider ?? 'billplz',
        providerRef: payload.transactionId,
        amountSen: payload.amountSen,
        currency: payload.currency,
        merchantAccount: payload.merchantAccount,
        status: payload.status,
        receivedAt: now(),
        outcome: 'rejected',
        exceptionReason: `Callback status: ${payload.status}`,
      };
      this.store.save('provider_receipts', receipt);
      return {
        outcome: 'rejected',
        orderId: order.id,
        isDuplicate: false,
        receiptId: receipt.id,
        order,
      };
    }

    // 4. Pengesahan percubaan bayaran bertindih (Conflicting Paid Attempts)
    // Jika pesanan telah disahkan bayar sepenuhnya oleh transaksi lain
    if (order.paidAmountSen >= order.amountSen && order.paymentState === 'verified') {
      return this.store.atomic(() => {
        const exception: PaymentExceptionRecord = {
          id: id(),
          orderId: order.id,
          transactionId: payload.transactionId,
          reason: 'PAYMENT_CONFLICT_HELD',
          amountSen: payload.amountSen,
          currency: payload.currency,
          heldAt: now(),
          resolved: false,
          notes: 'Percubaan bayaran bertindih bagi pesanan yang telah disahkan bayar.',
        };
        this.store.save('payment_exceptions', exception);

        const receipt: ProviderReceiptRecord = {
          id: payload.transactionId,
          orderId: order.id,
          provider: payload.provider ?? 'billplz',
          providerRef: payload.transactionId,
          amountSen: payload.amountSen,
          currency: payload.currency,
          merchantAccount: payload.merchantAccount,
          status: 'paid',
          receivedAt: now(),
          outcome: 'payment_exception_review',
          exceptionReason: 'PAYMENT_CONFLICT_HELD',
        };
        this.store.save('provider_receipts', receipt);
        this.store.audit('provider', 'payment.conflict_held', order.id, order.revision);

        return {
          outcome: 'payment_exception_review',
          orderId: order.id,
          isDuplicate: false,
          receiptId: receipt.id,
          order,
          exception,
        };
      });
    }

    // 5. Pengendalian bayaran lewat (Late Paid Handling)
    // Jika pesanan telah dibatalkan atau tempahan stok luput/dilepaskan
    const reservations = this.store.all<InventoryReservation>('reservations').filter(r => r.orderId === order.id);
    const isOrderCancelled = order.fulfilmentStatus === 'cancelled';
    const isReservationDead = reservations.length === 0 || reservations.some(r => r.status === 'released' || r.status === 'expired' || r.expiresAt <= now());

    if (isOrderCancelled || isReservationDead) {
      return this.store.atomic(() => {
        // Rekod fakta kewangan sebenar (verified payment record)
        const paymentRecord: PaymentRecord = {
          id: id(),
          orderId: order.id,
          amountSen: payload.amountSen,
          method: 'bank',
          reference: payload.transactionId,
          state: 'confirmed',
          confirmedBy: 'provider:webhook',
          createdAt: now(),
        };
        this.store.save('payments', paymentRecord);

        // Simpan rekod resit pembekal
        const receipt: ProviderReceiptRecord = {
          id: payload.transactionId,
          orderId: order.id,
          provider: payload.provider ?? 'billplz',
          providerRef: payload.transactionId,
          amountSen: payload.amountSen,
          currency: payload.currency,
          merchantAccount: payload.merchantAccount,
          status: 'paid',
          receivedAt: now(),
          outcome: 'payment_exception_review',
          exceptionReason: 'LATE_PAYMENT_AFTER_CANCELLATION',
        };
        this.store.save('provider_receipts', receipt);

        // Rekod pengecualian untuk semakan manusia (payment_exception_review)
        const exception: PaymentExceptionRecord = {
          id: id(),
          orderId: order.id,
          transactionId: payload.transactionId,
          reason: 'LATE_PAYMENT_AFTER_CANCELLATION',
          amountSen: payload.amountSen,
          currency: payload.currency,
          heldAt: now(),
          resolved: false,
          notes: 'Bayaran tiba selepas pesanan expired/cancelled. Stok tidak dihidupkan semula secara automatik.',
        };
        this.store.save('payment_exceptions', exception);

        // Kemas kini fakta bayaran pesanan TETAPI KEKALKAN fulfilmentStatus sebagai cancelled
        // JANGAN hidupkan semula tempahan stok
        const updatedOrder: OrderRecord = {
          ...order,
          paidAmountSen: payload.amountSen,
          fulfilmentStatus: 'cancelled',
          revision: order.revision + 1,
          updatedAt: now(),
        };
        this.store.save('orders', updatedOrder);
        this.store.audit('provider', 'payment.late_paid_held', order.id, updatedOrder.revision);

        return {
          outcome: 'payment_exception_review',
          orderId: order.id,
          isDuplicate: false,
          receiptId: receipt.id,
          order: updatedOrder,
          exception,
        };
      });
    }

    // 6. Aliran Kejayaan Biasa (Normal Valid Payment)
    return this.store.atomic(() => {
      const paymentRecord: PaymentRecord = {
        id: id(),
        orderId: order.id,
        amountSen: payload.amountSen,
        method: 'bank',
        reference: payload.transactionId,
        state: 'confirmed',
        confirmedBy: 'provider:webhook',
        createdAt: now(),
      };
      this.store.save('payments', paymentRecord);

      const receipt: ProviderReceiptRecord = {
        id: payload.transactionId,
        orderId: order.id,
        provider: payload.provider ?? 'billplz',
        providerRef: payload.transactionId,
        amountSen: payload.amountSen,
        currency: payload.currency,
        merchantAccount: payload.merchantAccount,
        status: 'paid',
        receivedAt: now(),
        outcome: 'verified',
      };
      this.store.save('provider_receipts', receipt);

      const updatedOrder: OrderRecord = {
        ...order,
        paymentState: 'verified',
        paidAmountSen: payload.amountSen,
        revision: order.revision + 1,
        updatedAt: now(),
      };
      this.store.save('orders', updatedOrder);

      // Berikan mata kesetiaan sekiranya loyalty diaktifkan
      if (this.loyalty) {
        const pointsEarned = this.loyalty.calculatePointsEarned(payload.amountSen);
        if (pointsEarned > 0) {
          this.loyalty.awardPoints(
            order.customerId,
            pointsEarned,
            order.id,
            `Ganjaran ${pointsEarned} mata kesetiaan untuk bayaran #${order.id}`
          );
        }
      }

      this.store.audit('provider', 'payment.verified', order.id, updatedOrder.revision);

      return {
        outcome: 'verified',
        orderId: order.id,
        isDuplicate: false,
        receiptId: receipt.id,
        order: updatedOrder,
      };
    });
  }

  /**
   * Memproses pemulangan wang (refund) dengan perlindungan replay ID dan had baki.
   */
  processRefund(request: RefundRequest): RefundResult {
    // 1. Replay ID Check: Jika refund ID telah wujud, pulangkan hasil terdahulu tanpa mencipta posting baharu
    const existingRefund = this.store.get<PaymentRecord>('payments', request.refundId);
    if (existingRefund && existingRefund.state === 'refunded') {
      const order = this.store.require<OrderRecord>('orders', request.orderId);
      return {
        isReplay: true,
        refundRecord: existingRefund,
        order,
        lineRefunds: [],
        cumulativeReversalSen: existingRefund.amountSen,
      };
    }

    const order = this.store.require<OrderRecord>('orders', request.orderId);

    // 2. Had baki boleh bayar asal (Cap on refundable balance)
    const availableRefundableSen = order.paidAmountSen - order.refundAmountSen;
    if (request.amountSen > availableRefundableSen) {
      fail(
        'REFUND_EXCEEDS_PAID_BALANCE',
        400,
        `Amaun refund (${request.amountSen} sen) melebihi baki boleh dipulangkan (${availableRefundableSen} sen).`
      );
    }

    if (request.amountSen <= 0) {
      fail('INVALID_REFUND_AMOUNT', 400, 'Amaun refund mesti lebih daripada sifar.');
    }

    // 3. Agihan pemulangan mengikut baris menggunakan Largest Remainder (Cumulative)
    const lineRefunds = allocateCumulativeRefundAcrossLines(
      request.amountSen,
      order.refundAmountSen,
      order.lines
    );

    return this.store.atomic(() => {
      const refundRecord: PaymentRecord = {
        id: request.refundId,
        orderId: order.id,
        amountSen: request.amountSen,
        method: 'bank',
        reference: request.reference ?? request.refundId,
        state: 'refunded',
        confirmedBy: request.actorId,
        createdAt: now(),
      };
      this.store.save('payments', refundRecord);

      const newRefundAmountSen = order.refundAmountSen + request.amountSen;
      const newPaymentState = newRefundAmountSen === order.paidAmountSen ? 'refunded' : 'part_refunded';

      const updatedOrder: OrderRecord = {
        ...order,
        refundAmountSen: newRefundAmountSen,
        paymentState: newPaymentState,
        revision: order.revision + 1,
        updatedAt: now(),
      };
      this.store.save('orders', updatedOrder);

      // Pelarasan kontra komisen dealer kumulatif jika ada
      const commissions = this.store.all<CommissionTransaction>('commission_ledger').filter(c => c.orderId === order.id);
      for (const comm of commissions) {
        if (comm.status === 'paid') {
          const existingContras = commissions.filter(c => c.status === 'reversed' && c.amountSen < 0 && c.contraOfId === comm.id);
          const alreadyContradSen = existingContras.reduce((sum, c) => sum + Math.abs(c.amountSen), 0);
          const policy = this.store.all<import('../../shared/platform-contracts').CommissionPolicy>('commission_policies').find(p => p.version === comm.policyVersion);
          const rateBasisPoints = policy?.rateBasisPoints ?? 1000;

          const reversal = calculateCumulativeReversal({
            originalAmountSen: comm.amountSen,
            cumulativeRefundSen: newRefundAmountSen,
            rateBasisPoints,
            previouslyReversedSen: alreadyContradSen,
          });

          if (reversal.currentReversalDeltaSen > 0) {
            const contra: CommissionTransaction = {
              id: id(),
              orderId: comm.orderId,
              dealerOrgId: comm.dealerOrgId,
              agentUserId: comm.agentUserId,
              amountSen: -reversal.currentReversalDeltaSen,
              status: 'reversed',
              eligibleAt: comm.eligibleAt,
              reversedAt: now(),
              contraReason: `Pelarasan kontra pemulangan wang kumulatif (PAY-03): ${request.reason}`,
              contraOfId: comm.id,
              policyVersion: comm.policyVersion,
              createdAt: now(),
            };
            this.store.save('commission_ledger', contra);
            this.store.audit(request.actorId, 'commission.contra_adjustment', contra.id, 1);
          }
        } else if (['pending', 'eligible', 'approved'].includes(comm.status) && newRefundAmountSen === order.paidAmountSen) {
          this.store.save('commission_ledger', {
            ...comm,
            status: 'reversed',
            reversedAt: now(),
            contraReason: `Pembatalan penuh pesanan sebelum komisen dibayar: ${request.reason}`,
          });
          this.store.audit(request.actorId, 'commission.reversed', comm.id, 1);
        }
      }

      // Reversal poin loyalty jika bayaran dipulangkan sepenuhnya
      if (this.loyalty && newRefundAmountSen === order.paidAmountSen) {
        this.loyalty.reversePointsForOrder(order.customerId, order.id, `Pemulangan penuh wang pesanan: ${request.reason}`);
      }

      this.store.audit(request.actorId, 'payment.refund', order.id, updatedOrder.revision);

      return {
        isReplay: false,
        refundRecord,
        order: updatedOrder,
        lineRefunds,
        cumulativeReversalSen: request.amountSen,
      };
    });
  }
}
