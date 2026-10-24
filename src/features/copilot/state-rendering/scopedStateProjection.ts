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
  entityRevision?: string | number;
  policyRevision?: string | number;
  filters?: Record<string, unknown>;
  draft?: Record<string, unknown>;
  workflowProgress?: WorkflowProgressState;
}

export type ScopedRevisionValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: 'STALE_ENTITY_REVISION' | 'STALE_POLICY_REVISION' | 'REVISION_CONFLATED';
      field: 'entityRevision' | 'policyRevision';
    };

const DISALLOWED = new Set<string>(DISALLOWED_CLIENT_STATE_TOKENS);
const MAX_FIELDS = 12;
const MAX_TEXT_LENGTH = 160;

function safeRevision(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === 'string') {
    const text = value.trim();
    if (text.length > 0 && text.length <= MAX_TEXT_LENGTH) return text;
  }
  return undefined;
}

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
 * GUI-04 / CPK-08: builds the scoped client-state projection (`scoped_state.v1`) for one
 * workspace / user / thread scope, keeping `entityRevision` and `policyRevision` distinct.
 * State from another scope is never shown.
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
  const entityRevision = safeRevision(input.entityRevision);
  const policyRevision = safeRevision(input.policyRevision);

  const projection: ScopedStateProjection = {
    scope,
    ...(selectedOrderId ? { selectedOrderId } : {}),
    ...(entityRevision !== undefined ? { entityRevision } : {}),
    ...(policyRevision !== undefined ? { policyRevision } : {}),
    filters: projectFields(input.filters),
    draft: projectFields(input.draft),
    updatedAt,
    schemaVersion: 'scoped_state.v1',
  };

  const progress = validProgress(input.workflowProgress);
  if (progress) projection.workflowProgress = progress;

  return projection;
}

/**
 * CPK-08: Verifies that `entityRevision` and `policyRevision` are tracked separately
 * and match the authoritative server revisions.
 */
export function validateScopedStateRevisionFreshness(
  projection: ScopedStateProjection,
  expected: { entityRevision?: string | number; policyRevision?: string | number },
): ScopedRevisionValidationResult {
  if (expected.entityRevision !== undefined) {
    if (projection.entityRevision === undefined) {
      return { ok: false, code: 'REVISION_CONFLATED', field: 'entityRevision' };
    }
    if (String(projection.entityRevision) !== String(expected.entityRevision)) {
      return { ok: false, code: 'STALE_ENTITY_REVISION', field: 'entityRevision' };
    }
  }
  if (expected.policyRevision !== undefined) {
    if (projection.policyRevision === undefined) {
      return { ok: false, code: 'REVISION_CONFLATED', field: 'policyRevision' };
    }
    if (String(projection.policyRevision) !== String(expected.policyRevision)) {
      return { ok: false, code: 'STALE_POLICY_REVISION', field: 'policyRevision' };
    }
  }
  return { ok: true };
}

/**
 * CPK-08 / GUI-04: Live server-backed scoped state store that enforces cross-scope
 * isolation and separate entity/policy revision validation.
 */
export function createLiveScopedStateStore(
  initialScope: StateScope,
  fetchServerState?: (scope: StateScope) => Promise<ClientStateInput>,
) {
  let activeScope: StateScope = { ...initialScope };
  const byScopeKey = new Map<string, ScopedStateProjection>();

  const scopeKey = (s: StateScope) => `${s.workspaceId}::${s.userId}::${s.threadId}`;

  return {
    getScope(): StateScope {
      return { ...activeScope };
    },
    getSnapshot(forScope: StateScope = activeScope): ScopedStateProjection | null {
      const stored = byScopeKey.get(scopeKey(forScope));
      if (!stored) return null;
      if (
        stored.scope.workspaceId !== activeScope.workspaceId ||
        stored.scope.userId !== activeScope.userId ||
        stored.scope.threadId !== activeScope.threadId
      ) {
        return null;
      }
      return stored;
    },
    switchScope(nextScope: StateScope): void {
      activeScope = { ...nextScope };
    },
    async refreshFromServer(): Promise<ScopedStateProjection | null> {
      if (!fetchServerState) return this.getSnapshot();
      const capturedScope = { ...activeScope };
      const raw = await fetchServerState(capturedScope);
      const projected = buildScopedStateProjection(capturedScope, raw);
      byScopeKey.set(scopeKey(capturedScope), projected);
      return this.getSnapshot(capturedScope);
    },
    applyServerSnapshot(
      input: ClientStateInput,
      expectedRevisions?: { entityRevision?: string | number; policyRevision?: string | number },
    ): { ok: true; projection: ScopedStateProjection } | { ok: false; code: string } {
      const projection = buildScopedStateProjection(activeScope, input);
      if (expectedRevisions) {
        const verdict = validateScopedStateRevisionFreshness(projection, expectedRevisions);
        if (verdict.ok === false) {
          return { ok: false, code: verdict.code };
        }
      }
      byScopeKey.set(scopeKey(activeScope), projection);
      return { ok: true, projection };
    },
  };
}
