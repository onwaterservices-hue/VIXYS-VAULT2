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
import { fetchPrediction, fetchLiveSignalData } from '../services/api';
import { ExecutiveCommandCenter } from './ExecutiveCommandCenter';
import { CompactSignalChart } from './CompactSignalChart';
import { ModelStatusBadge } from './ModelStatusBadge';
import { AIBrainMemoryVault } from './AIBrainMemoryVault';
import { NeuralRibbonChart } from './NeuralRibbonChart';
import { ScalpDecisionChart } from './ScalpDecisionChart';
import { VixyAiStatusCard } from './VixyAiStatusCard';

// Five AI Brains
import { SignalBrain } from './brains/SignalBrain';
import { ProtectionBrain } from './brains/ProtectionBrain';
import { WhaleBrain } from './brains/WhaleBrain';
import { ExecutionBrain } from './brains/ExecutionBrain';
import { AiThinkingBrain } from './brains/AiThinkingBrain';

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
  onSelectAsset = (_symbol: string) => {},
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
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Candle Countdown Timers (15m = 900s, 1h = 3600s)
  const [secondsRemaining15M, setSecondsRemaining15M] = useState<number>(542);
  const [secondsRemaining1H, setSecondsRemaining1H] = useState<number>(2054);
  const [isRefreshingAi, setIsRefreshingAi] = useState<boolean>(false);
  const [isBailedOut, setIsBailedOut] = useState<boolean>(false);

  // Auto-Update Sync State
  const [autoSyncActive, setAutoSyncActive] = useState<boolean>(true);

  // Quantitative Engine Real-Time Telemetry & Lock State
  const [engineState, setEngineState] = useState<string>('MONITORING');
  const [feedStatus, setFeedStatus] = useState<'CONNECTED' | 'DEGRADED' | 'STALE' | 'DISCONNECTED'>('CONNECTED');
  const [lockEvaluation, setLockEvaluation] = useState<{
    qualified: boolean;
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
    checks: {
      confidence: boolean;
      freshness: boolean;
      liquidity: boolean;
      spread: boolean;
      edge: boolean;
      persistence: boolean;
    };
    reason: string;
    persistenceSeconds: number;
    requiredPersistenceSeconds: number;
  }>({
    qualified: true,
    direction: 'UP',
    checks: {
      confidence: true,
      freshness: true,
      liquidity: true,
      spread: true,
      edge: true,
      persistence: true,
    },
    reason: 'Signal qualified across all institutional edge and persistence thresholds',
    persistenceSeconds: 18,
    requiredPersistenceSeconds: 15,
  });

  // Poll backend prediction engine signal & lock evaluation every 2 seconds
  useEffect(() => {
    let isMounted = true;

    async function pollLiveSignal() {
      const data = await fetchLiveSignalData(selectedAsset || 'BTC', timeframe === '1H' ? '1h' : '15m');
      if (data && isMounted) {
        if (data.engineState) setEngineState(data.engineState);
        if (data.feedStatus) setFeedStatus(data.feedStatus);
        if (data.lockEvaluation) setLockEvaluation(data.lockEvaluation);

        if (data.direction) {
          const isBull = data.direction === 'UP';
          const kalshiProbPct = Math.round((data.kalshiImpliedProbability || 0.54) * 1000) / 10;
          const kalshiProbDec = (data.kalshiImpliedProbability || 0.54);

          setSignal((prev) => ({
            ...prev,
            timestamp: Date.now(),
            direction: isBull ? 'YES' : 'NO',
            confidence: data.confidence || prev.confidence,
            modelProb: data.modelProbability ? Math.round(data.modelProbability * 1000) / 10 : prev.modelProb,
            marketProb: kalshiProbPct,
            edgePct: data.edgePct !== undefined ? data.edgePct : prev.edgePct,
            targetPrice: data.features?.crossVenue?.kalshiStrike || prev.targetPrice,
          }));

          setVenueOdds((prev) => ({
            ...prev,
            kalshiYesPrice: Math.round(kalshiProbDec * 100) / 100,
            kalshiNoPrice: Math.round((1 - kalshiProbDec) * 100) / 100,
            polymarketYesPct: Math.round((kalshiProbDec - 0.02) * 1000) / 10,
            polymarketNoPct: Math.round((1 - (kalshiProbDec - 0.02)) * 1000) / 10,
            bestEdgeValue: data.edgePct !== undefined ? Math.abs(data.edgePct) : prev.bestEdgeValue,
          }));
        }
      }
    }

    pollLiveSignal();
    const interval = setInterval(pollLiveSignal, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedAsset, timeframe]);

  // Live UTC timestamp for Data Freshness indicator
  const [lastUpdateUtc, setLastUpdateUtc] = useState<string>(() => new Date().toISOString().substring(11, 19) + ' UTC');
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdateUtc(new Date().toISOString().substring(11, 19) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-black shadow-lg shadow-purple-600/30 transition-all shrink-0 flex items-center gap-1.5 active:scale-95 text-xs cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Unlock Pro Pass ($79)</span>
          </button>
        </div>
      )}

      {/* Active Market Contract Bar */}
      <div className="bg-[#120B28] p-3 rounded-2xl border border-purple-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-purple-300 font-extrabold uppercase font-mono text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Active Contract: <strong className="text-white font-black">{selectedAsset} {timeframe} STRIKE</strong>
          </span>

          {/* Quick Asset Switcher */}
          <div className="flex items-center gap-1 bg-[#090417] p-1 rounded-xl border border-purple-800/40">
            {['BTC', 'ETH', 'SOL'].map((sym) => (
              <button
                key={sym}
                onClick={() => onSelectAsset(sym)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedAsset === sym ? 'bg-purple-600 text-white shadow' : 'text-purple-300/70 hover:text-white'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Timeframe Switcher */}
          <div className="flex items-center gap-1 bg-[#090417] p-1 rounded-xl border border-purple-800/40">
            <button
              onClick={() => handleMarketChange('BTC15M')}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === '15M' ? 'bg-purple-600 text-white shadow' : 'text-purple-300/70 hover:text-white'
              }`}
            >
              15M
            </button>
            <button
              onClick={() => handleMarketChange('BTC1H')}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === '1H' ? 'bg-purple-600 text-white shadow' : 'text-purple-300/70 hover:text-white'
              }`}
            >
              1H
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/50 text-purple-100 font-extrabold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-300" />
              <span>Split-Screen Compare →</span>
            </button>
          )}

          <button
            onClick={() => setAppMode(appMode === 'SIMPLE' ? 'PRO' : 'SIMPLE')}
            className={`px-3 py-1 rounded-xl text-xs font-bold font-mono border transition-all cursor-pointer ${
              appMode === 'SIMPLE' 
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
            }`}
          >
            {appMode === 'SIMPLE' ? '✨ Beginner View' : '⚡ Pro Quant View'}
          </button>
        </div>
      </div>

      {/* 🎯 BRAIN 1: SIGNAL BRAIN (Direction, Confidence, Strike, Lock Score Progress) */}
      <SignalBrain
        signal={signal}
        ticker={ticker}
        timeString={timeString}
        timeframe={timeframe}
        lockEvaluation={lockEvaluation}
      />

      {/* 🛡 BRAIN 2 & 🐋 BRAIN 3: PROTECTION BRAIN & WHALE RADAR BRAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProtectionBrain signal={signal} ticker={ticker} />
        <WhaleBrain ticker={ticker} selectedAsset={selectedAsset} />
      </div>

      {/* 📈 BRAIN 4 & 🧠 BRAIN 5: EXECUTION BRAIN & AI THINKING BRAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExecutionBrain signal={signal} ticker={ticker} />
        <AiThinkingBrain signal={signal} ticker={ticker} timeframe={timeframe} />
      </div>

      {/* PROMINENT LIVE CANDLESTICK CHART */}
      <div className="space-y-4">
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

      {/* 4. ADVANCED QUANT INTELLIGENCE TOGGLE (PROGRESSIVE DISCLOSURE ACCORDION) */}
      <div className="pt-4 border-t border-purple-900/50 text-center">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#12072b] hover:bg-[#1a0b3e] border border-purple-500/40 hover:border-purple-400 text-purple-200 text-xs font-mono font-extrabold shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Sliders className="w-4 h-4 text-purple-300" />
          <span>{showAdvanced ? 'Hide Advanced Quant Intelligence ▲' : 'Show Advanced Quant Intelligence (Venues, Order Flow, Reversal, Brain Vault) ▼'}</span>
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-6 pt-4 border-t border-purple-900/40">
          {/* Vixy AI Status */}
          <VixyAiStatusCard onOpenPricing={onOpenPricing} userRole={userRole} />

          {/* Executive Command Center */}
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

          {/* Scalp Decision Matrix */}
          <ScalpDecisionChart
            asset={selectedAsset}
            desk={timeframe.toLowerCase()}
            title={`${selectedAsset} SCALPING DECISION MATRIX & PROBABILITY CONE`}
          />

          {/* Neural Ribbon Chart */}
          <NeuralRibbonChart asset={selectedAsset} desk={timeframe.toLowerCase()} title="AI Neural Ribbon & Order Flow" />

          {/* AI Brain Memory Vault */}
          <AIBrainMemoryVault asset={selectedAsset} desk={timeframe.toLowerCase()} />

          {/* Prediction Health Watch */}
          <PredictionHealthWatch
            currentPrice={ticker.price}
            timeframe={timeframe}
            onBuyOutPosition={() => setIsBailedOut(true)}
            appMode={appMode}
          />

          {/* AI Pattern Engine */}
          <AIPatternEngine ticker={ticker} timeframe={timeframe} appMode={appMode} />
        </div>
      )}
    </div>
  );
};
