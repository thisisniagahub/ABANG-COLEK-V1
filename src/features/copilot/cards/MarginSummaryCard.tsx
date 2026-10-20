type ProjectionState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'denied'
  | 'insufficient-data'
  | 'stale'
  | 'unknown-outcome';

export interface MarginSummaryCardProps {
  contributionSen?: number;
  contributionMarginPct?: number;
  requiredContributionSen?: number;
  requiredMarginPct?: number;
  status?: 'PASSED' | 'INSUFFICIENT_CASH_MARGIN' | 'INSUFFICIENT_PERCENT_MARGIN';
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
  const hasMargin = isValidMargin(props);
  const state = projectionState === 'ready' && !hasMargin ? 'insufficient-data' : projectionState;
  const showsMargin = hasMargin && (state === 'ready' || state === 'stale');

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

      {state !== 'ready' && (
        <p className="my-4 text-sm" role={state === 'error' || state === 'denied' ? 'alert' : 'status'}>
          {props.message?.trim() || projectionMessages[state]}
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
