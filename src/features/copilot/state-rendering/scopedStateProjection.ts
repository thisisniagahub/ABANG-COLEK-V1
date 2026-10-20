import {
  DISALLOWED_CLIENT_STATE_TOKENS,
  type SafeClientStateValue,
  type ScopedStateProjection,
  type StateScope,
  type WorkflowProgressState,
} from '../../../../shared/copilot-contracts';
import { hasAuthorityField, tokenizeStateKey } from './statePolicy';

export interface ClientStateInput {
  selectedOrderId?: string;
  filters?: Record<string, unknown>;
  draft?: Record<string, unknown>;
  workflowProgress?: WorkflowProgressState;
}

const DISALLOWED = new Set<string>(DISALLOWED_CLIENT_STATE_TOKENS);
const MAX_FIELDS = 12;
const MAX_TEXT_LENGTH = 160;

/**
 * Authority fields are never projected into client state. The token list comes
 * from the shared contract so the frontend cannot drift from the server policy.
 */
export function isDisallowedStateKey(key: string): boolean {
  if (hasAuthorityField(key)) return true;
  return tokenizeStateKey(key).some((token) => DISALLOWED.has(token));
}

function safeValue(value: unknown): SafeClientStateValue | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text || text.length > MAX_TEXT_LENGTH) return undefined;
    return text;
  }
  return undefined;
}

function projectFields(value: Record<string, unknown> | undefined): Record<string, SafeClientStateValue> {
  if (!value) return {};
  const projected: Record<string, SafeClientStateValue> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (Object.keys(projected).length >= MAX_FIELDS) break;
    if (isDisallowedStateKey(key)) continue;
    const safe = safeValue(raw);
    if (safe === undefined) continue;
    projected[key] = safe;
  }
  return projected;
}

function validProgress(progress: WorkflowProgressState | undefined): WorkflowProgressState | undefined {
  if (!progress) return undefined;
  const { currentStep, totalSteps } = progress;
  if (!Number.isInteger(currentStep) || !Number.isInteger(totalSteps)) return undefined;
  if (currentStep < 0 || totalSteps <= 0 || currentStep > totalSteps) return undefined;
  const label = typeof progress.label === 'string' && progress.label.trim()
    ? progress.label.trim().slice(0, MAX_TEXT_LENGTH)
    : undefined;
  return {
    ...(label ? { label } : {}),
    currentStep,
    totalSteps,
  };
}

/**
 * GUI-04: builds the scoped client-state projection (`scoped_state.v1`) for one
 * workspace / user / thread scope. State from another scope is never shown.
 */
export function buildScopedStateProjection(
  scope: StateScope,
  input: ClientStateInput = {},
  updatedAt: string = new Date().toISOString(),
): ScopedStateProjection {
  const selectedOrderId = typeof input.selectedOrderId === 'string'
    && input.selectedOrderId.trim()
    ? input.selectedOrderId.trim().slice(0, MAX_TEXT_LENGTH)
    : undefined;

  const projection: ScopedStateProjection = {
    scope,
    ...(selectedOrderId ? { selectedOrderId } : {}),
    filters: projectFields(input.filters),
    draft: projectFields(input.draft),
    updatedAt,
    schemaVersion: 'scoped_state.v1',
  };

  const progress = validProgress(input.workflowProgress);
  if (progress) projection.workflowProgress = progress;

  return projection;
}
