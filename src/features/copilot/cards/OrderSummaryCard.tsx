import type { OrderRecord } from '../../../../shared/platform-contracts';

type ProjectionState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'denied'
  | 'insufficient-data'
  | 'stale'
  | 'unknown-outcome';

type OrderProjection = Pick<
  OrderRecord,
  'id' | 'amountSen' | 'fulfilmentStatus' | 'paymentState' | 'revision'
>;

export interface OrderSummaryCardProps {
  order?: OrderProjection;
  projectionState?: ProjectionState;
  message?: string;
  source?: string;
  revision?: string | number;
}

const projectionMessages: Record<ProjectionState, string> = {
  ready: '',
  loading: 'Sedang dimuatkan',
  empty: 'Tiada data pesanan',
  error: 'Ralat memuatkan pesanan',
  denied: 'Akses tidak dibenarkan',
  'insufficient-data': 'Data pesanan tidak mencukupi',
  stale: 'Data mungkin lapuk',
  'unknown-outcome': 'Keputusan belum diketahui; kejayaan tidak dapat dipastikan',
};

const fulfilmentLabels: Record<OrderProjection['fulfilmentStatus'], string> = {
  requested: 'Diminta',
  review: 'Dalam semakan',
  accepted: 'Diterima',
  packing: 'Sedang dibungkus',
  packed: 'Dibungkus',
  dispatched: 'Dihantar',
  received: 'Diterima pelanggan',
  cancelled: 'Dibatalkan',
};

const paymentLabels: Record<OrderProjection['paymentState'], string> = {
  pending: 'Menunggu',
  verified: 'Disahkan',
  refund_requested: 'Bayaran balik diminta',
  part_refunded: 'Bayaran balik sebahagian',
  refunded: 'Dibayar balik',
  rejected: 'Ditolak',
};

function Provenance({
  source,
  revision,
}: Pick<OrderSummaryCardProps, 'source' | 'revision'>) {
  if (!source && revision === undefined) return null;

  return (
    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--ui-border)] pt-3 text-xs text-[var(--ui-muted)]">
      {source && <div><dt className="inline font-medium">Sumber: </dt><dd className="inline break-all">{source}</dd></div>}
      {revision !== undefined && <div><dt className="inline font-medium">Revisi: </dt><dd className="inline">{revision}</dd></div>}
    </dl>
  );
}

export function OrderSummaryCard({
  order,
  projectionState = 'ready',
  message,
  source,
  revision,
}: OrderSummaryCardProps) {
  const validOrder = order
    && order.id.trim().length > 0
    && Number.isSafeInteger(order.amountSen)
    && Number.isSafeInteger(order.revision);
  const state = projectionState === 'ready' && !validOrder ? 'insufficient-data' : projectionState;
  const showsOrder = Boolean(validOrder) && (state === 'ready' || state === 'stale');
  const displayedRevision = showsOrder ? order?.revision : revision;

  return (
    <article
      aria-label="Ringkasan pesanan"
      aria-busy={state === 'loading'}
      className="overflow-hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-base font-semibold">Ringkasan pesanan</h3>
          <p className="mb-0 mt-1 text-sm text-[var(--ui-muted)]">Paparan sahaja</p>
        </div>
        <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-xs">Display only</span>
      </header>

      {state !== 'ready' && (
        <p className="my-4 text-sm" role={state === 'error' || state === 'denied' ? 'alert' : 'status'}>
          {message?.trim() || projectionMessages[state]}
        </p>
      )}

      {showsOrder && order && (
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
            <dt className="text-xs text-[var(--ui-muted)]">ID pesanan</dt>
            <dd className="mb-0 mt-1 break-all text-sm font-medium">{order.id}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
            <dt className="text-xs text-[var(--ui-muted)]">Jumlah pesanan</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">RM {(order.amountSen / 100).toFixed(2)}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
            <dt className="text-xs text-[var(--ui-muted)]">Status pemenuhan</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">
              {fulfilmentLabels[order.fulfilmentStatus] ?? 'Status tidak diketahui'}
            </dd>
          </div>
          <div className="rounded-2xl bg-[var(--ui-soft)] p-3">
            <dt className="text-xs text-[var(--ui-muted)]">Status bayaran</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">
              {paymentLabels[order.paymentState] ?? 'Status tidak diketahui'}
            </dd>
          </div>
        </dl>
      )}

      <Provenance source={source} revision={displayedRevision} />
    </article>
  );
}
