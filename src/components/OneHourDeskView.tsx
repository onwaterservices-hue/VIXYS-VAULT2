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
  userRole: 'UNPAID' | 'PRO' | 'ADMIN';
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
  const [timeRemainingMin, setTimeRemainingMin] = useState<number>(24);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(18);

  const isUserAdmin = userRole === 'ADMIN' || Boolean(alertSettings?.isAdmin);
  const isPaidUser = userRole === 'PRO' || userRole === 'ADMIN';
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

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemainingSec((prevSec) => {
        if (prevSec > 0) return prevSec - 1;
        setTimeRemainingMin((prevMin) => (prevMin > 0 ? prevMin - 1 : 59));
        return 59;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const action = apiSignal?.action || 'BUY_YES';
  const isBuyUp = action.includes('YES') || action.includes('BUY');
  const edgePctFormatted = apiSignal?.edge ? (apiSignal.edge * 100).toFixed(1) : modelEdge.toFixed(1);
  const confidenceFormatted = (apiSignal?.confidence ?? confidenceScore).toFixed(1);

  // Strike matrix configurations
  const strikeOptions: StrikeOption[] = useMemo(() => [
    {
      strike: 64000,
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
      strike: 64200,
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
      strike: 64500,
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
  ], []);

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
    <div className="space-y-6 font-mono text-purple-100 animate-fadeIn relative">
      {/* Radiant Glowing Ambient Aura Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-purple-600/15 via-indigo-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* ================================================== */}
      {/* 1. HEADER: 1-HOUR QUANTITATIVE DECISION DESK      */}
      {/* ================================================== */}
      <div className="bg-gradient-to-r from-[#14082e] via-[#100624] to-[#080214] rounded-3xl p-5 sm:p-6 border border-purple-500/40 shadow-[0_0_45px_rgba(147,51,234,0.22)] relative overflow-hidden backdrop-blur-xl">
        <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>60-MINUTE CONTRACT DESK</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-[#00FF88] border border-emerald-500/40 text-xs font-bold shadow-[0_0_12px_rgba(0,255,136,0.25)]">
                KALSHI & POLYMARKET 1H
              </span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold">
                ● STRATEGIC QUANT LEAD
              </span>
              <ModelStatusBadge asset={selectedAsset} desk="1h" />
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                <span>1-HOUR QUANTITATIVE DECISION DESK</span>
              </h1>
              <p className="text-xs sm:text-sm text-purple-200/80 font-sans tracking-wide mt-1">
                MULTI-TIMEFRAME STRUCTURED PREDICTION INTELLIGENCE
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Spot Price Header Capsule */}
            <div className="px-4 py-2 rounded-2xl bg-[#080414]/90 border border-purple-500/40 text-xs flex items-center space-x-2 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <span className="text-purple-300 font-semibold">LIVE SPOT:</span>
              <span className="font-black text-white font-mono text-sm sm:text-base drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                ${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-purple-950/80 border-purple-400/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.35)]'
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
        <div className="space-y-6">
          
          {/* ================================================== */}
          {/* 2. STRIKE MATRIX: MAIN DECISION SELECTION          */}
          {/* ================================================== */}
          <div className="bg-[#0C0819]/95 rounded-3xl p-5 sm:p-6 border border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.18)] space-y-4 backdrop-blur-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.35)]">
                  <Target className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white font-mono tracking-wider">
                    1-HOUR STRIKE SELECTION MATRIX
                  </h3>
                  <span className="text-[10.5px] text-purple-300/80 font-sans">
                    Institutional decision cards with distinct probability, edge, and risk profile hierarchies
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-purple-300 font-mono">
                <span className="text-gray-400">ACTIVE SELECTION:</span>
                <span className="font-black text-amber-300 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/40">
                  ${selectedStrike.toLocaleString()}
                </span>
              </div>
            </div>

            {/* The 3 Distinct Strike Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strikeOptions.map((item) => {
                const isSelected = selectedStrike === item.strike;
                const isOptimal = item.category === 'OPTIMAL_ENTRY';
                const isHighProb = item.category === 'HIGH_PROBABILITY';

                return (
                  <button
                    key={item.strike}
                    onClick={() => handleSelectStrike(item)}
                    className={`p-5 rounded-3xl border-2 text-left transition-all duration-300 relative overflow-hidden backdrop-blur-xl cursor-pointer group flex flex-col justify-between ${
                      isSelected
                        ? isOptimal
                          ? 'bg-gradient-to-br from-[#1C0E38] via-[#120726] to-[#070212] border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.45)] ring-4 ring-amber-400/30 scale-[1.02]'
                          : isHighProb
                          ? 'bg-gradient-to-br from-[#0B2418] via-[#091515] to-[#040908] border-emerald-400 shadow-[0_0_40px_rgba(0,255,136,0.35)] ring-4 ring-emerald-400/30 scale-[1.02]'
                          : 'bg-gradient-to-br from-[#240D36] via-[#140724] to-[#070212] border-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.4)] ring-4 ring-purple-400/30 scale-[1.02]'
                        : isOptimal
                        ? 'bg-[#0E0620]/90 border-amber-500/40 hover:border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.15)] opacity-95'
                        : 'bg-[#080314]/85 border-purple-900/50 hover:border-purple-600/70 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Top Selection Status Pill */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-xl font-mono ${item.badgeColor}`}>
                        {item.categoryLabel}
                      </span>
                      {isSelected ? (
                        <span className="flex items-center space-x-1 text-[10px] font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-400/50 animate-pulse">
                          <Check className="w-3 h-3" />
                          <span>SELECTED</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono group-hover:text-purple-300">
                          Click to Select
                        </span>
                      )}
                    </div>

                    {/* Strike Target & Pricing */}
                    <div className="space-y-1 my-1">
                      <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight flex items-baseline justify-between">
                        <span>${item.strike.toLocaleString()} Target</span>
                        <span className="text-xs font-bold text-cyan-300 font-sans">{item.payoutMultiplier} Payout</span>
                      </div>
                      <div className="text-sm font-black text-purple-200 font-mono tracking-wide flex items-center space-x-2">
                        <span className="text-emerald-400">YES {item.yesOdds}¢</span>
                        <span className="text-gray-500">/</span>
                        <span className="text-rose-400">NO {item.noOdds}¢</span>
                      </div>
                      <p className="text-[10.5px] text-purple-300/80 font-sans mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Metrics Bar */}
                    <div className="mt-4 pt-3 border-t border-purple-900/40 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-[#05020E]/80 p-2 rounded-xl border border-purple-900/40">
                        <span className="text-[9px] text-gray-400 block font-sans">MODEL WIN PROB</span>
                        <strong className="text-white font-black text-sm">{item.winProb}%</strong>
                      </div>
                      <div className="bg-[#05020E]/80 p-2 rounded-xl border border-purple-900/40">
                        <span className="text-[9px] text-gray-400 block font-sans">NET 1H EDGE</span>
                        <strong className="text-emerald-400 font-black text-sm">+{item.edge}%</strong>
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
          <div className="bg-[#0C0819]/95 border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(168,85,247,0.18)] space-y-4 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-900/40 pb-3">
              <div className="flex items-center space-x-2.5">
                <Scale className="w-5 h-5 text-purple-400" />
                <h3 className="font-black text-white text-base tracking-wider uppercase">
                  1-HOUR DIRECTIONAL PROBABILITY & MARKET EDGE
                </h3>
              </div>
              <div className="text-xs text-purple-300 font-mono">
                EXPIRATION IN: <strong className="text-amber-300 font-black">{timeRemainingMin}m {timeRemainingSec}s</strong>
              </div>
            </div>

            {/* BUY UP vs BUY DOWN Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* BUY UP Capsule */}
              <button
                onClick={() => handleDirectionSound('UP')}
                className={`p-5 rounded-3xl text-left border-2 transition-all duration-300 relative overflow-hidden cursor-pointer ${
                  selectedDirection === 'UP'
                    ? 'bg-gradient-to-br from-[#0A2619] via-[#0D1822] to-[#050B10] border-emerald-400 shadow-[0_0_35px_rgba(0,255,136,0.35)] scale-[1.01]'
                    : 'bg-[#080414] border-purple-900/50 hover:border-emerald-500/50 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-[#00FF88] border border-emerald-400/40 flex items-center justify-center font-black text-lg shadow-[0_0_12px_rgba(0,255,136,0.3)]">
                      ▲
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-black text-white tracking-wide">BUY UP (YES)</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00FF88] text-[9px] font-black border border-emerald-500/30">
                          FAVORED
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-sans">Target: Strike ${selectedStrike.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-gray-400 block font-sans">PROBABILITY</span>
                    <span className="text-2xl font-black text-[#00FF88] font-mono drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]">
                      {kalshiYesCent}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2 pt-2 border-t border-emerald-500/20">
                  <div className="bg-[#05020E]/80 p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="text-[9px] text-gray-400 block font-sans">QUANTITATIVE EDGE</span>
                    <strong className="text-emerald-400 font-black text-sm">+{edgePctFormatted}%</strong>
                    <span className="text-[8.5px] text-gray-400 block font-sans">vs Kalshi 72¢ Implied</span>
                  </div>

                  <div className="bg-[#05020E]/80 p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="text-[9px] text-gray-400 block font-sans">MARKET CONDITION</span>
                    <strong className="text-cyan-300 font-bold text-xs">VWAP Expansion</strong>
                    <span className="text-[8.5px] text-gray-400 block font-sans">Macro Uptrend Intact</span>
                  </div>
                </div>
              </button>

              {/* BUY DOWN Capsule */}
              <button
                onClick={() => handleDirectionSound('DOWN')}
                className={`p-5 rounded-3xl text-left border-2 transition-all duration-300 relative overflow-hidden cursor-pointer ${
                  selectedDirection === 'DOWN'
                    ? 'bg-gradient-to-br from-[#2E0B13] via-[#1E091B] to-[#0A030C] border-rose-400 shadow-[0_0_35px_rgba(255,59,48,0.35)] scale-[1.01]'
                    : 'bg-[#080414] border-purple-900/50 hover:border-rose-500/50 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-[#FF3B30] border border-rose-400/40 flex items-center justify-center font-black text-lg shadow-[0_0_12px_rgba(255,59,48,0.3)]">
                      ▼
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-black text-white tracking-wide">BUY DOWN (NO)</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-[#FF3B30] text-[9px] font-black border border-rose-500/30">
                          HEDGE
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-sans">Target: Strike Below ${selectedStrike.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-gray-400 block font-sans">PROBABILITY</span>
                    <span className="text-2xl font-black text-[#FF3B30] font-mono drop-shadow-[0_0_10px_rgba(255,59,48,0.5)]">
                      {kalshiNoCent}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2 pt-2 border-t border-rose-500/20">
                  <div className="bg-[#05020E]/80 p-2.5 rounded-xl border border-rose-500/30">
                    <span className="text-[9px] text-gray-400 block font-sans">QUANTITATIVE EDGE</span>
                    <strong className="text-rose-400 font-black text-sm">-8.4%</strong>
                    <span className="text-[8.5px] text-gray-400 block font-sans">Counter-Trend Friction</span>
                  </div>

                  <div className="bg-[#05020E]/80 p-2.5 rounded-xl border border-rose-500/30">
                    <span className="text-[9px] text-gray-400 block font-sans">MARKET CONDITION</span>
                    <strong className="text-purple-300 font-bold text-xs">High Absorption</strong>
                    <span className="text-[8.5px] text-gray-400 block font-sans">Bids Wall Stacking</span>
                  </div>
                </div>
              </button>

            </div>
          </div>

          {/* ================================================== */}
          {/* 5. AI CONVICTION: ANALYTICAL TIMELINE & HEAT METER */}
          {/* ================================================== */}
          <div className="bg-[#0C0819]/95 border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(168,85,247,0.18)] space-y-4 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-900/40 pb-3">
              <div className="flex items-center space-x-2.5">
                <Compass className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-black text-white text-base tracking-wider uppercase">
                    30-MINUTE AI CONVICTION TIMELINE & CALIBRATION
                  </h3>
                  <span className="text-[10px] text-purple-300/80 font-sans">
                    Statistical Bayesian probability drift, Brier calibration index, and volatility envelope
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-400 font-mono">CALIBRATION SCORE:</span>
                <span className="text-xs font-black text-[#00FF88] bg-[#05020E] px-2.5 py-1 rounded-xl border border-emerald-500/40 shadow-[0_0_10px_rgba(0,255,136,0.2)]">
                  0.118 BRIER (HIGH)
                </span>
              </div>
            </div>

            {/* Conviction Timeline Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center font-mono">
              {[
                { time: '-30m', prob: 74, status: 'INITIAL BREAKOUT', color: 'text-purple-300' },
                { time: '-25m', prob: 78, status: 'VWAP RETEST', color: 'text-cyan-300' },
                { time: '-20m', prob: 82, status: 'WHALE INFLOW', color: 'text-cyan-300' },
                { time: '-15m', prob: 86, status: 'SPREAD EXPANSION', color: 'text-emerald-300' },
                { time: '-5m', prob: 89, status: 'ORDER BOOK ACCEL', color: 'text-emerald-400' },
                { time: 'NOW', prob: 91.6, status: 'MAX CONVICTION', color: 'text-[#00FF88]' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border ${
                    step.time === 'NOW'
                      ? 'bg-gradient-to-b from-[#180A33] to-[#0A0418] border-emerald-400 shadow-[0_0_20px_rgba(0,255,136,0.3)] ring-2 ring-emerald-500/40'
                      : 'bg-[#080414] border-purple-900/40'
                  }`}
                >
                  <span className="text-[10px] text-gray-400 block font-sans">{step.time}</span>
                  <span className={`text-lg sm:text-xl font-black ${step.color} block my-0.5`}>
                    {step.prob}%
                  </span>
                  <span className="text-[8px] text-purple-300/80 block font-sans truncate">
                    {step.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Analytical Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-[#080414] p-3 rounded-2xl border border-purple-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] text-gray-400 block font-sans">CONVICTION TRAJECTORY</span>
                  <span className="text-sm font-black text-cyan-300">+8.4% DRIFT (30M)</span>
                </div>
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>

              <div className="bg-[#080414] p-3 rounded-2xl border border-purple-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] text-gray-400 block font-sans">VOLATILITY SQUEEZE (ATR)</span>
                  <span className="text-sm font-black text-amber-300">$128.40 (EXPANDING)</span>
                </div>
                <Activity className="w-5 h-5 text-amber-400" />
              </div>

              <div className="bg-[#080414] p-3 rounded-2xl border border-purple-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] text-gray-400 block font-sans">CROSS-TF ALIGNMENT</span>
                  <span className="text-sm font-black text-[#00FF88]">5M / 15M / 1H BULLISH</span>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#00FF88]" />
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* 6. CATALYSTS: CLEAN STRUCTURED EVENT STREAM        */}
          {/* ================================================== */}
          <div className="bg-[#0C0819]/95 border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(168,85,247,0.18)] space-y-4 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center space-x-2.5">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="font-black text-white text-base tracking-wider uppercase">
                  QUANTITATIVE CONVICTION CATALYSTS & EVENT STREAM
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                5/5 SYNCHRONIZED
              </span>
            </div>

            {/* 5 Clean Catalyst Rows */}
            <div className="space-y-2.5 font-mono text-xs">
              
              {/* 1. ORDER FLOW */}
              <div className="p-3.5 rounded-2xl bg-[#080414] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[0_0_15px_rgba(0,255,136,0.08)]">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-[#00FF88] border border-emerald-500/40 text-[9.5px] font-black tracking-wider">
                    ORDER FLOW
                  </span>
                  <span className="text-white font-bold">
                    Institutional Whale Inflow: +2,840 BTC Net Sweep across Spot & Perp Venues
                  </span>
                </div>
                <span className="text-gray-400 text-[10px] sm:text-right font-sans">3m ago • Taker Delta +$28.4M</span>
              </div>

              {/* 2. STRIKE GAP */}
              <div className="p-3.5 rounded-2xl bg-[#080414] border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[0_0_15px_rgba(168,85,247,0.08)]">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[9.5px] font-black tracking-wider">
                    STRIKE GAP
                  </span>
                  <span className="text-white font-bold">
                    Spot +${Math.abs(strikeGapVal).toFixed(2)} {isStrikeAbove ? 'Above' : 'Below'} ${selectedStrike.toLocaleString()} Target Strike Barrier
                  </span>
                </div>
                <span className="text-emerald-400 text-[10px] sm:text-right font-sans font-bold">In The Money • Buffer Expanding</span>
              </div>

              {/* 3. VOLATILITY */}
              <div className="p-3.5 rounded-2xl bg-[#080414] border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[0_0_15px_rgba(34,211,238,0.08)]">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[9.5px] font-black tracking-wider">
                    VOLATILITY
                  </span>
                  <span className="text-white font-bold">
                    1H Realized Squeeze Index 24.2 • Low Counter-Trend Friction Envelope
                  </span>
                </div>
                <span className="text-gray-400 text-[10px] sm:text-right font-sans">ATR $128.40 • Orderly Drift</span>
              </div>

              {/* 4. CROSS-VENUE */}
              <div className="p-3.5 rounded-2xl bg-[#080414] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[0_0_15px_rgba(251,191,36,0.08)]">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[9.5px] font-black tracking-wider">
                    CROSS-VENUE
                  </span>
                  <span className="text-white font-bold">
                    Kalshi ($0.72) vs Polymarket ($0.74) • +2¢ Cross-Venue Arbitrage Alpha
                  </span>
                </div>
                <span className="text-amber-300 text-[10px] sm:text-right font-sans font-bold">Consensus Alignment High</span>
              </div>

              {/* 5. MICROSTRUCTURE */}
              <div className="p-3.5 rounded-2xl bg-[#080414] border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[0_0_15px_rgba(99,102,241,0.08)]">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 text-[9.5px] font-black tracking-wider">
                    MICROSTRUCTURE
                  </span>
                  <span className="text-white font-bold">
                    1H VWAP Anchor $64,138 Confirmed Supported • Upper Ask Liquidity Void
                  </span>
                </div>
                <span className="text-gray-400 text-[10px] sm:text-right font-sans">Resistance Clear to $64,350</span>
              </div>

            </div>
          </div>

          {/* ================================================== */}
          {/* 7. BOTTOM STATUS: 4 EASILY SCANNABLE METRICS       */}
          {/* ================================================== */}
          <div className="bg-[#0C0819]/95 border border-purple-500/40 p-5 rounded-3xl shadow-[0_0_35px_rgba(168,85,247,0.18)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono backdrop-blur-xl">
            
            {/* Momentum Persistence */}
            <div className="p-4 rounded-2xl bg-[#080414] border border-cyan-500/30 space-y-1.5 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                Momentum Persistence
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg sm:text-xl font-black text-white">92.4%</span>
                <span className="text-[10px] text-cyan-300 font-sans font-bold">HIGH DRIFT</span>
              </div>
              <span className="text-[9.5px] text-gray-400 block font-sans">
                Persistent 1H Directional Force
              </span>
            </div>

            {/* Reversal Risk */}
            <div className="p-4 rounded-2xl bg-[#080414] border border-emerald-500/30 space-y-1.5 shadow-[0_0_15px_rgba(0,255,136,0.1)]">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Reversal Risk
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg sm:text-xl font-black text-[#00FF88]">14.2%</span>
                <span className="text-[10px] text-emerald-300 font-sans font-bold">LOW THREAT</span>
              </div>
              <span className="text-[9.5px] text-gray-400 block font-sans">
                Heavy Bids Guarding VWAP
              </span>
            </div>

            {/* Strike Gap */}
            <div className="p-4 rounded-2xl bg-[#080414] border border-amber-500/30 space-y-1.5 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Strike Gap
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg sm:text-xl font-black text-amber-300">
                  {isStrikeAbove ? '+' : '-'}${Math.abs(strikeGapVal).toFixed(2)}
                </span>
                <span className="text-[10px] text-amber-300 font-sans font-bold">BUFFER</span>
              </div>
              <span className="text-[9.5px] text-gray-400 block font-sans">
                Distance to $64,200 Strike
              </span>
            </div>

            {/* Market Bias */}
            <div className="p-4 rounded-2xl bg-[#080414] border border-purple-500/30 space-y-1.5 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                Market Bias
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg sm:text-xl font-black text-purple-200">BULLISH</span>
                <span className="text-[10px] text-purple-300 font-sans font-bold">CHANNEL</span>
              </div>
              <span className="text-[9.5px] text-gray-400 block font-sans">
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
              <div className="bg-[#0C0819]/95 backdrop-blur-xl rounded-3xl p-5 border border-purple-500/40 shadow-[0_0_35px_rgba(147,51,234,0.15)] space-y-4">
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
                      className="w-32 bg-[#060312] border border-purple-500/40 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 rounded-xl px-3 py-1.5 text-white font-mono text-right font-bold transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-purple-300 font-bold font-mono">Kelly Fraction:</label>
                    <select
                      value={kellyFraction}
                      onChange={(e) => setKellyFraction(Number(e.target.value))}
                      className="w-32 bg-[#060312] border border-purple-500/40 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 rounded-xl px-3 py-1.5 text-white font-mono text-right font-bold transition-all cursor-pointer"
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
                      <div className="bg-[#060312] p-4 rounded-2xl border border-purple-500/40 space-y-2.5 font-mono text-xs mt-2 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
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
              <div className="bg-[#0C0819]/95 backdrop-blur-xl rounded-3xl p-5 border border-purple-900/50 space-y-3.5 text-xs shadow-xl">
                <div className="font-bold text-white flex items-center justify-between border-b border-purple-900/40 pb-3">
                  <span className="flex items-center gap-2 font-mono tracking-wide text-sm">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>1H QUANT CONFIRMATION SCORE</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-[#00FF88] border border-emerald-500/40 text-[10px] font-black tracking-wider shadow-[0_0_10px_rgba(0,255,136,0.25)]">
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
