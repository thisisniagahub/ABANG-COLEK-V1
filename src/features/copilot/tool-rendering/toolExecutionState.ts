import type { ToolExecutionState } from './ToolStatusView';

/**
 * The tool dispatch shape returned by the real registry
 * (server/agents/tools/registry.ts → ToolRegistry.dispatchTool).
 */
export type ToolDispatchOutcome =
  | { ok: true; result: unknown }
  | { ok: false; code: string; message: string };

/**
 * GUI-03: maps a verified tool dispatch outcome onto the visible execution
 * state. A rejected or refused dispatch is never rendered as a success.
 */
export function toolStateFromDispatch(
  outcome: ToolDispatchOutcome | undefined | null,
): ToolExecutionState {
  if (!outcome) return 'unknown';
  if (outcome.ok === true) return 'succeeded';
  return 'failed';
}

export interface ToolStatusProjection {
  executionId?: string;
  toolName: string;
  state: ToolExecutionState;
}

/**
 * Builds the render props for the tool status view from a real dispatch result.
 */
export function toolStatusFromDispatch(
  toolName: string,
  outcome: ToolDispatchOutcome | undefined | null,
  executionId?: string,
): ToolStatusProjection {
  return {
    ...(executionId ? { executionId } : {}),
    toolName,
    state: toolStateFromDispatch(outcome),
  };
}
