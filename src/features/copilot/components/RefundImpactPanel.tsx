import React from 'react';

export interface RefundLineAllocation {
  id: string;
  name?: string;
  allocatedSen: number;
}

export interface RefundImpactPanelProps {
  orderId: string;
  requestedRefundSen: number;
  totalAllocatedSen: number;
  allocations: RefundLineAllocation[];
  driftSen: number;
}

/**
 * Panel kesan bayaran balik.
 *
 * Penampilan menggunakan token `--ui-*` yang sama seperti seluruh aplikasi
 * supaya panel ini mengikut tema light/dark aplikasi.
 */
export const RefundImpactPanel: React.FC<RefundImpactPanelProps> = ({
  orderId,
  requestedRefundSen,
  totalAllocatedSen,
  allocations,
  driftSen = 0,
}) => {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--ui-text)]">
          Agihan Bayaran Balik Largest-Remainder (PAY-03)
        </h4>
        <span className="font-mono text-xs text-[var(--ui-muted)]">Pesanan: {orderId}</span>
      </div>

      <div className="space-y-2">
        {allocations.map(line => (
          <div
            key={line.id}
            className="flex items-center justify-between rounded-md bg-[var(--ui-soft)] p-2 text-xs"
          >
            <span className="font-medium text-[var(--ui-text)]">{line.name || line.id}</span>
            <span className="font-mono font-bold text-[var(--ui-text)]">
              RM {(line.allocatedSen / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--ui-border)] pt-2 text-xs">
        <span className="text-[var(--ui-muted)]">Jumlah Agihan:</span>
        <span className="font-mono font-bold text-[var(--ui-text)]">
          RM {(totalAllocatedSen / 100).toFixed(2)} (Drift: {driftSen} sen)
        </span>
      </div>
    </div>
  );
};
