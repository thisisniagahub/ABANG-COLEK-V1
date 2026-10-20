import React from 'react';

export interface OperationsBriefCardProps {
  outletId: string;
  date: string;
  openOrdersCount: number;
  totalCollectedCashSen: number;
  pendingDeliveriesCount: number;
  qcAlertCount: number;
}

/**
 * Kad taklimat operasi.
 *
 * Penampilan menggunakan token `--ui-*` yang sama seperti seluruh aplikasi
 * (lihat `src/features/theme/workspace-theme.css`) supaya kad ini mengikut
 * tema light/dark aplikasi, bukan palet tetap atau varian `dark:` Tailwind
 * yang tidak dikawal oleh `data-theme` shell.
 */
export const OperationsBriefCard: React.FC<OperationsBriefCardProps> = ({
  outletId,
  date,
  openOrdersCount,
  totalCollectedCashSen,
  pendingDeliveriesCount,
  qcAlertCount,
}) => {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[var(--ui-text)]">
            Ringkasan Operasi Harian (GUI-05 / ADV-03)
          </h4>
          <p className="font-mono text-xs text-[var(--ui-muted)]">
            Cawangan: {outletId} • Tarikh: {date}
          </p>
        </div>
        {qcAlertCount > 0 ? (
          <span className="rounded-full bg-[var(--ui-soft)] px-2 py-0.5 text-xs font-bold text-[var(--ui-warning-text)]">
            {qcAlertCount} Amaran QC
          </span>
        ) : (
          <span className="rounded-full bg-[var(--ui-soft)] px-2 py-0.5 text-xs font-bold text-[var(--ui-success-text)]">
            Operasi Lancar
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-[var(--ui-border)] pt-2 text-center">
        <div className="rounded-lg bg-[var(--ui-soft)] p-2">
          <span className="text-xs text-[var(--ui-muted)]">Pesanan Terbuka</span>
          <p className="font-mono text-base font-bold text-[var(--ui-text)]">
            {openOrdersCount}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--ui-soft)] p-2">
          <span className="text-xs text-[var(--ui-muted)]">Tunai Dikutip</span>
          <p className="font-mono text-base font-bold text-[var(--ui-text)]">
            RM {(totalCollectedCashSen / 100).toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--ui-soft)] p-2">
          <span className="text-xs text-[var(--ui-muted)]">Penghantaran</span>
          <p className="font-mono text-base font-bold text-[var(--ui-text)]">
            {pendingDeliveriesCount}
          </p>
        </div>
      </div>
    </div>
  );
};
