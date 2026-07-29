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
} from 'lucide-react';
import { BTCTicker } from '../types';
import { Logo } from './Logo';

interface LandingPageProps {
  ticker: BTCTicker;
  onLaunchTerminal: () => void;
  onOpenPricing: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  ticker,
  onLaunchTerminal,
  onOpenPricing,
  onOpenAuth,
}) => {
  const [calcModelProb, setCalcModelProb] = useState(68);
  const [calcMarketProb, setCalcMarketProb] = useState(52);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const estimatedEdge = (calcModelProb - calcMarketProb).toFixed(1);

  const faqs = [
    {
      q: 'Why offer a 3-Hour Free Trial instead of a traditional multi-day trial?',
      a: 'In 15-minute prediction markets, 3 hours gives you 12 complete prediction cycles. You see real-time L2 order flow, model probabilities vs Kalshi/Polymarket odds, and instantaneous edge realization in a single focused trading session.',
    },
    {
      q: 'Is VIXY’s Vault a gambling platform or signal group?',
      a: 'No. VIXY’s Vault is an institutional quantitative analytics platform built for prediction market traders. We provide raw L2 order flow microstructure, model-implied probabilities, historical setup matching, and Brier-calibrated decision intelligence.',
    },
    {
      q: 'How does the 15-Minute Decision Engine calculate edge?',
      a: 'Our engine processes high-frequency Binance & Coinbase WebSocket orderbooks, tracking net taker buy/sell delta, volume imbalance, and orderbook wall absorption in real-time. It compares model probability against live Kalshi & Polymarket orderbook implied odds to surface positive expected value (+EV) mispricings.',
    },
    {
      q: 'Can I automate signals to my Discord or Telegram?',
      a: 'Yes. All Pro and Elite subscribers can configure webhook alerts with custom confidence thresholds (e.g. only alert when confidence ≥85% and edge ≥5%).',
    },
    {
      q: 'Does VIXY’s Vault provide guaranteed trading profits?',
      a: 'No. Prediction markets involve risk. VIXY’s Vault provides mathematical probabilities and statistical edge to support informed trading decisions. Traders remain solely responsible for managing their own capital and risk.',
    },
  ];

  return (
    <div className="space-y-20 py-4 font-sans text-purple-100 selection:bg-purple-600 selection:text-white">
      {/* Landing Header Bar Matching User Image */}
      <div className="flex items-center justify-between py-2 border-b border-purple-900/40">
        <Logo size="md" showSubtitle={true} onClick={onLaunchTerminal} />

        <div className="hidden md:flex items-center gap-8 text-xs font-mono text-purple-200/80">
          <button onClick={onLaunchTerminal} className="hover:text-white transition-colors">Features</button>
          <button onClick={onOpenPricing} className="hover:text-white transition-colors">Pricing</button>
          <button onClick={onLaunchTerminal} className="hover:text-white transition-colors">Dashboard</button>
          <button onClick={onLaunchTerminal} className="hover:text-white transition-colors">About</button>
          <button onClick={onLaunchTerminal} className="hover:text-white transition-colors">Resources</button>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <button
            onClick={() => onOpenAuth('login')}
            className="px-4 py-2 rounded-xl bg-[#120B24] border border-purple-900/50 text-xs font-bold text-purple-200 hover:text-white hover:border-purple-500/50 transition-all"
          >
            Log in
          </button>
          <button
            onClick={() => onOpenAuth('register')}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all"
          >
            Start Free Trial
          </button>
        </div>
      </div>

      {/* Main Hero Section - Split Screen Matching Reference */}
      <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
        {/* Ambient Purple Background Glows */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-600/15 blur-[160px] rounded-full pointer-events-none" />

        {/* Hero Left Content */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <h1 className="text-4xl sm:text-6xl lg:text-6xl font-black font-mono tracking-tight text-white leading-[1.08]">
            KNOW MORE.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-fuchsia-300">
              DECIDE BETTER.
            </span>
            <br />
            STAY AHEAD.
          </h1>

          <p className="text-purple-200/80 text-sm sm:text-base max-w-lg leading-relaxed font-sans font-normal">
            VIXY'S VAULT is the most advanced 15-minute Bitcoin prediction market intelligence platform. Built for traders who demand an edge.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 font-mono">
            <button
              onClick={() => onOpenAuth('register')}
              className="px-8 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-xl shadow-purple-600/40 transition-all active:scale-95"
            >
              Start Free Trial
            </button>

            <button
              onClick={onLaunchTerminal}
              className="px-7 py-3.5 rounded-xl bg-[#120B24] hover:bg-[#1A1034] border border-purple-500/40 text-purple-100 font-bold text-xs transition-all flex items-center gap-2"
            >
              <span>View Live Dashboard</span>
            </button>
          </div>
        </div>

        {/* Hero Right Preview Card - Exact Replica of User Image */}
        <div className="lg:col-span-6">
          <div className="bg-[#0F0820]/95 rounded-2xl border border-purple-500/30 p-5 shadow-2xl shadow-purple-950/80 font-mono text-left space-y-4 relative overflow-hidden backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-2 text-xs text-purple-300/70">
              <span className="text-purple-100 font-bold">BTC 15-Minute</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> + Live
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-3xl font-black text-white tracking-tight">
                ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className="text-[10px] text-purple-300/60 block font-semibold">Bitcoin / USD</span>
            </div>

            {/* Simulated Chart Sparkline */}
            <div className="h-20 w-full relative">
              <svg viewBox="0 0 300 70" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="heroSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,50 Q30,40 60,45 T120,30 T180,48 T240,25 T300,10"
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="2.5"
                />
                <path
                  d="M0,50 Q30,40 60,45 T120,30 T180,48 T240,25 T300,10 L300,70 L0,70 Z"
                  fill="url(#heroSparklineGrad)"
                />
              </svg>
            </div>

            {/* 3 Metric Cards Grid */}
            <div className="grid grid-cols-3 gap-3 text-left pt-2">
              <div className="bg-[#140C2C] p-3 rounded-xl border border-purple-900/40 space-y-1">
                <span className="text-[9px] text-purple-300/60 uppercase block font-semibold">Model Probability (UP)</span>
                <span className="text-white font-black text-base">54.8%</span>
                <span className="text-[9px] text-purple-300/70 block">Low Confidence</span>
              </div>

              <div className="bg-[#140C2C] p-3 rounded-xl border border-purple-900/40 space-y-1">
                <span className="text-[9px] text-purple-300/60 uppercase block font-semibold">Market Probability (UP)</span>
                <span className="text-white font-black text-base">50.5%</span>
                <span className="text-[9px] text-purple-300/70 block">Kalshi Market</span>
              </div>

              <div className="bg-[#140C2C] p-3 rounded-xl border border-purple-900/40 space-y-1">
                <span className="text-[9px] text-purple-300/60 uppercase block font-semibold">Edge</span>
                <span className="text-emerald-400 font-black text-base">+4.3%</span>
                <span className="text-[9px] text-purple-300/70 block">Model Edge</span>
              </div>
            </div>

            {/* Micro Metrics Bottom Row */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-[10px] text-center">
              <div className="bg-[#140C2C] p-2 rounded-lg border border-purple-900/40">
                <span className="text-purple-300/60 block text-[9px]">Confidence</span>
                <span className="text-purple-300 font-bold block">Low</span>
              </div>
              <div className="bg-[#140C2C] p-2 rounded-lg border border-purple-900/40">
                <span className="text-purple-300/60 block text-[9px]">Order Flow (15m)</span>
                <span className="text-rose-400 font-bold block">-14% Net Sell</span>
              </div>
              <div className="bg-[#140C2C] p-2 rounded-lg border border-purple-900/40">
                <span className="text-purple-300/60 block text-[9px]">Book Pressure</span>
                <span className="text-amber-300 font-bold block">Ask Heavy</span>
              </div>
              <div className="bg-[#140C2C] p-2 rounded-lg border border-purple-900/40">
                <span className="text-purple-300/60 block text-[9px]">Session</span>
                <span className="text-purple-200 font-bold block">Asia / US</span>
              </div>
            </div>
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

      {/* UNASSISTED SPECULATION VS VIXY'S VAULT ADVANTAGE */}
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
                <span>Zero visibility into market maker bid/ask walls or net taker volume delta.</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Buys overpriced prediction contracts with negative expected value (-EV).</span>
              </li>
            </ul>
          </div>

          {/* VIXY'S VAULT Member */}
          <div className="bg-[#120B28] border-2 border-purple-500 rounded-2xl p-6 space-y-4 shadow-2xl shadow-purple-950/60">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
              <span className="font-bold text-purple-200 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400" /> VIXY'S VAULT Member
              </span>
              <span className="text-[10px] bg-purple-600 text-white px-2.5 py-0.5 rounded font-black uppercase">ROYAL ADVANTAGE</span>
            </div>
            <ul className="space-y-2.5 font-sans text-purple-100">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span className="font-semibold text-white">Sub-second L2 Net Taker Delta tracking (+1,420 BTC aggression signals).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>Instant model vs Kalshi/Polymarket mispricing identification (+4.3% to +12.2% EV).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>Automated Discord & Telegram webhooks with SHA-256 verifiable signals.</span>
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
      </section>

      {/* PRICING SECTION MATCHING USER REFERENCE IMAGE */}
      <section className="space-y-8 font-mono max-w-5xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider">PRICING</h2>
          <p className="text-xs text-purple-300/70 font-sans">Choose the plan that fits your edge.</p>

          <div className="pt-2 flex justify-center">
            <div className="bg-[#0D071E] border border-purple-900/40 rounded-xl p-1 inline-flex items-center text-xs">
              <button className="px-4 py-1.5 rounded-lg bg-[#180E30] text-white font-bold">Monthly</button>
              <button className="px-4 py-1.5 rounded-lg text-purple-300/60 hover:text-white">Yearly <span className="text-purple-400 text-[10px]">(Save 20%)</span></button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* STARTER */}
          <div className="bg-[#0D071E] border border-purple-900/40 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">STARTER</h3>
              <div className="space-y-0.5">
                <span className="text-4xl font-black text-purple-300">$29</span>
                <span className="text-xs text-purple-300/60 ml-1">/month</span>
                <p className="text-[10px] text-purple-300/50 block">Billed monthly</p>
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
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>1 Watchlist</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Standard Support</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-3 rounded-xl bg-[#140C2A] hover:bg-[#1C123A] border border-purple-900/60 text-white font-bold text-xs transition-all"
            >
              Start Free Trial
            </button>
          </div>

          {/* PROFESSIONAL (PURPLE GLOW HIGHLIGHT) */}
          <div className="bg-[#0D071E] border-2 border-purple-500 rounded-2xl p-6 space-y-6 flex flex-col justify-between relative shadow-2xl shadow-purple-600/30">
            <div className="space-y-4">
              <h3 className="font-bold text-purple-300 text-sm uppercase tracking-wider">PROFESSIONAL</h3>
              <div className="space-y-0.5">
                <span className="text-4xl font-black text-white">$79</span>
                <span className="text-xs text-purple-300/60 ml-1">/month</span>
                <p className="text-[10px] text-purple-300/50 block">Billed monthly</p>
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
                  <span>Order Flow & Book Pressure</span>
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
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>5 Watchlists</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Priority Support</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/40 transition-all"
            >
              Start Free Trial
            </button>
          </div>

          {/* ELITE */}
          <div className="bg-[#0D071E] border border-purple-900/40 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">ELITE</h3>
              <div className="space-y-0.5">
                <span className="text-4xl font-black text-purple-300">$149</span>
                <span className="text-xs text-purple-300/60 ml-1">/month</span>
                <p className="text-[10px] text-purple-300/50 block">Billed monthly</p>
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
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>SMS Alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Performance Coaching</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>VIP Support</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-3 rounded-xl bg-[#140C2A] hover:bg-[#1C123A] border border-purple-900/60 text-white font-bold text-xs transition-all"
            >
              Start Free Trial
            </button>
          </div>
        </div>

        {/* Disclaimer Footer */}
        <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/30 text-[10px] text-purple-300/50 text-center space-y-1 font-sans">
          <p className="font-bold text-purple-300/70">Disclaimer: VIXY'S VAULT is a decision intelligence platform, not financial advice.</p>
          <p>All traders are responsible for their own decisions and risk.</p>
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
    </div>
  );
};
