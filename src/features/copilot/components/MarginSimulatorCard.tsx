import React from 'react';

export interface MarginSimulatorCardProps {
  netSalesSen: number;
  cogsSen: number;
  contributionSen: number;
  marginBps: number;
  minimumMarginBps?: number;
  status: 'passed' | 'failed';
}

/**
 * Kad simulasi margin sumbangan (FIN-01).
 *
 * Penampilan menggunakan token `--ui-*` yang sama seperti seluruh aplikasi
 * (lihat `src/features/theme/workspace-theme.css`) supaya kad ini mengikut
 * tema light/dark aplikasi, bukan palet tetap atau varian `dark:` Tailwind
 * yang tidak dikawal oleh `data-theme` shell.
 *
 * NOTE: komponen ini belum dipasang (unmounted) dalam aplikasi — A2UI
 * `MarginSimulator` dipaparkan melalui `MarginSummaryCard`.
 */
export const MarginSimulatorCard: React.FC<MarginSimulatorCardProps> = ({
  netSalesSen,
  cogsSen,
  contributionSen,
  marginBps,
  minimumMarginBps = 2500,
  status,
}) => {
  const marginPct = (marginBps / 100).toFixed(2);
  const minPct = (minimumMarginBps / 100).toFixed(2);
  const netSalesRm = (netSalesSen / 100).toFixed(2);
  const contributionRm = (contributionSen / 100).toFixed(2);

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-[var(--ui-shadow)]">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--ui-text)]">
          Simulasi Margin Sumbangan (FIN-01)
        </h4>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            status === 'passed'
              ? 'bg-[var(--ui-soft)] text-[var(--ui-success-text)]'
              : 'bg-[var(--ui-soft)] text-[var(--ui-danger-text)]'
          }`}
        >
          {status === 'passed' ? 'LULUS MARGIN' : 'SEKATAN POLISI'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[var(--ui-border)] pt-2 text-xs">
        <div className="rounded-lg bg-[var(--ui-soft)] p-2">
          <span className="text-[var(--ui-muted)]">Jualan Bersih (RM):</span>
          <p className="font-mono text-sm font-bold text-[var(--ui-text)]">
            RM {netSalesRm}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--ui-soft)] p-2">
          <span className="text-[var(--ui-muted)]">Sumbangan Bersih (RM):</span>
          <p className="font-mono text-sm font-bold text-[var(--ui-text)]">
            RM {contributionRm}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--ui-border)] pt-2 text-xs">
        <span className="text-[var(--ui-muted)]">Ratio Margin Dicapai:</span>
        <span className="font-mono font-bold text-[var(--ui-text)]">
          {marginPct}% (Minima: {minPct}%)
        </span>
      </div>
    </div>
  );
};
