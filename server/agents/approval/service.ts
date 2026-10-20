/**
 * AbangColek Sovereign GrowthOS — Approval Service (Human-In-The-Loop authority)
 *
 * The service is the only place where a proposal becomes "approved". An approval
 * binds the approver identity, the exact proposal scope, the proposal version
 * and a nonce. Execution later re-checks every one of those bindings.
 */

import { randomUUID } from 'node:crypto';
import { ApprovalStateError, type Approval, type ApprovalRole, type Proposal } from './types';
import type { ApprovalStore } from './store';

export interface CreateProposalInput {
  kind: string;
  scope: string;
  payload: Record<string, unknown>;
  amountSen: number;
  proposedBy: string;
  proposerRole: ApprovalRole;
  sourceRefs?: string[];
  ttlMs?: number;
}

export interface ApproveInput {
  proposalId: string;
  approverId: string;
  approverRole: ApprovalRole;
  ttlMs?: number;
}

const DEFAULT_PROPOSAL_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_APPROVAL_TTL_MS = 12 * 60 * 60 * 1000;

export class ApprovalService {
  constructor(
    readonly store: ApprovalStore,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  private now(): string {
    return this.clock();
  }

  private isoAfter(ms: number): string {
    return new Date(Date.parse(this.now()) + ms).toISOString();
  }

  createProposal(input: CreateProposalInput): Proposal {
    if (!input.kind || !input.scope) {
      throw new ApprovalStateError('INVALID_PROPOSAL', 'Cadangan memerlukan jenis tindakan dan skop.');
    }
    if (!Number.isSafeInteger(input.amountSen) || input.amountSen < 0) {
      throw new ApprovalStateError('INVALID_PROPOSAL', 'Amaun cadangan mesti integer sen yang sah.');
    }
    if (!input.proposedBy) {
      throw new ApprovalStateError('INVALID_PROPOSAL', 'Cadangan memerlukan pencadut yang Known.');
    }
    const createdAt = this.now();
    const proposal: Proposal = {
      id: randomUUID(),
      kind: input.kind,
      scope: input.scope,
      payload: { ...input.payload },
      amountSen: input.amountSen,
      currency: 'MYR',
      proposedBy: input.proposedBy,
      proposerRole: input.proposerRole,
      status: 'pending_approval',
      version: 1,
      nonce: randomUUID(),
      createdAt,
      expiresAt: this.isoAfter(input.ttlMs ?? DEFAULT_PROPOSAL_TTL_MS),
      sourceRefs: [...(input.sourceRefs ?? [])],
    };
    return this.store.saveProposal(proposal);
  }

  getProposal(proposalId: string): Proposal | null {
    return this.store.getProposal(proposalId);
  }

  listProposals(filter: Parameters<ApprovalStore['listProposals']>[0] = {}): Proposal[] {
    return this.store.listProposals(filter);
  }

  /**
   * Founder approval. The approval is bound to the proposal scope, the exact
   * proposal version and the proposal nonce so a later edit of the proposal
   * invalidates the approval (compare-and-swap at execution time).
   */
  approve(input: ApproveInput): Approval {
    const proposal = this.store.getProposal(input.proposalId);
    if (!proposal) {
      throw new ApprovalStateError('PROPOSAL_NOT_FOUND', 'Cadangan tidak ditemui.');
    }
    if (proposal.status === 'executed') {
      throw new ApprovalStateError('PROPOSAL_ALREADY_EXECUTED', 'Cadangan telah dilaksanakan.');
    }
    if (proposal.status !== 'pending_approval') {
      throw new ApprovalStateError('INVALID_PROPOSAL_STATE', `Cadangan berstatus ${proposal.status}.`);
    }
    if (proposal.expiresAt <= this.now()) {
      throw new ApprovalStateError('PROPOSAL_EXPIRED', 'Cadangan telah luput tempoh.');
    }
    if (!input.approverId) {
      throw new ApprovalStateError('INVALID_APPROVAL', 'Kelulusan memerlukan pengesah yang Known.');
    }
    const createdAt = this.now();
    const requestedExpiry = this.isoAfter(input.ttlMs ?? DEFAULT_APPROVAL_TTL_MS);
    const expiresAt = requestedExpiry < proposal.expiresAt ? requestedExpiry : proposal.expiresAt;
    // The approval binds the exact revision of the proposal that was approved.
    const approvedProposal = this.store.compareAndSwapProposal(
      proposal.id,
      proposal.version,
      {
        ...proposal,
        status: 'approved',
        approvalId: undefined,
        decidedBy: input.approverId,
        decidedAt: createdAt,
      },
    );
    const approval: Approval = {
      id: randomUUID(),
      proposalId: proposal.id,
      scope: proposal.scope,
      proposalVersion: approvedProposal.version,
      proposalNonce: proposal.nonce,
      approverId: input.approverId,
      approverRole: input.approverRole,
      status: 'approved',
      version: 1,
      nonce: randomUUID(),
      createdAt,
      expiresAt,
      decidedAt: createdAt,
    };
    const saved = this.store.saveApproval(approval);
    this.store.saveProposal({ ...approvedProposal, approvalId: saved.id });
    return saved;
  }

  revokeApproval(approvalId: string, revokedBy: string, reason: string): Approval {
    const approval = this.store.getApproval(approvalId);
    if (!approval) {
      throw new ApprovalStateError('APPROVAL_NOT_FOUND', 'Kelulusan tidak ditemui.');
    }
    if (approval.status === 'revoked') return approval;
    if (approval.status === 'expired') {
      throw new ApprovalStateError('APPROVAL_EXPIRED', 'Kelulusan telah luput tempoh.');
    }
    const updated: Approval = {
      ...approval,
      status: 'revoked',
      version: approval.version + 1,
      revokedAt: this.now(),
      revokedBy,
      revocationReason: reason,
    };
    const saved = this.store.saveApproval(updated);
    const proposal = this.store.getProposal(approval.proposalId);
    if (proposal && proposal.status === 'approved') {
      try {
        this.store.compareAndSwapProposal(proposal.id, proposal.version, {
          ...proposal,
          status: 'cancelled',
          decidedBy: revokedBy,
          decidedAt: this.now(),
          rejectionReason: reason,
        });
      } catch {
        /* the proposal moved on; the revocation of the approval still stands */
      }
    }
    return saved;
  }

  rejectProposal(proposalId: string, decidedBy: string, reason: string): Proposal {
    const proposal = this.store.getProposal(proposalId);
    if (!proposal) {
      throw new ApprovalStateError('PROPOSAL_NOT_FOUND', 'Cadangan tidak ditemui.');
    }
    if (proposal.status === 'executed') {
      throw new ApprovalStateError('PROPOSAL_ALREADY_EXECUTED', 'Cadangan telah dilaksanakan.');
    }
    return this.store.compareAndSwapProposal(proposal.id, proposal.version, {
      ...proposal,
      status: 'rejected',
      decidedBy,
      decidedAt: this.now(),
      rejectionReason: reason,
    });
  }

  /**
   * Lazily expires a proposal / approval whose deadline passed. Called by the
   * execution path so an expired approval can never authorise a mutation.
   */
  expireIfNeeded(approvalId: string): Approval | null {
    const approval = this.store.getApproval(approvalId);
    if (!approval) return null;
    if (approval.status === 'approved' && approval.expiresAt <= this.now()) {
      const updated: Approval = { ...approval, status: 'expired', version: approval.version + 1 };
      this.store.saveApproval(updated);
      return updated;
    }
    return approval;
  }
}
