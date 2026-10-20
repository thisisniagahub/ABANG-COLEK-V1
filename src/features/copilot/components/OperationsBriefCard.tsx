import React from 'react';

export interface OperationsBriefCardProps {
  outletId: string;
  date: string;
  openOrdersCount: number;
  totalCollectedCashSen: number;
  pendingDeliveriesCount: number;
  qcAlertCount: number;
}

export const OperationsBriefCard: React.FC<OperationsBriefCardProps> = ({
  outletId,
  date,
  openOrdersCount,
  totalCollectedCashSen,
  pendingDeliveriesCount,
  qcAlertCount,
}) => {
  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Ringkasan Operasi Harian (GUI-05 / ADV-03)
          </h4>
          <p className="text-xs text-zinc-500 font-mono">
            Cawangan: {outletId} • Tarikh: {date}
          </p>
        </div>
        {qcAlertCount > 0 ? (
          <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 rounded-full">
            {qcAlertCount} Amaran QC
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-900 rounded-full">
            Operasi Lancar
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg">
          <span className="text-xs text-zinc-500">Pesanan Terbuka</span>
          <p className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {openOrdersCount}
          </p>
        </div>
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg">
          <span className="text-xs text-zinc-500">Tunai Dikutip</span>
          <p className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            RM {(totalCollectedCashSen / 100).toFixed(2)}
          </p>
        </div>
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg">
          <span className="text-xs text-zinc-500">Penghantaran</span>
          <p className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {pendingDeliveriesCount}
          </p>
        </div>
      </div>
    </div>
  );
};
