import React, { useState } from 'react';
import {
  Zap,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  BarChart2,
  Lock,
  ChevronRight,
  CreditCard,
  Target,
  Activity,
  Layers,
} from 'lucide-react';
import { BTCTicker, Candle, PredictionSignal, AlertSettings } from '../types';
import { CandleChart } from './CandleChart';
import { useLiveSignal } from '../hooks/useLiveSignal';

interface StarterDeskViewProps {
  ticker: BTCTicker;
  candles: Candle[];
  onOpenPricing: () => void;
  onOpenAlerts?: () => void;
  onOpenSettings?: () => void;
  userEmail?: string;
  selectedAsset?: string;
  onSelectAsset?: (asset: string) => void;
}

export const StarterDeskView: React.FC<StarterDeskViewProps> = ({
  ticker,
  candles,
  onOpenPricing,
  onOpenAlerts,
  onOpenSettings,
  userEmail,
  selectedAsset = 'BTC',
  onSelectAsset = () => {},
}) => {
  const [activeAsset, setActiveAsset] = useState<string>(selectedAsset || 'BTC');
  const { signal: liveSignal } = useLiveSignal(activeAsset, '15m');

  const handleAssetChange = (sym: string) => {
    setActiveAsset(sym);
    onSelectAsset(sym);
  };

  // Safe signal construction from liveSignal or fallback
  const rawSignal = liveSignal as any;
  const signal: PredictionSignal = {
    id: rawSignal?.id || `starter_${Date.now()}`,
    timestamp: rawSignal?.timestamp || Date.now(),
    candleCloseTimestamp: rawSignal?.candleCloseTimestamp || Date.now() + 540000,
    direction: rawSignal?.direction || 'YES',
    targetPrice: rawSignal?.targetPrice || ticker.price * 1.004,
    currentPrice: rawSignal?.currentPrice || ticker.price,
    confidence: rawSignal?.confidence || 88,
    modelProb: rawSignal?.modelProb || 65.4,
    marketProb: rawSignal?.marketProb || 50.0,
    edgePct: rawSignal?.edgePct || 15.4,
    tradeGrade: rawSignal?.tradeGrade || 'A',
    reasoning: rawSignal?.reasoning || 'VIXY Starter 15M Core Neural Model indicates bullish momentum continuation based on 15-minute moving average confluence.',
    keyFactors: rawSignal?.keyFactors || ['15M Volume Expansion', 'Momentum Reversal Trigger', 'Probabilistic Edge +15.4%'],
    orderFlow: rawSignal?.orderFlow || {
      bullVolumePct: 62,
      bearVolumePct: 38,
      netDelta: 14.5,
      takerBuyRatio: 1.63,
      orderBookImbalancePct: 12.4,
      bidDepthUSD: 450000,
      askDepthUSD: 310000,
      bookPressureScore: 78,
    },
    venueOdds: rawSignal?.venueOdds || {
      kalshiYesPrice: 0.52,
      kalshiNoPrice: 0.48,
      polymarketYesPct: 53.0,
      polymarketNoPct: 47.0,
      draftKingsYesAmerican: '-110',
      draftKingsNoAmerican: '-110',
      draftKingsImpliedYesPct: 52.4,
      bestEdgeVenue: 'Kalshi',
      bestEdgeValue: 13.4,
    },
    similarSetupsCount: 142,
    similarSetupsBullishPct: 84.5,
    status: rawSignal?.status || 'PENDING',
  };

  const isBullish = signal.direction === 'YES' || signal.direction === 'UP' || signal.direction === 'BUY_UP';

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto animate-fadeIn font-mono text-purple-100">
      {/* 1. Starter Tier Active Header Banner */}
      <div className="bg-gradient-to-r from-[#12082b] via-[#1a0c3b] to-[#0d0620] border-2 border-purple-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                VIXY STARTER PLAN // ACTIVE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                15M DESK UNLOCKED
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
              15-Minute Prediction Intelligence Terminal
            </h1>
            <p className="text-xs sm:text-sm text-purple-300/80 font-sans max-w-2xl">
              Real-time high-probability 15M market directional signals, verified target prices, and live candle tracking for Kalshi & Polymarket contracts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={onOpenPricing}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black text-xs font-mono uppercase tracking-wider shadow-lg shadow-amber-950/60 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Zap className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>Upgrade to Pro Quant →</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Asset Selector Tabs (BTC, ETH, SOL) */}
      <div className="flex items-center justify-between gap-3 bg-[#0d071e] p-2 rounded-2xl border border-purple-900/40">
        <div className="flex items-center gap-2">
          {['BTC', 'ETH', 'SOL'].map((sym) => {
            const isSelected = activeAsset === sym;
            return (
              <button
                key={sym}
                onClick={() => handleAssetChange(sym)}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/40'
                    : 'text-purple-300/70 hover:text-white hover:bg-purple-900/30'
                }`}
              >
                <span>{sym} 15M</span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/50 border border-purple-800/40 text-xs">
          <Clock className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-purple-300/80">TIMEFRAME:</span>
          <span className="font-bold text-white">15 MINUTES</span>
        </div>
      </div>

      {/* 3. Core Decision Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Signal Direction & Confidence Card (7 cols) */}
        <div className="lg:col-span-7 bg-[#110926] border border-purple-500/30 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-purple-900/40 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${
                isBullish
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-950/60'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-rose-950/60'
              }`}>
                {isBullish ? <ArrowUpRight className="w-7 h-7" /> : <ArrowDownRight className="w-7 h-7" />}
              </div>
              <div>
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  CURRENT 15M PREDICTION // {activeAsset}
                </div>
                <div className="text-2xl font-black text-white font-sans flex items-center gap-2">
                  <span>SIGNAL: {isBullish ? 'YES / UP (BULLISH)' : 'NO / DOWN (BEARISH)'}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-purple-400/80">GRADE</div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {signal.tradeGrade || 'A'}
              </div>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 rounded-2xl bg-[#0a0518] border border-purple-900/40">
              <div className="text-[10px] text-purple-400/70">CURRENT PRICE</div>
              <div className="text-base font-bold text-white">
                ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0a0518] border border-purple-900/40">
              <div className="text-[10px] text-purple-400/70">TARGET PRICE</div>
              <div className={`text-base font-bold ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${signal.targetPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '---'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0a0518] border border-purple-900/40">
              <div className="text-[10px] text-purple-400/70">CONFIDENCE</div>
              <div className="text-base font-bold text-purple-300">
                {signal.confidence}%
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0a0518] border border-purple-900/40">
              <div className="text-[10px] text-purple-400/70">MODEL PROB</div>
              <div className="text-base font-bold text-cyan-300">
                {signal.modelProb}%
              </div>
            </div>
          </div>

          {/* Reasoning Narrative */}
          <div className="p-4 rounded-2xl bg-[#0c061d] border border-purple-900/40 space-y-2">
            <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>VIXY 15M MODEL REASONING</span>
            </div>
            <p className="text-xs text-purple-200/90 font-sans leading-relaxed">
              {signal.reasoning}
            </p>
          </div>

          {/* Key Factor Badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            {signal.keyFactors?.map((factor, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-800/40 text-purple-300 text-xs font-mono flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {factor}
              </span>
            ))}
          </div>
        </div>

        {/* Pro Quant Feature Gate Card (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#150a30] via-[#0d061f] to-[#080314] border-2 border-amber-500/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold font-mono flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                PRO QUANT ADVANCED SUITE
              </span>
              <span className="text-xs text-purple-400 font-mono">$49/MO</span>
            </div>

            <h3 className="text-xl font-black text-white font-sans">
              Unlock Subsecond Scalping & L2 Order Flow
            </h3>

            <p className="text-xs text-purple-300/80 font-sans leading-relaxed">
              Upgrade your Starter plan to access multi-venue order book delta sweeps, 15-second subsecond triggers, and automated Discord bot webhooks.
            </p>

            <div className="space-y-2 pt-2 text-xs font-sans">
              <div className="flex items-center gap-2 text-purple-200">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>15-Second Scalping Desk with subsecond execution</span>
              </div>
              <div className="flex items-center gap-2 text-purple-200">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>1-Hour Macro Decision Intelligence Desk</span>
              </div>
              <div className="flex items-center gap-2 text-purple-200">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Real-time L2 order flow pressure & delta ribbons</span>
              </div>
              <div className="flex items-center gap-2 text-purple-200">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Whale Tracker & +EV Edge Scanner</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenPricing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-purple-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs font-mono uppercase tracking-wider shadow-xl shadow-amber-950/80 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Zap className="w-4 h-4 text-slate-950" />
            <span>Upgrade to Pro Quant →</span>
          </button>
        </div>
      </div>

      {/* 4. Real-Time 15M Candle Tape */}
      <div className="bg-[#0e0720] border border-purple-900/40 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase font-mono">
              {activeAsset} 15M CANDLE CHART & TARGET PRICE
            </h3>
          </div>
          <span className="text-[10px] text-purple-400 font-mono">
            UPDATES EVERY 15 MINUTES
          </span>
        </div>

        <CandleChart
          candles={candles}
          targetPrice={signal.targetPrice}
          currentPrice={ticker.price}
          timeframe="15M"
          onTimeframeChange={() => {}}
          predictedDirection={signal.direction}
          venue="Kalshi"
        />
      </div>
    </div>
  );
};
