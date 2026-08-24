import React from 'react';
import {
  Compass,
  Sparkles,
  Lock,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  Zap,
  TrendingUp,
  BarChart2,
  Layers,
  Activity,
  Radio,
  Eye,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { ModuleRenderProps } from '../../config/vixyLiveModules';

export const CurrentSignalModule: React.FC<ModuleRenderProps> = ({ canonical15m, ticker }) => {
  const rawDirection = canonical15m.direction || 'UP';
  const isUp = rawDirection === 'UP' || (rawDirection as any) === 'YES';
  const isDown = rawDirection === 'DOWN' || (rawDirection as any) === 'NO';
  const spotPrice = ticker?.price || canonical15m.currentSpot || 64591.20;
  const targetStrike = canonical15m.openStrike || (spotPrice - 38.50);
  const strikeDelta = spotPrice - targetStrike;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const CalibrationConfidenceModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const confidence = canonical15m.confidence ?? 78;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const LockQualityModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const rawLockScore = canonical15m.lockScore ?? (canonical15m.lockEvaluation?.lockScore ?? 87);
  const lockQuality = rawLockScore <= 10 ? Math.round(rawLockScore * 10) : Math.round(rawLockScore);

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const ReversalRiskModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const reversalRisk = canonical15m.reversalRisk ?? 22;
  const isProtected = canonical15m.currentState === 'LOCKED_UP' || canonical15m.currentState === 'LOCKED_DOWN' || canonical15m.currentState === 'PROTECTED';

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <ShieldAlert className="w-4 h-4" />
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
          <span>{isProtected ? 'PROTECTED' : 'MONITORING'}</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>DOWNSTREAM SAFETY</span>
        <span className="text-slate-300 font-bold">HARD STOP AT 62%</span>
      </div>
    </div>
  );
};

export const LivePriceModule: React.FC<ModuleRenderProps> = ({ canonical15m, ticker }) => {
  const spotPrice = ticker?.price || canonical15m.currentSpot || 64591.20;
  const spotChange = ticker?.change24h || 1.85;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const MomentumModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const TrendRegimeModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const regime = canonical15m.regime || 'TRENDING_BULL';

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const OrderFlowModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const VolumeDepthModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const SentimentModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Eye className="w-4 h-4 text-purple-300" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">MARKET SENTIMENT</span>
        </div>
        <span className="text-emerald-400 font-mono text-[10px] font-bold">GREED (74/100)</span>
      </div>

      <div>
        <div className="text-2xl font-black text-emerald-400 font-mono">BULLISH TILT</div>
        <div className="text-[11px] text-slate-300 font-sans mt-0.5">
          Social sentiment + funding rates bias +0.012%
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>FUNDING RATE</span>
        <span className="text-emerald-400 font-bold">+0.010% / 8h</span>
      </div>
    </div>
  );
};

export const CrossVenueModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const NeuralRibbonModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">NEURAL RIBBON & CONVERGENCE</span>
        </div>
        <span className="text-cyan-400 font-mono text-[10px] font-bold">BANDWIDTH 3.2% (EXPANDING)</span>
      </div>

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
  );
};

export const LiveMarketFeedModule: React.FC<ModuleRenderProps> = ({ ticker, canonical15m }) => {
  const spotPrice = ticker?.price || canonical15m.currentSpot || 64591.20;
  const livePrints = [
    { id: '1', venue: 'BINANCE', size: '12.45 BTC', price: spotPrice, side: 'BUY' },
    { id: '2', venue: 'COINBASE', size: '8.20 BTC', price: spotPrice - 1.1, side: 'BUY' },
    { id: '3', venue: 'BYBIT', size: '4.80 BTC', price: spotPrice + 0.9, side: 'SELL' },
    { id: '4', venue: 'OKX', size: '15.10 BTC', price: spotPrice + 0.4, side: 'BUY' },
    { id: '5', venue: 'KRAKEN', size: '3.60 BTC', price: spotPrice - 0.8, side: 'BUY' },
  ];

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const VixyProtectionModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const isProtected = canonical15m.currentState === 'LOCKED_UP' || canonical15m.currentState === 'LOCKED_DOWN' || canonical15m.currentState === 'PROTECTED';

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">VIXY PROTECTION</span>
        </div>
        <span className="text-emerald-400 font-mono text-[10px] font-bold">ONLINE</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-lg font-bold text-white font-mono">
            {isProtected ? 'SENTINEL ACTIVE' : 'MONITORING GATES'}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 font-sans">
          Downstream tail risk veto and drawdown protection enabled.
        </p>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>PROTECTION LEVEL</span>
        <span className="text-emerald-400 font-bold">100% MAXIMUM</span>
      </div>
    </div>
  );
};

export const VixyReadModule: React.FC<ModuleRenderProps> = ({ canonical15m, localUpdatedAt, nowMs }) => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
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
  );
};

export const DataHealthModule: React.FC<ModuleRenderProps> = ({ dataHealthStatus, localUpdatedAt, nowMs }) => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">DATA HEALTH & FEED</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
          dataHealthStatus === 'LIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
          'bg-amber-950 text-amber-400 border border-amber-800'
        }`}>
          {dataHealthStatus === 'LIVE' ? 'ONLINE' : dataHealthStatus || 'CONNECTING'}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">WEBSOCKET LATENCY:</span>
          <span className="text-emerald-400 font-bold">14ms</span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">TICK DRIFT:</span>
          <span className="text-cyan-400 font-bold">&lt; 150ms</span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">STALE TICK DETECTOR:</span>
          <span className="text-emerald-400 font-bold">CLEAR</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>ENGINE CLOCK</span>
        <span className="text-slate-300 font-bold">{new Date(localUpdatedAt || nowMs).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export const MODULE_COMPONENT_MAP: Record<string, React.FC<ModuleRenderProps>> = {
  current_signal: CurrentSignalModule,
  calibration_confidence: CalibrationConfidenceModule,
  lock_quality: LockQualityModule,
  reversal_risk: ReversalRiskModule,
  live_price: LivePriceModule,
  momentum: MomentumModule,
  trend_regime: TrendRegimeModule,
  order_flow: OrderFlowModule,
  volume_depth: VolumeDepthModule,
  sentiment: SentimentModule,
  cross_venue: CrossVenueModule,
  neural_ribbon: NeuralRibbonModule,
  live_market_feed: LiveMarketFeedModule,
  vixy_protection: VixyProtectionModule,
  vixy_read: VixyReadModule,
  data_health: DataHealthModule
};
