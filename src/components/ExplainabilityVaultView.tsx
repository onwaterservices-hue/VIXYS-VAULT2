import React, { useState } from 'react';
import {
  BrainCircuit,
  SlidersHorizontal,
  History,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  GitCommit,
  Activity,
  ChevronRight,
  RefreshCw,
  Scale,
  Gauge,
  Lock,
  Layers3
} from 'lucide-react';

import { AlertSettings } from '../types';
import { IntelligenceLockGate } from './IntelligenceLockGate';

interface ExplainabilityVaultViewProps {
  currentSymbol?: string;
  onSelectAsset?: (symbol: string) => void;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
}

interface EngineModule {
  name: string;
  weight: number; // e.g. +0.32 or -0.15
  lean: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  observedFact: string;
  keyMetric: string;
  keyMetricValue: string;
}

interface HistoricalMatch {
  id: string;
  date: string;
  similarity: number; // e.g. 94.2%
  regime: string;
  outcomeText: string;
  resolvedYes: boolean;
  strikeDistance: string;
}

export const ExplainabilityVaultView: React.FC<ExplainabilityVaultViewProps> = ({
  currentSymbol = 'BTC',
  onSelectAsset,
  alertSettings,
  onOpenDiscordModal,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<string>(currentSymbol);
  const [activeTab, setActiveTab] = useState<'evidence' | 'timeline' | 'historical' | 'ranking'>('evidence');
  const [showRawVsCalibrated, setShowRawVsCalibrated] = useState<boolean>(true);

  const isDiscordVerified = Boolean(alertSettings?.discordLinked && alertSettings?.guildMember);

  // Layer 3 Independent Engine Breakdown Data
  const engineModules: EngineModule[] = [
    {
      name: 'Order Flow Engine',
      weight: +0.34,
      lean: 'BULLISH',
      confidence: 91,
      observedFact: 'Aggressive buy market orders swallowing ask liquidity at $64,200.',
      keyMetric: 'Cumulative Delta',
      keyMetricValue: '+1,820 BTC (5m)',
    },
    {
      name: 'Whale Tracker Engine',
      weight: +0.22,
      lean: 'BULLISH',
      confidence: 88,
      observedFact: 'Trailing volume z-score > 2.0 with +$2.48M net taker buys in YES contracts.',
      keyMetric: 'Whale Net Buy',
      keyMetricValue: '+$4.2M (15m)',
    },
    {
      name: 'Liquidity & Book Engine',
      weight: +0.14,
      lean: 'BULLISH',
      confidence: 85,
      observedFact: '$18.4M bid floor stacked beneath $64,000 strike floor.',
      keyMetric: 'Bid-Ask Imbalance',
      keyMetricValue: '3.4x Bull Dominance',
    },
    {
      name: 'Trend & Slope Engine',
      weight: +0.12,
      lean: 'BULLISH',
      confidence: 79,
      observedFact: '5m & 15m VWAP slope trending positive with increasing volume acceleration.',
      keyMetric: 'VWAP Distance',
      keyMetricValue: '+0.42% Above VWAP',
    },
    {
      name: 'Pattern Engine',
      weight: -0.06,
      lean: 'BEARISH',
      confidence: 62,
      observedFact: 'Minor rejection near $64,650 upper Bollinger channel boundary.',
      keyMetric: 'Channel Compression',
      keyMetricValue: 'Overbought Short-term',
    },
    {
      name: 'Volatility Engine',
      weight: +0.08,
      lean: 'NEUTRAL',
      confidence: 75,
      observedFact: 'Realized ATR stabilizing; non-explosive controlled expansion.',
      keyMetric: 'Realized Volatility',
      keyMetricValue: '18.2% Low Noise',
    },
  ];

  // Confidence Delta Timeline
  const confidenceTimeline = [
    {
      time: '14:02:15 (Just now)',
      confidence: '78.4%',
      delta: '+3.2%',
      direction: 'UP',
      reasons: ['Order Flow engine detected +340 BTC buy sweep', 'Whale Vault #02 expanded YES size'],
      regime: 'Bullish Liquidity Expansion',
    },
    {
      time: '13:57:00 (5 mins ago)',
      confidence: '75.2%',
      delta: '+4.1%',
      direction: 'UP',
      reasons: ['Support floor established at $64,000 with 3.4x bid imbalance'],
      regime: 'Bullish Floor Lock',
    },
    {
      time: '13:45:00 (17 mins ago)',
      confidence: '71.1%',
      delta: '-1.5%',
      direction: 'DOWN',
      reasons: ['Short-term pattern engine signaled resistance at $64,650'],
      regime: 'Channel Compression',
    },
    {
      time: '13:30:00 (32 mins ago)',
      confidence: '72.6%',
      delta: '+2.8%',
      direction: 'UP',
      reasons: ['Macro trend slope turned positive above VWAP'],
      regime: 'Trend Continuation',
    },
  ];

  // Historical Setup Matcher Data
  const historicalMatches: HistoricalMatch[] = [
    {
      id: 'm-8821',
      date: 'July 14, 2026',
      similarity: 96.4,
      regime: 'Bullish Floor Lock + Order Delta Acceleration',
      outcomeText: 'Price held strike floor through expiry. YES contract resolved 100%.',
      resolvedYes: true,
      strikeDistance: '+$350 above floor',
    },
    {
      id: 'm-7410',
      date: 'June 28, 2026',
      similarity: 94.1,
      regime: 'Whale Accumulation + High Bid Imbalance',
      outcomeText: 'Floor held securely; ended +$520 above floor at expiration.',
      resolvedYes: true,
      strikeDistance: '+$520 above floor',
    },
    {
      id: 'm-6192',
      date: 'June 11, 2026',
      similarity: 91.8,
      regime: 'Channel Compression into Support Wall',
      outcomeText: 'Temporary spike down test of floor before rallying +$810.',
      resolvedYes: true,
      strikeDistance: '+$810 above floor',
    },
    {
      id: 'm-5043',
      date: 'May 19, 2026',
      similarity: 88.5,
      regime: 'High Volatility Trap + Sell Delta Pressure',
      outcomeText: 'Failed floor support; price broke floor by $120 near expiry.',
      resolvedYes: false,
      strikeDistance: '-$120 below floor',
    },
  ];

  // Opportunity Ranking Matrix
  const opportunityRankings = [
    { asset: 'BTC', strike: '$64,000 YES', rawScore: '84%', calibratedScore: '78.4%', edge: '+12.4%', harmony: 'HIGH (88%)', bias: 'BULLISH' },
    { asset: 'NVDA', strike: '$135,00 YES', rawScore: '89%', calibratedScore: '82.1%', edge: '+15.1%', harmony: 'VERY HIGH (94%)', bias: 'BULLISH' },
    { asset: 'ETH', strike: '$3,400 YES', rawScore: '76%', calibratedScore: '71.5%', edge: '+8.2%', harmony: 'MEDIUM (74%)', bias: 'BULLISH' },
    { asset: 'SOL', strike: '$190 YES', rawScore: '78%', calibratedScore: '73.0%', edge: '+9.5%', harmony: 'HIGH (82%)', bias: 'BULLISH' },
    { asset: 'SPY', strike: '$550 YES', rawScore: '65%', calibratedScore: '61.2%', edge: '+4.1%', harmony: 'NEUTRAL (55%)', bias: 'NEUTRAL' },
  ];

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* EXPLAINABILITY VAULT HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#12072b] via-[#0d0620] to-[#19093b] border border-purple-500/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200 text-xs font-mono font-bold">
              <BrainCircuit className="w-3.5 h-3.5 text-purple-300" />
              <span>VIXY QUANT EXPLAINABILITY ENGINE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300">CALIBRATED PROBABILITY MODEL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Evidence Aggregation & Model Explainability
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 max-w-3xl leading-relaxed">
              Transparent signal decomposition. See exactly why the model adjusted its confidence, which independent engines agree or conflict, and how current conditions match 1,400+ historical setups.
            </p>
          </div>

          {/* Asset Selector */}
          <div className="flex items-center gap-2 bg-[#080413] p-1.5 rounded-2xl border border-purple-900/60 font-mono text-xs">
            {['BTC', 'ETH', 'SOL', 'NVDA', 'SPY'].map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  setSelectedAsset(sym);
                  if (onSelectAsset) onSelectAsset(sym);
                }}
                className={`px-3 py-2 rounded-xl font-extrabold transition-all ${
                  selectedAsset === sym
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 border border-purple-400/40'
                    : 'text-purple-300/70 hover:text-white hover:bg-purple-900/30'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GATED EXPLAINABILITY VAULT CONTENT */}
      <IntelligenceLockGate
        isVerified={isDiscordVerified}
        onOpenDiscordModal={onOpenDiscordModal}
        title="EXPLAINABILITY VAULT LOCKED"
        subtitle="Verify your VIXY Vault Discord membership to unlock signal decomposition, independent engine weightings, and historical setup matching."
      >
        <div className="space-y-6">
          {/* TOP METRIC / CONFIDENCE STABILITY HIGHLIGHT */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Calibrated Probability */}
        <div className="p-5 rounded-2xl bg-[#0b051b] border border-purple-900/50 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-purple-300/70">
            <span>CALIBRATED PROBABILITY</span>
            <span title="Historical success rate under matching market conditions">
              <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-3xl font-black text-emerald-400">78.4%</span>
            <span className="text-xs font-bold text-emerald-300/80 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
              STABLE ↑ (+3.2% 5m)
            </span>
          </div>
          <p className="text-[11px] text-purple-300/60 font-sans">
            Raw Model: <strong className="text-purple-200">84.0%</strong> • Calibrated for 18% ATR Regime
          </p>
        </div>

        {/* Card 2: Signal Disagreement Score */}
        <div className="p-5 rounded-2xl bg-[#0b051b] border border-purple-900/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-purple-300/70">
            <span>ENGINE HARMONY</span>
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-3xl font-black text-cyan-300">88.0%</span>
            <span className="text-xs font-bold text-cyan-300/80 bg-cyan-500/15 px-2 py-0.5 rounded-md border border-cyan-500/30">
              LOW FRICTION
            </span>
          </div>
          <p className="text-[11px] text-purple-300/60 font-sans">
            5 of 6 engines agree on Bullish Strike Defense
          </p>
        </div>

        {/* Card 3: Historical Match Accuracy */}
        <div className="p-5 rounded-2xl bg-[#0b051b] border border-purple-900/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-purple-300/70">
            <span>HISTORICAL WIN RATE</span>
            <History className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-3xl font-black text-purple-200">76.4%</span>
            <span className="text-xs font-mono text-purple-300/60">
              1,420 Matches
            </span>
          </div>
          <p className="text-[11px] text-purple-300/60 font-sans">
            Based on setups with ≥90% structural similarity
          </p>
        </div>

        {/* Card 4: Primary Evidence Driver */}
        <div className="p-5 rounded-2xl bg-[#0b051b] border border-purple-900/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-purple-300/70">
            <span>KEY CATALYST</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-black text-white font-mono truncate">
            Whale Net Delta + Order Flow
          </div>
          <p className="text-[11px] text-emerald-400 font-sans font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            +$4.2M net buy volume absorbing sell attempts
          </p>
        </div>
      </div>

      {/* NAVIGATION TABS WITHIN EXPLAINABILITY */}
      <div className="flex items-center justify-between border-b border-purple-900/40 pb-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          {[
            { id: 'evidence', label: '6-Engine Evidence Aggregator', icon: Layers3 },
            { id: 'timeline', label: 'Confidence Delta Timeline', icon: Clock },
            { id: 'historical', label: 'Historical Setup Matcher', icon: History },
            { id: 'ranking', label: 'Cross-Asset Opportunity Ranking', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 border border-purple-400/40'
                    : 'text-purple-300/70 hover:text-white hover:bg-purple-900/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowRawVsCalibrated(!showRawVsCalibrated)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090415] border border-purple-800/40 text-purple-200 text-xs font-bold hover:bg-purple-900/30 transition-all"
        >
          <Scale className="w-3.5 h-3.5 text-purple-400" />
          <span>{showRawVsCalibrated ? 'Showing Calibrated Scores' : 'Showing Raw Model Scores'}</span>
        </button>
      </div>

      {/* TAB CONTENT 1: 6-ENGINE EVIDENCE AGGREGATOR */}
      {activeTab === 'evidence' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLS: ENGINE DECOMPOSITION */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                Independent Signal Module Decomposition ({selectedAsset})
              </h2>
              <span className="text-xs text-purple-300/60 font-mono">
                Weights contribute to final probability
              </span>
            </div>

            <div className="space-y-3">
              {engineModules.map((module, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#0b051b] border border-purple-900/40 space-y-3 hover:border-purple-600/50 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                          module.weight > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {module.weight > 0 ? `+${module.weight}` : module.weight}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white font-mono">
                          {module.name}
                        </div>
                        <div className="text-[11px] text-purple-300/60 font-sans">
                          Confidence: <strong className="text-purple-200">{module.confidence}%</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <div className="text-right">
                        <div className="text-[10px] text-purple-300/50 uppercase">Key Observation</div>
                        <div className="font-extrabold text-cyan-300">{module.keyMetricValue}</div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                          module.lean === 'BULLISH'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : module.lean === 'BEARISH'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {module.lean}
                      </span>
                    </div>
                  </div>

                  {/* Fact line */}
                  <p className="text-xs text-purple-200/80 font-sans bg-[#06030e] p-2.5 rounded-xl border border-purple-950/60 leading-relaxed">
                    💡 <strong>Observed Fact:</strong> {module.observedFact}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COL: SIGNAL DISAGREEMENT & MAIN RISKS */}
          <div className="space-y-6">
            {/* SIGNAL DISAGREEMENT METER */}
            <div className="p-5 rounded-3xl bg-[#0a0518] border border-purple-900/50 space-y-4">
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                    Signal Conflict Matrix
                  </h3>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">12% Conflict</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-2xl bg-[#120729] border border-purple-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 font-bold">Agreement Level</span>
                    <span className="text-emerald-400 font-black">5 / 6 Engines Bullish</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden flex">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '88%' }} />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0e0720] border border-purple-900/40 space-y-1.5 font-sans">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1 font-mono">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Divergent Signal Detected:
                  </span>
                  <p className="text-xs text-purple-300/80 leading-snug">
                    Pattern Engine indicates short-term overbought channel test at $64,650, while Order Flow and Whales continue aggressive net buying.
                  </p>
                </div>
              </div>
            </div>

            {/* WHAT WOULD WEAKEN OR STRENGTHEN ASSESSMENT */}
            <div className="p-5 rounded-3xl bg-[#0a0518] border border-purple-900/50 space-y-4">
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider flex items-center gap-2 border-b border-purple-900/40 pb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Evidence Sensitivity Drivers
              </h3>

              <div className="space-y-2.5 text-xs font-sans">
                <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <span className="font-mono font-black text-emerald-300 text-[11px] block">
                    ▲ WOULD INCREASE CONFIDENCE TO 85%+
                  </span>
                  <p className="text-purple-200/80 leading-snug">
                    Clean spot price breakout above $64,650 with +500 BTC volume acceleration.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                  <span className="font-mono font-black text-rose-300 text-[11px] block">
                    ▼ WOULD DECREASE CONFIDENCE BELOW 65%
                  </span>
                  <p className="text-purple-200/80 leading-snug">
                    Whale liquidation or order book bid floor collapse below $95,800.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: CONFIDENCE DELTA TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-3xl bg-[#0a0518] border border-purple-900/50 space-y-6">
          <div className="flex items-center justify-between border-b border-purple-900/40 pb-4">
            <div>
              <h2 className="text-lg font-black text-white font-mono">
                Real-Time Model Confidence Audit Log
              </h2>
              <p className="text-xs text-purple-300/70">
                Track every 5-minute adjustment in model confidence along with specific catalyst triggers.
              </p>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Ledger Active
            </span>
          </div>

          <div className="space-y-4 font-mono">
            {confidenceTimeline.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#0f0724] border border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-purple-500/40 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-900/40 border border-purple-700/40 flex items-center justify-center font-extrabold text-purple-200 text-xs shrink-0">
                    {item.confidence}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-400">{item.time}</span>
                      <span
                        className={`px-2 py-0.2 rounded text-[10px] font-black ${
                          item.direction === 'UP'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {item.delta}
                      </span>
                      <span className="text-[10px] text-purple-300/60 font-sans">Regime: {item.regime}</span>
                    </div>

                    <div className="space-y-0.5">
                      {item.reasons.map((r, rIdx) => (
                        <div key={rIdx} className="text-xs text-purple-200 font-sans flex items-center gap-1.5">
                          <ChevronRight className="w-3 h-3 text-purple-400" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: HISTORICAL SETUP MATCHER */}
      {activeTab === 'historical' && (
        <div className="p-6 rounded-3xl bg-[#0a0518] border border-purple-900/50 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900/40 pb-4">
            <div>
              <h2 className="text-lg font-black text-white font-mono flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                Historical Setup Matching Engine
              </h2>
              <p className="text-xs text-purple-300/70">
                Comparing current market vector ($96.2k BTC, 3.4x bid imbalance, high whale delta) against 1,420 historical occurrences.
              </p>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-purple-950/80 border border-purple-500/30 text-purple-200 font-mono text-xs font-extrabold">
              Matches Found: <strong className="text-emerald-400">1,420 Setups</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {historicalMatches.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-[#0e0720] border border-purple-900/40 space-y-3 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center justify-between border-b border-purple-900/30 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white">{m.date}</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-200 text-[10px] font-bold">
                      {m.similarity}% Match
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-black text-[10px] ${
                      m.resolvedYes
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {m.resolvedYes ? 'RESOLVED YES' : 'RESOLVED NO'}
                  </span>
                </div>

                <div className="space-y-1 font-sans">
                  <div className="text-purple-300/60 text-[11px]">Regime Vector: {m.regime}</div>
                  <div className="text-purple-200 text-xs font-semibold">{m.outcomeText}</div>
                </div>

                <div className="text-[10px] text-purple-300/50 flex items-center justify-between pt-1 border-t border-purple-950">
                  <span>Strike Distance at Expiration:</span>
                  <strong className="text-emerald-400 font-mono">{m.strikeDistance}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: CROSS-ASSET OPPORTUNITY RANKING */}
      {activeTab === 'ranking' && (
        <div className="p-6 rounded-3xl bg-[#0a0518] border border-purple-900/50 space-y-6">
          <div className="flex items-center justify-between border-b border-purple-900/40 pb-4">
            <div>
              <h2 className="text-lg font-black text-white font-mono">
                Cross-Asset Edge Opportunity Ranking
              </h2>
              <p className="text-xs text-purple-300/70">
                Assets ranked by calibrated quantitative edge relative to implied market odds.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-purple-900/40 text-purple-300/60 uppercase text-[10px]">
                  <th className="p-3">Asset & Strike</th>
                  <th className="p-3">Raw Score</th>
                  <th className="p-3">Calibrated Score</th>
                  <th className="p-3">Implied Edge</th>
                  <th className="p-3">Engine Harmony</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30">
                {opportunityRankings.map((row, idx) => (
                  <tr key={idx} className="hover:bg-purple-900/20 transition-colors">
                    <td className="p-3 font-extrabold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-900/60 flex items-center justify-center text-[10px] text-purple-300">
                        {idx + 1}
                      </span>
                      <span>{row.asset} - {row.strike}</span>
                    </td>
                    <td className="p-3 text-purple-300">{row.rawScore}</td>
                    <td className="p-3 font-black text-emerald-400">{row.calibratedScore}</td>
                    <td className="p-3 text-cyan-300 font-bold">{row.edge}</td>
                    <td className="p-3 text-purple-200">{row.harmony}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          if (onSelectAsset) onSelectAsset(row.asset);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all text-xs"
                      >
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      </IntelligenceLockGate>
    </div>
  );
};
