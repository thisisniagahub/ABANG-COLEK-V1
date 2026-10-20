import React from 'react';

export const OPERATIONS_BRIEF_READ_ONLY_NOTICE =
  'FIRST_PARTY_RESOURCE_UNRESTRICTED_PROXY_BLOCKED' as const;

export interface OperationsBriefMetric {
  label: string;
  value: string;
}

export interface OperationsBriefProjection {
  title: string;
  briefDate: string;
  metrics: OperationsBriefMetric[];
  readOnlyNotice: typeof OPERATIONS_BRIEF_READ_ONLY_NOTICE;
  source?: string;
  revision?: string | number;
}

export type OperationsBriefParseResult =
  | { ok: true; value: OperationsBriefProjection }
  | { ok: false };

/**
 * GUI-05 resource states. The object form is the canonical contract; the
 * hyphenated string form is the legacy alias kept for existing call sites.
 */
export type OperationsBriefStatus =
  | 'ready'
  | 'loading'
  | 'denied'
  | 'empty'
  | 'error'
  | 'insufficient_data'
  | 'stale'
  | 'unknown_outcome';

export type OperationsBriefLegacyStatus =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'denied'
  | 'insufficient-data'
  | 'stale'
  | 'unknown-outcome';

export interface OperationsBriefAppState {
  status: OperationsBriefStatus;
  reason?: string;
  brief?: unknown;
}

export interface OperationsBriefAppProps {
  brief?: unknown;
  state?: OperationsBriefAppState | OperationsBriefLegacyStatus;
}

const MAX_METRICS = 12;
const MAX_TITLE_LENGTH = 120;
const MAX_METRIC_LABEL_LENGTH = 80;
const MAX_METRIC_VALUE_LENGTH = 120;

const STATUS_COPY: Record<OperationsBriefStatus, string> = {
  ready: '',
  loading: 'Memuat taklimat operasi…',
  denied: 'Akses taklimat tidak dibenarkan',
  empty: 'Tiada taklimat operasi',
  error: 'Taklimat tidak dapat dimuatkan',
  insufficient_data: 'Data taklimat tidak mencukupi',
  stale: 'Taklimat mungkin lapuk',
  unknown_outcome: 'Status resource tidak diketahui',
};

const LEGACY_STATUS_COPY: Record<OperationsBriefLegacyStatus, string> = {
  ready: '',
  loading: 'Sedang memuatkan taklimat',
  empty: 'Tiada taklimat operasi',
  error: 'Taklimat tidak dapat dimuatkan',
  denied: 'Akses tidak dibenarkan',
  'insufficient-data': 'Data taklimat tidak mencukupi',
  stale: 'Taklimat mungkin lapuk',
  'unknown-outcome': 'Status taklimat belum diketahui',
};

const LEGACY_ALIASES: Record<OperationsBriefLegacyStatus, OperationsBriefStatus> = {
  ready: 'ready',
  loading: 'loading',
  empty: 'empty',
  error: 'error',
  denied: 'denied',
  'insufficient-data': 'insufficient_data',
  stale: 'stale',
  'unknown-outcome': 'unknown_outcome',
};

const LEGACY_BY_STATUS: Record<OperationsBriefStatus, OperationsBriefLegacyStatus> = {
  ready: 'ready',
  loading: 'loading',
  empty: 'empty',
  error: 'error',
  denied: 'denied',
  insufficient_data: 'insufficient-data',
  stale: 'stale',
  unknown_outcome: 'unknown-outcome',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSafeRevision(value: unknown): value is string | number {
  return (typeof value === 'string' && value.trim().length > 0 && value.length <= 100)
    || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Only stable machine codes are echoed back; nothing else from the server is displayed. */
function safeReason(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text || text.length > 64) return undefined;
  if (!/^[A-Z0-9_]+$/.test(text)) return undefined;
  return text;
}

/**
 * Parses the first-party read-only operations brief projection.
 * Unknown keys (for example a `url` field) are rejected outright so the view
 * can never be pointed at an untrusted origin.
 */
export function parseOperationsBrief(value: unknown): OperationsBriefParseResult {
  if (!isRecord(value)) return { ok: false };
  const source = value.source;
  const revision = value.revision;
  const allowedKeys = new Set([
    'title',
    'briefDate',
    'metrics',
    'readOnlyNotice',
    'source',
    'revision',
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return { ok: false };
  if (
    typeof value.title !== 'string'
    || value.title.trim().length === 0
    || value.title.length > MAX_TITLE_LENGTH
    || typeof value.briefDate !== 'string'
    || !isCalendarDate(value.briefDate)
    || value.readOnlyNotice !== OPERATIONS_BRIEF_READ_ONLY_NOTICE
    || !Array.isArray(value.metrics)
    || value.metrics.length > MAX_METRICS
  ) return { ok: false };

  const metrics: OperationsBriefMetric[] = [];
  for (const metric of value.metrics) {
    if (!isRecord(metric)
      || Object.keys(metric).some((key) => key !== 'label' && key !== 'value')
      || typeof metric.label !== 'string'
      || metric.label.trim().length === 0
      || metric.label.length > MAX_METRIC_LABEL_LENGTH
      || typeof metric.value !== 'string'
      || metric.value.trim().length === 0
      || metric.value.length > MAX_METRIC_VALUE_LENGTH) return { ok: false };
    metrics.push({ label: metric.label, value: metric.value });
  }

  if (source !== undefined
    && (typeof source !== 'string' || source.trim().length === 0 || source.length > 100)) {
    return { ok: false };
  }
  if (revision !== undefined && !isSafeRevision(revision)) return { ok: false };

  return {
    ok: true,
    value: {
      title: value.title,
      briefDate: value.briefDate,
      metrics,
      readOnlyNotice: OPERATIONS_BRIEF_READ_ONLY_NOTICE,
      ...(typeof source === 'string' ? { source } : {}),
      ...(isSafeRevision(revision) ? { revision } : {}),
    },
  };
}

export function OperationsBriefApp({ brief, state = 'ready' }: OperationsBriefAppProps) {
  const legacy = typeof state === 'string';
  const status: OperationsBriefStatus = legacy
    ? LEGACY_ALIASES[state]
    : state.status;
  const reason = legacy ? undefined : safeReason(state.reason);
  const rawBrief = legacy ? brief : (state.brief ?? brief);

  const parsed = parseOperationsBrief(rawBrief);
  const projection = parsed.ok ? parsed.value : null;

  const projectionState: OperationsBriefStatus = status === 'ready'
    ? (!rawBrief ? 'empty' : (projection ? 'ready' : 'insufficient_data'))
    : status;

  const message = legacy
    ? LEGACY_STATUS_COPY[LEGACY_BY_STATUS[projectionState]]
    : STATUS_COPY[projectionState];
  const showBrief = projection !== null
    && (projectionState === 'ready' || projectionState === 'stale');

  return (
    <article
      aria-label="Operations Brief"
      aria-busy={projectionState === 'loading'}
      className="w-full min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Operations Brief</h2>
          <p className="mt-1 text-sm text-[var(--ui-muted)]">
            First-party resource · read-only · unrestricted proxy blocked
          </p>
        </div>
        <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-xs">
          Paparan sahaja · Read only
        </span>
      </header>

      {projectionState !== 'ready' && (
        <p
          className="my-4 text-sm"
          role={projectionState === 'error' || projectionState === 'denied' ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
      {projectionState === 'denied' && reason && (
        <p className="my-2 text-xs text-[var(--ui-muted)]">
          Kod sebab: <span className="font-mono">{reason}</span>
        </p>
      )}
      {showBrief && projection && (
        <>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="break-words text-sm font-semibold">{projection.title}</h3>
            <time className="text-xs text-[var(--ui-muted)]" dateTime={projection.briefDate}>
              {projection.briefDate}
            </time>
          </div>
          {projection.metrics.length > 0 ? (
            <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {projection.metrics.map((metric, index) => (
                <div
                  className="min-w-0 rounded-xl bg-[var(--ui-soft)] p-3"
                  key={`${metric.label}-${index}`}
                >
                  <dt className="break-words text-xs text-[var(--ui-muted)]">{metric.label}</dt>
                  <dd className="mb-0 mt-1 break-words text-sm font-medium">{metric.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-[var(--ui-muted)]">Tiada metrik dalam taklimat ini.</p>
          )}
          {(projection.source || projection.revision !== undefined) && (
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--ui-border)] pt-3 text-xs text-[var(--ui-muted)]">
              {projection.source && (
                <div><dt className="inline font-medium">Sumber: </dt><dd className="inline break-all">{projection.source}</dd></div>
              )}
              {projection.revision !== undefined && (
                <div><dt className="inline font-medium">Revisi: </dt><dd className="inline">{projection.revision}</dd></div>
              )}
            </dl>
          )}
        </>
      )}
    </article>
  );
}

export default OperationsBriefApp;
