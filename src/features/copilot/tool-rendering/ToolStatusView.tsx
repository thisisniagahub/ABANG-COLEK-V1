import React from 'react';

export type ToolExecutionState =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'unknown'
  | 'unknown_outcome'
  | 'partial';

export interface ToolStatusViewProps {
  executionId?: unknown;
  toolName?: unknown;
  state?: unknown;
  errorMessage?: unknown;
}

const STATUS_COPY: Record<ToolExecutionState, string> = {
  queued: 'Waiting to start',
  running: 'In progress',
  succeeded: 'Completed',
  failed: 'Could not be completed',
  unknown: 'Status is unavailable',
  unknown_outcome: 'Outcome could not be confirmed',
  partial: 'Partial result received; completion cannot be confirmed',
};

const safeText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text ? text.slice(0, 160) : undefined;
};

function getState(state: unknown): string {
  if (
    typeof state === 'string' &&
    Object.prototype.hasOwnProperty.call(STATUS_COPY, state)
  ) {
    return STATUS_COPY[state as ToolExecutionState];
  }
  return STATUS_COPY.unknown;
}

export function ToolStatusView({
  executionId,
  toolName,
  state,
}: ToolStatusViewProps) {
  const safeExecutionId = safeText(executionId);
  const safeToolName = safeText(toolName);
  const status = getState(state);
  const hasDetails = Boolean(safeExecutionId && safeToolName);

  return (
    <section className="w-full min-w-0 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)]">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold">
            {safeToolName ?? 'Tool execution'}
          </h3>
          {safeExecutionId && (
            <p className="mt-1 break-all text-xs text-[var(--ui-muted)]">
              Execution ID: <span className="font-mono">{safeExecutionId}</span>
            </p>
          )}
          {!hasDetails && (
            <p className="mt-1 text-sm text-[var(--ui-muted)]">
              Execution details are unavailable
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-xs font-medium">
          {status}
        </span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}

export interface ToolLifecycleSnapshot {
  executionId?: string;
  toolName?: string;
  state: ToolExecutionState;
}

/**
 * GUI-03: Projects an AG-UI tool execution lifecycle event (`RUN_STARTED`,
 * `TOOL_CALL_START`, `TOOL_CALL_RESULT`, `RUN_ERROR`) onto a safe status snapshot
 * for `ToolStatusView`.
 */
export function projectToolLifecycleEvent(
  previous: ToolLifecycleSnapshot,
  event: Record<string, unknown>,
): ToolLifecycleSnapshot {
  const type = typeof event.type === 'string' ? event.type : '';
  const executionId =
    safeText(event.toolCallId) ??
    safeText(event.executionId) ??
    safeText(event.runId) ??
    previous.executionId;
  const toolName =
    safeText(event.toolCallName) ??
    safeText(event.toolName) ??
    previous.toolName;

  if (type === 'RUN_STARTED') {
    return { executionId, toolName, state: 'queued' };
  }
  if (type === 'TOOL_CALL_START') {
    return { executionId, toolName, state: 'running' };
  }
  if (type === 'TOOL_CALL_RESULT') {
    const resultObj =
      event.result !== null && typeof event.result === 'object'
        ? (event.result as Record<string, unknown>)
        : undefined;
    const rawStatus = typeof resultObj?.status === 'string' ? resultObj.status : undefined;
    const state: ToolExecutionState =
      rawStatus === 'unknown_outcome'
        ? 'unknown_outcome'
        : rawStatus === 'partial'
          ? 'partial'
          : rawStatus === 'failed' || resultObj?.ok === false
            ? 'failed'
            : 'succeeded';
    return { executionId, toolName, state };
  }
  if (type === 'RUN_ERROR') {
    return { executionId, toolName, state: 'failed' };
  }
  return previous;
}

/**
 * GUI-03: Consumes a live async stream of AG-UI tool-lifecycle events and emits
 * each `ToolLifecycleSnapshot` transition so `ToolStatusView` is bound to a live source.
 */
export async function streamToolLifecycleToStatus(
  events: AsyncIterable<Record<string, unknown>>,
  onTransition?: (snapshot: ToolLifecycleSnapshot) => void,
): Promise<ToolLifecycleSnapshot[]> {
  let current: ToolLifecycleSnapshot = { state: 'unknown' };
  const history: ToolLifecycleSnapshot[] = [];
  for await (const event of events) {
    current = projectToolLifecycleEvent(current, event);
    history.push(current);
    onTransition?.(current);
  }
  return history;
}

export default ToolStatusView;
