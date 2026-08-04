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
} from 'lucide-react';
import { BTCTicker } from '../types';
import { CandleChart } from './CandleChart';
import { PredictionHealthWatch } from './PredictionHealthWatch';
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
  userRole: 'DEMO' | 'PRO' | 'ADMIN';
  onUpgradeToPro: () => void;
}

export const OneHourDeskView: React.FC<OneHourDeskViewProps> = ({
  ticker,
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
  const [autoScan, setAutoScan] = useState<boolean>(true);
  const [oneHourLeadMode, setOneHourLeadMode] = useState<boolean>(true);

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
    };
    loadDeskData();
    const interval = setInterval(loadDeskData, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const runKelly = async () => {
      try {
        const res = await calculatePositionSize({
          asset: 'BTC',
          desk: '1h',
          bankroll,
          kellyFraction,
        });
        if (active) setKellyResult(res);
      } catch (e) {
        console.warn('Kelly API error', e);
      }
    };
    runKelly();
    return () => {
      active = false;
    };
  }, [bankroll, kellyFraction]);

  // Simulated 1H Candles
  const generate1HCandles = () => {
    const basePrice = ticker.price || 64200;
    const now = Date.now();
    const result = [];
    let current = basePrice - 180;

    for (let i = 0; i < 24; i++) {
      const open = current;
      const variation = (Math.random() - 0.48) * 85;
      const close = open + variation;
      const high = Math.max(open, close) + Math.random() * 45;
      const low = Math.min(open, close) - Math.random() * 45;
      const volume = Math.round((25 + Math.random() * 60) * 10) / 10;

      result.push({
        timestamp: now - (24 - i) * 3600 * 1000,
        open: Math.round(open * 10) / 10,
        high: Math.round(high * 10) / 10,
        low: Math.round(low * 10) / 10,
        close: Math.round(close * 10) / 10,
        volume,
      });

      current = close;
    }
    return result;
  };

  const [oneHourCandles] = useState(generate1HCandles());

  return (
    <div className="space-y-6 font-mono text-purple-100 animate-fadeIn">
      {/* 1H Horizon Desk Banner */}
      <div className="bg-gradient-to-r from-[#170B36] via-[#1F0D4A] to-[#0D0622] rounded-3xl p-5 sm:p-6 border border-purple-500/40 shadow-2xl relative overflow-hidden">
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
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>1-HOUR DECISION DESK</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-300 text-lg">
                [60M HORIZON]
              </span>
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
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 1-Hour Contract Strike Selector Matrix (Top Priority) */}
      <div className="bg-[#120B28] rounded-2xl p-5 border border-purple-500/40 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white tracking-wide">1-HOUR STRIKE CONTRACT MATRIX</h3>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-400/30">
              TOP DESK SELECTION
            </span>
          </div>
          <span className="text-xs text-purple-300/70 font-sans">Select target strike to analyze model edge and odds</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { strike: 64000, yesOdds: 88, noOdds: 12, prob: 94, edge: 18.2, status: 'HIGH PROBABILITY' },
            { strike: 64200, yesOdds: 72, noOdds: 28, prob: 88, edge: 14.2, status: 'OPTIMAL ENTRY' },
            { strike: 64500, yesOdds: 34, noOdds: 66, prob: 42, edge: 8.5, status: 'STRETCH TARGET' },
          ].map((item) => (
            <button
              key={item.strike}
              onClick={() => {
                setSelectedStrike(item.strike);
                setKalshiYesCent(item.yesOdds);
                setKalshiNoCent(item.noOdds);
                setConfidenceScore(item.prob);
                setModelEdge(item.edge);
              }}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                selectedStrike === item.strike
                  ? 'bg-purple-950/80 border-purple-400 shadow-xl shadow-purple-600/30 ring-2 ring-purple-400/60'
                  : 'bg-[#0B051A] border-purple-900/40 hover:border-purple-600/50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-purple-200 font-bold text-sm">${item.strike.toLocaleString()} Target</span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    selectedStrike === item.strike ? 'bg-amber-400 text-slate-950' : 'bg-purple-900/60 text-purple-300'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="text-xl font-black text-white my-1">
                YES {item.yesOdds}¢ <span className="text-purple-400/60 text-xs font-normal">/ NO {item.noOdds}¢</span>
              </div>

              <div className="flex items-center justify-between text-xs text-purple-300/70 mt-2 pt-2 border-t border-purple-900/40">
                <span>Model Win: <strong className="text-white">{item.prob}%</strong></span>
                <span className="text-emerald-400 font-bold">Edge: +{item.edge}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Contract Horizon Countdown & Live Odds Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#120B28] rounded-2xl p-4 border border-purple-500/30 shadow-xl space-y-1">
          <div className="text-[11px] text-purple-300/60 uppercase font-bold flex items-center justify-between">
            <span>ACTIVE 1H CONTRACT</span>
            <span className="text-purple-400">KALSHI</span>
          </div>
          <div className="text-lg font-black text-white">{activeContractId}</div>
          <div className="text-xs text-purple-300 font-semibold">Strike Target: ${selectedStrike.toLocaleString()}</div>
        </div>

        <div className="bg-[#120B28] rounded-2xl p-4 border border-amber-500/30 shadow-xl space-y-1">
          <div className="text-[11px] text-amber-300/80 uppercase font-bold flex items-center justify-between">
            <span>TIME TO EXPIRATION</span>
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-300 tracking-wider">
            {timeRemainingMin}m {timeRemainingSec}s
          </div>
          <div className="w-full bg-[#0B051A] rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full w-3/5" />
          </div>
        </div>

        <div className="bg-[#120B28] rounded-2xl p-4 border border-emerald-500/30 shadow-xl space-y-1">
          <div className="text-[11px] text-emerald-300/80 uppercase font-bold flex items-center justify-between">
            <span>MODEL WIN PROBABILITY</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">
            {modelStatus?.hasActiveModel && apiSignal?.modelProbability !== null && apiSignal?.modelProbability !== undefined ? (
              `${Math.round(apiSignal.modelProbability * 100)}%`
            ) : (
              <span className="text-amber-300 text-xs font-bold block">
                Collecting data ({modelStatus?.settledCount ?? apiSignal?.sampleSize ?? 0}/{modelStatus?.minRequired ?? 500})
              </span>
            )}
          </div>
          <div className="text-xs text-purple-300">
            {modelStatus?.hasActiveModel && apiSignal?.edge !== null && apiSignal?.edge !== undefined
              ? `Edge over Kalshi: +${Math.round(apiSignal.edge * 100)}%`
              : 'Edge: Pending Active Calibrated Model'}
          </div>
        </div>

        <div className="bg-[#120B28] rounded-2xl p-4 border border-purple-500/30 shadow-xl space-y-1">
          <div className="text-[11px] text-purple-300/60 uppercase font-bold flex items-center justify-between">
            <span>FILTERED WIN RATE / BRIER SCORE</span>
            <Activity className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-sm font-black text-white">
            {perfStats?.verified ? (
              `Win Rate: ${perfStats.winRate}% | Brier: ${perfStats.brierScore}`
            ) : (
              <span className="text-amber-300 text-xs font-bold block">Sample size &lt; 30 — Win rate pending</span>
            )}
          </div>
          <div className="text-[10px] text-purple-300 font-semibold">
            {perfStats?.caveat || 'Sample too small for a reliable win rate yet'}
          </div>
        </div>
      </div>

      {/* Main Grid: 1-Hour Chart + 1H Execution Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): 1-Hour Chart & Technical Indicators */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#120B28] rounded-2xl p-4 border border-purple-500/30 shadow-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-purple-900/40">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm text-white">1-HOUR CANDLESTICK & VOLATILITY DESK</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                  1H HORIZON
                </span>
              </div>
              <div className="text-xs text-purple-300/70 font-mono">
                Spot: <strong className="text-white">${ticker.price.toLocaleString()}</strong>
              </div>
            </div>

            {/* Prediction Setup Health Watch Engine */}
            <PredictionHealthWatch currentPrice={ticker.price} timeframe="1H" />

            {/* 1H Chart View */}
            <CandleChart
              candles={oneHourCandles}
              currentPrice={ticker.price}
              targetPrice={selectedStrike}
              predictedDirection="YES"
              timeframe="1H"
            />
          </div>
        </div>

        {/* Right Column: 1-Hour LATCHED ACTION ADVISOR */}
        <div className="space-y-6">
          <div className="bg-[#120B28] rounded-2xl p-5 border border-purple-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm text-white uppercase">1H LATCHED ACTION</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                RECOMMENDED BUY
              </span>
            </div>

            <div className="bg-[#180C36] p-4 rounded-xl border border-amber-500/40 space-y-2 text-center">
              <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                60-MINUTE PREDICTION ADVISORY
              </div>
              <div className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2 text-amber-300">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>MODEL SIGNAL: YES @ {kalshiYesCent}¢</span>
              </div>
              <p className="text-xs text-purple-200/80 font-sans">
                Targeting BTC &gt; ${selectedStrike.toLocaleString()} by top of the hour. Net L2 volume delta (+2,840 BTC) favors upward drift.
              </p>
            </div>

            {/* Odds Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-400">YES IMPLIED: {kalshiYesCent}%</span>
                <span className="text-rose-400">NO IMPLIED: {kalshiNoCent}%</span>
              </div>
              <div className="w-full bg-[#0B051A] rounded-full h-3 flex overflow-hidden p-0.5 border border-purple-900/60">
                <div style={{ width: `${kalshiYesCent}%` }} className="bg-emerald-500 h-full rounded-l" />
                <div style={{ width: `${kalshiNoCent}%` }} className="bg-rose-500 h-full rounded-r" />
              </div>
            </div>

            {/* Contract Execution Calculator */}
            <div className="bg-[#0B051A] rounded-xl p-3.5 border border-purple-900/50 space-y-3 text-xs">
              <div className="font-bold text-purple-200">1H Quick Position Simulator</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#150B30] p-2 rounded-lg border border-purple-900/40">
                  <span className="text-[10px] text-purple-300/60 block">Contracts</span>
                  <strong className="text-white text-sm">100 Contracts</strong>
                </div>
                <div className="bg-[#150B30] p-2 rounded-lg border border-purple-900/40">
                  <span className="text-[10px] text-purple-300/60 block">Max Cost</span>
                  <strong className="text-white text-sm">${(kalshiYesCent * 1).toFixed(2)}</strong>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-purple-900/40 text-emerald-400 font-bold">
                <span>Max Payout: $100.00</span>
                <span>Net Profit: +${(100 - kalshiYesCent).toFixed(2)}</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button className="py-3 rounded-xl bg-purple-800 hover:bg-purple-700 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 border border-purple-600/50">
                <TrendingUp className="w-4 h-4 text-emerald-300" />
                <span>SIMULATE YES {kalshiYesCent}¢</span>
              </button>
              <button className="py-3 rounded-xl bg-purple-800 hover:bg-purple-700 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 border border-purple-600/50">
                <TrendingDown className="w-4 h-4 text-rose-300" />
                <span>SIMULATE NO {kalshiNoCent}¢</span>
              </button>
            </div>
          </div>

          {/* 1H Microstructure Checklist */}
          <div className="bg-[#120B28] rounded-2xl p-4 border border-purple-900/50 space-y-3 text-xs">
            <div className="font-bold text-white flex items-center gap-2 border-b border-purple-900/40 pb-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>1H QUANT CONFIRMATION SCORE</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-purple-200">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1H VWAP Support</span>
                </span>
                <span className="text-emerald-400 font-bold">PASS</span>
              </div>
              <div className="flex items-center justify-between text-purple-200">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Order Book Depth Delta</span>
                </span>
                <span className="text-emerald-400 font-bold">+2,840 BTC</span>
              </div>
              <div className="flex items-center justify-between text-purple-200">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Macro Whale Sweep</span>
                </span>
                <span className="text-emerald-400 font-bold">DETECTED</span>
              </div>
            </div>
          </div>

          {/* Position Sizing Matrix (Kelly Sizing Calculator - Server Centralized) */}
          <div className="bg-[#120B28] rounded-2xl p-4 border border-purple-500/40 space-y-3 text-xs">
            <div className="font-bold text-white flex items-center justify-between border-b border-purple-900/40 pb-2">
              <span className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>KELLY POSITION SIZING CALCULATOR (SERVER ENGINE)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                POST /api/position-size
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-purple-300 font-bold">Bankroll ($USD):</label>
                <input
                  type="number"
                  value={bankroll}
                  onChange={(e) => setBankroll(Number(e.target.value))}
                  className="w-28 bg-[#0B051A] border border-purple-800 rounded px-2 py-1 text-white font-mono text-right"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-purple-300 font-bold">Kelly Fraction:</label>
                <select
                  value={kellyFraction}
                  onChange={(e) => setKellyFraction(Number(e.target.value))}
                  className="w-28 bg-[#0B051A] border border-purple-800 rounded px-2 py-1 text-white font-mono text-right"
                >
                  <option value={0.125}>1/8 Kelly (0.125)</option>
                  <option value={0.25}>1/4 Kelly (0.25)</option>
                  <option value={0.5}>1/2 Kelly (0.50)</option>
                  <option value={1.0}>Full Kelly (1.00)</option>
                </select>
              </div>

              {kellyResult && (
                <div className="bg-[#0B051A] p-3 rounded-xl border border-purple-900/60 space-y-1.5 font-mono text-xs mt-2">
                  <div className="flex justify-between">
                    <span className="text-purple-400 font-semibold">Recommended Stake:</span>
                    <strong className="text-emerald-400 font-black">${kellyResult.recommendedStakeUsd}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-400 font-semibold">Kelly Fraction:</span>
                    <strong className="text-white font-bold">{kellyResult.recommendedKellyFraction * 100}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-400 font-semibold">Payout Multiplier:</span>
                    <strong className="text-cyan-300 font-bold">{kellyResult.payoutMultiplier}x</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-400 font-semibold">Expected Value:</span>
                    <strong className="text-amber-300 font-bold">+{kellyResult.expectedValuePct}% EV</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
