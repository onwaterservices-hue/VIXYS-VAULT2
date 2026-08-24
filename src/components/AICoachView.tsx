import React, { useState } from 'react';
import {
  Compass,
  Brain,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  Sliders,
  Sparkles,
  ArrowUpRight,
  Zap,
} from 'lucide-react';

export const AICoachView: React.FC = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<'BALANCED' | 'AGGRESSIVE' | 'INSTITUTIONAL'>('BALANCED');

  return (
    <div className="space-y-6 font-sans text-slate-200">
      {/* Header */}
      <div className="bg-[#0a0518] rounded-2xl border border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-1">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Interactive Risk & Execution Masterclass</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">AI Trading Coach</h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Understand why predictions cap at specific confidence levels and learn optimal entry/exit risk profiles.
          </p>
        </div>

        {/* Strategy Profile Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0c0620] p-1.5 rounded-xl border border-slate-800 font-mono">
          {(['BALANCED', 'AGGRESSIVE', 'INSTITUTIONAL'] as const).map((strat) => (
            <button
              key={strat}
              onClick={() => setSelectedStrategy(strat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStrategy === strat
                  ? 'bg-purple-600 text-white font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {strat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Question: "Why isn't this 99%?" Breakdown */}
        <div className="bg-[#0a0518] rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider">
                "WHY ISN'T THIS 99%?" (CONFIDENCE CAP AUDIT)
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
              CURRENT CAP: 91%
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The VIXY model never publishes 99% or 100% confidence to prevent over-leveraging and respect natural market tail risk. Here is why the current BTC signal is capped at <strong>91%</strong>:
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div className="bg-[#0c0620] p-3.5 rounded-xl border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Limiting Factor #1: Overhead Resistance Wall
                </span>
                <span className="text-slate-400 text-[10px]">-4.0% Conf Cap</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-snug">
                Ask depth wall of 142 BTC sitting at $64,280 strike. Price must clear this liquidity wall to guarantee momentum expansion.
              </p>
            </div>

            <div className="bg-[#0c0620] p-3.5 rounded-xl border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Limiting Factor #2: 1m Short-Term Momentum Deceleration
                </span>
                <span className="text-slate-400 text-[10px]">-3.0% Conf Cap</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-snug">
                While 5m and 15m order flow deltas are strongly positive, the 1-minute quote velocity shows brief consolidation.
              </p>
            </div>
          </div>

          <div className="bg-[#0c0620] p-4 rounded-xl border border-purple-500/30 space-y-2 font-mono text-xs">
            <span className="text-purple-300 font-bold block uppercase tracking-wider text-[11px]">
              💡 AI Coach Execution Recommendation:
            </span>
            <ul className="space-y-1.5 text-slate-300 text-[11px] font-sans">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Wait for price to clear <strong>$64,280</strong> on aggressive taker volume.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Or place limit bids on a pullback toward <strong>$64,120 VWAP floor</strong> to maximize your expected edge (+14.2%).</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Strategy Profiler & Risk Management Engine */}
        <div className="bg-[#0a0518] rounded-2xl border border-slate-800 p-6 space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                STRATEGY PROFILE: {selectedStrategy}
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Adjusts confidence thresholds and minimum edge required before executing signals.
              </p>
            </div>
            <span className="text-xs text-purple-400 font-bold">ACTIVE PROFILE</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-[#0c0620] p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Min Confidence Threshold:</span>
                <span className="text-white font-bold">{selectedStrategy === 'AGGRESSIVE' ? '75%' : selectedStrategy === 'INSTITUTIONAL' ? '90%' : '82%'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Minimum Expected Edge:</span>
                <span className="text-emerald-400 font-bold">{selectedStrategy === 'AGGRESSIVE' ? '+5.0%' : selectedStrategy === 'INSTITUTIONAL' ? '+12.0%' : '+8.0%'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Portfolio Allocation / Trade:</span>
                <span className="text-purple-300 font-bold">{selectedStrategy === 'AGGRESSIVE' ? '10%' : selectedStrategy === 'INSTITUTIONAL' ? '2.5%' : '5%'}</span>
              </div>
            </div>

            <div className="bg-[#0c0620] p-3.5 rounded-xl border border-slate-800 space-y-2 font-sans text-xs">
              <span className="font-bold text-white font-mono uppercase text-[11px] block">
                Recommended Risk Management Rule
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                If market price moves 15% against model entry before expiry, cut contract risk immediately to protect principal and preserve long-term mathematical expected value (+EV).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
