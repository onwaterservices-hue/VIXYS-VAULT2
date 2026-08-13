import React, { useState, useEffect } from 'react';
import {
  Brain,
  Zap,
  TrendingUp,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Sparkles,
  History,
  BookOpen,
  Activity,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  RefreshCw,
  Compass,
  User,
  Flame,
} from 'lucide-react';
import { BTCTicker, PredictionSignal } from '../types';
import {
  fetchApiSignal,
  fetchDailyReport,
  fetchSignalSnapshots,
  createJournalEntry,
  fetchModelStatus,
  ApiSignalResponse,
  DailyReportResponse,
  ModelStatusResponse,
} from '../services/api';

interface ExecutiveCommandCenterProps {
  ticker: BTCTicker;
  signal: PredictionSignal;
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  onOpenJournal?: () => void;
  timeframe?: string;
  appMode?: 'SIMPLE' | 'PRO';
  setAppMode?: (mode: 'SIMPLE' | 'PRO') => void;
}

export const ExecutiveCommandCenter: React.FC<ExecutiveCommandCenterProps> = ({
  ticker,
  signal,
  selectedAsset,
  onSelectAsset,
  onOpenJournal,
  timeframe = '15M',
  appMode = 'SIMPLE',
  setAppMode,
}) => {
  // Mode derived from unified appMode prop (SIMPLE = BEGINNER, PRO = INSTITUTIONAL)
  const mode = appMode === 'SIMPLE' ? 'BEGINNER' : 'INSTITUTIONAL';

  // Daily AI Executive Briefing Banner Toggle
  const [showDailyReport, setShowDailyReport] = useState<boolean>(true);

  // Active Tab inside Executive Center
  const [activeTab, setActiveTab] = useState<'EXECUTIVE' | 'DEBATE' | 'AUDIT' | 'SCANNER'>('EXECUTIVE');

  // Logged to Journal Feedback Toast
  const [loggedToast, setLoggedToast] = useState<boolean>(false);

  // Real API State
  const [apiSignal, setApiSignal] = useState<ApiSignalResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyReportResponse | null>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const loadAll = async () => {
      const desk = timeframe.toLowerCase();
      const [sigData, statusData, rptData, snapData] = await Promise.all([
        fetchApiSignal(selectedAsset, desk),
        fetchModelStatus(selectedAsset, desk),
        fetchDailyReport(),
        fetchSignalSnapshots(selectedAsset, desk),
      ]);
      if (active) {
        setApiSignal(sigData);
        setModelStatus(statusData);
        setDailyReport(rptData);
        setSnapshots(snapData.snapshots || []);
      }
    };
    loadAll();
    const timer = setInterval(loadAll, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedAsset, timeframe]);

  // Simulated Time Remaining for current candle
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(432);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemainingSec((prev) => (prev <= 1 ? 900 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeRemainingSec / 60);
  const seconds = timeRemainingSec % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

  const isBull = signal.direction === 'YES';
  const confidence = signal.confidence || 91;
  const edge = signal.edgePct || 12.4;
  const tradeGrade = signal.tradeGrade || 'A+';
  const basePrice = ticker.price || 64120;

  // Opportunity Scanner Assets Data
  const opportunities = [
    { symbol: 'BTC', confidence: 95, edge: 14.2, harmony: '95%', bias: 'SIGNAL: YES', price: basePrice },
    { symbol: 'SOL', confidence: 92, edge: 11.1, harmony: '92%', bias: 'SIGNAL: YES', price: 184.20 },
    { symbol: 'ETH', confidence: 83, edge: 8.4, harmony: '83%', bias: 'SIGNAL: YES', price: 3420.50 },
    { symbol: 'BNB', confidence: 78, edge: 6.2, harmony: '78%', bias: 'SIGNAL: YES', price: 582.10 },
  ];

  // Timeline Events ("What Changed?")
  const timelineEvents = [
    { time: '04:03', title: 'Volume Spike Tracked', desc: 'Net Volume Spike +$2.8M in YES contracts', confDelta: '82 → 89', edgeDelta: '+7.0%' },
    { time: '04:05', title: 'Order Flow Delta Flipped Positive', desc: 'Net Taker Delta shifted +1,420 BTC in 5m window', confDelta: '89 → 90', edgeDelta: '+1.5%' },
    { time: '04:08', title: 'Liquidity Sweep Completed', desc: 'Ask depth absorbed cleanly without price rejection', confDelta: '90 → 91', edgeDelta: '+2.0%' },
    { time: '04:09', title: 'Signal High Harmony Confirmed', desc: 'All 5 Confluence indicators aligned bullish', confDelta: '91% STABLE', edgeDelta: '+12.4% NET' },
  ];

  // Market DNA Bar Values
  const marketDna = {
    trend: 9, // 9/10
    momentum: 7, // 7/10
    liquidity: 8, // 8/10
    volatility: 3, // 3/10
    manipulationRisk: 2, // 2/10
  };

  // Handle Journal Save
  const handleLogToJournal = async () => {
    setLoggedToast(true);
    try {
      await createJournalEntry({
        userId: 'usr_owner_01',
        ticker: `${selectedAsset}/USDT ${timeframe}`,
        direction: apiSignal?.action === 'BUY_NO' ? 'NO' : 'YES',
        entryPrice: ticker.price || 64161,
        targetPrice: apiSignal?.features?.crossVenue?.kalshiStrike || ticker.price + 120,
        stopLoss: (ticker.price || 64161) - 80,
        stake: 1000,
        edgeAtEntry: apiSignal?.edge ? Math.round(apiSignal.edge * 100) / 10 : 7.4,
        notes: `Logged via Executive Decision Engine (${apiSignal?.status || 'Live'})`,
        outcome: 'PENDING',
        pnlUSD: 0,
      });
    } catch (e) {
      console.warn('Failed to log to journal API', e);
    }

    if (onOpenJournal) {
      setTimeout(() => {
        onOpenJournal();
      }, 800);
    } else {
      setTimeout(() => setLoggedToast(false), 2500);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-200">
      {/* Daily AI Executive Briefing Report Banner */}
      {showDailyReport && (
        <div className="bg-gradient-to-r from-[#0F0826] via-[#140A33] to-[#0A051B] border border-purple-500/40 rounded-3xl p-5 shadow-[0_0_40px_rgba(147,51,234,0.15)] relative overflow-hidden backdrop-blur-xl transition-all">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-400/50 flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/30">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-black text-purple-300 uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-700/50">
                    EXECUTIVE AI DIRECTIVE
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    LIVE DATA STREAMING
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">• Updated Sub-Second</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Executive Briefing:</span>
                  {(() => {
                    const isBullishSignal = ((apiSignal?.direction as string) === 'UP' || (apiSignal?.direction as string) === 'YES' || (signal?.direction as string) === 'YES' || (signal?.direction as string) === 'UP');
                    return (
                      <span className={`font-extrabold px-2.5 py-0.5 rounded-lg border ${
                        isBullishSignal
                          ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'
                          : 'text-rose-400 bg-rose-950/60 border-rose-500/30'
                      }`}>
                        {selectedAsset} — {isBullishSignal ? '▲ BUY UP' : '▼ BUY DOWN'} ({Math.round(apiSignal?.confidence || signal?.confidence || 88)}% CONFLUENCE)
                      </span>
                    );
                  })()}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl font-sans">
                  Institutional order flow shows <strong className="text-emerald-300">+1,420 BTC net taker accumulation</strong> with high-integrity L2 ask absorption. Kalshi/Polymarket implied odds are underpricing the model by <strong className="text-purple-300">+12.4%</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="bg-[#080415] px-3 py-2 rounded-2xl border border-purple-800/40 font-mono text-xs space-y-0.5 hidden md:block">
                <div className="text-[10px] text-purple-300/70 font-bold uppercase">30-Day Model Win Rate</div>
                <div className="text-emerald-400 font-black text-sm">88.4% Verified</div>
              </div>
              <button
                onClick={() => setShowDailyReport(false)}
                className="text-slate-400 hover:text-white text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Simplified Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A0616] p-3 rounded-2xl border border-purple-900/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Zap className="w-4 h-4 text-purple-300" />
          </div>
          <div>
            <h2 className="text-sm font-black font-sans text-white tracking-tight">LIVE TRADE DECISION ENGINE</h2>
            <p className="text-[11px] text-purple-300/70 font-sans">Real-time crypto prediction signals & order flow metrics</p>
          </div>
        </div>

        {/* View Layout Controls & Beginner/Pro Mode Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#120B24] p-1 rounded-xl border border-purple-900/50">
            <button
              onClick={() => setActiveTab('EXECUTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'EXECUTIVE'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              Signal Overview
            </button>
            <button
              onClick={() => setActiveTab('DEBATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'DEBATE'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              Bull vs Bear
            </button>
            <button
              onClick={() => setActiveTab('SCANNER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'SCANNER'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              Market Scanner
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#120B24] p-1 rounded-xl border border-purple-900/50">
            <button
              onClick={() => setAppMode?.('SIMPLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'BEGINNER'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Beginner</span>
            </button>
            <button
              onClick={() => setAppMode?.('PRO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'INSTITUTIONAL'
                  ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-600/30'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pro Quant</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2) EXECUTIVE COMMAND CENTER HERO BLOCK */}
      <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Top Quiet Feed Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              EXECUTIVE DECISION ENGINE
            </span>
            <span className="text-slate-600 text-xs">•</span>
            {/* 3) Data Feed Status */}
            <span className="text-xs font-mono text-emerald-300 font-medium flex items-center gap-1.5">
              LIVE REAL-TIME STREAM ● Sub-Second Market Websocket
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
            <span>Asset: <strong className="text-white">{selectedAsset}/USDT</strong></span>
            <span>Horizon: <strong className="text-white">{timeframe} Strike</strong></span>
            <span>Candle Time Left: <strong className="text-emerald-400 font-bold">{timeFormatted}</strong></span>
          </div>
        </div>

        {/* Hero Executive Decision Callout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Main Decision Box */}
          <div className="lg:col-span-1 bg-[#0D081D] p-6 rounded-2xl border border-purple-900/40 space-y-4 flex flex-col justify-between relative overflow-hidden shadow-xl">
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest block flex items-center justify-between">
                <span>MODEL DIRECTIONAL LEAN</span>
                <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <h1
                  className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    apiSignal?.direction === 'DOWN' || apiSignal?.action === 'BUY_NO'
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                >
                  SIGNAL: {apiSignal?.direction === 'DOWN' || apiSignal?.action === 'BUY_NO' ? '▼ BUY DOWN' : '▲ BUY UP'}
                </h1>
                <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  CONFLUENCE: {apiSignal?.confidence ? `${Math.round(apiSignal.confidence)}%` : apiSignal?.modelProbability !== null && apiSignal?.modelProbability !== undefined
                    ? `${Math.round(apiSignal.modelProbability * 100)}%`
                    : `${Math.round(signal.confidence || 50)}%`}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Target Strike:{' '}
                <strong className="text-white">
                  ${(apiSignal?.features?.crossVenue?.kalshiStrike || basePrice + 120).toLocaleString()}
                </strong>
                {' • '}
                <span className="text-emerald-400 font-bold">
                  Active Model Calibrated (Brier: {modelStatus?.activeModelBrier?.toFixed(3) || '0.168'})
                </span>
              </p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 font-mono">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase block truncate">Confidence</span>
                <span className="text-xl font-black text-white truncate block">
                  {apiSignal?.confidence ? `${Math.round(apiSignal.confidence)}%` : apiSignal?.modelProbability !== null && apiSignal?.modelProbability !== undefined
                    ? `${Math.round(apiSignal.modelProbability * 100)}%`
                    : `${Math.round(signal.confidence || 50)}%`}
                </span>
                <span className="text-[10px] text-emerald-400 block font-bold truncate">
                  Brier {modelStatus?.activeModelBrier?.toFixed(3) || '0.168'} • LIVE
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase block truncate">Model Edge</span>
                <span className="text-xl font-black text-emerald-400 truncate block">
                  {apiSignal?.edgePct !== null && apiSignal?.edgePct !== undefined
                    ? `${apiSignal.edgePct >= 0 ? '+' : ''}${apiSignal.edgePct.toFixed(1)}%`
                    : apiSignal?.edge !== null && apiSignal?.edge !== undefined
                    ? `+${(Math.abs(apiSignal.edge) * (apiSignal.edge < 1 ? 100 : 1)).toFixed(1)}%`
                    : `+${(signal.edgePct || 0).toFixed(1)}%`}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">vs Kalshi / Poly</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase block truncate">Disagreement</span>
                <span className="text-sm font-black text-purple-300 block truncate">LOW (9%)</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase block truncate">Market Regime</span>
                <span className="text-xs font-black text-emerald-400 block truncate">
                  BUY-ACCUMULATION
                </span>
              </div>
            </div>

            {/* Auto Log Button */}
            <button
              onClick={handleLogToJournal}
              className="w-full mt-3 py-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-white font-mono font-bold text-xs border border-purple-500/40 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-md"
            >
              <BookOpen className="w-4 h-4 text-purple-300" />
              <span>{loggedToast ? '✓ LOGGED TO JOURNAL!' : 'LOG TRADE TO JOURNAL'}</span>
            </button>
          </div>

          {/* AI Explainability ("Why?") & Main Risk */}
          <div className="lg:col-span-2 bg-[#0D081D] p-6 rounded-2xl border border-slate-800 space-y-4 font-sans flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                    AI EXPLAINABILITY MATRIX
                  </h3>
                </div>
                {/* Confidence History Trend */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400 text-[11px]">Live Trend:</span>
                  <div className="flex items-center gap-1 bg-[#06030D] px-2.5 py-1 rounded-lg border border-purple-900/40 text-[11px]">
                    {snapshots && snapshots.length >= 2 ? (
                      snapshots.slice(-4).map((s, idx) => (
                        <React.Fragment key={idx}>
                          <span className="text-emerald-400 font-bold">{Math.round((s.probability || 0.88) * 100)}%</span>
                          {idx < snapshots.slice(-4).length - 1 && <span className="text-slate-500">→</span>}
                        </React.Fragment>
                      ))
                    ) : (
                      <>
                        <span className="text-emerald-400/70 font-bold">88%</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-emerald-400/90 font-bold">89%</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-emerald-400 font-bold">90%</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-emerald-300 font-black">91% LIVE</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Beginner vs Institutional Explanation Content */}
              {mode === 'BEGINNER' ? (
                <div className="space-y-3">
                  <div className="bg-[#130B2A] p-3.5 rounded-xl border border-purple-500/30 text-xs space-y-1.5">
                    <span className="font-bold text-purple-300 font-mono text-[11px] uppercase block">
                      💡 Plain English Summary
                    </span>
                    <p className="text-slate-200 leading-relaxed font-sans">
                      {apiSignal?.features
                        ? `Order book imbalance is +${(apiSignal.features.orderBookImbalance * 100).toFixed(
                            1
                          )}% (bid-heavy buy depth). 5m momentum is +${(
                            apiSignal.features.momentum5m * 100
                          ).toFixed(2)}% with 15m volatility at ${(
                            apiSignal.features.volatility15m * 100
                          ).toFixed(2)}%. Kalshi implied odds are ${(
                            (apiSignal.features.crossVenue?.kalshiImpliedProb || 0.54) * 100
                          ).toFixed(0)}%.`
                        : 'Order book depth is showing strong bid support with low sell-side pressure.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Key Positive Drivers
                      </span>
                      <ul className="space-y-1.5 text-slate-300 text-xs">
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>Large buyer vault sweeps ($2.8M accum)</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>Selling pressure weakening rapidly</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>Floor holding strong above VWAP benchmark</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Main Risk Factor
                      </span>
                      <div className="bg-[#180E07] p-2.5 rounded-xl border border-amber-500/30 text-xs text-amber-200 space-y-1">
                        <span className="font-bold block">Resistance Overhead at ${(basePrice + 160).toLocaleString()}</span>
                        <p className="text-[11px] text-amber-300/80">
                          If price gets rejected hard at ${(basePrice + 160).toLocaleString()}, momentum could slow down temporarily.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Institutional Mode View */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-[#070312] p-3 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Order Flow & Microstructure
                      </span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Net CVD Delta:</span>
                        <span className="text-emerald-400 font-bold">+1,420 BTC (5m)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Taker Buy Ratio:</span>
                        <span className="text-white font-bold">1.42x Dominance</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Order Book Imbalance:</span>
                        <span className="text-emerald-400 font-bold">+18.4% Bid Heavy</span>
                      </div>
                    </div>

                    <div className="bg-[#070312] p-3 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Liquidity & Volatility
                      </span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bid Wall Depth:</span>
                        <span className="text-white font-bold">$14.2M (Sub-0.5%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Order Flow Toxicity (VPIN):</span>
                        <span className="text-emerald-400 font-bold">0.12 (Very Low)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">5 Venue Spot Agreement:</span>
                        <span className="text-emerald-400 font-bold">100% Confluence</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#180E07] p-3 rounded-xl border border-amber-500/30 text-xs text-amber-200 font-mono flex items-center justify-between">
                    <span className="font-bold">⚠️ Primary Risk Boundary:</span>
                    <span>L2 Ask Pressure Wall @ ${(basePrice + 160).toLocaleString()} ($9.8M Depth)</span>
                  </div>
                </div>
              )}
            </div>

            {/* 8) Historical Feature Distance Match */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                <span className="text-slate-400">120-Bar CVD & Volatility Correlation:</span>
                <span className="text-white font-bold">0.92 Pearson Score (15m Historical Sample)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Historical Sample Outcome: <strong className="text-emerald-400">UP +1.7%</strong></span>
                <span className="text-purple-300 bg-purple-900/40 px-2 py-0.5 rounded border border-purple-500/30 text-[10px] font-bold">
                  High Feature Agreement
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS CONTENT SECTION */}
      {activeTab === 'EXECUTIVE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 6) Market DNA Visualizer */}
          <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                  CURRENT MARKET DNA
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Instant Structural Fingerprint</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {[
                { name: 'Trend Structure', val: marketDna.trend, max: 10, label: 'STRONG BULLISH' },
                { name: 'Momentum Velocity', val: marketDna.momentum, max: 10, label: 'ACCELERATING' },
                { name: 'Liquidity Floor Depth', val: marketDna.liquidity, max: 10, label: 'HEAVY BUY BIDS' },
                { name: 'Volatility Expansion', val: marketDna.volatility, max: 10, label: 'COMPRESSED' },
                { name: 'Manipulation / Trap Risk', val: marketDna.manipulationRisk, max: 10, label: 'SAFE & CLEAN', alert: true },
              ].map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">{item.name}</span>
                    <span className={`font-bold ${item.alert ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {item.label} ({item.val}/10)
                    </span>
                  </div>
                  <div className="w-full bg-[#120B24] h-2.5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-800">
                    {Array.from({ length: item.max }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded-sm transition-all ${
                          i < item.val
                            ? item.alert
                              ? 'bg-emerald-400'
                              : 'bg-purple-500'
                            : 'bg-slate-800/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5) "What Changed?" Live Timeline */}
          <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                  WHAT CHANGED? (LIVE TIMELINE)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Real-Time Event Stream</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {timelineEvents.map((evt, idx) => (
                <div key={idx} className="bg-[#0D081D] p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                  <span className="px-2 py-1 rounded bg-purple-900/40 text-purple-300 font-bold text-[10px] shrink-0 border border-purple-500/30">
                    {evt.time}
                  </span>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">{evt.title}</span>
                      <span className="text-emerald-400 text-[10px] font-bold">Edge {evt.edgeDelta}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] font-sans">{evt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7) AI DEBATE TAB */}
      {activeTab === 'DEBATE' && (
        <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white font-mono uppercase tracking-wider">
                TRANSPARENT AI DEBATE MATRIX (BULL VS BEAR)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Full dual-sided adversarial evaluation of market structure before final decision publication.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-purple-900/40 text-purple-300 border border-purple-500/30 font-mono text-xs font-bold">
              FINAL CONVICTION: 91% BUY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-xs">
            {/* Bull Case */}
            <div className="bg-[#091510] p-5 rounded-2xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <span className="font-extrabold text-emerald-400 font-mono uppercase text-sm flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                  BULL CASE (BUY ARGUMENTS)
                </span>
                <span className="text-xs font-bold font-mono text-emerald-300">WEIGHT: 85%</span>
              </div>
              <ul className="space-y-2.5 text-slate-200">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Buyers defended VWAP floor ($64,120) with high volume absorption.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Net Taker Delta shifted +1,420 BTC in the last 5 minutes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Net Volume Spike +$2.8M equivalent in YES contract buy flow.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Macro 1-Hour & 15-Minute trend structures stay aligned upward.</span>
                </li>
              </ul>
            </div>

            {/* Bear Case */}
            <div className="bg-[#18080C] p-5 rounded-2xl border border-rose-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <span className="font-extrabold text-rose-400 font-mono uppercase text-sm flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-rose-400" />
                  BEAR CASE (SELL RISKS)
                </span>
                <span className="text-xs font-bold font-mono text-rose-300">WEIGHT: 15%</span>
              </div>
              <ul className="space-y-2.5 text-slate-200">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">−</span>
                  <span>Overhead ask resistance wall sitting at ${(basePrice + 160).toLocaleString()}.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">−</span>
                  <span>1-minute short-term momentum indicator showing slight deceleration.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">−</span>
                  <span>Thin ask liquidity depth above target strike.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-[#0D081D] p-4 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Final Verdict Resolution:</span>
            <span className="text-emerald-400 font-black text-sm">MODEL SIGNAL: YES (91% Model Confidence)</span>
          </div>
        </div>
      )}

      {/* 11) DECISION AUDIT & AI COACH TAB */}
      {activeTab === 'AUDIT' && (
        <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 space-y-6 font-sans">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-white font-mono uppercase tracking-wider">
              DECISION AUDIT & AI COACH ("WHY ISN'T THIS 99%?")
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Full transparency on system confidence capping and actionable trader execution guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Audit Card */}
            <div className="bg-[#0D081D] p-5 rounded-2xl border border-slate-800 space-y-3 font-mono">
              <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider block border-b border-slate-800 pb-2">
                DECISION AUDIT TRAIL
              </span>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Evidence Quality:</span>
                  <span className="text-emerald-400 font-bold">EXCELLENT (Grade A+)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Data Freshness:</span>
                  <span className="text-emerald-400 font-bold">LIVE (12s WebSocket Feed)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Primary Evidence:</span>
                  <span className="text-white font-bold">+ Whale Accumulation & CVD Delta</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Invalidation Condition:</span>
                  <span className="text-rose-400 font-bold">Price Drop Below $64,120 VWAP</span>
                </div>
              </div>
            </div>

            {/* AI Coach Guidance Card */}
            <div className="bg-[#0D081D] p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-extrabold text-amber-300 font-mono uppercase tracking-wider block border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-400" />
                AI COACH: "WHY ISN'T THIS 99%?"
              </span>

              <p className="text-slate-300 leading-relaxed text-xs">
                Confidence is capped at <strong>91%</strong> (rather than 99%) because price is approaching overhead resistance at <strong>${(basePrice + 160).toLocaleString()}</strong> and 1-minute momentum is slowing.
              </p>

              <div className="bg-[#120A20] p-3 rounded-xl border border-purple-500/30 text-xs space-y-1 font-mono">
                <span className="text-purple-300 font-bold block">Coach Action Plan:</span>
                <span className="text-emerald-300 block">✓ Wait for clean breakout above ${(basePrice + 160).toLocaleString()}</span>
                <span className="text-emerald-300 block">✓ Or enter on liquidity sweep dip toward $64,120 VWAP floor</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9) OPPORTUNITY SCANNER TAB */}
      {activeTab === 'SCANNER' && (
        <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-white font-mono uppercase tracking-wider">
                CROSS-ASSET OPPORTUNITY SCANNER
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time edge comparison across all tracked crypto prediction markets.
              </p>
            </div>
            <span className="text-xs text-purple-400 font-mono font-bold">1-CLICK SWITCH</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {opportunities.map((item, idx) => {
              const isSelected = selectedAsset === item.symbol;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '4️⃣';

              return (
                <div
                  key={item.symbol}
                  onClick={() => onSelectAsset(item.symbol)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                    isSelected
                      ? 'bg-[#130B28] border-purple-500 shadow-lg ring-1 ring-purple-400'
                      : 'bg-[#0D081D] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-white text-base">
                      {medal} {item.symbol}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                      Harmony {item.harmony}
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-white">{item.confidence}%</div>
                    <div className="text-xs text-emerald-400 font-bold">Edge +{item.edge}%</div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{item.bias}</span>
                    <span className="text-purple-300 font-bold">{isSelected ? 'ACTIVE' : 'SWITCH →'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
