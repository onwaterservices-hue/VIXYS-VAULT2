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

  // Micro-telemetry values
  const currentPrice = ticker.price || 64108;
  const targetPrice = signal.targetPrice || (isBullish ? currentPrice + 120 : currentPrice - 120);
  const strikeDistanceVal = targetPrice - currentPrice;
  const strikeDistancePct = (strikeDistanceVal / currentPrice) * 100;
  const formattedStrikePct = `${strikeDistancePct >= 0 ? '+' : ''}${strikeDistancePct.toFixed(2)}%`;

  // Simulated live latency jitter
  const [latency, setLatency] = useState(203);
  useEffect(() => {
    const latInterval = setInterval(() => {
      setLatency(201 + Math.floor(Math.random() * 8));
    }, 2500);
    return () => clearInterval(latInterval);
  }, []);

  // Segmented confidence bar (18 segments)
  const totalBlocks = 18;
  const activeBlocks = Math.round((liveConfidence / 100) * totalBlocks);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-5 sm:p-7 space-y-6 font-mono transition-all duration-700 shadow-2xl ${
        isBullish
          ? 'bg-[#03010a] border-emerald-500/70 shadow-[0_0_90px_rgba(16,185,129,0.22)]'
          : 'bg-[#03010a] border-rose-500/70 shadow-[0_0_90px_rgba(244,63,94,0.22)]'
      }`}
    >
      {/* Background Terminal Scanlines Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,10,38,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-0" />

      {/* Radial Aura Effect */}
      <div
        className={`absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none filter blur-3xl opacity-20 transition-all duration-1000 ${
          isBullish ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />

      {/* Top Header: VIXY NEURAL DECISION ENGINE & Telemetry Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/60 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0b051b] px-3.5 py-1.5 rounded-xl border border-purple-800/80 shadow-md">
            <span className={`w-2.5 h-2.5 rounded-full animate-ping ${isBullish ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="font-extrabold text-white uppercase text-xs tracking-wider flex items-center gap-1.5">
              ● VIXY NEURAL DECISION ENGINE
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60 text-[11px] font-black text-purple-200 tracking-widest uppercase">
            BTC • {timeframe} • KALSHI
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-[#090317] px-3 py-1.5 rounded-xl border border-purple-800/60 text-xs text-purple-200 font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-purple-400/80 text-[10px] uppercase">EXPIRES:</span>
            <strong className="text-white font-mono text-xs">{timeString}</strong>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-[#090317] px-2.5 py-1.5 rounded-xl border border-purple-800/50 text-[10px] text-cyan-300 font-mono">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>LATENCY {latency}ms</span>
          </div>
        </div>
      </div>

      {/* Main Command Terminal Decision Card Hero */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (7 cols): Hero Decision Callout (BUY UP / BUY DOWN) */}
        <div
          className={`lg:col-span-7 p-6 rounded-2xl border flex flex-col justify-between space-y-5 transition-all duration-500 shadow-2xl relative overflow-hidden ${
            isBullish
              ? 'bg-gradient-to-br from-[#041d13]/90 via-[#03110c]/90 to-[#030806]/95 border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.3)]'
              : 'bg-gradient-to-br from-[#260510]/90 via-[#18030b]/90 to-[#080104]/95 border-rose-500/80 shadow-[0_0_35px_rgba(244,63,94,0.3)]'
          }`}
        >
          {/* Subtle Ambient Grid in Hero Card */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />

          {/* Decision State Title */}
          <div className="flex items-center justify-between text-xs font-mono font-extrabold tracking-wider">
            <span className="flex items-center gap-2 text-purple-200 uppercase">
              <Cpu className={`w-4 h-4 ${isBullish ? 'text-emerald-400' : 'text-rose-400'} animate-pulse`} />
              VIXY PREDICTION DIRECTION
            </span>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md border ${
                isBullish
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-emerald-900/40'
                  : 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-rose-900/40'
              }`}
            >
              {isBullish ? 'BULLISH PROJECTION' : 'BEARISH PROJECTION'}
            </span>
          </div>

          {/* Symmetrical Hero Decision State Callout */}
          <div className="space-y-1 my-2">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div
                className={`text-4xl sm:text-5xl lg:text-6xl font-black font-mono tracking-tight uppercase flex items-center gap-3 drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] ${
                  isBullish
                    ? 'text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.7)]'
                    : 'text-rose-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.7)]'
                }`}
              >
                <span>{isBullish ? 'BUY UP' : 'BUY DOWN'}</span>
                <span className="text-2xl sm:text-3xl opacity-80">{isBullish ? '▲' : '▼'}</span>
              </div>

              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  {liveConfidence.toFixed(0)}%
                </div>
                <div className="text-[10px] font-bold text-purple-300/80 uppercase tracking-widest">
                  CONFIDENCE
                </div>
              </div>
            </div>

            {/* Segmented ASCII/Block Confidence Meter */}
            <div className="pt-3 space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono font-bold">
                <span className="text-purple-300/80 uppercase tracking-wider">AI CONFIDENCE METER</span>
                <span className={isBullish ? 'text-emerald-300 font-extrabold' : 'text-rose-300 font-extrabold'}>
                  {liveConfidence.toFixed(1)}% ({isBullish ? 'HIGH BULL' : 'HIGH BEAR'})
                </span>
              </div>

              {/* Segmented Blocks Representation */}
              <div className="flex items-center gap-1 w-full bg-[#060212] p-1.5 rounded-xl border border-purple-900/80 shadow-inner">
                {Array.from({ length: totalBlocks }).map((_, i) => {
                  const isActive = i < activeBlocks;
                  return (
                    <div
                      key={i}
                      className={`h-3.5 flex-1 rounded-sm transition-all duration-300 ${
                        isActive
                          ? isBullish
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                            : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                          : 'bg-purple-950/40 border border-purple-900/30'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Edge and Execution Note */}
          <div className="pt-3 border-t border-purple-900/50 flex items-center justify-between text-xs font-mono">
            <span className="text-purple-300/80 font-bold uppercase">INSTITUTIONAL EDGE:</span>
            <span className="text-emerald-400 font-black text-sm">+{signal.edgePct.toFixed(1)}% OVER MARKET</span>
          </div>
        </div>

        {/* Right Column (5 cols): Micro-Telemetry Matrix Grid */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3 items-stretch">
          {/* Target Price */}
          <div className="bg-[#080318] p-4 rounded-2xl border border-purple-800/70 shadow-xl flex flex-col justify-between">
            <span className="text-[10px] text-purple-300/80 font-mono font-bold uppercase tracking-wider block">
              TARGET STRIKE
            </span>
            <div className="my-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono block">
                ${targetPrice.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                {isBullish ? 'Target Above Strike' : 'Target Below Strike'}
              </span>
            </div>
            <span className="text-[9px] text-purple-400/60 font-mono">Kalshi 15M Contract</span>
          </div>

          {/* Strike Distance */}
          <div className="bg-[#080318] p-4 rounded-2xl border border-purple-800/70 shadow-xl flex flex-col justify-between">
            <span className="text-[10px] text-purple-300/80 font-mono font-bold uppercase tracking-wider block">
              STRIKE DISTANCE
            </span>
            <div className="my-1">
              <span
                className={`text-xl sm:text-2xl font-black font-mono block ${
                  strikeDistanceVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formattedStrikePct}
              </span>
              <span className="text-[10px] text-purple-300/90 font-bold block mt-0.5">
                ${Math.abs(strikeDistanceVal).toFixed(1)} Delta
              </span>
            </div>
            <span className="text-[9px] text-purple-400/60 font-mono">From Spot Price</span>
          </div>

          {/* Time Remaining */}
          <div className="bg-[#080318] p-4 rounded-2xl border border-purple-800/70 shadow-xl flex flex-col justify-between">
            <span className="text-[10px] text-purple-300/80 font-mono font-bold uppercase tracking-wider block">
              TIME REMAINING
            </span>
            <div className="my-1">
              <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono block tracking-wider">
                {timeString}
              </span>
              <span className="text-[10px] text-amber-400/90 font-bold block mt-0.5">
                15M Candle Close
              </span>
            </div>
            <span className="text-[9px] text-purple-400/60 font-mono">Live Ticking</span>
          </div>

          {/* Lock Evaluation Status */}
          <div className="bg-[#080318] p-4 rounded-2xl border border-purple-800/70 shadow-xl flex flex-col justify-between">
            <span className="text-[10px] text-purple-300/80 font-mono font-bold uppercase tracking-wider block">
              MODEL LOCK
            </span>
            <div className="my-1">
              <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono block">
                {lockScorePct}%
              </span>
              <span className="text-[10px] text-cyan-400 font-bold block mt-0.5">
                {lockEvaluation.qualified ? 'QUALIFIED ✓' : 'SCANNING...'}
              </span>
            </div>
            <span className="text-[9px] text-purple-400/60 font-mono">Model 17 Engine</span>
          </div>
        </div>
      </div>

      {/* AI Battle Mode & Order Flow Pressure Bar */}
      <div className="bg-[#060210] p-4 rounded-2xl border border-purple-800/70 space-y-2 relative z-10 shadow-xl">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-purple-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            VIXY ORDER FLOW PRESSURE
          </span>
          <span className="text-emerald-400 font-black text-xs">
            TAKER BULLS {bullPct}% VS BEARS {bearPct}%
          </span>
        </div>

        <div className="w-full bg-[#12072b] h-3.5 rounded-xl overflow-hidden flex border border-purple-800/80 p-0.5 shadow-inner">
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
  );
};

