/**
 * ABANGCOLEK — ADV-15 / ADV-17 / ADV-21 Remediation Engines
 *
 * The ledger gaps for these three capabilities are "detects / explains / scores
 * but does not remediate". This module contains the *actual* remedy for each:
 *
 *   ADV-15  audit_loyalty        → materialise the missing expiry entry; restore
 *                                  the ledger invariant with a founder-authorised
 *                                  adjustment when it is still unbalanced.
 *   ADV-17  reconcile_dayclose   → realign the day-close record with the cash
 *                                  recomputed from the canonical payment ledger.
 *   ADV-21  triage_case          → open the durable remediation path for the case
 *                                  (refund proposal, evidence task, assignment).
 *
 * Rules honoured here:
 *   - the actor's authority comes from the live session/membership only;
 *   - a remedy that needs an authority the actor does not hold is REFUSED with
 *     a typed reason code — it is never faked;
 *   - every remedy is idempotent: replaying it does not double-apply;
 *   - money is integer Sen, points are integers.
 */

import type { PlatformStore } from '../../../platform/store';
import type { Principal } from '../../../platform/auth';
import { Auth } from '../../../platform/auth';
import { Commerce } from '../../../platform/commerce';
import { Work } from '../../../platform/work';
import { Loyalty } from '../../../platform/loyalty';
import type { CaseRecord, DayCloseRecord, OrderRecord } from '../../../../shared/platform-contracts';
import type { LoyaltyLedgerEntry } from '../../../../shared/growth-contracts';
import type { RemediationCode, RemediationOutcome } from '../../../../shared/adv-contracts';
import type { ScopedActor } from '../scope';

export interface LoyaltyInvariant {
  earnedPoints: number;
  redeemedPoints: number;
  reversedPoints: number;
  expiredPoints: number;
  adjustmentPoints: number;
  netPoints: number;
  expectedNetPoints: number;
  balanced: boolean;
  /** Points needed to restore the invariant (expected - net). */
  deltaPoints: number;
}

/**
 * The canonical ledger invariant:
 *   net = earned - redeemed + reversed - expired + adjustment
 *
 * The audit previously compared `net` against a formula that ignored expired
 * and adjustment entries, so a correctly recorded expiry looked like a
 * corruption. The invariant below is the honest one.
 */
export function computeLoyaltyInvariant(entries: LoyaltyLedgerEntry[]): LoyaltyInvariant {
  const earnedPoints = entries
    .filter((entry) => entry.eventType === 'earned')
    .reduce((sum, entry) => sum + entry.pointsDelta, 0);
  const redeemedPoints = entries
    .filter((entry) => entry.eventType === 'redeemed')
    .reduce((sum, entry) => sum + Math.abs(entry.pointsDelta), 0);
  const reversedPoints = entries
    .filter((entry) => entry.eventType === 'reversed')
    .reduce((sum, entry) => sum + entry.pointsDelta, 0);
  const expiredPoints = entries
    .filter((entry) => entry.eventType === 'expired')
    .reduce((sum, entry) => sum + Math.abs(entry.pointsDelta), 0);
  const adjustmentPoints = entries
    .filter((entry) => entry.eventType === 'adjustment')
    .reduce((sum, entry) => sum + entry.pointsDelta, 0);
  const netPoints = entries.reduce((sum, entry) => sum + entry.pointsDelta, 0);
  const expectedNetPoints =
    earnedPoints - redeemedPoints + reversedPoints - expiredPoints + adjustmentPoints;
  return {
    earnedPoints,
    redeemedPoints,
    reversedPoints,
    expiredPoints,
    adjustmentPoints,
    netPoints,
    expectedNetPoints,
    balanced: netPoints === expectedNetPoints,
    deltaPoints: expectedNetPoints - netPoints,
  };
}

export interface LoyaltyRemediationResult {
  outcomes: RemediationOutcome[];
  mutated: boolean;
  balancePoints: number;
  invariant: LoyaltyInvariant;
  /** Unrecorded expired points that could not be materialised. */
  remainingUnrecordedExpiredPoints: number;
}

/**
 * ADV-15 remedy. Materialises the missing expiry entry (any authorised
 * operator) and, when the ledger is still unbalanced, applies a founder-only
 * adjustment of exactly the missing points.
 */
export function remediateLoyaltyLedger(options: {
  store: PlatformStore;
  actor: ScopedActor;
  userId: string;
  at: string;
  reason: string;
}): LoyaltyRemediationResult {
  const { store, actor, userId, at, reason } = options;
  const loyalty = new Loyalty(store);
  const outcomes: RemediationOutcome[] = [];
  let mutated = false;

  const unrecordedExpiredPoints = loyalty.getExpiredPoints(userId, at);
  if (unrecordedExpiredPoints > 0) {
    const entry = loyalty.expirePoints(userId, at);
    if (entry) {
      mutated = true;
      outcomes.push({
        code: 'LOYALTY_EXPIRY_RECORDED',
        status: 'applied',
        subject: `loyalty:${userId}`,
        detail: `${Math.abs(entry.pointsDelta)} mata luput direkodkan dalam lejar.`,
        points: Math.abs(entry.pointsDelta),
        amountSen: entry.monetaryEquivalentSen,
      });
    }
  }

  const entries = loyalty.getEntries(userId);
  const invariant = computeLoyaltyInvariant(entries);
  if (!invariant.balanced && invariant.deltaPoints !== 0) {
    if (!actor.isFounder) {
      outcomes.push({
        code: 'LOYALTY_REMEDIATION_REQUIRES_FOUNDER',
        status: 'refused',
        subject: `loyalty:${userId}`,
        detail: `Imbangan lejar ${invariant.deltaPoints} mata memerlukan pelarasan founder; pemeran tidak memegang kebenaran tersebut.`,
        points: invariant.deltaPoints,
      });
    } else {
      try {
        const adjustment = loyalty.adjustPoints(
          actor.principal as Principal,
          userId,
          invariant.deltaPoints,
          reason,
        );
        mutated = true;
        outcomes.push({
          code: 'LOYALTY_BALANCE_ADJUSTED',
          status: 'applied',
          subject: `loyalty:${userId}`,
          detail: `Pelarasan ${adjustment.pointsDelta} mata oleh founder untuk memulihkan imbangan lejar.`,
          points: adjustment.pointsDelta,
          amountSen: adjustment.monetaryEquivalentSen,
        });
      } catch (error) {
        outcomes.push({
          code: 'LOYALTY_ADJUSTMENT_REJECTED',
          status: 'refused',
          subject: `loyalty:${userId}`,
          detail:
            error instanceof Error
              ? `Pelarasan ditolak oleh domain kesetiaan: ${error.message}`
              : 'Pelarasan ditolak oleh domain kesetiaan.',
          points: invariant.deltaPoints,
        });
      }
    }
  }

  if (!outcomes.length) {
    outcomes.push({
      code: 'LOYALTY_NOTHING_TO_REMEDIATE',
      status: 'skipped',
      subject: `loyalty:${userId}`,
      detail: 'Tiada anomali kesetiaan yang boleh dipulihkan daripada keadaan semasa.',
    });
  }

  return {
    outcomes,
    mutated,
    balancePoints: loyalty.getBalance(userId, at),
    invariant: computeLoyaltyInvariant(loyalty.getEntries(userId)),
    remainingUnrecordedExpiredPoints: loyalty.getExpiredPoints(userId, at),
  };
}

export interface DayCloseRemediationResult {
  outcome: RemediationOutcome;
  mutated: boolean;
  record: DayCloseRecord;
  /** Cash variance that survives the realignment (needs a physical recount). */
  remainingDiscrepancySen: number;
}

/**
 * ADV-17 remedy. Realigns the day-close record with the cash recomputed from
 * the canonical payment ledger. An already approved close may only be amended
 * by a founder; a physical cash difference is reported, never invented away.
 */
export function remediateDayClose(options: {
  store: PlatformStore;
  actor: ScopedActor;
  record: DayCloseRecord;
  recomputedExpectedCashSen: number;
  cashPaymentRefs: string[];
  at: string;
  reason: string;
}): DayCloseRemediationResult {
  const { store, actor, record, recomputedExpectedCashSen, cashPaymentRefs, at, reason } = options;
  const aligned =
    record.expectedCashSen === recomputedExpectedCashSen &&
    record.discrepancySen === record.countCashSen - recomputedExpectedCashSen &&
    record.paymentRefs.length === cashPaymentRefs.length &&
    record.paymentRefs.every((ref) => cashPaymentRefs.includes(ref));

  if (aligned) {
    return {
      outcome: {
        code: 'DAY_CLOSE_ALREADY_ALIGNED',
        status: 'skipped',
        subject: `dayclose:${record.id}`,
        detail: 'Rekod day close sudah selaras dengan lejar bayaran; tiada pindaan diperlukan.',
        amountSen: record.expectedCashSen,
      },
      mutated: false,
      record,
      remainingDiscrepancySen: record.discrepancySen,
    };
  }

  if (record.status === 'approved' && !actor.isFounder) {
    return {
      outcome: {
        code: 'DAY_CLOSE_REMEDIATION_REQUIRES_FOUNDER',
        status: 'refused',
        subject: `dayclose:${record.id}`,
        detail:
          'Day close yang telah diluluskan hanya boleh dipinda oleh founder; pemeran tidak memegang kebenaran tersebut.',
        amountSen: recomputedExpectedCashSen,
      },
      mutated: false,
      record,
      remainingDiscrepancySen: record.discrepancySen,
    };
  }

  const remainingDiscrepancySen = record.countCashSen - recomputedExpectedCashSen;
  const updated: DayCloseRecord = {
    ...record,
    expectedCashSen: recomputedExpectedCashSen,
    discrepancySen: remainingDiscrepancySen,
    paymentRefs: [...cashPaymentRefs],
    revision: record.revision + 1,
    status: record.status === 'approved' ? 'review' : record.status,
    reason: `${reason} (diselaraskan pada ${at})`,
  };
  store.save('dayclose', updated);
  store.audit(actor.principal.user.id, 'dayclose.remediated', updated.id, updated.revision);

  return {
    outcome: {
      code: 'DAY_CLOSE_REALIGNED',
      status: 'applied',
      subject: `dayclose:${record.id}`,
      detail:
        remainingDiscrepancySen === 0
          ? 'Rekod day close diselaraskan dengan lejar bayaran; tiada beza tunai tinggal.'
          : `Rekod day close diselaraskan; beza tunai ${remainingDiscrepancySen} sen masih memerlukan kiraan semula fizikal.`,
      amountSen: recomputedExpectedCashSen,
    },
    mutated: true,
    record: updated,
    remainingDiscrepancySen,
  };
}

export interface CaseRemediationResult {
  outcomes: RemediationOutcome[];
  mutated: boolean;
}

/** Durable proposal factory (the approval service) injected by the caller. */
export type ProposalFactory = (input: {
  kind: string;
  scope: string;
  payload: Record<string, unknown>;
  amountSen: number;
  proposedBy: string;
  proposerRole: 'customer' | 'staff' | 'founder' | 'developer';
  sourceRefs: string[];
}) => { id: string };

export interface CaseRemediationOptions {
  store: PlatformStore;
  actor: ScopedActor;
  record: CaseRecord;
  order: OrderRecord | null;
  evidenceCount: number;
  at: string;
  reason: string;
  createProposal: ProposalFactory;
  /**
   * Proposals already known to the approval store. Used so a second remediation
   * never creates a duplicate proposal for the same scope.
   */
  existingProposals?: Array<{ id: string; scope: string; status: string }>;
  /** Optional staff member to own the case (must hold an active membership). */
  assignToStaffId?: string | null;
}

/**
 * ADV-21 remedy. Opens the durable remediation path for a triaged case:
 * a refund proposal for a requested refund, an evidence task when the case has
 * no evidence, and — for a founder — the assignment of the case to an owner.
 */
export function remediateCase(options: CaseRemediationOptions): CaseRemediationResult {
  const {
    store,
    actor,
    record,
    order,
    evidenceCount,
    at,
    reason,
    createProposal,
    existingProposals,
    assignToStaffId,
  } = options;
  const outcomes: RemediationOutcome[] = [];
  let mutated = false;

  // 1. Refund path — only when the canonical order state says a refund was
  //    requested. The proposal is real and needs founder approval to execute.
  if (order && order.paymentState === 'refund_requested') {
    const refundableSen = order.paidAmountSen - order.refundAmountSen;
    if (refundableSen <= 0) {
      outcomes.push({
        code: 'CASE_REFUND_NO_REFUNDABLE_BALANCE',
        status: 'skipped',
        subject: `case:${record.id}`,
        detail: 'Tiada baki yang boleh dipulangkan pada pesanan ini; tiada cadangan refund dicipta.',
        amountSen: 0,
      });
    } else {
      const scope = `order:${order.id}#refund`;
      const alreadyProposed = findOpenProposal(existingProposals, scope);
      if (alreadyProposed) {
        outcomes.push({
          code: 'CASE_REFUND_PROPOSAL_EXISTS',
          status: 'skipped',
          subject: `case:${record.id}`,
          detail: `Cadangan refund untuk ${scope} sudah wujud; tiada cadangan kedua dicipta.`,
          amountSen: refundableSen,
          proposalId: alreadyProposed,
        });
      } else {
        const proposal = createProposal({
          kind: 'refund.execute',
          scope,
          payload: {
            orderId: order.id,
            amountSen: refundableSen,
            reason,
            caseId: record.id,
          },
          amountSen: refundableSen,
          proposedBy: actor.principal.user.id,
          proposerRole: actor.isFounder ? 'founder' : actor.isStaff ? 'staff' : 'developer',
          sourceRefs: [`cases:${record.id}@${record.revision}`, `orders:${order.id}@${order.revision}`],
        });
        mutated = true;
        outcomes.push({
          code: 'CASE_REFUND_PROPOSAL_CREATED',
          status: 'applied',
          subject: `case:${record.id}`,
          detail: `Cadangan refund ${refundableSen} sen dicipta untuk kelulusan founder.`,
          amountSen: refundableSen,
          proposalId: proposal.id,
        });
      }
    }
  }

  // 2. Evidence path — a case without evidence cannot be decided; a durable
  //    task request is created for the operator.
  if (evidenceCount === 0) {
    const scope = `entity:${record.id}#evidence`;
    const alreadyProposed = findOpenProposal(existingProposals, scope);
    if (alreadyProposed) {
      outcomes.push({
        code: 'CASE_EVIDENCE_TASK_PROPOSED',
        status: 'skipped',
        subject: `case:${record.id}`,
        detail: `Permintaan bukti untuk ${scope} sudah wujud.`,
        proposalId: alreadyProposed,
      });
    } else {
      const proposal = createProposal({
        kind: 'task.create',
        scope,
        payload: {
          entityId: record.id,
          title: `Kumpul bukti untuk kes ${record.subject}`,
          description: reason,
        },
        amountSen: 0,
        proposedBy: actor.principal.user.id,
        proposerRole: actor.isFounder ? 'founder' : actor.isStaff ? 'staff' : 'developer',
        sourceRefs: [`cases:${record.id}@${record.revision}`],
      });
      mutated = true;
      outcomes.push({
        code: 'CASE_EVIDENCE_TASK_PROPOSED',
        status: 'applied',
        subject: `case:${record.id}`,
        detail: 'Cadangan tugasan pengumpulan bukti dicipta untuk kes ini.',
        proposalId: proposal.id,
      });
    }
  }

  // 3. Ownership path — only a founder may assign a case (canonical rule).
  if (record.status === 'open') {
    if (record.assignedStaffId) {
      outcomes.push({
        code: 'CASE_ALREADY_OWNED',
        status: 'skipped',
        subject: `case:${record.id}`,
        detail: `Kes ini sudah dipegang oleh ${record.assignedStaffId}.`,
      });
    } else if (!actor.isFounder) {
      outcomes.push({
        code: 'CASE_REMEDIATION_REQUIRES_FOUNDER',
        status: 'refused',
        subject: `case:${record.id}`,
        detail:
          'Penugasan kes hanya boleh dibuat oleh founder; pemeran tidak memegang kebenaran tersebut.',
      });
      } else {
        const assigneeId = resolveAssignee(store, actor, assignToStaffId, order);
        if (!assigneeId) {
          outcomes.push({
            code: 'CASE_REMEDIATION_REQUIRES_FOUNDER',
            status: 'refused',
            subject: `case:${record.id}`,
            detail:
              'Tiada penerima sah untuk penugasan kes ini (perlu staf aktif pada outlet pesanan); tiada penugasan dibuat.',
          });
        } else {
        const work = new Work(store, new Auth(store), new Commerce(store, new Auth(store)));
        try {
          work.assignCase(actor.principal, record.id, {
            expectedRevision: record.revision,
            assignedStaffId: assigneeId,
          });
          mutated = true;
          outcomes.push({
            code: 'CASE_ASSIGNED',
            status: 'applied',
            subject: `case:${record.id}`,
            detail: `Kes ditugaskan kepada ${assigneeId} dan bergerak ke status investigating.`,
          });
        } catch (error) {
          outcomes.push({
            code: 'CASE_REMEDIATION_REQUIRES_FOUNDER',
            status: 'refused',
            subject: `case:${record.id}`,
            detail:
              error instanceof Error
                ? `Penugasan ditolak: ${error.message}`
                : 'Penugasan ditolak oleh domain kes.',
          });
        }
      }
    }
  }

  return { outcomes, mutated };
}

/**
 * Resolves the staff member that may own a case. A candidate without an active
 * staff membership on the order's outlet is refused instead of being assigned
 * blindly — the platform's own `assignCase` rule is the source of truth here.
 */
function resolveAssignee(
  store: PlatformStore,
  actor: ScopedActor,
  candidate: string | null | undefined,
  order: OrderRecord | null,
): string | null {
  const auth = new Auth(store);
  const eligible = (userId: string): boolean =>
    auth.memberships(userId).some(
      (membership) =>
        membership.role === 'staff' &&
        membership.status === 'active' &&
        (!order || membership.outletIds.includes(order.outletId)),
    );
  const target = candidate ?? actor.principal.user.id;
  return eligible(target) ? target : null;
}

/**
 * Looks for an open proposal with the same scope. The approval store is the
 * canonical ledger of pending work, so a duplicate proposal is never created.
 */
function findOpenProposal(
  proposals: Array<{ id: string; scope: string; status: string }> | undefined,
  scope: string,
): string | null {
  if (!proposals) return null;
  const found = proposals.find(
    (proposal) =>
      proposal.scope === scope &&
      (proposal.status === 'pending_approval' || proposal.status === 'approved'),
  );
  return found ? found.id : null;
}
