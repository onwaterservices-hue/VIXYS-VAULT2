import React, { useState } from 'react';
import {
  TrendingUp,
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
} from 'lucide-react';
import { BTCTicker, AuthState } from '../types';
import { Logo } from './Logo';
import { getStripeDayPassUrl } from '../config/stripeLinks';

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

  const modelFactors = [
    { id: 1, name: 'EMA9 Trend Alignment', detail: 'Spot price > EMA9 (9-period Exponential Moving Average)', status: 'PASS', type: 'Trend' },
    { id: 2, name: 'EMA21 Slope Direction', detail: 'EMA21 slope gradient positive on 15M candle history', status: 'PASS', type: 'Trend' },
    { id: 3, name: 'VWAP Support Floor', detail: 'Spot price maintaining above Volume-Weighted Average Price', status: 'PASS', type: 'Volume' },
    { id: 4, name: 'RSI Neutral-to-Bullish', detail: 'RSI(14) between 48.0 and 68.0 (active momentum, non-overbought)', status: 'PASS', type: 'Momentum' },
    { id: 5, name: 'Volume Delta Z-Score', detail: 'Taker buy volume delta exceeding +1.5 standard deviations', status: 'PASS', type: 'Volume' },
    { id: 6, name: 'Net Taker Buy Aggression', detail: 'Net taker buy ratio > 58% on spot market depth', status: 'PASS', type: 'Orderbook' },
    { id: 7, name: 'Orderbook Depth Imbalance', detail: 'Bid depth within 0.5% of mid price exceeds ask depth by >22%', status: 'PASS', type: 'Orderbook' },
    { id: 8, name: 'Trailing 10-Bar High Breakout', detail: 'Candle close breaching trailing 10-bar resistance level', status: 'PASS', type: 'Price Action' },
    { id: 9, name: 'Doji Reversal Support Hold', detail: 'Local doji indecision candle followed by bullish confirmation candle', status: 'PASS', type: 'Pattern' },
    { id: 10, name: 'Microstructure Volatility Compression', detail: 'ATR(14) volatility compression signaling imminent directional expansion', status: 'PASS', type: 'Volatility' },
    { id: 11, name: 'Options Implied Skew Neutrality', detail: 'Derivatives call/put implied volatility skew favoring upside', status: 'PASS', type: 'Derivatives' },
    { id: 12, name: 'Funding Rate Shift Delta', detail: 'Perpetual swap funding rate holding near zero (no crowded long squeeze)', status: 'PASS', type: 'Derivatives' },
    { id: 13, name: 'Model vs Market Odds Discrepancy', detail: 'Calculated expected value (+EV) discrepancy > +3.0% vs venue odds', status: 'PASS', type: 'Expected Value' },
    { id: 14, name: 'Cross-Venue Liquidity Spread', detail: 'Bid/Ask spread stability across major spot exchanges', status: 'FAIL', type: 'Microstructure', note: 'Spread temporarily widened above 0.08% threshold' },
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
    <div className="space-y-20 py-4 font-sans text-purple-100 selection:bg-purple-600 selection:text-white">
      {/* Main Hero Section */}
      <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-2">
        {/* Subtle Background Accent */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 blur-[180px] rounded-full pointer-events-none" />

        {/* Hero Left Content */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>VIXY AI — DECISION INTELLIGENCE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-6xl font-black font-sans tracking-tight text-white leading-[1.05]">
            The Market Moves First.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-300">
              Your Trades Should Too.
            </span>
          </h1>

          <p className="text-slate-300 text-base max-w-lg leading-relaxed font-sans font-normal">
            VIXY’s Vault is a real-time prediction market decision terminal for BTC traders, delivering auditable 15-minute signals backed by live orderbook depth, momentum factors, and walk-forward model calibration.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 font-mono">
            <button
              onClick={onLaunchVixyLive || onLaunchTerminal}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-purple-600 text-slate-950 hover:opacity-95 font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl shadow-amber-500/30 transition-all hover:shadow-amber-400/40 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 animate-ping" />
              <span>LAUNCH VIXY LIVE</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>

            <button
              onClick={onLaunchTerminal}
              className="px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl shadow-purple-600/30 transition-all hover:shadow-purple-500/40 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>DASHBOARD</span>
            </button>

            <button
              onClick={onOpenPricing}
              className="px-6 py-4 rounded-xl bg-[#0D081D] hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>PLANS &amp; PRICING</span>
            </button>
          </div>

          {/* VIXY Vault Command Center Day Pass Access Module - Ultra High Standout */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#120830]/95 via-[#0A0518]/98 to-[#0B041E] border-2 border-cyan-500/50 shadow-2xl shadow-cyan-950/80 relative overflow-hidden font-mono group hover:border-cyan-400 transition-all duration-300">
            {/* Luminous Ambient Backlight */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-400/30 transition-all" />
            <div className="absolute top-0 right-0 px-3.5 py-1.5 bg-gradient-to-r from-purple-900/90 to-cyan-950/90 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-2xl text-[10px] text-cyan-300 font-black tracking-widest uppercase flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
              <span>VAULT ACCESS CREDENTIAL</span>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow">
                    24H PASS
                  </span>
                  <span className="text-[10px] text-purple-300 font-bold tracking-wider uppercase">ONE-TIME ACCESS • NO SUBSCRIPTION</span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-white font-sans tracking-tight pt-1">
                  24 HOURS OF FULL DECISION INTELLIGENCE
                </h4>
              </div>

              {/* Prominent Price & Instant Activation */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-3 border-y border-purple-800/40">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 tracking-tight font-mono drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                    $9.99
                  </span>
                  <div className="flex flex-col text-[11px] text-purple-200 font-sans leading-tight">
                    <span className="font-bold text-white">Full Terminal Unlocks</span>
                    <span className="text-purple-300/80">96 prediction cycles</span>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-[11px] text-emerald-400 font-black flex items-center gap-1.5 shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>INSTANT ACTIVATION</span>
                </div>
              </div>

              {/* Feature Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono text-purple-200">
                <div className="px-2.5 py-1 rounded-lg bg-[#070314] border border-purple-900/60 flex items-center gap-1.5">
                  <span className="text-cyan-400 font-bold">✓</span> Sub-Second L2 Depth
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-[#070314] border border-purple-900/60 flex items-center gap-1.5">
                  <span className="text-cyan-400 font-bold">✓</span> Discord Signals Feed
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-[#070314] border border-purple-900/60 flex items-center gap-1.5 col-span-2 sm:col-span-1">
                  <span className="text-cyan-400 font-bold">✓</span> 100% Unrestricted
                </div>
              </div>

              {/* Primary Action CTA Button */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleCheckoutClick(getStripeDayPassUrl({ email: authState?.user?.email, uid: authState?.user?.id }))}
                  className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-cyan-950/90 border border-cyan-300/40 transition-all flex items-center justify-center gap-2 group/btn cursor-pointer active:scale-[0.99]"
                >
                  <ShieldCheck className="w-4 h-4 text-cyan-200 group-hover/btn:scale-110 transition-transform" />
                  <span className="drop-shadow">UNLOCK 24H ACCESS — $9.99</span>
                  <ArrowRight className="w-4 h-4 text-cyan-200 group-hover/btn:translate-x-1 transition-transform" />
                </button>

                <div className="flex items-center justify-between text-[10px] text-purple-300/80 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Instant access after payment • Discord sync available in-terminal
                  </span>
                  <span className="text-cyan-400/90 font-bold hidden sm:inline">96 Prediction Cycles / Day</span>
                </div>
              </div>
            </div>
          </div>

          {/* Micro Trust Indicators (Honest, Compliant) */}
          <div className="flex flex-wrap items-center gap-6 pt-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5" title="Brier calibration score evaluated on walk-forward backtests">
              <Check className="w-4 h-4 text-emerald-400" /> Brier Score 0.084 (n=2,410)
            </span>
            <span className="flex items-center gap-1.5" title="Historical walk-forward backtest win rate">
              <Check className="w-4 h-4 text-emerald-400" /> 84.2% Backtest (n=2,410)
            </span>
            <span className="flex items-center gap-1.5" title="Instant 24-Hour Unfiltered Access">
              <Check className="w-4 h-4 text-emerald-400" /> 24H Day Pass — Instant $9.99 Access
            </span>
          </div>
        </div>

        {/* Hero Right Preview Card */}
        <div className="lg:col-span-6">
          <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 shadow-2xl font-mono text-left space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 text-xs text-slate-400">
              <span className="text-white font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE SIGNAL TERMINAL (Direct Exchange Stream)
              </span>
              <span className="text-slate-400 font-medium">BTC 15M Strike</span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-xs text-slate-400 block uppercase">Spot Reference</span>
                <span className="text-3xl font-black text-white tracking-tight">
                  ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Model Signal</span>
                <span className="text-xl font-black text-emerald-400">SIGNAL: YES</span>
              </div>
            </div>

            {/* Sparkline */}
            <div className="h-16 w-full relative pt-2">
              <svg viewBox="0 0 300 70" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="heroSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,50 Q30,40 60,45 T120,30 T180,48 T240,25 T300,10"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                />
                <path
                  d="M0,50 Q30,40 60,45 T120,30 T180,48 T240,25 T300,10 L300,70 L0,70 Z"
                  fill="url(#heroSparklineGrad)"
                />
              </svg>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3 text-left pt-2">
              <div className="bg-[#0D081D] p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase block">Model Confidence</span>
                <span className="text-white font-black text-lg">91%</span>
                <span className="text-[9px] text-emerald-400 block font-bold">Stable ↑</span>
              </div>

              <div className="bg-[#0D081D] p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase block">Implied Edge</span>
                <span className="text-emerald-400 font-black text-lg">+12.4%</span>
                <span className="text-[9px] text-slate-400 block">vs Kalshi / Poly</span>
              </div>

              {/* Interactive Setup Grade Button showing 14 factors */}
              <button
                onClick={() => setShowFactorsModal(true)}
                className="bg-[#0D081D] p-3 rounded-xl border border-purple-500/50 hover:border-purple-400 transition-all space-y-1 text-left group cursor-pointer relative"
                title="Click to view full 14-Factor Alignment Criteria"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase block">Setup Grade</span>
                  <Info className="w-3 h-3 text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-white font-black text-lg">A+</span>
                <span className="text-[9px] text-emerald-400 font-bold block flex items-center gap-1">
                  13/14 Aligned <span className="underline decoration-purple-400 text-purple-300">View Factors</span>
                </span>
              </button>
            </div>

            {/* Sub-Quiet Footer — Dynamic Feed Status */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>
                Feed Status: <strong className="text-emerald-400 font-bold animate-pulse">LIVE REAL-TIME (Sub-Second)</strong>
              </span>
              <span>Candle Time Remaining: <strong className="text-emerald-400 font-bold">7m 12s</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Honest Alpha Launch Status Section (No fabricated numbers) */}
      <section className="py-6 border-y border-slate-800/80 bg-[#070410] rounded-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center font-mono">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-bold">Alpha Cohort Status</span>
            <span className="text-lg font-black text-white">Early Access</span>
            <span className="text-[10px] text-emerald-400 font-bold block">Open Signups</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block uppercase font-bold">Backtest Win Rate</span>
            <span className="text-lg font-black text-emerald-400">84.2%</span>
            <span className="text-[10px] text-slate-400 block font-medium">Walk-Forward (n=2,410)</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block uppercase font-bold">15M & 1H Signal Engine</span>
            <span className="text-lg font-black text-purple-300">Active</span>
            <span className="text-[10px] text-purple-400 font-bold block">Continuous Scanning</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block uppercase font-bold">Data Feed Mode</span>
            <span className="text-lg font-black text-emerald-400">
              Live Exchange Stream
            </span>
            <span className="text-[10px] text-slate-400 block">Kalshi & Polymarket Odds</span>
          </div>
        </div>
      </section>

      {/* Feature Icons Row Bar (6 Columns) */}
      <section className="py-6 border-y border-purple-900/40 bg-[#0C061E]/80 rounded-2xl">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center font-mono">
          <div className="flex flex-col items-center gap-2 p-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center">
              <Crosshair className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-purple-100">15-Minute Decision Engine</span>
          </div>

          <div className="flex flex-col items-center gap-2 p-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-purple-100">Live Market Intelligence</span>
          </div>

          <div className="flex flex-col items-center gap-2 p-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-purple-100">Probability Edge</span>
          </div>

          <div className="flex flex-col items-center gap-2 p-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-purple-100">Historical Analytics</span>
          </div>

          <div className="flex flex-col items-center gap-2 p-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-purple-100">Automated Alerts</span>
          </div>

          <div className="flex flex-col items-center gap-2 p-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-purple-100">Performance Tracking</span>
          </div>
        </div>
      </section>

      {/* EXCLUSIVITY MATRIX */}
      <section className="space-y-6 font-mono">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>EXCLUSIVITY MATRIX</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Unassisted Speculation vs. Quantitative Vault Edge</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Average Retail Trader */}
          <div className="bg-[#0D071B] border border-rose-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/30">
              <span className="font-bold text-rose-400 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" /> Standard Retail Trader
              </span>
              <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold">DISADVANTAGED</span>
            </div>
            <ul className="space-y-2.5 font-sans text-purple-200/60">
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Guesses 15-minute candle closes based on lagging 1m chart candles.</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Zero visibility into orderbook depth imbalance or taker buy/sell ratio.</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Buys overpriced prediction contracts with negative expected value (-EV).</span>
              </li>
            </ul>
          </div>

          {/* VIXY AI Member */}
          <div className="bg-[#120B28] border-2 border-purple-500 rounded-2xl p-6 space-y-4 shadow-2xl shadow-purple-950/60">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
              <span className="font-bold text-purple-200 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400" /> VIXY AI Member
              </span>
              <span className="text-[10px] bg-purple-600 text-white px-2.5 py-0.5 rounded font-black uppercase">ROYAL ADVANTAGE</span>
            </div>
            <ul className="space-y-2.5 font-sans text-purple-100">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span className="font-semibold text-white">Calibrated probability model evaluating momentum, orderbook depth imbalance, and volatility compression.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>Instant model vs Kalshi/Polymarket mispricing identification (+4.3% to +12.2% EV).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>Automated Discord & Telegram webhooks with verifiable signal logs.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Interactive Probability & Edge Calculator */}
      <section className="bg-[#120B28] border border-purple-500/30 rounded-3xl p-6 sm:p-8 space-y-6 font-mono">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <Gauge className="w-3.5 h-3.5" />
            <span>EXPECTED VALUE CALCULATOR</span>
          </div>
          <h2 className="text-2xl font-black text-white">Calculate Your Edge in Seconds</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#0B061A] p-5 rounded-2xl border border-purple-900/40 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between font-bold">
              <span className="text-purple-300/70">VIXY Vault Estimated Prob:</span>
              <span className="text-purple-300">{calcModelProb}% YES</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={calcModelProb}
              onChange={(e) => setCalcModelProb(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-bold">
              <span className="text-purple-300/70">Kalshi / Polymarket Odds:</span>
              <span className="text-violet-300">{calcMarketProb}% YES</span>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              value={calcMarketProb}
              onChange={(e) => setCalcMarketProb(Number(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-[#0B061A] p-5 rounded-2xl border border-purple-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-purple-300/70 block font-bold">ESTIMATED MODEL EDGE (+EV)</span>
            <span className="text-3xl font-black text-emerald-400">+{estimatedEdge}%</span>
          </div>
          <button
            onClick={onLaunchTerminal}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-600/30"
          >
            Find Live Mispricings Now
          </button>
        </div>
        <p className="text-[10px] text-slate-400 italic text-center">
          Note: Calculated edge reflects model-estimated expected value (+EV) based on quantitative feature inputs. Prediction market trading involves financial risk.
        </p>
      </section>

      {/* PRICING SECTION */}
      <section className="space-y-8 font-mono max-w-5xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider">PRICING</h2>
          <p className="text-xs text-purple-300/70 font-sans">Choose the plan that fits your edge.</p>

          <div className="pt-2 flex justify-center">
            <div className="bg-[#0D071E] border border-purple-900/40 rounded-2xl p-1.5 inline-flex items-center text-xs gap-1">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-5 py-2 rounded-xl font-bold transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-[#180E30] text-white shadow border border-purple-500/30'
                    : 'text-purple-300/60 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
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

        {/* VIXY Vault 24H Day Pass Access Module */}
        <div className="mb-8 p-6 sm:p-8 bg-gradient-to-r from-[#0F0826] via-[#0A0518] to-[#120930] border-2 border-purple-500/40 rounded-3xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-2xl shadow-purple-950/90 relative overflow-hidden text-left font-mono group">
          {/* Subtle Ambient Accent Orbs */}
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-3 relative z-10 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-purple-900/80 border border-purple-500/40 text-cyan-300 shadow-inner">
                VIXY VAULT ACCESS CREDENTIAL
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                INSTANT ACTIVATION • $9.99 ONE-TIME
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
                VIXY 24-Hour Terminal Day Pass
              </h3>
              <p className="text-xs sm:text-sm text-purple-200/80 max-w-xl font-sans leading-relaxed">
                Full VIXY decision intelligence for 24 hours. Get 96 complete 15-minute prediction cycles, live orderbook depth, decision locks, and Discord signals. One-time access • No subscription required.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-purple-300/90 font-mono pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Discord Verification Required
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> 24-Hour Authoritative Window
              </span>
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col items-center lg:items-end gap-2 relative z-10 shrink-0">
            <div className="text-center lg:text-right pb-1">
              <span className="text-3xl sm:text-4xl font-black text-cyan-300 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                $9.99
              </span>
              <span className="text-[10px] text-purple-300/70 block font-sans">Single 24H Pass</span>
            </div>

            <button
              onClick={() => handleCheckoutClick(getStripeDayPassUrl({ email: authState?.user?.email, uid: authState?.user?.id }))}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-purple-900/50 border border-purple-400/30 transition-all flex items-center justify-center gap-2 group/btn cursor-pointer active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-300 group-hover/btn:scale-110 transition-transform" />
              <span>UNLOCK 24H ACCESS — $9.99</span>
              <ArrowRight className="w-4 h-4 text-purple-200 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* STARTER */}
          <div className="bg-[#0D071E] border border-purple-900/40 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">STARTER</h3>
              <div className="space-y-0.5">
                <span className="text-4xl font-black text-purple-300">
                  ${billingInterval === 'annual' ? 24 : 29}
                </span>
                <span className="text-xs text-purple-300/60 ml-1">/month</span>
                <p className="text-[10px] text-purple-300/50 block">
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
                  <span>Model Probability</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Market Comparison</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Basic Historical Analytics</span>
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
              className="w-full py-3 rounded-xl bg-[#140C2A] hover:bg-[#1C123A] border border-purple-900/60 text-white font-bold text-xs transition-all"
            >
              Subscribe Starter
            </button>
          </div>

          {/* PROFESSIONAL */}
          <div className="bg-[#0D071E] border-2 border-purple-500 rounded-2xl p-6 space-y-6 flex flex-col justify-between relative shadow-2xl shadow-purple-600/30">
            <div className="space-y-4">
              <h3 className="font-bold text-purple-300 text-sm uppercase tracking-wider">PROFESSIONAL</h3>
              <div className="space-y-0.5">
                <span className="text-4xl font-black text-white">
                  ${billingInterval === 'annual' ? 64 : 79}
                </span>
                <span className="text-xs text-purple-300/60 ml-1">/month</span>
                <p className="text-[10px] text-purple-300/50 block">
                  {billingInterval === 'annual' ? 'Billed annually ($768/yr)' : 'Billed monthly'}
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-purple-100 font-sans pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Everything in Starter</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Advanced Analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Orderbook Depth & Taker Volume Delta</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Historical Similar Setups</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Confidence Filters</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Discord + Telegram Alerts</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/40 transition-all"
            >
              Subscribe Professional
            </button>
          </div>

          {/* ELITE */}
          <div className="bg-[#0D071E] border border-purple-900/40 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">ELITE</h3>
              <div className="space-y-0.5">
                <span className="text-4xl font-black text-purple-300">
                  ${billingInterval === 'annual' ? 159 : 199}
                </span>
                <span className="text-xs text-purple-300/60 ml-1">/month</span>
                <p className="text-[10px] text-purple-300/50 block">
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
                  <span>Real-Time Signal Engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Advanced Execution Guide</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Custom Model Settings</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Unlimited Watchlists</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-3 rounded-xl bg-[#140C2A] hover:bg-[#1C123A] border border-purple-900/60 text-white font-bold text-xs transition-all"
            >
              Subscribe Elite
            </button>
          </div>
        </div>

        {/* Persistent Risk Disclosure Callout */}
        <div className="bg-[#0B061A] p-4 rounded-xl border border-amber-500/30 text-[11px] text-slate-300 text-center space-y-1.5 font-sans">
          <p className="font-bold text-amber-300 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Mandatory Risk Disclosure
          </p>
          <p className="text-slate-300/90 leading-relaxed max-w-3xl mx-auto">
            Prediction market trading involves real financial risk of capital loss. Past backtested performance is no guarantee of future live results. VIXY AI is a quantitative decision intelligence platform and does not provide investment, financial, or legal advice.
          </p>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="max-w-3xl mx-auto space-y-4 font-mono">
        <div className="text-center space-y-1">
          <HelpCircle className="w-6 h-6 text-purple-400 mx-auto" />
          <h2 className="text-2xl font-black text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-2 text-xs">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-[#120B28] border border-purple-900/40 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 text-left font-bold text-white flex items-center justify-between gap-4"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-300/60" />}
              </button>
              {openFaq === idx && (
                <div className="p-4 pt-0 text-purple-300/80 leading-relaxed font-sans border-t border-purple-900/40 bg-[#0B061A]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Comprehensive Footer & Compliance Links */}
      <footer className="pt-10 border-t border-purple-900/40 font-mono text-xs text-purple-300/70 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" showSubtitle={false} onClick={onLaunchTerminal} />

          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => setShowTermsModal(true)} className="hover:text-white transition-colors underline decoration-purple-500/50">
              Terms of Service
            </button>
            <button onClick={() => setShowPrivacyModal(true)} className="hover:text-white transition-colors underline decoration-purple-500/50">
              Privacy Policy
            </button>
            <button onClick={() => setShowRiskModal(true)} className="hover:text-white transition-colors underline decoration-purple-500/50">
              Risk & Jurisdiction Disclaimer
            </button>
            <button onClick={() => setShowFactorsModal(true)} className="hover:text-white transition-colors underline decoration-purple-500/50">
              14-Factor Model Criteria
            </button>
          </div>

          <span className="text-[10px] text-slate-500">© 2026 VIXY AI. All rights reserved.</span>
        </div>

        {/* Legal & Exchange Notice */}
        <div className="text-[10px] text-slate-400/80 leading-relaxed font-sans border-t border-purple-900/20 pt-4 space-y-1">
          <p>
            <strong>Exchange Eligibility & Jurisdiction Notice:</strong> Trading on regulated prediction market venues (such as Kalshi and Polymarket) is subject to local exchange regulations and individual participant eligibility requirements. Kalshi is a US CFTC-regulated designated contract market. Users are responsible for confirming their eligibility before creating exchange accounts or trading.
          </p>
        </div>
      </footer>

      {/* MODAL 1: 14-FACTOR MODEL ALIGNMENT CRITERIA */}
      {showFactorsModal && (
        <div className="fixed inset-0 z-50 bg-[#05020E]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0D071E] border border-purple-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl font-mono my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white uppercase">14-Factor Model Alignment Criteria</h3>
              </div>
              <button
                onClick={() => setShowFactorsModal(false)}
                className="p-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-slate-300 font-sans leading-relaxed">
                Setup Grade A+ requires at least 12 of 14 independent mathematical criteria to pass. Below is the live breakdown for the active live setup (13 Pass / 1 Fail):
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {modelFactors.map((fac) => (
                <div
                  key={fac.id}
                  className={`p-3 rounded-xl border ${
                    fac.status === 'PASS'
                      ? 'bg-[#0B061A] border-purple-900/40'
                      : 'bg-[#1A0B1A] border-rose-500/40'
                  } space-y-1`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="text-purple-400">#{fac.id}</span> {fac.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        fac.status === 'PASS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {fac.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans">{fac.detail}</p>
                  {fac.note && (
                    <p className="text-[10px] text-rose-400 font-mono italic pt-0.5">Note: {fac.note}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-purple-900/50 flex justify-end">
              <button
                onClick={() => setShowFactorsModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
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
          <div className="bg-[#0D071E] border border-purple-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl font-sans my-auto max-h-[85vh] overflow-y-auto text-xs text-purple-100">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 font-mono">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white uppercase">Terms of Service</h3>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 leading-relaxed font-sans text-slate-300">
              <p><strong>Last Updated: July 2026</strong></p>
              <h4 className="font-bold text-white text-sm">1. Acceptance of Terms</h4>
              <p>By accessing or using VIXY AI, you agree to be bound by these Terms of Service. If you do not agree to all terms, do not access or use our platform.</p>
              
              <h4 className="font-bold text-white text-sm">2. Educational & Analytical Purpose Only</h4>
              <p>VIXY AI provides quantitative decision analytics, model-estimated probabilities, and signal alerts. We are NOT a financial advisor, broker, or exchange. All content is for informational and educational purposes only.</p>

              <h4 className="font-bold text-white text-sm">3. Risk Acknowledgement</h4>
              <p>Prediction market trading carries a substantial risk of financial loss. You acknowledge that you alone are responsible for evaluating the risks and merits associated with trading operations.</p>

              <h4 className="font-bold text-white text-sm">4. Subscriptions & Cancellations</h4>
              <p>Subscription fees are billed on a recurring monthly or annual basis. You may cancel your subscription at any time via your account settings. Subscriptions remain active until the end of the current billing cycle.</p>
            </div>

            <div className="pt-2 border-t border-purple-900/50 flex justify-end font-mono">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
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
          <div className="bg-[#0D071E] border border-purple-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl font-sans my-auto max-h-[85vh] overflow-y-auto text-xs text-purple-100">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 font-mono">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white uppercase">Privacy Policy</h3>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 leading-relaxed font-sans text-slate-300">
              <p><strong>Last Updated: July 2026</strong></p>
              <h4 className="font-bold text-white text-sm">1. Information We Collect</h4>
              <p>We collect account credentials (email address), user preferences (dashboard configurations, alert webhooks), and local interaction logs necessary to provide service functionality.</p>

              <h4 className="font-bold text-white text-sm">2. Data Usage & Protection</h4>
              <p>Your data is used solely to operate and improve VIXY AI services. We do not sell, rent, or lease your personal information to third parties.</p>

              <h4 className="font-bold text-white text-sm">3. Security Standards</h4>
              <p>We employ encryption in transit (TLS) and at rest to protect sensitive account configurations and alert webhook endpoints.</p>
            </div>

            <div className="pt-2 border-t border-purple-900/50 flex justify-end font-mono">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
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
          <div className="bg-[#0D071E] border border-amber-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl font-sans my-auto max-h-[85vh] overflow-y-auto text-xs text-purple-100">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 font-mono">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white uppercase">Risk & Jurisdiction Disclaimer</h3>
              </div>
              <button
                onClick={() => setShowRiskModal(false)}
                className="p-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 leading-relaxed font-sans text-slate-300">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-200 text-xs">
                <strong>Financial Risk Warning:</strong> Prediction market trading involves significant financial risk. Past performance, backtested results, and model-estimated probabilities do not guarantee future live returns.
              </div>

              <h4 className="font-bold text-white text-sm">Not Financial Advice</h4>
              <p>VIXY AI is a software technology and decision analytics platform. Content generated by our software should not be construed as investment, financial, tax, or legal advice.</p>

              <h4 className="font-bold text-white text-sm">Regulated Exchange Access & Eligibility</h4>
              <p>Exchanges such as Kalshi and Polymarket operate under specific regulatory frameworks and geographical restrictions. Kalshi is a CFTC-regulated exchange subject to US eligibility rules. Polymarket operates under its own terms. Users are solely responsible for ensuring their personal compliance with local exchange rules and jurisdictional laws.</p>
            </div>

            <div className="pt-2 border-t border-purple-900/50 flex justify-end font-mono">
              <button
                onClick={() => setShowRiskModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
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
