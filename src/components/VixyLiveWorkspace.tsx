import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Radio,
  ExternalLink,
  RefreshCw,
  Sliders,
  Maximize2,
  Eye,
  CheckCircle2,
  Lock,
  Compass,
  DollarSign
} from 'lucide-react';
import { BTCTicker } from '../types';
import { useCanonical15mDecision, getNormalizedLifecycleState } from '../hooks/useCanonical15mDecision';
import { NeuralRibbonChart } from './NeuralRibbonChart';

export interface VixyLiveWorkspaceProps {
  ticker?: BTCTicker;
  onOpenTerminal?: () => void;
  onOpenReplay?: () => void;
  onOpenPricing?: () => void;
}

export const VixyLiveWorkspace: React.FC<VixyLiveWorkspaceProps> = ({
  ticker,
  onOpenTerminal,
  onOpenReplay,
  onOpenPricing
}) => {
  const { decision: canonical15m, dataHealthStatus, localUpdatedAt } = useCanonical15mDecision();
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [activeViewMode, setActiveViewMode] = useState<'grid' | 'compact'>('grid');

  // High precision second interval for authoritative cycle countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Authoritative Cycle Timestamps & Countdown
  const secondsRemaining = useMemo(() => {
    if (canonical15m.cycleEnd && canonical15m.cycleEnd > nowMs) {
      return Math.max(0, Math.floor((canonical15m.cycleEnd - nowMs) / 1000));
    }
    if (typeof canonical15m.timeRemainingSec === 'number') {
      return Math.max(0, canonical15m.timeRemainingSec);
    }
    const epochSec = Math.floor(nowMs / 1000);
    return 900 - (epochSec % 900);
  }, [canonical15m.cycleEnd, canonical15m.timeRemainingSec, nowMs]);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const cycleCountdown = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const cycleProgressPct = Math.min(100, Math.max(0, ((900 - secondsRemaining) / 900) * 100));

  // Direction & Lifecycle
  const rawDirection = canonical15m.direction || 'UP';
  const isUp = rawDirection === 'UP' || (rawDirection as any) === 'YES';
  const isDown = rawDirection === 'DOWN' || (rawDirection as any) === 'NO';
  const isSkip = rawDirection === 'SKIP' || rawDirection === 'NEUTRAL';

  const lifecycle = getNormalizedLifecycleState(canonical15m);
  const isLocked = lifecycle === 'LOCKED' || lifecycle === 'PROTECTED';

  // Metrics
  const confidence = canonical15m.confidence ?? 78;
  const rawLockScore = canonical15m.lockScore ?? (canonical15m.lockEvaluation?.lockScore ?? 87);
  const lockQuality = rawLockScore <= 10 ? Math.round(rawLockScore * 10) : Math.round(rawLockScore);
  const reversalRisk = canonical15m.reversalRisk ?? 22;
  const regime = canonical15m.regime || 'TRENDING_BULL';

  // Spot Price
  const spotPrice = ticker?.price || canonical15m.currentSpot || 64591.20;
  const spotChange = ticker?.change24h || 1.85;
  const targetStrike = canonical15m.openStrike || (spotPrice - 38.50);
  const strikeDelta = spotPrice - targetStrike;

  // Mock real-time prints for Live Market Feed module
  const livePrints = useMemo(() => [
    { id: '1', venue: 'BINANCE', size: '12.45 BTC', price: spotPrice, side: 'BUY', time: '10:48:12' },
    { id: '2', venue: 'COINBASE', size: '8.20 BTC', price: spotPrice - 1.1, side: 'BUY', time: '10:48:09' },
    { id: '3', venue: 'BYBIT', size: '4.80 BTC', price: spotPrice + 0.9, side: 'SELL', time: '10:48:04' },
    { id: '4', venue: 'OKX', size: '15.10 BTC', price: spotPrice + 0.4, side: 'BUY', time: '10:47:58' },
    { id: '5', venue: 'KRAKEN', size: '3.60 BTC', price: spotPrice - 0.8, side: 'BUY', time: '10:47:51' },
  ], [spotPrice]);

  return (
    <div className="min-h-screen bg-[#05040a] p-3 sm:p-5 md:p-6 lg:p-8 text-slate-200 font-sans space-y-6">
      
      {/* 1. TOP COMMAND DECK BAR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-lg">
        
        {/* Left: Deck Branding & Cycle Status */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-600/50 text-amber-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Flame className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                VIXY LIVE
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50 text-[10px] font-mono font-bold">
                COMMAND DECK
              </span>
            </div>
            <p className="text-slate-400 text-xs font-sans">
              Personal multi-module quantitative trading terminal • Cycle {canonical15m.contractId || canonical15m.decisionId}
            </p>
          </div>
        </div>

        {/* Center/Right: Live Telemetry Status Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-mono w-full xl:w-auto justify-start xl:justify-end">
          
          {/* Feed Health */}
          <div className="px-3 py-1.5 rounded-xl bg-[#0e0a22] border border-purple-900/40 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dataHealthStatus === 'LIVE' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'}`} />
            <span className="text-slate-300 text-[11px]">{dataHealthStatus === 'LIVE' ? 'FEED LIVE (14ms)' : dataHealthStatus}</span>
          </div>

          {/* Cycle Expiry Pill */}
          <div className="px-3 py-1.5 rounded-xl bg-[#0e0a22] border border-purple-900/40 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400 text-[11px]">EXPIRES:</span>
            <span className="text-emerald-400 font-bold">{cycleCountdown}</span>
          </div>

          {/* Lifecycle Pill */}
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold text-[11px] ${
            isLocked
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50'
              : 'bg-amber-950/80 text-amber-300 border-amber-700/50'
          }`}>
            <Lock className="w-3 h-3" />
            <span>{lifecycle}</span>
          </div>

          {/* Nav Links */}
          {onOpenTerminal && (
            <button
              onClick={onOpenTerminal}
              className="px-3.5 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/40 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>CPC Lab</span>
            </button>
          )}

          {onOpenReplay && (
            <button
              onClick={onOpenReplay}
              className="px-3.5 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/40 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-300" />
              <span>Replay</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. COMMAND-DECK MODULAR GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        {/* MODULE 1: CURRENT SIGNAL & DIRECTION */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">CURRENT SIGNAL</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
              isUp ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
              isDown ? 'bg-rose-950 text-rose-400 border border-rose-800' :
              'bg-purple-950 text-purple-300 border border-purple-800'
            }`}>
              15M AUTHORITATIVE
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
              isUp ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
              isDown ? 'bg-rose-950/80 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
              'bg-purple-950/80 border-purple-500/50 text-purple-300'
            }`}>
              {isUp ? <ArrowUpRight className="w-7 h-7" /> : isDown ? <ArrowDownRight className="w-7 h-7" /> : <Minus className="w-7 h-7" />}
            </div>
            <div>
              <div className={`text-2xl font-black font-sans tracking-tight ${isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-purple-300'}`}>
                {rawDirection}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                STRIKE: <strong className="text-white">${targetStrike.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>DELTA TO STRIKE</span>
            <span className={`font-bold ${strikeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {strikeDelta >= 0 ? '+' : ''}${strikeDelta.toFixed(2)}
            </span>
          </div>
        </div>

        {/* MODULE 2: CALIBRATION CONFIDENCE */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">CALIBRATION</span>
            </div>
            <span className="text-purple-300 font-mono text-[10px] font-bold">MODEL CONVICTION</span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-white font-mono">{confidence}%</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">HIGH TIER</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden border border-purple-900/50 mt-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-emerald-400 to-cyan-400"
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>EVIDENCE CONFLUENCE</span>
            <span className="text-slate-200 font-bold">{canonical15m.evidenceAlignment ?? 8}/10 GATES ALIGNED</span>
          </div>
        </div>

        {/* MODULE 3: LOCK QUALITY */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">LOCK QUALITY</span>
            </div>
            <span className="text-emerald-400 font-mono text-[10px] font-black">{lockQuality} / 100</span>
          </div>

          <div>
            <div className="text-xl font-black text-white font-sans">
              {lockQuality >= 80 ? 'OPTIMAL LOCK' : lockQuality >= 60 ? 'STRONG LOCK' : 'MODERATE LOCK'}
            </div>
            <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden border border-purple-900/50 mt-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-emerald-400"
                style={{ width: `${Math.min(100, Math.max(0, lockQuality))}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>PROTECTION STABILITY</span>
            <span className="text-emerald-400 font-bold">98.4% RETENTION</span>
          </div>
        </div>

        {/* MODULE 4: REVERSAL RISK & VIXY PROTECTION */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">REVERSAL RISK</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
              reversalRisk < 30 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
              reversalRisk < 50 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
              'bg-rose-950 text-rose-400 border border-rose-800'
            }`}>
              {reversalRisk < 30 ? 'LOW HAZARD' : reversalRisk < 50 ? 'MODERATE' : 'ELEVATED'}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className={`text-3xl font-black font-mono ${reversalRisk < 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {reversalRisk}%
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{isLocked ? 'PROTECTED' : 'MONITORING'}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>DOWNSTREAM SAFETY</span>
            <span className="text-slate-300 font-bold">HARD STOP AT 62%</span>
          </div>
        </div>

        {/* MODULE 5: LIVE SPOT PRICE & 24H DELTA */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">BTC / USD SPOT</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              ${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                spotChange >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'
              }`}>
                {spotChange >= 0 ? '+' : ''}{spotChange.toFixed(2)}% (24h)
              </span>
              <span className="text-[10.5px] text-slate-400 font-mono">BINANCE FEED</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>24H SPREAD</span>
            <span className="text-slate-300 font-bold">$63,890 — $65,240</span>
          </div>
        </div>

        {/* MODULE 6: MOMENTUM VECTOR & VELOCITY */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">MOMENTUM</span>
            </div>
            <span className="text-amber-400 font-mono text-[10px] font-bold">15S VELOCITY</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-400 font-mono">+18.4</span>
              <span className="text-xs text-slate-400 font-mono">RSI (14): 64.2</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans">
              Aggressive buyer absorption pushing past VWAP band.
            </p>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>ACCELERATION</span>
            <span className="text-cyan-400 font-bold">+2.4σ BULL BURST</span>
          </div>
        </div>

        {/* MODULE 7: MARKET REGIME & TREND CONTINUITY */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">REGIME & TREND</span>
            </div>
            <span className="text-purple-300 font-mono text-[10px] font-bold">SUPERTREND</span>
          </div>

          <div className="space-y-1">
            <div className="text-xl font-black text-white font-mono uppercase">
              {regime.replace('_', ' ')}
            </div>
            <p className="text-[11px] text-slate-300 font-sans">
              EMA 9 &gt; 21 &gt; 50 stacked bullish on 15M / 1H frames.
            </p>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>CONTINUITY SCORE</span>
            <span className="text-emerald-400 font-bold">8.4 / 10 STRONG</span>
          </div>
        </div>

        {/* MODULE 8: ORDER FLOW & TAKER DELTA */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">ORDER FLOW</span>
            </div>
            <span className="text-cyan-400 font-mono text-[10px] font-bold">CROSS-VENUE</span>
          </div>

          <div>
            <div className="text-2xl font-black text-emerald-400 font-mono">+$28.4M</div>
            <div className="text-[11px] text-slate-300 font-sans mt-0.5">
              Net Taker Buy Volume Delta (CVD)
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>BUY / SELL RATIO</span>
            <span className="text-emerald-400 font-bold">64.8% BUY SIDE</span>
          </div>
        </div>

        {/* MODULE 9: VOLUME PROFILE & LIQUIDITY DEPTH */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <Layers className="w-4 h-4 text-purple-300" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">VOLUME & DEPTH</span>
            </div>
            <span className="text-purple-300 font-mono text-[10px] font-bold">LIQUIDITY</span>
          </div>

          <div>
            <div className="text-2xl font-black text-white font-mono">$1.42B</div>
            <div className="text-[11px] text-slate-300 font-sans mt-0.5">
              24h Spot Turnover • Deep Book
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>BID / ASK SPREAD</span>
            <span className="text-emerald-400 font-bold">$0.10 (TIGHT)</span>
          </div>
        </div>

        {/* MODULE 10: NEURAL RIBBON / CHART (Span 2 cols on lg) */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 lg:col-span-2 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">NEURAL RIBBON & CONVERGENCE</span>
            </div>
            <span className="text-cyan-400 font-mono text-[10px] font-bold">BANDWIDTH 3.2% (EXPANDING)</span>
          </div>

          {/* Neural Ribbon Spectrum Graphic */}
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">EMA CLUSTER SPREAD:</span>
              <span className="text-emerald-400 font-bold">BULLISH DIVERGENCE</span>
            </div>
            <div className="w-full h-5 rounded-lg bg-[#070512] border border-purple-900/40 p-1 flex gap-1 items-center">
              <div className="h-full flex-1 rounded bg-emerald-500/80 animate-pulse" />
              <div className="h-full flex-1 rounded bg-emerald-400" />
              <div className="h-full flex-1 rounded bg-cyan-400" />
              <div className="h-full flex-1 rounded bg-purple-500" />
              <div className="h-full flex-1 rounded bg-indigo-500" />
            </div>
            <div className="flex justify-between text-[9.5px] text-slate-500 font-mono">
              <span>FAST EMA (9)</span>
              <span>MEDIUM (21)</span>
              <span>SLOW (50)</span>
              <span>BASELINE (200)</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>SQUEEZE STATE</span>
            <span className="text-emerald-400 font-bold">EXPANSION PHASE ACTIVE</span>
          </div>
        </div>

        {/* MODULE 11: LIVE MARKET FEED (Real-time tape) */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">LIVE FEED TAPE</span>
            </div>
            <span className="text-emerald-400 font-mono text-[9px] font-bold uppercase">STREAMING</span>
          </div>

          <div className="space-y-1.5">
            {livePrints.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[10.5px] font-mono p-1.5 rounded-lg bg-[#0e0a22] border border-purple-900/30">
                <span className="text-purple-300 font-bold">{p.venue}</span>
                <span className="text-white">{p.size}</span>
                <span className={`font-bold ${p.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${p.price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>TAPE FLOW</span>
            <span className="text-emerald-400 font-bold">+84% BUY DELTA</span>
          </div>
        </div>

        {/* MODULE 12: CROSS-VENUE ODDS (Kalshi & Polymarket) */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">CROSS-VENUE ODDS</span>
            </div>
            <span className="text-cyan-400 font-mono text-[10px] font-bold">PREDICTION MARKETS</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#0e0a22] border border-purple-900/30">
              <span className="text-xs font-bold text-slate-300 font-sans">KALSHI 15M</span>
              <span className="text-xs font-bold font-mono text-emerald-400">YES 58¢ • NO 42¢</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#0e0a22] border border-purple-900/30">
              <span className="text-xs font-bold text-slate-300 font-sans">POLYMARKET</span>
              <span className="text-xs font-bold font-mono text-emerald-400">UP 59% (+$420K)</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
            <span>VENUE ARBITRAGE</span>
            <span className="text-emerald-400 font-bold">+1.2% BULLISH PREM</span>
          </div>
        </div>

        {/* MODULE 13: VIXY REASONING & HYPOTHESIS READ (Span 3 cols on xl) */}
        <div className="p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between space-y-3 lg:col-span-2 xl:col-span-3 group hover:border-purple-600/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
                <Sparkles className="w-4 h-4 text-purple-300" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">VIXY REASONING SYNTHESIS</span>
            </div>
            <span className="text-purple-300 font-mono text-[10px] font-bold">NEURAL EVIDENCE MATRIX</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
            {canonical15m.gemini?.primaryHypothesis ||
              "Multi-venue taker flow alignment synchronized with 15M cycle policy. Order book imbalance exhibits heavy ask depletion across Binance and Coinbase, confirming directional persistence above current strike."}
          </p>

          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex flex-wrap justify-between gap-2">
            <span>CONTRACT HASH: <strong className="text-slate-300">{canonical15m.contractId || canonical15m.decisionId}</strong></span>
            <span>LAST SYNC: <strong className="text-slate-300">{new Date(localUpdatedAt || nowMs).toLocaleTimeString()}</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
};
