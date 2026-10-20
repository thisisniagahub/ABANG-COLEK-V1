import React from 'react';
import {
  APPROVAL_OUTCOME_COPY,
  approvalOutcome,
  normalizeApprovalProposal,
  type ApprovalProposal,
} from './approvalContract';

export interface ApprovalReviewCardProps {
  proposal?: unknown;
}

function formatRinggit(sen: number): string {
  return `RM ${(sen / 100).toFixed(2)}`;
}

function ProposalFields({ proposal }: { proposal: ApprovalProposal }) {
  const payload = JSON.stringify(proposal.payload, null, 2);

  return (
    <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      <div className="min-w-0">
        <dt className="text-xs text-[var(--ui-muted)]">ID cadangan</dt>
        <dd className="break-all font-medium">{proposal.proposalId}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-[var(--ui-muted)]">Entiti</dt>
        <dd className="break-all font-medium">
          {proposal.entity.type} · {proposal.entity.id}
        </dd>
      </div>
      {proposal.amountSen !== undefined && (
        <div className="min-w-0">
          <dt className="text-xs text-[var(--ui-muted)]">Jumlah</dt>
          <dd className="font-medium">{formatRinggit(proposal.amountSen)}</dd>
        </div>
      )}
      <div className="min-w-0">
        <dt className="text-xs text-[var(--ui-muted)]">Revisi</dt>
        <dd className="break-all font-medium">{proposal.revision}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-[var(--ui-muted)]">Tamat tempoh</dt>
        <dd className="break-all font-medium">{proposal.expiresAt}</dd>
      </div>
      {proposal.receipt && (
        <div className="min-w-0">
          <dt className="text-xs text-[var(--ui-muted)]">Resit</dt>
          <dd className="break-all font-medium">
            {proposal.receipt.receiptId} · {proposal.receipt.status}
          </dd>
        </div>
      )}
      <div className="min-w-0 sm:col-span-2">
        <dt className="text-xs text-[var(--ui-muted)]">Sebab</dt>
        <dd className="break-words">{proposal.reason}</dd>
      </div>
      <div className="min-w-0 sm:col-span-2">
        <dt className="text-xs text-[var(--ui-muted)]">Payload</dt>
        <dd className="min-w-0">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">{payload}</pre>
        </dd>
      </div>
    </dl>
  );
}

/**
 * GUI-02 approval review. The card reports the server status verbatim and never
 * presents an approval as a completed execution: only a canonical receipt can
 * close the loop, otherwise the outcome stays unknown.
 */
export function ApprovalReviewCard({ proposal }: ApprovalReviewCardProps) {
  const parsed = normalizeApprovalProposal(proposal);

  if (!parsed) {
    return (
      <section
        aria-label="Approval review"
        role="status"
        className="w-full min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)]"
      >
        <h3 className="text-sm font-semibold">Semakan kelulusan</h3>
        <p className="mt-2 text-sm">{APPROVAL_OUTCOME_COPY.unknown}</p>
        <p className="mt-1 text-sm text-[var(--ui-muted)]">
          Butiran kelulusan tidak dapat disahkan oleh kontrak frontend.
        </p>
      </section>
    );
  }

  const outcome = approvalOutcome(parsed);

  return (
    <section
      aria-label="Approval review"
      className="w-full min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Semakan kelulusan</h3>
          <p className="mt-1 text-sm" role="status">{APPROVAL_OUTCOME_COPY[outcome]}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-xs font-medium">
          {parsed.status}
        </span>
      </header>
      <p className="mt-2 text-xs text-[var(--ui-muted)]">
        Kelulusan bukan pelaksanaan. Status pelaksanaan hanya disahkan oleh resit kanonikal pelayan.
      </p>
      <ProposalFields proposal={parsed} />
    </section>
  );
}

export default ApprovalReviewCard;
