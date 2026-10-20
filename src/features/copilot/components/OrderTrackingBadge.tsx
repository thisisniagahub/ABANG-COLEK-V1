import React from 'react';

export interface OrderTrackingBadgeProps {
  orderId: string;
  fulfilmentStatus: 'requested' | 'review' | 'accepted' | 'packing' | 'packed' | 'dispatched' | 'received' | 'cancelled';
  city?: string;
  isTokenVerified: boolean;
}

export const OrderTrackingBadge: React.FC<OrderTrackingBadgeProps> = ({
  orderId,
  fulfilmentStatus,
  city = 'Kuala Lumpur',
  isTokenVerified,
}) => {
  const statusLabels: Record<string, { label: string; color: string }> = {
    requested: { label: 'Pesanan Dihantar', color: 'bg-zinc-100 text-zinc-800' },
    packing: { label: 'Sedang Dibungkus', color: 'bg-amber-100 text-amber-800' },
    dispatched: { label: 'Dalam Penghantaran', color: 'bg-blue-100 text-blue-800' },
    received: { label: 'Selesai Diterima', color: 'bg-emerald-100 text-emerald-800' },
    cancelled: { label: 'Dibatalkan', color: 'bg-rose-100 text-rose-800' },
  };

  const current = statusLabels[fulfilmentStatus] || { label: fulfilmentStatus, color: 'bg-zinc-100 text-zinc-800' };

  return (
    <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm flex items-center justify-between font-sans">
      <div className="space-y-0.5">
        <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
          {orderId}
        </span>
        <p className="text-xs text-zinc-500">Destinasi: {city}</p>
      </div>

      <div className="flex items-center space-x-2">
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${current.color}`}>
          {current.label}
        </span>
        {isTokenVerified && (
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Token Kriptografi Sah" />
        )}
      </div>
    </div>
  );
};
