import React from 'react';

export interface OrderTrackingBadgeProps {
  orderId: string;
  fulfilmentStatus: 'requested' | 'review' | 'accepted' | 'packing' | 'packed' | 'dispatched' | 'received' | 'cancelled';
  city?: string;
  isTokenVerified: boolean;
}

/**
 * Lencana penjejakan pesanan.
 *
 * Penampilan menggunakan token `--ui-*` yang sama seperti seluruh aplikasi
 * supaya lencana ini mengikut tema light/dark aplikasi.
 */
export const OrderTrackingBadge: React.FC<OrderTrackingBadgeProps> = ({
  orderId,
  fulfilmentStatus,
  city = 'Kuala Lumpur',
  isTokenVerified,
}) => {
  const statusLabels: Record<string, { label: string; tone: string }> = {
    requested: { label: 'Pesanan Dihantar', tone: 'text-[var(--ui-muted)]' },
    review: { label: 'Dalam Semakan', tone: 'text-[var(--ui-muted)]' },
    accepted: { label: 'Diterima', tone: 'text-[var(--ui-muted)]' },
    packing: { label: 'Sedang Dibungkus', tone: 'text-[var(--ui-warning-text)]' },
    packed: { label: 'Dibungkus', tone: 'text-[var(--ui-warning-text)]' },
    dispatched: { label: 'Dalam Penghantaran', tone: 'text-[var(--ui-accent-text)]' },
    received: { label: 'Selesai Diterima', tone: 'text-[var(--ui-success-text)]' },
    cancelled: { label: 'Dibatalkan', tone: 'text-[var(--ui-danger-text)]' },
  };

  const current = statusLabels[fulfilmentStatus] ?? { label: fulfilmentStatus, tone: 'text-[var(--ui-muted)]' };

  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 text-[var(--ui-text)] shadow-[var(--ui-shadow)]">
      <div className="space-y-0.5">
        <span className="font-mono text-xs font-bold text-[var(--ui-text)]">
          {orderId}
        </span>
        <p className="text-xs text-[var(--ui-muted)]">Destinasi: {city}</p>
      </div>

      <div className="flex items-center space-x-2">
        <span className={`rounded-full bg-[var(--ui-soft)] px-2 py-0.5 text-xs font-semibold ${current.tone}`}>
          {current.label}
        </span>
        {isTokenVerified && (
          <span className="h-2 w-2 rounded-full bg-[var(--ui-success-text)]" title="Token Kriptografi Sah" />
        )}
      </div>
    </div>
  );
};
