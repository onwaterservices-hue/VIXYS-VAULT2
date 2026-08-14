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
  Lock,
} from 'lucide-react';
import { BTCTicker, Candle, PredictionSignal, ExchangeApiKeys, AlertSettings } from '../types';
import { CandleChart } from './CandleChart';
import { PredictionHealthWatch } from './PredictionHealthWatch';
import { AIPatternEngine } from './AIPatternEngine';
import { fetchPrediction } from '../services/api';
import { useLiveSignal } from '../hooks/useLiveSignal';
import { ExecutiveCommandCenter } from './ExecutiveCommandCenter';
import { CompactSignalChart } from './CompactSignalChart';
import { ModelStatusBadge } from './ModelStatusBadge';
import { AIBrainMemoryVault } from './AIBrainMemoryVault';
import { NeuralRibbonChart } from './NeuralRibbonChart';
import { ScalpDecisionChart } from './ScalpDecisionChart';
import { VixyAiStatusCard } from './VixyAiStatusCard';
import { CommunityAccessNode } from './CommunityAccessNode';
import { IntelligenceLockGate } from './IntelligenceLockGate';

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
  alertSettings?: AlertSettings;
  setAlertSettings?: React.Dispatch<React.SetStateAction<AlertSettings>>;
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
  alertSettings,
  setAlertSettings,
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

  // Synchronize with global live signal hook
  const { signal: liveApiData } = useLiveSignal(selectedAsset || 'BTC', timeframe === '1H' ? '1h' : '15m');

  // Authoritative Access Unlock Logic:
  // ADMIN -> FULL ACCESS (no lock gate, no subscription gate, no discord gate)
  // ELITE / PRO / Active subscription -> UNLOCKED
  // Discord-linked + Guild member -> UNLOCKED
  const apiUserAccess = (liveApiData as any)?.userAccess;
  const isUserAdmin = userRole === 'ADMIN' || Boolean(alertSettings?.isAdmin) || apiUserAccess?.role === 'ADMIN' || apiUserAccess?.accessState === 'ADMIN';
  const isPaidUser = isUserAdmin || userRole === 'PRO' || apiUserAccess?.accessState === 'SUBSCRIBED' || apiUserAccess?.accessState === 'AUTHORIZED';
  const isDiscordVerified = Boolean(alertSettings?.discordLinked) && Boolean(alertSettings?.guildMember);
  const isIntelligenceUnlocked = isUserAdmin || isPaidUser || isDiscordVerified || (apiUserAccess && !apiUserAccess.locked);
  const [isRefreshingAi, setIsRefreshingAi] = useState<boolean>(false);
  const [isBailedOut, setIsBailedOut] = useState<boolean>(false);

  // Auto-Update Sync State
  const [autoSyncActive, setAutoSyncActive] = useState<boolean>(true);

  // Quantitative Engine Real-Time Telemetry & Lock State
  const [engineState, setEngineState] = useState<string>('MONITORING');
  const [feedStatus, setFeedStatus] = useState<string>('CONNECTED');
  const [rawApiData, setRawApiData] = useState<any>(null);
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
  
  useEffect(() => {
    if (!liveApiData) return;

    const data = liveApiData;
    
    if (data.latencyMs !== undefined) setLatencyMs(data.latencyMs);
    setRawApiData(data);
    if (data.engineState) setEngineState(data.engineState);
    if (data.feedStatus) setFeedStatus(data.feedStatus as any);
    if (data.lockEvaluation) setLockEvaluation(data.lockEvaluation);

    if (data.direction !== undefined) {
      const isBull = (data.direction as string) === 'UP' || (data.direction as string) === 'YES';
      const validKalshiProb = Number.isFinite(data.kalshiImpliedProbability) ? data.kalshiImpliedProbability : 0.54;
      const kalshiProbPct = Math.round(validKalshiProb * 1000) / 10;
      
      if (Number.isFinite(data.timeRemaining)) { setSecondsRemaining15M(data.timeRemaining); } else if (Number.isFinite(data.features?.crossVenue?.timeRemainingSec)) {
        setSecondsRemaining15M(data.features.crossVenue.timeRemainingSec);
      }
      
      setSignal((prev) => {
        // Authoritative backend wins! If data says null, it's 0 or we keep it depending on UX, but the prompt says:
        // "The authoritative backend must win over client cache."
        const newConfidence = data.confidence !== null ? data.confidence : 0;
        const newModelProb = data.modelProbability !== null ? Math.round(data.modelProbability * 1000) / 10 : 0;
        const newEdgePct = data.edgePct !== null ? data.edgePct : 0;
        const newTargetPrice = data.features?.crossVenue?.kalshiStrike || prev.targetPrice;
        
        return {
          ...prev,
          timestamp: Date.now(),
          direction: data.direction ? (isBull ? 'YES' : 'NO') : 'NO',
          confidence: newConfidence,
          modelProb: newModelProb,
          marketProb: kalshiProbPct,
          edgePct: newEdgePct,
          targetPrice: newTargetPrice,
        };
      });

      
      setVenueOdds((prev) => {
        const newBestEdge = Number.isFinite(data.edgePct) ? Math.abs(data.edgePct) : prev.bestEdgeValue;
        return {
          ...prev,
          bestEdgeValue: newBestEdge
        };
      });
    }
  }, [liveApiData]);

  // Live UTC timestamp for Data Freshness indicator
  const [lastUpdateUtc, setLastUpdateUtc] = useState<string>(() => new Date().toISOString().substring(11, 19) + ' UTC');
  const [latencyMs, setLatencyMs] = useState<number>(0);
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

  // Sync signal current price live with incoming WebSocket ticker price
  useEffect(() => {
    if (ticker?.price && ticker.price > 0) {
      setSignal((prev) => ({
        ...prev,
        currentPrice: ticker.price,
      }));
    }
  }, [ticker?.price]);

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

  // Ticking Countdown Timers
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining15M((prev) => Math.max(0, prev - 1));
      setSecondsRemaining1H((prev) => Math.max(0, prev - 1));
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
    } else if (marketKey === 'BTC15M') {
      setTimeframe('15M');
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

      {/* 📡 COMMUNITY ACCESS NODE (SECURE IDENTITY LINK & DISCORD GATEWAY) */}
      <div id="vixy-discord-gateway">
        <CommunityAccessNode
          settings={alertSettings}
          setSettings={setAlertSettings}
          onOpenDiscordModal={onOpenAlerts}
          mode="dashboard"
        />
      </div>

      {/* 🎯 PROTECTED VIXY INTELLIGENCE CORE */}
      <IntelligenceLockGate
        isVerified={isIntelligenceUnlocked}
        isAdmin={isUserAdmin}
        userRole={userRole}
        onOpenDiscordModal={onOpenAlerts}
        title="VIXY VAULT INTELLIGENCE LOCKED"
        subtitle="Connect your Discord account & verify server membership in the gateway above to unlock live predictions, candle charts, protection telemetry, and order flow intelligence."
      >
        <div className="space-y-6">
          {/* 5. PRIMARY DECISION CENTER */}
          <div>
            <SignalBrain
              signal={signal}
              ticker={ticker}
              timeString={timeString}
              timeframe={timeframe}
              lockEvaluation={lockEvaluation}
              feedStatus={feedStatus}
              latencyMs={latencyMs}
              rawApiData={liveApiData}
              venue={selectedVenues && selectedVenues.length > 0 ? selectedVenues[0] : selectedVenue || 'Kalshi'}
            />
          </div>

          {/* 6. INSTITUTIONAL INTELLIGENCE MODULE: VIXY PROTECTION (LEFT) + WHALE WATCH (RIGHT) */}
          <div className="space-y-3">
            {/* Shared Institutional Module Section Connector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#04010d] rounded-xl border border-purple-800/60 font-mono text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 font-black text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                  <span>INSTITUTIONAL INTELLIGENCE MATRIX</span>
                </div>
                <span className="hidden md:inline text-purple-400/80 text-[10px] font-bold uppercase tracking-wider">
                  POSITION DEFENSE ↔ INSTITUTIONAL FLOW
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-purple-300/80 font-bold flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="text-cyan-400 font-mono">POSITION DEFENSE:</span> HEALTH • RISK • GUARDIAN
                </span>
                <span className="hidden lg:inline text-purple-700">|</span>
                <span className="hidden lg:flex items-center gap-1">
                  <span className="text-cyan-400 font-mono">INSTITUTIONAL FLOW:</span> DARK POOL • DESK • IMPACT
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <div className="h-full">
                <ProtectionBrain 
                  signal={signal} 
                  ticker={ticker} 
                  isDiscordVerified={isDiscordVerified} 
                  rawApiData={liveApiData}
                />
              </div>
              <div className="h-full">
                <WhaleBrain ticker={ticker} selectedAsset={selectedAsset} />
              </div>
            </div>
          </div>

          {/* 7. STAGE 1: MARKET EVIDENCE & NEURAL ORDER FLOW */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#04010d] rounded-xl border border-purple-800/60 font-mono text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 font-black text-purple-300">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_#c084fc]" />
                  <span>STAGE 1 // MARKET EVIDENCE & ORDER FLOW</span>
                </div>
                <span className="hidden md:inline text-purple-400/80 text-[10px] font-bold uppercase tracking-wider">
                  REAL-TIME CANDLE TAPE & TAKER FLOW RIBBON
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-300 bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-800/60">
                15M / 1H GRANULARITY
              </span>
            </div>

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
              venue={selectedVenues && selectedVenues.length > 0 ? selectedVenues[0] : selectedVenue || 'Kalshi'}
            />
            <NeuralRibbonChart asset={selectedAsset} desk={timeframe.toLowerCase()} title="BTC 15M • AI NEURAL RIBBON & ORDER FLOW" />
          </div>

          {/* 8. STAGE 2: MARKET STRUCTURE & PATTERN DETECTION */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#04010d] rounded-xl border border-purple-800/60 font-mono text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 font-black text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]" />
                  <span>STAGE 2 // MARKET STRUCTURE & PATTERN DETECTION</span>
                </div>
                <span className="hidden md:inline text-purple-400/80 text-[10px] font-bold uppercase tracking-wider">
                  DNA CLUSTERS & SCALP PROBABILITY CONE
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-800/60">
                MULTI-TIMEFRAME ALIGNMENT
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AIPatternEngine
                ticker={ticker}
                timeframe={timeframe}
                appMode={appMode}
                userRole={userRole}
                alertSettings={alertSettings}
                onOpenDiscordModal={onOpenAlerts}
              />
              <ScalpDecisionChart
                asset={selectedAsset}
                desk={timeframe.toLowerCase()}
                title={`${selectedAsset} SCALPING DECISION MATRIX & PROBABILITY CONE`}
              />
            </div>
          </div>

          {/* 9. STAGE 3: EXECUTION INTELLIGENCE & RISK SIZING */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#04010d] rounded-xl border border-purple-800/60 font-mono text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 font-black text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  <span>STAGE 3 // EXECUTION INTELLIGENCE & RISK SIZING</span>
                </div>
                <span className="hidden md:inline text-purple-400/80 text-[10px] font-bold uppercase tracking-wider">
                  OPTIMAL BIDS, SCALING GUIDANCE & HEALTH WATCH
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/60">
                DYNAMIC KELLY CRITERION
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <ExecutionBrain signal={signal} ticker={ticker} />
              <PredictionHealthWatch
                currentPrice={ticker.price}
                timeframe={timeframe}
                onBuyOutPosition={() => setIsBailedOut(true)}
                appMode={appMode}
              />
            </div>
          </div>

          {/* 10. STAGE 4: MODEL REASONING & COMMAND SYNTHESIS */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#04010d] rounded-xl border border-purple-800/60 font-mono text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 font-black text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                  <span>STAGE 4 // MODEL REASONING & COMMAND SYNTHESIS</span>
                </div>
                <span className="hidden md:inline text-purple-400/80 text-[10px] font-bold uppercase tracking-wider">
                  QUANT SYNTHESIS, CONFLUENCE DRIVERS & STEP LOG
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800/60">
                LIVE MODEL REASONING STREAM
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AiThinkingBrain signal={signal} ticker={ticker} timeframe={timeframe} />
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
            </div>
          </div>

          {/* 11. STAGE 5: AI STATUS & CONTINUOUS NEURAL LEARNING */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#04010d] rounded-xl border border-purple-800/60 font-mono text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 font-black text-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_#fb7185]" />
                  <span>STAGE 5 // AI STATUS & CONTINUOUS NEURAL LEARNING</span>
                </div>
                <span className="hidden md:inline text-purple-400/80 text-[10px] font-bold uppercase tracking-wider">
                  MODELS ONLINE, NEURAL MEMORY VAULT & FEATURE VOTE
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/60 px-2.5 py-0.5 rounded border border-rose-800/60">
                RECURSIVE WEIGHT RECALIBRATION
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VixyAiStatusCard onOpenPricing={onOpenPricing} userRole={userRole} />
              <AIBrainMemoryVault asset={selectedAsset} desk={timeframe.toLowerCase()} />
            </div>
          </div>
        </div>
      </IntelligenceLockGate>
    </div>
  );
};
