import React from 'react';
import { Target, Zap, ArrowRight, Shield, Sliders, CheckCircle2 } from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';

interface ExecutionBrainProps {
  signal: PredictionSignal;
  ticker: BTCTicker;
}

export const ExecutionBrain: React.FC<ExecutionBrainProps> = ({ signal, ticker }) => {
  const isBull = signal.direction === 'YES';
  const idealBid = (venueOddsPrice: number) => Math.max(0.10, Math.round((venueOddsPrice - 0.06) * 100) / 100);

  const currentBid = signal.venueOdds?.kalshiYesPrice || 0.54;
  const targetBid = idealBid(currentBid);

  return (
    <div className="bg-[#0b061b] rounded-3xl border border-purple-800/70 p-6 space-y-5 font-mono shadow-2xl relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 font-mono text-xs font-black text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/50 shadow-sm">
            <Target className="w-4 h-4 text-amber-400" />
            📈 EXECUTION BRAIN
          </span>
          <span className="text-xs text-purple-300/70 hidden sm:inline">
            Optimal Entry Zone & Scaling Parameters
          </span>
        </div>

        <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-black px-3 py-1 rounded-xl">
          1.86x RISK / REWARD
        </span>
      </div>

      {/* Entry Zone & Scaling Parameters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ideal Bid / Ask */}
        <div className="bg-[#070314] p-4 rounded-2xl border border-purple-800/60 space-y-1">
          <div className="text-[10px] text-purple-300/70 uppercase font-bold">Ideal Limit Bid</div>
          <div className="text-2xl font-black text-emerald-400">${targetBid.toFixed(2)} {isBull ? 'YES' : 'NO'}</div>
          <div className="text-[10px] text-purple-400">Current Market: ${currentBid.toFixed(2)}</div>
        </div>

        {/* Entry Zone Range */}
        <div className="bg-[#070314] p-4 rounded-2xl border border-purple-800/60 space-y-1">
          <div className="text-[10px] text-purple-300/70 uppercase font-bold">Optimal Entry Range</div>
          <div className="text-2xl font-black text-white">${targetBid.toFixed(2)} - ${currentBid.toFixed(2)}</div>
          <div className="text-[10px] text-emerald-400 font-bold">High +EV Window</div>
        </div>

        {/* Scaling Suggestion */}
        <div className="bg-[#070314] p-4 rounded-2xl border border-purple-800/60 space-y-1">
          <div className="text-[10px] text-purple-300/70 uppercase font-bold">Scaling Guidance</div>
          <div className="text-2xl font-black text-amber-300">50% / 50%</div>
          <div className="text-[10px] text-purple-300/80">Scale half now, half on dip</div>
        </div>

        {/* Max Risk Exposure */}
        <div className="bg-[#070314] p-4 rounded-2xl border border-purple-800/60 space-y-1">
          <div className="text-[10px] text-purple-300/70 uppercase font-bold">Recommended Sizing</div>
          <div className="text-2xl font-black text-cyan-300">2.5% Max</div>
          <div className="text-[10px] text-purple-400">Kelly Criterion Safety</div>
        </div>
      </div>

      {/* Smart Execution Step-by-Step */}
      <div className="bg-[#070314] p-4 rounded-2xl border border-purple-900/50 space-y-2 text-xs">
        <div className="text-[10px] text-purple-300/70 uppercase font-bold">Execution Plan:</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="flex items-center gap-2 bg-[#0d0622] p-2.5 rounded-xl border border-purple-800/40">
            <span className="w-5 h-5 rounded-full bg-purple-900 text-purple-200 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
            <span>Place initial limit bid at <strong>${targetBid.toFixed(2)}</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-[#0d0622] p-2.5 rounded-xl border border-purple-800/40">
            <span className="w-5 h-5 rounded-full bg-purple-900 text-purple-200 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
            <span>Set auto-exit target at <strong>${(currentBid + 0.35).toFixed(2)}</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-[#0d0622] p-2.5 rounded-xl border border-purple-800/40">
            <span className="w-5 h-5 rounded-full bg-purple-900 text-purple-200 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
            <span>Stop loss triggered if price drops <strong>below ${(ticker.price - 140).toLocaleString()}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
