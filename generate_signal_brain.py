import os

new_content = """import React, { useState, useEffect } from 'react';
import { Clock, Cpu, Radio, Activity, Zap, Lock, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';

interface SignalBrainProps {
  feedStatus?: string;
  latencyMs?: number;
  signal: PredictionSignal;
  ticker: BTCTicker;
  timeString: string;
  timeframe: '15M' | '1H';
  lockEvaluation: any;
  rawApiData?: any;
}

export const SignalBrain: React.FC<SignalBrainProps> = ({
  signal,
  ticker,
  timeString,
  timeframe,
  lockEvaluation,
  feedStatus = 'OFFLINE',
  latencyMs = 0,
  rawApiData,
}) => {
  const isStaleOrInvalid = feedStatus === 'STALE' || feedStatus === 'INVALID' || feedStatus === 'OFFLINE';
  
  // Extract values from rawApiData if available to avoid using stale frontend state
  const currentConfidence = rawApiData?.confidence;
  const currentDirection = rawApiData?.direction;
  const currentPrice = rawApiData?.features?.crossVenue?.spot || ticker.price || 64108;
  const targetPrice = rawApiData?.features?.crossVenue?.kalshiStrike || signal.targetPrice;
  const dataAgeMs = rawApiData?.dataAgeMs;
  
  const lastValid = rawApiData?.lastValidSignal || {};
  const displayDirection = isStaleOrInvalid ? lastValid.direction : currentDirection;
  const displayConfidence = isStaleOrInvalid ? lastValid.confidence : currentConfidence;
  
  const isBullish = displayDirection === 'UP' || displayDirection === 'YES';

  // Micro-telemetry values
  const spotVsStrikeDelta = currentPrice && targetPrice ? currentPrice - targetPrice : 0;
  const spotVsStrikePct = targetPrice > 0 ? (spotVsStrikeDelta / targetPrice) * 100 : 0;
  const formattedSpotVsStrikeVal = `${spotVsStrikeDelta >= 0 ? '+' : '-'}$${Math.abs(spotVsStrikeDelta).toFixed(2)}`;
  const formattedSpotVsStrikePct = `${spotVsStrikeDelta >= 0 ? '+' : '-'}${Math.abs(spotVsStrikePct).toFixed(2)}%`;

  // Bulls vs Bears order flow pressure from real data
  const orderFlowVote = rawApiData?.algorithmVotes?.find((v: any) => v.algo === 'Order Flow Delta');
  const isOrderFlowBullish = orderFlowVote?.vote === 'Bullish';
  const bullPct = rawApiData ? (isOrderFlowBullish ? 68 : 32) : 50;
  const bearPct = 100 - bullPct;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'WARNING': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'FAIL': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-5 sm:p-7 space-y-6 font-mono transition-all duration-700 shadow-2xl ${
      isStaleOrInvalid 
        ? 'bg-[#111111] border-slate-600 shadow-[0_0_90px_rgba(100,116,139,0.1)]'
        : isBullish
          ? 'bg-[#03010a] border-emerald-500/70 shadow-[0_0_90px_rgba(16,185,129,0.25)]'
          : 'bg-[#03010a] border-rose-500/70 shadow-[0_0_90px_rgba(244,63,94,0.25)]'
    }`}>
      {/* Terminal Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,10,38,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-0" />
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/60 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border shadow-md ${isStaleOrInvalid ? 'bg-slate-900 border-slate-700' : 'bg-[#0b051b] border-purple-800/80'}`}>
            <span className="font-extrabold text-white uppercase text-xs tracking-wider flex items-center gap-1.5">
              VIXY PREDICTION DIRECTION
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60 text-[11px] font-black text-purple-200 tracking-widest uppercase">
            BTC • {timeframe} • KALSHI
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {isStaleOrInvalid ? (
            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md border flex items-center gap-1.5 bg-slate-900 text-slate-300 border-slate-600">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              SIGNAL PAUSED
            </div>
          ) : (
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md border flex items-center gap-1.5 ${
              isBullish ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60' : 'bg-rose-950/90 text-rose-300 border-rose-500/60'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-ping ${isBullish ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {isBullish ? 'BULLISH PROJECTION' : 'BEARISH PROJECTION'}
            </div>
          )}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#090317] px-2.5 py-1.5 rounded-xl border border-purple-800/50 text-[10px] text-cyan-300 font-mono">
            <Radio className={`w-3 h-3 ${isStaleOrInvalid ? 'text-slate-500' : 'text-cyan-400 animate-pulse'}`} />
            <span>LATENCY {isStaleOrInvalid ? '---' : latencyMs}ms</span>
          </div>
        </div>
      </div>

      {/* Main Command Terminal Decision Card Hero */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className={`lg:col-span-7 p-6 rounded-2xl border flex flex-col justify-between space-y-5 transition-all duration-500 shadow-2xl relative overflow-hidden ${
          isStaleOrInvalid
            ? 'bg-gradient-to-br from-[#1a1a1a]/90 via-[#0d0d0d]/90 to-[#000000]/95 border-slate-500/80 shadow-[0_0_35px_rgba(100,116,139,0.3)]'
            : isBullish
            ? 'bg-gradient-to-br from-[#041d13]/90 via-[#03110c]/90 to-[#030806]/95 border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.3)]'
            : 'bg-gradient-to-br from-[#260510]/90 via-[#18030b]/90 to-[#080104]/95 border-rose-500/80 shadow-[0_0_35px_rgba(244,63,94,0.3)]'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono font-extrabold tracking-wider">
            <span className="flex items-center gap-2 text-purple-200 uppercase">
              <span className="text-white font-bold">VIXY DECISION ENGINE</span>
            </span>
            <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${isStaleOrInvalid ? 'text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded' : 'text-purple-300/80'}`}>
              {isStaleOrInvalid ? 'DATA STALE' : 'HIGH-CONVICTION SETUP'}
            </span>
          </div>

          <div className="space-y-2 my-2">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div className={`text-5xl sm:text-6xl lg:text-7xl font-black font-mono tracking-tight uppercase flex items-center gap-3 drop-shadow-[0_0_35px_rgba(0,0,0,0.9)] ${
                isStaleOrInvalid ? 'text-slate-400' : isBullish ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {isStaleOrInvalid ? 'SIGNAL PAUSED' : (isBullish ? 'BUY UP' : 'BUY DOWN')}
              </div>
              
              {!isStaleOrInvalid && displayConfidence && (
                <div className={`text-5xl sm:text-6xl lg:text-7xl font-black drop-shadow-[0_0_35px_rgba(0,0,0,0.9)] ${
                  isBullish ? 'text-emerald-300/90' : 'text-rose-300/90'
                }`}>
                  {displayConfidence}%
                </div>
              )}
            </div>

            {isStaleOrInvalid ? (
              <div className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 border-t border-slate-700/50 pt-4">
                  <div>
                    <div className="text-slate-500 text-[10px] font-bold">MARKET FEED</div>
                    <div className="text-rose-400 text-sm font-black">{feedStatus}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] font-bold">DATA AGE</div>
                    <div className="text-slate-300 text-sm font-black">{dataAgeMs ? `${(dataAgeMs / 1000).toFixed(1)}s` : 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] font-bold">LAST VALID SIGNAL</div>
                    <div className="text-slate-300 text-sm font-black">{lastValid.direction || 'UNAVAILABLE'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] font-bold">LAST VALID CONFIDENCE</div>
                    <div className="text-slate-300 text-sm font-black">{lastValid.confidence ? `${lastValid.confidence}%` : 'UNAVAILABLE'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm sm:text-base font-bold text-white/90 uppercase tracking-widest flex items-center gap-2 mt-1">
                {isBullish ? '🟢 STRONG BULLISH CONFLUENCE' : '🔴 STRONG BEARISH CONFLUENCE'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Signal Integrity / Algo Votes */}
        <div className="lg:col-span-5 bg-[#05020f] p-5 rounded-2xl border border-purple-800/80 flex flex-col justify-between shadow-2xl relative">
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-2">
              <span className="text-xs font-black text-purple-200 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-400" /> SIGNAL INTEGRITY
              </span>
              <span className="text-[10px] bg-purple-950/50 border border-purple-800/50 px-2 py-0.5 rounded text-purple-300">
                {rawApiData?.algorithmVotes ? Object.keys(rawApiData.algorithmVotes).length : 0} CHECKS
              </span>
            </div>

            <div className="space-y-2">
              {rawApiData?.algorithmVotes ? (
                rawApiData.algorithmVotes.slice(0, 5).map((vote: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[10px] font-mono border-b border-purple-900/30 pb-1">
                    <span className="text-purple-300/80">{vote.algo}</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold ${getStatusColor(vote.status)}`}>
                      {vote.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-slate-500">DATA UNAVAILABLE</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 15M Expiration Condition & Strike Settlement HUD */}
      {!isStaleOrInvalid && (
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
              <span className="text-purple-300/80 font-bold">LIVE SPOT: <strong className="text-white">${currentPrice?.toLocaleString()}</strong></span>
              <span className="text-purple-300/80 font-bold">STRIKE: <strong className="text-cyan-300">${targetPrice?.toLocaleString()}</strong></span>
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
                  {isBullish ? `SETTLE ABOVE $${targetPrice?.toLocaleString()}` : `SETTLE BELOW $${targetPrice?.toLocaleString()}`}
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
                <div className="absolute left-1/2 -translate-x-1/2 h-full w-1 bg-cyan-400 shadow-[0_0_6px_#22d3ee] z-10" title={`Strike: $${targetPrice?.toLocaleString()}`} />
                <div 
                  className={`absolute h-2.5 w-2.5 rounded-full z-20 transition-all duration-500 shadow-md -translate-x-1/2 ${
                    spotVsStrikeDelta >= 0 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                  }`}
                  style={{
                    left: `${Math.min(90, Math.max(10, 50 + (spotVsStrikePct * 10)))}%`
                  }}
                  title={`Spot: $${currentPrice?.toLocaleString()}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
"""

with open('src/components/brains/SignalBrain.tsx', 'w') as f:
    f.write(new_content)
