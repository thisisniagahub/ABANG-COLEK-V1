type ProjectionState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'denied'
  | 'insufficient-data'
  | 'stale'
  | 'unknown-outcome';

/**
 * BL-24b: kegagalan input margin yang berjenis. Pelayan tidak pernah
 * meneka margin — ia memulangkan sebab yangtyped together with the keys
 * that are missing or invalid.
 */
export type MarginInputFailureReason =
  | 'MARGIN_INPUTS_NOT_PROVIDED'
  | 'MARGIN_INPUTS_INVALID';

export interface MarginInputFailure {
  ok: false;
  reason: MarginInputFailureReason;
  /** Kunci input yang tidak disediakan atau rosak. */
  invalidKeys: string[];
}

export interface MarginSummaryCardProps {
  contributionSen?: number;
  contributionMarginPct?: number;
  requiredContributionSen?: number;
  requiredMarginPct?: number;
  status?: 'PASSED' | 'INSUFFICIENT_CASH_MARGIN' | 'INSUFFICIENT_PERCENT_MARGIN';
  /** Kegagalan input yang berjenis daripada pelayan. */
  failure?: MarginInputFailure;
  /** `false` bermaksud pelayan tidak menjalankan simulasi margin. */
  simulationPerformed?: boolean;
  /** Kunci input yang diminta oleh pelayan (dipaparkan sebagai konteks). */
  requiredInputKeys?: string[];
  projectionState?: ProjectionState;
  message?: string;
  source?: string;
  revision?: string | number;
}

const projectionMessages: Record<ProjectionState, string> = {
  ready: '',
  loading: 'Sedang dimuatkan',
  empty: 'Tiada data margin',
  error: 'Ralat memuatkan margin',
  denied: 'Akses tidak dibenarkan',
  'insufficient-data': 'Data margin tidak mencukupi',
  stale: 'Data mungkin lapuk',
  'unknown-outcome': 'Keputusan belum diketahui; kelulusan tidak dapat dipastikan',
};

const resultLabels = {
  PASSED: 'Lulus',
  INSUFFICIENT_CASH_MARGIN: 'Margin tunai tidak mencukupi',
  INSUFFICIENT_PERCENT_MARGIN: 'Margin peratusan tidak mencukupi',
} as const;

const failureLabels: Record<MarginInputFailureReason, string> = {
  MARGIN_INPUTS_NOT_PROVIDED: 'Input margin tidak disediakan',
  MARGIN_INPUTS_INVALID: 'Input margin tidak sah',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readFailureReason(value: unknown): MarginInputFailureReason | null {
  if (value === 'MARGIN_INPUTS_NOT_PROVIDED') return 'MARGIN_INPUTS_NOT_PROVIDED';
  if (value === 'MARGIN_INPUTS_INVALID') return 'MARGIN_INPUTS_INVALID';
  return null;
}

function readKeyList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((key): key is string => typeof key === 'string' && key.length > 0 && key.length <= 100)
    .slice(0, 40);
}

/**
 * Membaca kegagalan input margin daripada mana-mana bentuk wayar yang
 * dilayani pelayan: objek `failure` bersarang, atau bentuk rata
 * `reason` + `invalidKeys`.
 *
 * Bentuk lama `reasonCode` + `missingInputKeys` juga diterima supaya kad
 * tidak kembali kepada "tiada data" semata-mata kerana bentuk wayar berubah.
 */
export function parseMarginInputFailure(props: unknown): MarginInputFailure | null {
  if (!isRecord(props)) return null;

  for (const candidate of [props.failure, props.marginFailure, props.inputFailure, props.error]) {
    if (!isRecord(candidate)) continue;
    const reason = readFailureReason(candidate.reason ?? candidate.reasonCode);
    if (!reason) continue;
    return {
      ok: false,
      reason,
      invalidKeys: readKeyList(candidate.invalidKeys ?? candidate.missingInputKeys),
    };
  }

  const flatReason = readFailureReason(props.reason ?? props.reasonCode);
  if (!flatReason) return null;
  return {
    ok: false,
    reason: flatReason,
    invalidKeys: readKeyList(props.invalidKeys ?? props.missingInputKeys),
  };
}

function isValidMargin(props: MarginSummaryCardProps) {
  const {
    contributionSen,
    contributionMarginPct,
    requiredContributionSen,
    requiredMarginPct,
    status,
  } = props;
  if (
    typeof contributionSen !== 'number'
    || !Number.isSafeInteger(contributionSen)
    || typeof contributionMarginPct !== 'number'
    || !Number.isFinite(contributionMarginPct)
    || typeof requiredContributionSen !== 'number'
    || !Number.isSafeInteger(requiredContributionSen)
    || typeof requiredMarginPct !== 'number'
    || !Number.isFinite(requiredMarginPct)
    || (
      status !== 'PASSED'
      && status !== 'INSUFFICIENT_CASH_MARGIN'
      && status !== 'INSUFFICIENT_PERCENT_MARGIN'
    )
  ) return false;

  const meetsCashThreshold = contributionSen >= requiredContributionSen;
  const meetsPercentageThreshold = contributionMarginPct >= requiredMarginPct;

  switch (status) {
    case 'PASSED':
      return meetsCashThreshold && meetsPercentageThreshold;
    case 'INSUFFICIENT_CASH_MARGIN':
      return !meetsCashThreshold;
    case 'INSUFFICIENT_PERCENT_MARGIN':
      return meetsCashThreshold && !meetsPercentageThreshold;
    default:
      return false;
  }
}

function Provenance({
  source,
  revision,
}: Pick<MarginSummaryCardProps, 'source' | 'revision'>) {
  if (!source && revision === undefined) return null;

  return (
    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--ui-border)] pt-3 text-xs text-[var(--ui-muted)]">
      {source && <div><dt className="inline font-medium">Sumber: </dt><dd className="inline break-all">{source}</dd></div>}
      {revision !== undefined && <div><dt className="inline font-medium">Revisi: </dt><dd className="inline">{revision}</dd></div>}
    </dl>
  );
}

export function MarginSummaryCard(props: MarginSummaryCardProps) {
  const projectionState = props.projectionState ?? 'ready';
  const failure = props.failure ?? null;
  // Kegagalan input yang berjenis overwhelmed margin: tiada margin dikira,
  // jadi tiada 0% dan tiada nilai rekaan dipaparkan.
  const hasMargin = failure === null && isValidMargin(props);
  const state = projectionState === 'ready' && !hasMargin ? 'insufficient-data' : projectionState;
  const showsMargin = hasMargin && (state === 'ready' || state === 'stale');
  const requiredInputKeys = readKeyList(props.requiredInputKeys);

  return (
    <article
      aria-label="Ringkasan margin"
      aria-busy={state === 'loading'}
      className="overflow-hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-base font-semibold">Ringkasan margin</h3>
          <p className="mb-0 mt-1 text-sm text-[var(--ui-muted)]">Nilai sumbangan dan ambang daripada penilaian kanonik</p>
        </div>
        <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-xs">Display only</span>
      </header>

      {failure && (
        <div
          className="mt-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-soft)] p-3"
          role="status"
          aria-label="Kegagalan input margin"
        >
          <p className="m-0 text-sm font-medium">{failureLabels[failure.reason]}</p>
          <p className="mb-0 mt-1 text-xs text-[var(--ui-muted)]">
            Kod sebab: <span className="font-mono">{failure.reason}</span>
          </p>
          {failure.invalidKeys.length > 0 && (
            <p className="mb-0 mt-1 text-xs text-[var(--ui-muted)]">
              Kunci input bermasalah: <span className="font-mono">{failure.invalidKeys.join(', ')}</span>
            </p>
          )}
          {requiredInputKeys.length > 0 && (
            <p className="mb-0 mt-1 text-xs text-[var(--ui-muted)]">
              Kunci input diperlukan: <span className="font-mono">{requiredInputKeys.join(', ')}</span>
            </p>
          )}
          <p className="mb-0 mt-1 text-xs text-[var(--ui-muted)]">
            Tiada margin dikira. Tiada nilai margin dipaparkan.
          </p>
        </div>
      )}

      {state !== 'ready' && !failure && (
        <p className="my-4 text-sm" role={state === 'error' || state === 'denied' ? 'alert' : 'status'}>
          {props.message?.trim() || projectionMessages[state]}
        </p>
      )}

      {!failure && props.simulationPerformed === false && (
        <p className="my-4 text-sm" role="status">
          Simulasi margin tidak dijalankan oleh pelayan. Tiada margin dikira dan tiada nilai margin dipaparkan.
        </p>
      )}

      {showsMargin && (
        <>
          <p className="mt-4 text-sm font-semibold">{resultLabels[props.status!]}</p>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
              <dt className="text-xs text-[var(--ui-muted)]">Sumbangan</dt>
              <dd className="mb-0 mt-1 text-sm font-medium">RM {(props.contributionSen! / 100).toFixed(2)}</dd>
            </div>
            <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
              <dt className="text-xs text-[var(--ui-muted)]">Margin sumbangan</dt>
              <dd className="mb-0 mt-1 text-sm font-medium">{props.contributionMarginPct}%</dd>
            </div>
            <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
              <dt className="text-xs text-[var(--ui-muted)]">Ambang sumbangan</dt>
              <dd className="mb-0 mt-1 text-sm font-medium">RM {(props.requiredContributionSen! / 100).toFixed(2)}</dd>
            </div>
            <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
              <dt className="text-xs text-[var(--ui-muted)]">Ambang margin</dt>
              <dd className="mb-0 mt-1 text-sm font-medium">{props.requiredMarginPct}%</dd>
            </div>
          </dl>
        </>
      )}

      <Provenance source={props.source} revision={props.revision} />
    </article>
  );
}
