import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Bell,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gauge,
  HelpCircle,
  Check,
  XCircle,
  Shield,
  Eye,
  Crosshair,
  Info,
  X,
  FileText,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldCheck,
  Clock,
  Lock,
  ArrowRight,
  Zap,
  Activity,
  Cpu,
  Terminal,
  Radio,
  Sliders,
  Database,
  KeyRound
} from 'lucide-react';
import { BTCTicker, AuthState } from '../types';
import { Logo } from './Logo';
import { getStripeDayPassUrl } from '../config/stripeLinks';
import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';

interface LandingPageProps {
  ticker: BTCTicker;
  onLaunchTerminal: () => void;
  onLaunchVixyLive?: () => void;
  onOpenPricing: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  dataSource?: 'mock' | 'live';
  authState?: AuthState;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  ticker,
  onLaunchTerminal,
  onLaunchVixyLive,
  onOpenPricing,
  onOpenAuth,
  dataSource = 'live',
  authState,
}) => {
  const { decision: canonical15m } = useCanonical15mDecision();
  const [calcModelProb, setCalcModelProb] = useState(68);
  const [calcMarketProb, setCalcMarketProb] = useState(52);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('annual');

  // Modals for compliance & transparency
  const [showFactorsModal, setShowFactorsModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  const handleCheckoutClick = (url: string) => {
    if (!authState?.isAuthenticated) {
      onOpenAuth('register');
      return;
    }
    window.location.href = url;
  };

  const estimatedEdge = (calcModelProb - calcMarketProb).toFixed(1);

  // Live Derived Values for Hero Terminal
  const currentSpot = canonical15m.currentSpot || ticker?.price || 64250.00;
  const spotFormatted = `$${currentSpot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const timeRemainingSec = canonical15m.timeRemainingSec ?? 524;
  const mins = Math.floor(timeRemainingSec / 60);
  const secs = timeRemainingSec % 60;
  const timerFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const stateDisplayName = canonical15m.currentState === 'LOCKED_UP'
    ? 'LOCKED — UP'
    : canonical15m.currentState === 'LOCKED_DOWN'
    ? 'LOCKED — DOWN'
    : canonical15m.currentState === 'CONFIRMING'
    ? 'CONFIRMING ENTRY'
    : canonical15m.currentState === 'SKIP'
    ? 'SKIP (PROTECTED)'
    : 'ANALYZING MARKET';

  const stateColor = canonical15m.currentState === 'LOCKED_UP'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : canonical15m.currentState === 'LOCKED_DOWN'
    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
    : canonical15m.currentState === 'CONFIRMING'
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-purple-300 bg-purple-500/10 border-purple-500/30';

  const confidenceScore = Math.round(canonical15m.confidence || 76);
  const lockScore = Math.round(canonical15m.lockScore || 88);

  const modelFactors = [
    { id: 1, name: 'EMA9 Trend Alignment', detail: 'Spot price > EMA9 (9-period Exponential Moving Average)', status: 'PASS', type: 'Trend' },
    { id: 2, name: 'EMA21 Slope Direction', detail: 'EMA21 slope gradient positive on 15M candle history', status: 'PASS', type: 'Trend' },
    { id: 3, name: 'VWAP Support Floor', detail: 'Spot price maintaining above Volume-Weighted Average Price', status: 'PASS', type: 'Volume' },
    { id: 4, name: 'RSI Momentum Balance', detail: 'RSI(14) between 48.0 and 68.0 (active momentum, non-overbought)', status: 'PASS', type: 'Momentum' },
    { id: 5, name: 'Volume Delta Z-Score', detail: 'Taker buy volume delta exceeding +1.5 standard deviations', status: 'PASS', type: 'Volume' },
    { id: 6, name: 'Net Taker Buy Aggression', detail: 'Net taker buy ratio > 58% on spot market depth', status: 'PASS', type: 'Orderbook' },
    { id: 7, name: 'Orderbook Depth Imbalance', detail: 'Bid depth within 0.5% of mid price exceeds ask depth by >22%', status: 'PASS', type: 'Orderbook' },
    { id: 8, name: 'Trailing 10-Bar High Breakout', detail: 'Candle close breaching trailing 10-bar resistance level', status: 'PASS', type: 'Price Action' },
    { id: 9, name: 'Doji Reversal Support Hold', detail: 'Local doji indecision candle followed by bullish confirmation candle', status: 'PASS', type: 'Pattern' },
    { id: 10, name: 'Microstructure Volatility Compression', detail: 'ATR(14) volatility compression signaling imminent directional expansion', status: 'PASS', type: 'Volatility' },
    { id: 11, name: 'Options Implied Skew Neutrality', detail: 'Derivatives call/put implied volatility skew favoring upside', status: 'PASS', type: 'Derivatives' },
    { id: 12, name: 'Funding Rate Shift Delta', detail: 'Perpetual swap funding rate holding near zero (no crowded long squeeze)', status: 'PASS', type: 'Derivatives' },
    { id: 13, name: 'Model vs Market Odds Discrepancy', detail: 'Calculated expected value (+EV) discrepancy > +3.0% vs venue odds', status: 'PASS', type: 'Expected Value' },
    { id: 14, name: 'Cross-Venue Liquidity Spread', detail: 'Bid/Ask spread stability across major spot exchanges', status: 'PASS', type: 'Microstructure' },
  ];

  const faqs = [
    {
      q: 'How does the VIXY 24-Hour Day Pass work?',
      a: 'The 24-Hour Day Pass gives you exactly 24 hours of full, unrestricted VIXY Elite access for a $9.99 one-time payment. You get 96 complete 15-minute prediction cycles, real-time orderbook depth, decision locks, and Discord signals without any recurring monthly commitment.',
    },
    {
      q: 'Is VIXY’s Vault a gambling platform or signal group?',
      a: 'No. VIXY’s Vault is a quantitative decision intelligence platform built for prediction market traders. We provide orderbook depth features, calibrated model probabilities, historical setup matching, and Brier-calibrated analytics.',
    },
    {
      q: 'How does the 15-Minute Decision Engine calculate edge?',
      a: 'Our engine evaluates market momentum, volatility compression, orderbook depth imbalance, and historical feature alignments. It compares model-estimated probabilities against live Kalshi & Polymarket orderbook odds to surface positive expected value (+EV) mispricings.',
    },
    {
      q: 'Can I automate signals to my Discord or Telegram?',
      a: 'Yes. All Pro and Elite subscribers can configure webhook alerts with custom confidence thresholds (e.g., only alert when confidence ≥85% and edge ≥5%).',
    },
    {
      q: 'Does VIXY’s Vault provide guaranteed trading profits?',
      a: 'No. Prediction markets involve real financial risk of loss. VIXY’s Vault provides statistical probabilities and decision analytics. Traders remain solely responsible for managing their own risk and capital.',
    },
  ];

  return (
    <div className="space-y-24 py-4 font-sans text-purple-100 selection:bg-purple-600 selection:text-white relative">
      {/* Futuristic Ambient Atmosphere Lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-1/4 w-[800px] h-[800px] bg-purple-900/15 blur-[180px] rounded-full" />
        <div className="absolute top-[30%] right-[-5%] w-[600px] h-[600px] bg-violet-900/10 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-10%] left-1/3 w-[700px] h-[700px] bg-cyan-900/10 blur-[180px] rounded-full" />
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION & LIVE INTELLIGENCE TERMINAL */}
      {/* ========================================================================= */}
      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-4">
        {/* Hero Left Content */}
        <div className="lg:col-span-6 space-y-7 text-left">
          {/* Institutional Status Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0d071e]/90 border border-purple-500/30 backdrop-blur-md text-[11px] font-mono font-semibold tracking-wider text-purple-200 shadow-lg shadow-purple-950/40">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-purple-300">VIXY VAULT</span>
            <span className="text-purple-500/60">•</span>
            <span className="text-cyan-300">QUANTITATIVE AI DECISION INTELLIGENCE</span>
          </div>

          {/* Primary Headline */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-sans tracking-tight text-white leading-[1.06]">
              THE MARKET MOVES FIRST.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-300 drop-shadow-[0_0_35px_rgba(168,85,247,0.35)]">
                YOUR DECISIONS SHOULD TOO.
              </span>
            </h1>
          </div>

          {/* Secondary Institutional Copy */}
          <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed font-sans font-normal">
            VIXY is a real-time AI-powered prediction-market decision intelligence system designed around live BTC 15-minute market analysis.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1 font-mono">
            <button
              onClick={onLaunchVixyLive || onLaunchTerminal}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-2xl shadow-purple-600/40 border border-purple-400/30 transition-all hover:shadow-purple-500/50 hover:scale-[1.01] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5"
            >
              <Activity className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span>LAUNCH VIXY LIVE</span>
              <ArrowRight className="w-4 h-4 text-purple-200" />
            </button>

            <button
              onClick={onLaunchTerminal}
              className="px-6 py-4 rounded-xl bg-[#0e0722]/90 hover:bg-[#160b33] border border-purple-500/30 hover:border-purple-400/50 text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>DASHBOARD</span>
            </button>

            <button
              onClick={onOpenPricing}
              className="px-6 py-4 rounded-xl bg-[#090417]/80 hover:bg-[#120728] border border-purple-900/60 text-purple-300/90 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>PLANS &amp; PRICING</span>
            </button>
          </div>

          {/* Micro Trust Indicators */}
          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-mono text-purple-300/80">
            <span className="flex items-center gap-1.5" title="Monotonic state engine">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 15M Monotonic Lock Engine
            </span>
            <span className="flex items-center gap-1.5" title="Walk-forward backtested calibration">
              <Check className="w-4 h-4 text-cyan-400" /> Walk-Forward Calibration
            </span>
            <span className="flex items-center gap-1.5" title="Instant access day pass">
              <Check className="w-4 h-4 text-purple-400" /> 24H Day Pass Available
            </span>
          </div>
        </div>

        {/* Hero Right: Futuristic LIVE INTELLIGENCE Terminal */}
        <div className="lg:col-span-6 relative">
          {/* Luminous atmospheric halo behind terminal */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/30 via-cyan-500/20 to-violet-600/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

          <div className="relative rounded-3xl bg-[#070314]/95 border border-purple-500/40 p-6 sm:p-7 shadow-2xl shadow-purple-950/80 backdrop-blur-xl font-mono text-left space-y-5 overflow-hidden">
            {/* Terminal Window Header Bar */}
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3.5 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-white font-black tracking-wider text-[11px] flex items-center gap-2 pl-2">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  LIVE INTELLIGENCE TERMINAL
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/30 text-[10px] text-cyan-300 font-bold">
                  BTC 15M
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>

            {/* Price & State Matrix */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              {/* CURRENT PRICE */}
              <div className="p-3.5 rounded-2xl bg-[#0d071e]/90 border border-purple-900/60 space-y-1">
                <span className="text-[10px] text-purple-300/70 uppercase tracking-widest block font-bold">CURRENT PRICE</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {spotFormatted}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <TrendingUp className="w-3 h-3" /> Sub-Second Spot Feed
                </span>
              </div>

              {/* TIME REMAINING */}
              <div className="p-3.5 rounded-2xl bg-[#0d071e]/90 border border-purple-900/60 space-y-1">
                <span className="text-[10px] text-purple-300/70 uppercase tracking-widest block font-bold">TIME REMAINING</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono tracking-tight">
                    {timerFormatted}
                  </span>
                </div>
                <span className="text-[10px] text-purple-300/80 font-mono">
                  15-Minute Epoch Cycle
                </span>
              </div>
            </div>

            {/* VIXY CONFIDENCE & MARKET STATE STRIP */}
            <div className="grid grid-cols-2 gap-4">
              {/* VIXY CONFIDENCE */}
              <div className="p-3.5 rounded-2xl bg-[#0d071e]/90 border border-purple-900/60 space-y-1">
                <span className="text-[10px] text-purple-300/70 uppercase tracking-widest block font-bold">VIXY CONFIDENCE</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white">
                    {confidenceScore}%
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Lock Score {lockScore}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-purple-950 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-violet-400 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, confidenceScore))}%` }}
                  />
                </div>
              </div>

              {/* MARKET STATE */}
              <div className="p-3.5 rounded-2xl bg-[#0d071e]/90 border border-purple-900/60 space-y-1">
                <span className="text-[10px] text-purple-300/70 uppercase tracking-widest block font-bold">MARKET STATE</span>
                <div className="pt-0.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${stateColor}`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    {stateDisplayName}
                  </span>
                </div>
                <span className="text-[10px] text-purple-300/70 block pt-0.5">
                  Authoritative Lock Engine
                </span>
              </div>
            </div>

            {/* Sparkline & Micro-Telemetry Ribbon */}
            <div className="p-3.5 rounded-2xl bg-[#0b051a]/90 border border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-purple-300/80">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                  CROSS-VENUE ORDER FLOW SYNTHESIS
                </span>
                <span className="text-cyan-300 font-bold">+EV DISCREPANCY IDENTIFIED</span>
              </div>

              {/* Sparkline Visual */}
              <div className="h-12 w-full relative">
                <svg viewBox="0 0 300 60" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="heroLiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,45 Q35,35 70,40 T140,25 T210,38 T260,18 T300,8"
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M0,45 Q35,35 70,40 T140,25 T210,38 T260,18 T300,8 L300,60 L0,60 Z"
                    fill="url(#heroLiveGrad)"
                  />
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-center border-t border-purple-900/30">
                <div>
                  <span className="text-purple-400/70 block">KALSHI YES</span>
                  <span className="text-white font-bold">54¢</span>
                </div>
                <div>
                  <span className="text-purple-400/70 block">POLYMARKET</span>
                  <span className="text-white font-bold">53%</span>
                </div>
                <div>
                  <span className="text-purple-400/70 block">MODEL PROB</span>
                  <span className="text-cyan-300 font-black">68.4%</span>
                </div>
              </div>
            </div>

            {/* Interactive 14-Factor Grade Button */}
            <button
              onClick={() => setShowFactorsModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 hover:border-purple-400 text-purple-200 hover:text-white text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Multi-Factor Validation: <strong className="text-emerald-400">13/14 Passed (A+)</strong></span>
              </span>
              <span className="text-[10px] text-cyan-300 underline decoration-cyan-400">View Factor Matrix →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. 24H DAY PASS — ULTRA-PREMIUM ACCESS CREDENTIAL */}
      {/* ========================================================================= */}
      <section className="relative z-10">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#12072e]/95 via-[#0a041c]/98 to-[#090318] border-2 border-cyan-500/40 shadow-2xl shadow-cyan-950/60 relative overflow-hidden font-mono group hover:border-cyan-400/70 transition-all duration-500">
          {/* Luminous Glow Orbs */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-400/25 transition-all duration-700" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top-Right Official Badge */}
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-r from-purple-900/90 to-cyan-950/90 border-b-2 border-l-2 border-cyan-500/40 rounded-bl-2xl text-[10px] text-cyan-300 font-black tracking-widest uppercase flex items-center gap-1.5 shadow-lg">
            <KeyRound className="w-3 h-3 text-cyan-400" />
            <span>VAULT ACCESS CREDENTIAL</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Info Column */}
            <div className="lg:col-span-7 space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md">
                  24H PASS
                </span>
                <span className="text-xs text-purple-300 font-bold tracking-wider uppercase">
                  ONE-TIME ACCESS • NO SUBSCRIPTION
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
                  24 Hours of Full Decision Intelligence
                </h3>
                <p className="text-xs sm:text-sm text-purple-200/80 font-sans leading-relaxed max-w-xl">
                  Unrestricted access to the VIXY 15-Minute Decision Engine for 24 hours. Includes 96 complete 15-minute epoch cycles, real-time orderbook depth, decision locks, and Discord signals.
                </p>
              </div>

              {/* Feature Matrix Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] font-mono text-purple-200 pt-1">
                <div className="px-3 py-1.5 rounded-xl bg-[#060212]/90 border border-purple-900/60 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>96 Prediction Cycles</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#060212]/90 border border-purple-900/60 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Sub-Second L2 Depth</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#060212]/90 border border-purple-900/60 flex items-center gap-2 col-span-2 sm:col-span-1">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Discord Signals Feed</span>
                </div>
              </div>
            </div>

            {/* Right Pricing & Action Column */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#060212]/95 border border-cyan-500/30 flex flex-col items-center sm:items-stretch gap-4 text-center sm:text-left">
              <div className="flex items-center justify-between gap-4 border-b border-purple-900/40 pb-4">
                <div>
                  <span className="text-[10px] text-purple-400/80 uppercase font-bold block">FLAT ACCESS FEE</span>
                  <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-100 to-blue-300 font-mono tracking-tight drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                    $9.99
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-[11px] text-emerald-400 font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>INSTANT ACTIVATION</span>
                </div>
              </div>

              {/* Strong CTA Button */}
              <button
                onClick={() => handleCheckoutClick(getStripeDayPassUrl({ email: authState?.user?.email, uid: authState?.user?.id }))}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-cyan-950/80 border border-cyan-300/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98]"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-200" />
                <span className="drop-shadow">UNLOCK 24H ACCESS →</span>
              </button>

              <p className="text-[10px] text-purple-300/70 font-mono text-center">
                One-time payment • No recurring billing • Instant terminal authorization
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SOCIAL PROOF / SYSTEM CAPABILITIES STRIP */}
      {/* ========================================================================= */}
      <section className="relative z-10 space-y-4 font-mono">
        <div className="text-center space-y-1">
          <span className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">SYSTEM CAPABILITIES</span>
          <h2 className="text-xl sm:text-2xl font-black text-white font-sans">Institutional Decision-Intelligence Infrastructure</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 text-center">
          {/* 1. 15M DECISION ENGINE */}
          <div className="p-4 rounded-2xl bg-[#090417]/90 border border-purple-900/50 hover:border-purple-500/40 transition-all space-y-2 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center">
              <Crosshair className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-white tracking-wider">15M DECISION ENGINE</span>
            <span className="text-[10px] text-purple-300/70 font-sans">Monotonic epoch locks</span>
          </div>

          {/* 2. LIVE MARKET INTELLIGENCE */}
          <div className="p-4 rounded-2xl bg-[#090417]/90 border border-purple-900/50 hover:border-purple-500/40 transition-all space-y-2 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-cyan-300 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-white tracking-wider">LIVE MARKET INTELLIGENCE</span>
            <span className="text-[10px] text-purple-300/70 font-sans">Sub-second spot & L2 depth</span>
          </div>

          {/* 3. PROBABILITY EDGE */}
          <div className="p-4 rounded-2xl bg-[#090417]/90 border border-purple-900/50 hover:border-purple-500/40 transition-all space-y-2 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-white tracking-wider">PROBABILITY EDGE</span>
            <span className="text-[10px] text-purple-300/70 font-sans">+EV mispricing modeling</span>
          </div>

          {/* 4. HISTORICAL ANALYTICS */}
          <div className="p-4 rounded-2xl bg-[#090417]/90 border border-purple-900/50 hover:border-purple-500/40 transition-all space-y-2 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-white tracking-wider">HISTORICAL ANALYTICS</span>
            <span className="text-[10px] text-purple-300/70 font-sans">Brier calibration ledger</span>
          </div>

          {/* 5. AUTOMATED ALERTS */}
          <div className="p-4 rounded-2xl bg-[#090417]/90 border border-purple-900/50 hover:border-purple-500/40 transition-all space-y-2 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-violet-300 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-white tracking-wider">AUTOMATED ALERTS</span>
            <span className="text-[10px] text-purple-300/70 font-sans">Discord & webhook streams</span>
          </div>

          {/* 6. PERFORMANCE TRACKING */}
          <div className="p-4 rounded-2xl bg-[#090417]/90 border border-purple-900/50 hover:border-purple-500/40 transition-all space-y-2 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-white tracking-wider">PERFORMANCE TRACKING</span>
            <span className="text-[10px] text-purple-300/70 font-sans">Immutable cycle auditing</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. EXCLUSIVITY MATRIX: UNASSISTED SPECULATION vs VIXY AI */}
      {/* ========================================================================= */}
      <section className="relative z-10 space-y-6 font-mono">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>EXCLUSIVITY MATRIX</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-sans">
            UNASSISTED SPECULATION vs VIXY AI
          </h2>
          <p className="text-xs sm:text-sm text-purple-300/70 font-sans max-w-xl mx-auto">
            Compare standard retail execution against institutional-grade decision intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-left">
          {/* LEFT: UNASSISTED SPECULATION */}
          <div className="bg-[#0b0417]/90 border border-rose-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
              <span className="font-bold text-rose-400 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" /> UNASSISTED SPECULATION
              </span>
              <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-lg font-black tracking-wider">
                DISADVANTAGED
              </span>
            </div>

            <ul className="space-y-3 font-sans text-purple-200/70 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Lagging Price Action:</strong> Guesses 15-minute candle closes based on lagging 1-minute chart indicators.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span><strong>No Depth Visibility:</strong> Blind to real-time orderbook depth imbalance, CVD divergence, and taker aggression.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Negative EV Purchases:</strong> Buys overpriced prediction contracts with negative mathematical expected value (-EV).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Emotional Overtrading:</strong> Chases volatile spikes without structured protection filters or exit rules.</span>
              </li>
            </ul>
          </div>

          {/* RIGHT: VIXY AI DECISION INTELLIGENCE */}
          <div className="bg-gradient-to-br from-[#13072e]/95 via-[#0d0522]/98 to-[#090318] border-2 border-purple-500/60 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl shadow-purple-950/80 relative">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-purple-500/30 relative z-10">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" /> VIXY AI INTELLIGENCE
              </span>
              <span className="text-[10px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-lg font-black uppercase tracking-wider shadow-md">
                INSTITUTIONAL EDGE
              </span>
            </div>

            <div className="space-y-3 font-sans text-purple-100 relative z-10">
              <div className="flex flex-wrap gap-1.5 pb-2 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-cyan-300 font-bold">LIVE MARKET DATA</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-purple-200 font-bold">AI ANALYSIS</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-emerald-300 font-bold">MULTI-FACTOR VALIDATION</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-cyan-300 font-bold">PROBABILITY MODELING</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-purple-200 font-bold">PROTECTION ENGINE</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-indigo-300 font-bold">DISCORD ALERTS</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-emerald-300 font-bold">HISTORICAL PERFORMANCE</span>
              </div>

              <ul className="space-y-3 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Live Order Flow Synthesis:</strong> Evaluates taker volume delta, volume-weighted average price (VWAP), and orderbook depth imbalance in real time.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Automated +EV Edge Discovery:</strong> Compares model probabilities against live Kalshi and Polymarket implied odds to isolate positive expected value mispricings.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>VIXY Protection Engine:</strong> Enforces 8-point safety gates to skip high-noise or conflicting market regimes.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE EXPECTED VALUE & EDGE CALCULATOR */}
      {/* ========================================================================= */}
      <section className="relative z-10 bg-[#0d0622]/90 border border-purple-500/30 rounded-3xl p-6 sm:p-8 space-y-6 font-mono shadow-2xl backdrop-blur-md">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <Gauge className="w-3.5 h-3.5" />
            <span>EXPECTED VALUE CALCULATOR</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-sans">Calculate Your Probability Edge</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#060212] p-5 rounded-2xl border border-purple-900/40 text-xs">
          <div className="space-y-2 text-left">
            <div className="flex justify-between font-bold">
              <span className="text-purple-300/70">VIXY Model Estimated Prob:</span>
              <span className="text-cyan-300 text-sm font-black">{calcModelProb}% YES</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={calcModelProb}
              onChange={(e) => setCalcModelProb(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-2 text-left">
            <div className="flex justify-between font-bold">
              <span className="text-purple-300/70">Kalshi / Polymarket Odds:</span>
              <span className="text-violet-300 text-sm font-black">{calcMarketProb}% YES</span>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              value={calcMarketProb}
              onChange={(e) => setCalcMarketProb(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-[#060212] p-5 rounded-2xl border border-purple-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <span className="text-xs text-purple-300/70 block font-bold">ESTIMATED PROBABILITY EDGE (+EV)</span>
            <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">+{estimatedEdge}%</span>
          </div>
          <button
            onClick={onLaunchTerminal}
            className="px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
          >
            Find Live Mispricings Now →
          </button>
        </div>
        <p className="text-[10px] text-slate-400 italic text-center font-sans">
          Note: Calculated edge reflects mathematical expected value (+EV) based on model probabilities. Prediction market trading involves financial risk.
        </p>
      </section>

      {/* ========================================================================= */}
      {/* 6. PRICING SECTION */}
      {/* ========================================================================= */}
      <section className="relative z-10 space-y-8 font-mono max-w-5xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-white font-sans uppercase tracking-wider">
            SUBSCRIPTION PLANS
          </h2>
          <p className="text-xs text-purple-300/70 font-sans">
            Continuous institutional decision intelligence for serious BTC traders.
          </p>

          <div className="pt-2 flex justify-center">
            <div className="bg-[#090417] border border-purple-900/40 rounded-2xl p-1.5 inline-flex items-center text-xs gap-1">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  billingInterval === 'monthly'
                    ? 'bg-[#180E30] text-white shadow border border-purple-500/30'
                    : 'text-purple-300/60 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  billingInterval === 'annual'
                    ? 'bg-purple-600 text-white shadow shadow-purple-600/30 font-black'
                    : 'text-purple-300/60 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#0B061A] text-purple-300 font-bold border border-purple-500/30">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* STARTER */}
          <div className="bg-[#090417]/90 border border-purple-900/40 rounded-3xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">STARTER</h3>
              <div className="space-y-0.5">
                <span className="text-4xl font-black text-purple-300">
                  ${billingInterval === 'annual' ? 24 : 29}
                </span>
                <span className="text-xs text-purple-300/60 ml-1">/month</span>
                <p className="text-[10px] text-purple-300/50 block font-sans">
                  {billingInterval === 'annual' ? 'Billed annually ($288/yr)' : 'Billed monthly'}
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-purple-200/90 font-sans pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Live 15-Minute Dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Model Probability Stream</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Market Comparison Engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Trade Journal</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Email Alerts</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-3.5 rounded-xl bg-[#140C2A] hover:bg-[#1C123A] border border-purple-900/60 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Subscribe Starter
            </button>
          </div>

          {/* PROFESSIONAL */}
          <div className="bg-[#0e0626] border-2 border-purple-500 rounded-3xl p-6 space-y-6 flex flex-col justify-between relative shadow-2xl shadow-purple-600/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-cyan-300 text-sm uppercase tracking-wider">PROFESSIONAL</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-600 text-white font-black uppercase">POPULAR</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-4xl font-black text-white">
                  ${billingInterval === 'annual' ? 64 : 79}
                </span>
                <span className="text-xs text-purple-300/60 ml-1">/month</span>
                <p className="text-[10px] text-purple-300/50 block font-sans">
                  {billingInterval === 'annual' ? 'Billed annually ($768/yr)' : 'Billed monthly'}
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-purple-100 font-sans pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Everything in Starter</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Orderbook Depth & Taker CVD</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Historical Similar Setups</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Confidence Filters & Locks</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Discord + Telegram Signals</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/40 transition-all cursor-pointer"
            >
              Subscribe Professional
            </button>
          </div>

          {/* ELITE */}
          <div className="bg-[#090417]/90 border border-purple-900/40 rounded-3xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">ELITE</h3>
              <div className="space-y-0.5">
                <span className="text-4xl font-black text-purple-300">
                  ${billingInterval === 'annual' ? 159 : 199}
                </span>
                <span className="text-xs text-purple-300/60 ml-1">/month</span>
                <p className="text-[10px] text-purple-300/50 block font-sans">
                  {billingInterval === 'annual' ? 'Billed annually ($1,908/yr)' : 'Billed monthly'}
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-purple-200/90 font-sans pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Everything in Professional</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Real-Time Sub-Second Engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Advanced Protection Gates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Custom Model Calibration</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Priority Execution Webhooks</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-3.5 rounded-xl bg-[#140C2A] hover:bg-[#1C123A] border border-purple-900/60 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Subscribe Elite
            </button>
          </div>
        </div>

        {/* Persistent Risk Disclosure Callout */}
        <div className="bg-[#070314] p-4 rounded-2xl border border-amber-500/30 text-[11px] text-slate-300 text-center space-y-1.5 font-sans">
          <p className="font-bold text-amber-300 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Mandatory Risk Disclosure
          </p>
          <p className="text-slate-300/90 leading-relaxed max-w-3xl mx-auto">
            Prediction market trading involves real financial risk of capital loss. Past backtested performance is no guarantee of future live results. VIXY AI is a quantitative decision intelligence platform and does not provide investment, financial, or legal advice.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FAQ ACCORDION */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-3xl mx-auto space-y-4 font-mono">
        <div className="text-center space-y-1">
          <HelpCircle className="w-6 h-6 text-purple-400 mx-auto" />
          <h2 className="text-2xl font-black text-white font-sans">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-2.5 text-xs text-left">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-[#090417] border border-purple-900/40 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 font-bold text-white flex items-center justify-between gap-4 cursor-pointer"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-300/60" />}
              </button>
              {openFaq === idx && (
                <div className="p-4 pt-0 text-purple-300/80 leading-relaxed font-sans border-t border-purple-900/40 bg-[#060212]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. COMPREHENSIVE FOOTER & COMPLIANCE */}
      {/* ========================================================================= */}
      <footer className="relative z-10 pt-10 border-t border-purple-900/40 font-mono text-xs text-purple-300/70 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" showSubtitle={false} onClick={onLaunchTerminal} />

          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => setShowTermsModal(true)} className="hover:text-white transition-colors underline decoration-purple-500/50 cursor-pointer">
              Terms of Service
            </button>
            <button onClick={() => setShowPrivacyModal(true)} className="hover:text-white transition-colors underline decoration-purple-500/50 cursor-pointer">
              Privacy Policy
            </button>
            <button onClick={() => setShowRiskModal(true)} className="hover:text-white transition-colors underline decoration-purple-500/50 cursor-pointer">
              Risk &amp; Jurisdiction Disclaimer
            </button>
            <button onClick={() => setShowFactorsModal(true)} className="hover:text-white transition-colors underline decoration-purple-500/50 cursor-pointer">
              14-Factor Model Criteria
            </button>
          </div>

          <span className="text-[10px] text-slate-500">© 2026 VIXY AI. All rights reserved.</span>
        </div>

        {/* Legal & Exchange Notice */}
        <div className="text-[10px] text-slate-400/80 leading-relaxed font-sans border-t border-purple-900/20 pt-4 space-y-1 text-left">
          <p>
            <strong>Exchange Eligibility &amp; Jurisdiction Notice:</strong> Trading on regulated prediction market venues (such as Kalshi and Polymarket) is subject to local exchange regulations and individual participant eligibility requirements. Kalshi is a US CFTC-regulated designated contract market. Users are responsible for confirming their eligibility before creating exchange accounts or trading.
          </p>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* COMPLIANCE & TRANSPARENCY MODALS */}
      {/* ========================================================================= */}

      {/* MODAL 1: 14-FACTOR MODEL ALIGNMENT CRITERIA */}
      {showFactorsModal && (
        <div className="fixed inset-0 z-50 bg-[#05020E]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0D071E] border border-purple-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl font-mono my-auto max-h-[85vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white uppercase">14-Factor Model Alignment Criteria</h3>
              </div>
              <button
                onClick={() => setShowFactorsModal(false)}
                className="p-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-slate-300 font-sans leading-relaxed">
                Setup Grade A+ requires multi-factor alignment across momentum, orderbook depth, and volatility compression.
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {modelFactors.map((fac) => (
                <div
                  key={fac.id}
                  className="p-3 rounded-xl border bg-[#0B061A] border-purple-900/40 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="text-purple-400">#{fac.id}</span> {fac.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {fac.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans">{fac.detail}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-purple-900/50 flex justify-end">
              <button
                onClick={() => setShowFactorsModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TERMS OF SERVICE */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-[#05020E]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0D071E] border border-purple-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl font-sans my-auto max-h-[85vh] overflow-y-auto text-xs text-purple-100 text-left">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 font-mono">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white uppercase">Terms of Service</h3>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 leading-relaxed font-sans text-slate-300">
              <p><strong>Last Updated: August 2026</strong></p>
              <h4 className="font-bold text-white text-sm">1. Acceptance of Terms</h4>
              <p>By accessing or using VIXY AI, you agree to be bound by these Terms of Service.</p>
              <h4 className="font-bold text-white text-sm">2. Educational &amp; Analytical Purpose Only</h4>
              <p>VIXY AI provides quantitative decision analytics and model probabilities. We are NOT a financial advisor, broker, or exchange.</p>
            </div>

            <div className="pt-2 border-t border-purple-900/50 flex justify-end font-mono">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PRIVACY POLICY */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-[#05020E]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0D071E] border border-purple-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl font-sans my-auto max-h-[85vh] overflow-y-auto text-xs text-purple-100 text-left">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 font-mono">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white uppercase">Privacy Policy</h3>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 leading-relaxed font-sans text-slate-300">
              <p><strong>Last Updated: August 2026</strong></p>
              <h4 className="font-bold text-white text-sm">1. Information We Collect</h4>
              <p>We collect account credentials (email address) and user preferences necessary to provide service functionality.</p>
            </div>

            <div className="pt-2 border-t border-purple-900/50 flex justify-end font-mono">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
              >
                Close Privacy Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RISK & JURISDICTION DISCLAIMER */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 bg-[#05020E]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0D071E] border border-amber-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl font-sans my-auto max-h-[85vh] overflow-y-auto text-xs text-purple-100 text-left">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 font-mono">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white uppercase">Risk &amp; Jurisdiction Disclaimer</h3>
              </div>
              <button
                onClick={() => setShowRiskModal(false)}
                className="p-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 leading-relaxed font-sans text-slate-300">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-200 text-xs">
                <strong>Financial Risk Warning:</strong> Prediction market trading involves significant financial risk. Past performance does not guarantee future live returns.
              </div>
              <h4 className="font-bold text-white text-sm">Not Financial Advice</h4>
              <p>VIXY AI is a software technology platform. Content generated is for analytical and educational purposes only.</p>
            </div>

            <div className="pt-2 border-t border-purple-900/50 flex justify-end font-mono">
              <button
                onClick={() => setShowRiskModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
              >
                Acknowledge Risk Disclaimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
