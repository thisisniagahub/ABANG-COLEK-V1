/**
 * AbangColek Sovereign GrowthOS — Durable Proposal / Approval / Receipt Store
 *
 * Two physical backends are provided behind one interface:
 *   - MemoryApprovalStore  (persistence: 'in_memory')
 *   - FileApprovalStore    (persistence: 'file')  — atomic JSON file, tmp + rename
 *
 * The backend kind is always reported to the caller so evidence never claims
 * durable production state for a store that is not durable.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  ApprovalConflictError,
  type Approval,
  type ExecutionReceipt,
  type PersistenceKind,
  type Proposal,
  type ProposalStatus,
  type ApprovalStatus,
} from './types';

export interface ProposalFilter {
  status?: ProposalStatus;
  proposedBy?: string;
  kind?: string;
}

export interface ApprovalFilter {
  status?: ApprovalStatus;
  proposalId?: string;
  approverId?: string;
}

export interface ApprovalStore {
  readonly persistence: PersistenceKind;
  saveProposal(proposal: Proposal): Proposal;
  getProposal(id: string): Proposal | null;
  listProposals(filter?: ProposalFilter): Proposal[];
  /** Optimistic concurrency: writes only when the stored version equals `expectedVersion`. */
  compareAndSwapProposal(id: string, expectedVersion: number, next: Proposal): Proposal;
  saveApproval(approval: Approval): Approval;
  getApproval(id: string): Approval | null;
  listApprovals(filter?: ApprovalFilter): Approval[];
  saveReceipt(receipt: ExecutionReceipt): ExecutionReceipt;
  getReceipt(id: string): ExecutionReceipt | null;
  findReceiptByProposal(proposalId: string): ExecutionReceipt | null;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class MemoryApprovalStore implements ApprovalStore {
  readonly persistence: PersistenceKind = 'in_memory';
  private readonly proposals = new Map<string, Proposal>();
  private readonly approvals = new Map<string, Approval>();
  private readonly receipts = new Map<string, ExecutionReceipt>();

  saveProposal(proposal: Proposal): Proposal {
    const stored = clone(proposal);
    this.proposals.set(stored.id, stored);
    return clone(stored);
  }

  getProposal(id: string): Proposal | null {
    const found = this.proposals.get(id);
    return found ? clone(found) : null;
  }

  listProposals(filter: ProposalFilter = {}): Proposal[] {
    return [...this.proposals.values()]
      .filter((proposal) => {
        if (filter.status && proposal.status !== filter.status) return false;
        if (filter.proposedBy && proposal.proposedBy !== filter.proposedBy) return false;
        if (filter.kind && proposal.kind !== filter.kind) return false;
        return true;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id))
      .map((proposal) => clone(proposal));
  }

  compareAndSwapProposal(id: string, expectedVersion: number, next: Proposal): Proposal {
    const current = this.proposals.get(id);
    if (!current) throw new ApprovalConflictError('Cadangan tidak ditemui semasa compare-and-swap.');
    if (current.version !== expectedVersion) {
      throw new ApprovalConflictError(
        `Versi cadangan berubah (${current.version} != ${expectedVersion}). Muat semula sebelum meneruskan.`,
      );
    }
    const stored = clone({ ...next, version: current.version + 1 });
    this.proposals.set(id, stored);
    return clone(stored);
  }

  saveApproval(approval: Approval): Approval {
    const stored = clone(approval);
    this.approvals.set(stored.id, stored);
    return clone(stored);
  }

  getApproval(id: string): Approval | null {
    const found = this.approvals.get(id);
    return found ? clone(found) : null;
  }

  listApprovals(filter: ApprovalFilter = {}): Approval[] {
    return [...this.approvals.values()]
      .filter((approval) => {
        if (filter.status && approval.status !== filter.status) return false;
        if (filter.proposalId && approval.proposalId !== filter.proposalId) return false;
        if (filter.approverId && approval.approverId !== filter.approverId) return false;
        return true;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id))
      .map((approval) => clone(approval));
  }

  saveReceipt(receipt: ExecutionReceipt): ExecutionReceipt {
    const stored = clone(receipt);
    this.receipts.set(stored.id, stored);
    return clone(stored);
  }

  getReceipt(id: string): ExecutionReceipt | null {
    const found = this.receipts.get(id);
    return found ? clone(found) : null;
  }

  findReceiptByProposal(proposalId: string): ExecutionReceipt | null {
    for (const receipt of this.receipts.values()) {
      if (receipt.proposalId === proposalId) return clone(receipt);
    }
    return null;
  }
}

interface FileState {
  proposals: Proposal[];
  approvals: Approval[];
  receipts: ExecutionReceipt[];
}

export class FileApprovalStore implements ApprovalStore {
  readonly persistence: PersistenceKind = 'file';
  private state: FileState = { proposals: [], approvals: [], receipts: [] };
  private loaded = false;

  constructor(private readonly filePath: string) {}

  private load(): FileState {
    if (this.loaded) return this.state;
    this.loaded = true;
    if (!existsSync(this.filePath)) return this.state;
    try {
      const raw = readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<FileState>;
      this.state = {
        proposals: Array.isArray(parsed.proposals) ? parsed.proposals : [],
        approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
        receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
      };
    } catch {
      this.state = { proposals: [], approvals: [], receipts: [] };
    }
    return this.state;
  }

  /** Re-reads the file so a competing process cannot be silently overwritten. */
  private refresh(): FileState {
    this.loaded = false;
    return this.load();
  }

  private persist(): void {
    const directory = dirname(this.filePath);
    if (directory && directory !== '.') mkdirSync(directory, { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    writeFileSync(temporary, JSON.stringify(this.state, null, 2), 'utf8');
    renameSync(temporary, this.filePath);
  }

  saveProposal(proposal: Proposal): Proposal {
    const state = this.load();
    const stored = clone(proposal);
    const index = state.proposals.findIndex((entry) => entry.id === stored.id);
    if (index >= 0) state.proposals[index] = stored;
    else state.proposals.push(stored);
    this.persist();
    return clone(stored);
  }

  getProposal(id: string): Proposal | null {
    const found = this.load().proposals.find((proposal) => proposal.id === id);
    return found ? clone(found) : null;
  }

  listProposals(filter: ProposalFilter = {}): Proposal[] {
    return this.load()
      .proposals.filter((proposal) => {
        if (filter.status && proposal.status !== filter.status) return false;
        if (filter.proposedBy && proposal.proposedBy !== filter.proposedBy) return false;
        if (filter.kind && proposal.kind !== filter.kind) return false;
        return true;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id))
      .map((proposal) => clone(proposal));
  }

  compareAndSwapProposal(id: string, expectedVersion: number, next: Proposal): Proposal {
    const state = this.refresh();
    const current = state.proposals.find((proposal) => proposal.id === id);
    if (!current) throw new ApprovalConflictError('Cadangan tidak ditemui semasa compare-and-swap.');
    if (current.version !== expectedVersion) {
      throw new ApprovalConflictError(
        `Versi cadangan berubah (${current.version} != ${expectedVersion}). Muat semula sebelum meneruskan.`,
      );
    }
    const stored = clone({ ...next, version: current.version + 1 });
    const index = state.proposals.findIndex((proposal) => proposal.id === id);
    state.proposals[index] = stored;
    this.persist();
    return clone(stored);
  }

  saveApproval(approval: Approval): Approval {
    const state = this.load();
    const stored = clone(approval);
    const index = state.approvals.findIndex((entry) => entry.id === stored.id);
    if (index >= 0) state.approvals[index] = stored;
    else state.approvals.push(stored);
    this.persist();
    return clone(stored);
  }

  getApproval(id: string): Approval | null {
    const found = this.load().approvals.find((approval) => approval.id === id);
    return found ? clone(found) : null;
  }

  listApprovals(filter: ApprovalFilter = {}): Approval[] {
    return this.load()
      .approvals.filter((approval) => {
        if (filter.status && approval.status !== filter.status) return false;
        if (filter.proposalId && approval.proposalId !== filter.proposalId) return false;
        if (filter.approverId && approval.approverId !== filter.approverId) return false;
        return true;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id))
      .map((approval) => clone(approval));
  }

  saveReceipt(receipt: ExecutionReceipt): ExecutionReceipt {
    const state = this.load();
    const stored = clone(receipt);
    const index = state.receipts.findIndex((entry) => entry.id === stored.id);
    if (index >= 0) state.receipts[index] = stored;
    else state.receipts.push(stored);
    this.persist();
    return clone(stored);
  }

  getReceipt(id: string): ExecutionReceipt | null {
    const found = this.load().receipts.find((receipt) => receipt.id === id);
    return found ? clone(found) : null;
  }

  findReceiptByProposal(proposalId: string): ExecutionReceipt | null {
    const found = this.load().receipts.find((receipt) => receipt.proposalId === proposalId);
    return found ? clone(found) : null;
  }
}
