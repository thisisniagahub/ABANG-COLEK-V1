/**
 * AbangColek Sovereign GrowthOS — Approval & Proposal Contracts (Agents Layer)
 *
 * These records are the durable, human-in-the-loop artefacts that authorise a
 * mutating agent action. Nothing in this file is synthetic: every identifier is
 * a real UUID minted by `node:crypto`, every timestamp is an ISO instant and
 * every amount is integer Sen.
 */

export type ApprovalRole = 'customer' | 'staff' | 'founder' | 'developer';

export type ProposalStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'executing'
  | 'executed'
  | 'unknown_outcome'
  | 'cancelled';

export type ApprovalStatus = 'pending' | 'approved' | 'revoked' | 'expired';

export type PersistenceKind = 'in_memory' | 'file';

export interface Proposal {
  /** Real UUID (crypto.randomUUID) — never a timestamp string. */
  id: string;
  /** Executable action family, e.g. `refund.execute`. */
  kind: string;
  /** Authorisation scope, e.g. `order:<orderId>#refund`. */
  scope: string;
  payload: Record<string, unknown>;
  /** Integer Sen. Zero for non-monetary proposals. */
  amountSen: number;
  currency: 'MYR';
  proposedBy: string;
  proposerRole: ApprovalRole;
  status: ProposalStatus;
  /** Optimistic-concurrency token. Incremented on every write. */
  version: number;
  /** Random nonce bound into the approval so a stale approval cannot be replayed. */
  nonce: string;
  createdAt: string;
  expiresAt: string;
  /** Provenance: canonical record ids the proposal was derived from. */
  sourceRefs: string[];
  approvalId?: string;
  receiptId?: string;
  executedBy?: string;
  executedAt?: string;
  decidedBy?: string;
  decidedAt?: string;
  rejectionReason?: string;
}

export interface Approval {
  /** Real UUID. */
  id: string;
  proposalId: string;
  /** Scope copied from the proposal at approval time; must still match at execution. */
  scope: string;
  /** The exact proposal version the approver saw. Mismatch at execution => CAS conflict. */
  proposalVersion: number;
  /** Nonce copied from the proposal; binds the approval to one proposal revision. */
  proposalNonce: string;
  approverId: string;
  approverRole: ApprovalRole;
  status: ApprovalStatus;
  version: number;
  nonce: string;
  createdAt: string;
  expiresAt: string;
  decidedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}

export interface ExecutionReceipt {
  /** Real UUID minted at commit time. */
  id: string;
  proposalId: string;
  approvalId: string;
  actionType: string;
  scope: string;
  status: 'confirmed' | 'failed';
  amountSen: number;
  executedBy: string;
  executedAt: string;
  result: Record<string, unknown>;
  /** Honest statement about where the receipt physically lives. */
  persistence: PersistenceKind;
}

export class ApprovalConflictError extends Error {
  readonly code = 'CAS_CONFLICT';
  constructor(message = 'Rekod telah berubah. Muat semula sebelum meneruskan.') {
    super(message);
    this.name = 'ApprovalConflictError';
  }
}

export class ApprovalStateError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'ApprovalStateError';
  }
}
