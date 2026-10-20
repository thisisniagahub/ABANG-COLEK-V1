import type { DealerCommissionSummary } from '../../../../shared/growth-contracts';

type ProjectionState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'denied'
  | 'insufficient-data'
  | 'stale'
  | 'unknown-outcome';

export interface CommissionSummaryCardProps {
  summary?: DealerCommissionSummary;
  projectionState?: ProjectionState;
  message?: string;
  source?: string;
  revision?: string | number;
}

const projectionMessages: Record<ProjectionState, string> = {
  ready: '',
  loading: 'Sedang dimuatkan',
  empty: 'Tiada data komisen',
  error: 'Ralat memuatkan komisen',
  denied: 'Akses tidak dibenarkan',
  'insufficient-data': 'Data komisen tidak mencukupi',
  stale: 'Data mungkin lapuk',
  'unknown-outcome': 'Keputusan belum diketahui; pembayaran tidak boleh dianggap selesai',
};

function Provenance({
  source,
  revision,
}: Pick<CommissionSummaryCardProps, 'source' | 'revision'>) {
  if (!source && revision === undefined) return null;

  return (
    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--ui-border)] pt-3 text-xs text-[var(--ui-muted)]">
      {source && <div><dt className="inline font-medium">Sumber: </dt><dd className="inline break-all">{source}</dd></div>}
      {revision !== undefined && <div><dt className="inline font-medium">Revisi: </dt><dd className="inline">{revision}</dd></div>}
    </dl>
  );
}

function hasValidAmounts(summary: DealerCommissionSummary) {
  return summary.dealerOrgId.trim().length > 0 && [
    summary.totalEarnedSen,
    summary.pendingSen,
    summary.eligibleSen,
    summary.approvedSen,
    summary.paidSen,
    summary.reversedContraSen,
    summary.netPayableSen,
    summary.unsettledDeficitSen,
  ].every(Number.isSafeInteger);
}

const amounts = [
  ['Jumlah diperoleh', 'totalEarnedSen'],
  ['Menunggu', 'pendingSen'],
  ['Layak', 'eligibleSen'],
  ['Diluluskan', 'approvedSen'],
  ['Dibayar', 'paidSen'],
  ['Kontra dibalikkan', 'reversedContraSen'],
  ['Baki perlu dibayar', 'netPayableSen'],
  ['Defisit belum diselesaikan', 'unsettledDeficitSen'],
] as const;

export function CommissionSummaryCard({
  summary,
  projectionState = 'ready',
  message,
  source,
  revision,
}: CommissionSummaryCardProps) {
  const hasSummary = summary !== undefined && hasValidAmounts(summary);
  const state = projectionState === 'ready' && !hasSummary ? 'insufficient-data' : projectionState;
  const showsSummary = hasSummary && (state === 'ready' || state === 'stale');
  const visibleDealerOrgId = showsSummary ? summary?.dealerOrgId : undefined;

  return (
    <article
      aria-label="Ringkasan komisen"
      aria-busy={state === 'loading'}
      className="overflow-hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-base font-semibold">Ringkasan komisen</h3>
          <p className="mb-0 mt-1 break-all text-sm text-[var(--ui-muted)]">
            Organisasi dealer{visibleDealerOrgId ? ` · ${visibleDealerOrgId}` : ''}
          </p>
        </div>
        <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-xs">Display only</span>
      </header>

      {state !== 'ready' && (
        <p className="my-4 text-sm" role={state === 'error' || state === 'denied' ? 'alert' : 'status'}>
          {message?.trim() || projectionMessages[state]}
        </p>
      )}

      {showsSummary && summary && (
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {amounts.map(([label, key]) => (
            <div className="rounded-2xl bg-[var(--ui-soft)] p-3" key={key}>
              <dt className="text-xs text-[var(--ui-muted)]">{label}</dt>
              <dd className="mb-0 mt-1 text-sm font-medium">RM {(summary[key] / 100).toFixed(2)}</dd>
            </div>
          ))}
        </dl>
      )}

      <Provenance source={source} revision={revision} />
    </article>
  );
}
