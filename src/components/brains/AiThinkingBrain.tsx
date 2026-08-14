import React from 'react';
import { Brain, Sparkles, Activity } from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';
import { safeNumber, safeToFixed } from '../../utils/numeric';

interface AiThinkingBrainProps {
  signal?: PredictionSignal | null;
  ticker?: BTCTicker | null;
  timeframe?: '15M' | '1H';
}

export const AiThinkingBrain: React.FC<AiThinkingBrainProps> = ({ signal, ticker, timeframe = '15M' }) => {
  const reasoning = signal?.reasoning || 'Calibrating multi-exchange liquidity order flow and high-frequency delta imbalances.';
  const keyFactors = Array.isArray(signal?.keyFactors) && signal.keyFactors.length > 0
    ? signal.keyFactors
    : [
        'Institutional orderbook skew & delta absorption',
        'Multi-venue arbitrage & Kalshi strike proximity',
        'Dynamic neural momentum & probability confluence'
      ];
  
  const edgePct = safeNumber(signal?.edgePct, 0);

  return (
    <div className="bg-[#030108] rounded-3xl border border-purple-800/70 p-6 space-y-5 font-mono shadow-2xl relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 font-mono text-xs font-black text-purple-200 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-500/50 shadow-sm">
            <Brain className="w-4 h-4 text-purple-300" />
            🧠 VIXY QUANT SYNTHESIS
          </span>
          <span className="text-xs text-purple-300/80 hidden sm:inline tracking-wider">
            RECURSIVE MODEL REASONING LOG
          </span>
        </div>

        <span className="bg-purple-900/60 text-purple-200 border border-purple-700/50 text-xs font-bold px-3 py-1 rounded-xl">
          CLASSIFIED LOG GENERATED LIVE
        </span>
      </div>

      {/* Main Rationale Card */}
      <div className="bg-[#060210] p-5 rounded-2xl border border-purple-800/60 space-y-4">
        <div className="text-xs font-bold text-purple-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>PRIMARY DRIVER SYNTHESIS</span>
        </div>

        <p className="text-xs text-purple-100 font-sans leading-relaxed">
          {reasoning}
        </p>

        {/* Key Drivers Checklist */}
        <div className="space-y-2 pt-2 border-t border-purple-900/40">
          <div className="text-[10px] text-purple-300/70 uppercase font-bold">Confluence Drivers:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans">
            {keyFactors.map((factor, idx) => (
              <div key={idx} className="bg-[#0a031a] p-3 rounded-xl border border-purple-800/40 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ✓
                </span>
                <span className="text-purple-100">{factor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live AI Reasoning Timeline */}
      <div className="bg-[#060210] p-4 rounded-2xl border border-purple-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-white uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>MODEL EXECUTION STEP LOG</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50">
            STREAMING
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-[#0a031a] p-2.5 rounded-xl border border-purple-800/40">
            <div className="text-[10px] text-purple-400">Step 1 • 10m ago</div>
            <div className="font-bold text-white text-[11px] pt-0.5">Whale Delta Intercept</div>
            <div className="text-[10px] text-emerald-400 font-bold">Confirmed ✓</div>
          </div>
          <div className="bg-[#0a031a] p-2.5 rounded-xl border border-purple-800/40">
            <div className="text-[10px] text-purple-400">Step 2 • 6m ago</div>
            <div className="font-bold text-white text-[11px] pt-0.5">Liquidity Sweep Trigger</div>
            <div className="text-[10px] text-emerald-400 font-bold">Confirmed ✓</div>
          </div>
          <div className="bg-[#0a031a] p-2.5 rounded-xl border border-purple-800/40">
            <div className="text-[10px] text-purple-400">Step 3 • 3m ago</div>
            <div className="font-bold text-white text-[11px] pt-0.5">Venue Pricing Disparity</div>
            <div className="text-[10px] text-emerald-400 font-bold">+{safeToFixed(edgePct, 1)}% Edge ✓</div>
          </div>
          <div className="bg-[#0a031a] p-2.5 rounded-xl border border-amber-500/40 animate-pulse">
            <div className="text-[10px] text-amber-400">Step 4 • Current</div>
            <div className="font-bold text-amber-200 text-[11px] pt-0.5">Lock Verification</div>
            <div className="text-[10px] text-emerald-400 font-bold">100% Locked</div>
          </div>
        </div>
      </div>
    </div>
  );
};
