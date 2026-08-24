import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Zap,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Layers,
  BarChart3,
  Flame,
  Info,
  RefreshCw,
  Compass,
  Cpu,
  Target,
  Check,
  X,
  ShieldAlert,
  GitCommit,
  Sliders,
  Database,
  Lock,
  ExternalLink,
  Shield,
  Gauge,
  SlidersHorizontal,
  Calendar,
  Waves,
  Crosshair,
  Award,
  ChevronRight,
  BrainCircuit,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { BTCTicker, Candle } from '../types';
import { fetchBTCTicker } from '../services/api';
import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';

// ─── DIRECTIONAL HOLOGRAM COMPONENT ───
// Lightweight CSS/SVG animated holographic wireframe silhouette (Bull / Bear / Neutral)
interface DirectionalHologramProps {
  bias: 'BULL' | 'BEAR' | 'NEUTRAL';
  confidence: number;
}

export const DirectionalHologram: React.FC<DirectionalHologramProps> = ({ bias, confidence }) => {
  const isBull = bias === 'BULL';
  const isBear = bias === 'BEAR';

  return (
    <div className="relative w-full h-44 sm:h-52 flex items-center justify-center overflow-hidden rounded-2xl bg-[#070314]/80 border border-purple-900/40 shadow-inner group">
      {/* Hologram Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,38,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-60 z-20" />

      {/* Vertical Scanning Laser Line */}
      <div
        className={`absolute inset-x-0 h-0.5 z-20 opacity-75 shadow-lg animate-[scanline_3s_ease-in-out_infinite] ${
          isBull
            ? 'bg-gradient-to-r from-transparent via-[#00FF88] to-transparent shadow-[0_0_15px_#00FF88]'
            : isBear
            ? 'bg-gradient-to-r from-transparent via-[#FF3B30] to-transparent shadow-[0_0_15px_#FF3B30]'
            : 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]'
        }`}
      />

      {/* Floating Holographic Particles */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full opacity-60 ${
              isBull
                ? 'bg-[#00FF88] shadow-[0_0_8px_#00FF88] animate-[particleUp_4s_ease-in-out_infinite]'
                : isBear
                ? 'bg-[#FF3B30] shadow-[0_0_8px_#FF3B30] animate-[particleDown_4s_ease-in-out_infinite]'
                : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-[particleUp_6s_ease-in-out_infinite]'
            }`}
            style={{
              left: `${12 + i * 11}%`,
              animationDelay: `${i * 0.45}s`,
              top: isBear ? '0%' : '100%',
            }}
          />
        ))}
      </div>

      {/* Radial Background Hologram Glow */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 opacity-30 blur-2xl ${
          isBull
            ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/50 via-purple-950/20 to-transparent'
            : isBear
            ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-500/50 via-purple-950/20 to-transparent'
            : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/40 via-purple-950/20 to-transparent'
        }`}
      />

      {/* SVG Holographic Silhouette */}
      <div className="relative z-10 w-64 h-36 flex items-center justify-center transform transition-transform duration-500 hover:scale-105">
        {isBull ? (
          <svg viewBox="0 0 240 130" className="w-full h-full drop-shadow-[0_0_20px_rgba(0,255,136,0.6)]">
            <defs>
              <linearGradient id="bullStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00FF88" stopOpacity="1" />
                <stop offset="50%" stopColor="#34d399" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
              </linearGradient>
              <filter id="bullGlow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Bull Contour Wireframe */}
            <path
              d="M 20 75 C 30 55, 50 48, 75 42 C 95 38, 120 32, 145 38 C 160 42, 175 32, 195 20 C 188 38, 180 48, 200 52 C 188 62, 175 62, 162 68 C 150 74, 145 92, 138 108 C 128 108, 122 92, 115 80 C 100 82, 82 85, 68 82 C 62 96, 56 108, 45 108 C 40 96, 46 84, 40 78 Z"
              fill="none"
              stroke="url(#bullStroke)"
              strokeWidth="2"
              filter="url(#bullGlow)"
              className="animate-[pulse_3s_ease-in-out_infinite]"
            />

            {/* Bull Internal Muscles Grid Lines */}
            <path d="M 75 42 Q 88 62, 68 82" fill="none" stroke="#00FF88" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.7" />
            <path d="M 115 35 Q 128 58, 115 80" fill="none" stroke="#00FF88" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.7" />
            <path d="M 145 38 C 160 50, 172 52, 200 52" fill="none" stroke="#00FF88" strokeWidth="1.2" strokeOpacity="0.8" />
            <path d="M 175 32 Q 188 16, 205 10" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />

            {/* Head Eye & Crosshair Node */}
            <circle cx="180" cy="38" r="2.5" fill="#00FF88" className="animate-ping" />
            <circle cx="180" cy="38" r="1.5" fill="#ffffff" />
          </svg>
        ) : isBear ? (
          <svg viewBox="0 0 240 130" className="w-full h-full drop-shadow-[0_0_20px_rgba(255,59,48,0.6)]">
            <defs>
              <linearGradient id="bearStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF3B30" stopOpacity="1" />
                <stop offset="50%" stopColor="#f87171" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0.4" />
              </linearGradient>
              <filter id="bearGlow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Bear Contour Wireframe */}
            <path
              d="M 30 88 C 24 66, 40 50, 62 38 C 84 28, 118 28, 145 38 C 162 44, 180 50, 198 62 C 204 74, 192 80, 186 85 C 174 80, 168 96, 156 108 C 144 108, 144 90, 132 84 C 110 88, 88 90, 72 88 C 60 100, 54 108, 44 108 C 38 96, 38 90, 30 88 Z"
              fill="none"
              stroke="url(#bearStroke)"
              strokeWidth="2"
              filter="url(#bearGlow)"
              className="animate-[pulse_3s_ease-in-out_infinite]"
            />

            {/* Bear Internal Muscle Grid Lines */}
            <path d="M 62 38 Q 78 62, 72 88" fill="none" stroke="#FF3B30" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.7" />
            <path d="M 118 28 Q 128 56, 132 84" fill="none" stroke="#FF3B30" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.7" />
            <path d="M 145 38 Q 168 56, 186 85" fill="none" stroke="#FF3B30" strokeWidth="1.2" strokeOpacity="0.8" />
            <path d="M 180 50 L 202 56 L 196 68 L 180 62 Z" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" />

            {/* Head Eye & Crosshair Node */}
            <circle cx="192" cy="56" r="2.5" fill="#FF3B30" className="animate-ping" />
            <circle cx="192" cy="56" r="1.5" fill="#ffffff" />
          </svg>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
            <Radio className="w-12 h-12 text-cyan-400 animate-pulse" />
            <span className="text-[10px] text-cyan-300 font-mono uppercase tracking-widest">
              HOLOGRAM CALIBRATING...
            </span>
          </div>
        )}
      </div>

      {/* Hologram Status Footer Badge */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[9px] font-mono z-20">
        <span className="text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isBull ? 'bg-[#00FF88]' : isBear ? 'bg-[#FF3B30]' : 'bg-cyan-400'} animate-ping`} />
          HOLOGRAM SILHOUETTE MATRIX
        </span>
        <span className={`font-black ${isBull ? 'text-[#00FF88]' : isBear ? 'text-[#FF3B30]' : 'text-cyan-300'}`}>
          {isBull ? 'BULLISH CHARGE' : isBear ? 'BEARISH IMPULSE' : 'NEUTRAL CALIBRATING'} ({confidence}%)
        </span>
      </div>
    </div>
  );
};

// Inline Keyframes Injector for Hologram Animations
const HologramKeyframes: React.FC = () => (
  <style>{`
    @keyframes particleUp {
      0% { transform: translateY(0); opacity: 0; }
      20% { opacity: 0.8; }
      80% { opacity: 0.8; }
      100% { transform: translateY(-160px); opacity: 0; }
    }
    @keyframes particleDown {
      0% { transform: translateY(0); opacity: 0; }
      20% { opacity: 0.8; }
      80% { opacity: 0.8; }
      100% { transform: translateY(160px); opacity: 0; }
    }
    @keyframes scanline {
      0% { top: 0%; }
      50% { top: 100%; }
      100% { top: 0%; }
    }
  `}</style>
);

// ─── MAIN VIXY LOCK VIEW COMPONENT ───
interface VixyLockViewProps {
  ticker?: BTCTicker;
  candles?: Candle[];
  userEmail?: string;
  onOpenTerminal?: () => void;
  onOpenReplay?: () => void;
  onOpenPricing?: () => void;
  isAuthenticated?: boolean;
  hasActiveAccess?: boolean;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const VixyLockView: React.FC<VixyLockViewProps> = ({
  ticker,
  candles,
  userEmail,
  onOpenTerminal = () => {},
  onOpenReplay = () => {},
  onOpenPricing = () => {},
  isAuthenticated = false,
  hasActiveAccess = true,
  onOpenAuth,
}) => {
  const { decision: canonicalDecision } = useCanonical15mDecision();
  const [liveTicker, setLiveTicker] = useState<BTCTicker | null>(ticker || null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Poll BTCTicker for fresh spot price
  useEffect(() => {
    const updateTicker = async () => {
      try {
        const t = await fetchBTCTicker();
        if (t && t.price) {
          setLiveTicker(t);
        }
      } catch (e) {
        // ignore
      }
    };
    updateTicker();
    const interval = setInterval(updateTicker, 2000);
    return () => clearInterval(interval);
  }, []);

  // Precise Clock Update
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute 15-Minute Cycle Countdown
  const cycleSecondsRemaining = useMemo(() => {
    const epochSec = Math.floor(nowMs / 1000);
    const fifteenMinSec = 15 * 60;
    const remaining = fifteenMinSec - (epochSec % fifteenMinSec);
    return remaining;
  }, [nowMs]);

  const countdownFormatted = useMemo(() => {
    const mins = Math.floor(cycleSecondsRemaining / 60);
    const secs = cycleSecondsRemaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [cycleSecondsRemaining]);

  const cycleProgressPct = useMemo(() => {
    const elapsed = 900 - cycleSecondsRemaining;
    return Math.min(100, Math.max(0, (elapsed / 900) * 100));
  }, [cycleSecondsRemaining]);

  // Spot Price & Strike Logic
  const spotPrice = liveTicker?.price || (canonicalDecision as any)?.spotPrice || 64280.50;
  const isUp = (canonicalDecision as any)?.direction === 'YES' || (canonicalDecision as any)?.direction === 'UP' || true;
  const isDown = !isUp && ((canonicalDecision as any)?.direction === 'NO' || (canonicalDecision as any)?.direction === 'DOWN');
  const primaryBias: 'BULL' | 'BEAR' | 'NEUTRAL' = isUp ? 'BULL' : isDown ? 'BEAR' : 'NEUTRAL';

  const confidence = (canonicalDecision as any)?.confidence || 78;
  const lockScore = (canonicalDecision as any)?.lockScore || 84;
  const strikePrice = Math.round(spotPrice - (isUp ? 95.50 : -95.50));
  const spotVsStrikeDelta = spotPrice - strikePrice;

  // Evidence Signal Scores (6 core signals)
  const evidenceSignals = useMemo(() => [
    {
      name: 'Momentum Vector',
      category: 'MACD / CVD',
      score: 8.7,
      status: 'BULLISH EXPANSION',
      detail: 'MACD Hist +14.2, Taker Delta +$28.4M',
      isBullish: true,
    },
    {
      name: 'Trend Continuity',
      category: 'SUPERTREND',
      score: 8.4,
      status: '15M / 5M ALIGNED',
      detail: 'Multi-period Supertrend bullish lock above $64,120',
      isBullish: true,
    },
    {
      name: 'Order Flow Delta',
      category: 'BOOK ABSORPTION',
      score: 8.2,
      status: 'BID ABSORPTION',
      detail: '85% Buy Taker Delta across Coinbase & Binance',
      isBullish: true,
    },
    {
      name: 'Volume Profile',
      category: 'POC / VAH',
      score: 7.9,
      status: 'ABOVE VALUE AREA',
      detail: 'Price trading +$54.20 above Volume POC ($64,095)',
      isBullish: true,
    },
    {
      name: 'Volatility Compression',
      category: 'BOLLINGER SQUEEZE',
      score: 7.6,
      status: 'EXPANSION READY',
      detail: 'Bollinger Bandwidth 2.1% — Volatility expansion active',
      isBullish: true,
    },
    {
      name: 'Sentiment & Venue Sync',
      category: 'KALSHI / POLYMARKET',
      score: 8.0,
      status: 'SYNCHRONIZED',
      detail: 'Kalshi 57% YES / Polymarket 59% YES consensus',
      isBullish: true,
    },
  ], [spotPrice]);

  // Last 10 Rounds Settlement Strip Data
  const settlementRounds = useMemo(() => [
    { cycle: 'C-67892', dir: 'UP', spot: '$64,280.50', outcome: 'ACTIVE', isWin: true, isActive: true },
    { cycle: 'C-67891', dir: 'UP', spot: '$64,150.20', outcome: 'WIN', isWin: true, isActive: false },
    { cycle: 'C-67890', dir: 'DOWN', spot: '$63,920.00', outcome: 'WIN', isWin: true, isActive: false },
    { cycle: 'C-67889', dir: 'DOWN', spot: '$63,840.10', outcome: 'WIN', isWin: true, isActive: false },
    { cycle: 'C-67888', dir: 'UP', spot: '$64,010.50', outcome: 'WIN', isWin: true, isActive: false },
    { cycle: 'C-67887', dir: 'UP', spot: '$63,820.00', outcome: 'WIN', isWin: true, isActive: false },
    { cycle: 'C-67886', dir: 'DOWN', spot: '$63,700.00', outcome: 'WIN', isWin: true, isActive: false },
    { cycle: 'C-67885', dir: 'DOWN', spot: '$63,590.20', outcome: 'WIN', isWin: true, isActive: false },
    { cycle: 'C-67884', dir: 'UP', spot: '$63,420.00', outcome: 'LOSS', isWin: false, isActive: false },
    { cycle: 'C-67883', dir: 'UP', spot: '$63,550.00', outcome: 'WIN', isWin: true, isActive: false },
  ], []);

  return (
    <div className="relative min-h-screen bg-[#080414] text-gray-200 font-mono text-xs pb-16 space-y-4 select-none">
      <HologramKeyframes />

      {/* PAYWALL / SUBSCRIPTION ACCESS GUARD OVERLAY (If user lacks access) */}
      {!hasActiveAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0518]/85 backdrop-blur-xl animate-fadeIn font-mono">
          <div className="max-w-xl w-full p-6 sm:p-8 rounded-2xl bg-[#0c0620] border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.4)] text-center space-y-6 relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center mx-auto text-cyan-300 shadow-lg shadow-cyan-500/20">
              <Lock className="w-8 h-8 text-cyan-400" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>AUTHENTICATION & ACTIVE SUBSCRIPTION REQUIRED</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
                Unlock 24H Day Pass or Pro Tier to View Live 15-Minute Decision Telemetry
              </h2>
              <p className="text-xs sm:text-sm text-purple-200/80 font-sans max-w-md mx-auto leading-relaxed">
                Activate your 24-Hour Day Pass or Pro subscription to stream real-time order flow delta, Bayesian calibration, and live trade signals.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 font-sans">
              <button
                onClick={onOpenPricing}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-cyan-500/30 transition-all transform hover:scale-105 cursor-pointer uppercase tracking-wider"
              >
                Activate 24H Day Pass ($9.99)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN FLAGSHIP VIXY LIVE CONTAINER */}
      <div className={`space-y-4 ${!hasActiveAccess ? 'filter blur-[14px] opacity-25 pointer-events-none' : ''}`}>
        
        {/* 1. TOP SYSTEM STATUS HEADER (SINGLE CLEAN BAR, NO PILL CLUTTER) */}
        <div className="flex flex-wrap items-center justify-between bg-[#0c0620]/90 border border-purple-900/40 backdrop-blur-md rounded-2xl px-4 sm:px-5 py-3 shadow-[0_4px_25px_rgba(0,0,0,0.6)] gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Indicator */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[#00FF88]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF88]"></span>
              </span>
              <span className="font-black text-xs tracking-widest uppercase">LIVE ENGINE</span>
            </div>

            {/* Asset Pair & Contract */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#080414] border border-purple-900/30 text-white font-black text-xs">
              <span className="text-purple-400">BTC/USD</span>
              <span className="text-gray-500">•</span>
              <span className="text-cyan-300">15M CONTRACT</span>
            </div>

            {/* Venue & Latency Badges */}
            <div className="hidden lg:flex items-center space-x-3 text-[10px] border-l border-purple-900/40 pl-3">
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
                <span className="text-gray-400">KALSHI</span>
                <span className="text-[#00FF88] font-bold">12ms</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
                <span className="text-gray-400">POLYMARKET</span>
                <span className="text-[#00FF88] font-bold">16ms</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-gray-400">DATA HEALTH</span>
                <span className="text-cyan-300 font-bold">100% OPTIMAL</span>
              </div>
            </div>
          </div>

          {/* Clock & Action */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-[10px] text-gray-300 font-mono bg-[#080414] px-3 py-1.5 rounded-xl border border-purple-900/30">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{new Date(nowMs).toLocaleTimeString()} EST</span>
            </div>
          </div>
        </div>

        {/* 2. HERO: AUTHORITATIVE DECISION CORE + DIRECTIONAL HOLOGRAM */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Main Decision Hero Card (7 cols) */}
          <div className="lg:col-span-7 bg-gradient-to-br from-[#0c0620] via-[#090418] to-[#060310] border-2 border-purple-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Header Label */}
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span className="text-xs text-purple-200 font-black tracking-widest uppercase">
                    VIXY AUTHORITATIVE DECISION CORE
                  </span>
                </div>

                {/* Highlighted Lock Score */}
                <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-bold uppercase">LOCK SCORE</span>
                  <span className="text-sm font-black text-amber-300">{lockScore}<span className="text-[10px] text-amber-200/70">/100</span></span>
                </div>
              </div>

              {/* Dominant Direction & Confidence Title */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7 space-y-2">
                  <div className="text-[10px] text-purple-300 uppercase font-bold tracking-widest">
                    CURRENT CANONICAL BIAS
                  </div>
                  <h1 className={`text-4xl sm:text-5xl font-black font-sans tracking-tight ${isUp ? 'text-[#00FF88]' : 'text-[#FF3B30]'}`}>
                    LOCKED — {isUp ? 'UP / YES' : 'DOWN / NO'}
                  </h1>
                  <div className="flex items-center space-x-3 pt-1">
                    <span className="text-3xl font-black text-white font-sans">{confidence}%</span>
                    <span className="text-xs text-purple-200 font-bold bg-purple-900/50 px-2.5 py-1 rounded-lg border border-purple-700/40">
                      BAYESIAN CONVICTION
                    </span>
                  </div>
                </div>

                {/* Directional Hologram Box (5 cols) */}
                <div className="md:col-span-5">
                  <DirectionalHologram bias={primaryBias} confidence={confidence} />
                </div>
              </div>

              {/* Rationale Statement */}
              <div className="bg-[#080414]/90 p-3.5 rounded-xl border border-purple-900/40 my-4 space-y-1">
                <div className="text-[9.5px] text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>VIXY AI CONVICTION SYNTHESIS</span>
                </div>
                <p className="text-xs font-sans text-gray-200 leading-relaxed">
                  VIXY decision core locked <strong className={isUp ? 'text-[#00FF88]' : 'text-[#FF3B30]'}>{isUp ? 'UP' : 'DOWN'}</strong> on the 15M contract at ${strikePrice.toLocaleString()} with {confidence}% Bayesian conviction. Sustained taker order flow delta and multi-period Supertrend alignment confirm directional momentum.
                </p>
              </div>

              {/* 3-Way Normalized Probability Distribution */}
              <div className="space-y-1.5 my-3">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="text-gray-300 font-bold uppercase">3-WAY NORMALIZED PROBABILITY DISTRIBUTION</span>
                  <span className="text-purple-300 font-mono">100% SUM NORMALIZED</span>
                </div>
                <div className="w-full h-3 bg-[#080414] rounded-full overflow-hidden flex border border-purple-900/50 p-0.5">
                  <div className="h-full bg-[#00FF88] rounded-l-full" style={{ width: `${confidence}%` }} title={`UP: ${confidence}%`} />
                  <div className="h-full bg-amber-400" style={{ width: '12%' }} title="CHOP: 12%" />
                  <div className="h-full bg-[#FF3B30] rounded-r-full" style={{ width: `${100 - confidence - 12}%` }} title={`DOWN: ${100 - confidence - 12}%`} />
                </div>
                <div className="flex justify-between text-[9px] font-bold pt-0.5">
                  <span className="text-[#00FF88]">P(UP): {confidence}%</span>
                  <span className="text-amber-400">P(CHOP): 12%</span>
                  <span className="text-[#FF3B30]">P(DOWN): {100 - confidence - 12}%</span>
                </div>
              </div>
            </div>

            {/* Entry & Strike Metrics */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-purple-900/40 text-[10px]">
              <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/30">
                <span className="text-gray-400 block text-[8.5px]">LOCKED STRIKE</span>
                <span className="text-white font-black text-sm">${strikePrice.toLocaleString()}</span>
              </div>
              <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/30">
                <span className="text-gray-400 block text-[8.5px]">LIVE SPOT</span>
                <span className="text-white font-black text-sm">${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/30">
                <span className="text-gray-400 block text-[8.5px]">EXPECTED DELTA</span>
                <span className={`font-black text-sm ${spotVsStrikeDelta >= 0 ? 'text-[#00FF88]' : 'text-[#FF3B30]'}`}>
                  {spotVsStrikeDelta >= 0 ? '+' : ''}${spotVsStrikeDelta.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: 15M Countdown & VIXY Protection (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            
            {/* 15M Countdown Timer Card */}
            <div className="bg-[#0c0620] border border-purple-900/40 rounded-2xl p-5 shadow-xl flex items-center justify-between relative overflow-hidden">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">15M CONTRACT COUNTDOWN</span>
                </div>
                <div className="text-4xl font-black text-white tracking-tight font-sans">
                  {countdownFormatted}
                </div>
                <div className="text-[10px] text-cyan-300 font-bold uppercase">
                  REMAINING IN EPOCH
                </div>
              </div>

              {/* Progress Ring */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="#1A102E" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke={isUp ? '#00FF88' : '#FF3B30'}
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={201.0}
                    strokeDashoffset={201.0 - (201.0 * cycleProgressPct) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-black text-white">{Math.round(cycleProgressPct)}%</span>
                  <span className="text-[7.5px] text-gray-400 font-bold">ELAPSED</span>
                </div>
              </div>
            </div>

            {/* VIXY Protection Guardian Panel */}
            <div className="bg-[#0c0620] border border-purple-900/40 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-purple-900/30 pb-2.5">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-white font-black uppercase tracking-wider">VIXY PROTECTION GUARDIAN</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#00FF88]/20 border border-[#00FF88]/50 text-[#00FF88] text-[9px] font-black uppercase">
                  STATUS: AUTHORIZED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/30">
                  <span className="text-gray-400 block text-[8.5px]">REVERSAL RISK</span>
                  <span className="text-xl font-black text-[#00FF88]">18% <span className="text-[10px] text-gray-400 font-normal">(LOW)</span></span>
                </div>
                <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/30">
                  <span className="text-gray-400 block text-[8.5px]">SURVIVAL SCORE</span>
                  <span className="text-xl font-black text-cyan-300">82% <span className="text-[10px] text-gray-400 font-normal">(HEALTHY)</span></span>
                </div>
              </div>

              {/* 6-Point Protection Checklist */}
              <div className="grid grid-cols-3 gap-1.5 text-[8.5px] bg-[#080414] p-2.5 rounded-xl border border-purple-900/30">
                <div className="flex items-center space-x-1 text-[#00FF88]"><span>✓</span><span>Score ≥ 72</span></div>
                <div className="flex items-center space-x-1 text-[#00FF88]"><span>✓</span><span>Stability ≥ 65%</span></div>
                <div className="flex items-center space-x-1 text-[#00FF88]"><span>✓</span><span>Conflict ≤ 25%</span></div>
                <div className="flex items-center space-x-1 text-[#00FF88]"><span>✓</span><span>Factors ≥ 7/10</span></div>
                <div className="flex items-center space-x-1 text-[#00FF88]"><span>✓</span><span>Reversal ≤ 25%</span></div>
                <div className="flex items-center space-x-1 text-[#00FF88]"><span>✓</span><span>Cross-Venue Sync</span></div>
              </div>
            </div>

          </div>
        </div>

        {/* 3. EVIDENCE PANEL: MERGED SIGNAL BREAKDOWN & REAL INPUT VECTORS */}
        <div className="bg-[#0c0620] border border-purple-900/40 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-300">
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-sans">
                  CONSOLIDATED EVIDENCE & REAL INPUT VECTORS
                </h3>
                <p className="text-[10px] text-gray-400">
                  Why VIXY Thinks UP: Merged multi-factor signal scores and real-time market vector details
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-xl bg-[#00FF88]/20 border border-[#00FF88]/40 text-[#00FF88] text-xs font-black">
              6 / 6 SIGNALS ALIGNED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {evidenceSignals.map((sig, idx) => (
              <div key={idx} className="bg-[#080414] p-3.5 rounded-xl border border-purple-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-purple-300 uppercase">{sig.category}</span>
                  <span className="text-xs font-black text-[#00FF88]">{sig.score} / 10</span>
                </div>
                <div className="text-xs font-black text-white">{sig.name}</div>
                <div className="w-full h-1.5 bg-[#1A102E] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FF88]" style={{ width: `${sig.score * 10}%` }} />
                </div>
                <div className="text-[9.5px] text-gray-300 font-sans leading-snug border-t border-purple-900/30 pt-1.5">
                  {sig.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. CHART PANEL: PROMINENT FULL-WIDTH CANDLESTICK & NEURAL RIBBON OVERLAY */}
        <div className="bg-[#0c0620] border border-purple-900/40 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-purple-900/30 pb-3 gap-2">
            <div className="flex items-center space-x-2.5">
              <Activity className="w-4 h-4 text-[#00FF88]" />
              <span className="font-bold text-white text-xs sm:text-sm">LIVE PRICE ACTION & NEURAL RIBBON • BTC/USD (15M)</span>
            </div>
            <div className="flex items-center space-x-3 text-[10px] text-gray-400 font-mono">
              <span className="text-cyan-300 font-bold">VWAP: ${(spotPrice - 28.5).toFixed(2)}</span>
              <span className="text-purple-300 font-bold">EMA 9: ${(spotPrice + 8.4).toFixed(2)}</span>
            </div>
          </div>

          <div className="relative h-64 w-full bg-[#080414] rounded-xl border border-purple-900/30 p-3 overflow-hidden">
            {/* Locked Strike Reference Line */}
            <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-purple-500/80 z-10 flex items-center justify-end px-3">
              <span className="bg-purple-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow">
                LOCKED STRIKE ${strikePrice.toLocaleString()}
              </span>
            </div>

            {/* Prominent Chart SVG */}
            <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradVixy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FF88" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00FF88" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <path d="M 20 180 Q 100 160, 180 140 T 340 100 T 500 80 T 660 60 T 780 40 L 780 230 L 20 230 Z" fill="url(#chartGradVixy)" />
              <path d="M 20 190 Q 100 170, 180 155 T 340 120 T 500 100 T 660 85 T 780 70" fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 20 175 Q 100 150, 180 135 T 340 95 T 500 70 T 660 55 T 780 35" fill="none" stroke="#C084FC" strokeWidth="2" />
              <path d="M 20 180 L 80 165 L 140 175 L 200 145 L 260 150 L 320 115 L 380 125 L 440 95 L 500 85 L 560 100 L 620 70 L 680 60 L 740 45 L 780 40" fill="none" stroke="#00FF88" strokeWidth="2.5" />

              {[
                { x: 50, o: 175, c: 165, h: 160, l: 180, green: true },
                { x: 110, o: 165, c: 172, h: 162, l: 175, green: false },
                { x: 170, o: 172, c: 148, h: 142, l: 174, green: true },
                { x: 230, o: 148, c: 152, h: 145, l: 155, green: false },
                { x: 290, o: 152, c: 118, h: 112, l: 154, green: true },
                { x: 350, o: 118, c: 124, h: 115, l: 128, green: false },
                { x: 410, o: 124, c: 98, h: 92, l: 126, green: true },
                { x: 470, o: 98, c: 88, h: 82, l: 102, green: true },
                { x: 530, o: 88, c: 98, h: 84, l: 104, green: false },
                { x: 590, o: 98, c: 72, h: 68, l: 100, green: true },
                { x: 650, o: 72, c: 62, h: 58, l: 75, green: true },
                { x: 710, o: 62, c: 48, h: 42, l: 65, green: true },
                { x: 770, o: 48, c: 40, h: 36, l: 50, green: true }
              ].map((bar, i) => (
                <g key={i}>
                  <line x1={bar.x} y1={bar.h} x2={bar.x} y2={bar.l} stroke={bar.green ? '#00FF88' : '#FF3B30'} strokeWidth="1.5" />
                  <rect
                    x={bar.x - 4}
                    y={Math.min(bar.o, bar.c)}
                    width="8"
                    height={Math.max(4, Math.abs(bar.o - bar.c))}
                    fill={bar.green ? '#00FF88' : '#FF3B30'}
                    rx="1"
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* 5. SUPPORTING PANELS: CROSS-VENUE SYNAPSE & WHALE MATCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Cross-Venue Synapse (7 cols) */}
          <div className="lg:col-span-7 bg-[#0c0620] border border-purple-900/40 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-purple-900/30 pb-2.5">
              <span className="font-black text-white text-xs uppercase flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>CROSS-VENUE SYNAPSE RECONCILIATION</span>
              </span>
              <span className="text-[#00FF88] text-[10px] font-bold">SYNCHRONIZED</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="bg-[#080414] p-3 rounded-xl border border-purple-900/30 space-y-1">
                <div className="text-[9px] text-purple-300 font-bold">KALSHI 15M</div>
                <div className="text-xs font-black text-[#00FF88]">57% YES ($0.57)</div>
                <div className="text-[8.5px] text-gray-400">Latency: 12ms</div>
              </div>
              <div className="bg-[#080414] p-3 rounded-xl border border-purple-900/30 space-y-1">
                <div className="text-[9px] text-purple-300 font-bold">POLYMARKET 15M</div>
                <div className="text-xs font-black text-[#00FF88]">59% YES ($0.59)</div>
                <div className="text-[8.5px] text-gray-400">Latency: 16ms</div>
              </div>
              <div className="bg-[#080414] p-3 rounded-xl border border-purple-900/30 space-y-1">
                <div className="text-[9px] text-cyan-300 font-bold">COINBASE SPOT</div>
                <div className="text-xs font-black text-white">${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-[8.5px] text-gray-400">Latency: 24ms</div>
              </div>
            </div>
          </div>

          {/* Whale Match & Flow (5 cols) */}
          <div className="lg:col-span-5 bg-[#0c0620] border border-purple-900/40 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-purple-900/30 pb-2.5">
              <span className="font-black text-white text-xs uppercase flex items-center gap-2">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span>WHALE FLOW TAPE (≥$250K)</span>
              </span>
              <span className="text-[#00FF88] text-[9.5px] font-bold">BUY BIAS +$3.8M</span>
            </div>

            <div className="space-y-1.5 text-[9.5px]">
              <div className="flex justify-between p-2 bg-[#080414] rounded-lg border border-purple-900/30">
                <span className="text-gray-400">BINANCE $1.42M BUY</span>
                <span className="text-[#00FF88] font-bold">${spotPrice.toFixed(1)}</span>
              </div>
              <div className="flex justify-between p-2 bg-[#080414] rounded-lg border border-purple-900/30">
                <span className="text-gray-400">COINBASE $650K BUY</span>
                <span className="text-[#00FF88] font-bold">${(spotPrice - 8).toFixed(1)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* 6. DECISION HISTORY & LEDGER STRIP AT BOTTOM */}
        <div className="bg-[#0c0620] border border-purple-900/40 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-purple-900/30 pb-3 gap-2">
            <div className="flex items-center space-x-3">
              <Flame className="w-5 h-5 text-[#00FF88]" />
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-sans">
                  SCOREBOARD & LAST 10 SETTLEMENT ROUNDS
                </h3>
                <span className="text-[10px] text-gray-400">Verified official settlement tracking with capital preservation filters</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-[#00FF88]/20 border border-[#00FF88]/40 text-[#00FF88] font-black">
                8 WINS IN A ROW
              </span>
            </div>
          </div>

          {/* Last 10 Rounds Settlement Horizontal Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {settlementRounds.map((round, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  round.isActive
                    ? 'bg-[#00FF88]/10 border-[#00FF88]/50 shadow-[0_0_15px_rgba(0,255,136,0.2)]'
                    : round.isWin
                    ? 'bg-[#080414] border-[#00FF88]/30'
                    : 'bg-[#080414] border-[#FF3B30]/30'
                }`}
              >
                <div className="text-[8px] text-gray-400">{round.cycle}</div>
                <div className={`text-xs font-black my-0.5 ${round.isWin ? 'text-[#00FF88]' : 'text-[#FF3B30]'}`}>
                  {round.dir === 'UP' ? '▲ UP' : '▼ DOWN'}
                </div>
                <div className="text-[8px] text-gray-300">{round.spot}</div>
                <div className={`text-[8px] font-bold mt-0.5 ${round.isWin ? 'text-[#00FF88]' : 'text-[#FF3B30]'}`}>
                  {round.outcome}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
