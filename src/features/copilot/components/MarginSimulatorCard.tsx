import React from 'react';

export interface MarginSimulatorCardProps {
  netSalesSen: number;
  cogsSen: number;
  contributionSen: number;
  marginBps: number;
  minimumMarginBps?: number;
  status: 'passed' | 'failed';
}

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
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Simulasi Margin Sumbangan (FIN-01)
        </h4>
        <span
          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
            status === 'passed'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
          }`}
        >
          {status === 'passed' ? 'LULUS MARGIN' : 'SEKATAN POLISI'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-zinc-500">Jualan Bersih (RM):</span>
          <p className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">
            RM {netSalesRm}
          </p>
        </div>
        <div>
          <span className="text-zinc-500">Sumbangan Bersih (RM):</span>
          <p className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">
            RM {contributionRm}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs">
        <span className="text-zinc-500">Ratio Margin Dicapai:</span>
        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
          {marginPct}% (Minima: {minPct}%)
        </span>
      </div>
    </div>
  );
};
