import React from 'react';

type ProjectionState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'denied'
  | 'insufficient-data'
  | 'stale'
  | 'unknown-outcome';

interface OrderTrackingProjection {
  id: string;
  fulfilmentStatus: 'requested' | 'review' | 'accepted' | 'packing' | 'packed' | 'dispatched' | 'received' | 'cancelled';
  trackingTokenExpiresAt?: string;
  revision: number;
}

export interface OrderTrackingCardProps {
  order?: unknown;
  projectionState?: ProjectionState;
  source?: string;
  revision?: string | number;
}

const stateMessages: Record<ProjectionState, string> = {
  ready: '',
  loading: 'Sedang memuatkan penjejakan',
  empty: 'Tiada data penjejakan',
  error: 'Penjejakan tidak dapat dimuatkan',
  denied: 'Akses tidak dibenarkan',
  'insufficient-data': 'Data penjejakan tidak mencukupi',
  stale: 'Data penjejakan mungkin lapuk',
  'unknown-outcome': 'Status penjejakan belum diketahui',
};

const fulfilmentLabels: Record<OrderTrackingProjection['fulfilmentStatus'], string> = {
  requested: 'Diminta',
  review: 'Dalam semakan',
  accepted: 'Diterima',
  packing: 'Sedang dibungkus',
  packed: 'Dibungkus',
  dispatched: 'Dihantar',
  received: 'Diterima pelanggan',
  cancelled: 'Dibatalkan',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseOrderTrackingProjection(value: unknown): OrderTrackingProjection | null {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || value.id.trim().length === 0
    || value.id.length > 100
    || typeof value.fulfilmentStatus !== 'string'
    || !Object.prototype.hasOwnProperty.call(fulfilmentLabels, value.fulfilmentStatus)
    || !Number.isSafeInteger(value.revision)
    || (value.revision as number) < 0) return null;

  const expiry = value.trackingTokenExpiresAt;
  if (expiry !== undefined
    && (typeof expiry !== 'string' || expiry.length > 50 || !Number.isFinite(Date.parse(expiry)))) {
    return null;
  }

  return {
    id: value.id,
    fulfilmentStatus: value.fulfilmentStatus as OrderTrackingProjection['fulfilmentStatus'],
    revision: value.revision as number,
    ...(typeof expiry === 'string' ? { trackingTokenExpiresAt: expiry } : {}),
  };
}

export function OrderTrackingCard({
  order,
  projectionState = 'ready',
  source,
  revision,
}: OrderTrackingCardProps) {
  const projection = parseOrderTrackingProjection(order);
  const state = projectionState === 'ready' && order !== undefined && !projection
    ? 'insufficient-data'
    : projectionState === 'ready' && order === undefined
      ? 'empty'
      : projectionState;
  const visible = projection !== null && (state === 'ready' || state === 'stale');

  return (
    <article
      aria-label="Penjejakan pesanan"
      aria-busy={state === 'loading'}
      className="w-full min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Penjejakan pesanan</h3>
          <p className="mt-1 text-sm text-[var(--ui-muted)]">Paparan sahaja · token penjejakan dirahsiakan</p>
        </div>
        <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-soft)] px-3 py-1 text-xs">
          Display only
        </span>
      </header>
      {state !== 'ready' && state !== 'stale' && (
        <p role={state === 'error' || state === 'denied' ? 'alert' : 'status'} className="my-4 text-sm">
          {stateMessages[state]}
        </p>
      )}
      {state === 'stale' && <p role="status" className="my-3 text-sm">{stateMessages.stale}</p>}
      {visible && projection && (
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--ui-soft)] p-3">
            <dt className="text-xs text-[var(--ui-muted)]">ID pesanan</dt>
            <dd className="mb-0 mt-1 break-all text-sm font-medium">{projection.id}</dd>
          </div>
          <div className="rounded-xl bg-[var(--ui-soft)] p-3">
            <dt className="text-xs text-[var(--ui-muted)]">Status</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">{fulfilmentLabels[projection.fulfilmentStatus]}</dd>
          </div>
          <div className="rounded-xl bg-[var(--ui-soft)] p-3 sm:col-span-2">
            <dt className="text-xs text-[var(--ui-muted)]">Token penjejakan</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">Dirahsiakan</dd>
          </div>
          <div className="rounded-xl bg-[var(--ui-soft)] p-3 sm:col-span-2">
            <dt className="text-xs text-[var(--ui-muted)]">Token luput</dt>
            <dd className="mb-0 mt-1 text-sm font-medium">
              {projection.trackingTokenExpiresAt ?? 'Tarikh luput tidak tersedia'}
            </dd>
          </div>
        </dl>
      )}
      {(source || revision !== undefined || visible) && (
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--ui-border)] pt-3 text-xs text-[var(--ui-muted)]">
          {source && <div><dt className="inline font-medium">Sumber: </dt><dd className="inline break-all">{source}</dd></div>}
          {(revision ?? (visible ? projection?.revision : undefined)) !== undefined && (
            <div><dt className="inline font-medium">Revisi: </dt><dd className="inline">{revision ?? projection?.revision}</dd></div>
          )}
        </dl>
      )}
    </article>
  );
}
