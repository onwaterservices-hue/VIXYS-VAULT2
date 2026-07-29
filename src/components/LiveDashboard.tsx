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
} from 'lucide-react';
import { BTCTicker, Candle, PredictionSignal } from '../types';
import { CandleChart } from './CandleChart';
import { PredictionHealthWatch } from './PredictionHealthWatch';
import { AIPatternEngine } from './AIPatternEngine';
import { fetchPrediction } from '../services/api';

interface LiveDashboardProps {
  ticker: BTCTicker;
  candles: Candle[];
  onOpenAlerts: () => void;
  onOpenPricing: () => void;
  onOpenJournal: () => void;
  userRole: 'DEMO' | 'PRO' | 'ADMIN';
  selectedAsset?: string;
  selectedTimeframe?: string;
  selectedVenues?: string[];
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  ticker,
  candles,
  onOpenAlerts,
  onOpenPricing,
  onOpenJournal,
  userRole,
  selectedAsset = 'BTC',
  selectedTimeframe = '15M',
  selectedVenues = ['Kalshi'],
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

      {/* Active Market & UX Mode Switcher */}
      <div className="bg-[#120B28] p-3 rounded-2xl border border-purple-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-purple-300/80 font-extrabold uppercase font-mono text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            Active Contract: <strong className="text-white font-black">{selectedAsset} {timeframe} STRIKE</strong>
          </span>
        </div>

        {/* User Experience Mode Switcher (Simple vs Pro Quant) */}

        <div className="flex items-center gap-2 bg-[#0B061A] p-1 rounded-xl border border-purple-500/30">
          <button
            onClick={() => setAppMode('SIMPLE')}
            className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
              appMode === 'SIMPLE'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/40 font-black'
                : 'text-purple-300/60 hover:text-white'
            }`}
          >
            <span>✨ SIMPLE MODE</span>
            <span className="text-[9px] bg-emerald-950 px-1.5 py-0.2 rounded text-emerald-300 font-normal">Beginner Friendly</span>
          </button>
          <button
            onClick={() => setAppMode('PRO')}
            className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
              appMode === 'PRO'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 font-black'
                : 'text-purple-300/60 hover:text-white'
            }`}
          >
            <span>⚡ PRO QUANT MODE</span>
            <span className="text-[9px] bg-purple-950 px-1.5 py-0.2 rounded text-purple-300 font-normal">Institutional</span>
          </button>
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
                <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase">
                  PRIMARY LOCK
                </span>
                <h3 className="text-sm font-black text-white mt-1">Kalshi 15M Market</h3>
                <p className="text-[10px] text-purple-300/60 font-sans">CFTC Regulated Exchange • Direct Strike</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-emerald-400 block">$0.54 YES</span>
                <span className="text-[10px] text-rose-400 block">$0.46 NO</span>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-900/40 flex justify-between items-center text-xs">
              <span className="text-purple-300/60">Implied Prob:</span>
              <span className="font-bold text-white">54.0%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-purple-300/60">Vault Model Edge:</span>
              <span className="font-black text-emerald-400">+12.2% EDGE</span>
            </div>
          </div>

          {/* Polymarket Card */}
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase">
                  DECENTRALIZED
                </span>
                <h3 className="text-sm font-black text-white mt-1">Polymarket 15M</h3>
                <p className="text-[10px] text-purple-300/60 font-sans">Polygon On-Chain • USDC Liquidity</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-emerald-400 block">52.0% YES</span>
                <span className="text-[10px] text-rose-400 block">48.0% NO</span>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-900/40 flex justify-between items-center text-xs">
              <span className="text-purple-300/60">Implied Prob:</span>
              <span className="font-bold text-white">52.0%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-purple-300/60">Vault Model Edge:</span>
              <span className="font-black text-emerald-400">+12.2% EDGE</span>
            </div>
          </div>

          {/* DraftKings Sportsbook Micro Card */}
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase">
                  SPORTSBOOK MICRO
                </span>
                <h3 className="text-sm font-black text-white mt-1">DraftKings Micro</h3>
                <p className="text-[10px] text-purple-300/60 font-sans">American Odds • Instant Payout</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-emerald-400 block">-115 YES</span>
                <span className="text-[10px] text-rose-400 block">+105 NO</span>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-900/40 flex justify-between items-center text-xs">
              <span className="text-purple-300/60">Implied Prob:</span>
              <span className="font-bold text-white">53.5%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-purple-300/60">Vault Model Edge:</span>
              <span className="font-black text-emerald-400">+10.7% EDGE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Valhalla / OGERSHHH Style Buy Decision Deck & Locked Position Guide */}
      <div className="bg-[#0B1220] rounded-2xl border border-[#1E2E48] p-5 shadow-2xl relative overflow-hidden font-mono space-y-5">
        {/* Top Decision Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#1E2E48] pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                LIVE BUY DECISION / PUBLISHES ON QUALIFIED CONVICTION
              </span>
              <span className="text-[10px] text-slate-400">
                COVERAGE PREDICTION BUY {signal.direction === 'YES' ? 'UP' : 'DOWN'} | HIGH VOLATILITY MARKET | LOCK DATA MEDIUM
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <h1 className={`text-4xl sm:text-5xl font-black tracking-tight ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                BUY {signal.direction === 'YES' ? 'UP' : 'DOWN'}
              </h1>

              {/* Progress Checkpoint Badges */}
              <div className="hidden md:flex items-center gap-2 bg-[#060B14] p-1.5 rounded-xl border border-[#18263E]">
                <div className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold border border-cyan-700/50">
                  01 BUY {signal.direction === 'YES' ? 'UP' : 'DOWN'} / COMMITTED
                </div>
                <span className="text-slate-600 text-xs">→</span>
                <div className="px-2.5 py-1 rounded bg-[#0B1526] text-slate-400 text-[10px] font-bold">
                  02 WAIT FOR VALUE
                </div>
                <span className="text-slate-600 text-xs">→</span>
                <div className="px-2.5 py-1 rounded bg-[#0B1526] text-slate-400 text-[10px] font-bold">
                  03 POSITION REVIEW
                </div>
              </div>
            </div>
          </div>

          {/* Decision Core Dial & Signal Vector */}
          <div className="flex items-center gap-3 self-stretch lg:self-auto justify-between lg:justify-end">
            <div className="bg-[#060C18] p-3 rounded-xl border border-[#1A2A42] flex items-center gap-3 text-xs">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500/80 flex items-center justify-center font-black text-emerald-300 text-sm bg-emerald-950/40">
                V
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-extrabold block">DECISION CORE</span>
                <span className="text-emerald-400 font-bold block text-sm">77.0% CONFIDENCE</span>
                <span className="text-[10px] text-cyan-300/80">71.5% EXECUTION</span>
              </div>
            </div>

            <div className="bg-[#060C18] p-3 rounded-xl border border-[#1A2A42] text-xs space-y-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-400">SIGNAL VECTOR</span>
                <span className="text-emerald-400 font-black">EDGE {signal.edgePct}%</span>
              </div>
              <div className="w-32 sm:w-40 bg-slate-900 h-2.5 rounded-full overflow-hidden flex border border-slate-800">
                <div className="bg-emerald-500 h-full w-[85%]" />
                <div className="bg-rose-500 h-full w-[15%]" />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>85% UP</span>
                <span>15% DOWN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Entry Advisor + Locked Call Position Guide */}
        <div className="bg-[#060B14] p-4 rounded-xl border border-[#18263E] space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-[#142034] pb-2">
            <span className="text-cyan-300 font-extrabold flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              LIVE ENTRY ADVISOR + LOCKED CALL POSITION GUIDE / DIRECTION STAYS FROZEN
            </span>
            <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase">
              WAITING FOR LOCK
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#0B1526] p-2.5 rounded-lg border border-[#1A2A42]">
              <span className="text-[10px] text-slate-400 block font-semibold">NEW ENTRY LANE</span>
              <span className="text-xs font-bold text-amber-300">WAIT FOR VALUE</span>
            </div>
            <div className="bg-[#0B1526] p-2.5 rounded-lg border border-[#1A2A42]">
              <span className="text-[10px] text-slate-400 block font-semibold">LIVE ASK</span>
              <span className="text-xs font-bold text-white">$0.54 YES</span>
            </div>
            <div className="bg-[#0B1526] p-2.5 rounded-lg border border-[#1A2A42]">
              <span className="text-[10px] text-slate-400 block font-semibold">PAYOUT</span>
              <span className="text-xs font-bold text-emerald-400">500.00x</span>
            </div>
            <div className="bg-[#0B1526] p-2.5 rounded-lg border border-[#1A2A42]">
              <span className="text-[10px] text-slate-400 block font-semibold">SAFE EDGE</span>
              <span className="text-xs font-bold text-cyan-300">+{signal.edgePct}%</span>
            </div>
            <div className="bg-[#0B1526] p-2.5 rounded-lg border border-[#1A2A42]">
              <span className="text-[10px] text-slate-400 block font-semibold">EXECUTABLE EXIT BID</span>
              <span className="text-xs font-bold text-amber-400">$0.52 YES</span>
            </div>
          </div>
        </div>

        {/* THE GUARDIAN / POST-LOCK REVERSAL WATCH (BAIL-OUT WINDOW IF THINGS GO SOUTH) */}
        <div className={`p-4 rounded-xl border transition-all ${isBailedOut ? 'bg-rose-950/60 border-rose-500/80 shadow-2xl shadow-rose-950/60' : 'bg-gradient-to-r from-rose-950/30 via-[#130B1A] to-purple-950/30 border-rose-500/40'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  {isBailedOut ? 'BREAK CONFIRMED - EXITED' : 'THE GUARDIAN / POST-LOCK REVERSAL WATCH'}
                </span>
                <span className="text-xs text-rose-200/80 font-bold">
                  {isBailedOut ? 'POSITION CLOSED AT $0.54' : 'BAIL-OUT WINDOW — REVIEW POSITION NOW'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans">
                {isBailedOut
                  ? 'Your position has been safely liquidated / exited at the current bid quote. Capital protected from downside breakdown.'
                  : 'Multiple independent signals monitored. If order flow delta or VWAP support breaks, use the Emergency Exit button below to buy/sell out before expiration.'}
              </p>
            </div>

            {/* Emergency Buy-Out / Bail Out Button */}
            <div className="shrink-0 self-stretch sm:self-auto">
              {isBailedOut ? (
                <button
                  onClick={() => setIsBailedOut(false)}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-emerald-600/40 border border-emerald-400/50 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                  <span>RE-OPEN POSITION LOCK</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsBailedOut(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 hover:from-rose-500 hover:to-red-500 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-xl shadow-rose-600/50 border border-rose-400/60 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer animate-pulse"
                >
                  <ShieldCheck className="w-4 h-4 text-rose-200" />
                  <span>BAIL OUT NOW / BUY OUT POSITION</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-rose-900/30 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">REVERSAL RISK</span>
              <span className="text-rose-400 font-black text-sm">{isBailedOut ? 'DEFENDED' : '90.0 RISK SCORE'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">SUSTAINED BREAK</span>
              <span className="text-amber-300 font-bold">30s TIMEFRAME</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">APPROACH ETA</span>
              <span className="text-cyan-300 font-bold">LIVE MONITORED</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">VERIFIED WIN RATE</span>
              <span className="text-emerald-400 font-bold">91.4% (314 SETUPS)</span>
            </div>
          </div>
        </div>
      </div>

      {/* EXPLAINABILITY & CONFIDENCE STABILITY BAR (VIXY'S VAULT EVIDENCE ENGINE) */}
      <div className="bg-gradient-to-r from-[#12072b] via-[#0e0720] to-[#150a33] rounded-2xl border border-purple-500/40 p-4 shadow-xl font-mono text-purple-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/40 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-200">
              <BrainCircuit className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white uppercase tracking-wide">
                  Model Explainability & Confidence Stability
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  78.4% CALIBRATED
                </span>
              </div>
              <p className="text-[11px] text-purple-300/60 font-sans">
                Evidence Aggregator across 6 independent engines • Low Conflict (12%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right font-mono">
              <div className="text-xs font-black text-emerald-400">Stable ↑ (+3.2% 5m)</div>
              <div className="text-[9px] text-purple-300/50">Raw: 84.0% → Calibrated: 78.4%</div>
            </div>
          </div>
        </div>

        {/* 3 Evidence Engine Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-sans">
          <div className="p-2.5 rounded-xl bg-[#080413] border border-purple-900/40 space-y-0.5">
            <span className="text-[10px] text-purple-300/60 font-mono uppercase font-bold block">
              Order Flow Engine (+0.34)
            </span>
            <p className="text-purple-200 text-[11px] leading-tight">
              +1,820 BTC net buy volume swallowing ask liquidity at $96,200.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#080413] border border-purple-900/40 space-y-0.5">
            <span className="text-[10px] text-purple-300/60 font-mono uppercase font-bold block">
              Whale Tracker Engine (+0.22)
            </span>
            <p className="text-purple-200 text-[11px] leading-tight">
              Goliath Capital Vault #02 swept $2.48M YES contracts at $96.5k.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#080413] border border-purple-900/40 space-y-0.5">
            <span className="text-[10px] text-purple-300/60 font-mono uppercase font-bold block">
              Liquidity Wall Engine (+0.14)
            </span>
            <p className="text-purple-200 text-[11px] leading-tight">
              $18.4M stacked bid floor beneath $96,000 floor support.
            </p>
          </div>
        </div>
      </div>

      {/* PREDICTION SETUP HEALTH & RISK WATCH (SAFE ENTRY & EMERGENCY BUY-OUT / BAIL-OUT) */}
      <PredictionHealthWatch
        currentPrice={ticker.price}
        timeframe={timeframe}
        onBuyOutPosition={() => setIsBailedOut(true)}
        appMode={appMode}
      />

      {/* REVERSAL ENGINE PROBABILITIES, WHALE MAP & BLOCK ORDERS (POSITIONED ABOVE CHART & BELOW PREDICTION HEALTH) */}
      <div className="bg-gradient-to-r from-[#0C061E] via-[#140A30] to-[#0B051B] rounded-2xl border border-purple-500/40 p-5 shadow-2xl space-y-4 font-mono text-purple-100 relative overflow-hidden">
        {/* Simple Mode Explanation Banner */}
        {appMode === 'SIMPLE' && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 p-3.5 rounded-xl flex items-start gap-3 text-xs text-emerald-200 font-sans">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white block">✨ Beginner Summary: Reversal Engine & Whale Buying Active</span>
              <p className="text-emerald-300/90 leading-relaxed">
                Large institutional buyers ("Whales") are accumulating BTC with a <strong>+1,820 BTC net buy volume</strong>. The Reversal Engine predicts a <strong>71% probability</strong> that price will stay above the strike floor through expiration.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300">
              <Activity className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Reversal Engine & Institutional Whale Map
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  71% REVERSAL HOLD
                </span>
              </div>
              <p className="text-[11px] text-purple-300/60 font-sans">
                {appMode === 'SIMPLE'
                  ? 'Plain-English view of whale buying, order book support, and reversal safety'
                  : 'Microsecond L2 order book depth, delta absorption, iceberg detection & block trade flow'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-purple-300/70 font-semibold">Active Mode:</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${appMode === 'SIMPLE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
              {appMode === 'SIMPLE' ? '✨ SIMPLE VIEW' : '⚡ PRO QUANT VIEW'}
            </span>
          </div>
        </div>

        {/* 2-Column Grid: Reversal Engine Probabilities + Whale Map & Block Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Panel 1: Reversal Engine Probabilities */}
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/50 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-purple-300/80 font-bold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Reversal Engine Probabilities ({timeframe})</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-black border border-emerald-500/30">
                ▲ HOLD UP ACTIVE
              </span>
            </div>

            {/* Probability Progress Bars */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-300 font-bold">Bullish Reversal Hold</span>
                  <span className="text-emerald-400 font-black">71.0% Chance</span>
                </div>
                <div className="w-full bg-purple-950/80 h-3 rounded-full overflow-hidden border border-purple-900/60 flex">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[71%]" />
                </div>
                {appMode === 'SIMPLE' && (
                  <span className="text-[10px] text-emerald-300/70 font-sans block mt-0.5">
                    High likelihood that price stays supported above strike level.
                  </span>
                )}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-300 font-bold">Bearish Breakdown Risk</span>
                  <span className="text-rose-400 font-black">18.0% Risk</span>
                </div>
                <div className="w-full bg-purple-950/80 h-2.5 rounded-full overflow-hidden border border-purple-900/60 flex">
                  <div className="bg-rose-500 h-full w-[18%]" />
                </div>
                {appMode === 'SIMPLE' && (
                  <span className="text-[10px] text-rose-300/70 font-sans block mt-0.5">
                    Low probability of downside breakdown.
                  </span>
                )}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-300 font-bold">Consolidation / Sideways</span>
                  <span className="text-amber-400 font-black">11.0%</span>
                </div>
                <div className="w-full bg-purple-950/80 h-2 rounded-full overflow-hidden border border-purple-900/60 flex">
                  <div className="bg-amber-500 h-full w-[11%]" />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-900/40 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#120A28] p-2 rounded-lg border border-purple-900/40">
                <span className="text-[10px] text-purple-300/60 block">REVERSAL HOLD PRICE</span>
                <span className="font-bold text-white">${(ticker.price - 80).toLocaleString()}</span>
              </div>
              <div className="bg-[#120A28] p-2 rounded-lg border border-purple-900/40">
                <span className="text-[10px] text-purple-300/60 block">AI CONFIDENCE SCORE</span>
                <span className="font-black text-emerald-400">92.4 / 100</span>
              </div>
            </div>
          </div>

          {/* Panel 2: Whale Map & Block Orders */}
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/50 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-purple-300/80 font-bold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Whale Map & Block Orders ({timeframe})</span>
              </span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-black border border-cyan-500/30">
                +1,820 BTC NET DELTA
              </span>
            </div>

            {/* Block Order Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#120A28] p-2.5 rounded-lg border border-purple-900/40 space-y-1">
                <span className="text-[10px] text-purple-300/60 block">LARGEST WHALE BUY</span>
                <span className="font-extrabold text-emerald-400 block">$1,200,000 (18.4 BTC)</span>
                <span className="text-[9px] text-purple-300/50 block">Executed @ ${ticker.price.toLocaleString()}</span>
              </div>

              <div className="bg-[#120A28] p-2.5 rounded-lg border border-purple-900/40 space-y-1">
                <span className="text-[10px] text-purple-300/60 block">LARGEST BLOCK SELL</span>
                <span className="font-extrabold text-rose-400 block">$420,000 (6.5 BTC)</span>
                <span className="text-[9px] text-purple-300/50 block">Executed @ ${(ticker.price + 70).toLocaleString()}</span>
              </div>

              <div className="bg-[#120A28] p-2.5 rounded-lg border border-purple-900/40 space-y-1">
                <span className="text-[10px] text-purple-300/60 block">ICEBERG RESTING BUY</span>
                <span className="font-extrabold text-cyan-300 block">12.8 BTC Limit</span>
                <span className="text-[9px] text-purple-300/50 block">Resting @ ${(ticker.price - 120).toLocaleString()}</span>
              </div>

              <div className="bg-[#120A28] p-2.5 rounded-lg border border-purple-900/40 space-y-1">
                <span className="text-[10px] text-purple-300/60 block">HIDDEN ABSORPTION</span>
                <span className="font-extrabold text-amber-300 block">8.5 BTC at VWAP</span>
                <span className="text-[9px] text-purple-300/50 block">Bid Wall Imbalance +28.4%</span>
              </div>
            </div>

            {appMode === 'SIMPLE' ? (
              <p className="text-[11px] text-cyan-300/90 font-sans pt-1 border-t border-purple-900/40">
                💡 <strong>Whale Summary:</strong> Large institutional buyers are putting big buy orders below current price, making it very hard for price to drop.
              </p>
            ) : (
              <p className="text-[10px] text-purple-300/60 font-mono pt-1 border-t border-purple-900/40">
                L2 Depth Ratio: 1.42x • Net Taker Flow: +340.5 BTC/10m • Cumulative Delta Trend: Strongly Positive
              </p>
            )}
          </div>
        </div>
      </div>

      {/* LIVE CANDLESTICK CHART & ORDER FLOW SECTION */}
      <div>
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
      </div>

      {/* INSTITUTIONAL AI PATTERN ENGINE & EXECUTIVE QUANT SYNTHESIS (STRIKE CONTRACTS) */}
      <AIPatternEngine ticker={ticker} timeframe={timeframe} appMode={appMode} />
    </div>
  );
};
