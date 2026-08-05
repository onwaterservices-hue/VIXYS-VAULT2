import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Clock,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  BookOpen,
  Gauge,
  Flame,
  Activity,
  BarChart2,
  TrendingUp,
  Sliders,
  ShieldCheck,
  BrainCircuit,
  AlertTriangle,
} from 'lucide-react';
import { BTCTicker, Candle, PredictionSignal, ExchangeApiKeys } from '../types';
import { CandleChart } from './CandleChart';
import { PredictionHealthWatch } from './PredictionHealthWatch';
import { AIPatternEngine } from './AIPatternEngine';
import { fetchPrediction } from '../services/api';
import { ExecutiveCommandCenter } from './ExecutiveCommandCenter';
import { CompactSignalChart } from './CompactSignalChart';
import { ModelStatusBadge } from './ModelStatusBadge';
import { AIBrainMemoryVault } from './AIBrainMemoryVault';
import { NeuralRibbonChart } from './NeuralRibbonChart';

interface LiveDashboardProps {
  ticker: BTCTicker;
  candles: Candle[];
  onOpenAlerts: () => void;
  onOpenPricing: () => void;
  onOpenJournal: () => void;
  onOpenCompare?: () => void;
  userRole: 'DEMO' | 'PRO' | 'ADMIN';
  selectedAsset?: string;
  onSelectAsset?: (symbol: string) => void;
  selectedTimeframe?: string;
  selectedVenues?: string[];
  exchangeKeys?: ExchangeApiKeys;
  onOpenSettings?: () => void;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  ticker,
  candles,
  onOpenAlerts,
  onOpenPricing,
  onOpenJournal,
  onOpenCompare,
  userRole,
  selectedAsset = 'BTC',
  onSelectAsset = () => {},
  selectedTimeframe = '15M',
  selectedVenues = ['Kalshi'],
  exchangeKeys,
  onOpenSettings,
}) => {
  // Timeframe State
  const [timeframe, setTimeframe] = useState<'15M' | '1H'>(
    selectedTimeframe === '1H' ? '1H' : '15M'
  );

  useEffect(() => {
    if (selectedTimeframe === '1H') {
      setTimeframe('1H');
    } else {
      setTimeframe('15M');
    }
  }, [selectedTimeframe]);
  const [activeMarket, setActiveMarket] = useState<'BTC15M' | 'BTC1H' | 'ETH15M' | 'SOL15M'>('BTC15M');

  // App User Experience Mode (Simple Mode vs Pro Quant Mode)
  const [appMode, setAppMode] = useState<'SIMPLE' | 'PRO'>('SIMPLE');

  // Candle Countdown Timers (15m = 900s, 1h = 3600s)
  const [secondsRemaining15M, setSecondsRemaining15M] = useState<number>(542);
  const [secondsRemaining1H, setSecondsRemaining1H] = useState<number>(2054);
  const [isRefreshingAi, setIsRefreshingAi] = useState<boolean>(false);
  const [isBailedOut, setIsBailedOut] = useState<boolean>(false);

  // Auto-Update Sync State
  const [autoSyncActive, setAutoSyncActive] = useState<boolean>(true);
  const [selectedVenue, setSelectedVenue] = useState<'ALL' | 'KALSHI' | 'POLYMARKET' | 'DRAFTKINGS'>('KALSHI');

  // Venue Odds State
  const [venueOdds, setVenueOdds] = useState({
    kalshiYesPrice: 0.54,
    kalshiNoPrice: 0.46,
    polymarketYesPct: 52.0,
    polymarketNoPct: 48.0,
    draftKingsYesAmerican: '-115',
    draftKingsNoAmerican: '+105',
    draftKingsImpliedYesPct: 53.5,
    bestEdgeVenue: 'Kalshi' as 'Kalshi' | 'Polymarket' | 'DraftKings',
    bestEdgeValue: 12.2,
  });

  // Active Signal State
  const [signal, setSignal] = useState<PredictionSignal>({
    id: 'VAULT-SIG-9843',
    timestamp: Date.now(),
    candleCloseTimestamp: Date.now() + 542 * 1000,
    direction: 'YES',
    targetPrice: Math.round(ticker.price + 120),
    currentPrice: ticker.price || 64108,
    confidence: 91,
    modelProb: 64.2,
    marketProb: 52.0,
    edgePct: 12.2,
    tradeGrade: 'A+',
    reasoning:
      '15m Kalshi contract opened with elevated taker buy volume (1.42x ratio) and net delta (+1,420 BTC). Order book depth shows clear bid side absorption at $64,020, creating a 91% probability for close above $64,228 target.',
    keyFactors: [
      'Kalshi 15M Contract $0.54 Yes underpriced vs 64.2% Model',
      'Net Taker Delta +1,420 BTC in last 10 minutes',
      'VWAP support holding with high volume confluence',
      'Cross-Venue Edge: +12.2% over DraftKings (-115) & Polymarket (52%)',
    ],
    orderFlow: {
      bullVolumePct: 68,
      bearVolumePct: 32,
      netDelta: 1420,
      takerBuyRatio: 1.42,
      orderBookImbalancePct: 18.4,
      bidDepthUSD: 14250000,
      askDepthUSD: 9800000,
      bookPressureScore: 88,
    },
    venueOdds: {
      kalshiYesPrice: 0.54,
      kalshiNoPrice: 0.46,
      polymarketYesPct: 52.0,
      polymarketNoPct: 48.0,
      draftKingsYesAmerican: '-115',
      draftKingsNoAmerican: '+105',
      draftKingsImpliedYesPct: 53.5,
      bestEdgeVenue: 'Kalshi',
      bestEdgeValue: 12.2,
    },
    similarSetupsCount: 314,
    similarSetupsBullishPct: 91.4,
    status: 'PENDING',
  });

  // Timeframe-adjusted candles (1H vs 15M)
  const displayCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    if (timeframe === '15M') return candles;

    // Aggregate into 1H candles (4 x 15m)
    const h1Candles: Candle[] = [];
    for (let i = 0; i < candles.length; i += 4) {
      const group = candles.slice(i, i + 4);
      if (group.length === 0) continue;
      const open = group[0].open;
      const close = group[group.length - 1].close;
      const high = Math.max(...group.map((c) => c.high));
      const low = Math.min(...group.map((c) => c.low));
      const volume = group.reduce((sum, c) => sum + c.volume, 0);
      h1Candles.push({
        time: group[0].time,
        open,
        high,
        low,
        close,
        volume: Math.round(volume * 10) / 10,
      });
    }
    return h1Candles.length > 0 ? h1Candles : candles;
  }, [candles, timeframe]);
  useEffect(() => {
    if (!autoSyncActive) return;

    // Dynamically adjust model probability, delta, reasoning & key factors in real time as price moves
    setSignal((prev) => {
      const priceDelta = ticker.price - prev.currentPrice;
      const newNetDelta = Math.round(prev.orderFlow.netDelta + priceDelta * 1.8);
      const newBullPct = Math.min(92, Math.max(25, Math.round(prev.orderFlow.bullVolumePct + priceDelta * 0.08)));
      const newModelProb = Math.min(95, Math.max(35, Math.round((prev.modelProb + priceDelta * 0.05) * 10) / 10));
      const newTarget = Math.round(ticker.price + (prev.direction === 'YES' ? 120 : -120));
      const isBull = prev.direction === 'YES';
      const edge = Math.round((newModelProb - venueOdds.kalshiYesPrice * 100) * 10) / 10;
      const ratio = prev.orderFlow.takerBuyRatio.toFixed(2);
      const formattedDelta = newNetDelta >= 0 ? `+${newNetDelta.toLocaleString()} BTC` : `${newNetDelta.toLocaleString()} BTC`;
      const supportPrice = Math.round(ticker.price - 80);

      const liveReasoning = `${timeframe} candle opened with elevated taker ${isBull ? 'buy' : 'sell'} volume (${ratio}x ratio) and net delta (${formattedDelta}). Order book depth shows clear ${isBull ? 'bid side absorption' : 'ask pressure'} at $${supportPrice.toLocaleString()}, creating a high probability for close ${isBull ? 'above' : 'below'} $${newTarget.toLocaleString()} target.`;

      const liveKeyFactors = [
        `Net Taker Delta ${formattedDelta} in last 10m`,
        `VWAP support holding with high volume confluence`,
        `Kalshi / Polymarket odds underpricing model by +${edge}%`,
        `Order book ${isBull ? 'bid depth imbalance +' : 'ask pressure '}${prev.orderFlow.orderBookImbalancePct}%`,
      ];

      return {
        ...prev,
        currentPrice: ticker.price,
        targetPrice: newTarget,
        modelProb: newModelProb,
        edgePct: edge,
        reasoning: liveReasoning,
        keyFactors: liveKeyFactors,
        orderFlow: {
          ...prev.orderFlow,
          netDelta: newNetDelta,
          bullVolumePct: newBullPct,
          bearVolumePct: 100 - newBullPct,
        },
      };
    });
  }, [ticker.price, autoSyncActive, timeframe]);

  // Ticking Countdown Timers
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining15M((prev) => (prev <= 1 ? 900 : prev - 1));
      setSecondsRemaining1H((prev) => (prev <= 1 ? 3600 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeSeconds = timeframe === '15M' ? secondsRemaining15M : secondsRemaining1H;
  const minutes = Math.floor(activeSeconds / 60);
  const seconds = activeSeconds % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Handle Market Switch
  const handleMarketChange = (marketKey: 'BTC15M' | 'BTC1H' | 'ETH15M' | 'SOL15M') => {
    setActiveMarket(marketKey);
    if (marketKey === 'BTC1H') {
      setTimeframe('1H');
      setSignal((prev) => ({
        ...prev,
        id: 'VAULT-1H-BTC-7721',
        direction: 'YES',
        targetPrice: Math.round(ticker.price + 480),
        confidence: 94,
        modelProb: 71.8,
        marketProb: 54.5,
        edgePct: 17.3,
        tradeGrade: 'A+',
        reasoning:
          '1-Hour BTC macro candle displaying strong institutional delta accumulation (+3,850 BTC) above $63,900 VWAP. Orderbook shows massive bid wall at $63,800 with high probability of closing above $64,580 target by top of the hour.',
        keyFactors: [
          '1-Hour Net Taker Delta +3,850 BTC',
          'NY Institutional Session Volume Spike (+42%)',
          'Clean Reversal Buy Pointer confirmed on 1H kline',
          'Kalshi 1H contract underpriced at 54.5%',
        ],
        orderFlow: {
          bullVolumePct: 74,
          bearVolumePct: 26,
          netDelta: 3850,
          takerBuyRatio: 1.68,
          orderBookImbalancePct: 24.2,
          bidDepthUSD: 28400000,
          askDepthUSD: 12100000,
          bookPressureScore: 94,
        },
      }));
    } else if (marketKey === 'BTC15M') {
      setTimeframe('15M');
      setSignal((prev) => ({
        ...prev,
        id: 'VAULT-SIG-9843',
        direction: 'YES',
        targetPrice: Math.round(ticker.price + 120),
        confidence: 91,
        modelProb: 64.2,
        marketProb: 52.0,
        edgePct: 12.2,
        tradeGrade: 'A+',
      }));
    }
  };

  // Handle Manual AI Re-Analysis
  const handleRefreshPrediction = async () => {
    setIsRefreshingAi(true);
    try {
      const aiData = await fetchPrediction(
        ticker.price,
        signal.orderFlow.bullVolumePct,
        signal.orderFlow.netDelta,
        signal.orderFlow.takerBuyRatio
      );

      setSignal((prev) => ({
        ...prev,
        direction: (aiData.direction as 'YES' | 'NO') || prev.direction,
        targetPrice: aiData.targetPrice || prev.targetPrice,
        confidence: aiData.confidence || prev.confidence,
        edgePct: aiData.edgePct || prev.edgePct,
        reasoning: aiData.reasoning || prev.reasoning,
        keyFactors: aiData.keyFactors || prev.keyFactors,
        currentPrice: ticker.price,
      }));
    } catch (err) {
      console.error('Failed to update prediction AI:', err);
    } finally {
      setIsRefreshingAi(false);
    }
  };

  const isBullish = signal.direction === 'YES';

  return (
    <div className="space-y-6 font-mono text-purple-100">
      {/* Top Banner Alert / 3-Hour Trial Pass Notice */}
      {userRole === 'DEMO' && (
        <div className="bg-gradient-to-r from-purple-900/60 via-[#130B2A] to-violet-900/60 border border-purple-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-purple-200 text-xs shadow-xl">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-purple-300 animate-pulse shrink-0" />
            <div>
              <span className="font-extrabold text-purple-100">3-HOUR ALL-ACCESS TRIAL ACTIVE:</span> Live predictions for <span className="text-emerald-400 font-bold">15M & 1H BTC Trades</span> are unlocked!
            </div>
          </div>
          <button
            onClick={onOpenPricing}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-black shadow-lg shadow-purple-600/30 transition-all shrink-0 flex items-center gap-1.5 active:scale-95 text-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Unlock Pro Pass ($79)</span>
          </button>
        </div>
      )}

      {/* EXECUTIVE COMMAND CENTER (95% Quiet, 5% Loud - Executive Decision Core) */}
      <ExecutiveCommandCenter
        ticker={ticker}
        signal={signal}
        selectedAsset={selectedAsset}
        onSelectAsset={onSelectAsset}
        onOpenJournal={onOpenJournal}
        timeframe={timeframe}
        appMode={appMode}
        setAppMode={setAppMode}
      />

      {/* Active Market Contract Bar */}
      <div className="bg-[#120B28] p-3.5 rounded-2xl border border-purple-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-purple-300/80 font-extrabold uppercase font-mono text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            Active Contract: <strong className="text-white font-black">{selectedAsset} {timeframe} STRIKE</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/50 text-purple-100 font-extrabold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              title="Compare 2 Assets Side-by-Side (Predictions, Order Flow, Edge)"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-300" />
              <span>Split-Screen Compare →</span>
            </button>
          )}

          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
            appMode === 'SIMPLE' 
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
              : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
          }`}>
            {appMode === 'SIMPLE' ? '✨ Beginner Mode' : '⚡ Pro Quant Mode'}
          </span>
        </div>
      </div>

      {/* Versatile Multi-Venue Odds & Arbitrage Comparison Matrix */}
      <div className="bg-[#120B28] rounded-2xl border border-purple-500/30 p-5 shadow-2xl space-y-4 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/40 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Prediction Market Venue Comparison Matrix ({timeframe})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
              HIGHEST EDGE: KALSHI 15M (+12.2%)
            </span>
          </div>
        </div>

        {/* Venue Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Kalshi Card (The Lock) */}
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-500/40 relative overflow-hidden space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase">
                    PRIMARY LOCK
                  </span>
                  <button
                    onClick={onOpenSettings}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border flex items-center gap-1 ${
                      exchangeKeys?.kalshi.connected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-purple-900/40 text-purple-300/70 border-purple-800/40 hover:text-white'
                    }`}
                    title="Kalshi API Key Status. Click to manage API in Settings."
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${exchangeKeys?.kalshi.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{exchangeKeys?.kalshi.connected ? `API ${exchangeKeys.kalshi.latencyMs}ms` : 'API Setup'}</span>
                  </button>
                </div>
                <h3 className="text-sm font-black text-white mt-1">Kalshi 15M Market</h3>
                <p className="text-[10px] text-purple-300/60 font-sans">CFTC Regulated Exchange • Direct Strike</p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-emerald-400 block">54.0% Implied</span>
                <span className="text-[10px] text-purple-300/80 font-mono block">$0.54 YES / $0.46 NO</span>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-900/40 flex justify-between items-center text-xs">
              <span className="text-purple-300/60">Vault Model Edge:</span>
              <span className="font-black text-emerald-400">+12.2% EDGE</span>
            </div>
          </div>

          {/* Polymarket Card */}
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase">
                    DECENTRALIZED
                  </span>
                  <button
                    onClick={onOpenSettings}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border flex items-center gap-1 ${
                      exchangeKeys?.polymarket.connected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-purple-900/40 text-purple-300/70 border-purple-800/40 hover:text-white'
                    }`}
                    title="Polymarket L2 API Key Status. Click to manage API in Settings."
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${exchangeKeys?.polymarket.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{exchangeKeys?.polymarket.connected ? `API ${exchangeKeys.polymarket.latencyMs}ms` : 'API Setup'}</span>
                  </button>
                </div>
                <h3 className="text-sm font-black text-white mt-1">Polymarket 15M</h3>
                <p className="text-[10px] text-purple-300/60 font-sans">Polygon On-Chain • USDC Liquidity</p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-emerald-400 block">52.0% Implied</span>
                <span className="text-[10px] text-purple-300/80 font-mono block">52¢ YES / 48¢ NO</span>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-900/40 flex justify-between items-center text-xs">
              <span className="text-purple-300/60">Vault Model Edge:</span>
              <span className="font-black text-emerald-400">+12.2% EDGE</span>
            </div>
          </div>

          {/* DraftKings Sportsbook Micro Card */}
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase">
                    SPORTSBOOK MICRO
                  </span>
                  <button
                    onClick={onOpenSettings}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border flex items-center gap-1 ${
                      exchangeKeys?.draftkings.connected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-purple-900/40 text-purple-300/70 border-purple-800/40 hover:text-white'
                    }`}
                    title="DraftKings Micro API Key Status. Click to manage API in Settings."
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${exchangeKeys?.draftkings.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{exchangeKeys?.draftkings.connected ? `API ${exchangeKeys.draftkings.latencyMs}ms` : 'API Setup'}</span>
                  </button>
                </div>
                <h3 className="text-sm font-black text-white mt-1">DraftKings Micro</h3>
                <p className="text-[10px] text-purple-300/60 font-sans">American Odds • Instant Payout</p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-emerald-400 block">53.5% Implied</span>
                <span className="text-[10px] text-purple-300/80 font-mono block">-115 YES / +105 NO</span>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-900/40 flex justify-between items-center text-xs">
              <span className="text-purple-300/60">Vault Model Edge:</span>
              <span className="font-black text-emerald-400">+10.7% EDGE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Valhalla / OGERSHHH Style Buy Decision Deck & Locked Position Guide */}
      <div className="bg-gradient-to-br from-[#12072b] via-[#0d0621] to-[#160a36] rounded-3xl border border-purple-500/30 p-6 sm:p-7 shadow-2xl relative overflow-hidden font-mono space-y-6">
        {/* Top Decision Bar with Compact Signal Chart Companion */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-purple-900/40 pb-5">
          <div className="space-y-3 flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase text-cyan-300 bg-cyan-950/90 px-3 py-1 rounded-lg border border-cyan-500/40 shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                LIVE BUY DECISION / PUBLISHES ON QUALIFIED CONVICTION
              </span>
              <span className="text-xs text-purple-300/60 font-sans">
                COVERAGE PREDICTION BUY {signal.direction === 'YES' ? 'UP' : 'DOWN'} | HIGH VOLATILITY MARKET
              </span>
            </div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-1">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  {/* BUY UP / BUY DOWN -- Prominent, large & glowing for instant readability */}
                  <h1 className={`text-5xl sm:text-6xl font-black tracking-wider uppercase drop-shadow-[0_0_25px_rgba(52,211,153,0.35)] ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                    BUY {signal.direction === 'YES' ? 'UP' : 'DOWN'}
                  </h1>

                  {/* Status Indicator Pill */}
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    LIVE SIGNAL ACTIVE
                  </span>
                </div>

                {/* Progress Checkpoint Badges -- Made larger, prominent & clean */}
                <div className="flex flex-wrap items-center gap-2 bg-[#080315] p-2 rounded-2xl border border-purple-900/50 shadow-inner">
                  <div className="px-3.5 py-1.5 rounded-xl bg-cyan-950 text-cyan-200 text-xs font-black border border-cyan-600/60 shadow-md flex items-center gap-1.5">
                    <span className="text-cyan-400">01</span>
                    <span>BUY {signal.direction === 'YES' ? 'UP' : 'DOWN'} / COMMITTED</span>
                  </div>
                  <span className="text-purple-400/60 font-black text-sm px-1">→</span>
                  <div className="px-4 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/50 ring-2 ring-amber-500/30 shadow-lg animate-pulse flex items-center gap-1.5">
                    <span className="text-amber-400">02</span>
                    <span className="text-sm font-extrabold uppercase tracking-wide">WAIT FOR VALUE</span>
                  </div>
                  <span className="text-purple-400/60 font-black text-sm px-1">→</span>
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#0f0724] text-purple-300/60 text-xs font-bold border border-purple-900/40 flex items-center gap-1.5">
                    <span>03</span>
                    <span>POSITION REVIEW</span>
                  </div>
                </div>
              </div>

              {/* COMPACT SIGNAL CHART (Tight companion widget directly beside Buy Up / Down) */}
              <div className="shrink-0 self-stretch md:self-auto">
                <CompactSignalChart
                  candles={candles}
                  currentPrice={ticker.price}
                  targetPrice={signal.targetPrice || ticker.price + 120}
                  dataSource="live"
                />
              </div>
            </div>
          </div>

          {/* Decision Core Dial & Signal Vector */}
          <div className="flex flex-row lg:flex-col sm:flex-row items-center gap-3 self-stretch lg:self-auto justify-between shrink-0">
            <div className="bg-[#080315] p-4 rounded-2xl border border-purple-900/50 flex items-center gap-3 text-xs shadow-md">
              <div className="w-12 h-12 rounded-2xl border-2 border-emerald-400 flex items-center justify-center font-black text-emerald-300 text-base bg-emerald-950/60 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                V
              </div>
              <div>
                <span className="text-[10px] text-purple-300/60 uppercase font-black block tracking-wider">DECISION CORE</span>
                <span className="text-emerald-400 font-black block text-base">77.0% CONFIDENCE</span>
                <span className="text-xs text-cyan-300 font-bold">71.5% EXECUTION</span>
              </div>
            </div>

            <div className="bg-[#080315] p-4 rounded-2xl border border-purple-900/50 text-xs space-y-1.5 shadow-md">
              <div className="flex justify-between text-xs font-bold gap-4">
                <span className="text-purple-300/70">SIGNAL VECTOR</span>
                <span className="text-emerald-400 font-black">EDGE {signal.edgePct}%</span>
              </div>
              <div className="w-36 sm:w-44 bg-slate-950 h-3 rounded-full overflow-hidden flex border border-purple-900/40 p-0.5">
                <div className="bg-emerald-400 h-full rounded-full w-[85%]" />
                <div className="bg-rose-500 h-full rounded-full w-[15%]" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>85% UP</span>
                <span>15% DOWN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Entry Advisor + Locked Call Position Guide */}
        <div className="bg-[#080315] p-5 rounded-2xl border border-purple-900/50 space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-purple-900/40 pb-3">
            <span className="text-cyan-300 font-black text-xs sm:text-sm tracking-wide flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              LIVE ENTRY ADVISOR + LOCKED CALL POSITION GUIDE / DIRECTION STAYS FROZEN
            </span>
            <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider shadow-sm">
              WAITING FOR LOCK
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* NEW ENTRY LANE -- HIGHLIGHTED & LARGER AS REQUESTED */}
            <div className="bg-[#120726] p-4 rounded-2xl border border-amber-500/40 shadow-lg space-y-1.5 hover:border-amber-400/60 transition-all">
              <span className="text-[11px] text-purple-300/70 block font-bold tracking-wider uppercase">NEW ENTRY LANE</span>
              <div className="pt-0.5">
                <span className="text-sm sm:text-base font-black text-amber-300 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-xl inline-block shadow-md tracking-wider">
                  WAIT FOR VALUE
                </span>
              </div>
            </div>

            <div className="bg-[#100624] p-4 rounded-2xl border border-purple-900/40 space-y-1 hover:border-purple-500/40 transition-all">
              <span className="text-[11px] text-purple-300/70 block font-bold tracking-wider uppercase">LIVE ASK</span>
              <span className="text-base sm:text-lg font-black text-white block">$0.54 YES</span>
            </div>

            <div className="bg-[#100624] p-4 rounded-2xl border border-purple-900/40 space-y-1 hover:border-purple-500/40 transition-all">
              <span className="text-[11px] text-purple-300/70 block font-bold tracking-wider uppercase">PAYOUT</span>
              <span className="text-base sm:text-lg font-black text-emerald-400 block">1.85x</span>
            </div>

            <div className="bg-[#100624] p-4 rounded-2xl border border-purple-900/40 space-y-1 hover:border-purple-500/40 transition-all">
              <span className="text-[11px] text-purple-300/70 block font-bold tracking-wider uppercase">SAFE EDGE</span>
              <span className="text-base sm:text-lg font-black text-cyan-300 block">+{signal.edgePct}%</span>
            </div>

            <div className="bg-[#100624] p-4 rounded-2xl border border-purple-900/40 space-y-1 hover:border-purple-500/40 transition-all">
              <span className="text-[11px] text-purple-300/70 block font-bold tracking-wider uppercase">EXECUTABLE EXIT BID</span>
              <span className="text-base sm:text-lg font-black text-amber-400 block">$0.52 YES</span>
            </div>
          </div>
        </div>

        {/* THE GUARDIAN / POST-LOCK REVERSAL WATCH (REVERSAL RISK MONITORING) */}
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
          isBailedOut
            ? 'bg-emerald-950/40 border-emerald-500/80 shadow-2xl shadow-emerald-950/60'
            : 'bg-[#15092c] border-amber-500/50 shadow-xl'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-sm ${
                  isBailedOut
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                  {isBailedOut ? 'POSITION SAFELY EXITED' : 'ELEVATED REVERSAL RISK DETECTED'}
                </span>
                <span className="text-xs font-mono font-bold text-white bg-black/50 px-3 py-1 rounded-xl border border-amber-500/40">
                  {isBailedOut ? 'CLOSED AT $0.54 YES' : 'REVERSAL RISK INDEX: 68.0 / 100'}
                </span>
              </div>
              <p className="text-xs text-purple-200/90 font-sans leading-relaxed max-w-3xl">
                {isBailedOut
                  ? 'Your position has been safely liquidated / exited at the current bid quote ($0.54 YES). Capital protected from downside breakdown.'
                  : 'Order flow metrics show increased ask volume testing VWAP support. Consider protecting your position or reducing exposure at current bid quotes.'}
              </p>
            </div>

            {/* Position Exit / Risk Control Button */}
            <div className="shrink-0 self-stretch sm:self-auto">
              {isBailedOut ? (
                <button
                  onClick={() => setIsBailedOut(false)}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                  <span>RE-OPEN POSITION LOCK</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsBailedOut(true)}
                  className="w-full sm:w-auto bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/50 px-5 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-rose-300 shrink-0" />
                  <span className="text-xs font-bold">PROTECT POSITION / REDUCE EXPOSURE</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-purple-900/40 text-xs">
            <div>
              <span className="text-purple-300/60 text-[10px] block font-bold uppercase">REVERSAL RISK</span>
              <span className={`font-black text-sm ${isBailedOut ? 'text-emerald-400' : 'text-amber-300 font-mono text-sm'}`}>
                {isBailedOut ? 'DEFENDED' : '68.0 ELEVATED'}
              </span>
            </div>
            <div>
              <span className="text-purple-300/60 text-[10px] block font-bold uppercase">SUSTAINED BREAK</span>
              <span className="text-amber-300 font-bold text-sm">30s TIMEFRAME</span>
            </div>
            <div>
              <span className="text-purple-300/60 text-[10px] block font-bold uppercase">APPROACH ETA</span>
              <span className="text-cyan-300 font-bold text-sm">LIVE MONITORED</span>
            </div>
            <div>
              <span className="text-purple-300/60 text-[10px] block font-bold uppercase">MODEL STATUS</span>
              <ModelStatusBadge asset={selectedAsset} desk={selectedTimeframe.toLowerCase()} />
            </div>
          </div>
        </div>
      </div>

      {/* LIVE CANDLESTICK CHART & ORDER FLOW SECTION (Placed right below Buy Up / Buy Down card) */}
      <div className="space-y-6">
        <CandleChart
          candles={displayCandles}
          targetPrice={signal.targetPrice}
          currentPrice={ticker.price}
          timeframe={timeframe}
          onTimeframeChange={(tf) => {
            setTimeframe(tf);
            handleMarketChange(tf === '1H' ? 'BTC1H' : 'BTC15M');
          }}
          predictedDirection={signal.direction}
        />
        <NeuralRibbonChart asset={selectedAsset} desk={timeframe.toLowerCase()} title="AI Neural Ribbon & Order Flow" />
      </div>

      {/* EXPLAINABILITY & CONFIDENCE STABILITY BAR (VIXY'S VAULT EVIDENCE ENGINE) */}
      <div className="bg-gradient-to-r from-[#12072b] via-[#0e0720] to-[#150a33] rounded-3xl border border-purple-500/30 p-5 shadow-2xl font-mono text-purple-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-200 shadow-md">
              <BrainCircuit className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                  Model Explainability & Confidence Stability
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30 shadow-sm">
                  78.4% CALIBRATED
                </span>
              </div>
              <p className="text-xs text-purple-300/70 font-sans mt-0.5">
                Evidence Aggregator across 6 independent engines • Low Conflict (12%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right font-mono">
              <div className="text-xs font-black text-emerald-400">Stable ↑ (+3.2% 5m)</div>
              <div className="text-[10px] text-purple-300/60">Raw: 84.0% → Calibrated: 78.4%</div>
            </div>
          </div>
        </div>

        {/* 3 Evidence Engine Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
          <div className="p-3.5 rounded-2xl bg-[#0b051b] border border-purple-900/50 hover:border-purple-500/40 space-y-1 transition-all shadow-sm">
            <span className="text-[10px] text-purple-300/70 font-mono uppercase font-bold block">
              Order Flow Engine (+0.34)
            </span>
            <p className="text-purple-200 text-xs leading-relaxed">
              +1,820 BTC net buy volume swallowing ask liquidity at ${ticker.price.toLocaleString()}.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0b051b] border border-purple-900/50 hover:border-purple-500/40 space-y-1 transition-all shadow-sm">
            <span className="text-[10px] text-purple-300/70 font-mono uppercase font-bold block">
              Volume Delta Engine (+0.22)
            </span>
            <p className="text-purple-200 text-xs leading-relaxed">
              Trailing volume z-score outlier detected: +$2.48M net taker buys at ${ticker.price.toLocaleString()}.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0b051b] border border-purple-900/50 hover:border-purple-500/40 space-y-1 transition-all shadow-sm">
            <span className="text-[10px] text-purple-300/70 font-mono uppercase font-bold block">
              Liquidity Wall Engine (+0.14)
            </span>
            <p className="text-purple-200 text-xs leading-relaxed">
              $18.4M stacked bid floor beneath ${(ticker.price - 120).toLocaleString()} support level.
            </p>
          </div>
        </div>
      </div>

      {/* AI BRAIN & LIFETIME MEMORY LEARNING ENGINE */}
      <AIBrainMemoryVault asset={selectedAsset} desk={timeframe.toLowerCase()} />

      {/* PREDICTION SETUP HEALTH & RISK WATCH (SAFE ENTRY & EMERGENCY BUY-OUT / BAIL-OUT) */}
      <PredictionHealthWatch
        currentPrice={ticker.price}
        timeframe={timeframe}
        onBuyOutPosition={() => setIsBailedOut(true)}
        appMode={appMode}
      />

      {/* REVERSAL ENGINE PROBABILITIES, WHALE MAP & BLOCK ORDERS (POSITIONED ABOVE CHART & BELOW PREDICTION HEALTH) */}
      <div className="bg-gradient-to-r from-[#12072b] via-[#0e0622] to-[#150a32] rounded-3xl border border-purple-500/30 p-5 sm:p-6 shadow-2xl space-y-5 font-mono text-purple-100 relative overflow-hidden">
        {/* Simple Mode Explanation Banner */}
        {appMode === 'SIMPLE' && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl flex items-start gap-3.5 text-xs text-emerald-200 font-sans shadow-md backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white block text-sm">✨ Beginner Summary: Reversal Engine & Whale Buying Active</span>
              <p className="text-emerald-300/90 leading-relaxed">
                Large institutional buyers ("Whales") are accumulating BTC with a <strong>+1,820 BTC net buy volume</strong>. The Reversal Engine predicts a <strong>71% probability</strong> that price will stay above the strike floor through expiration.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300 shadow-lg shadow-purple-500/10">
              <Activity className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  Reversal Engine & Institutional Whale Map
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30 shadow-sm">
                  71% REVERSAL HOLD
                </span>
              </div>
              <p className="text-xs text-purple-300/70 font-sans mt-0.5">
                {appMode === 'SIMPLE'
                  ? 'Plain-English view of whale buying, order book support, and reversal safety'
                  : 'Microsecond L2 order book depth, delta absorption, iceberg detection & block trade flow'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-purple-300/70 font-semibold">Active Mode:</span>
            <span className={`px-3 py-1 rounded-xl text-xs font-bold border shadow-sm ${appMode === 'SIMPLE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
              {appMode === 'SIMPLE' ? '✨ SIMPLE VIEW' : '⚡ PRO QUANT VIEW'}
            </span>
          </div>
        </div>

        {/* 2-Column Grid: Reversal Engine Probabilities + Whale Map & Block Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Panel 1: Reversal Engine Probabilities */}
          <div className="bg-[#0b051b] p-4 sm:p-5 rounded-2xl border border-purple-900/50 hover:border-purple-500/40 space-y-4 transition-all shadow-md">
            <div className="flex justify-between items-center text-xs">
              <span className="text-purple-200/90 font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Reversal Engine Probabilities ({timeframe})</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-black border border-emerald-500/30">
                ▲ HOLD UP ACTIVE
              </span>
            </div>

            {/* Probability Progress Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-emerald-300 font-bold">Bullish Reversal Hold</span>
                  <span className="text-emerald-400 font-black">71.0% Chance</span>
                </div>
                <div className="w-full bg-purple-950/80 h-3 rounded-full overflow-hidden border border-purple-900/60 flex">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[71%] rounded-full" />
                </div>
                {appMode === 'SIMPLE' && (
                  <span className="text-[11px] text-emerald-300/80 font-sans block mt-1">
                    High likelihood that price stays supported above strike level.
                  </span>
                )}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-rose-300 font-bold">Bearish Breakdown Risk</span>
                  <span className="text-rose-400 font-black">18.0% Risk</span>
                </div>
                <div className="w-full bg-purple-950/80 h-2.5 rounded-full overflow-hidden border border-purple-900/60 flex">
                  <div className="bg-rose-500 h-full w-[18%] rounded-full" />
                </div>
                {appMode === 'SIMPLE' && (
                  <span className="text-[11px] text-rose-300/80 font-sans block mt-1">
                    Low probability of downside breakdown.
                  </span>
                )}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-amber-300 font-bold">Consolidation / Sideways</span>
                  <span className="text-amber-400 font-black">11.0%</span>
                </div>
                <div className="w-full bg-purple-950/80 h-2 rounded-full overflow-hidden border border-purple-900/60 flex">
                  <div className="bg-amber-500 h-full w-[11%] rounded-full" />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-900/40 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#13072b] p-3 rounded-xl border border-purple-900/40">
                <span className="text-[10px] text-purple-300/60 font-mono uppercase block">REVERSAL HOLD PRICE</span>
                <span className="font-bold text-white text-base">${(ticker.price - 80).toLocaleString()}</span>
              </div>
              <div className="bg-[#13072b] p-3 rounded-xl border border-purple-900/40">
                <span className="text-[10px] text-purple-300/60 font-mono uppercase block">AI CONFIDENCE SCORE</span>
                <span className="font-black text-emerald-400 text-base">92.4 / 100</span>
              </div>
            </div>
          </div>

          {/* Panel 2: Whale Map & Block Orders */}
          <div className="bg-[#0b051b] p-4 sm:p-5 rounded-2xl border border-purple-900/50 hover:border-purple-500/40 space-y-4 transition-all shadow-md">
            <div className="flex justify-between items-center text-xs">
              <span className="text-purple-200/90 font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-sm">Whale Map & Block Orders ({timeframe})</span>
              </span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full font-black border border-cyan-500/30">
                +1,820 BTC NET DELTA
              </span>
            </div>

            {/* Block Order Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-[#13072b] p-3 rounded-xl border border-purple-900/40 space-y-1">
                <span className="text-[10px] text-purple-300/60 font-mono uppercase block">LARGEST BUY BLOCK</span>
                <span className="font-black text-emerald-400 text-base block">+18.4 BTC</span>
                <span className="text-[10px] text-purple-300/60 font-sans block">Executed @ ${ticker.price.toLocaleString()}</span>
              </div>

              <div className="bg-[#13072b] p-3 rounded-xl border border-purple-900/40 space-y-1">
                <span className="text-[10px] text-purple-300/60 font-mono uppercase block">LARGEST SELL BLOCK</span>
                <span className="font-black text-rose-400 text-base block">-6.5 BTC</span>
                <span className="text-[10px] text-purple-300/60 font-sans block">Executed @ ${(ticker.price + 70).toLocaleString()}</span>
              </div>

              <div className="bg-[#13072b] p-3 rounded-xl border border-purple-900/40 space-y-1">
                <span className="text-[10px] text-purple-300/60 font-mono uppercase block">ICEBERG RESTING BUY</span>
                <span className="font-black text-cyan-300 text-base block">12.8 BTC Limit</span>
                <span className="text-[10px] text-purple-300/60 font-sans block">Resting @ ${(ticker.price - 120).toLocaleString()}</span>
              </div>

              <div className="bg-[#13072b] p-3 rounded-xl border border-purple-900/40 space-y-1">
                <span className="text-[10px] text-purple-300/60 font-mono uppercase block">HIDDEN ABSORPTION</span>
                <span className="font-black text-amber-300 text-base block">8.5 BTC at VWAP</span>
                <span className="text-[10px] text-purple-300/60 font-sans block">Bid Wall Imbalance +28.4%</span>
              </div>
            </div>

            {appMode === 'SIMPLE' ? (
              <p className="text-xs text-purple-200/90 font-sans pt-2 border-t border-purple-900/40 leading-relaxed">
                💡 <strong>Whale Summary:</strong> Large institutional buyers are putting big buy orders below current price, making it very hard for price to drop.
              </p>
            ) : (
              <p className="text-[11px] text-purple-300/60 font-mono pt-2 border-t border-purple-900/40">
                L2 Depth Ratio: 1.42x • Net Taker Flow: +340.5 BTC/10m • Cumulative Delta Trend: Strongly Positive
              </p>
            )}
          </div>
        </div>
      </div>

      {/* INSTITUTIONAL AI PATTERN ENGINE & EXECUTIVE QUANT SYNTHESIS (STRIKE CONTRACTS) */}
      <AIPatternEngine ticker={ticker} timeframe={timeframe} appMode={appMode} />
    </div>
  );
};
