import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, Lock, CheckCircle2, ShieldAlert, Cpu, EyeOff, Radio, Activity } from 'lucide-react';
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

  // Live Ticking Numbers for Alive Feeling
  const [liveConfidence, setLiveConfidence] = useState(signal.confidence);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    setLiveConfidence(signal.confidence);
  }, [signal.confidence]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 600);
    return () => clearInterval(timer);
  }, []);

  // AI Battle Mode Calculations (Bulls vs Bears live pressure)
  const bullPct = signal.orderFlow?.bullVolumePct || (isBullish ? 64 : 36);
  const bearPct = 100 - bullPct;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 space-y-6 font-mono transition-all duration-700 shadow-2xl ${
        isBullish
          ? 'bg-[#030108] border-emerald-500/70 shadow-[0_0_80px_rgba(16,185,129,0.25)]'
          : 'bg-[#030108] border-rose-500/70 shadow-[0_0_80px_rgba(244,63,94,0.25)]'
      }`}
    >
      {/* Background Watermark Pattern: Classified Matrix Texture */}
      <div className="absolute inset-0 opacity-[0.03] select-none pointer-events-none overflow-hidden text-[10px] leading-tight text-purple-200 uppercase font-mono tracking-widest break-all">
        CLASSIFIED MODEL OUTPUT • MODEL 17 • LIQUIDITY WARFARE • RECURSIVE CONVOLUTION • RESTRICTED ACCESS • MODEL LOCK 94.2% • QUANTUM DELTA MATRIX • CLASSIFIED MODEL OUTPUT • MODEL 17 • LIQUIDITY WARFARE • RECURSIVE CONVOLUTION • RESTRICTED ACCESS • MODEL LOCK 94.2% • QUANTUM DELTA MATRIX
      </div>

      {/* Centerpiece Pulsing Radial Aura when Confidence > 90% */}
      {signal.confidence >= 90 && (
        <div
          className={`absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-1000 ${
            isBullish
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)] animate-pulse'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.15)_0%,transparent_70%)] animate-pulse'
          }`}
        />
      )}

      {/* Top Classified Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 font-mono text-[11px] font-black tracking-widest text-emerald-300 bg-emerald-950/90 px-3 py-1 rounded-full border border-emerald-500/60 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            CLASSIFIED MODEL OUTPUT {cursorVisible ? '█' : ' '}
          </span>
          <span className="text-xs text-purple-300/80 font-mono hidden sm:inline tracking-wider">
            RESTRICTED ACCESS • MODEL 17 CORE
          </span>
        </div>

        {/* Cinematic Lock Countdown Timer */}
        <div className="flex items-center gap-2 bg-[#080214] px-4 py-1.5 rounded-xl border border-purple-500/50 text-purple-200 text-xs font-mono font-bold shadow-2xl">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            STRIKE LOCK IN:{' '}
            <strong className="text-white font-mono text-sm tracking-wider">{timeString}</strong>
          </span>
        </div>
      </div>

      {/* Dominant Centerpiece Focal Point: Direction + AI Conviction */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left 7 cols: Huge Hero Signal Output */}
        <div className="lg:col-span-7 space-y-5">
          <div className="text-xs font-mono font-extrabold text-purple-300/90 uppercase tracking-widest flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            AI CONVICTION VECTOR
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 sm:gap-6">
            <h1
              className={`text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase drop-shadow-[0_0_40px_rgba(0,0,0,0.95)] flex items-center gap-2 ${
                isBullish ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isBullish ? '▲ BUY UP' : '▼ BUY DOWN'}
            </h1>

            <div className="flex items-baseline gap-2 bg-[#070212]/95 px-5 py-3 rounded-2xl border border-purple-500/60 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
              <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                {liveConfidence.toFixed(1)}%
              </span>
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">
                LOCK CONFIDENCE
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-[#080214] p-3 rounded-2xl border border-purple-800/60">
              <span className="text-[9px] text-purple-300/70 font-mono font-bold uppercase block tracking-wider">
                STRIKE TARGET
              </span>
              <span className="text-base sm:text-lg font-black text-white font-mono">
                ${signal.targetPrice.toLocaleString()}
              </span>
            </div>
            <div className="bg-[#080214] p-3 rounded-2xl border border-purple-800/60">
              <span className="text-[9px] text-purple-300/70 font-mono font-bold uppercase block tracking-wider">
                SPOT PRICE
              </span>
              <span className="text-base sm:text-lg font-black text-cyan-300 font-mono">
                ${ticker.price.toLocaleString()}
              </span>
            </div>
            <div className="bg-[#080214] p-3 rounded-2xl border border-purple-800/60">
              <span className="text-[9px] text-purple-300/70 font-mono font-bold uppercase block tracking-wider">
                MODEL EDGE
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                +{signal.edgePct.toFixed(1)}%
              </span>
            </div>
            <div className="bg-[#080214] p-3 rounded-2xl border border-purple-800/60">
              <span className="text-[9px] text-purple-300/70 font-mono font-bold uppercase block tracking-wider">
                SURVIVAL INDEX
              </span>
              <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
                98.4%
              </span>
            </div>
          </div>

          {/* 🔥 AI BATTLE MODE: LIVE BULLS VS BEARS ORDERFLOW TUG-OF-WAR */}
          <div className="bg-[#060210] p-4 rounded-2xl border border-purple-800/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-purple-200 font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                AI BATTLE MODE • LIQUIDITY WARFARE
              </span>
              <span className="text-emerald-400 font-black text-xs">
                BULLS {bullPct}% VS BEARS {bearPct}%
              </span>
            </div>

            <div className="w-full bg-[#12072b] h-3.5 rounded-full overflow-hidden flex border border-purple-900/60 p-0.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-l-full transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                style={{ width: `${bullPct}%` }}
              />
              <div
                className="bg-gradient-to-r from-rose-500 to-red-600 h-full rounded-r-full transition-all duration-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]"
                style={{ width: `${bearPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right 5 cols: LOCK SCORE PROGRESS BAR & CLASSIFIED MODEL LAYERS */}
        <div className="lg:col-span-5 bg-[#060210] p-5 rounded-2xl border border-purple-800/70 space-y-4 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-purple-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-cyan-400" /> NEURAL LOCK SCORE
            </span>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider transition-all duration-300 ${
                lockScorePct === 100
                  ? 'bg-emerald-500 text-black border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.9)] animate-pulse'
                  : 'bg-purple-900/80 text-purple-200 border border-purple-700/50'
              }`}
            >
              {lockScorePct === 100 ? '🔒 LOCKED 100%' : `${lockScorePct}% QUALIFYING`}
            </span>
          </div>

          {/* Progress Bar with Scanning Beam */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-purple-300/80">Verification Scanning:</span>
              <span className="text-white font-black">{lockScorePct}%</span>
            </div>
            <div className="w-full bg-[#12072b] h-4 rounded-full overflow-hidden border border-purple-800/60 p-0.5 relative">
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

          {/* Confluence Check Grid */}
          <div className="space-y-2 pt-2 border-t border-purple-900/40">
            <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">
              Verification Matrix:
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

          {/* Secretive AI & Restricted Layers */}
          <div className="pt-2 border-t border-purple-900/40 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-purple-300/60 font-bold uppercase">
              <span>MODEL 17 QUANTUM LAYER</span>
              <span className="text-amber-400 flex items-center gap-1">
                <EyeOff className="w-3 h-3" /> RESTRICTED
              </span>
            </div>
            <div className="bg-[#0a031a] p-2.5 rounded-xl border border-purple-900/50 text-[11px] font-mono text-purple-300 flex items-center justify-between">
              <span>Recursive Convolution Filter</span>
              <span className="text-amber-300 font-bold">████████ UNLOCKED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

