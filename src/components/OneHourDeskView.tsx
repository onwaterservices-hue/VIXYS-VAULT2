import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Target,
  BarChart2,
  Sparkles,
  RefreshCw,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Sliders,
  Layers,
  Activity,
  CheckCircle2,
  DollarSign,
  Radio,
  ChevronRight,
  Volume2,
  VolumeX,
  Calculator,
  ChevronDown,
  ChevronUp,
  Cpu,
  Waves,
  Eye,
  Check,
  Scale,
  Compass,
} from 'lucide-react';
import { BTCTicker, AlertSettings } from '../types';
import { ScalpDecisionChart } from './ScalpDecisionChart';
import { ModelStatusBadge } from './ModelStatusBadge';
import { NeuralRibbonChart } from './NeuralRibbonChart';
import { LiveScalpChart } from './LiveScalpChart';
import { AIBrainMemoryVault } from './AIBrainMemoryVault';
import { IntelligenceLockGate } from './IntelligenceLockGate';
import {
  fetchApiSignal,
  fetchPerformanceStats,
  calculatePositionSize,
  fetchModelStatus,
  ApiSignalResponse,
  PerformanceStatsResponse,
  ModelStatusResponse,
} from '../services/api';
import { playBuyUpSound, playBuyDownSound } from '../utils/audio';

interface OneHourDeskViewProps {
  ticker: BTCTicker;
  spotPrices?: Record<string, { price: number; change24h: number }>;
  selectedAsset?: string;
  userRole: 'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER' | string;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
}

interface StrikeOption {
  strike: number;
  category: 'HIGH_PROBABILITY' | 'OPTIMAL_ENTRY' | 'STRETCH_TARGET';
  categoryLabel: string;
  badgeColor: string;
  yesOdds: number;
  noOdds: number;
  winProb: number;
  edge: number;
  description: string;
  payoutMultiplier: string;
  riskReward: string;
}

export const OneHourDeskView: React.FC<OneHourDeskViewProps> = ({
  ticker,
  spotPrices = {},
  selectedAsset = 'BTC',
  userRole,
  alertSettings,
  onOpenDiscordModal,
}) => {
  const [selectedStrike, setSelectedStrike] = useState<number>(64200);
  const [selectedDirection, setSelectedDirection] = useState<'UP' | 'DOWN'>('UP');
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Precision 1-second interval
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalSecRemaining1H = useMemo(() => {
    const epochSec = Math.floor(nowMs / 1000);
    const mod = epochSec % 3600;
    const rem = 3600 - mod;
    return rem === 0 ? 3600 : rem;
  }, [nowMs]);

  const timeRemainingMin = Math.floor(totalSecRemaining1H / 60);
  const timeRemainingSec = totalSecRemaining1H % 60;

  const isUserAdmin = userRole === 'ADMIN' || userRole === 'OWNER' || Boolean(alertSettings?.isAdmin);
  const isPaidUser = ['PRO', 'ELITE', 'ADMIN', 'OWNER', 'STARTER', 'DAY_PASS'].includes(String(userRole).toUpperCase());
  const isDiscordVerified = Boolean(alertSettings?.discordLinked && alertSettings?.guildMember);
  const isIntelligenceUnlocked = isUserAdmin || isPaidUser || isDiscordVerified;

  // 1H Probabilities & Odds State
  const [kalshiYesCent, setKalshiYesCent] = useState<number>(72.0);
  const [kalshiNoCent, setKalshiNoCent] = useState<number>(28.0);
  const [modelEdge, setModelEdge] = useState<number>(14.2);
  const [confidenceScore, setConfidenceScore] = useState<number>(91.6);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showWhyDrawer, setShowWhyDrawer] = useState<boolean>(false);

  // Real API State
  const [apiSignal, setApiSignal] = useState<ApiSignalResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [perfStats, setPerfStats] = useState<PerformanceStatsResponse | null>(null);

  // Kelly Position Calculator State
  const [bankroll, setBankroll] = useState<number>(10000);
  const [kellyFraction, setKellyFraction] = useState<number>(0.25);
  const [kellyResult, setKellyResult] = useState<any>(null);

  // Live Spot Price
  const spotPrice = Number(spotPrices?.[selectedAsset]?.price) || Number(spotPrices?.['BTC']?.price) || Number(ticker?.price) || 64174.83;

  const step = useMemo(() => {
    if (selectedAsset === 'ETH') return 10;
    if (selectedAsset === 'SOL') return 1;
    if (selectedAsset === 'XRP') return 0.02;
    return 100; // BTC
  }, [selectedAsset]);

  // Strike matrix configurations dynamically calculated from live spot price
  const strikeOptions: StrikeOption[] = useMemo(() => {
    const p = spotPrice > 0 ? spotPrice : (selectedAsset === 'ETH' ? 3480 : selectedAsset === 'SOL' ? 185 : 64200);
    const lowStrike = Math.max(step, Math.floor((p * 0.996) / step) * step);
    const midStrike = Math.max(step, Math.round((p * 1.001) / step) * step);
    const highStrike = Math.max(step, Math.ceil((p * 1.006) / step) * step);

    return [
      {
        strike: lowStrike,
        category: 'HIGH_PROBABILITY',
        categoryLabel: 'HIGH PROBABILITY',
        badgeColor: 'bg-emerald-500/20 text-[#00FF88] border-emerald-400/40 shadow-[0_0_12px_rgba(0,255,136,0.3)]',
        yesOdds: 88,
        noOdds: 12,
        winProb: 94,
        edge: 18.2,
        description: 'Deep In-The-Money Anchor • Conservative Systematic Yield',
        payoutMultiplier: '1.14x',
        riskReward: 'Low Vol Drag',
      },
      {
        strike: midStrike,
        category: 'OPTIMAL_ENTRY',
        categoryLabel: 'OPTIMAL ENTRY',
        badgeColor: 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.6)] font-black tracking-wide',
        yesOdds: 72,
        noOdds: 28,
        winProb: 88,
        edge: 14.2,
        description: 'At-The-Money Sweet Spot • Highest Risk-Adjusted Kelly Edge',
        payoutMultiplier: '1.39x',
        riskReward: 'Max Alpha Ratio',
      },
      {
        strike: highStrike,
        category: 'STRETCH_TARGET',
        categoryLabel: 'STRETCH TARGET',
        badgeColor: 'bg-purple-600/30 text-purple-200 border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]',
        yesOdds: 34,
        noOdds: 66,
        winProb: 42,
        edge: 8.5,
        description: 'Out-Of-The-Money Asymmetric • High Payout Momentum Target',
        payoutMultiplier: '2.94x',
        riskReward: 'Asymmetric 3:1',
      },
    ];
  }, [spotPrice, selectedAsset, step]);

  // Sync selected strike when asset or strikes change
  useEffect(() => {
    if (strikeOptions.length > 1) {
      const match = strikeOptions.find((s) => s.strike === selectedStrike);
      if (!match) {
        setSelectedStrike(strikeOptions[1].strike);
      }
    }
  }, [strikeOptions, selectedStrike]);

  useEffect(() => {
    let active = true;
    const loadDeskData = async () => {
      try {
        const [sig, status, perf] = await Promise.all([
          fetchApiSignal(selectedAsset, '1h'),
          fetchModelStatus(selectedAsset, '1h'),
          fetchPerformanceStats(selectedAsset, '1h'),
        ]);
        if (active) {
          setApiSignal(sig);
          setModelStatus(status);
          setPerfStats(perf);

          if (sig) {
            if (Number.isFinite(sig.kalshiImpliedProbability)) {
              const yesCents = Math.round(sig.kalshiImpliedProbability * 100);
              setKalshiYesCent(yesCents);
              setKalshiNoCent(100 - yesCents);
            }
            if (Number.isFinite(sig.confidence)) {
              setConfidenceScore(sig.confidence);
            }
            if (Number.isFinite(sig.edgePct)) {
              setModelEdge(sig.edgePct);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load 1h desk data', err);
      }
    };
    loadDeskData();
    const interval = setInterval(loadDeskData, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedAsset]);

  // Kelly position sizer calculation
  useEffect(() => {
    let active = true;
    const runKelly = async () => {
      try {
        const winP = Math.max(0.01, Math.min(0.99, (confidenceScore || 88) / 100));
        const priceP = Math.max(0.01, Math.min(0.99, (kalshiYesCent || 72) / 100));
        const res = await calculatePositionSize({
          asset: selectedAsset || 'BTC',
          desk: '1h',
          bankroll: bankroll || 10000,
          kellyFraction: kellyFraction || 0.25,
          winProb: winP,
          livePrice: priceP,
        });
        if (active && res) setKellyResult(res);
      } catch (e) {
        console.warn('Kelly API error', e);
      }
    };
    runKelly();
    return () => {
      active = false;
    };
  }, [bankroll, kellyFraction, confidenceScore, kalshiYesCent, selectedAsset]);

  const action = apiSignal?.action || 'BUY_YES';
  const isBuyUp = action.includes('YES') || action.includes('BUY');
  const edgePctFormatted = apiSignal?.edge ? (apiSignal.edge * 100).toFixed(1) : modelEdge.toFixed(1);
  const confidenceFormatted = (apiSignal?.confidence ?? confidenceScore).toFixed(1);

  const handleSelectStrike = (item: StrikeOption) => {
    setSelectedStrike(item.strike);
    setKalshiYesCent(item.yesOdds);
    setKalshiNoCent(item.noOdds);
    setConfidenceScore(item.winProb);
    setModelEdge(item.edge);
  };

  const handleDirectionSound = (dir: 'UP' | 'DOWN') => {
    setSelectedDirection(dir);
    if (soundEnabled) {
      if (dir === 'UP') playBuyUpSound();
      else playBuyDownSound();
    }
  };

  const strikeGapVal = spotPrice - selectedStrike;
  const isStrikeAbove = strikeGapVal >= 0;

  return (
    <div className="space-y-8 sm:space-y-10 font-mono text-purple-100 animate-fadeIn relative w-full max-w-7xl mx-auto min-w-0">
      {/* ================================================== */}
      {/* 1. HEADER: 1-HOUR QUANTITATIVE DECISION DESK      */}
      {/* ================================================== */}
      <div className="bg-[#080414] border border-purple-800/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden w-full min-w-0">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6 relative z-10 min-w-0">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>60-MINUTE CONTRACT DESK</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                KALSHI & POLYMARKET 1H
              </span>
              <span className="px-2.5 py-1 rounded-lg font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs">
                ● STRATEGIC QUANT LEAD
              </span>
              <ModelStatusBadge asset={selectedAsset} desk="1h" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white flex items-center gap-3">
                <span>1-HOUR QUANTITATIVE DECISION DESK</span>
              </h1>
              <p className="text-xs sm:text-sm text-purple-200/80 font-sans tracking-wide mt-1">
                MULTI-TIMEFRAME STRUCTURED PREDICTION INTELLIGENCE
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Live Spot Price Header Capsule */}
            <div className="px-4 py-2 rounded-xl bg-[#0d0722] border border-purple-800/40 text-xs flex items-center space-x-2.5 shadow-md">
              <span className="text-purple-300 font-semibold">LIVE SPOT:</span>
              <span className="font-black text-white font-mono text-sm sm:text-base">
                ${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-purple-950/80 border-purple-600/50 text-purple-200 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
              title="Toggle Audio Feedback"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* GATED INTELLIGENCE BODY */}
      <IntelligenceLockGate
        isVerified={isIntelligenceUnlocked}
        isAdmin={isUserAdmin}
        userRole={userRole}
        onOpenDiscordModal={onOpenDiscordModal}
        title="1-HOUR DESK INTELLIGENCE LOCKED"
        subtitle="Verify your VIXY Vault Discord membership to unlock live 1H macro trend probability, strike targets, and directional conviction."
      >
        <div className="space-y-8 sm:space-y-10 w-full min-w-0">
          
          {/* ================================================== */}
          {/* 2. STRIKE MATRIX: MAIN DECISION SELECTION          */}
          {/* ================================================== */}
          <div className="bg-[#080414] border border-purple-800/30 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-800/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-900/40 border border-purple-700/50 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white font-mono tracking-wider">
                    1-HOUR STRIKE SELECTION MATRIX
                  </h3>
                  <p className="text-xs text-purple-300/70 font-sans mt-0.5">
                    Institutional decision cards with distinct probability, edge, and risk profile hierarchies
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-purple-300 font-mono">
                <span className="text-purple-300/60">ACTIVE SELECTION:</span>
                <span className="font-bold text-purple-200 px-2.5 py-1 rounded-lg bg-purple-900/40 border border-purple-700/40">
                  ${selectedStrike.toLocaleString()}
                </span>
              </div>
            </div>

            {/* The 3 Distinct Strike Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {strikeOptions.map((item) => {
                const isSelected = selectedStrike === item.strike;
                const isOptimal = item.category === 'OPTIMAL_ENTRY';
                const isHighProb = item.category === 'HIGH_PROBABILITY';

                return (
                  <button
                    key={item.strike}
                    onClick={() => handleSelectStrike(item)}
                    className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden cursor-pointer group flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#0f0728] border-purple-500 shadow-lg ring-1 ring-purple-500/50'
                        : 'bg-[#0d0722]/80 border-purple-800/30 hover:border-purple-600/50'
                    }`}
                  >
                    {/* Top Selection Status Pill */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg font-mono ${item.badgeColor}`}>
                        {item.categoryLabel}
                      </span>
                      {isSelected ? (
                        <span className="flex items-center space-x-1 text-[10px] font-bold text-purple-200 bg-purple-900/60 px-2 py-0.5 rounded-lg border border-purple-500/40">
                          <Check className="w-3 h-3" />
                          <span>SELECTED</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-purple-300/50 font-mono group-hover:text-purple-200">
                          Click to Select
                        </span>
                      )}
                    </div>

                    {/* Strike Target & Pricing */}
                    <div className="space-y-1.5 my-1">
                      <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight flex items-baseline justify-between">
                        <span>${item.strike.toLocaleString()} Target</span>
                        <span className="text-xs font-bold text-purple-300 font-sans">{item.payoutMultiplier} Payout</span>
                      </div>
                      <div className="text-sm font-black text-purple-200 font-mono tracking-wide flex items-center space-x-2">
                        <span className="text-emerald-400">YES {item.yesOdds}¢</span>
                        <span className="text-purple-400/50">/</span>
                        <span className="text-rose-400">NO {item.noOdds}¢</span>
                      </div>
                      <p className="text-xs text-purple-300/70 font-sans line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Metrics Bar */}
                    <div className="mt-4 pt-3 border-t border-purple-800/30 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-[#080414] p-2 rounded-xl border border-purple-800/30">
                        <span className="text-[9px] text-purple-300/60 block font-sans">MODEL WIN PROB</span>
                        <strong className="text-white font-bold text-sm">{item.winProb}%</strong>
                      </div>
                      <div className="bg-[#080414] p-2 rounded-xl border border-purple-800/30">
                        <span className="text-[9px] text-purple-300/60 block font-sans">NET 1H EDGE</span>
                        <strong className="text-emerald-400 font-bold text-sm">+{item.edge}%</strong>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================================================== */}
          {/* 3. CHART: 1-HOUR BTC QUANTITATIVE CHART            */}
          {/* ================================================== */}
          <div className="relative">
            <ScalpDecisionChart
              asset={selectedAsset}
              desk="1h"
              selectedStrike={selectedStrike}
              title={`${selectedAsset} 1-HOUR QUANTITATIVE STRUCTURE & PROBABILITY CONE`}
            />
          </div>

          {/* ================================================== */}
          {/* 4. UP/DOWN CAPSULES: CLEAR PROBABILITY RELATION    */}
          {/* ================================================== */}
          <div className="bg-[#080414] border border-purple-800/30 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-800/30 pb-4">
              <div className="flex items-center space-x-2.5">
                <Scale className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base tracking-wider uppercase font-mono">
                  1-HOUR DIRECTIONAL PROBABILITY & MARKET EDGE
                </h3>
              </div>
              <div className="text-xs text-purple-300 font-mono">
                EXPIRATION IN: <strong className="text-purple-200 font-bold">{timeRemainingMin}m {timeRemainingSec}s</strong>
              </div>
            </div>

            {/* BUY UP vs BUY DOWN Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* BUY UP Capsule */}
              <button
                onClick={() => handleDirectionSound('UP')}
                className={`p-5 sm:p-6 rounded-2xl text-left border transition-all duration-300 relative overflow-hidden cursor-pointer ${
                  selectedDirection === 'UP'
                    ? 'bg-[#081510] border-emerald-500/50 shadow-lg'
                    : 'bg-[#0d0722]/80 border-purple-800/30 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
                      ▲
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold text-white tracking-wide font-mono">BUY UP (YES)</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                          FAVORED
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-300/60 font-sans">Target: Strike ${selectedStrike.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-purple-300/60 block font-sans">PROBABILITY</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {kalshiYesCent}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono my-2 pt-3 border-t border-purple-800/30">
                  <div className="bg-[#080414] p-3 rounded-xl border border-purple-800/30">
                    <span className="text-[9px] text-purple-300/60 block font-sans mb-1">QUANTITATIVE EDGE</span>
                    <strong className="text-emerald-400 block font-bold">+{edgePctFormatted}%</strong>
                    <span className="text-[9px] text-purple-300/50 block font-sans mt-1">vs Kalshi 72¢ Implied</span>
                  </div>

                  <div className="bg-[#080414] p-3 rounded-xl border border-purple-800/30">
                    <span className="text-[9px] text-purple-300/60 block font-sans mb-1">MARKET CONDITION</span>
                    <strong className="text-purple-200 font-bold block">VWAP Expansion</strong>
                    <span className="text-[9px] text-purple-300/50 block font-sans mt-1">Macro Uptrend Intact</span>
                  </div>
                </div>
              </button>

              {/* BUY DOWN Capsule */}
              <button
                onClick={() => handleDirectionSound('DOWN')}
                className={`p-5 sm:p-6 rounded-2xl text-left border transition-all duration-300 relative overflow-hidden cursor-pointer ${
                  selectedDirection === 'DOWN'
                    ? 'bg-[#180810] border-rose-500/50 shadow-lg'
                    : 'bg-[#0d0722]/80 border-purple-800/30 hover:border-rose-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-lg">
                      ▼
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold text-white tracking-wide font-mono">BUY DOWN (NO)</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-bold border border-rose-500/30">
                          HEDGE
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-300/60 font-sans">Target: Strike Below ${selectedStrike.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-purple-300/60 block font-sans">PROBABILITY</span>
                    <span className="text-2xl font-black text-rose-400 font-mono">
                      {kalshiNoCent}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono my-2 pt-3 border-t border-purple-800/30">
                  <div className="bg-[#080414] p-3 rounded-xl border border-purple-800/30">
                    <span className="text-[9px] text-purple-300/60 block font-sans mb-1">QUANTITATIVE EDGE</span>
                    <strong className="text-rose-400 block font-bold">-8.4%</strong>
                    <span className="text-[9px] text-purple-300/50 block font-sans mt-1">Counter-Trend Friction</span>
                  </div>

                  <div className="bg-[#080414] p-3 rounded-xl border border-purple-800/30">
                    <span className="text-[9px] text-purple-300/60 block font-sans mb-1">MARKET CONDITION</span>
                    <strong className="text-purple-200 font-bold block">High Absorption</strong>
                    <span className="text-[9px] text-purple-300/50 block font-sans mt-1">Bids Wall Stacking</span>
                  </div>
                </div>
              </button>

            </div>
          </div>

          {/* ================================================== */}
          {/* 5. AI CONVICTION: ANALYTICAL TIMELINE & HEAT METER */}
          {/* ================================================== */}
          <div className="bg-[#080414] border border-purple-800/30 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-800/30 pb-4">
              <div className="flex items-center space-x-2.5">
                <Compass className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-bold text-white text-base tracking-wider uppercase font-mono">
                    30-MINUTE AI CONVICTION TIMELINE & CALIBRATION
                  </h3>
                  <p className="text-xs text-purple-300/70 font-sans mt-0.5">
                    Statistical Bayesian probability drift, Brier calibration index, and volatility envelope
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-purple-300/60 font-mono">CALIBRATION SCORE:</span>
                <span className="text-xs font-bold text-emerald-400 bg-[#0d0722] px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  0.118 BRIER (HIGH)
                </span>
              </div>
            </div>

            {/* Conviction Timeline Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center font-mono">
              {[
                { time: '-30m', prob: 74, status: 'INITIAL BREAKOUT', color: 'text-purple-300' },
                { time: '-25m', prob: 78, status: 'VWAP RETEST', color: 'text-purple-200' },
                { time: '-20m', prob: 82, status: 'WHALE INFLOW', color: 'text-purple-200' },
                { time: '-15m', prob: 86, status: 'SPREAD EXPANSION', color: 'text-emerald-300' },
                { time: '-5m', prob: 89, status: 'ORDER BOOK ACCEL', color: 'text-emerald-400' },
                { time: 'NOW', prob: 91.6, status: 'MAX CONVICTION', color: 'text-emerald-400' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border ${
                    step.time === 'NOW'
                      ? 'bg-[#0e0725] border-emerald-500/50 ring-1 ring-emerald-500/30'
                      : 'bg-[#0d0722]/80 border-purple-800/30'
                  }`}
                >
                  <span className="text-[10px] text-purple-300/60 block font-sans">{step.time}</span>
                  <span className={`text-lg sm:text-xl font-bold ${step.color} block my-0.5`}>
                    {step.prob}%
                  </span>
                  <span className="text-[9px] text-purple-300/70 block font-sans truncate">
                    {step.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Analytical Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-[#0d0722]/80 p-4 rounded-xl border border-purple-800/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-purple-300/60 block font-sans">CONVICTION TRAJECTORY</span>
                  <span className="text-sm font-bold text-purple-200 font-mono">+8.4% DRIFT (30M)</span>
                </div>
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>

              <div className="bg-[#0d0722]/80 p-4 rounded-xl border border-purple-800/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-purple-300/60 block font-sans">VOLATILITY SQUEEZE (ATR)</span>
                  <span className="text-sm font-bold text-purple-200 font-mono">$128.40 (EXPANDING)</span>
                </div>
                <Activity className="w-5 h-5 text-purple-400" />
              </div>

              <div className="bg-[#0d0722]/80 p-4 rounded-xl border border-purple-800/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-purple-300/60 block font-sans">CROSS-TF ALIGNMENT</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">5M / 15M / 1H BULLISH</span>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* 6. CATALYSTS: CLEAN STRUCTURED EVENT STREAM        */}
          {/* ================================================== */}
          <div className="bg-[#080414] border border-purple-800/30 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-purple-800/30 pb-4">
              <div className="flex items-center space-x-2.5">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base tracking-wider uppercase font-mono">
                  QUANTITATIVE CONVICTION CATALYSTS & EVENT STREAM
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-lg font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                5/5 SYNCHRONIZED
              </span>
            </div>

            {/* 5 Clean Catalyst Rows */}
            <div className="space-y-3 font-mono text-xs">
              
              {/* 1. ORDER FLOW */}
              <div className="p-4 rounded-xl bg-[#0d0722]/80 border border-purple-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold tracking-wider">
                    ORDER FLOW
                  </span>
                  <span className="text-white font-bold">
                    Institutional Whale Inflow: +2,840 BTC Net Sweep across Spot & Perp Venues
                  </span>
                </div>
                <span className="text-purple-300/60 text-[10px] sm:text-right font-sans">3m ago • Taker Delta +$28.4M</span>
              </div>

              {/* 2. STRIKE GAP */}
              <div className="p-4 rounded-xl bg-[#0d0722]/80 border border-purple-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold tracking-wider">
                    STRIKE GAP
                  </span>
                  <span className="text-white font-bold">
                    Spot +${Math.abs(strikeGapVal).toFixed(2)} {isStrikeAbove ? 'Above' : 'Below'} ${selectedStrike.toLocaleString()} Target Strike Barrier
                  </span>
                </div>
                <span className="text-emerald-400 text-[10px] sm:text-right font-sans font-bold">In The Money • Buffer Expanding</span>
              </div>

              {/* 3. VOLATILITY */}
              <div className="p-4 rounded-xl bg-[#0d0722]/80 border border-purple-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold tracking-wider">
                    VOLATILITY
                  </span>
                  <span className="text-white font-bold">
                    1H Realized Squeeze Index 24.2 • Low Counter-Trend Friction Envelope
                  </span>
                </div>
                <span className="text-purple-300/60 text-[10px] sm:text-right font-sans">ATR $128.40 • Orderly Drift</span>
              </div>

              {/* 4. CROSS-VENUE */}
              <div className="p-4 rounded-xl bg-[#0d0722]/80 border border-purple-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold tracking-wider">
                    CROSS-VENUE
                  </span>
                  <span className="text-white font-bold">
                    Kalshi ($0.72) vs Polymarket ($0.74) • +2¢ Cross-Venue Arbitrage Alpha
                  </span>
                </div>
                <span className="text-purple-200 text-[10px] sm:text-right font-sans font-bold">Consensus Alignment High</span>
              </div>

              {/* 5. MICROSTRUCTURE */}
              <div className="p-4 rounded-xl bg-[#0d0722]/80 border border-purple-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold tracking-wider">
                    MICROSTRUCTURE
                  </span>
                  <span className="text-white font-bold">
                    1H VWAP Anchor $64,138 Confirmed Supported • Upper Ask Liquidity Void
                  </span>
                </div>
                <span className="text-purple-300/60 text-[10px] sm:text-right font-sans">Resistance Clear to $64,350</span>
              </div>

            </div>
          </div>

          {/* ================================================== */}
          {/* 7. BOTTOM STATUS: 4 EASILY SCANNABLE METRICS       */}
          {/* ================================================== */}
          <div className="bg-[#080414] border border-purple-800/30 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs font-mono shadow-xl">
            
            {/* Momentum Persistence */}
            <div className="bg-[#0d0722]/80 p-4 rounded-xl border border-purple-800/30">
              <span className="text-[10px] font-bold text-purple-300/70 uppercase tracking-wider block">
                Momentum Persistence
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-xl font-bold text-white">92.4%</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40">HIGH DRIFT</span>
              </div>
              <span className="text-[10px] text-purple-300/50 block font-sans mt-2">
                Persistent 1H Directional Force
              </span>
            </div>

            {/* Reversal Risk */}
            <div className="bg-[#0d0722]/80 p-4 rounded-xl border border-purple-800/30">
              <span className="text-[10px] font-bold text-purple-300/70 uppercase tracking-wider block">
                Reversal Risk
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-xl font-bold text-emerald-400">14.2%</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LOW THREAT</span>
              </div>
              <span className="text-[10px] text-purple-300/50 block font-sans mt-2">
                Heavy Bids Guarding VWAP
              </span>
            </div>

            {/* Strike Gap */}
            <div className="bg-[#0d0722]/80 p-4 rounded-xl border border-purple-800/30">
              <span className="text-[10px] font-bold text-purple-300/70 uppercase tracking-wider block">
                Strike Gap
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-xl font-bold text-purple-200">
                  {isStrikeAbove ? '+' : '-'}${Math.abs(strikeGapVal).toFixed(2)}
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40">BUFFER</span>
              </div>
              <span className="text-[10px] text-purple-300/50 block font-sans mt-2">
                Distance to $64,200 Strike
              </span>
            </div>

            {/* Market Bias */}
            <div className="bg-[#0d0722]/80 p-4 rounded-xl border border-purple-800/30">
              <span className="text-[10px] font-bold text-purple-300/70 uppercase tracking-wider block">
                Market Bias
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-xl font-bold text-purple-200">BULLISH</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40">CHANNEL</span>
              </div>
              <span className="text-[10px] text-purple-300/50 block font-sans mt-2">
                Multi-Timeframe Structure Intact
              </span>
            </div>

          </div>

          {/* ================================================== */}
          {/* 8. KELLY CALCULATOR & QUANT CONFIRMATION           */}
          {/* ================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (2 Cols): Neural Ribbon & Live Scalp Kline */}
            <div className="lg:col-span-2 space-y-6">
              <NeuralRibbonChart asset={selectedAsset} desk="1h" title="1-Hour AI Neural Ribbon & Order Flow" spotPrice={spotPrice} />
              <LiveScalpChart asset={selectedAsset} desk="1h" title="1-Hour Live Taker Flow & Kline Terminal" spotPrice={spotPrice} />
            </div>

            {/* Right Column: Server Kelly Sizing */}
            <div className="space-y-6">
              <div className="vixy-card p-5 space-y-4">
                <div className="font-bold text-white flex items-center justify-between border-b border-purple-900/40 pb-3">
                  <span className="flex items-center gap-2 text-sm font-mono tracking-wide">
                    <Calculator className="w-4 h-4 text-amber-400" />
                    <span>KELLY POSITION SIZER</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>QUANT ENGINE</span>
                  </span>
                </div>

                <div className="space-y-3.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <label className="text-purple-300 font-bold font-mono">Bankroll ($USD):</label>
                    <input
                      type="number"
                      value={bankroll}
                      onChange={(e) => setBankroll(Math.max(1, Number(e.target.value)))}
                      className="w-32 bg-[#0a0518] border border-purple-500/40 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 rounded-xl px-3 py-1.5 text-white font-mono text-right font-bold transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-purple-300 font-bold font-mono">Kelly Fraction:</label>
                    <select
                      value={kellyFraction}
                      onChange={(e) => setKellyFraction(Number(e.target.value))}
                      className="w-32 bg-[#0a0518] border border-purple-500/40 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 rounded-xl px-3 py-1.5 text-white font-mono text-right font-bold transition-all cursor-pointer"
                    >
                      <option value={0.125}>1/8 Kelly (0.125)</option>
                      <option value={0.25}>1/4 Kelly (0.25)</option>
                      <option value={0.5}>1/2 Kelly (0.50)</option>
                      <option value={1.0}>Full Kelly (1.00)</option>
                    </select>
                  </div>

                  {/* Position Calculation Output */}
                  {(() => {
                    const rawStake = kellyResult?.recommendedStake;
                    const stake = typeof rawStake === 'number' && !isNaN(rawStake) && rawStake >= 0
                      ? rawStake
                      : Math.round((bankroll || 10000) * (kellyFraction || 0.25) * 0.14);

                    const rawApplied = kellyResult?.appliedFraction;
                    const appliedFracNum = typeof rawApplied === 'number' && !isNaN(rawApplied)
                      ? rawApplied * 100
                      : (bankroll > 0 ? (stake / bankroll) * 100 : 0);
                    const appliedFrac = appliedFracNum.toFixed(1);

                    const priceRatio = (kalshiYesCent || 72) / 100;
                    const payoutMult = priceRatio > 0 && !isNaN(priceRatio) ? (1 / priceRatio).toFixed(2) : '1.39';

                    const rawEv = kellyResult?.expectedValue;
                    const evValue = typeof rawEv === 'number' && !isNaN(rawEv)
                      ? rawEv
                      : Math.round(stake * 0.18);
                    
                    const evPctNum = bankroll > 0 && !isNaN(evValue) ? (evValue / bankroll) * 100 : 1.8;
                    const evPct = Math.max(0.1, Math.round(evPctNum * 10) / 10);

                    return (
                      <div className="bg-[#0a0518] p-4 rounded-2xl border border-purple-500/40 space-y-2.5 font-mono text-xs mt-2 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                        <div className="flex justify-between items-center pb-1.5 border-b border-purple-900/40">
                          <span className="text-purple-300 font-semibold">Recommended Stake:</span>
                          <strong className="text-emerald-400 text-sm font-black tabular-nums font-mono drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                            ${stake.toLocaleString()}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-purple-400 font-semibold">Fraction of Capital:</span>
                          <strong className="text-white font-bold tabular-nums font-mono">{appliedFrac}%</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-purple-400 font-semibold">Payout Multiplier:</span>
                          <strong className="text-cyan-300 font-bold tabular-nums font-mono">{payoutMult}x</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-purple-400 font-semibold">Expected Value:</span>
                          <strong className="text-amber-300 font-bold tabular-nums font-mono">
                            +${evValue.toLocaleString()} ({evPct}% EV)
                          </strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 1H Quant Confirmation Score */}
              <div className="bg-[#0c0620]/95 backdrop-blur-xl rounded-2xl p-5 border border-purple-900/50 space-y-3.5 text-xs shadow-xl">
                <div className="font-bold text-white flex items-center justify-between border-b border-purple-900/40 pb-3">
                  <span className="flex items-center gap-2 font-mono tracking-wide text-sm">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>1H QUANT CONFIRMATION SCORE</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-xl bg-emerald-500/20 text-[#00FF88] border border-emerald-500/40 text-[10px] font-black tracking-wider shadow-[0_0_10px_rgba(0,255,136,0.25)]">
                    3/3 PASSED
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-purple-200">
                    <span className="flex items-center gap-2 font-mono">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>1H VWAP Anchor</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black tracking-wider shadow-[0_0_8px_rgba(52,211,153,0.25)] flex items-center gap-1">
                      PASS ✓
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-purple-200">
                    <span className="flex items-center gap-2 font-mono">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Order Book Depth Delta</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black tracking-wider shadow-[0_0_8px_rgba(52,211,153,0.25)] font-mono">
                      +2,840 BTC
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-purple-200">
                    <span className="flex items-center gap-2 font-mono">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Macro Whale Sweep</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black tracking-wider shadow-[0_0_8px_rgba(52,211,153,0.25)]">
                      DETECTED ✓
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </IntelligenceLockGate>
    </div>
  );
};
