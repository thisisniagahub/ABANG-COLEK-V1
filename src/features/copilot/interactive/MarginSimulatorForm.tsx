import React, { useEffect, useRef, useState } from 'react';
import {
  ApprovalReviewCard,
} from './ApprovalReviewCard';
import {
  parseApprovalProposal,
} from './approvalContract';

export { ApprovalReviewCard };
export { parseApprovalProposal };
export {
  approvalOutcome,
  normalizeApprovalProposal,
  APPROVAL_OUTCOME_COPY,
  APPROVAL_PROPOSAL_STATUSES,
  type ApprovalEntityRef,
  type ApprovalEntityType,
  type ApprovalOutcome,
  type ApprovalParseResult,
  type ApprovalProposal,
  type ApprovalProposalStatus,
  type ApprovalReceipt,
} from './approvalContract';

export interface MarginSimulationDraft {
  inputSen: number;
  discountPct: number;
}

export interface SimulationInputFields {
  inputSen: string | number;
  discountPct: string | number;
}

export type SimulationInputResult =
  | { ok: true; inputSen: number; discountPct: number }
  | { ok: false; field: keyof MarginSimulationDraft };

export function isRejectedSimulationInput(
  result: SimulationInputResult,
): result is { ok: false; field: keyof MarginSimulationDraft } {
  return result.ok === false;
}

export const SIMULATION_INPUT_MESSAGES: Record<keyof MarginSimulationDraft, string> = {
  inputSen: 'Masukkan jumlah dalam sen sebagai nombor bulat bukan negatif (tiada pecahan sen).',
  discountPct: 'Masukkan diskaun antara 0 dan 100%, maksimum dua tempat perpuluhan.',
};

function toText(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return typeof value === 'number' ? String(value) : value.trim();
}

/**
 * GUI-02 input gate. Sen amounts must stay whole (no fractional cents, no
 * negatives) and the discount percentage must stay inside 0..100 with at most
 * two decimal places. The evaluator remains the only authority for the result.
 */
export function validateSimulationInput(input: SimulationInputFields): SimulationInputResult {
  const senText = toText(input?.inputSen);
  if (!/^\d+$/.test(senText)) {
    return { ok: false, field: 'inputSen' };
  }
  const inputSen = Number(senText);
  if (!Number.isSafeInteger(inputSen)) {
    return { ok: false, field: 'inputSen' };
  }

  const discountText = toText(input?.discountPct);
  if (!/^\d+(?:\.\d{1,2})?$/.test(discountText)) {
    return { ok: false, field: 'discountPct' };
  }
  const discountPct = Number(discountText);
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
    return { ok: false, field: 'discountPct' };
  }

  return { ok: true, inputSen, discountPct };
}

export type MarginSimulationInputResult =
  | { ok: true; value: MarginSimulationDraft }
  | { ok: false; field: keyof MarginSimulationDraft; message: string };

export function parseMarginSimulationInput(
  inputSenText: string,
  discountPctText: string,
): MarginSimulationInputResult {
  const parsed = validateSimulationInput({ inputSen: inputSenText, discountPct: discountPctText });
  if (isRejectedSimulationInput(parsed)) {
    return { ok: false, field: parsed.field, message: SIMULATION_INPUT_MESSAGES[parsed.field] };
  }
  return { ok: true, value: { inputSen: parsed.inputSen, discountPct: parsed.discountPct } };
}

/**
 * Shares one in-flight callback between duplicate submits. A later submit runs
 * again once the previous callback has settled.
 */
export function createDuplicateClickGuard<TArgs extends unknown[], TResult>(
  operation: (...args: TArgs) => Promise<TResult> | TResult,
): (...args: TArgs) => Promise<TResult> {
  let inFlight: Promise<TResult> | null = null;

  const release = () => {
    inFlight = null;
  };

  return (...args: TArgs): Promise<TResult> => {
    if (inFlight) return inFlight;
    const tracked: Promise<TResult> = Promise.resolve().then(() => operation(...args));
    inFlight = tracked;
    tracked.then(release, release);
    return tracked;
  };
}

export class SubmissionGate {
  private locked = false;

  run<T>(
    operation: () => Promise<T> | T,
  ): Promise<T> | null {
    if (this.locked) return null;

    this.locked = true;
    return Promise.resolve()
      .then(operation)
      .finally(() => { this.locked = false; });
  }
}

export interface MarginSimulationServerReceipt {
  receiptId: string;
  status: 'PASSED' | 'INSUFFICIENT_CASH_MARGIN' | 'INSUFFICIENT_PERCENT_MARGIN';
  contributionSen: number;
  contributionMarginPct: number;
  requiredContributionSen: number;
  requiredMarginPct: number;
  evaluatedAt: string;
  revision: string | number;
}

export interface MarginSimulatorFormProps {
  onSimulate: (input: MarginSimulationDraft) => void | Promise<void>;
  onRevalidateServer?: (input: MarginSimulationDraft) => Promise<MarginSimulationServerReceipt>;
  receipt?: MarginSimulationServerReceipt | null;
  onCancel?: () => void;
  disabled?: boolean;
}

/**
 * GUI-02: Exercises the full decision -> canonical server revalidation -> canonical receipt loop.
 */
export async function executeDecisionRevalidationLoop(options: {
  draft: SimulationInputFields;
  revalidateMargin: (draft: MarginSimulationDraft) => Promise<MarginSimulationServerReceipt>;
  submitApprovalDecision?: (
    receipt: MarginSimulationServerReceipt,
  ) => Promise<unknown>;
}): Promise<
  | {
      ok: true;
      draft: MarginSimulationDraft;
      simulationReceipt: MarginSimulationServerReceipt;
      approvalProposal?: unknown;
    }
  | { ok: false; field: keyof MarginSimulationDraft; message: string }
> {
  const parsed = validateSimulationInput(options.draft);
  if (isRejectedSimulationInput(parsed)) {
    return {
      ok: false,
      field: parsed.field,
      message: SIMULATION_INPUT_MESSAGES[parsed.field],
    };
  }
  const validatedDraft: MarginSimulationDraft = {
    inputSen: parsed.inputSen,
    discountPct: parsed.discountPct,
  };
  const simulationReceipt = await options.revalidateMargin(validatedDraft);
  const approvalProposal = options.submitApprovalDecision
    ? await options.submitApprovalDecision(simulationReceipt)
    : undefined;
  return {
    ok: true,
    draft: validatedDraft,
    simulationReceipt,
    ...(approvalProposal !== undefined ? { approvalProposal } : {}),
  };
}

export function MarginSimulatorForm({
  onSimulate,
  onRevalidateServer,
  receipt: externalReceipt = null,
  onCancel,
  disabled = false,
}: MarginSimulatorFormProps) {
  const [inputSen, setInputSen] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<keyof MarginSimulationDraft | null>(null);
  const [notice, setNotice] = useState('');
  const [serverReceipt, setServerReceipt] = useState<MarginSimulationServerReceipt | null>(externalReceipt);

  const latestCallback = useRef(onSimulate);
  const latestRevalidate = useRef(onRevalidateServer);
  useEffect(() => {
    latestCallback.current = onSimulate;
    latestRevalidate.current = onRevalidateServer;
  }, [onSimulate, onRevalidateServer]);

  useEffect(() => {
    if (externalReceipt !== undefined) {
      setServerReceipt(externalReceipt);
    }
  }, [externalReceipt]);

  const guard = useRef(createDuplicateClickGuard(async (draft: MarginSimulationDraft) => {
    await latestCallback.current(draft);
    if (latestRevalidate.current) {
      const verifiedReceipt = await latestRevalidate.current(draft);
      setServerReceipt(verifiedReceipt);
    }
  }));

  const cancel = () => {
    if (submitting) return;
    setInputSen('');
    setDiscountPct('');
    setError('');
    setErrorField(null);
    setNotice('');
    setServerReceipt(null);
    onCancel?.();
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || submitting) return;

    const parsed = validateSimulationInput({ inputSen, discountPct });
    if (isRejectedSimulationInput(parsed)) {
      setError(SIMULATION_INPUT_MESSAGES[parsed.field]);
      setErrorField(parsed.field);
      setNotice('');
      return;
    }

    setSubmitting(true);
    setError('');
    setErrorField(null);
    setNotice('');
    try {
      await guard.current({ inputSen: parsed.inputSen, discountPct: parsed.discountPct });
      setNotice(
        latestRevalidate.current
          ? 'Keputusan simulasi telah disahkan semula oleh pelayan kanonik.'
          : 'Input dihantar kepada callback. Keputusan simulasi kanonik belum diterima.',
      );
    } catch {
      setError('Callback simulasi gagal. Keputusan tidak dapat disahkan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      aria-label="Margin simulation draft"
      onSubmit={(event) => void submit(event)}
      className="space-y-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)]"
    >
      <header>
        <h3 className="text-base font-semibold">Draf simulasi margin</h3>
        <p className="mt-1 text-sm text-[var(--ui-muted)]">
          Input sahaja; pengiraan dan keputusan mesti datang daripada evaluator kanonik.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="margin-input-sen" className="mb-1 block text-sm font-medium">
            Nilai input (sen)
          </label>
          <input
            id="margin-input-sen"
            name="inputSen"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={inputSen}
            onChange={(event) => {
              setInputSen(event.currentTarget.value);
              setError('');
              setErrorField(null);
              setNotice('');
            }}
            aria-invalid={errorField === 'inputSen'}
            disabled={disabled || submitting}
            className="w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="margin-discount-pct" className="mb-1 block text-sm font-medium">
            Diskaun (%)
          </label>
          <input
            id="margin-discount-pct"
            name="discountPct"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={discountPct}
            onChange={(event) => {
              setDiscountPct(event.currentTarget.value);
              setError('');
              setErrorField(null);
              setNotice('');
            }}
            aria-invalid={errorField === 'discountPct'}
            disabled={disabled || submitting}
            className="w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] disabled:opacity-60"
          />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-[var(--ui-danger-text)]">{error}</p>}
      {notice && <p role="status" className="text-sm text-[var(--ui-muted)]">{notice}</p>}
      {serverReceipt && (
        <section
          aria-label="Canonical margin receipt"
          className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-soft)] p-3 text-xs text-[var(--ui-text)]"
        >
          <p className="font-semibold">
            Resit pelayan kanonik: <span className="font-mono">{serverReceipt.receiptId}</span>
          </p>
          <p className="mt-1 text-[var(--ui-muted)]">
            Status: {serverReceipt.status} · Margin: RM {(serverReceipt.contributionSen / 100).toFixed(2)} ({serverReceipt.contributionMarginPct}%) · Revisi: {String(serverReceipt.revision)}
          </p>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={disabled || submitting}
          className="rounded-lg bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? 'Menghantar input…' : 'Hantar input simulasi'}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={disabled || submitting}
          className="rounded-lg border border-[var(--ui-border)] px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default MarginSimulatorForm;
