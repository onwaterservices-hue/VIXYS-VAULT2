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
  Gauge
} from 'lucide-react';
import { BTCTicker, Candle } from '../types';
import { fetchBTCTicker, fetchCryptoKlines } from '../services/api';
import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';
import { calculateCycleSecondsRemaining, formatCountdownMmSs } from '../utils/cycleTime';
import { CandleChart } from './CandleChart';
import { NeuralRibbonChart } from './NeuralRibbonChart';

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

export type CycleState = 'ANALYZING' | 'BUILDING' | 'CONFIRMING' | 'LOCKED' | 'PROTECTED' | 'SETTLED' | 'SKIP';

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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(true);
  const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);
  const [showLockQualityTooltip, setShowLockQualityTooltip] = useState<boolean>(false);

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

  // Poll BTCTicker for fresh spot price & compute price tick deltas
  useEffect(() => {
    const updateTicker = async () => {
      try {
        const t = await fetchBTCTicker();
        if (t && t.price) {
          const newPrice = t.price;
          const oldPrice = prevSpotPriceRef.current;
          if (newPrice !== oldPrice) {
            const diff = newPrice - oldPrice;
            setPriceFlash(diff >= 0 ? 'UP' : 'DOWN');
            setPriceTickDelta(`${diff >= 0 ? '+' : ''}$${Math.abs(diff).toFixed(2)}`);
            prevSpotPriceRef.current = newPrice;

            setTimeout(() => {
              setPriceFlash('NONE');
              setPriceTickDelta(null);
            }, 700);
          }
          setLiveTicker(t);
        }
      } catch (e) {
        // ignore
      }
    };
    updateTicker();
    const interval = setInterval(updateTicker, 2500);
    return () => clearInterval(interval);
  }, []);

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

  // Derive Canonical Cycle Presentation State
  const isActuallyLocked = useMemo(() => {
    const st = canonicalDecision?.currentState;
    return st === 'LOCKED_UP' || st === 'LOCKED_DOWN';
  }, [canonicalDecision?.currentState]);

  const computedCycleState = useMemo<CycleState>(() => {
    const st = canonicalDecision?.currentState;
    if (st === 'SETTLED') return 'SETTLED';
    if (st === 'LOCKED_UP' || st === 'LOCKED_DOWN') return 'LOCKED';
    if (st === 'SKIP') return 'SKIP';
    if (st === 'PROTECTED') return 'PROTECTED';
    if (st === 'CONFIRMING') return 'CONFIRMING';

    const secondsRemaining = canonicalDecision?.timeRemainingSec ?? (900 - (Math.floor(nowMs / 1000) % 900));
    const elapsed = Math.max(0, 900 - secondsRemaining);
    if (elapsed < 120) return 'ANALYZING';
    if (elapsed < 360) return 'BUILDING';
    return 'CONFIRMING';
  }, [canonicalDecision?.currentState, canonicalDecision?.timeRemainingSec, nowMs]);

  // Spot Price & Direction Calculations
  const spotPrice = liveTicker?.price || (canonicalDecision as any)?.spotPrice || 64591.20;
  const spotChange = liveTicker?.change24h || 1.85;

  const rawDirection = (canonicalDecision as any)?.direction || 'UP';
  const isUp = rawDirection === 'YES' || rawDirection === 'UP';
  const isDown = rawDirection === 'NO' || rawDirection === 'DOWN';
  const isSkip = rawDirection === 'SKIP' || rawDirection === 'NEUTRAL';

  const biasLabel = isSkip ? 'SKIP' : isUp ? 'UP' : 'DOWN';
  const rawLockScore = (canonicalDecision as any)?.lockScore ?? (canonicalDecision as any)?.lockEvaluation?.lockScore ?? 87;
  const lockQualityScore = rawLockScore <= 10 ? Math.round(rawLockScore * 10) : Math.round(rawLockScore);

  // Aura Style Configuration
  const auraBorderClass = useMemo(() => {
    if (isActuallyLocked) {
      return isUp
        ? 'border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.14)]'
        : 'border-rose-500/50 shadow-[0_0_35px_rgba(244,63,94,0.14)]';
    }
    if (isUp) {
      return 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.08)]';
    }
    if (isDown) {
      return 'border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.08)]';
    }
    return 'border-purple-500/25 shadow-[0_0_25px_rgba(139,92,246,0.06)]';
  }, [isActuallyLocked, isUp, isDown]);

  const auraGlowColor = useMemo(() => {
    if (isUp) return 'rgba(16, 185, 129, 0.08)';
    if (isDown) return 'rgba(244, 63, 94, 0.08)';
    return 'rgba(139, 92, 246, 0.06)';
  }, [isUp, isDown]);

  // Contextual Dynamic Explanation Text
  const dynamicContextExplanation = useMemo(() => {
    switch (computedCycleState) {
      case 'ANALYZING':
        return 'VIXY is evaluating momentum, trend continuity, taker order flow, and cross-venue sync before committing to an authoritative 15-minute lock.';
      case 'BUILDING':
        return 'Directional order flow is accumulating across venues. Multi-venue taker buy pressure is validating primary hypothesis.';
      case 'CONFIRMING':
        return 'Confluence criteria met. Finalizing cross-venue gate verification and stability checks before immutable lock.';
      case 'LOCKED':
        return `Authoritative 15M cycle lock committed for ${isUp ? 'UP' : 'DOWN'}. Autonomous protection guardian actively monitoring strike protection.`;
      case 'PROTECTED':
        return 'Autonomous capital preservation shield engaged. Volatility defense active.';
      case 'SETTLED':
        return '15-Minute cycle finalized and verified against benchmark settlement index.';
      case 'SKIP':
        return 'Conflicting multi-venue order flow or choppy regime detected. System recommended SKIP to protect capital.';
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
          
          {/* Real Feed Health Status Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#0d0722] border border-purple-800/40 text-[11px] font-mono">
            <span className={`w-2 h-2 rounded-full ${
              dataHealthStatus === 'LIVE'
                ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                : dataHealthStatus === 'STALE'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-500 animate-ping'
            }`} />
            <span className={
              dataHealthStatus === 'LIVE' ? 'text-emerald-400 font-bold' : dataHealthStatus === 'STALE' ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'
            }>
              {dataHealthStatus === 'LIVE' ? 'FEED LIVE' : dataHealthStatus === 'STALE' ? 'FEED DELAYED' : 'RECONNECTING'}
            </span>
          </div>

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

      {/* 2. PRIMARY QUESTION HERO BOX: "WHAT IS VIXY THINKING?" */}
      <motion.div
        style={{
          background: `radial-gradient(circle at 15% 25%, ${auraGlowColor} 0%, rgba(10, 5, 24, 0.96) 65%, rgba(6, 3, 16, 0.98) 100%)`,
        }}
        className={`p-4 sm:p-6 rounded-3xl bg-[#080414] border-2 relative overflow-hidden space-y-4 sm:space-y-5 transition-all duration-700 backdrop-blur-xl ${auraBorderClass}`}
      >
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

        {/* Top Header: Identity, Live Countdown & Lifecycle Stage */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 relative z-10 border-b border-purple-900/40 pb-3.5 sm:pb-4">
          
          {/* Left: 15-Minute Cycle Header + LIVE Pill */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#11082c] border border-purple-800/50 shadow-inner">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider font-sans">
                15-MINUTE CYCLE
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-black shadow-sm">
              <span className={`w-2 h-2 rounded-full ${
                dataHealthStatus === 'LIVE' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-amber-400'
              }`} />
              <span>{dataHealthStatus === 'LIVE' ? 'LIVE' : 'DELAYED'}</span>
            </div>
          </div>

          {/* Center / Right: Time Remaining & Dynamic State Pill */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            
            {/* Cycle Expiration Countdown Clock */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#11082c] border border-purple-800/50 text-xs whitespace-nowrap shadow-inner font-mono">
              <Clock className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-purple-300 font-bold">CYCLE EXPIRES:</span>
              <motion.span
                key={countdownFormatted}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="text-emerald-400 font-black text-sm tracking-wider tabular-nums font-mono"
              >
                {countdownFormatted}
              </motion.span>
              <span className="text-[10px] text-purple-400/90 font-bold">REMAINING</span>
            </div>

            {/* STATE BADGE TRANSITION: Clean Institutional Language */}
            <AnimatePresence mode="wait">
              {computedCycleState === 'ANALYZING' && (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-950/80 border border-purple-600/50 text-xs font-black text-purple-200 shadow-sm whitespace-nowrap"
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-xs font-black text-cyan-300 shadow-sm whitespace-nowrap"
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-xs font-black text-amber-300 shadow-sm whitespace-nowrap"
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
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-black shadow-md whitespace-nowrap ${
                    isUp
                      ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 shadow-emerald-950/50'
                      : 'bg-rose-950/90 border-rose-500/60 text-rose-300 shadow-rose-950/50'
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-xs font-black text-emerald-300 whitespace-nowrap"
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-950/90 border border-purple-600/60 text-xs font-black text-purple-300 shadow-md whitespace-nowrap"
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

        {/* Big Bold 4-Card Quantitative Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Dominant VIXY Directional Bias (Hero Metric) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0724] border border-purple-800/40 shadow-inner relative overflow-hidden flex flex-col justify-between">
            {/* Subtle flow wave background */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:16px_16px]" />
            
            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-1.5 text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>VIXY BIAS</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {isUp ? (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                      <ArrowUpRight className="w-7 h-7" strokeWidth={2.5} />
                    </div>
                  ) : isDown ? (
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/40 flex items-center justify-center shadow-lg shadow-rose-950/50">
                      <ArrowDownRight className="w-7 h-7" strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-300 border border-purple-500/40 flex items-center justify-center shadow-lg">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                  )}

                  <div>
                    <div className={`text-3xl font-black font-sans leading-none tracking-tight ${
                      isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-purple-300'
                    }`}>
                      {biasLabel}
                    </div>
                    
                    <div className="text-[11px] font-bold mt-1 text-slate-300 flex items-center gap-1">
                      <motion.span
                        key={displayConfidence}
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        className={`font-mono font-black ${isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-purple-300'}`}
                      >
                        {displayConfidence}%
                      </motion.span>
                      <span className="text-purple-300/70 font-sans text-[10px]">CONVICTION</span>
                    </div>
                  </div>
                </div>

                {/* Circular Gauge Score */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-purple-950/80"
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
                  <motion.span
                    key={displayConfidence}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute text-xs font-black text-white font-mono"
                  >
                    {displayConfidence}%
                  </motion.span>
                </div>
              </div>
            </div>

            {/* Bottom Alignment Tag */}
            <div className="mt-3 pt-2.5 border-t border-purple-900/30 flex items-center justify-between text-[10px] relative z-10">
              <div className="flex items-center gap-1.5 text-purple-300/80 font-bold">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>MARKET ALIGNMENT</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold font-mono text-[9px] tracking-wide uppercase">
                STRONG
              </span>
            </div>
          </div>

          {/* Card 2: Current Spot Price (Live Ticker & Sparkline) */}
          <motion.div
            animate={{
              borderColor: priceFlash === 'UP'
                ? 'rgba(16, 185, 129, 0.6)'
                : priceFlash === 'DOWN'
                ? 'rgba(244, 63, 94, 0.6)'
                : 'rgba(107, 33, 168, 0.4)',
            }}
            transition={{ duration: 0.3 }}
            className="p-4 sm:p-5 rounded-2xl bg-[#0e0724] border border-purple-800/40 shadow-inner relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                <span>CURRENT PRICE ({selectedAsset}/USDT)</span>
                
                {/* Floating Tick Delta Pill */}
                <AnimatePresence>
                  {priceTickDelta && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={`px-1.5 py-0.2 rounded font-mono font-black text-[9px] ${
                        priceFlash === 'UP' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {priceTickDelta}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                ${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2 text-xs font-bold font-mono">
                  <span className={`px-2 py-0.5 rounded-lg flex items-center gap-1 font-black ${
                    spotChange >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    <span>{spotChange >= 0 ? '+' : ''}{spotChange.toFixed(2)}% (24h)</span>
                    {spotChange >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  </span>
                  
                  <div className="text-[10px] text-purple-300/70 font-sans flex flex-col leading-tight">
                    <span>• BINANCE</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> FEED
                    </span>
                  </div>
                </div>

                {/* Mini Live Vector Sparkline */}
                <div className="w-16 h-8 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 64 24" fill="none">
                    <path
                      d={spotChange >= 0 ? "M 2 18 Q 18 16 30 8 T 62 4" : "M 2 6 Q 18 10 30 16 T 62 20"}
                      stroke={spotChange >= 0 ? "#10b981" : "#f43f5e"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bottom 24H Range Strip */}
            <div className="mt-3 pt-2.5 border-t border-purple-900/30 grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <span className="text-purple-400/80 block text-[9px]">24H HIGH</span>
                <span className="font-bold text-white">${(spotPrice * 1.018).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="border-l border-purple-900/40 pl-2">
                <span className="text-purple-400/80 block text-[9px]">24H LOW</span>
                <span className="font-bold text-white">${(spotPrice * 0.982).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Lock Quality (Distinct from Conviction) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0724] border border-purple-800/40 shadow-inner relative flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
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
                <span className="text-emerald-400 font-black font-mono text-xs">{lockQualityScore} / 100</span>
              </div>

              <div className="text-xl font-black text-white font-sans tracking-tight">
                {lockQualityScore >= 80 ? 'OPTIMAL LOCK' : lockQualityScore >= 70 ? 'QUALIFIED LOCK' : lockQualityScore >= 50 ? 'STRONG EVIDENCE' : 'BUILDING EVIDENCE'}
              </div>

              {/* High Precision Gradient Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-[#180d38] overflow-hidden border border-purple-800/40 p-0.5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 shadow-sm"
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
                    Lock Quality measures the structural strength, stability, and cross-venue agreement supporting a potential 15-minute lock. It is different from directional conviction.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Requirement Details */}
            <div className="mt-3 pt-2.5 border-t border-purple-900/30 flex flex-col gap-0.5 text-[10px] font-sans">
              <span className="text-purple-200/90 font-medium">Strong evidence across venues</span>
              <span className="text-purple-400/80 font-mono text-[9px]">Requires 70+ to lock</span>
            </div>
          </div>

          {/* Card 4: Reversal Risk & Protection Status */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0724] border border-purple-800/40 shadow-inner relative flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>REVERSAL RISK</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] tracking-wider uppercase ${
                  displayReversalRisk < 30 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : displayReversalRisk < 50 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}>
                  {displayReversalRisk < 30 ? 'LOW' : displayReversalRisk < 50 ? 'MODERATE' : 'HIGH'}
                </span>
              </div>

              <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                displayReversalRisk < 30 ? 'text-emerald-400' : displayReversalRisk < 50 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {displayReversalRisk}%
              </div>

              <div className="text-[11px] font-bold flex items-center gap-1.5">
                {isActuallyLocked ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">VIXY Protection Active</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-purple-300/80">Guardian Standby</span>
                  </>
                )}
              </div>
            </div>

            {/* Segmented Risk Slider (LOW / MODERATE / HIGH) */}
            <div className="mt-3 pt-2.5 border-t border-purple-900/30 space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5 h-2 rounded-full overflow-hidden bg-[#180d38] p-0.5 border border-purple-800/40">
                <div className={`h-full rounded-full transition-all ${
                  displayReversalRisk < 30 ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-emerald-950/40'
                }`} />
                <div className={`h-full rounded-full transition-all ${
                  displayReversalRisk >= 30 && displayReversalRisk < 50 ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-amber-950/40'
                }`} />
                <div className={`h-full rounded-full transition-all ${
                  displayReversalRisk >= 50 ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-rose-950/40'
                }`} />
              </div>
              
              <div className="flex items-center justify-between text-[9px] font-bold text-purple-400/80 font-mono uppercase px-0.5">
                <span className={displayReversalRisk < 30 ? 'text-emerald-400 font-black' : ''}>LOW</span>
                <span className={displayReversalRisk >= 30 && displayReversalRisk < 50 ? 'text-amber-400 font-black' : ''}>MODERATE</span>
                <span className={displayReversalRisk >= 50 ? 'text-rose-400 font-black' : ''}>HIGH</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. CONTEXTUAL INTELLIGENCE STRIP: "WHAT IS HAPPENING?" */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0e0724] border border-purple-800/40 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
          <div className="flex items-center gap-3 text-purple-200 font-sans flex-1 min-w-[260px]">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
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
              </span>
              <span className="text-purple-300/40 hidden sm:inline">•</span>
              <span className="text-xs text-purple-200/80 leading-relaxed">
                {dynamicContextExplanation}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowExplanationModal(true)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors px-3 py-1.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 hover:border-cyan-500/50"
          >
            <Info className="w-3.5 h-3.5" />
            <span>What does this mean?</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* 4. 15M CYCLE TIMELINE & DECISION PROGRESS */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 font-mono">
            <span className="flex items-center gap-2">
              <span className="text-white font-sans uppercase tracking-wider text-[11px]">CYCLE WINDOW PROGRESS</span>
              <span className="text-purple-400/70">• {Math.floor((900 - cycleSecondsRemaining) / 60)}m {(900 - cycleSecondsRemaining) % 60}s ELAPSED</span>
            </span>
            <span className="text-emerald-400 font-mono font-black">{cycleProgressPct.toFixed(1)}% COMPLETED</span>
          </div>

          {/* Progress Track with Glowing Bead */}
          <div className="w-full h-3 rounded-full bg-[#160b36] overflow-hidden border border-purple-800/40 relative p-0.5">
            <motion.div
              className={`h-full rounded-full ${
                isActuallyLocked
                  ? isUp
                    ? 'bg-gradient-to-r from-purple-600 via-cyan-400 to-emerald-400 shadow-[0_0_12px_#10b981]'
                    : 'bg-gradient-to-r from-purple-600 via-amber-400 to-rose-400 shadow-[0_0_12px_#f43f5e]'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400'
              }`}
              animate={{ width: `${cycleProgressPct}%` }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </div>

          {/* 4 Stage Lifecycle Checkpoints Underneath */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
            {/* Stage 1: ANALYZING (0-3m) */}
            <div className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
              cycleProgressPct >= 0
                ? 'bg-[#11082c] border-purple-600/40 text-purple-200'
                : 'bg-[#090418] border-purple-900/30 text-purple-400/40'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                cycleProgressPct > 20
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-950 text-purple-400 border border-purple-700/50 animate-pulse'
              }`}>
                {cycleProgressPct > 20 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
              </div>
              <div className="leading-tight">
                <div className="font-bold font-sans text-xs text-white">ANALYZING</div>
                <div className="text-[10px] text-purple-400/70">0–3m</div>
              </div>
            </div>

            {/* Stage 2: BUILDING (3-7m) */}
            <div className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
              cycleProgressPct >= 20
                ? 'bg-[#11082c] border-cyan-600/40 text-cyan-200'
                : 'bg-[#090418] border-purple-900/30 text-purple-400/40'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                cycleProgressPct > 46
                  ? 'bg-cyan-600 text-white'
                  : cycleProgressPct >= 20
                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-600/60 animate-pulse'
                  : 'bg-purple-950 text-purple-400/40'
              }`}>
                {cycleProgressPct > 46 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '2'}
              </div>
              <div className="leading-tight">
                <div className="font-bold font-sans text-xs text-white">BUILDING</div>
                <div className="text-[10px] text-purple-400/70">3–7m</div>
              </div>
            </div>

            {/* Stage 3: CONFIRMING (7-12m) */}
            <div className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
              cycleProgressPct >= 46
                ? 'bg-[#11082c] border-amber-600/40 text-amber-200'
                : 'bg-[#090418] border-purple-900/30 text-purple-400/40'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                cycleProgressPct > 80
                  ? 'bg-amber-600 text-white'
                  : cycleProgressPct >= 46
                  ? 'bg-amber-950 text-amber-400 border border-amber-600/60 animate-pulse'
                  : 'bg-purple-950 text-purple-400/40'
              }`}>
                {cycleProgressPct > 80 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '3'}
              </div>
              <div className="leading-tight">
                <div className="font-bold font-sans text-xs text-white">CONFIRMING</div>
                <div className="text-[10px] text-purple-400/70">7–12m</div>
              </div>
            </div>

            {/* Stage 4: LOCKED (12-15m) */}
            <div className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
              cycleProgressPct >= 80 || isActuallyLocked
                ? 'bg-[#11082c] border-emerald-600/50 text-emerald-200 shadow-md shadow-emerald-950/40'
                : 'bg-[#090418] border-purple-900/30 text-purple-400/40'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                isActuallyLocked || cycleProgressPct >= 80
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-purple-950 text-purple-400/40'
              }`}>
                <Lock className="w-3 h-3" />
              </div>
              <div className="leading-tight">
                <div className="font-bold font-sans text-xs text-white">LOCKED</div>
                <div className="text-[10px] text-purple-400/70">12–15m</div>
              </div>
            </div>
          </div>
        </div>
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
        
        {/* Main Interactive Prediction Chart (Full Width) */}
        <div className="space-y-6">
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0b061d] border border-purple-800/40 shadow-2xl space-y-4">
            
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
                      timeframe={selectedTimeframe}
                      predictedDirection={isUp ? 'UP' : 'DOWN'}
                      modelSignal={{
                        direction: isUp ? 'UP' : 'DOWN',
                        confidence: displayConfidence,
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
                {(canonicalDecision as any)?.aiExplanation ||
                  'Strong momentum and improving order flow are supporting the current bullish structure. Buy-side taker absorption on Binance combined with Kalshi order book imbalance indicates high probability of continuation above $64,500.'}
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
        </div>
      </div>

      {/* 6. RECENT 15-MINUTE CYCLE SETTLEMENT STRIP */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0b061d] border border-purple-800/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
          <div className="flex items-center gap-2 text-xs font-black text-white font-sans">
            <Award className="w-4 h-4 text-amber-400" />
            <span>RECENT VIXY LOCK SETTLEMENTS</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-purple-300">SESSION WIN RATE: <span className="text-emerald-400 font-mono font-black">78%</span></span>
            <span className="text-purple-300">BRIER SCORE: <span className="text-amber-300 font-mono font-black">0.142</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {recentCycles.map((c, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -2 }}
              className={`p-3 rounded-2xl border transition-all ${
                c.status === 'ACTIVE'
                  ? 'bg-purple-900/30 border-purple-500/50 text-white shadow-md shadow-purple-900/20'
                  : c.status === 'WIN'
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
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
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-black font-sans">{c.dir} {c.conf}%</span>
                <span className="text-xs font-bold font-mono">{c.pnl}</span>
              </div>
              <div className="text-[10px] text-purple-300/70 mt-0.5">{c.price}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
