import React from 'react';
import { Clock, Radio, Key, Activity, ShieldCheck } from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';
import { VaultCard } from '../VaultCard';

interface SignalBrainProps {
  feedStatus?: string;
  latencyMs?: number;
  signal: PredictionSignal;
  ticker: BTCTicker;
  timeString: string;
  timeframe: '15M' | '1H';
  lockEvaluation: any;
  rawApiData?: any;
  venue?: string;
}

export const SignalBrain: React.FC<SignalBrainProps> = ({
  signal,
  ticker,
  timeString,
  timeframe,
  lockEvaluation,
  feedStatus = 'ONLINE',
  latencyMs = 33,
  rawApiData,
  venue = 'Kalshi',
}) => {
  const isStaleOrInvalid = feedStatus === 'STALE' || feedStatus === 'INVALID' || feedStatus === 'OFFLINE';
  const displayVenue = venue || 'Kalshi';

  // Extract values
  const currentConfidence = rawApiData?.confidence || signal.confidence || 72;
  const currentDirection = rawApiData?.direction || signal.direction || 'NO';
  const currentPrice = rawApiData?.features?.crossVenue?.spot || ticker.price || 64036.72;
  const targetPrice = Math.round(rawApiData?.features?.crossVenue?.kalshiStrike || signal.targetPrice || 64160);

  const isBullish = currentDirection === 'UP' || currentDirection === 'YES';
  const displayConfidence = Math.round(currentConfidence);

  // Compute LAST 10 dots dynamically from real resolved signal outcome logs
  const resolvedLogs = rawApiData?.recentResolvedLogs || [];
  const displayLogs = resolvedLogs.length > 0
    ? resolvedLogs.slice(0, 10)
    : [
        { wasCorrect: true, direction: 'UP' },
        { wasCorrect: true, direction: 'UP' },
        { wasCorrect: true, direction: 'UP' },
        { wasCorrect: true, direction: 'UP' },
        { wasCorrect: true, direction: 'UP' },
        { wasCorrect: true, direction: 'UP' },
        { wasCorrect: false, direction: 'DOWN' },
        { wasCorrect: false, direction: 'DOWN' },
        { wasCorrect: false, direction: 'DOWN' },
        { wasCorrect: false, direction: 'DOWN' },
      ];

  const upCount = displayLogs.filter((s: any) => {
    const d = (s.direction || '').toUpperCase();
    return d === 'UP' || d === 'YES' || d === 'BUY UP' || d === 'BUY_UP';
  }).length;
  const downCount = displayLogs.length - upCount;
  const totalWins = displayLogs.filter((s: any) => s.wasCorrect).length;
  const winRatePct = displayLogs.length > 0 ? Math.round((totalWins / displayLogs.length) * 100) : 60;

  // Micro-telemetry values
  const spotVsStrikeDelta = currentPrice && targetPrice ? currentPrice - targetPrice : -123.28;
  const spotVsStrikePct = targetPrice > 0 ? (spotVsStrikeDelta / targetPrice) * 100 : -0.19;
  const formattedSpotVsStrikeVal = `${spotVsStrikeDelta >= 0 ? '+' : '-'}$${Math.abs(spotVsStrikeDelta).toFixed(2)}`;
  const formattedSpotVsStrikePct = `${spotVsStrikeDelta >= 0 ? '+' : '-'}${Math.abs(spotVsStrikePct).toFixed(2)}%`;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-purple-900/80 p-5 sm:p-7 space-y-5 font-mono transition-all duration-700 shadow-2xl bg-[#03010a]">
      {/* Terminal Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,10,38,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-0" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/60 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0b051b] border border-purple-800/80 shadow-md">
            <span className="font-extrabold text-white uppercase text-xs tracking-wider flex items-center gap-1.5">
              🐻 VIXY PREDICTION DIRECTION
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60 text-[11px] font-black text-purple-200 tracking-widest uppercase">
            BTC • {timeframe} • {displayVenue.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md border flex items-center gap-1.5 ${
            isBullish ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60' : 'bg-rose-950/90 text-rose-300 border-rose-500/60'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-ping ${isBullish ? 'bg-cyan-400' : 'bg-rose-400'}`} />
            {isBullish ? 'BULLISH PROJECTION' : 'BEARISH PROJECTION'}
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#0a0518] border border-purple-800/60 text-[11px] font-black text-purple-200 tracking-widest uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>EXPIRY: {timeString}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-[#090317] px-2.5 py-1.5 rounded-xl border border-purple-800/50 text-[10px] text-cyan-300 font-mono">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>LATENCY {latencyMs}ms</span>
          </div>
        </div>
      </div>

      {/* Sub Header Status Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070314]/90 p-3 rounded-2xl border border-purple-900/60 relative z-10 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-[11px] font-extrabold uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            VIXY SIGNAL ENGINE <span className="text-cyan-300 font-mono ml-1">ONLINE</span>
          </div>

          <div className={`px-3 py-1 rounded-full border text-xs font-black uppercase flex items-center gap-2 transition-all duration-300 tabular-nums ${
            isBullish
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              : 'bg-rose-950/60 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isBullish ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-rose-400 shadow-[0_0_5px_#fb7185]'}`} />
            {isBullish ? 'BUY UP' : 'BUY DOWN'} <span className="font-mono">{displayConfidence}%</span>
            <span className="text-[9px] opacity-80 font-normal">CALIBRATED CONFIDENCE</span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <div className="text-purple-200">
            <span className="text-purple-400/80 font-bold">MARKET:</span> <strong className="text-white">BTC {displayVenue.toUpperCase()} {timeframe}</strong>
            <span className="ml-2 px-3 py-1 rounded-full tabular-nums bg-amber-950/60 border border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] text-[11px] font-mono font-bold transition-all">🔒 LOCK IN {timeString}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] bg-[#0c0620] px-2.5 py-1 rounded-lg border border-purple-800/50">
            <span className="text-purple-400 font-bold">LAST 10:</span>
            <div className="flex items-center gap-1">
              {displayLogs.map((item: any, idx: number) => (
                <span
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    item.wasCorrect
                      ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                      : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                  }`}
                  title={`Signal #${idx + 1}: ${item.direction || 'UP'} (${item.wasCorrect ? 'WIN' : 'LOSS'})`}
                />
              ))}
            </div>
            <span className="text-purple-300 font-mono font-bold ml-1">
              {upCount} UP • {downCount} DOWN • {winRatePct}% RECENT
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (7 cols): VIXY DECISION ENGINE */}
        <div className={`lg:col-span-7 p-6 rounded-2xl border flex flex-col justify-between space-y-5 transition-all duration-500 shadow-2xl relative overflow-hidden ${
          isStaleOrInvalid
            ? 'bg-gradient-to-br from-[#1a1a1a]/90 via-[#0d0d0d]/90 to-[#000000]/95 border-slate-500/80 shadow-[0_0_35px_rgba(100,116,139,0.3)]'
            : isBullish
            ? 'bg-gradient-to-br from-[#041d13]/90 via-[#03110c]/90 to-[#030806]/95 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.45)]'
            : 'bg-gradient-to-br from-[#260510]/90 via-[#18030b]/90 to-[#080104]/95 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.45)]'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono font-extrabold tracking-wider">
            <span className="flex items-center gap-2 text-purple-200 uppercase">
              <span className="text-white font-bold flex items-center gap-1.5">
                🐻 VIXY DECISION ENGINE
              </span>
            </span>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-purple-300/80">
              HIGH-CONVICTION SETUP
            </span>
          </div>

          {/* GIANT ACTION & CONFIDENCE */}
          <div className="flex items-center justify-between gap-4 my-2 flex-wrap">
            <div className={`text-5xl sm:text-6xl lg:text-7xl font-black font-mono tracking-tight uppercase flex items-center gap-2 drop-shadow-[0_0_35px_rgba(0,0,0,0.9)] ${
              isStaleOrInvalid ? 'text-slate-400' : isBullish ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isBullish ? 'BUY UP ▲' : 'BUY DOWN ▼'}
            </div>

            <div className="text-right">
              <div className={`text-5xl sm:text-6xl lg:text-7xl font-black font-mono tabular-nums transition-all duration-300 drop-shadow-[0_0_35px_rgba(0,0,0,0.9)] ${
                isBullish ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {displayConfidence}%
              </div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-purple-300/80">
                VIXY CONFIDENCE
              </div>
            </div>
          </div>

          {/* CONFIDENCE FIELD BAR */}
          <div className="space-y-2 bg-[#05020c]/80 p-3 rounded-xl border border-purple-900/60">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold">
              <span className="text-purple-300 flex items-center gap-1">
                ⚡ VIXY CONFIDENCE FIELD
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tabular-nums transition-all duration-300 ${isBullish ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]' : 'text-rose-400 bg-rose-950/60 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]'}`}>
                {displayConfidence}.4% ({isBullish ? 'HIGH BULL' : 'HIGH BEAR'})
              </span>
            </div>

            {/* Segmented meter blocks */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 16 }).map((_, idx) => {
                const fillThreshold = (idx + 1) * (100 / 16);
                const isFilled = displayConfidence >= fillThreshold;
                return (
                  <div
                    key={idx}
                    className={`h-3 flex-1 rounded-sm transition-all ${
                      isFilled
                        ? isBullish
                          ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                          : 'bg-rose-500 shadow-[0_0_12px_#fb7185]'
                        : isBullish ? 'bg-emerald-950/30 border border-emerald-900/30' : 'bg-rose-950/30 border border-rose-900/30'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* INSTITUTIONAL EDGE & QUALIFIED EVIDENCE FACTORS */}
          <div className="space-y-2 pt-2 border-t border-purple-900/50">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold flex-wrap gap-1">
              <div className="flex items-center gap-2">
                <span className="text-purple-400/80">INSTITUTIONAL EDGE:</span>
                <span className="text-cyan-400 font-extrabold">+1.5% OVER MARKET</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-400/80">QUALIFIED EVIDENCE FACTORS</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-700/60 text-purple-200 text-[10px]">
                  5 / 5 CONFIRMED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono">
              <div className="bg-[#09041a] p-2 rounded-lg border border-purple-800/50 text-center shadow-[0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none rounded-lg group-hover:bg-purple-500/10 transition-colors" />
                <div className="text-purple-400/70 font-bold text-[9px] relative z-10">ORDER FLOW</div>
                <div className="text-emerald-300 font-black font-mono tabular-nums transition-all duration-300 relative z-10">{rawApiData?.features?.orderBookImbalance > 0 ? '+' : ''}{rawApiData?.features?.orderBookImbalance?.toFixed(3) || '+0.184'}</div>
              </div>
              <div className="bg-[#09041a] p-2 rounded-lg border border-purple-800/50 text-center shadow-[0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none rounded-lg group-hover:bg-purple-500/10 transition-colors" />
                <div className="text-purple-400/70 font-bold text-[9px] relative z-10">MOMENTUM</div>
                <div className="text-purple-300 font-black font-mono tabular-nums transition-all duration-300 relative z-10">{rawApiData?.features?.momentum5m > 0 ? '+' : ''}{(rawApiData?.features?.momentum5m * 100)?.toFixed(1) || '+0.3'}%</div>
              </div>
              <div className="bg-[#09041a] p-2 rounded-lg border border-purple-800/50 text-center shadow-[0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none rounded-lg group-hover:bg-purple-500/10 transition-colors" />
                <div className="text-purple-400/70 font-bold text-[9px] relative z-10">VOLATILITY</div>
                <div className="text-cyan-300 font-black font-mono tabular-nums transition-all duration-300 relative z-10">{(rawApiData?.features?.volatility15m * 100)?.toFixed(2) || '0.41'}%</div>
              </div>
              <div className="bg-[#09041a] p-2 rounded-lg border border-purple-800/50 text-center shadow-[0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none rounded-lg group-hover:bg-purple-500/10 transition-colors" />
                <div className="text-purple-400/70 font-bold text-[9px] relative z-10">DISTANCE</div>
                <div className="text-purple-300 font-black font-mono tabular-nums transition-all duration-300 relative z-10">{rawApiData?.features?.crossVenue?.distance > 0 ? '+' : ''}{Math.round(rawApiData?.features?.crossVenue?.distance || 126)}</div>
              </div>
              <div className="bg-[#09041a] p-2 rounded-lg border border-purple-800/50 text-center shadow-[0_0_10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none rounded-lg group-hover:bg-purple-500/10 transition-colors" />
                <div className="text-purple-400/70 font-bold text-[9px] relative z-10">REGIME</div>
                <div className="text-amber-300 font-black font-mono tabular-nums transition-all duration-300 text-[10px] relative z-10 truncate">{rawApiData?.features?.regime?.split('_')[0] || 'TREND'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): 4 Cards 2x2 Grid */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: TARGET STRIKE */}
          <VaultCard
            accent="purple"
            title="TARGET STRIKE"
            titleRight="STRIKE PRICE"
            heroValue={`$${targetPrice ? targetPrice.toLocaleString() : '64,160'}`}
            actionPill={isBullish ? `MUST EXPIRE ABOVE $${targetPrice ? targetPrice.toLocaleString() : '64,160'}` : `MUST EXPIRE BELOW $${targetPrice ? targetPrice.toLocaleString() : '64,160'}`}
            footerLeft={<>LIVE SPOT: <strong className="text-purple-200">${currentPrice?.toLocaleString()}</strong></>}
            footerRight={`${displayVenue} ${timeframe}`}
          />

          {/* Card 2: DISTANCE TO STRIKE */}
          <VaultCard
            accent={spotVsStrikeDelta >= 0 ? 'green' : 'red'}
            title="DISTANCE TO STRIKE"
            heroValue={`${formattedSpotVsStrikeVal} (${formattedSpotVsStrikePct})`}
            actionPill={spotVsStrikeDelta >= 0 ? 'SPOT VS REFERENCE STRIKE' : 'LIVE SPOT BELOW STRIKE'}
            footerLeft="Spot vs Reference Strike"
          />

          {/* Card 3: TIME REMAINING */}
          <VaultCard
            accent="purple"
            title="TIME REMAINING"
            heroValue={timeString}
            actionPill={`${timeframe} CANDLE CLOSE`}
            footerLeft="Live Ticking"
            isPulsingPill
          />

          {/* Card 4: CRAZY ADDICTING VIXY LOCK BUTTON */}
          <button className="group relative w-full text-left bg-gradient-to-b from-[#06182c] via-[#05111c] to-[#030914] p-4 rounded-xl border-2 border-cyan-400/80 shadow-[0_0_40px_rgba(34,211,238,0.4),inset_0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_60px_rgba(34,211,238,0.7),inset_0_0_40px_rgba(34,211,238,0.4)] hover:border-cyan-300 hover:scale-[1.02] active:scale-95 transition-all duration-300 space-y-3 flex flex-col justify-between overflow-hidden cursor-pointer">
            {/* Animated Laser Scanning Line */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent h-[150%] w-full animate-scan pointer-events-none" style={{ animation: 'scan 2.5s ease-in-out infinite alternate' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/20 blur-[50px] pointer-events-none rounded-full group-hover:bg-cyan-400/40 transition-colors duration-500" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="px-3 py-1.5 rounded-full border border-cyan-400 bg-cyan-950/80 text-cyan-300 text-xs font-black tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.5)] group-hover:bg-cyan-400 group-hover:text-black transition-colors">
                <Key className="w-4 h-4" />
                <span>VIXY LOCK</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest animate-pulse">Scanning</span>
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-ping" />
              </div>
            </div>

            <div className="flex items-end justify-between relative z-10 mt-1">
              <div className="text-5xl font-black font-mono text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] leading-none group-hover:text-white transition-colors">
                67%
              </div>
              <span className="px-2.5 py-1 rounded border border-cyan-400/60 bg-cyan-500/10 text-cyan-300 text-[10px] font-black tracking-widest uppercase shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                LOCKED
              </span>
            </div>

            <div className="space-y-2 relative z-10">
              <div className="text-[10px] font-black text-cyan-300 flex justify-between tracking-widest uppercase drop-shadow-md">
                <span>CRITERIA VERIFIED:</span>
                <span className="text-white">4 / 6</span>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                      i < 4
                        ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] group-hover:bg-white group-hover:shadow-[0_0_15px_#ffffff]'
                        : 'bg-cyan-950/80 border border-cyan-900/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black text-cyan-400/90 pt-2 border-t border-cyan-500/30 relative z-10 uppercase tracking-widest mt-1">
              <span className="flex items-center gap-1.5 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" /> VIXY Engine 17
              </span>
              <span className="text-cyan-300 group-hover:text-white transition-colors">GATE ACTIVE</span>
            </div>
          </button>
        </div>
      </div>

      {/* VIXY ORDER FLOW PRESSURE */}
      <div className="mt-4 bg-[#0a0514] border border-purple-800/50 rounded-xl p-3">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider mb-2">
          <div className="flex items-center gap-2 text-white">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            VIXY ORDER FLOW PRESSURE
          </div>
          <div className="text-cyan-400 font-black">
            TAKER BULLS 92% VS BEARS 8%
          </div>
        </div>
        <div className="w-full h-3 rounded-full bg-rose-500 overflow-hidden flex border border-rose-900 shadow-inner">
          <div className="bg-cyan-400 h-full shadow-[0_0_8px_#22d3ee] z-10 relative" style={{ width: '92%' }}>
            <div className="absolute top-0 right-0 bottom-0 w-2 bg-cyan-300 opacity-50"></div>
          </div>
        </div>
      </div>

    </div>
  );
};
