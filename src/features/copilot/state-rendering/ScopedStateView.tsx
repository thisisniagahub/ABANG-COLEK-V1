import React from 'react';
import { hasAuthorityField } from './statePolicy';

export interface StateScope {
  workspaceId: string;
  userId: string;
  threadId: string;
}

export interface ScopedStateViewProps {
  scope?: Partial<StateScope> | null;
  snapshot?: unknown;
}

type SafeValue = string | number | boolean;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function safeText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text ? text.slice(0, 160) : undefined;
}

function safeValue(value: unknown): SafeValue | undefined {
  if (typeof value === 'string') return safeText(value);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function scopeMatches(currentValue: unknown, snapshotValue: unknown): boolean {
  const current = asRecord(currentValue);
  const captured = asRecord(snapshotValue);
  if (!current || !captured) return false;

  return ['workspaceId', 'userId', 'threadId'].every((key) => {
    const activeId = current[key];
    const snapshotId = captured[key];
    return (
      typeof activeId === 'string' &&
      activeId.length > 0 &&
      typeof snapshotId === 'string' &&
      snapshotId === activeId
    );
  });
}

function projectFields(value: unknown): Array<[string, SafeValue]> {
  const record = asRecord(value);
  if (!record) return [];

  return Object.entries(record)
    .filter(([key]) => !hasAuthorityField(key))
    .flatMap(([key, rawValue]) => {
      const safeKey = safeText(key);
      const safe = safeValue(rawValue);
      return safeKey && safe !== undefined ? [[safeKey, safe] as [string, SafeValue]] : [];
    })
    .slice(0, 12);
}

function displayValue(value: SafeValue): string {
  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
}

function FieldList({
  title,
  fields,
}: {
  title: string;
  fields: Array<[string, SafeValue]>;
}) {
  if (!fields.length) return null;

  return (
    <section className="min-w-0 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-soft)] p-3">
      <h3 className="text-xs font-semibold text-[var(--ui-text)]">{title}</h3>
      <dl className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {fields.map(([key, value]) => (
          <div className="min-w-0" key={key}>
            <dt className="break-words text-xs text-[var(--ui-muted)]">{key}</dt>
            <dd className="break-words text-sm text-[var(--ui-text)]">
              {displayValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ScopedStateView({ scope, snapshot }: ScopedStateViewProps) {
  const data = asRecord(snapshot);
  if (!data || !scope) {
    return (
      <section
        className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-sm text-[var(--ui-muted)]"
        role="status"
      >
        No scoped state is available
      </section>
    );
  }

  if (!scopeMatches(scope, data.scope)) {
    return (
      <section
        className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-sm text-[var(--ui-muted)]"
        role="status"
      >
        State is unavailable for this scope
      </section>
    );
  }

  const selectedOrderId = safeText(data.selectedOrderId);
  const entityRevision = safeValue(data.entityRevision);
  const policyRevision = safeValue(data.policyRevision);
  const filters = projectFields(data.filters);
  const draft = projectFields(data.draft);
  const progress = asRecord(data.workflowProgress);
  const workflowLabel = safeText(progress?.label);
  const currentStep = progress?.currentStep;
  const totalSteps = progress?.totalSteps;
  const validProgress =
    typeof currentStep === 'number' &&
    Number.isInteger(currentStep) &&
    typeof totalSteps === 'number' &&
    Number.isInteger(totalSteps) &&
    currentStep >= 0 &&
    totalSteps > 0 &&
    currentStep <= totalSteps;

  const hasState =
    Boolean(selectedOrderId) ||
    entityRevision !== undefined ||
    policyRevision !== undefined ||
    filters.length > 0 ||
    draft.length > 0 ||
    Boolean(workflowLabel && validProgress);

  if (!hasState) {
    return (
      <section
        className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-sm text-[var(--ui-muted)]"
        role="status"
      >
        No client state to display
      </section>
    );
  }

  return (
    <section className="w-full min-w-0 space-y-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)]">
      {selectedOrderId && (
        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-[var(--ui-muted)]">Selected order</h3>
          <p className="break-all text-sm font-medium">{selectedOrderId}</p>
        </div>
      )}
      {(entityRevision !== undefined || policyRevision !== undefined) && (
        <dl className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-soft)] p-3 sm:grid-cols-2">
          {entityRevision !== undefined && (
            <div className="min-w-0">
              <dt className="text-xs text-[var(--ui-muted)]">Entity revision</dt>
              <dd className="break-words font-mono text-sm text-[var(--ui-text)]">
                {displayValue(entityRevision)}
              </dd>
            </div>
          )}
          {policyRevision !== undefined && (
            <div className="min-w-0">
              <dt className="text-xs text-[var(--ui-muted)]">Policy revision</dt>
              <dd className="break-words font-mono text-sm text-[var(--ui-text)]">
                {displayValue(policyRevision)}
              </dd>
            </div>
          )}
        </dl>
      )}
      <FieldList title="Filters" fields={filters} />
      <FieldList title="Draft" fields={draft} />
      {workflowLabel && validProgress && (
        <section className="min-w-0 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-soft)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="break-words text-xs font-semibold">{workflowLabel}</h3>
            <span className="text-xs text-[var(--ui-muted)]">
              {currentStep} of {totalSteps}
            </span>
          </div>
          <progress
            className="mt-2 block h-2 w-full accent-[var(--ui-accent)]"
            aria-label={`${workflowLabel} progress`}
            value={currentStep}
            max={totalSteps}
          />
        </section>
      )}
    </section>
  );
}

export default ScopedStateView;
