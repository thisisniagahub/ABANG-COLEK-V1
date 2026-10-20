import type { ToolExecutionState } from '../tool-rendering/ToolStatusView';
import type { AguiEvent } from './aguiEvents';

export type AguiRunStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'unknown_outcome';

export interface AguiRunState {
  status: AguiRunStatus;
  runId?: string;
  threadId?: string;
  providerId?: string;
  model?: string;
  text: string;
  a2ui?: unknown;
  hitl?: unknown;
  genUi?: { componentName: string; props: Record<string, unknown> };
  error?: string;
}

export const initialAguiRunState: AguiRunState = { status: 'idle', text: '' };

const MAX_ACCUMULATED_TEXT = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Folds one verified AG-UI event into the run state shown by the workspace.
 * Provider and model identity only ever come from a server event.
 */
export function reduceAguiEvent(state: AguiRunState, event: AguiEvent): AguiRunState {
  switch (event.type) {
    case 'start':
      return {
        ...state,
        status: 'running',
        ...(event.providerId ? { providerId: event.providerId } : {}),
        ...(event.model ? { model: event.model } : {}),
      };
    case 'text_delta':
      return {
        ...state,
        status: state.status === 'idle' ? 'running' : state.status,
        text: `${state.text}${event.content}`.slice(0, MAX_ACCUMULATED_TEXT),
      };
    case 'a2ui':
      return { ...state, a2ui: event.payload };
    case 'gen_ui':
      return {
        ...state,
        genUi: { componentName: event.componentName, props: event.props },
      };
    case 'hitl_prompt':
      return { ...state, hitl: event.payload };
    case 'done': {
      const payload = isRecord(event.payload) ? event.payload : {};
      const a2ui = payload.a2ui ?? state.a2ui;
      const hitl = payload.hitlAction ?? payload.hitl ?? state.hitl;
      const text = event.reply ?? state.text;
      const runId = typeof payload.runId === 'string' ? payload.runId : state.runId;
      const threadId = typeof payload.threadId === 'string' ? payload.threadId : state.threadId;
      return {
        ...state,
        status: 'completed',
        text,
        ...(a2ui === undefined ? {} : { a2ui }),
        ...(hitl === undefined ? {} : { hitl }),
        ...(runId ? { runId } : {}),
        ...(threadId ? { threadId } : {}),
        ...(event.providerUsed ? { providerId: event.providerUsed } : {}),
        ...(event.modelUsed ? { model: event.modelUsed } : {}),
      };
    }
    case 'error':
      return { ...state, status: 'failed', error: event.message };
    default:
      return state;
  }
}

/**
 * GUI-03 projection: the run itself is the tool execution the user can see.
 */
export function runToolStatus(state: AguiRunState): {
  executionId?: string;
  toolName: string;
  state: ToolExecutionState;
} {
  const executionState: ToolExecutionState =
    state.status === 'idle'
      ? 'queued'
      : state.status === 'running'
        ? 'running'
        : state.status === 'completed'
          ? 'succeeded'
          : state.status === 'failed'
            ? 'failed'
            : 'unknown_outcome';

  return {
    ...(state.runId ? { executionId: state.runId } : {}),
    toolName: 'copilot_run',
    state: executionState,
  };
}
