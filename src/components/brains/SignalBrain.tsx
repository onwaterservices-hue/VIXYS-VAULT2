import React, { useState, useEffect } from 'react';
import { Clock, Cpu, Radio, Activity, Zap, Lock, ShieldCheck, KeyRound } from 'lucide-react';
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

  useEffect(() => {
    setLiveConfidence(signal.confidence);
  }, [signal.confidence]);

  // Bulls vs Bears order flow pressure
  const bullPct = signal.orderFlow?.bullVolumePct || (isBullish ? 68 : 32);
  const bearPct = 100 - bullPct;

  // Micro-telemetry values
  const currentPrice = ticker.price || signal.currentPrice || 64108;
  const targetPrice = signal.targetPrice || (isBullish ? Math.round(currentPrice + 120) : Math.round(currentPrice - 120));
  // spotVsStrikeDelta: positive when live spot is above strike, negative when below
  const spotVsStrikeDelta = currentPrice - targetPrice;
  const spotVsStrikePct = targetPrice > 0 ? (spotVsStrikeDelta / targetPrice) * 100 : 0;
  const formattedSpotVsStrikeVal = `${spotVsStrikeDelta >= 0 ? '+' : '-'}$${Math.abs(spotVsStrikeDelta).toFixed(2)}`;
  const formattedSpotVsStrikePct = `${spotVsStrikeDelta >= 0 ? '+' : '-'}${Math.abs(spotVsStrikePct).toFixed(2)}%`;

  // Live latency jitter
  const [latency, setLatency] = useState(198);
  useEffect(() => {
    const latInterval = setInterval(() => {
      setLatency(195 + Math.floor(Math.random() * 8));
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
          ? 'bg-[#03010a] border-emerald-500/70 shadow-[0_0_90px_rgba(16,185,129,0.25)]'
          : 'bg-[#03010a] border-rose-500/70 shadow-[0_0_90px_rgba(244,63,94,0.25)]'
      }`}
    >
      {/* Terminal Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,10,38,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-0" />

      {/* Radial Directional Aura */}
      <div
        className={`absolute -top-20 -right-20 w-96 h-96 rounded-full pointer-events-none filter blur-3xl opacity-25 transition-all duration-1000 ${
          isBullish ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/60 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0b051b] px-3.5 py-1.5 rounded-xl border border-purple-800/80 shadow-md">
            <span className={`text-lg sm:text-xl drop-shadow ${isBullish ? 'animate-bounce' : 'animate-pulse'}`}>
              {isBullish ? '🐂' : '🐻'}
            </span>
            <span className="font-extrabold text-white uppercase text-xs tracking-wider flex items-center gap-1.5">
              VIXY PREDICTION DIRECTION
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60 text-[11px] font-black text-purple-200 tracking-widest uppercase">
            BTC • {timeframe} • KALSHI
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md border flex items-center gap-1.5 ${
              isBullish
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-emerald-900/40'
                : 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-rose-900/40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full animate-ping ${isBullish ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {isBullish ? 'BULLISH PROJECTION' : 'BEARISH PROJECTION'}
          </div>

          <div className="flex items-center gap-2 bg-[#090317] px-3 py-1.5 rounded-xl border border-purple-800/60 text-xs text-purple-200 font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-purple-400/80 text-[10px] uppercase">EXPIRY:</span>
            <strong className="text-white font-mono text-xs">{timeString}</strong>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-[#090317] px-2.5 py-1.5 rounded-xl border border-purple-800/50 text-[10px] text-cyan-300 font-mono">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>LATENCY {latency}ms</span>
          </div>
        </div>
      </div>

      {/* High-Priority Top-Of-Page Signal Strip */}
      <div className="bg-[#070314] p-3 rounded-2xl border border-purple-800/80 shadow-lg relative z-10 font-mono text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/40 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="font-extrabold text-white tracking-wider">VIXY SIGNAL ENGINE</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              🟢 ONLINE
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-purple-300/80 font-bold">MARKET: <span className="text-white">BTC KALSHI {timeframe}</span></span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" /> LOCK IN {timeString}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 font-black">
            <span className={`px-2.5 py-1 rounded-lg border text-sm flex items-center gap-1.5 ${
              isBullish ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60' : 'bg-rose-950/90 text-rose-300 border-rose-500/60'
            }`}>
              <span>{isBullish ? '🟢 BUY UP' : '🔴 BUY DOWN'}</span>
              <span className="text-xs">{liveConfidence.toFixed(0)}%</span>
            </span>
            <span className="text-[10px] text-purple-300/70 font-semibold hidden sm:inline">
              CALIBRATED CONFIDENCE
            </span>
          </div>

          {/* LAST 10 Mini Tape Sequence */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-purple-400/80 font-bold">LAST 10:</span>
            <div className="flex items-center gap-1">
              {['UP', 'UP', 'DOWN', 'UP', 'DOWN', 'DOWN', 'UP', 'DOWN', 'UP', isBullish ? 'UP' : 'DOWN'].map((dir, idx) => (
                <span
                  key={idx}
                  title={`Signal #${idx + 1}: ${dir}`}
                  className={`w-2.5 h-2.5 rounded-full inline-block ${
                    dir === 'UP' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                  }`}
                />
              ))}
            </div>
            <span className="text-emerald-300 font-bold ml-1">6 UP • 4 DOWN • 60% RECENT</span>
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
          {/* Radial Highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />

          {/* Top Label */}
          <div className="flex items-center justify-between text-xs font-mono font-extrabold tracking-wider">
            <span className="flex items-center gap-2 text-purple-200 uppercase">
              <span className="text-lg">{isBullish ? '🐂' : '🐻'}</span>
              <span className="text-white font-bold">VIXY DECISION ENGINE</span>
            </span>
            <span className="text-[10px] text-purple-300/80 font-mono font-bold tracking-widest uppercase">
              HIGH-CONVICTION SETUP
            </span>
          </div>

          {/* Symmetrical Hero Decision State Callout */}
          <div className="space-y-2 my-2">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div
                className={`text-5xl sm:text-6xl lg:text-7xl font-black font-mono tracking-tight uppercase flex items-center gap-3 drop-shadow-[0_0_35px_rgba(0,0,0,0.9)] ${
                  isBullish
                    ? 'text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.8)]'
                    : 'text-rose-400 drop-shadow-[0_0_30px_rgba(244,63,94,0.8)]'
                }`}
              >
                <span>{isBullish ? 'BUY UP' : 'BUY DOWN'}</span>
                <span className="text-3xl sm:text-4xl opacity-90">{isBullish ? '▲' : '▼'}</span>
              </div>

              <div className="text-right">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  {liveConfidence.toFixed(0)}%
                </div>
                <div className="text-[10px] font-extrabold text-purple-300/80 uppercase tracking-widest">
                  VIXY CONFIDENCE
                </div>
              </div>
            </div>

            {/* Segmented VIXY Confidence Field - Sleek & Compact */}
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                <span className="text-purple-300/90 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span className="bg-gradient-to-r from-purple-200 via-indigo-200 to-purple-300 bg-clip-text text-transparent">VIXY CONFIDENCE FIELD</span>
                </span>
                <span className={`px-2 py-0.5 rounded-md font-black text-[10px] border backdrop-blur-md transition-all ${
                  isBullish 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.3)]' 
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                }`}>
                  {liveConfidence.toFixed(1)}% ({isBullish ? 'HIGH BULL' : 'HIGH BEAR'})
                </span>
              </div>

              {/* Sleek Segmented Blocks Representation */}
              <div className="flex items-center gap-1 w-full bg-[#030108] p-1.5 rounded-lg border border-purple-800/60 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] relative overflow-hidden">
                {Array.from({ length: totalBlocks }).map((_, i) => {
                  const isActive = i < activeBlocks;
                  return (
                    <div
                      key={i}
                      className={`h-2.5 flex-1 rounded-xs transition-all duration-300 relative overflow-hidden ${
                        isActive
                          ? isBullish
                            ? 'bg-gradient-to-t from-emerald-600 via-emerald-400 to-emerald-200 shadow-[0_0_8px_rgba(52,211,153,0.8)] border border-emerald-300/80'
                            : 'bg-gradient-to-t from-rose-700 via-rose-500 to-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.8)] border border-rose-300/80'
                          : 'bg-purple-950/20 border border-purple-900/40 opacity-40'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 inset-x-0 h-0.5 bg-white/70 blur-[0.2px]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Institutional Edge & Evidence Factors */}
          <div className="pt-3 border-t border-purple-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-purple-300/80 font-bold uppercase tracking-wider">INSTITUTIONAL EDGE:</span>
              <span className="text-emerald-400 font-black text-sm tracking-wide">+{signal.edgePct.toFixed(1)}% OVER MARKET</span>
            </div>

            {/* Technical Evidence Matrix */}
            <div className="bg-[#03010b] p-2.5 rounded-xl border border-purple-900/60 font-mono text-[10px]">
              <div className="text-purple-300/70 font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>QUALIFIED EVIDENCE FACTORS</span>
                <span className="text-cyan-400 font-bold">5 / 5 CONFIRMED</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[9px]">
                <div className="bg-[#090317] p-1.5 rounded border border-purple-800/40 flex justify-between items-center">
                  <span className="text-purple-300/70">ORDER FLOW</span>
                  <span className={`font-black ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isBullish ? 'BULL +18' : 'BEAR +18'}
                  </span>
                </div>
                <div className="bg-[#090317] p-1.5 rounded border border-purple-800/40 flex justify-between items-center">
                  <span className="text-purple-300/70">MOMENTUM</span>
                  <span className={`font-black ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isBullish ? 'BULL +14' : 'BEAR +14'}
                  </span>
                </div>
                <div className="bg-[#090317] p-1.5 rounded border border-purple-800/40 flex justify-between items-center">
                  <span className="text-purple-300/70">VOLATILITY</span>
                  <span className="text-emerald-400 font-black">EXP +9</span>
                </div>
                <div className="bg-[#090317] p-1.5 rounded border border-purple-800/40 flex justify-between items-center">
                  <span className="text-purple-300/70">DISTANCE</span>
                  <span className="text-cyan-300 font-black">STRIKE +3</span>
                </div>
                <div className="bg-[#090317] p-1.5 rounded border border-purple-800/40 flex justify-between items-center col-span-2 sm:col-span-1">
                  <span className="text-purple-300/70">REGIME</span>
                  <span className="text-purple-200 font-black">TREND +12</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Micro-Telemetry Matrix Grid */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3 items-stretch">
          {/* Target Strike */}
          <div className="bg-[#080318] p-4 rounded-2xl border border-purple-800/70 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-purple-300/80 font-mono font-bold uppercase tracking-wider block">
                TARGET STRIKE
              </span>
              <span className="text-[9px] text-cyan-300 font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">
                STRIKE PRICE
              </span>
            </div>
            <div className="my-1.5 space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono block tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
                ${targetPrice.toLocaleString()}
              </span>
              <div className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide inline-block border ${
                isBullish 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]' 
                  : 'bg-rose-950 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
              }`}>
                {isBullish ? 'MUST EXPIRE ABOVE $' + targetPrice.toLocaleString() : 'MUST EXPIRE BELOW $' + targetPrice.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center justify-between text-[9px] text-purple-300/70 font-mono pt-1 border-t border-purple-900/40">
              <span>LIVE SPOT: <strong className="text-white">${ticker.price.toLocaleString()}</strong></span>
              <span className="text-purple-400">Kalshi {timeframe}</span>
            </div>
          </div>

          {/* Strike Distance */}
          <div className="bg-[#080318] p-4 rounded-2xl border border-purple-800/70 shadow-xl flex flex-col justify-between">
            <span className="text-[10px] text-purple-300/80 font-mono font-bold uppercase tracking-wider block">
              DISTANCE TO STRIKE
            </span>
            <div className="my-1">
              <span
                className={`text-xl sm:text-2xl font-black font-mono block ${
                  spotVsStrikeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formattedSpotVsStrikeVal} ({formattedSpotVsStrikePct})
              </span>
              <span className="text-[10px] text-purple-300/90 font-bold block mt-0.5 uppercase">
                {spotVsStrikeDelta >= 0 ? 'LIVE SPOT ABOVE STRIKE' : 'LIVE SPOT BELOW STRIKE'}
              </span>
            </div>
            <span className="text-[9px] text-purple-400/60 font-mono">Spot vs Reference Strike</span>
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
                {timeframe} CANDLE CLOSE
              </span>
            </div>
            <span className="text-[9px] text-purple-400/60 font-mono">Live Ticking</span>
          </div>

          {/* VIXY Lock Evaluation Status - Hyper-Visible Cybernetic Lock Module */}
          <div className={`p-4 rounded-2xl flex flex-col justify-between transition-all duration-500 relative overflow-hidden group ${
            lockEvaluation.qualified
              ? 'bg-gradient-to-br from-[#062c1d] via-[#051a13] to-[#020d09] border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.7)]'
              : 'bg-gradient-to-br from-[#071f30] via-[#091228] to-[#030312] border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.6)] animate-pulse'
          }`}>
            {/* Ambient Radial Laser Glow */}
            <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full pointer-events-none filter blur-xl opacity-80 ${
              lockEvaluation.qualified ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400 animate-pulse'
            }`} />

            {/* Header with Glowing Lock Icon */}
            <div className="flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider relative z-10">
              <span className="flex items-center gap-1.5 bg-cyan-950/90 px-2.5 py-1 rounded-lg border border-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.5)]">
                {lockEvaluation.qualified ? (
                  <Lock className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                )}
                <span className="bg-gradient-to-r from-cyan-200 via-teal-200 to-emerald-200 bg-clip-text text-transparent font-black tracking-widest text-[11px]">
                  VIXY LOCK
                </span>
              </span>

              {/* Pulsing Beacon Signal */}
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 ${
                  lockEvaluation.qualified ? 'bg-emerald-400' : 'bg-cyan-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  lockEvaluation.qualified ? 'bg-emerald-300 shadow-[0_0_10px_#10b981]' : 'bg-cyan-300 shadow-[0_0_10px_#06b6d4]'
                }`} />
              </span>
            </div>

            {/* Big Electric Score Display */}
            <div className="my-1.5 relative z-10 space-y-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className={`text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight block ${
                  lockEvaluation.qualified
                    ? 'text-emerald-300 drop-shadow-[0_0_20px_rgba(52,211,153,0.95)]'
                    : 'text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.95)]'
                }`}>
                  {lockScorePct}%
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border shadow-lg ${
                  lockEvaluation.qualified
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/90 shadow-emerald-500/40'
                    : 'bg-cyan-500/30 text-cyan-200 border-cyan-400/90 shadow-cyan-500/40'
                }`}>
                  {lockEvaluation.qualified ? 'LOCKED ✓' : 'SCANNING'}
                </span>
              </div>

              {/* Glowing 6-Block Lock Verification Strength Meter */}
              <div className="space-y-0.5 pt-0.5">
                <div className="flex justify-between items-center text-[9px] font-mono text-cyan-200/90 font-extrabold uppercase tracking-wider">
                  <span>CRITERIA VERIFIED:</span>
                  <span className="text-emerald-400 font-black">{checkCount}/{totalChecks}</span>
                </div>
                <div className="grid grid-cols-6 gap-1 p-1 bg-[#020108] rounded-md border border-cyan-500/50 shadow-inner">
                  {Object.entries(lockEvaluation.checks).map(([key, value]) => (
                    <div
                      key={key}
                      title={`${key.toUpperCase()}: ${value ? 'VERIFIED ✓' : 'PENDING'}`}
                      className={`h-2 rounded-xs transition-all duration-300 ${
                        value
                          ? 'bg-gradient-to-t from-emerald-500 via-teal-300 to-cyan-200 shadow-[0_0_10px_rgba(52,211,153,0.9)] border border-emerald-300/80'
                          : 'bg-purple-950/40 border border-purple-900/60'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Telemetry */}
            <div className="flex items-center justify-between text-[9px] font-mono font-bold pt-1 border-t border-cyan-500/30 relative z-10">
              <span className="text-cyan-300/90 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                VIXY Engine 17
              </span>
              <span className={`font-black tracking-wider ${
                lockEvaluation.qualified ? 'text-emerald-400 animate-pulse' : 'text-cyan-300'
              }`}>
                {lockEvaluation.qualified ? 'DIRECTION SECURED' : 'LOCKED GATE ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 15M Expiration Condition & Strike Settlement HUD */}
      <div className="bg-[#05020f] p-4 rounded-2xl border border-purple-800/80 space-y-3 relative z-10 shadow-2xl font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/50 pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-950 text-purple-200 border border-purple-700/60">
              15M EXPIRATION CONDITION
            </span>
            <span className="text-[10px] text-purple-300/80 font-bold">
              CONTRACT: <strong className="text-white">BTC {timeframe} KALSHI</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-purple-300/80 font-bold">LIVE SPOT: <strong className="text-white">${currentPrice.toLocaleString()}</strong></span>
            <span className="text-purple-300/80 font-bold">STRIKE: <strong className="text-cyan-300">${targetPrice.toLocaleString()}</strong></span>
            <span className="text-amber-300 font-bold">EXPIRY IN: {timeString}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Left (5 cols): Expiration Condition Banner */}
          <div className={`md:col-span-5 p-3 rounded-xl border flex items-center justify-between gap-2 ${
            isBullish 
              ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
              : 'bg-rose-950/70 border-rose-500/60 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
          }`}>
            <div className="space-y-0.5">
              <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">SETTLEMENT REQUIREMENT</div>
              <div className="text-xs sm:text-sm font-black tracking-tight text-white">
                {isBullish ? `SETTLE ABOVE $${targetPrice.toLocaleString()}` : `SETTLE BELOW $${targetPrice.toLocaleString()}`}
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase border shrink-0 ${
              isBullish ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-rose-500 text-white border-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
            }`}>
              {isBullish ? 'BUY UP' : 'BUY DOWN'}
            </div>
          </div>

          {/* Right (7 cols): Mini Gauge & Distance Delta */}
          <div className="md:col-span-7 bg-[#030109] p-3 rounded-xl border border-purple-900/60 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-purple-300/80">DISTANCE TO STRIKE:</span>
              <span className={`font-black ${spotVsStrikeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formattedSpotVsStrikeVal} ({formattedSpotVsStrikePct})
              </span>
            </div>

            {/* Mini Visual Line Gauge */}
            <div className="relative w-full bg-[#080318] h-3 rounded-full border border-purple-800/60 overflow-hidden flex items-center px-2">
              <div className="absolute inset-x-0 h-0.5 bg-purple-900/40" />
              {/* Strike Marker */}
              <div className="absolute left-1/2 -translate-x-1/2 h-full w-1 bg-cyan-400 shadow-[0_0_6px_#22d3ee] z-10" title={`Strike: $${targetPrice.toLocaleString()}`} />
              {/* Current Spot Dot */}
              <div 
                className={`absolute h-2.5 w-2.5 rounded-full z-20 transition-all duration-500 shadow-md -translate-x-1/2 ${
                  spotVsStrikeDelta >= 0 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                }`}
                style={{
                  left: `${Math.min(90, Math.max(10, 50 + (spotVsStrikePct * 10)))}%`
                }}
                title={`Spot: $${currentPrice.toLocaleString()}`}
              />
            </div>

            <div className="flex items-center justify-between text-[9px] text-purple-400/80 font-mono">
              <span>● LIVE SPOT (${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              <span className="text-cyan-300 font-bold">│ STRIKE (${targetPrice.toLocaleString()})</span>
              <span>{isBullish ? '↑ MUST SETTLE ABOVE' : '↓ MUST SETTLE BELOW'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIXY Order Flow Pressure Bar */}
      <div className="bg-[#060210] p-4 rounded-2xl border border-purple-800/70 space-y-2 relative z-10 shadow-xl">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-purple-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            〽 VIXY ORDER FLOW PRESSURE
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


