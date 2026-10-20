/**
 * ABANGCOLEK Sovereign GrowthOS — Frontend Approval Contract (GUI-02)
 *
 * The frontend accepts two real shapes produced by this repository:
 *  1. `approval proposal` — { proposalId, entity, amountSen, revision, reason, expiresAt, status, payload, receipt }
 *  2. `HitlActionRequest`  — server/platform/adkAgent.ts + shared/copilot-contracts.ts
 *                             { id, actionType, entity, amountSen, revision, reason, expiry, status, payload, executionReceipt }
 *
 * Invariants (product policy):
 *  - Approval is NOT execution. A proposal is only a completed execution when a
 *    canonical receipt exists. Without a receipt the outcome stays UNKNOWN.
 *  - Unknown statuses and malformed payloads are rejected, never coerced.
 */

export type ApprovalProposalStatus =
  | 'proposed'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'stale'
  | 'failed'
  | 'succeeded';

export type ApprovalEntityType =
  | 'order'
  | 'refund'
  | 'inventory_lot'
  | 'dealer_commission'
  | 'expense'
  | 'user'
  | 'batch';

export interface ApprovalEntityRef {
  type: ApprovalEntityType;
  id: string;
}

export interface ApprovalReceipt {
  receiptId: string;
  status: 'succeeded' | 'failed';
  executedAt?: string;
  auditLogId?: string;
}

export interface ApprovalProposal {
  proposalId: string;
  entity: ApprovalEntityRef;
  amountSen?: number;
  revision: string;
  reason: string;
  expiresAt: string;
  status: ApprovalProposalStatus;
  payload: Record<string, unknown>;
  receipt?: ApprovalReceipt;
}

export type ApprovalParseResult =
  | { ok: true; value: ApprovalProposal }
  | { ok: false };

export const APPROVAL_PROPOSAL_STATUSES: readonly ApprovalProposalStatus[] = [
  'proposed',
  'pending_approval',
  'approved',
  'rejected',
  'expired',
  'stale',
  'failed',
  'succeeded',
];

const APPROVAL_ENTITY_TYPES: readonly ApprovalEntityType[] = [
  'order',
  'refund',
  'inventory_lot',
  'dealer_commission',
  'expense',
  'user',
  'batch',
];

const MAX_ID_LENGTH = 120;
const MAX_REASON_LENGTH = 500;
const MAX_PAYLOAD_KEYS = 40;

type Optional<T> = { present: false } | { present: true; value: T };

const ABSENT: Optional<never> = { present: false };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, maximum: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text || text.length > maximum) return undefined;
  return text;
}

function isApprovalStatus(value: unknown): value is ApprovalProposalStatus {
  return typeof value === 'string'
    && (APPROVAL_PROPOSAL_STATUSES as readonly string[]).includes(value);
}

function isApprovalEntityType(value: unknown): value is ApprovalEntityType {
  return typeof value === 'string'
    && (APPROVAL_ENTITY_TYPES as readonly string[]).includes(value);
}

function parseEntity(value: unknown): ApprovalEntityRef | null {
  if (!isPlainObject(value)) return null;
  if (!isApprovalEntityType(value.type)) return null;
  const id = boundedText(value.id, MAX_ID_LENGTH);
  if (!id) return null;
  return { type: value.type, id };
}

function parsePayload(value: unknown): Record<string, unknown> | null {
  if (!isPlainObject(value)) return null;
  if (Object.keys(value).length > MAX_PAYLOAD_KEYS) return null;
  return value;
}

function parseAmountSen(value: unknown): Optional<number> | null {
  if (value === undefined || value === null) return ABSENT;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return null;
  return { present: true, value };
}

function parseReceipt(value: unknown): Optional<ApprovalReceipt> | null {
  if (value === undefined || value === null) return ABSENT;
  if (!isPlainObject(value)) return null;
  const receiptId = boundedText(value.receiptId, MAX_ID_LENGTH);
  if (!receiptId) return null;
  if (value.status !== 'succeeded' && value.status !== 'failed') return null;
  const executedAt = boundedText(value.executedAt, 64);
  const auditLogId = boundedText(value.auditLogId, MAX_ID_LENGTH);
  return {
    present: true,
    value: {
      receiptId,
      status: value.status,
      ...(executedAt ? { executedAt } : {}),
      ...(auditLogId ? { auditLogId } : {}),
    },
  };
}

/**
 * Normalizes both real approval shapes into one canonical proposal.
 * `requireReceipt` enforces the strict contract: a succeeded approval without a
 * canonical receipt is invalid, because execution cannot be claimed.
 */
function normalize(
  value: unknown,
  requireReceipt: boolean,
): { proposal: ApprovalProposal } | null {
  if (!isPlainObject(value)) return null;

  const isProposalShape = typeof value.proposalId === 'string';
  const proposalId = isProposalShape
    ? boundedText(value.proposalId, MAX_ID_LENGTH)
    : boundedText(value.id, MAX_ID_LENGTH);
  if (!proposalId) return null;

  const entity = parseEntity(value.entity);
  if (!entity) return null;

  const amount = parseAmountSen(value.amountSen);
  if (amount === null) return null;

  const revision = typeof value.revision === 'number'
    ? String(value.revision)
    : boundedText(value.revision, MAX_ID_LENGTH);
  if (!revision) return null;

  const reason = boundedText(value.reason, MAX_REASON_LENGTH)
    ?? boundedText(value.description, MAX_REASON_LENGTH);
  if (!reason) return null;

  const rawExpiry = isProposalShape ? value.expiresAt : value.expiry;
  const expiresAt = boundedText(rawExpiry, 64);
  if (!expiresAt || !Number.isFinite(Date.parse(expiresAt))) return null;

  if (!isApprovalStatus(value.status)) return null;

  const payload = parsePayload(value.payload);
  if (!payload) return null;

  const rawReceipt = isProposalShape ? value.receipt : value.executionReceipt;
  const receipt = parseReceipt(rawReceipt);
  if (receipt === null) return null;

  if (value.status === 'succeeded'
    && requireReceipt
    && (!receipt?.present || receipt.value.status !== 'succeeded')) {
    return null;
  }

  const proposal: ApprovalProposal = {
    proposalId,
    entity,
    ...(amount.present ? { amountSen: amount.value } : {}),
    revision,
    reason,
    expiresAt,
    status: value.status,
    payload,
    ...(receipt?.present ? { receipt: receipt.value } : {}),
  };

  return { proposal };
}

/**
 * Strict contract validation used before an approval is trusted by the UI.
 * Returns exactly `{ ok: false }` for every rejection so callers cannot
 * accidentally read partial data out of a failed parse.
 */
export function parseApprovalProposal(value: unknown): ApprovalParseResult {
  const normalized = normalize(value, true);
  if (!normalized) return { ok: false };
  return { ok: true, value: normalized.proposal };
}

/**
 * Lenient normalisation used for rendering. A succeeded approval without a
 * canonical receipt is still displayed, but as an unknown outcome.
 */
export function normalizeApprovalProposal(value: unknown): ApprovalProposal | null {
  return normalize(value, false)?.proposal ?? null;
}

export type ApprovalOutcome =
  | 'awaiting_decision'
  | 'approved_awaiting_receipt'
  | 'rejected'
  | 'expired'
  | 'stale'
  | 'failed'
  | 'executed'
  | 'unknown';

export function approvalOutcome(proposal: ApprovalProposal): ApprovalOutcome {
  switch (proposal.status) {
    case 'proposed':
    case 'pending_approval':
      return 'awaiting_decision';
    case 'approved':
      return 'approved_awaiting_receipt';
    case 'rejected':
      return 'rejected';
    case 'expired':
      return 'expired';
    case 'stale':
      return 'stale';
    case 'failed':
      return 'failed';
    case 'succeeded':
      return proposal.receipt?.status === 'succeeded' ? 'executed' : 'unknown';
    default:
      return 'unknown';
  }
}

export const APPROVAL_OUTCOME_COPY: Record<ApprovalOutcome, string> = {
  awaiting_decision: 'MENUNGGU PENGESAHAN — belum ada tindakan diluluskan',
  approved_awaiting_receipt: 'DILULUSKAN — menunggu resit pelaksanaan',
  rejected: 'DITOLAK — tiada pelaksanaan dijalankan',
  expired: 'LUPUT — tiada pelaksanaan dijalankan',
  stale: 'PERLUAN SEMAKAN — keputusan tidak lagi boleh dipercayai',
  failed: 'PELAKSANAAN GAGAL — tiada resit kanonikal',
  executed: 'PELAKSANAAN DISAHKAN — resit kanonikal diterima',
  unknown: 'OUTCOME TIDAK DIKETAHUI — resit belum diterima',
};
