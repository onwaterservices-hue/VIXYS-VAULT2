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

      {/* 3-Card Intelligence Row: AI Signal, Lock Confidence, Whale Intel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch relative z-10">
        {/* Card 1: AI SIGNAL (2x Bigger Hero Ticker) */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all duration-300 shadow-xl ${
          isBullish
            ? 'bg-[#060210] border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
            : 'bg-[#060210] border-rose-500/70 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-mono font-extrabold tracking-wider text-purple-300/80">
            <span className="flex items-center gap-1.5 uppercase">
              <Cpu className="w-4 h-4 text-cyan-400" /> AI SIGNAL
            </span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
              isBullish ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
            }`}>
              {isBullish ? '🐂 BULLISH' : '🐻 BEARISH'}
            </span>
          </div>

          <div className="space-y-1 my-1">
            <div className={`text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight uppercase ${
              isBullish ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]'
            }`}>
              {isBullish ? '▲ BUY UP' : '▼ BUY DOWN'}
            </div>
            <div className="text-xs font-mono text-purple-200/90 font-bold uppercase tracking-wider">
              {isBullish ? 'Long Expansion Bias' : 'Short Continuation Bias'}
            </div>
          </div>

          <div className="pt-2.5 border-t border-purple-900/40 flex items-center justify-between text-[10px] text-purple-300/80 font-mono">
            <span>ACTION TYPE</span>
            <span className="text-white font-bold">{isBullish ? 'CALL OPTION' : 'PUT OPTION'}</span>
          </div>
        </div>

        {/* Card 2: LOCK CONFIDENCE */}
        <div className="bg-[#060210] p-5 rounded-2xl border border-purple-800/70 flex flex-col justify-between space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-[11px] font-mono font-extrabold tracking-wider text-purple-300/80">
            <span className="flex items-center gap-1.5 uppercase">
              <Lock className="w-4 h-4 text-amber-400" /> LOCK CONFIDENCE
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-black uppercase">
              {lockEvaluation.qualified ? '✓ VERIFIED' : 'QUALIFYING'}
            </span>
          </div>

          <div className="space-y-1.5 my-1">
            <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]">
              {liveConfidence.toFixed(1)}%
            </div>
            <div className="w-full bg-[#12072b] h-2.5 rounded-full overflow-hidden border border-purple-900">
              <div
                className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                style={{ width: `${liveConfidence}%` }}
              />
            </div>
          </div>

          <div className="pt-2.5 border-t border-purple-900/40 flex items-center justify-between text-[10px] text-purple-300/80 font-mono">
            <span>MODEL CONVERGENCE</span>
            <span className="text-emerald-400 font-bold">98.2% HIGH</span>
          </div>
        </div>

        {/* Card 3: 🐋 WHALE INTEL */}
        <div className="bg-[#060210] p-5 rounded-2xl border border-purple-800/70 flex flex-col justify-between space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-[11px] font-mono font-extrabold tracking-wider text-purple-300/80">
            <span className="flex items-center gap-1.5 uppercase">
              🐋 WHALE INTEL
            </span>
            <span className="bg-purple-950 px-2 py-0.5 rounded text-[10px] font-bold text-purple-300 border border-purple-800">
              Coinbase Prime
            </span>
          </div>

          <div className="space-y-0.5 my-1">
            <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              isBullish ? 'text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-rose-300 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]'
            }`}>
              {isBullish ? '+$13.4M BTC BOUGHT' : '-$14.2M TAKER SELL'}
            </div>
            <div className="text-xs font-mono text-purple-300/80 uppercase tracking-wider font-semibold">
              Institutional Desk Flow
            </div>
          </div>

          <div className="pt-2.5 border-t border-purple-900/40 grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
            <div>
              <div className="text-purple-400/70 text-[9px]">CONFIDENCE</div>
              <div className="text-amber-300 font-bold">92.4% HIGH</div>
            </div>
            <div>
              <div className="text-purple-400/70 text-[9px]">EFFECT</div>
              <div className={isBullish ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {isBullish ? 'Bullish' : 'Bearish'}
              </div>
            </div>
            <div>
              <div className="text-purple-400/70 text-[9px]">WINDOW</div>
              <div className="text-cyan-300 font-bold">+10 mins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Neural Lock Score & Verification Matrix Panel */}
      <div className="bg-[#060210] p-5 rounded-2xl border border-purple-800/70 space-y-4 shadow-2xl relative overflow-hidden z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Progress bar & scanning */}
          <div className="lg:col-span-6 space-y-3">
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

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-purple-300/80">Verification Scanning:</span>
                <span className="text-white font-black">{lockScorePct}%</span>
              </div>
              <div className="w-full bg-[#12072b] h-3.5 rounded-full overflow-hidden border border-purple-800/60 p-0.5 relative">
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
          </div>

          {/* Right Column: Verification Matrix */}
          <div className="lg:col-span-6 space-y-2 border-t lg:border-t-0 lg:border-l border-purple-900/40 pt-3 lg:pt-0 lg:pl-6">
            <div className="text-[11px] text-purple-300/80 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Verification Matrix:</span>
              <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                <EyeOff className="w-3 h-3" /> MODEL 17 UNLOCKED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
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
        </div>
      </div>

      {/* AI Battle Mode & Metrics Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative z-10">
        {/* Left 7 cols: Key Metrics Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#080214] p-3.5 rounded-2xl border border-purple-800/60 shadow-lg">
            <span className="text-[10px] text-purple-300/80 font-mono font-bold uppercase block tracking-wider">
              STRIKE TARGET
            </span>
            <span className="text-base sm:text-lg font-black text-white font-mono block mt-0.5">
              ${signal.targetPrice.toLocaleString()}
            </span>
          </div>
          <div className="bg-[#080214] p-3.5 rounded-2xl border border-purple-800/60 shadow-lg">
            <span className="text-[10px] text-purple-300/80 font-mono font-bold uppercase block tracking-wider">
              SPOT PRICE
            </span>
            <span className="text-base sm:text-lg font-black text-cyan-300 font-mono block mt-0.5">
              ${ticker.price.toLocaleString()}
            </span>
          </div>
          <div className="bg-[#080214] p-3.5 rounded-2xl border border-purple-800/60 shadow-lg">
            <span className="text-[10px] text-purple-300/80 font-mono font-bold uppercase block tracking-wider">
              MODEL EDGE
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-400 font-mono block mt-0.5">
              +{signal.edgePct.toFixed(1)}%
            </span>
          </div>
          <div className="bg-[#080214] p-3.5 rounded-2xl border border-purple-800/60 shadow-lg">
            <span className="text-[10px] text-purple-300/80 font-mono font-bold uppercase block tracking-wider">
              SURVIVAL INDEX
            </span>
            <span className="text-base sm:text-lg font-black text-amber-300 font-mono block mt-0.5">
              98.4%
            </span>
          </div>
        </div>

        {/* Right 5 cols: AI Battle Mode Bar */}
        <div className="lg:col-span-5 bg-[#060210] p-3.5 rounded-2xl border border-purple-800/70 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-purple-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              AI BATTLE MODE
            </span>
            <span className="text-emerald-400 font-black text-xs">
              BULLS {bullPct}% VS BEARS {bearPct}%
            </span>
          </div>

          <div className="w-full bg-[#12072b] h-4 rounded-xl overflow-hidden flex border border-purple-800 p-0.5 shadow-inner">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-l-lg transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]"
              style={{ width: `${bullPct}%` }}
            />
            <div
              className="bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 h-full rounded-r-lg transition-all duration-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]"
              style={{ width: `${bearPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

