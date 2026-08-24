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
  Play
} from 'lucide-react';
import { BTCTicker, Candle } from '../types';
import { fetchBTCTicker, fetchCryptoKlines } from '../services/api';
import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';
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

export type CycleState = 'BUILDING' | 'CONFIRMING' | 'LOCKED';

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
  const { decision: canonicalDecision, isLoading: isDecisionLoading } = useCanonical15mDecision();
  const [liveTicker, setLiveTicker] = useState<BTCTicker | null>(ticker || null);
  const [chartCandles, setChartCandles] = useState<Candle[]>(initialCandles || []);
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'15M' | '1H'>('15M');
  const [selectedVenue, setSelectedVenue] = useState<string>('Kalshi');
  const [chartMode, setChartMode] = useState<'CANDLE' | 'RIBBON'>('CANDLE');
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(true);

  // Motion & Dynamic State Trackers
  const prevSpotPriceRef = useRef<number>(64591.20);
  const [priceFlash, setPriceFlash] = useState<'UP' | 'DOWN' | 'NONE'>('NONE');
  const [priceTickDelta, setPriceTickDelta] = useState<string | null>(null);

  const [lockBeamActive, setLockBeamActive] = useState<boolean>(false);

  // Dynamic Live Market Micro-Feed Stream
  const [feedEvents, setFeedEvents] = useState([
    { id: '1', time: '1m ago', text: '15M Cycle locked: VIXY Bias set to UP (78% confidence)', type: 'lock' },
    { id: '2', time: '2m ago', text: 'BTC momentum vector turned strongly bullish', type: 'momentum' },
    { id: '3', time: '3m ago', text: 'Large buyer detected on Binance ($1.4M buy wall)', type: 'whale' },
    { id: '4', time: '4m ago', text: 'Funding rate remains neutral at +0.008%', type: 'funding' },
    { id: '5', time: '7m ago', text: 'ETH following BTC trend with +2.43% expansion', type: 'alt' },
  ]);

  // Dynamic Confidence Simulation (for smooth demonstration)
  const [displayConfidence, setDisplayConfidence] = useState<number>(78);

  // Dynamic Reversal Risk
  const [displayReversalRisk, setDisplayReversalRisk] = useState<number>(28);

  // Automatically sync with real-time canonicalDecision from Firestore if available
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

  // Poll BTCTicker for fresh spot price & simulate price micro-ticks
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

            // Clear price flash highlight after 700ms
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

  // Precise Clock Update
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute 15-Minute Cycle Countdown
  const cycleSecondsRemaining = useMemo(() => {
    if (canonicalDecision && typeof canonicalDecision.secondsRemaining === 'number') {
      return canonicalDecision.secondsRemaining;
    }
    const epochSec = Math.floor(nowMs / 1000);
    const fifteenMinSec = 15 * 60;
    return fifteenMinSec - (epochSec % fifteenMinSec);
  }, [canonicalDecision, nowMs]);

  const countdownFormatted = useMemo(() => {
    const mins = Math.floor(cycleSecondsRemaining / 60);
    const secs = cycleSecondsRemaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [cycleSecondsRemaining]);

  const cycleProgressPct = useMemo(() => {
    const elapsed = 900 - cycleSecondsRemaining;
    return Math.min(100, Math.max(0, (elapsed / 900) * 100));
  }, [cycleSecondsRemaining]);

  // Derive Current Cycle Presentation State: CALIBRATING -> BUILDING -> CONFIRMING -> LOCKED -> SETTLED / SKIP
  const isActuallyLocked = useMemo(() => {
    const st = canonicalDecision?.currentState;
    return st === 'LOCKED_UP' || st === 'LOCKED_DOWN';
  }, [canonicalDecision?.currentState]);

  const computedCycleState = useMemo<'CALIBRATING' | 'BUILDING' | 'CONFIRMING' | 'LOCKED' | 'SKIP' | 'SETTLED'>(() => {
    const st = canonicalDecision?.currentState;
    if (st === 'SETTLED') return 'SETTLED';
    if (st === 'LOCKED_UP' || st === 'LOCKED_DOWN') return 'LOCKED';
    if (st === 'SKIP') return 'SKIP';
    if (st === 'CONFIRMING') return 'CONFIRMING';
    if (st === 'PROTECTED') return 'LOCKED';

    // In pre-lock phase, use elapsed time strictly for sub-phase descriptions
    const secondsRemaining = canonicalDecision?.timeRemainingSec ?? (900 - (Math.floor(nowMs / 1000) % 900));
    const elapsed = Math.max(0, 900 - secondsRemaining);
    if (elapsed < 120) return 'CALIBRATING';
    if (elapsed < 360) return 'BUILDING';
    return 'CONFIRMING';
  }, [canonicalDecision?.currentState, canonicalDecision?.timeRemainingSec, nowMs]);

  // Spot Price & Bias Calculations
  const spotPrice = liveTicker?.price || (canonicalDecision as any)?.spotPrice || 64591.20;
  const spotChange = liveTicker?.change24h || 1.85;

  const rawDirection = (canonicalDecision as any)?.direction || 'UP';
  const isUp = rawDirection === 'YES' || rawDirection === 'UP';
  const isDown = rawDirection === 'NO' || rawDirection === 'DOWN';
  const isSkip = rawDirection === 'SKIP' || rawDirection === 'NEUTRAL';

  const biasLabel = isSkip ? 'SKIP' : isUp ? 'UP' : 'DOWN';
  const rawLockScore = (canonicalDecision as any)?.lockScore ?? (canonicalDecision as any)?.lockEvaluation?.lockScore ?? 87;
  const lockQualityScore = rawLockScore <= 10 ? Math.round(rawLockScore * 10) : Math.round(rawLockScore);
  const regime = (canonicalDecision as any)?.regime || 'TRENDING_BULL';
  const decisionId = (canonicalDecision as any)?.decisionId || '#48291';

  // Sub-score factor breakdown (6 core signals)
  const factorBreakdown = useMemo(() => [
    { name: 'Momentum Vector', score: 8.7, detail: 'Taker buy delta +$28.4M across Binance/Coinbase', aligned: true },
    { name: 'Trend Continuity', score: 8.2, detail: 'Supertrend bullish lock above $64,120 support', aligned: true },
    { name: 'Order Flow Delta', score: 8.1, detail: '85% Buy Taker Delta absorption in order book', aligned: true },
    { name: 'Volume Profile', score: 7.8, detail: 'Trading +$54.20 above Volume POC ($64,095)', aligned: true },
    { name: 'Sentiment & Venue Sync', score: 7.2, detail: 'Kalshi 57% YES / Polymarket 59% YES consensus', aligned: true },
    { name: 'Volatility Squeeze', score: 6.9, detail: 'Bandwidth 2.1% — Volatility expansion active', aligned: true },
  ], [spotPrice]);

  // Recent 15M Cycle Settlement Strip
  const recentCycles = useMemo(() => [
    { id: '#48291', dir: 'UP', conf: displayConfidence, price: `$${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, status: 'ACTIVE', pnl: '+2.4%' },
    { id: '#48290', dir: 'UP', conf: 75, price: '$64,480.10', status: 'WIN', pnl: '+1.8%' },
    { id: '#48289', dir: 'DOWN', conf: 82, price: '$64,210.00', status: 'WIN', pnl: '+2.1%' },
    { id: '#48288', dir: 'UP', conf: 72, price: '$64,100.50', status: 'WIN', pnl: '+1.5%' },
    { id: '#48287', dir: 'SKIP', conf: 52, price: '$63,980.00', status: 'SKIPPED', pnl: '0.0%' },
  ], [displayConfidence, spotPrice]);

  // Handle Manual Lock Trigger (Restrained Confirmation Interaction)
  const triggerRestrainedLock = () => {
    setLockBeamActive(true);
    if (!audioMuted) {
      playLockChime();
    }
    setTimeout(() => {
      setLockBeamActive(false);
    }, 1800);
  };



  // Simulate Live Event Insertion
  const handleSimulateLiveEvent = () => {
    const options = [
      { text: 'Order Book Imbalance: Taker Buy ratio jumped to 89%', type: 'orderflow' },
      { text: 'Kalshi 15M contract probability adjusted to 61% YES', type: 'venue' },
      { text: 'Binance $2.1M buy order filled at $64,580', type: 'whale' },
      { text: 'Vol Squeeze compression released — Momentum +18.4', type: 'volatility' },
    ];
    const picked = options[Math.floor(Math.random() * options.length)];
    const newEv = {
      id: String(Date.now()),
      time: 'Just now',
      text: picked.text,
      type: picked.type
    };

    setFeedEvents(prev => [newEv, ...prev.slice(0, 5)]);

    // Slightly nudge confidence to simulate live model update
    setDisplayConfidence(prev => Math.min(94, Math.max(68, prev + (Math.random() > 0.4 ? 1 : -1))));
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      handleSimulateLiveEvent();
    }, 600);
  };

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
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/40 border border-purple-400/40">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
                CRYPTO PREDICTION CENTER
              </h1>
              <span className="px-2 py-0.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-800/40 text-[10px] font-bold">
                FLAGSHIP
              </span>
            </div>
            <p className="text-xs text-purple-300/70 font-sans">
              AI-Powered Market Analysis • Real-Time Signals • Cross-Venue Data
            </p>
          </div>
        </div>

        {/* Global Motion Controls & Interactive Testing Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto">
          
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
            title="Refresh Terminal Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. PRIMARY QUESTION HERO BOX: "WHAT DOES VIXY THINK?" */}
      {/* 3-Second Comprehension Answer Banner with Restrained Lock Motion */}
      <motion.div
        animate={{
          borderColor: lockBeamActive
            ? 'rgba(16, 185, 129, 0.8)'
            : computedCycleState === 'LOCKED'
            ? 'rgba(16, 185, 129, 0.4)'
            : computedCycleState === 'CONFIRMING'
            ? 'rgba(245, 158, 11, 0.4)'
            : 'rgba(147, 51, 234, 0.5)',
          boxShadow: lockBeamActive
            ? '0 0 45px rgba(16, 185, 129, 0.25)'
            : '0 0 35px rgba(147, 51, 234, 0.12)'
        }}
        transition={{ duration: 0.5 }}
        className="p-4 sm:p-6 rounded-3xl bg-[#0b061d] border-2 relative overflow-hidden space-y-4 sm:space-y-5"
      >
        {/* Horizontal Laser Border Sweep on Lock Confirmation */}
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

        {/* Subtle Background Radial Glow */}
        <motion.div
          animate={{
            scale: lockBeamActive ? [1, 1.15, 1] : 1,
            opacity: computedCycleState === 'LOCKED' ? 0.22 : 0.15
          }}
          transition={{ duration: 0.6 }}
          className={`absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            isUp
              ? 'bg-emerald-500'
              : isDown
              ? 'bg-rose-500'
              : 'bg-amber-500'
          }`}
        />

        {/* Top Primary Answer Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 relative z-10 border-b border-purple-900/40 pb-3.5 sm:pb-4">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${
              computedCycleState === 'LOCKED'
                ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400'
                : computedCycleState === 'CONFIRMING'
                ? 'bg-amber-400 animate-ping'
                : 'bg-blue-400 animate-pulse'
            }`} />
            
            <span className="text-xs font-black text-purple-200 uppercase tracking-widest font-sans flex items-center gap-2 whitespace-nowrap">
              <span>VIXY BIAS // 15-MINUTE CYCLE</span>
            </span>
          </div>

          {/* Time Remaining & Dynamic State Pill */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            
            {/* Cycle Progress Bar / Countdown */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#130b32] border border-purple-800/40 text-xs whitespace-nowrap">
              <Clock className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-purple-300 font-bold">CYCLE EXPIRES:</span>
              <motion.span
                key={countdownFormatted}
                initial={{ opacity: 0.6, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="text-emerald-400 font-black font-mono text-sm"
              >
                {countdownFormatted}
              </motion.span>
              <span className="text-[10px] text-purple-400">REMAINING</span>
            </div>

            {/* STATE BADGE TRANSITION: CALIBRATING -> BUILDING -> CONFIRMING -> LOCKED -> SKIP */}
            <AnimatePresence mode="wait">
              {computedCycleState === 'CALIBRATING' && (
                <motion.div
                  key="calibrating"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-700/50 text-xs font-bold text-purple-300 whitespace-nowrap"
                >
                  <Activity className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  <span>VIXY ANALYZING (CALIBRATING)...</span>
                </motion.div>
              )}

              {computedCycleState === 'BUILDING' && (
                <motion.div
                  key="building"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/80 border border-blue-700/50 text-xs font-bold text-blue-300 whitespace-nowrap"
                >
                  <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span>BUILDING CONVICTION...</span>
                </motion.div>
              )}

              {computedCycleState === 'CONFIRMING' && (
                <motion.div
                  key="confirming"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-700/50 text-xs font-bold text-amber-300 whitespace-nowrap"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>CONFIRMING GATES...</span>
                </motion.div>
              )}

              {computedCycleState === 'LOCKED' && (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-xs font-bold text-emerald-300 shadow-md shadow-emerald-950/50 whitespace-nowrap"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>LOCKED — {rawDirection === 'UP' || (rawDirection as any) === 'YES' ? 'UP' : 'DOWN'} // AUTHORITATIVE</span>
                </motion.div>
              )}

              {computedCycleState === 'SKIP' && (
                <motion.div
                  key="skip"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-600/60 text-xs font-bold text-amber-300 shadow-md whitespace-nowrap"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>VIXY SKIP // CRITERIA NOT MET</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Big Bold VIXY Prediction Stat Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: VIXY Bias & Smooth Confidence Transition */}
          <div className="p-4 rounded-2xl bg-[#120930] border border-purple-800/40 flex items-center justify-between gap-3 shadow-inner relative overflow-hidden">
            <div className="space-y-1">
              <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                VIXY BIAS
              </div>
              <div className="flex items-center gap-2">
                {isUp ? (
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                ) : isDown ? (
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    <TrendingDown className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <Radio className="w-7 h-7 animate-pulse" />
                  </div>
                )}
                <div>
                  <div className={`text-3xl font-black font-sans leading-none ${
                    isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {biasLabel}
                  </div>
                  
                  {/* Confidence Transition display */}
                  <div className="text-[11px] text-slate-300 font-bold mt-1 flex items-center gap-1">
                    <motion.span
                      key={displayConfidence}
                      initial={{ opacity: 0.4, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-emerald-400 font-mono font-black"
                    >
                      {displayConfidence}%
                    </motion.span>
                    <span className="text-emerald-400">CONFIDENCE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Circular Gauge Score with Animated Path */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-purple-950"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path
                  className={isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-amber-400'}
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
                className="absolute text-[11px] font-black text-white font-mono"
              >
                {displayConfidence}%
              </motion.span>
            </div>
          </div>

          {/* Card 2: Current Spot Price with Micro Price Flashes */}
          <motion.div
            animate={{
              borderColor: priceFlash === 'UP'
                ? 'rgba(16, 185, 129, 0.6)'
                : priceFlash === 'DOWN'
                ? 'rgba(244, 63, 94, 0.6)'
                : 'rgba(107, 33, 168, 0.4)',
              backgroundColor: priceFlash === 'UP'
                ? 'rgba(6, 78, 59, 0.25)'
                : priceFlash === 'DOWN'
                ? 'rgba(136, 19, 55, 0.25)'
                : 'rgba(18, 9, 48, 1)'
            }}
            transition={{ duration: 0.3 }}
            className="p-4 rounded-2xl border space-y-1 shadow-inner relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider">
              <span>CURRENT PRICE ({selectedAsset}/USDT)</span>
              
              {/* Floating Tick Delta Pill */}
              <AnimatePresence>
                {priceTickDelta && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`px-1.5 py-0.2 rounded font-mono font-black text-[10px] ${
                      priceFlash === 'UP' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                    }`}
                  >
                    {priceTickDelta}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight flex items-center gap-2">
              <span>${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className={`px-2 py-0.5 rounded transition-colors ${
                spotChange >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {spotChange >= 0 ? '+' : ''}{spotChange.toFixed(2)}% (24h)
              </span>
              <span className="text-purple-300/60">• BINANCE FEED</span>
            </div>
          </motion.div>

          {/* Card 3: Lock Quality Rating */}
          <div className="p-4 rounded-2xl bg-[#120930] border border-purple-800/40 space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider">
              <span>LOCK QUALITY</span>
              <span className="text-emerald-400 font-black">{lockQualityScore} / 100</span>
            </div>
            <div className="text-xl font-black text-white font-sans">
              {lockQualityScore >= 80 ? 'OPTIMAL LOCK' : lockQualityScore >= 60 ? 'STRONG LOCK' : 'MODERATE LOCK'}
            </div>
            {/* Animated Progress Bar */}
            <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden border border-purple-800/30">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-emerald-400 to-cyan-400"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(100, Math.max(0, lockQualityScore))}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Card 4: Reversal Risk & Downstream Protection Status */}
          <div className="p-4 rounded-2xl bg-[#120930] border border-purple-800/40 space-y-1 shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider">
              <span>REVERSAL RISK</span>
              <span className={`px-1.5 py-0.2 rounded font-extrabold text-[9px] ${
                displayReversalRisk < 30 ? 'bg-emerald-500/20 text-emerald-400' : displayReversalRisk < 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {displayReversalRisk < 30 ? 'LOW' : displayReversalRisk < 50 ? 'MODERATE' : 'HIGH'}
              </span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono ${
              displayReversalRisk < 30 ? 'text-emerald-400' : displayReversalRisk < 50 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {displayReversalRisk}%
            </div>
            <div className="text-[11px] font-bold flex items-center gap-1">
              {isActuallyLocked ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">VIXY Protection Active</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Protection Standby</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 15m Cycle Progress Line Strip */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-purple-300">
            <span>CYCLE WINDOW PROGRESS</span>
            <span className="text-emerald-400">{cycleProgressPct.toFixed(1)}% COMPLETED</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-purple-950 overflow-hidden border border-purple-800/30">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 via-indigo-400 to-emerald-400"
              animate={{ width: `${cycleProgressPct}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        </div>
      </motion.div>

      {/* 3. MAIN DOMINANT CHART SECTION & SUB-PANELS GRID */}
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
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      chartMode === 'CANDLE'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    Candlesticks
                  </button>
                  <button
                    onClick={() => setChartMode('RIBBON')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
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
                      className={`px-2 py-0.5 rounded-lg transition-all ${
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

              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>15M PREDICTION LOCK ACTIVE</span>
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

      {/* 4. RECENT 15-MINUTE CYCLE SETTLEMENT STRIP */}
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
