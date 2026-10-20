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

export const RefundImpactPanel: React.FC<RefundImpactPanelProps> = ({
  orderId,
  requestedRefundSen,
  totalAllocatedSen,
  allocations,
  driftSen = 0,
}) => {
  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Agihan Bayaran Balik Largest-Remainder (PAY-03)
        </h4>
        <span className="font-mono text-xs text-zinc-500">Pesanan: {orderId}</span>
      </div>

      <div className="space-y-2">
        {allocations.map(line => (
          <div
            key={line.id}
            className="flex justify-between items-center text-xs p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-md"
          >
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">{line.name || line.id}</span>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              RM {(line.allocatedSen / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs">
        <span className="text-zinc-500">Jumlah Agihan:</span>
        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
          RM {(totalAllocatedSen / 100).toFixed(2)} (Drift: {driftSen} sen)
        </span>
      </div>
    </div>
  );
};
