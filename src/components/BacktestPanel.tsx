import React, { useEffect, useState } from 'react';

interface MonthlyRow {
  month: string;
  wins: number;
  losses: number;
  total: number;
  winRatePct: number;
}

interface BacktestSummary {
  available: boolean;
  modelName?: string;
  threshPct?: number;
  totalCycles?: number;
  decided?: number;
  skipped?: number;
  wins?: number;
  losses?: number;
  winRatePct?: number;
  monthly?: MonthlyRow[];
  generatedAt?: string;
  dataSource?: string;
  disclaimer?: string;
  message?: string;
}

export const BacktestPanel: React.FC = () => {
  const [data, setData] = useState<BacktestSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/backtest/summary')
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setData(j); })
      .catch(() => { if (!cancelled) setData({ available: false, message: 'Unable to load backtest data.' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 text-xs text-zinc-500 font-mono">
        Loading backtest data...
      </div>
    );
  }

  if (!data || !data.available) {
    return null;
  }

  const winRate = data.winRatePct ?? 0;
  const barColor = winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div className="rounded-2xl border border-cyan-900/40 bg-cyan-950/10 p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">
            Backtest &middot; Historical Research Model &middot; Not Live
          </div>
          <div className="text-sm font-bold text-white">{data.modelName || 'BTC 15m Backtest'}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-white">{winRate.toFixed(1)}%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            {(data.decided || 0).toLocaleString()} decided cycles
          </div>
        </div>
      </div>

      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, winRate)}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-zinc-800 bg-black/30 py-2">
          <div className="text-sm font-bold text-emerald-400">{data.wins ?? 0}</div>
          <div className="text-[9px] text-zinc-500 uppercase">Wins</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/30 py-2">
          <div className="text-sm font-bold text-rose-400">{data.losses ?? 0}</div>
          <div className="text-[9px] text-zinc-500 uppercase">Losses</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/30 py-2">
          <div className="text-sm font-bold text-zinc-300">{(data.totalCycles ?? 0).toLocaleString()}</div>
          <div className="text-[9px] text-zinc-500 uppercase">Total Cycles</div>
        </div>
      </div>

      {data.monthly && data.monthly.length > 0 && (
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">Monthly breakdown</div>
          <div className="flex flex-wrap gap-1">
            {data.monthly.map((m) => (
              <div
                key={m.month}
                title={`${m.month}: ${m.wins}W/${m.losses}L (${m.winRatePct}%)`}
                className={`text-[9px] font-mono px-1.5 py-1 rounded ${m.winRatePct >= 50 ? 'bg-emerald-950/60 text-emerald-300' : 'bg-rose-950/60 text-rose-300'}`}
              >
                {m.month.slice(5)}: {m.winRatePct}%
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[10px] text-zinc-500 leading-relaxed border-t border-zinc-800 pt-3">
        {data.disclaimer || 'Historical research model. Not the live decision engine and not merged into the live win rate.'}
        {data.dataSource ? ` Source: ${data.dataSource}.` : ''}
        {data.generatedAt ? ` Last run: ${new Date(data.generatedAt).toLocaleDateString()}.` : ''}
      </div>
    </div>
  );
};
