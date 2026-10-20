/**
 * ABANGCOLEK — ADV-26 Reconciliation Operations
 *
 * Reconciliation is three DISTINCT operations, not one blended tool:
 *
 *   1. inspect_action_receipt        — read-only: receipt vs proposal vs the
 *                                      live platform state (order / payment).
 *   2. refresh_external_action_status — re-observe the live external status of
 *                                      the action and persist the observation.
 *   3. apply_verified_action_outcome — apply a *verified* outcome exactly once
 *                                      to the authoritative platform state.
 *
 * Nothing is fabricated: when the external state cannot be observed the
 * operation fails closed with a machine-readable reason code, and an outcome
 * is only applied when the live state proves it.
 */

import { createHash } from 'node:crypto';
import type { PlatformStore } from '../../../platform/store';
import { readOrder } from '../records';
import type { ExecutionReceipt } from '../../approval/types';
import type { ScopedActor } from '../scope';
import type {
  ActionOutcomeRecord,
  ActionStatusRecord,
  ExternalActionStatus,
  ReconcileReasonCode,
} from '../../../../shared/adv-contracts';

export interface ReceiptInspection {
  drifts: string[];
  status: 'consistent' | 'drift_detected';
  orderId: string | null;
  refundableSen: number | null;
  paymentId: string | null;
}

export interface ExternalStatusReading {
  ok: boolean;
  status: ExternalActionStatus;
  reason: ReconcileReasonCode | null;
  message: string;
  evidence: Record<string, unknown>;
}

/**
 * Operation 1 — inspect the receipt against the live platform state.
 * Pure read: nothing is written.
 */
export function inspectActionReceipt(
  store: PlatformStore,
  receipt: ExecutionReceipt,
): ReceiptInspection {
  const drifts: string[] = [];
  let orderId: string | null = null;
  let refundableSen: number | null = null;
  let paymentId: string | null = null;

  if (receipt.actionType === 'refund.execute') {
    orderId = String(receipt.result.orderId ?? '');
    const order = orderId ? readOrder(store, orderId) : null;
    if (!order) {
      drifts.push('PESANAN_TIDAK_DITEMUI');
    } else {
      refundableSen = order.paidAmountSen - order.refundAmountSen;
      if (order.refundAmountSen < receipt.amountSen) {
        drifts.push(
          `JUMLAH_PULANGAN_MENJADI_LEBIH_RENDAH: rekod=${order.refundAmountSen} sen < resit=${receipt.amountSen} sen`,
        );
      }
      if (refundableSen < 0) drifts.push('BAKI_PULANGAN_NEGATIF');
    }
    const payment = store
      .all<{ id: string; amountSen: number; state: string }>('payments')
      .find((candidate) => candidate.id === `refund-${receipt.proposalId}`);
    if (!payment) {
      drifts.push('REKOD_BAYARAN_PULANGAN_TIADA');
    } else {
      paymentId = payment.id;
      if (payment.amountSen !== receipt.amountSen) {
        drifts.push(
          `AMAUN_BAYARAN_BEZA: rekod=${payment.amountSen} sen vs resit=${receipt.amountSen} sen`,
        );
      }
    }
  }

  return {
    drifts,
    status: drifts.length === 0 ? 'consistent' : 'drift_detected',
    orderId,
    refundableSen,
    paymentId,
  };
}

/**
 * Reads the live external status of an executed action.
 *
 * Only `refund.execute` has a canonical external trace in this platform (the
 * refund posting in the payment ledger). Any other action type is reported as
 * unsupported rather than guessed.
 */
export function readExternalActionStatus(
  store: PlatformStore,
  receipt: ExecutionReceipt,
): ExternalStatusReading {
  if (receipt.actionType !== 'refund.execute') {
    return {
      ok: false,
      status: 'missing',
      reason: 'ACTION_TYPE_NOT_SUPPORTED',
      message: `Tiada status luaran kanonik untuk tindakan '${receipt.actionType}'.`,
      evidence: { actionType: receipt.actionType },
    };
  }

  const orderId = String(receipt.result.orderId ?? '');
  const order = orderId ? readOrder(store, orderId) : null;
  if (!order) {
    return {
      ok: false,
      status: 'missing',
      reason: 'ORDER_STATE_MISMATCH',
      message: `Pesanan ${orderId || '(tiada)'} tidak ditemui dalam storan platform.`,
      evidence: { orderId },
    };
  }

  const paymentId = `refund-${receipt.proposalId}`;
  const payment = store
    .all<{ id: string; orderId: string; amountSen: number; state: string }>('payments')
    .find((candidate) => candidate.id === paymentId);
  if (!payment) {
    return {
      ok: false,
      status: 'missing',
      reason: 'PAYMENT_RECORD_MISSING',
      message: `Tiada rekod bayaran pulangan ${paymentId} dalam lejar platform.`,
      evidence: { orderId, paymentId },
    };
  }
  if (payment.amountSen !== receipt.amountSen) {
    return {
      ok: false,
      status: 'drifted',
      reason: 'PAYMENT_AMOUNT_MISMATCH',
      message: `Amaun bayaran ${payment.amountSen} sen berbeza daripada resit ${receipt.amountSen} sen.`,
      evidence: { orderId, paymentId, paymentAmountSen: payment.amountSen },
    };
  }
  if (payment.state !== 'refunded') {
    return {
      ok: false,
      status: 'drifted',
      reason: 'PAYMENT_STATE_MISMATCH',
      message: `Rekod bayaran ${paymentId} berstatus ${payment.state}, bukan refunded.`,
      evidence: { orderId, paymentId, paymentState: payment.state },
    };
  }
  if (order.refundAmountSen < receipt.amountSen) {
    return {
      ok: false,
      status: 'drifted',
      reason: 'ORDER_STATE_MISMATCH',
      message: `Pesanan mencatat pulangan ${order.refundAmountSen} sen, resit ${receipt.amountSen} sen.`,
      evidence: {
        orderId,
        paymentId,
        orderRefundAmountSen: order.refundAmountSen,
        receiptAmountSen: receipt.amountSen,
      },
    };
  }

  return {
    ok: true,
    status: 'confirmed',
    reason: null,
    message: 'Status luaran disahkan daripada lejar bayaran platform.',
    evidence: {
      orderId,
      paymentId,
      paymentAmountSen: payment.amountSen,
      orderRefundAmountSen: order.refundAmountSen,
    },
  };
}

/**
 * Operation 2 — refresh and persist the observed external status.
 * The observation is durable so the next operator sees when it was taken.
 */
export function refreshExternalActionStatus(
  store: PlatformStore,
  actor: ScopedActor,
  receipt: ExecutionReceipt,
  at: string,
): {
  reading: ExternalStatusReading;
  record: ActionStatusRecord | null;
  previousStatus: ExternalActionStatus | null;
  changed: boolean;
} {
  const reading = readExternalActionStatus(store, receipt);
  const previous = store.get<ActionStatusRecord>('action_status', `action-status-${receipt.id}`);
  const previousStatus = previous ? previous.externalStatus : null;
  if (!reading.ok) {
    return { reading, record: null, previousStatus, changed: false };
  }
  const record: ActionStatusRecord = {
    id: `action-status-${receipt.id}`,
    receiptId: receipt.id,
    proposalId: receipt.proposalId,
    actionType: receipt.actionType,
    externalStatus: reading.status,
    observedAt: at,
    observedBy: actor.principal.user.id,
    evidence: reading.evidence,
  };
  store.save('action_status', record);
  store.audit(actor.principal.user.id, 'action.status.refreshed', receipt.id);
  return {
    reading,
    record,
    previousStatus,
    changed: previousStatus !== reading.status,
  };
}

export interface ApplyOutcomeResult {
  ok: boolean;
  replay: boolean;
  reason: ReconcileReasonCode | null;
  message: string;
  outcome: ActionOutcomeRecord | null;
  platformStateRepaired: boolean;
  orderId: string | null;
}

/**
 * Operation 3 — apply a verified action outcome to the authoritative state.
 *
 * The outcome is applied at most once: the durable outcome record is the
 * idempotency key, so a replayed receipt never applies the effect twice.
 */
export function applyVerifiedActionOutcome(
  store: PlatformStore,
  actor: ScopedActor,
  receipt: ExecutionReceipt,
  at: string,
): ApplyOutcomeResult {
  const outcomeId = `outcome-${receipt.id}`;
  const existing = store.get<ActionOutcomeRecord>('action_outcomes', outcomeId);
  if (existing) {
    return {
      ok: true,
      replay: true,
      reason: 'ACTION_ALREADY_APPLIED',
      message: 'Hasil tindakan ini telah pun diaplikasi; tiada kesan kedua.',
      outcome: existing,
      platformStateRepaired: existing.platformStateRepaired,
      orderId: existing.evidence.orderId ? String(existing.evidence.orderId) : null,
    };
  }
  if (receipt.status !== 'confirmed') {
    return {
      ok: false,
      replay: false,
      reason: 'RECEIPT_NOT_CONFIRMED',
      message: `Resit berstatus ${receipt.status}; hanya resit yang disahkan boleh diaplikasi.`,
      outcome: null,
      platformStateRepaired: false,
      orderId: null,
    };
  }

  const reading = readExternalActionStatus(store, receipt);
  if (!reading.ok) {
    return {
      ok: false,
      replay: false,
      reason: 'EXTERNAL_OUTCOME_UNVERIFIED',
      message: reading.message,
      outcome: null,
      platformStateRepaired: false,
      orderId: reading.evidence.orderId ? String(reading.evidence.orderId) : null,
    };
  }

  let platformStateRepaired = false;
  let orderId: string | null = reading.evidence.orderId ? String(reading.evidence.orderId) : null;

  // The platform order state is derived from the payment ledger. When the two
  // disagree, the ledger wins and the order is realigned with it.
  if (orderId) {
    const order = readOrder(store, orderId);
    if (order) {
      const refundedSen = store
        .all<{ orderId: string; amountSen: number; state: string }>('payments')
        .filter(
          (payment) => payment.orderId === order.id && payment.state === 'refunded',
        )
        .reduce((sum, payment) => sum + payment.amountSen, 0);
      if (refundedSen !== order.refundAmountSen) {
        const paymentState =
          refundedSen > 0
            ? refundedSen >= order.paidAmountSen
              ? ('refunded' as const)
              : ('part_refunded' as const)
            : order.paidAmountSen > 0
              ? ('verified' as const)
              : order.paymentState;
        store.save('orders', {
          ...order,
          refundAmountSen: refundedSen,
          paymentState,
          revision: order.revision + 1,
          updatedAt: at,
        });
        platformStateRepaired = true;
        store.audit(actor.principal.user.id, 'action.outcome.reapplied', order.id, order.revision + 1);
      }
    }
  }

  const outcome: ActionOutcomeRecord = {
    id: outcomeId,
    receiptId: receipt.id,
    proposalId: receipt.proposalId,
    actionType: receipt.actionType,
    amountSen: receipt.amountSen,
    externalStatus: reading.status,
    verifiedAt: at,
    verifiedBy: actor.principal.user.id,
    appliedAt: at,
    platformStateRepaired,
    evidence: { ...reading.evidence, receiptHash: createHash('sha256').update(JSON.stringify(receipt)).digest('hex') },
  };
  store.save('action_outcomes', outcome);
  store.audit(actor.principal.user.id, 'action.outcome.applied', receipt.id);

  return {
    ok: true,
    replay: false,
    reason: null,
    message: platformStateRepaired
      ? 'Hasil tindakan disahkan dan keadaan platform diselaraskan dengan lejar bayaran.'
      : 'Hasil tindakan disahkan dan direkodkan.',
    outcome,
    platformStateRepaired,
    orderId,
  };
}
