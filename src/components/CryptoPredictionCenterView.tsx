import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  BarChart2,
  Lock,
  ChevronRight,
  Flame,
  BrainCircuit,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Award,
  RefreshCw,
  Eye,
  Sliders,
  CheckCircle2,
  Info,
  Radio,
  ExternalLink,
  Cpu,
  BarChart3,
  Crosshair,
  Volume2,
  VolumeX,
  Play,
  HelpCircle,
  Shield,
  Gauge,
  X
} from 'lucide-react';
import { BTCTicker, Candle } from '../types';
import { fetchBTCTicker, fetchCryptoTicker, fetchCryptoKlines } from '../services/api';
import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';
import { computeEvidenceVectors } from '../utils/evidenceVectors';
import { calculateCycleSecondsRemaining, formatCountdownMmSs } from '../utils/cycleTime';
import { getReversalRiskAssessment } from '../utils/reversalRisk';
import { CandleChart } from './CandleChart';
import { NeuralRibbonChart } from './NeuralRibbonChart';
import { calculateMarketRegime, MarketRegimeAssessment } from '../utils/marketRegime';
import { OrderbookHeatmapRadar } from './prediction-center/OrderbookHeatmapRadar';
import { NeuralDecompositionMatrix } from './prediction-center/NeuralDecompositionMatrix';
import { ScenarioSimulatorMatrix } from './prediction-center/ScenarioSimulatorMatrix';
import { AutonomousExecutionGuard } from './prediction-center/AutonomousExecutionGuard';

interface CryptoPredictionCenterViewProps {
  ticker?: BTCTicker;
  candles?: Candle[];
  userEmail?: string;
  onOpenReplay?: () => void;
  onOpenPricing?: () => void;
  isAuthenticated?: boolean;
  hasActiveAccess?: boolean;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

// 'HYDRATING' is not a lifecycle stage. It means the backend has no
// authoritative canonical decision for this cycle yet, and the card must say so
// rather than infer a stage from the countdown.
export type CycleState = 'ANALYZING' | 'BUILDING' | 'CONFIRMING' | 'LOCKED' | 'PROTECTED' | 'SETTLED' | 'SKIP' | 'HYDRATING';

// Web Audio Soft Institutional Chime (Restrained, Optional)
const playLockChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Ignore audio errors if restricted by browser context
  }
};

export const CryptoPredictionCenterView: React.FC<CryptoPredictionCenterViewProps> = ({
  ticker,
  candles: initialCandles,
  userEmail,
  onOpenReplay,
  onOpenPricing,
  isAuthenticated = true,
  hasActiveAccess = true,
  onOpenAuth,
}) => {
  const {
    decision: canonicalDecision,
    isLoading: isDecisionLoading,
    dataHealthStatus,
    localUpdatedAt,
    isStale,
    isDisconnected,
    refreshDecision,
  } = useCanonical15mDecision();

  const [liveTicker, setLiveTicker] = useState<BTCTicker | null>(ticker || null);
  const [chartCandles, setChartCandles] = useState<Candle[]>(initialCandles || []);
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'15M' | '1H'>('15M');
  const [selectedVenue, setSelectedVenue] = useState<string>('Kalshi');
  const [chartMode, setChartMode] = useState<'CANDLE' | 'RIBBON'>('CANDLE');
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const evidenceSummary = useMemo(() => computeEvidenceVectors(canonicalDecision), [canonicalDecision]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(true);
  const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);
  const [showLockQualityTooltip, setShowLockQualityTooltip] = useState<boolean>(false);
  const [showWhyNotModal, setShowWhyNotModal] = useState<boolean>(false);
  const [showMarketRegimeModal, setShowMarketRegimeModal] = useState<boolean>(false);

  // Motion & Dynamic State Trackers
  const prevSpotPriceRef = useRef<number>(64591.20);
  const [priceFlash, setPriceFlash] = useState<'UP' | 'DOWN' | 'NONE'>('NONE');
  const [priceTickDelta, setPriceTickDelta] = useState<string | null>(null);
  const [lockBeamActive, setLockBeamActive] = useState<boolean>(false);

  // Dynamic Confidence & Reversal Risk from canonical engine
  const [displayConfidence, setDisplayConfidence] = useState<number>(78);
  const [displayReversalRisk, setDisplayReversalRisk] = useState<number>(28);

  // Synchronize state with real-time canonicalDecision from backend
  useEffect(() => {
    if (canonicalDecision) {
      if (typeof canonicalDecision.confidence === 'number' && canonicalDecision.confidence > 0) {
        setDisplayConfidence(canonicalDecision.confidence);
      }
      if (typeof canonicalDecision.reversalRisk === 'number') {
        setDisplayReversalRisk(canonicalDecision.reversalRisk);
      }
    }
  }, [canonicalDecision]);

  // Poll live ticker for the currently selectedAsset (BTC, ETH, SOL, etc.)
  useEffect(() => {
    let isMounted = true;
    const updateTicker = async () => {
      try {
        const t = await fetchCryptoTicker(selectedAsset);
        if (!isMounted) return;
        if (t && typeof t.price === 'number' && !isNaN(t.price)) {
          const newPrice = t.price;
          const oldPrice = prevSpotPriceRef.current;
          if (newPrice !== oldPrice && oldPrice > 0) {
            const diff = newPrice - oldPrice;
            setPriceFlash(diff >= 0 ? 'UP' : 'DOWN');
            const precision = selectedAsset === 'XRP' || selectedAsset === 'DOGE' ? 4 : 2;
            setPriceTickDelta(`${diff >= 0 ? '+' : ''}$${Math.abs(diff).toFixed(precision)}`);
            prevSpotPriceRef.current = newPrice;

            setTimeout(() => {
              if (isMounted) {
                setPriceFlash('NONE');
                setPriceTickDelta(null);
              }
            }, 700);
          } else {
            prevSpotPriceRef.current = newPrice;
          }
          setLiveTicker(t);
        }
      } catch (e) {
        // ignore
      }
    };
    updateTicker();
    const interval = setInterval(updateTicker, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedAsset]);

  // Fetch candles when asset or timeframe changes
  useEffect(() => {
    const loadCandles = async () => {
      try {
        const fetched = await fetchCryptoKlines(selectedAsset, selectedTimeframe.toLowerCase());
        if (fetched && fetched.length > 0) {
          setChartCandles(fetched);
        }
      } catch (e) {
        // ignore
      }
    };
    loadCandles();
  }, [selectedAsset, selectedTimeframe]);

  // Isolated timestamp-synchronized Clock Update
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute 15-Minute Cycle Countdown from authoritative timestamps
  const cycleSecondsRemaining = useMemo(() => {
    return calculateCycleSecondsRemaining(900, canonicalDecision?.cycleEnd, nowMs);
  }, [canonicalDecision?.cycleEnd, nowMs]);

  const countdownFormatted = useMemo(() => {
    return formatCountdownMmSs(cycleSecondsRemaining);
  }, [cycleSecondsRemaining]);

  const cycleProgressPct = useMemo(() => {
    const elapsed = Math.max(0, 900 - cycleSecondsRemaining);
    return Math.min(100, Math.max(0, (elapsed / 900) * 100));
  }, [cycleSecondsRemaining]);

  // Spot Price & Direction Calculations for active selected asset
  const spotPrice = liveTicker?.price || (canonicalDecision as any)?.spotPrice || (selectedAsset === 'ETH' ? 3480 : selectedAsset === 'SOL' ? 185 : 64591.20);
  const spotChange = liveTicker?.change24h || 1.85;

  // Ask / Target Strike Reference Price for the selected crypto
  const targetPrice = useMemo(() => {
    if (selectedAsset === 'BTC' && canonicalDecision?.openStrike && canonicalDecision.openStrike > 0) {
      return canonicalDecision.openStrike;
    }
    if (chartCandles && chartCandles.length > 0) {
      const currentCandle = chartCandles[chartCandles.length - 1];
      if (currentCandle && typeof currentCandle.open === 'number' && currentCandle.open > 0) {
        return currentCandle.open;
      }
      const firstCandle = chartCandles[0];
      if (firstCandle && typeof firstCandle.open === 'number' && firstCandle.open > 0) {
        return firstCandle.open;
      }
    }
    if (spotChange !== 0 && spotPrice > 0) {
      return spotPrice / (1 + spotChange / 100);
    }
    return spotPrice;
  }, [selectedAsset, canonicalDecision?.openStrike, chartCandles, spotPrice, spotChange]);

  // Active state: above target line = GREEN (UP), below target line = RED (DOWN)
  const isAboveTarget = useMemo(() => {
    return spotPrice >= targetPrice;
  }, [spotPrice, targetPrice]);

  // Dynamic Real Live Sparkline Vector Computation for the selected crypto
  const sparklineData = useMemo(() => {
    // Extract recent close prices from candles
    const recentCandles = chartCandles.slice(-16);
    const prices: number[] = recentCandles
      .map((c) => Number(c.close))
      .filter((p) => typeof p === 'number' && !isNaN(p) && isFinite(p) && p > 0);

    // Append latest live spot price as real-time terminal tick
    if (typeof spotPrice === 'number' && !isNaN(spotPrice) && isFinite(spotPrice) && spotPrice > 0) {
      if (prices.length === 0 || prices[prices.length - 1] !== spotPrice) {
        prices.push(spotPrice);
      }
    }

    const svgWidth = 64;
    const svgHeight = 24;
    const paddingX = 2;
    const usableWidth = svgWidth - paddingX * 2; // 60
    const paddingY = 3;
    const usableHeight = svgHeight - paddingY * 2; // 18

    // Safe fallback if data is still hydrating
    if (prices.length < 2) {
      const isUpFallback = spotChange >= 0;
      return {
        points: prices,
        pathD: isUpFallback ? "M 2 18 Q 18 16 30 8 T 62 4" : "M 2 6 Q 18 10 30 16 T 62 20",
        areaD: isUpFallback ? "M 2 18 Q 18 16 30 8 T 62 4 L 62 24 L 2 24 Z" : "M 2 6 Q 18 10 30 16 T 62 20 L 62 24 L 2 24 Z",
        lastX: 62,
        lastY: isUpFallback ? 4 : 20,
        targetY: 12,
        isAboveTarget: isUpFallback,
        targetPrice,
      };
    }

    const allValues = [...prices, targetPrice].filter(
      (v) => typeof v === 'number' && !isNaN(v) && isFinite(v)
    );
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const rawRange = maxVal - minVal;
    const range = rawRange > 0 ? rawRange : (spotPrice * 0.002 || 1);

    // Generous vertical padding (12%) so curve never clips against borders
    const paddedMin = minVal - range * 0.12;
    const paddedMax = maxVal + range * 0.12;
    const paddedRange = paddedMax - paddedMin || 1;

    const coords = prices.map((price, i) => {
      const x = paddingX + (i / Math.max(1, prices.length - 1)) * usableWidth;
      const normalizedY = (price - paddedMin) / paddedRange;
      const y = (svgHeight - paddingY) - normalizedY * usableHeight;
      return {
        x: Math.max(paddingX, Math.min(svgWidth - paddingX, Number(x.toFixed(2)))),
        y: Math.max(paddingY, Math.min(svgHeight - paddingY, Number(y.toFixed(2)))),
      };
    });

    // Smooth bezier curve path
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      pathD += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Shaded area under sparkline
    const lastCoord = coords[coords.length - 1];
    const firstCoord = coords[0];
    const areaD = `${pathD} L ${lastCoord.x} ${svgHeight} L ${firstCoord.x} ${svgHeight} Z`;

    // Target / Ask reference line horizontal coordinate
    const normalizedTarget = (targetPrice - paddedMin) / paddedRange;
    const targetY = Math.max(
      paddingY,
      Math.min(svgHeight - paddingY, Number(((svgHeight - paddingY) - normalizedTarget * usableHeight).toFixed(2)))
    );

    return {
      points: prices,
      pathD,
      areaD,
      lastX: lastCoord.x,
      lastY: lastCoord.y,
      targetY,
      isAboveTarget: spotPrice >= targetPrice,
      targetPrice,
    };
  }, [chartCandles, spotPrice, targetPrice, spotChange]);

  const rawDirection = (canonicalDecision as any)?.direction || 'UP';
  const isUp = rawDirection === 'YES' || rawDirection === 'UP';
  const isDown = rawDirection === 'NO' || rawDirection === 'DOWN';
  const isSkip = rawDirection === 'SKIP' || rawDirection === 'NEUTRAL';

  const biasLabel = isSkip ? 'SKIP' : isUp ? 'UP' : 'DOWN';
  const rawLockScore = (canonicalDecision as any)?.lockScore ?? (canonicalDecision as any)?.lockEvaluation?.lockScore ?? 87;
  const lockQualityScore = rawLockScore <= 10 ? Math.round(rawLockScore * 10) : Math.round(rawLockScore);

  // Derive Canonical Cycle Presentation State
  const isActuallyLocked = useMemo(() => {
    const st = canonicalDecision?.currentState;
    // A skipped cycle is never locked, whatever isLocked says -- otherwise the
    // card paints the committed UP/DOWN aura over a cycle the engine declined.
    if (st === 'SKIP') return false;
    return st === 'LOCKED_UP' || st === 'LOCKED_DOWN' || Boolean((canonicalDecision as any)?.isLocked);
  }, [canonicalDecision?.currentState, (canonicalDecision as any)?.isLocked]);

  const isEarlyLockQualified = useMemo(() => {
    return (
      displayConfidence >= 75 &&
      lockQualityScore >= 78 &&
      displayReversalRisk <= 25
    );
  }, [displayConfidence, lockQualityScore, displayReversalRisk]);

  // Maps the engine's real lifecycle stage onto this card's existing display
  // vocabulary. Same progression the card always showed, now driven by the
  // engine instead of a countdown.
  const ENGINE_STAGE_TO_CYCLE_STATE: Record<string, CycleState> = {
    OBSERVING: 'ANALYZING',
    CALIBRATING: 'ANALYZING',
    ANALYZING: 'BUILDING',
    QUALIFYING: 'CONFIRMING',
    LOCKING: 'CONFIRMING',
    LOCKED: 'LOCKED',
    NO_TRADE: 'SKIP',
    HYDRATING: 'HYDRATING',
  };

  const computedCycleState = useMemo<CycleState>(() => {
    const st = canonicalDecision?.currentState;
    // No authoritative decision -> say so. Checked first so it can never be
    // overridden by a stale isLocked or a countdown-derived guess below.
    if (st === 'HYDRATING') return 'HYDRATING';
    if (st === 'SETTLED') return 'SETTLED';
    // SKIP is checked before isLocked. The engine never sets both, but if a
    // payload ever carried a stale isLocked alongside a skipped cycle, showing
    // LOCKED would invent a committed trade the engine explicitly declined.
    if (st === 'SKIP') return 'SKIP';
    if (st === 'LOCKED_UP' || st === 'LOCKED_DOWN' || (canonicalDecision as any)?.isLocked) return 'LOCKED';
    if (st === 'PROTECTED') return 'PROTECTED';
    if (st === 'CONFIRMING') return 'CONFIRMING';

    // Pre-lock the canonical state is 'WATCH' for the entire engine lifecycle.
    // engineStage carries the real stage. This previously read the countdown
    // and announced CONFIRMING -- "completing final multi-venue stability
    // checks" -- for any cycle past 6:00, even when the engine was merely
    // QUALIFYING with its lock gate still refusing.
    const stage = (canonicalDecision as any)?.engineStage as string | undefined;
    if (stage && ENGINE_STAGE_TO_CYCLE_STATE[stage]) {
      return ENGINE_STAGE_TO_CYCLE_STATE[stage];
    }

    // No recognised stage. This previously read the countdown and announced
    // CONFIRMING -- "completing final multi-venue stability checks" -- for any
    // cycle past 6:00, regardless of what the engine was actually doing. A
    // clock cannot know the decision, so report HYDRATING instead of inventing.
    return 'HYDRATING';
  }, [canonicalDecision?.currentState, (canonicalDecision as any)?.isLocked, (canonicalDecision as any)?.engineStage, canonicalDecision?.timeRemainingSec, nowMs]);

  // Aura Style Configuration — Authentically VIXY Vault with subtle ambient glow and edge lighting
  const auraBorderClass = useMemo(() => {
    if (isActuallyLocked) {
      return isUp
        ? 'border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] ring-1 ring-emerald-500/30'
        : 'border-rose-500/80 shadow-[0_0_35px_rgba(244,63,94,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] ring-1 ring-rose-500/30';
    }
    if (isUp) {
      return 'border-purple-500/60 shadow-[0_0_30px_rgba(168,85,247,0.22),inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-purple-500/20';
    }
    if (isDown) {
      return 'border-purple-500/60 shadow-[0_0_30px_rgba(244,63,94,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-purple-500/20';
    }
    return 'border-purple-500/40 shadow-[0_0_25px_rgba(139,92,246,0.15),inset_0_1px_1px_rgba(255,255,255,0.08)]';
  }, [isActuallyLocked, isUp, isDown]);

  const auraGlowColor = useMemo(() => {
    if (isActuallyLocked) {
      return isUp ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.16)';
    }
    if (isUp) return 'rgba(168, 85, 247, 0.12)';
    if (isDown) return 'rgba(244, 63, 94, 0.1)';
    return 'rgba(139, 92, 246, 0.08)';
  }, [isActuallyLocked, isUp, isDown]);

  // Contextual Dynamic Explanation Text
  const dynamicContextExplanation = useMemo(() => {
    switch (computedCycleState) {
      case 'ANALYZING':
        return 'VIXY is evaluating momentum, trend continuity, and cross-venue order flow before forming a hypothesis.';
      case 'BUILDING':
        return 'VIXY is seeing increasing agreement across live market evidence and directional order flow.';
      case 'CONFIRMING':
        return 'VIXY has a directional hypothesis and is completing its final multi-venue stability checks.';
      case 'LOCKED':
        return `VIXY has committed to 15M ${isUp ? 'UP' : 'DOWN'}. Autonomous protection is actively monitoring for reversal risk.`;
      case 'PROTECTED':
        return 'Autonomous capital preservation shield engaged. Volatility defense active.';
      case 'SETTLED':
        return '15-Minute cycle finalized and verified against benchmark settlement index.';
      case 'SKIP':
        return 'Evidence did not reach the required confidence threshold. VIXY is protecting capital.';
      case 'HYDRATING':
        return 'Waiting for the authoritative decision for this cycle. VIXY will not display a direction it has not committed to.';
      default:
        return 'VIXY quantitative intelligence engine is monitoring 15-minute cycle structures in real time.';
    }
  }, [computedCycleState, isUp]);

  // Manual Refresh Trigger
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDecision();
    } catch (e) {
      // ignore
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Dynamic Real-Time Market Regime Assessment
  const marketRegimeAssessment: MarketRegimeAssessment = useMemo(() => {
    return calculateMarketRegime(
      chartCandles,
      spotPrice,
      spotChange,
      displayReversalRisk,
      displayConfidence,
      canonicalDecision?.direction || (isUp ? 'UP' : isDown ? 'DOWN' : 'SKIP')
    );
  }, [chartCandles, spotPrice, spotChange, displayReversalRisk, displayConfidence, canonicalDecision?.direction, isUp, isDown]);

  // Recent 15M Cycle Settlement Strip
  const recentCycles = useMemo(() => [
    { id: '#48291', dir: 'UP', conf: displayConfidence, price: `$${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, status: 'ACTIVE', pnl: '+2.4%' },
    { id: '#48290', dir: 'UP', conf: 75, price: '$64,480.10', status: 'WIN', pnl: '+1.8%' },
    { id: '#48289', dir: 'DOWN', conf: 82, price: '$64,210.00', status: 'WIN', pnl: '+2.1%' },
    { id: '#48288', dir: 'UP', conf: 72, price: '$64,100.50', status: 'WIN', pnl: '+1.5%' },
    { id: '#48287', dir: 'SKIP', conf: 52, price: '$63,980.00', status: 'SKIPPED', pnl: '0.0%' },
  ], [displayConfidence, spotPrice]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full space-y-6 font-mono text-slate-200 select-none pb-12"
    >
      
      {/* 1. TOP HEADER & TITLE BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-purple-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 border border-purple-400/40">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
                CRYPTO PREDICTION CENTER
              </h1>
              <span className="px-2 py-0.5 rounded-lg bg-purple-950/90 text-purple-300 border border-purple-800/50 text-[10px] font-bold tracking-wider">
                QUANTITATIVE COMMAND
              </span>
            </div>
            <p className="text-xs text-purple-300/70 font-sans">
              AI Quantitative Intelligence • Real-Time Order Flow • Cross-Venue Execution
            </p>
          </div>
        </div>

        {/* Global Motion Controls & Interactive Testing Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto">
          
          {/* Market State Indicator (Requirement 13) */}
          <button
            onClick={() => setShowMarketRegimeModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold font-sans cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${marketRegimeAssessment.badgeClass}`}
            title="Click to inspect real-time Market Regime telemetry"
          >
            <Activity className="w-3.5 h-3.5" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] opacity-75 font-mono">REGIME:</span>
              <span className="font-black tracking-wide">{marketRegimeAssessment.label}</span>
            </div>
            <span className="text-[9px] font-mono px-1 rounded bg-black/30 border border-white/10">
              {marketRegimeAssessment.confidence}%
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              audioMuted
                ? 'bg-[#0d0722] border-purple-800/40 text-purple-400/60 hover:text-purple-300'
                : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400 shadow-md'
            }`}
            title={audioMuted ? "Audio muted" : "Institutional Chime Active"}
          >
            {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Asset Switcher Pills */}
          <div className="flex items-center p-1 rounded-xl bg-[#0d0722] border border-purple-800/40">
            {['BTC', 'ETH', 'SOL'].map((sym) => (
              <button
                key={sym}
                onClick={() => setSelectedAsset(sym)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedAsset === sym
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                {sym}/USDT
              </button>
            ))}
          </div>

          {/* Manual Refresh */}
          <button
            onClick={handleManualRefresh}
            className={`p-2 rounded-xl bg-[#0d0722] border border-purple-800/40 text-purple-300 hover:text-white transition-all cursor-pointer ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Refresh Canonical Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1.5 SUBTLE DATA HEALTH SYSTEM BAR (Requirement 14) */}
      <div className="px-4 py-2.5 rounded-2xl bg-[#0a0518]/90 border border-purple-900/50 shadow-sm flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-purple-300/80">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <span className="text-purple-400/60 font-sans font-bold">SYSTEM</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-purple-400/60 font-sans font-bold">MARKET FEED</span>
            <span className={`flex items-center gap-1 font-bold ${dataHealthStatus === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dataHealthStatus === 'LIVE' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-amber-400'}`} /> {dataHealthStatus === 'LIVE' ? 'LIVE' : dataHealthStatus}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-purple-400/60 font-sans font-bold">VENUES</span>
            <span className="text-cyan-300 font-bold">4 / 4 SYNCED</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-purple-400/60 font-sans font-bold">VIXY ENGINE</span>
            <span className="text-purple-200 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" /> ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-1.5 hidden md:flex">
            <span className="text-purple-400/60 font-sans font-bold">TELEMETRY</span>
            <span className="text-emerald-400 font-bold">RECORDING</span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto text-[10px]">
          <div className="flex items-center gap-1 text-purple-300">
            <span className="text-purple-400/60 font-sans">LATENCY:</span>
            <span className="text-emerald-400 font-bold">0.8s</span>
          </div>

          {computedCycleState === 'SKIP' && (
            <button
              onClick={() => setShowWhyNotModal(true)}
              className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-sans text-[10px] hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              Why did VIXY Skip?
            </button>
          )}
        </div>
      </div>

      {/* 2. PRIMARY QUESTION HERO BOX: "WHAT IS VIXY THINKING?" — VIXY VAULT THEMED */}
      <motion.div
        style={{
          background: `radial-gradient(circle at 50% 0%, ${auraGlowColor} 0%, rgba(13, 6, 30, 0.98) 45%, rgba(6, 2, 16, 0.99) 100%)`,
        }}
        className={`p-4 sm:p-6 lg:p-7 rounded-3xl bg-[#080315] border-2 relative overflow-hidden space-y-4 sm:space-y-5 transition-all duration-700 backdrop-blur-2xl ${auraBorderClass}`}
      >
        {/* Top Ambient Glow Cone & Radial Beam */}
        <div className="absolute top-0 left-1/4 right-1/4 h-32 bg-gradient-to-b from-purple-500/20 via-cyan-500/5 to-transparent blur-2xl pointer-events-none -z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.07] pointer-events-none" />

        {/* Subtle Horizontal Laser Border Sweep on Lock Confirmation */}
        <AnimatePresence>
          {lockBeamActive && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent z-20 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Top Header: Identity, Live Countdown & Dynamic Lifecycle State */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 relative z-10 border-b border-purple-800/40 pb-3.5 sm:pb-4">
          
          {/* Left: 15-Minute Cycle Header + LIVE Pill */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-950/90 to-[#160a35] border border-purple-700/60 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider font-sans">
                15-MINUTE CYCLE
              </span>
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-black ${dataHealthStatus === 'LIVE' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'bg-amber-500/15 border-amber-500/40 text-amber-300'}`}>
              <span className={`w-2 h-2 rounded-full ${
                dataHealthStatus === 'LIVE' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]'
              }`} />
              <span>{dataHealthStatus === 'LIVE' ? 'LIVE' : dataHealthStatus}</span>
            </div>
          </div>

          {/* Center / Right: Time Remaining & Dynamic State Pill */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            
            {/* Cycle Expiration Countdown Clock */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#12072e] to-[#0d0522] border border-purple-700/60 text-xs whitespace-nowrap shadow-inner font-mono">
              <Clock className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-purple-300 font-bold">CYCLE EXPIRES:</span>
              <motion.span
                key={countdownFormatted}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="text-emerald-400 font-black text-sm tracking-wider tabular-nums font-mono shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              >
                {countdownFormatted}
              </motion.span>
              <span className="text-[10px] text-purple-400/90 font-bold">REMAINING</span>
            </div>

            {/* STATE BADGE TRANSITION: Clean Institutional Vault Language */}
            <AnimatePresence mode="wait">
              {computedCycleState === 'ANALYZING' && (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-950/90 border border-purple-500/60 text-xs font-black text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)] whitespace-nowrap"
                >
                  <Activity className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  <span>VIXY IS ANALYZING...</span>
                </motion.div>
              )}

              {computedCycleState === 'BUILDING' && (
                <motion.div
                  key="building"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-950/90 border border-cyan-500/60 text-xs font-black text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)] whitespace-nowrap"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>BUILDING CONVICTION...</span>
                </motion.div>
              )}

              {computedCycleState === 'CONFIRMING' && (
                <motion.div
                  key="confirming"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/90 border border-amber-500/60 text-xs font-black text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)] whitespace-nowrap"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>CONFIRMING BIAS...</span>
                </motion.div>
              )}

              {computedCycleState === 'LOCKED' && (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-black whitespace-nowrap ${
                    isUp
                      ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/40'
                      : 'bg-rose-950/95 border-rose-400 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/40'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>VIXY LOCKED — {isUp ? 'UP' : 'DOWN'}</span>
                </motion.div>
              )}

              {computedCycleState === 'PROTECTED' && (
                <motion.div
                  key="protected"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-xs font-black text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] whitespace-nowrap"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PROTECTION ACTIVE</span>
                </motion.div>
              )}

              {computedCycleState === 'SKIP' && (
                <motion.div
                  key="skip"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-950/90 border border-purple-600/60 text-xs font-black text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)] whitespace-nowrap"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                  <span>VIXY SKIP — CAPITAL PROTECTED</span>
                </motion.div>
              )}

              {computedCycleState === 'SETTLED' && (
                <motion.div
                  key="settled"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-950/90 border border-purple-600/60 text-xs font-black text-purple-300 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>15M CYCLE SETTLED</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Big Bold 4-Card Quantitative Grid — VIXY Vault Obsidian Surfaces with Atmospheric Edge-Lighting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-stretch relative z-10">
          
          {/* Card 1: Dominant VIXY Directional Bias (Hero Metric) */}
          <div
            style={{
              background: isUp
                ? 'radial-gradient(ellipse at 85% 15%, rgba(16, 185, 129, 0.13) 0%, rgba(20, 8, 44, 0.95) 45%, rgba(6, 3, 18, 0.98) 100%)'
                : isDown
                ? 'radial-gradient(ellipse at 85% 15%, rgba(244, 63, 94, 0.13) 0%, rgba(20, 8, 44, 0.95) 45%, rgba(6, 3, 18, 0.98) 100%)'
                : 'radial-gradient(ellipse at 85% 15%, rgba(168, 85, 247, 0.12) 0%, rgba(20, 8, 44, 0.95) 45%, rgba(6, 3, 18, 0.98) 100%)',
            }}
            className="p-3.5 sm:p-4 rounded-2xl border border-purple-700/50 hover:border-purple-500/70 shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_20px_rgba(147,51,234,0.05)] relative overflow-hidden flex flex-col justify-between transition-all duration-300 min-w-0 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-purple-400/40 before:to-transparent before:pointer-events-none"
          >
            {/* Subtle matrix dots background */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:14px_14px]" />
            
            <div className="space-y-2.5 relative z-10">
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>VIXY BIAS</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isEarlyLockQualified && !isActuallyLocked && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse whitespace-nowrap">
                      ⚡ EARLY LOCK READY
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase whitespace-nowrap ${
                    isUp ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : isDown ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  }`}>
                    15M CORE
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isUp ? (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)] shrink-0">
                      <ArrowUpRight className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                  ) : isDown ? (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.25)] shrink-0">
                      <ArrowDownRight className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)] shrink-0">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className={`text-lg sm:text-xl font-black font-sans leading-none tracking-tight whitespace-nowrap ${
                      isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-purple-300'
                    }`}>
                      {biasLabel}
                    </div>
                    
                    <div className="text-[10px] font-bold mt-1 text-slate-300 flex items-center gap-1 whitespace-nowrap">
                      <span className={`font-mono font-black ${isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-purple-300'}`}>
                        {displayConfidence}%
                      </span>
                      <span className="text-purple-300/70 font-sans text-[9px] uppercase tracking-wider">CONVICTION</span>
                    </div>
                  </div>
                </div>

                {/* Circular Gauge Score */}
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-purple-950/90"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <motion.path
                      className={isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-purple-400'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      initial={{ strokeDasharray: '0, 100' }}
                      animate={{ strokeDasharray: `${displayConfidence}, 100` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute font-black text-white font-mono text-[10px] text-center">
                    {displayConfidence}%
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Alignment Tag */}
            <div className="mt-3 pt-2 border-t border-purple-900/30 flex items-center justify-between text-[10px] relative z-10">
              <div className="flex items-center gap-1.5 text-purple-300/80 font-bold whitespace-nowrap">
                <Activity className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[9px] sm:text-[10px]">MARKET ALIGNMENT</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold font-mono text-[9px] tracking-wide uppercase whitespace-nowrap shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                STRONG
              </span>
            </div>
          </div>

          {/* Card 2: Current Spot Price (Live Ticker & Sparkline) */}
          <motion.div
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(147, 51, 234, 0.12) 0%, rgba(20, 8, 44, 0.95) 45%, rgba(6, 3, 18, 0.98) 100%)',
            }}
            animate={{
              borderColor: priceFlash === 'UP'
                ? 'rgba(16, 185, 129, 0.65)'
                : priceFlash === 'DOWN'
                ? 'rgba(244, 63, 94, 0.65)'
                : 'rgba(126, 34, 206, 0.5)',
            }}
            transition={{ duration: 0.3 }}
            className="p-3.5 sm:p-4 rounded-2xl border border-purple-700/50 hover:border-purple-500/70 shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_20px_rgba(147,51,234,0.05)] relative overflow-hidden flex flex-col justify-between transition-all duration-300 min-w-0 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-purple-400/40 before:to-transparent before:pointer-events-none"
          >
            <div className="space-y-2 relative z-10">
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                <span className="whitespace-nowrap">PRICE ({selectedAsset}/USDT)</span>
                
                {/* Floating Tick Delta Pill */}
                <AnimatePresence>
                  {priceTickDelta && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={`px-1.5 py-0.5 rounded font-mono font-black text-[9px] whitespace-nowrap shrink-0 ${
                        priceFlash === 'UP' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {priceTickDelta}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight leading-none whitespace-nowrap">
                ${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <div className="flex items-center justify-between gap-1 pt-0.5">
                <span className={`px-1.5 py-0.5 rounded-md flex items-center gap-0.5 font-black text-[10px] font-mono whitespace-nowrap shrink-0 ${
                  spotChange >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}>
                  <span>{spotChange >= 0 ? '+' : ''}{spotChange.toFixed(2)}%</span>
                  {spotChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                </span>
                
                <div className="text-[9px] text-purple-300/70 font-sans flex items-center gap-1 leading-tight whitespace-nowrap shrink-0">
                  <span>• BINANCE</span>
                  <span className="flex items-center gap-0.5 text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> FEED
                  </span>
                </div>

                {/* Mini Live Vector Sparkline */}
                <div 
                  className="w-12 sm:w-14 h-5 sm:h-6 shrink-0 relative"
                  title={`Live ${selectedAsset} Trend | Price: $${spotPrice.toFixed(2)} | Target: $${targetPrice.toFixed(2)} (${sparklineData.isAboveTarget ? 'ABOVE TARGET / UP' : 'BELOW TARGET / DOWN'})`}
                >
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 64 24" fill="none">
                    <defs>
                      <linearGradient id={`spark-green-grad-${selectedAsset}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id={`spark-red-grad-${selectedAsset}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Ask / Target Reference Dashed Baseline */}
                    <line
                      x1="2"
                      y1={sparklineData.targetY}
                      x2="62"
                      y2={sparklineData.targetY}
                      stroke="rgba(192, 132, 252, 0.45)"
                      strokeDasharray="2,2"
                      strokeWidth="0.75"
                    />

                    {/* Shaded Area Under Curve */}
                    {sparklineData.areaD && (
                      <path
                        d={sparklineData.areaD}
                        fill={sparklineData.isAboveTarget ? `url(#spark-green-grad-${selectedAsset})` : `url(#spark-red-grad-${selectedAsset})`}
                      />
                    )}

                    {/* Dynamic Real Crypto Price Line (Green if above target, Red if below target) */}
                    <path
                      d={sparklineData.pathD}
                      stroke={sparklineData.isAboveTarget ? "#10b981" : "#f43f5e"}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />

                    {/* Pulsing Live Endpoint Beacon */}
                    <circle
                      cx={sparklineData.lastX}
                      cy={sparklineData.lastY}
                      r="2.2"
                      fill={sparklineData.isAboveTarget ? "#10b981" : "#f43f5e"}
                    />
                    <circle
                      cx={sparklineData.lastX}
                      cy={sparklineData.lastY}
                      r="4"
                      fill="none"
                      stroke={sparklineData.isAboveTarget ? "#10b981" : "#f43f5e"}
                      strokeWidth="1"
                      className="animate-ping opacity-60"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bottom 24H Range Strip */}
            <div className="mt-3 pt-2 border-t border-purple-900/30 grid grid-cols-2 gap-2 text-[10px] font-mono relative z-10">
              <div className="min-w-0">
                <span className="text-purple-400/80 block text-[9px] whitespace-nowrap">24H HIGH</span>
                <span className="font-bold text-white text-[10px] whitespace-nowrap block">
                  ${(spotPrice * 1.018).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-l border-purple-900/40 pl-2 min-w-0">
                <span className="text-purple-400/80 block text-[9px] whitespace-nowrap">24H LOW</span>
                <span className="font-bold text-white text-[10px] whitespace-nowrap block">
                  ${(spotPrice * 0.982).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Lock Quality (Distinct from Conviction) */}
          <div
            style={{
              background: 'radial-gradient(ellipse at 85% 15%, rgba(16, 185, 129, 0.11) 0%, rgba(20, 8, 44, 0.95) 45%, rgba(6, 3, 18, 0.98) 100%)',
            }}
            className="p-3.5 sm:p-4 rounded-2xl border border-purple-700/50 hover:border-purple-500/70 shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_20px_rgba(16,185,129,0.04)] relative flex flex-col justify-between transition-all duration-300 min-w-0 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-400/35 before:to-transparent before:pointer-events-none"
          >
            <div className="space-y-2 relative z-10">
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider gap-1">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Lock className={`w-3 h-3 ${!isActuallyLocked ? 'text-purple-400 animate-pulse' : 'text-emerald-400'}`} />
                  <span>LOCK QUALITY</span>
                  <button
                    onClick={() => setShowLockQualityTooltip(!showLockQualityTooltip)}
                    className="text-purple-400 hover:text-purple-200 transition-colors cursor-pointer"
                    title="What is Lock Quality?"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-emerald-400 font-black font-mono text-[11px] whitespace-nowrap shrink-0">{lockQualityScore} / 100</span>
              </div>

              <div className="text-base sm:text-lg font-black text-white font-sans tracking-tight leading-tight">
                {lockQualityScore >= 80 ? 'OPTIMAL LOCK' : lockQualityScore >= 70 ? 'QUALIFIED LOCK' : lockQualityScore >= 50 ? 'STRONG EVIDENCE' : 'BUILDING EVIDENCE'}
              </div>

              {/* High Precision Gradient Progress Bar */}
              <div className="w-full h-2 rounded-full bg-[#180d38] overflow-hidden border border-purple-800/40 p-0.5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(100, Math.max(0, lockQualityScore))}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Lock Quality Explanation Tooltip Popover */}
            <AnimatePresence>
              {showLockQualityTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute bottom-full left-2 right-2 mb-2 p-3.5 rounded-2xl bg-[#160b36] border border-purple-500/60 shadow-2xl text-[11px] text-purple-200 z-30 font-sans backdrop-blur-xl"
                >
                  <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Lock Quality vs Conviction</span>
                  </div>
                  <p className="leading-snug text-purple-200/90">
                    Lock Quality measures structural strength and cross-venue agreement supporting a potential 15-minute lock. It is independent of directional conviction.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Requirement Details */}
            <div className="mt-3 pt-2 border-t border-purple-900/30 flex items-center justify-between text-[9px] font-sans relative z-10 gap-1">
              <span className="text-purple-200/90 font-medium whitespace-nowrap">Cross-venue evidence</span>
              <span className="text-purple-400/90 font-mono text-[9px] whitespace-nowrap shrink-0">
                {lockQualityScore >= 78 ? '⚡ Ready (≥78)' : lockQualityScore >= 70 ? 'Qualified (≥70)' : 'Req. 70+ to lock'}
              </span>
            </div>
          </div>

          {/* Card 4: Reversal Risk & Protection Status */}
          {(() => {
            const riskAssessment = getReversalRiskAssessment(displayReversalRisk);
            const riskGlow = riskAssessment.tier === 'LOW'
              ? 'rgba(16, 185, 129, 0.1)'
              : riskAssessment.tier === 'MODERATE'
              ? 'rgba(245, 158, 11, 0.1)'
              : 'rgba(244, 63, 94, 0.12)';
            
            return (
              <div
                style={{
                  background: `radial-gradient(ellipse at 85% 15%, ${riskGlow} 0%, rgba(20, 8, 44, 0.95) 45%, rgba(6, 3, 18, 0.98) 100%)`,
                }}
                className="p-3.5 sm:p-4 rounded-2xl border border-purple-700/50 hover:border-purple-500/70 shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.09)] relative flex flex-col justify-between transition-all duration-300 min-w-0 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-purple-400/35 before:to-transparent before:pointer-events-none"
              >
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider gap-1">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      <span>REVERSAL RISK</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded font-extrabold text-[9px] tracking-wider uppercase whitespace-nowrap shrink-0 ${riskAssessment.badgeClass}`}>
                      {riskAssessment.shortLabel}
                    </span>
                  </div>

                  <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none ${riskAssessment.colorClass}`}>
                    {riskAssessment.score}%
                  </div>

                  <div className="text-[10px] font-bold flex items-center gap-1.5 whitespace-nowrap">
                    {isActuallyLocked ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300">VIXY Protection Active</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-purple-300/80">Guardian Standby</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Segmented Risk Slider (LOW / MODERATE / HIGH) */}
                <div className="mt-3 pt-2 border-t border-purple-900/30 space-y-1 relative z-10">
                  <div className="grid grid-cols-3 gap-1.5 h-1.5 rounded-full overflow-hidden bg-[#180d38] p-0.5 border border-purple-800/40">
                    <div className={`h-full rounded-full transition-all ${
                      riskAssessment.tier === 'LOW' ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-emerald-950/40'
                    }`} />
                    <div className={`h-full rounded-full transition-all ${
                      riskAssessment.tier === 'MODERATE' ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-amber-950/40'
                    }`} />
                    <div className={`h-full rounded-full transition-all ${
                      riskAssessment.tier === 'HIGH' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-rose-950/40'
                    }`} />
                  </div>
                  
                  <div className="flex items-center justify-between text-[8px] font-bold text-purple-400/80 font-mono uppercase px-0.5">
                    <span className={riskAssessment.tier === 'LOW' ? 'text-emerald-400 font-black' : ''}>LOW</span>
                    <span className={riskAssessment.tier === 'MODERATE' ? 'text-amber-400 font-black' : ''}>MODERATE</span>
                    <span className={riskAssessment.tier === 'HIGH' ? 'text-rose-400 font-black' : ''}>HIGH</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 3. CONTEXTUAL INTELLIGENCE STRIP: "WHAT IS HAPPENING?" */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#14082c]/95 via-[#0e0622]/95 to-[#070314] border border-purple-700/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_18px_rgba(168,85,247,0.05)] relative z-10 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-purple-400/35 before:to-transparent before:pointer-events-none">
          <div className="flex items-center gap-3 text-purple-200 font-sans flex-1 min-w-[260px]">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
              <BrainCircuit className="w-4 h-4 text-purple-300" />
            </div>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-black text-white font-sans uppercase tracking-wider text-xs whitespace-nowrap">
                {computedCycleState === 'ANALYZING' && 'VIXY IS ANALYZING'}
                {computedCycleState === 'BUILDING' && 'BUILDING CONVICTION'}
                {computedCycleState === 'CONFIRMING' && 'CONFIRMING BIAS'}
                {computedCycleState === 'LOCKED' && `VIXY LOCKED — ${isUp ? 'UP' : 'DOWN'}`}
                {computedCycleState === 'PROTECTED' && 'PROTECTION ACTIVE'}
                {computedCycleState === 'SKIP' && 'VIXY SKIP — CAPITAL PROTECTED'}
                {computedCycleState === 'SETTLED' && '15M CYCLE SETTLED'}
                {computedCycleState === 'HYDRATING' && 'VIXY SYNCING — NO DECISION YET'}
              </span>
              <span className="text-purple-300/40 hidden sm:inline">•</span>
              <span className="text-xs text-purple-200/80 leading-relaxed">
                {dynamicContextExplanation}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowExplanationModal(true)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 hover:border-cyan-500/70 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
          >
            <Info className="w-3.5 h-3.5" />
            <span>What does this mean?</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* 4. VIXY VAULT 15-MINUTE CYCLE LIFECYCLE TIMELINE (RESTORED WITH VAULT CRAFT) */}
        {(() => {
          const secondsRemaining = cycleSecondsRemaining;
          const elapsedSec = Math.max(0, Math.min(900, 900 - secondsRemaining));
          const progressPct = Math.min(100, Math.max(0, (elapsedSec / 900) * 100));
          const elapsedMin = Math.floor(elapsedSec / 60);
          const elapsedSecRemainder = elapsedSec % 60;

          // Stage qualifications
          // While HYDRATING there is no committed decision, so no phase may be
          // shown as the one the engine is currently in. The timeline still
          // renders the 15-minute time axis -- elapsed time is a real fact --
          // but it stops asserting which stage the engine has reached.
          const timelineKnown = computedCycleState !== 'HYDRATING';
          const isPhase1Active = timelineKnown && elapsedSec < 120 && !isActuallyLocked;
          const isPhase1Done = elapsedSec >= 120 || isActuallyLocked;

          const isPhase2Active = timelineKnown && elapsedSec >= 120 && elapsedSec < 360 && !isActuallyLocked;
          const isPhase2Done = elapsedSec >= 360 || isActuallyLocked;

          const isPhase3Active = timelineKnown && elapsedSec >= 360 && elapsedSec < 720 && !isActuallyLocked;
          const isPhase3Done = elapsedSec >= 720 || isActuallyLocked;

          const isPhase4Active = timelineKnown && (isActuallyLocked || elapsedSec >= 720);
          const isLockedEarly = isActuallyLocked && elapsedSec < 720;

          return (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#12072c]/95 via-[#0b051b]/95 to-[#060212] border border-purple-800/50 shadow-[0_4px_25px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_24px_rgba(168,85,247,0.04)] relative overflow-hidden space-y-3.5 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-cyan-400/35 before:to-transparent before:pointer-events-none">
              {/* Subtle matrix overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

              {/* Timeline Header Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                  <span className="text-white font-black uppercase tracking-wider text-[11px] font-sans">
                    15-MINUTE CYCLE TIMELINE
                  </span>
                  <span className="text-purple-400/80 font-mono text-[10px]">
                    • {elapsedMin}m {elapsedSecRemainder < 10 ? '0' : ''}{elapsedSecRemainder}s ELAPSED
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isLockedEarly && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-[9px] tracking-wide uppercase shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      ⚡ LOCKED EARLY (HIGH CONVICTION)
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-950/80 border border-purple-700/60 text-purple-300 font-mono font-bold text-[10px]">
                    {progressPct.toFixed(1)}% COMPLETE
                  </span>
                </div>
              </div>

              {/* High-Definition Glowing Progress Track */}
              <div className="relative w-full h-2.5 rounded-full bg-[#180838] border border-purple-800/50 p-0.5 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>

              {/* 4 Phase Nodes (VIXY Vault Micro-Cards) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 relative z-10 pt-1">
                
                {/* Phase 1: CALIBRATING (0-2m) */}
                <div className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                  isPhase1Active
                    ? 'bg-purple-950/80 border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/30'
                    : isPhase1Done
                    ? 'bg-[#100624]/90 border-purple-900/40 text-purple-300/90'
                    : 'bg-[#0a0418]/60 border-purple-950/40 text-purple-500/60'
                }`}>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-mono font-bold text-purple-400">01 • 0–2M</span>
                    {isPhase1Done && !isPhase1Active ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : isPhase1Active ? (
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_6px_#c084fc]" />
                    ) : null}
                  </div>
                  <div className="text-xs font-black text-white font-sans">CALIBRATING</div>
                  <div className="text-[10px] text-purple-300/70 mt-0.5 leading-tight">Tick feed synch & volatility base</div>
                </div>

                {/* Phase 2: ANALYZING (2-6m) */}
                <div className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                  isPhase2Active
                    ? 'bg-cyan-950/80 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/30'
                    : isPhase2Done
                    ? 'bg-[#100624]/90 border-purple-900/40 text-purple-300/90'
                    : 'bg-[#0a0418]/60 border-purple-950/40 text-purple-500/60'
                }`}>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-mono font-bold text-cyan-400">02 • 2–6M</span>
                    {isPhase2Done && !isPhase2Active ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : isPhase2Active ? (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" />
                    ) : null}
                  </div>
                  <div className="text-xs font-black text-white font-sans">ANALYZING</div>
                  <div className="text-[10px] text-purple-300/70 mt-0.5 leading-tight">Order flow delta & whale sweeps</div>
                </div>

                {/* Phase 3: CONVERGENCE (6-12m) */}
                <div className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                  isPhase3Active
                    ? 'bg-amber-950/80 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30'
                    : isPhase3Done
                    ? 'bg-[#100624]/90 border-purple-900/40 text-purple-300/90'
                    : 'bg-[#0a0418]/60 border-purple-950/40 text-purple-500/60'
                }`}>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-mono font-bold text-amber-400">03 • 6–12M</span>
                    {isPhase3Done && !isPhase3Active ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : isPhase3Active ? (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]" />
                    ) : null}
                  </div>
                  <div className="text-xs font-black text-white font-sans">CONVERGENCE</div>
                  <div className="text-[10px] text-purple-300/70 mt-0.5 leading-tight">
                    {isEarlyLockQualified && !isActuallyLocked ? (
                      <span className="text-amber-300 font-bold">⚡ Early lock criteria met</span>
                    ) : (
                      'Multi-timeframe confluence'
                    )}
                  </div>
                </div>

                {/* Phase 4: IMMUTABLE LOCK (12-15m / Early Lock) */}
                <div className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                  isPhase4Active
                    ? isUp
                      ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/40'
                      : 'bg-rose-950/90 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/40'
                    : 'bg-[#0a0418]/60 border-purple-950/40 text-purple-500/60'
                }`}>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-mono font-bold text-emerald-400">04 • 12–15M</span>
                    {isPhase4Active ? (
                      <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : null}
                  </div>
                  <div className="text-xs font-black text-white font-sans">
                    {isLockedEarly ? 'EARLY LOCK' : 'LOCKED'}
                  </div>
                  <div className="text-[10px] text-purple-300/70 mt-0.5 leading-tight">
                    {isActuallyLocked ? 'Autonomous defense engaged' : 'Decision committed & guarded'}
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
      </motion.div>

      {/* FIRST-TIME USER EXPLANATION MODAL */}
      <AnimatePresence>
        {showExplanationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-[#0e0724] border border-purple-600/50 shadow-2xl space-y-4 text-slate-200 font-sans"
            >
              <div className="flex items-center justify-between pb-3 border-b border-purple-800/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <h3 className="text-lg font-black text-white">How VIXY 15M Decisions Work</h3>
                </div>
                <button
                  onClick={() => setShowExplanationModal(false)}
                  className="p-1 rounded-lg text-purple-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-purple-200/90">
                <div className="p-3 rounded-xl bg-[#150a36] border border-purple-800/30">
                  <div className="font-bold text-white mb-0.5">1. Continuous Multi-Venue Analysis</div>
                  <p>VIXY ingests live ticks and order book deltas across Binance, Coinbase, and Kalshi, calculating directional conviction throughout the 15-minute window.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#150a36] border border-purple-800/30">
                  <div className="font-bold text-white mb-0.5">2. Conviction vs Lock Quality</div>
                  <p><strong>Conviction</strong> is the model&apos;s probability assessment. <strong>Lock Quality</strong> is the stability and structural validation required before committing an immutable trade lock.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#150a36] border border-purple-800/30">
                  <div className="font-bold text-white mb-0.5">3. Immutable Lock & Capital Protection</div>
                  <p>Once Locked, VIXY cannot change its prediction. If an adverse strike breach occurs, autonomous VIXY Protection alerts you to preserve capital.</p>
                </div>
              </div>

              <button
                onClick={() => setShowExplanationModal(false)}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white text-xs transition-colors"
              >
                Got It
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. MAIN DOMINANT CHART SECTION & SUB-PANELS GRID */}
      <div className="space-y-6">
        
        {/* Main Chart + Orderbook Microstructure Dual Column on Desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Main Interactive Prediction Chart (8 cols on XL) */}
          <div className="xl:col-span-8 p-4 sm:p-5 rounded-3xl bg-[#0b061d] border border-purple-800/40 shadow-2xl space-y-4">
            
            {/* Chart Toolbar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-900/40">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-white font-sans flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>{selectedAsset}/USDT • 15 MINUTE PREDICTION WINDOW</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Switcher (Candles vs Neural Ribbon) */}
                <div className="flex items-center p-1 rounded-xl bg-[#120930] border border-purple-800/40 text-xs">
                  <button
                    onClick={() => setChartMode('CANDLE')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      chartMode === 'CANDLE'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    Candlesticks
                  </button>
                  <button
                    onClick={() => setChartMode('RIBBON')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      chartMode === 'RIBBON'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    Neural Ribbon
                  </button>
                </div>

                {/* Timeframe Selector */}
                <div className="flex items-center p-1 rounded-xl bg-[#120930] border border-purple-800/40 text-[11px] font-bold">
                  {['15M', '1H'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setSelectedTimeframe(tf as any)}
                      className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                        selectedTimeframe === tf
                          ? 'bg-purple-950 text-amber-300 border border-purple-700/50'
                          : 'text-purple-300/80 hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Interactive Chart Canvas Area with Smooth View Crossfade */}
            <div className="w-full min-h-[480px] rounded-2xl bg-[#090418] border border-purple-900/30 overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={chartMode + selectedAsset + selectedTimeframe}
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.25 }}
                  className="w-full h-full min-h-[480px]"
                >
                  {chartMode === 'CANDLE' ? (
                    <CandleChart
                      candles={chartCandles}
                      currentPrice={spotPrice}
                      targetPrice={targetPrice}
                      timeframe={selectedTimeframe}
                      predictedDirection={isUp ? 'UP' : 'DOWN'}
                      modelSignal={{
                        direction: isUp ? 'UP' : 'DOWN',
                        confidence: displayConfidence,
                        targetPrice: targetPrice,
                      }}
                      venue={selectedVenue}
                    />
                  ) : (
                    <NeuralRibbonChart
                      asset={selectedAsset}
                      desk="15m"
                      spotPrice={spotPrice}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Chart Footer Indicator Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-purple-300/80 font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-purple-500 rounded" />
                  <span>EMA 9</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-cyan-400 rounded" />
                  <span>EMA 21</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-amber-400 rounded" />
                  <span>VWAP</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-purple-500/20 border border-purple-500/40" />
                  <span>Bollinger Bandwidth</span>
                </span>
              </div>

              <div className="flex items-center gap-2 font-bold">
                {!isActuallyLocked ? (
                  <span className="flex items-center gap-1.5 text-purple-300">
                    <Lock className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    <span>15M ENGINE WATCH ACTIVE</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>15M PREDICTION LOCK ACTIVE</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Orderbook Heatmap & Liquidity Radar (4 cols on XL) */}
          <div className="xl:col-span-4">
            <OrderbookHeatmapRadar
              spotPrice={spotPrice}
              strikePrice={targetPrice}
              asset={selectedAsset}
              isUp={isUp}
              conviction={displayConfidence}
            />
          </div>

        </div>

        {/* VIXY READ & EVIDENCE DEEP EXPLORATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* VIXY READ (AI Rationale Narrative) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0b061d] border border-purple-800/40 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
              <div className="flex items-center gap-2 text-xs font-black text-white font-sans">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <span>VIXY READ // AI RATIONALE</span>
              </div>
              <span className="text-[10px] text-purple-400 font-bold">15M ENGINE</span>
            </div>

            <p className="text-xs text-purple-200/90 font-sans leading-relaxed">
              {evidenceSummary.dynamicExplanation}
            </p>

            <div className="p-3 rounded-2xl bg-[#120930] border border-purple-800/30 space-y-1 text-xs">
              <div className="text-[10px] text-amber-300 font-bold">PRIMARY HYPOTHESIS</div>
              <div className="text-white font-medium">
                Buyers absorbing ask volume at strike support ($64,495), maintaining momentum vector +14.2.
              </div>
            </div>
          </div>

          {/* CROSS-VENUE EVIDENCE MATRIX WITH SMOOTH SYNC HIGHLIGHTS */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0b061d] border border-purple-800/40 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
              <div className="flex items-center gap-2 text-xs font-black text-white font-sans">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>CROSS-VENUE EVIDENCE</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>SYNCHRONIZED (4/4)</span>
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <motion.div
                whileHover={{ x: 2 }}
                className="flex items-center justify-between p-2 rounded-xl bg-[#120930] border border-purple-800/30 transition-all"
              >
                <span className="text-purple-300">Binance Spot Taker Delta</span>
                <span className="text-emerald-400 font-black">+$28.4M BUY</span>
              </motion.div>

              <motion.div
                whileHover={{ x: 2 }}
                className="flex items-center justify-between p-2 rounded-xl bg-[#120930] border border-purple-800/30 transition-all"
              >
                <span className="text-purple-300">Coinbase Premium Index</span>
                <span className="text-emerald-400 font-black">+$12.50</span>
              </motion.div>

              <motion.div
                whileHover={{ x: 2 }}
                className="flex items-center justify-between p-2 rounded-xl bg-[#120930] border border-purple-800/30 transition-all"
              >
                <span className="text-purple-300">Kalshi 15M YES Probability</span>
                <span className="text-white font-black">57% YES</span>
              </motion.div>

              <motion.div
                whileHover={{ x: 2 }}
                className="flex items-center justify-between p-2 rounded-xl bg-[#120930] border border-purple-800/30 transition-all"
              >
                <span className="text-purple-300">Polymarket 15M Odds</span>
                <span className="text-white font-black">59% YES</span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* NEURAL SIGNAL DECOMPOSITION MATRIX (6 Factors Attribution) */}
        <NeuralDecompositionMatrix
          conviction={displayConfidence}
          isUp={isUp}
          lockQuality={lockQualityScore}
          reversalRisk={displayReversalRisk}
        />

        {/* QUANTITATIVE SCENARIOS & AUTONOMOUS EXECUTION 2-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScenarioSimulatorMatrix
            spotPrice={spotPrice}
            strikePrice={targetPrice}
            asset={selectedAsset}
            baseConviction={displayConfidence}
            baseLockQuality={lockQualityScore}
            baseReversalRisk={displayReversalRisk}
            isUp={isUp}
          />

          <AutonomousExecutionGuard
            spotPrice={spotPrice}
            strikePrice={targetPrice}
            conviction={displayConfidence}
            reversalRisk={displayReversalRisk}
            isActuallyLocked={isActuallyLocked}
            asset={selectedAsset}
            isUp={isUp}
          />
        </div>

      </div>

      {/* 6. RECENT 15-MINUTE CYCLE SETTLEMENT STRIP */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#100727]/95 via-[#0b051b]/95 to-[#060212] border border-purple-800/40 shadow-[0_4px_25px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] space-y-3 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-purple-400/30 before:to-transparent before:pointer-events-none">
        <div className="flex items-center justify-between pb-2 border-b border-purple-900/40 relative z-10">
          <div className="flex items-center gap-2 text-xs font-black text-white font-sans">
            <Award className="w-4 h-4 text-amber-400" />
            <span>RECENT VIXY LOCK SETTLEMENTS</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-purple-300">SESSION WIN RATE: <span className="text-emerald-400 font-mono font-black">78%</span></span>
            <span className="text-purple-300">BRIER SCORE: <span className="text-amber-300 font-mono font-black">0.142</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative z-10">
          {recentCycles.map((c, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -2 }}
              className={`p-3 rounded-2xl border transition-all relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent ${
                c.status === 'ACTIVE'
                  ? 'bg-purple-900/30 border-purple-500/50 text-white shadow-[0_2px_12px_rgba(168,85,247,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]'
                  : c.status === 'WIN'
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 shadow-[0_2px_12px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-200 shadow-[0_2px_12px_rgba(245,158,11,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span>{c.id}</span>
                <span className={`px-1.5 py-0.2 rounded ${
                  c.status === 'ACTIVE' ? 'bg-purple-600 text-white font-black' : c.status === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {c.status}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span
                  className="font-black font-sans whitespace-nowrap truncate"
                  style={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}
                >
                  {c.dir} {c.conf}%
                </span>
                <span className="text-xs font-bold font-mono shrink-0">{c.pnl}</span>
              </div>
              <div
                className="text-[10px] text-purple-300/70 mt-0.5 truncate font-mono"
                style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.75rem)' }}
              >
                {c.price}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* MARKET REGIME TELEMETRY MODAL */}
      <AnimatePresence>
        {showMarketRegimeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-[#0d0722] border border-purple-700/60 shadow-2xl space-y-5 text-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-purple-800/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-900/50 border border-purple-500/40 text-purple-300">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">MARKET REGIME TELEMETRY</h3>
                    <p className="text-xs text-purple-300/70 font-sans">Real-time dynamic regime classification</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMarketRegimeModal(false)}
                  className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`p-4 rounded-2xl border ${marketRegimeAssessment.badgeClass} flex items-center justify-between`}>
                <div>
                  <div className="text-[10px] uppercase font-bold opacity-75">CURRENT REGIME</div>
                  <div className="text-xl font-black font-sans">{marketRegimeAssessment.label}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold opacity-75">CONFIDENCE</div>
                  <div className="text-xl font-black font-mono">{marketRegimeAssessment.confidence}%</div>
                </div>
              </div>

              <p className="text-xs text-purple-200/90 font-sans leading-relaxed">
                {marketRegimeAssessment.description}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#140a33] border border-purple-800/30">
                  <div className="text-[10px] text-purple-400 font-bold">VOLATILITY RATIO</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">
                    {marketRegimeAssessment.metrics.volatilityRatio.toFixed(2)}x
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#140a33] border border-purple-800/30">
                  <div className="text-[10px] text-purple-400 font-bold">MOMENTUM SCORE</div>
                  <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                    {marketRegimeAssessment.metrics.momentumScore > 0 ? '+' : ''}
                    {marketRegimeAssessment.metrics.momentumScore.toFixed(1)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#140a33] border border-purple-800/30">
                  <div className="text-[10px] text-purple-400 font-bold">CVD DELTA</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">
                    {marketRegimeAssessment.metrics.cvdDelta}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#140a33] border border-purple-800/30">
                  <div className="text-[10px] text-purple-400 font-bold">FLOW AGREEMENT</div>
                  <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                    {marketRegimeAssessment.metrics.flowAgreement}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowMarketRegimeModal(false)}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-sans transition-all cursor-pointer shadow-lg shadow-purple-600/30"
              >
                CLOSE TELEMETRY
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* "WHY NOT?" SKIP EXPLAINABILITY MODAL */}
      <AnimatePresence>
        {showWhyNotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-[#0d0722] border border-purple-700/60 shadow-2xl space-y-5 text-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-purple-800/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">WHY DID VIXY SKIP?</h3>
                    <p className="text-xs text-purple-300/70 font-sans">Quantitative Capital Preservation Rationale</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWhyNotModal(false)}
                  className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">PRIMARY BLOCKER</div>
                <div className="text-sm font-bold text-white">
                  Cross-Venue Dispersion & Reversal Risk Threshold Exceeded
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed font-sans">
                  The quantitative decision engine detected conflicting directional order flow between Binance spot taker volume and Kalshi 15M probability, pushing reversal risk to {displayReversalRisk}% (above the 25% safety ceiling).
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-[11px] font-bold text-purple-300 font-sans">SAFETY METRIC AUDIT</div>
                
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#140a33] border border-purple-800/30">
                  <span className="text-purple-300">Lock Quality Score</span>
                  <span className="font-bold text-amber-400 font-mono">{lockQualityScore} / 100 (Threshold: 70)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#140a33] border border-purple-800/30">
                  <span className="text-purple-300">Reversal Risk</span>
                  <span className="font-bold text-rose-400 font-mono">{displayReversalRisk}% (Max allowed: 25%)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#140a33] border border-purple-800/30">
                  <span className="text-purple-300">Signal Confluence</span>
                  <span className="font-bold text-amber-400 font-mono">3 of 6 factors aligned</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#12082b] border border-purple-800/40 text-[11px] text-purple-300/90 font-sans flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Capital Protection Guarantee:</strong> VIXY will never force a prediction in ambiguous or high-entropy regimes. Skipping preserves 100% of capital for high-conviction setups.
                </span>
              </div>

              <button
                onClick={() => setShowWhyNotModal(false)}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-sans transition-all cursor-pointer shadow-lg shadow-purple-600/30"
              >
                ACKNOWLEDGE & CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
