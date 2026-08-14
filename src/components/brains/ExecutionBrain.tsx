import React from 'react';
import { Target } from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';
import { safeNumber, safeToFixed } from '../../utils/numeric';

interface ExecutionBrainProps {
  signal?: PredictionSignal | null;
  ticker?: BTCTicker | null;
}

export const ExecutionBrain: React.FC<ExecutionBrainProps> = ({ signal, ticker }) => {
  const isBull = signal?.direction === 'YES';
  const idealBid = (venueOddsPrice: number) => Math.max(0.10, Math.round((venueOddsPrice - 0.06) * 100) / 100);

  const currentBid = safeNumber(signal?.venueOdds?.kalshiYesPrice, 0.54);
  const targetBid = idealBid(currentBid);

  return (
    <div className="bg-[#030108] rounded-3xl border border-purple-800/70 p-6 space-y-5 font-mono shadow-2xl relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 font-mono text-xs font-black text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/50 shadow-sm">
            <Target className="w-4 h-4 text-amber-400" />
            📈 QUANT EXECUTION DESK
          </span>
          <span className="text-xs text-purple-300/80 hidden sm:inline tracking-wider">
            OPTIMAL LIMIT BID & SIZING PARAMETERS
          </span>
        </div>

        <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-xs font-black px-3 py-1 rounded-xl">
          1.86x +EV RATIO
        </span>
      </div>

      {/* Entry Zone & Scaling Parameters Grid (2x2 grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Ideal Bid / Ask */}
        <div className="bg-[#060210] p-4 rounded-2xl border border-purple-800/60 space-y-1">
          <div className="text-[10px] text-purple-300/70 uppercase font-bold">Optimal Limit Bid</div>
          <div className="text-2xl font-black text-emerald-400">${safeToFixed(targetBid, 2)} {isBull ? 'YES' : 'NO'}</div>
          <div className="text-[10px] text-purple-400">Current Ask: ${safeToFixed(currentBid, 2)}</div>
        </div>

        {/* Entry Zone Range */}
        <div className="bg-[#060210] p-4 rounded-2xl border border-purple-800/60 space-y-1">
          <div className="text-[10px] text-purple-300/70 uppercase font-bold">Execution Spread</div>
          <div className="text-2xl font-black text-white">${safeToFixed(targetBid, 2)} - ${safeToFixed(currentBid, 2)}</div>
          <div className="text-[10px] text-emerald-400 font-bold">High +EV Window</div>
        </div>

        {/* Scaling Suggestion */}
        <div className="bg-[#060210] p-4 rounded-2xl border border-purple-800/60 space-y-1">
          <div className="text-[10px] text-purple-300/70 uppercase font-bold">Scaling Guidance</div>
          <div className="text-2xl font-black text-amber-300">50% / 50%</div>
          <div className="text-[10px] text-purple-300/80">Scale half now, half on dip</div>
        </div>

        {/* Max Risk Exposure */}
        <div className="bg-[#060210] p-4 rounded-2xl border border-purple-800/60 space-y-1">
          <div className="text-[10px] text-purple-300/70 uppercase font-bold">Risk Management Cap</div>
          <div className="text-2xl font-black text-rose-400">MAX 5.0% PORTFOLIO</div>
          <div className="text-[10px] text-purple-300/80">Never over-leverage single window</div>
        </div>
      </div>
    </div>
  );
};
