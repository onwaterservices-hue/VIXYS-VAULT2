import React from 'react';
import { Sparkles, Clock, Gauge, Lock, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';

interface SignalBrainProps {
  signal: PredictionSignal;
  ticker: BTCTicker;
  timeString: string;
  timeframe: '15M' | '1H';
  lockEvaluation: {
    qualified: boolean;
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
    checks: {
      confidence: boolean;
      freshness: boolean;
      liquidity: boolean;
      spread: boolean;
      edge: boolean;
      persistence: boolean;
    };
    reason: string;
    persistenceSeconds: number;
    requiredPersistenceSeconds: number;
  };
}

export const SignalBrain: React.FC<SignalBrainProps> = ({
  signal,
  ticker,
  timeString,
  timeframe,
  lockEvaluation,
}) => {
  const isBullish = signal.direction === 'YES';

  // Lock Score percentage calculation based on checks
  const checkCount = Object.values(lockEvaluation.checks).filter(Boolean).length;
  const totalChecks = Object.keys(lockEvaluation.checks).length;
  const lockScorePct = lockEvaluation.qualified
    ? 100
    : Math.min(95, Math.round((checkCount / totalChecks) * 100));

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 space-y-6 font-mono transition-all duration-500 shadow-2xl ${
        isBullish
          ? 'bg-gradient-to-br from-[#0b241b] via-[#091712] to-[#12082b] border-emerald-500/60 shadow-[0_0_50px_rgba(16,185,129,0.2)]'
          : 'bg-gradient-to-br from-[#2a0b14] via-[#1a060d] to-[#12082b] border-rose-500/60 shadow-[0_0_50px_rgba(244,63,94,0.2)]'
      }`}
    >
      {/* Background Glow Effect */}
      <div
        className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none animate-pulse ${
          isBullish ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />

      {/* Top Header: Brain Badge & Time Remaining */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/40 pb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 font-mono text-xs font-black text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/50 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            🎯 SIGNAL BRAIN
          </span>
          <span className="text-xs text-purple-300/70 font-mono hidden sm:inline">
            {timeframe} Contract Signal Stream
          </span>
        </div>

        {/* Animated Countdown Timer */}
        <div className="flex items-center gap-2 bg-[#0c051f] px-3.5 py-1.5 rounded-xl border border-amber-500/50 text-amber-300 text-xs font-mono font-bold shadow-lg">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Strike Closes In:{' '}
            <strong className="text-white font-mono text-sm tracking-wider">{timeString}</strong>
          </span>
        </div>
      </div>

      {/* Grid: Direction Hero & Lock Score Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
        {/* Left: Direction + Confidence */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs font-mono font-extrabold text-purple-300/80 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            AI DIRECTIONAL CONVICTION
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-6">
            <h1
              className={`text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight uppercase drop-shadow-[0_0_35px_rgba(0,0,0,0.9)] flex items-center gap-3 ${
                isBullish ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isBullish ? '▲ BUY UP' : '▼ BUY DOWN'}
            </h1>

            <div className="flex items-baseline gap-2 bg-[#080315]/95 px-4 py-2.5 rounded-2xl border border-purple-500/50 shadow-2xl">
              <span className="text-4xl sm:text-5xl font-black text-white font-mono">
                {signal.confidence.toFixed(1)}%
              </span>
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                CONFIDENCE
              </span>
            </div>
          </div>

          {/* Key Quick Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-[#080315]/80 p-3 rounded-2xl border border-purple-800/60">
              <span className="text-[10px] text-purple-300/70 font-mono font-bold uppercase block">
                STRIKE TARGET
              </span>
              <span className="text-lg sm:text-xl font-black text-white font-mono">
                ${signal.targetPrice.toLocaleString()}
              </span>
            </div>
            <div className="bg-[#080315]/80 p-3 rounded-2xl border border-purple-800/60">
              <span className="text-[10px] text-purple-300/70 font-mono font-bold uppercase block">
                CURRENT PRICE
              </span>
              <span className="text-lg sm:text-xl font-black text-cyan-300 font-mono">
                ${ticker.price.toLocaleString()}
              </span>
            </div>
            <div className="bg-[#080315]/80 p-3 rounded-2xl border border-purple-800/60">
              <span className="text-[10px] text-purple-300/70 font-mono font-bold uppercase block">
                MODEL EDGE
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                +{signal.edgePct.toFixed(1)}%
              </span>
            </div>
            <div className="bg-[#080315]/80 p-3 rounded-2xl border border-purple-800/60">
              <span className="text-[10px] text-purple-300/70 font-mono font-bold uppercase block">
                GRADE
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-300 font-mono">
                {signal.tradeGrade}
              </span>
            </div>
          </div>
        </div>

        {/* Right: LOCK SCORE PROGRESS BAR */}
        <div className="lg:col-span-5 bg-[#070214]/90 p-5 rounded-2xl border border-purple-800/70 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-purple-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-cyan-400" /> PREDICTION LOCK SCORE
            </span>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider transition-all duration-300 ${
                lockScorePct === 100
                  ? 'bg-emerald-500 text-black border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse'
                  : 'bg-purple-900/80 text-purple-200 border border-purple-700/50'
              }`}
            >
              {lockScorePct === 100 ? '🔒 LOCKED 100%' : `${lockScorePct}% QUALIFYING`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-purple-300/80">Lock Verification Progress:</span>
              <span className="text-white font-black">{lockScorePct}%</span>
            </div>
            <div className="w-full bg-[#13072b] h-4 rounded-full overflow-hidden border border-purple-800/60 p-0.5 relative">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  lockScorePct === 100
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_20px_rgba(52,211,153,0.9)]'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400'
                }`}
                style={{ width: `${lockScorePct}%` }}
              />
            </div>
          </div>

          {/* Required Criteria Check Grid */}
          <div className="space-y-2 pt-2 border-t border-purple-900/40">
            <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">
              Waiting on Confluence Checks:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-purple-200">
                <span className={lockEvaluation.checks.confidence ? 'text-emerald-400' : 'text-purple-500'}>
                  {lockEvaluation.checks.confidence ? '✓' : '○'}
                </span>
                <span>Confidence Threshold</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-200">
                <span className={lockEvaluation.checks.liquidity ? 'text-emerald-400' : 'text-purple-500'}>
                  {lockEvaluation.checks.liquidity ? '✓' : '○'}
                </span>
                <span>Orderbook Depth</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-200">
                <span className={lockEvaluation.checks.edge ? 'text-emerald-400' : 'text-purple-500'}>
                  {lockEvaluation.checks.edge ? '✓' : '○'}
                </span>
                <span>Taker Delta Flow</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-200">
                <span className={lockEvaluation.checks.persistence ? 'text-emerald-400' : 'text-purple-500'}>
                  {lockEvaluation.checks.persistence ? '✓' : '○'}
                </span>
                <span>Signal Persistence</span>
              </div>
            </div>
          </div>

          {/* Locked Flash Banner when 100% */}
          {lockScorePct === 100 && (
            <div className="bg-emerald-950/90 border border-emerald-500/80 rounded-xl p-2.5 text-center text-xs font-extrabold text-emerald-300 animate-pulse shadow-lg flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>FINAL LOCK CONFIRMED • HIGH-CONVICTION TRADE EXECUTION READY</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
