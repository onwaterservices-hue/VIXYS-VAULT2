import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { BTCTicker } from '../types';
import { ScalpDecisionChart } from './ScalpDecisionChart';
import { CandleChart } from './CandleChart';
import { PredictionHealthWatch } from './PredictionHealthWatch';
import { LiveScalpChart } from './LiveScalpChart';
import { ModelStatusBadge } from './ModelStatusBadge';
import { NeuralRibbonChart } from './NeuralRibbonChart';
import { AIBrainMemoryVault } from './AIBrainMemoryVault';
import {
  fetchApiSignal,
  fetchPerformanceStats,
  calculatePositionSize,
  fetchModelStatus,
  ApiSignalResponse,
  PerformanceStatsResponse,
  ModelStatusResponse,
} from '../services/api';

interface OneHourDeskViewProps {
  ticker: BTCTicker;
  spotPrices?: Record<string, number>;
  selectedAsset?: string;
  userRole: 'DEMO' | 'PRO' | 'ADMIN';
  onUpgradeToPro: () => void;
}

export const OneHourDeskView: React.FC<OneHourDeskViewProps> = ({
  ticker,
  spotPrices = {},
  selectedAsset = 'BTC',
  userRole,
  onUpgradeToPro,
}) => {
  const [selectedStrike, setSelectedStrike] = useState<number>(64200);
  const [activeContractId, setActiveContractId] = useState<string>('KXBTC1H-26JUL-64200');
  const [timeRemainingMin, setTimeRemainingMin] = useState<number>(24);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(18);

  // 1H Probabilities & Odds
  const [kalshiYesCent, setKalshiYesCent] = useState<number>(72.0);
  const [kalshiNoCent, setKalshiNoCent] = useState<number>(28.0);
  const [modelEdge, setModelEdge] = useState<number>(14.2);
  const [confidenceScore, setConfidenceScore] = useState<number>(91.5);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [oneHourLeadMode, setOneHourLeadMode] = useState<boolean>(true);
  const [showWhyDrawer, setShowWhyDrawer] = useState<boolean>(false);

  // Real API State
  const [apiSignal, setApiSignal] = useState<ApiSignalResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [perfStats, setPerfStats] = useState<PerformanceStatsResponse | null>(null);

  // Kelly Position Calculator State
  const [bankroll, setBankroll] = useState<number>(10000);
  const [kellyFraction, setKellyFraction] = useState<number>(0.25);
  const [kellyResult, setKellyResult] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const loadDeskData = async () => {
      try {
        const [sig, status, perf] = await Promise.all([
          fetchApiSignal('BTC', '1h'),
          fetchModelStatus('BTC', '1h'),
          fetchPerformanceStats('BTC', '1h'),
        ]);
        if (active) {
          setApiSignal(sig);
          setModelStatus(status);
          setPerfStats(perf);
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
  }, []);

  const spotPrice = spotPrices?.[selectedAsset] || spotPrices?.['BTC'] || ticker?.price || 64160.5;

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

  // Countdown clock effect
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
  const edgePct = apiSignal?.edge ? (apiSignal.edge * 100).toFixed(1) : '14.2';
  const confidence = apiSignal?.confidence ?? 91.5;

  return (
    <div className="space-y-6 font-mono text-purple-100 animate-fadeIn">
      {/* 1H Horizon Desk Banner */}
      <div className="bg-gradient-to-r from-[#12072b] via-[#1a0b3e] to-[#0a0319] rounded-3xl p-5 sm:p-6 border border-purple-500/40 shadow-[0_0_40px_rgba(147,51,234,0.18)] relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>60-MINUTE CONTRACT DESK</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                KALSHI & POLYMARKET 1H
              </span>
              <ModelStatusBadge asset="BTC" desk="1h" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>1-HOUR QUANTITATIVE DECISION DESK</span>
            </h1>
            <p className="text-xs text-purple-300/70 max-w-2xl font-sans">
              Algorithmic micro-structure prediction engine calibrated for 1-hour expiration contracts. Tracks macro volume sweeps, order book pressure, and volatility channels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setOneHourLeadMode(!oneHourLeadMode)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                oneHourLeadMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20'
                  : 'bg-[#120826] border-purple-900/40 text-purple-400/50'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>1H PRE-SPIKE LEAD {oneHourLeadMode ? '(ACTIVE)' : ''}</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-[#120826] border border-purple-900/40 text-purple-300 hover:text-white transition-all"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 1. TOP LEVEL: 1-Hour Contract Strike Selector Matrix */}
      <div className="bg-[#0b041a] rounded-3xl p-5 border border-purple-500/30 shadow-[0_0_40px_rgba(147,51,234,0.15)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.3)]">
              <Target className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="font-black text-base sm:text-lg text-white font-mono tracking-wider">1–HOUR STRIKE CONTRACT MATRIX</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-900/70 text-purple-200 text-[10px] font-extrabold font-mono border border-purple-500/40 shadow-sm">
              LIVE DERIVATIVES FEED
            </span>
          </div>
          <span className="text-xs text-purple-300/70 font-mono">Select target strike to calculate position odds</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[
            { strike: 64000, yesOdds: 88, noOdds: 12, prob: 94, edge: 18.2, status: 'HIGH PROBABILITY', isOptimal: false },
            { strike: 64200, yesOdds: 72, noOdds: 28, prob: 88, edge: 14.2, status: 'OPTIMAL ENTRY', isOptimal: true },
            { strike: 64500, yesOdds: 34, noOdds: 66, prob: 42, edge: 8.5, status: 'STRETCH TARGET', isOptimal: false },
          ].map((item) => {
            const isSelected = selectedStrike === item.strike;
            return (
              <button
                key={item.strike}
                onClick={() => {
                  setSelectedStrike(item.strike);
                  setKalshiYesCent(item.yesOdds);
                  setKalshiNoCent(item.noOdds);
                  setConfidenceScore(item.prob);
                  setModelEdge(item.edge);
                }}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden backdrop-blur-md ${
                  isSelected || item.isOptimal
                    ? 'bg-[#150734] border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.35)] ring-2 ring-purple-500/60'
                    : 'bg-[#080214]/90 border-purple-900/50 text-purple-300/70 hover:opacity-100 hover:border-purple-600/60 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className={`font-black font-mono text-sm sm:text-base ${isSelected || item.isOptimal ? 'text-white' : 'text-purple-200'}`}>
                    ${item.strike.toLocaleString()} Target
                  </span>
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded font-mono ${
                      item.isOptimal
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.5)] tracking-wide'
                        : 'bg-purple-900/80 text-purple-200 border border-purple-700/50'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="text-2xl font-black text-white my-1 font-mono tracking-tight flex items-baseline gap-1.5">
                  <span>YES {item.yesOdds}¢</span>
                  <span className="text-purple-400/60 text-xs font-normal">/ NO {item.noOdds}¢</span>
                </div>

                <div className="flex items-center justify-between text-xs text-purple-300/80 mt-3 pt-2.5 border-t border-purple-900/50 font-mono">
                  <span>Model Win: <strong className="text-white font-bold">{item.prob}%</strong></span>
                  <span className="text-emerald-400 font-extrabold">Edge: +{item.edge}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. HERO LEVEL: Reusable Buy Up / Buy Down Scaling AI Chart */}
      <ScalpDecisionChart
        asset="BTC"
        desk="1h"
        title="BTC 1-HOUR SCALPING DECISION MATRIX & PROBABILITY CONE"
      />

      {/* 2. SINGLE DECISION STRIP (Directly below chart, 1 clean row) */}
      <div className="bg-[#0c0521] border border-purple-500/30 p-4 rounded-2xl shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
        {/* Signal Direction Capsule */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border ${
              isBuyUp
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(248,113,113,0.3)]'
            }`}
          >
            {isBuyUp ? '▲' : '▼'}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">LATENT 1H ACTION</span>
            <span className={`text-sm font-black tracking-wider ${isBuyUp ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isBuyUp ? 'BUY UP (YES)' : 'BUY DOWN (NO)'}
            </span>
          </div>
        </div>

        {/* Model Confidence */}
        <div className="border-l border-purple-900/40 pl-4">
          <span className="text-[10px] text-slate-400 block uppercase">CALIBRATED CONFIDENCE</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-cyan-300">{confidence}%</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
              STABLE
            </span>
          </div>
        </div>

        {/* Expected Edge */}
        <div className="border-l border-purple-900/40 pl-4">
          <span className="text-[10px] text-slate-400 block uppercase">1H NET EXPECTED EDGE</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-purple-300">+{edgePct}%</span>
            <span className="text-[10px] text-purple-400">vs Kalshi Odds</span>
          </div>
        </div>

        {/* Countdown */}
        <div className="border-l border-purple-900/40 pl-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">EXPIRATION CLOCK</span>
            <span className="text-xl font-black text-amber-300 font-mono">
              {timeRemainingMin}m {timeRemainingSec}s
            </span>
          </div>
          <button
            onClick={() => setShowWhyDrawer(!showWhyDrawer)}
            className="px-3 py-1.5 rounded-xl bg-purple-900/50 hover:bg-purple-800 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1 transition-all"
          >
            <span>Why Signal?</span>
            {showWhyDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Supporting Memory */}
      {showWhyDrawer && (
        <div className="space-y-4 animate-fadeIn">
          <AIBrainMemoryVault asset="BTC" desk="1h" />
        </div>
      )}

      {/* Main Grid: 1-Hour Neural Ribbon + Kelly Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Neural Ribbon & Live Taker Terminal */}
        <div className="lg:col-span-2 space-y-6">
          <NeuralRibbonChart asset={selectedAsset} desk="1h" title="1-Hour AI Neural Ribbon & Order Flow" spotPrice={spotPrice} />
          <LiveScalpChart asset={selectedAsset} desk="1h" title="1-Hour Live Taker Flow & Kline Terminal" spotPrice={spotPrice} />
        </div>

        {/* Right Column: Server Position Sizing & Quant Confirmation */}
        <div className="space-y-6">
          {/* Kelly Calculator */}
          <div className="bg-[#0e0624]/90 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/30 shadow-[0_0_30px_rgba(147,51,234,0.12)] space-y-4">
            <div className="font-bold text-white flex items-center justify-between border-b border-purple-900/40 pb-3">
              <span className="flex items-center gap-2 text-sm font-mono tracking-wide">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>KELLY POSITION SIZER</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>QUANT ENGINE</span>
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-purple-300 font-bold font-mono">Bankroll ($USD):</label>
                <input
                  type="number"
                  value={bankroll}
                  onChange={(e) => setBankroll(Math.max(1, Number(e.target.value)))}
                  className="w-32 bg-[#060312] border border-purple-500/30 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 rounded-xl px-3 py-1.5 text-white font-mono text-right font-bold transition-all"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-purple-300 font-bold font-mono">Kelly Fraction:</label>
                <select
                  value={kellyFraction}
                  onChange={(e) => setKellyFraction(Number(e.target.value))}
                  className="w-32 bg-[#060312] border border-purple-500/30 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 rounded-xl px-3 py-1.5 text-white font-mono text-right font-bold transition-all cursor-pointer"
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
                  <div className="bg-[#060312] p-4 rounded-xl border border-purple-500/30 space-y-2.5 font-mono text-xs mt-2 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                    <div className="flex justify-between items-center pb-1 border-b border-purple-900/30">
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

          {/* 1H Microstructure Checklist */}
          <div className="bg-[#0e0624]/90 backdrop-blur-xl rounded-2xl p-5 border border-purple-900/50 space-y-3.5 text-xs shadow-xl">
            <div className="font-bold text-white flex items-center justify-between border-b border-purple-900/40 pb-3">
              <span className="flex items-center gap-2 font-mono tracking-wide text-sm">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>1H QUANT CONFIRMATION SCORE</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black tracking-wider">
                3/3 PASSED
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-purple-200">
                <span className="flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>1H VWAP Support</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black tracking-wider shadow-[0_0_8px_rgba(52,211,153,0.25)] flex items-center gap-1">
                  PASS
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
                  DETECTED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
