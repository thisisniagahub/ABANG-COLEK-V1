/**
 * AbangColek Sovereign GrowthOS — Refund Executor
 *
 * Performs a real refund through the canonical `PaymentReconciler`:
 *   - order must exist and be readable by the executor
 *   - refund may never exceed the refundable balance
 *   - largest-remainder line allocation and cumulative commission contra are
 *     produced by the platform domain, not re-implemented here
 *   - the payment record id is derived from the proposal id, so a duplicated
 *     execution can never create a second refund posting
 */

import { PaymentReconciler } from '../../platform/paymentReconciliation';
import { Loyalty } from '../../platform/loyalty';
import { DomainError } from '../../platform/store';
import type { OrderRecord } from '../../../shared/platform-contracts';
import type { Executor, ExecutorContext, ExecutorResult } from './types';

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const asInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;

export class RefundExecutor implements Executor {
  readonly actionType = 'refund.execute';

  async execute(payload: Record<string, unknown>, context: ExecutorContext): Promise<ExecutorResult> {
    if (!context.store) {
      return {
        ok: false,
        code: 'EXECUTOR_UNAVAILABLE',
        message: 'Stor platform tidak disambungkan; tiada refund boleh dilaksanakan.',
      };
    }

    const orderId = asString(payload.orderId);
    const amountSen = asInteger(payload.amountSen);
    const proposalId = asString(payload.proposalId);
    if (!orderId || !amountSen || !proposalId) {
      return {
        ok: false,
        code: 'INVALID_REFUND_PAYLOAD',
        message: 'Payload refund memerlukan orderId, amountSen dan proposalId yang sah.',
      };
    }

    const order = context.store.get<OrderRecord>('orders', orderId);
    if (!order) {
      return { ok: false, code: 'ORDER_NOT_FOUND', message: `Pesanan ${orderId} tidak ditemui.` };
    }

    const refundId = `refund-${proposalId}`;
    const reconciler = new PaymentReconciler(context.store, new Loyalty(context.store));
    try {
      const result = reconciler.processRefund({
        refundId,
        orderId,
        amountSen,
        reason: asString(payload.reason) ?? `Refund diluluskan melalui cadangan ${proposalId}`,
        actorId: context.actorId,
        reference: asString(payload.reference) ?? refundId,
      });
      return {
        ok: true,
        data: {
          refundId,
          orderId: order.id,
          amountSen,
          replay: result.isReplay,
          orderRevision: result.order.revision,
          orderPaymentState: result.order.paymentState,
          cumulativeRefundSen: result.order.refundAmountSen,
          lineRefunds: result.lineRefunds,
          commissionReversalSen: result.cumulativeReversalSen,
        },
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return { ok: false, code: error.code, message: error.message };
      }
      return {
        ok: false,
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'Ralat tidak diketahui semasa refund.',
      };
    }
  }
}
