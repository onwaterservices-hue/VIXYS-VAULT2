import React, { useState, useEffect } from 'react';
import {
  Brain,
  Zap,
  Activity,
  ShieldCheck,
  Lock,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Radio,
  Flame,
  Globe,
  BellRing,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert
} from 'lucide-react';

interface VixyAiStatusCardProps {
  onOpenPricing?: () => void;
  userRole?: 'UNPAID' | 'PRO' | 'ADMIN';
  className?: string;
}

export const VixyAiStatusCard: React.FC<VixyAiStatusCardProps> = ({
  onOpenPricing,
  userRole = 'UNPAID',
  className = '',
}) => {
  const isPro = userRole === 'PRO' || userRole === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'STATUS' | 'PULSE' | 'BREAKING' | 'WHALE' | 'LESSON' | 'RECAP'>('STATUS');
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [secondsToScan, setSecondsToScan] = useState(842); // 14 mins 02s

  const lessons = [
    {
      title: 'What is Liquidity?',
      concept: 'Liquidity is where large institutions need orders filled.',
      body: 'Price is attracted toward liquidity, not because markets are random, but because banks require counterparties to fill massive positions.',
      detail: "Today's chart contains 3 major liquidity pools. Elite members can see exactly where.",
    },
    {
      title: 'What is an Order Block?',
      concept: 'Order blocks represent institutional supply and demand footprint zones.',
      body: 'When banks enter large positions, they leave unfilled limit orders. When price returns to an order block, it often reacts violently.',
      detail: 'Elite AI automatically draws live order block heatmaps across 15m and 1h desks.',
    },
    {
      title: 'How Smart Money Hunts Stops',
      concept: 'Institutions purposefully drive price past obvious support/resistance levels.',
      body: 'Triggering retail stop-loss orders creates the massive counterparty volume institutions need to buy low or sell high.',
      detail: 'VIXY AI detects stop sweep absorption in sub-second intervals before price reverses.',
    },
    {
      title: 'What is Delta?',
      concept: 'Cumulative Volume Delta (CVD) measures net market buy vs sell aggression.',
      body: 'When price declines while Cumulative Delta rises, aggressive buyers are absorbing ask walls—a strong bullish divergence.',
      detail: 'Elite members monitor live taker volume delta overlays directly on the chart.',
    },
    {
      title: 'How AI Scores Trades',
      concept: 'VIXY AI cross-evaluates 24 quantitative features before signaling.',
      body: 'By matching Binance L2 depth, Polymarket prediction odds, Kalshi binary strikes, and order flow velocity, bad setups get filtered out.',
      detail: 'Only setups with >80% calibrated confluence generate Elite actionable alerts.',
    },
  ];

  // Real-time ticking timer for Next Scan
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsToScan((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className={`bg-gradient-to-b from-[#12082b] via-[#0d0520] to-[#080214] rounded-3xl border border-purple-800/60 p-5 shadow-2xl relative overflow-hidden font-sans ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-800/50 pb-4 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                🧠 VIXY AI STATUS
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ONLINE (24/7)
              </span>
            </div>
            <p className="text-xs text-purple-300/70">
              Active Institutional Prediction Engines & Conversion Intelligence
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-[#080315] p-1 rounded-xl border border-purple-900/60 font-mono text-xs">
          <button
            onClick={() => setActiveTab('STATUS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'STATUS'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            LIVE MONITOR
          </button>
          <button
            onClick={() => setActiveTab('PULSE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'PULSE'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            MARKET PULSE
          </button>
          <button
            onClick={() => setActiveTab('WHALE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'WHALE'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            WHALE ALERT
          </button>
          <button
            onClick={() => setActiveTab('LESSON')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'LESSON'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            AI LESSON
          </button>
          <button
            onClick={() => setActiveTab('RECAP')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'RECAP'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            🔥 DAILY RECAP
          </button>
          <button
            onClick={() => setActiveTab('BREAKING')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'BREAKING'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            BREAKING NEWS
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE VIXY AI STATUS MONITOR */}
      {activeTab === 'STATUS' && (
        <div className="space-y-4 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-[#080315]/90 p-3 rounded-2xl border border-purple-800/40 text-center space-y-1">
              <span className="text-[10px] text-purple-300/60 uppercase font-mono font-semibold block">Models Online</span>
              <span className="text-xl font-extrabold font-mono text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                24
              </span>
            </div>

            <div className="bg-[#080315]/90 p-3 rounded-2xl border border-purple-800/40 text-center space-y-1">
              <span className="text-[10px] text-purple-300/60 uppercase font-mono font-semibold block">Markets Monitored</span>
              <span className="text-xl font-extrabold font-mono text-cyan-300 flex items-center justify-center gap-1">
                <Globe className="w-4 h-4 text-cyan-400" />
                154
              </span>
            </div>

            <div className="bg-[#080315]/90 p-3 rounded-2xl border border-purple-800/40 text-center space-y-1">
              <span className="text-[10px] text-purple-300/60 uppercase font-mono font-semibold block">Live Confidence</span>
              <span className="text-xl font-extrabold font-mono text-amber-300 flex items-center justify-center gap-1">
                <Zap className="w-4 h-4 text-amber-400" />
                87.4%
              </span>
            </div>

            <div className="bg-[#080315]/90 p-3 rounded-2xl border border-purple-800/40 text-center space-y-1">
              <span className="text-[10px] text-purple-300/60 uppercase font-mono font-semibold block">Signals Today</span>
              <span className="text-xl font-extrabold font-mono text-white">
                19
              </span>
            </div>

            <div className="bg-[#080315]/90 p-3 rounded-2xl border border-purple-800/40 text-center space-y-1">
              <span className="text-[10px] text-purple-300/60 uppercase font-mono font-semibold block">Elite Signals</span>
              <span className="text-xl font-extrabold font-mono text-purple-300 flex items-center justify-center gap-1">
                <Lock className="w-4 h-4 text-purple-400" />
                7
              </span>
            </div>

            <div className="bg-[#080315]/90 p-3 rounded-2xl border border-purple-800/40 text-center space-y-1">
              <span className="text-[10px] text-purple-300/60 uppercase font-mono font-semibold block">30D Win Rate</span>
              <span className="text-xl font-extrabold font-mono text-emerald-400">
                84.2%
              </span>
            </div>

            <div className="bg-[#080315]/90 p-3 rounded-2xl border border-purple-800/40 text-center space-y-1">
              <span className="text-[10px] text-purple-300/60 uppercase font-mono font-semibold block">Next Scan</span>
              <span className="text-xl font-extrabold font-mono text-cyan-400 flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
                {formatTimer(secondsToScan)}
              </span>
            </div>
          </div>

          {/* Funnel Value Proposition Card */}
          <div className="bg-[#0c051f] p-4 rounded-2xl border border-purple-600/40 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-400" />
                VIXY FREE FUNNEL VS ELITE AI
              </div>
              <p className="text-xs text-purple-200/90 max-w-xl">
                Free channels deliver high-level directional bias and real market pulses. Upgrade to <strong>VIXY ELITE AI</strong> to unlock exact Entry Price, Stop Loss, Profit Targets, and Smart Money Liquidity Maps.
              </p>
            </div>

            {!isPro && onOpenPricing && (
              <button
                onClick={onOpenPricing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-purple-600/30 flex items-center gap-2 whitespace-nowrap transition-transform active:scale-95"
              >
                <span>Upgrade to VIXY ELITE AI</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FREE MARKET PULSE FUNNEL DEMO */}
      {activeTab === 'PULSE' && (
        <div className="bg-[#070212] p-5 rounded-2xl border border-purple-800/60 font-mono space-y-4 relative z-10">
          <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white">📊 VIXY AI Market Pulse</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">FREE CHANNEL</span>
            </div>
            <span className="text-xs text-purple-300/60">Updated 1m ago</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-[#0e0624] p-3 rounded-xl border border-purple-900/40">
                <span className="text-xs text-purple-300/70">Overall Bias:</span>
                <span className="text-sm font-black text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" /> 🟢 Bullish
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#0e0624] p-3 rounded-xl border border-purple-900/40">
                <span className="text-xs text-purple-300/70">Confidence Score:</span>
                <span className="text-sm font-black text-amber-300">81.4%</span>
              </div>
              <div className="bg-[#0e0624] p-3 rounded-xl border border-purple-900/40 space-y-1">
                <span className="text-[10px] text-purple-300/60 uppercase block font-bold">Market Rationale:</span>
                <p className="text-xs text-slate-200 font-sans">
                  Institutional buyers continue accumulating beneath support. Key resistance cluster identified at $64,800.
                </p>
              </div>
            </div>

            {/* UNLOCKED / ELITE REPORT GAP */}
            <div className="bg-[#0a031a] p-4 rounded-xl border border-purple-600/50 space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  {isPro ? (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  Detailed Trade Setup
                </span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
                  {isPro ? 'UNLOCKED (ADMIN & ELITE)' : 'VIXY ELITE EXCLUSIVE'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-purple-300/80">
                <div className="flex items-center justify-between bg-[#12072e] px-3 py-1.5 rounded border border-purple-800/40">
                  <span>Full Entry Price:</span>
                  <span className={isPro ? 'text-emerald-400 font-bold font-mono' : 'text-amber-400 font-bold flex items-center gap-1'}>
                    {isPro ? '$64,161.40 (Taker Cushion Zone)' : <><Lock className="w-3 h-3" /> Locked</>}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-[#12072e] px-3 py-1.5 rounded border border-purple-800/40">
                  <span>Stop Loss Target:</span>
                  <span className={isPro ? 'text-rose-400 font-bold font-mono' : 'text-amber-400 font-bold flex items-center gap-1'}>
                    {isPro ? '$63,820.00 (-0.53%)' : <><Lock className="w-3 h-3" /> Locked</>}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-[#12072e] px-3 py-1.5 rounded border border-purple-800/40">
                  <span>Profit Targets (TP1 / TP2):</span>
                  <span className={isPro ? 'text-emerald-300 font-bold font-mono' : 'text-amber-400 font-bold flex items-center gap-1'}>
                    {isPro ? '$64,850 / $65,400 (+1.8%)' : <><Lock className="w-3 h-3" /> Locked</>}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-[#12072e] px-3 py-1.5 rounded border border-purple-800/40">
                  <span>Risk & Liquidity Analysis:</span>
                  <span className={isPro ? 'text-cyan-300 font-bold font-mono' : 'text-amber-400 font-bold flex items-center gap-1'}>
                    {isPro ? 'Low Risk • +1,820 BTC Delta' : <><Lock className="w-3 h-3" /> Locked</>}
                  </span>
                </div>
              </div>

              {isPro ? (
                <div className="w-full mt-2 py-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>MASTER ADMIN UNLOCKED • ALL FEEDS LIVE</span>
                </div>
              ) : (
                onOpenPricing && (
                  <button
                    onClick={onOpenPricing}
                    className="w-full mt-2 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-purple-600 text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-200" />
                    Upgrade to VIXY ELITE AI to unlock complete report
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BREAKING NEWS FUNNEL DEMO */}
      {activeTab === 'BREAKING' && (
        <div className="bg-[#070212] p-5 rounded-2xl border border-rose-800/50 font-mono space-y-4 relative z-10">
          <div className="flex items-center justify-between border-b border-rose-900/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500 animate-bounce" />
                🚨 BREAKING NEWS
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">PUBLIC ALERT</span>
            </div>
            <span className="text-xs text-purple-300/60">Just now</span>
          </div>

          <div className="space-y-3 font-sans">
            <p className="text-sm text-white font-bold">
              Bitcoin ETF Spot Volume Spikes +340% Following Institutional SEC Filing Update.
            </p>
            <p className="text-xs text-purple-200/90 font-mono">
              VIXY AI models have recalculated real-time probability vectors in under 340ms.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-mono">
              <div className="bg-[#12072e] p-3 rounded-xl border border-purple-800/40 space-y-1">
                <span className="text-[10px] text-purple-300/60 uppercase font-bold block">Free Members:</span>
                <p className="text-xs text-slate-300">Macro market pulse update coming in 15 minutes.</p>
              </div>

              <div className="bg-gradient-to-r from-amber-950/60 to-purple-950/60 p-3 rounded-xl border border-amber-500/50 space-y-1.5">
                <span className="text-[10px] text-amber-300 uppercase font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Elite Members:
                </span>
                <p className="text-xs text-emerald-300 font-bold">
                  ⚡ Institutional trade setup released immediately to VIXY ELITE AI terminal desks.
                </p>
                {onOpenPricing && (
                  <button
                    onClick={onOpenPricing}
                    className="mt-1 px-3 py-1.5 rounded bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wide flex items-center gap-1 hover:bg-amber-400"
                  >
                    Get Immediate Elite Signals
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WHALE ALERT FUNNEL DEMO */}
      {activeTab === 'WHALE' && (
        <div className="bg-[#070212] p-5 rounded-2xl border border-cyan-800/50 font-mono space-y-4 relative z-10">
          <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-cyan-300 flex items-center gap-2">
                🐋 WHALE ALERT
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">FREE FEED</span>
            </div>
            <span className="text-xs text-purple-300/60">3 mins ago</span>
          </div>

          <div className="space-y-4 font-sans">
            {/* Amount Banner */}
            <div className="p-3.5 bg-[#0b041a] rounded-xl border border-cyan-500/30 flex items-center gap-3">
              <div className="text-3xl">🐋</div>
              <div>
                <h3 className="text-base font-black text-white font-mono">$42,000,000 BTC withdrawn</h3>
                <p className="text-xs text-purple-300/70">Binance → Cold Storage Outflow Detected</p>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
              <div className="bg-[#12072e] p-2.5 rounded-lg border border-purple-800/40">
                <span className="text-[10px] text-purple-300/60 block uppercase">Institutional Confidence</span>
                <span className="text-cyan-300 font-bold">████████░░ 79%</span>
              </div>
              <div className="bg-[#12072e] p-2.5 rounded-lg border border-purple-800/40">
                <span className="text-[10px] text-purple-300/60 block uppercase">Bullish Bias</span>
                <span className="text-emerald-400 font-bold">+7 (Strong Delta)</span>
              </div>
              <div className="bg-[#12072e] p-2.5 rounded-lg border border-purple-800/40">
                <span className="text-[10px] text-purple-300/60 block uppercase">AI Confidence</span>
                <span className="text-amber-300 font-bold">78%</span>
              </div>
            </div>

            {/* FREE AI SUMMARY */}
            <div className="bg-[#0e0624] p-3.5 rounded-xl border border-purple-800/40 space-y-1.5">
              <span className="text-xs font-bold text-purple-200 font-mono block">FREE AI Summary:</span>
              <ul className="text-xs text-slate-300 space-y-1 pl-1">
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span> Large exchange outflow detected
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span> Spot accumulation increasing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span> Buyers absorbing liquidity
                </li>
              </ul>
            </div>

            {/* LOCKED ELITE BOX */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/40 via-[#13072e] to-[#080214] border border-amber-500/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-300 font-mono flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  🔒 Elite Members received:
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  UNLOCKED IN VIP
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold bg-[#1a0c3b] p-2 rounded border border-purple-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Entry Zone
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold bg-[#1a0c3b] p-2 rounded border border-purple-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Stop Loss
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold bg-[#1a0c3b] p-2 rounded border border-purple-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Take Profit
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold bg-[#1a0c3b] p-2 rounded border border-purple-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Position Size
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold bg-[#1a0c3b] p-2 rounded border border-purple-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Risk %
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold bg-[#1a0c3b] p-2 rounded border border-purple-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Probability Score
                </div>
              </div>

              {onOpenPricing && !isPro && (
                <button
                  onClick={onOpenPricing}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-black text-xs font-mono uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  [ UNLOCK ELITE AI ] →
                </button>
              )}
            </div>

            {/* TEASER FOOTER */}
            <div className="p-3 bg-[#080215] rounded-xl border border-purple-900/50 text-center space-y-1 font-mono text-xs">
              <p className="text-purple-300/80 font-bold">
                🔒 Elite Analysis Hidden — Upgrade to unlock:
              </p>
              <p className="text-[11px] text-purple-400/80">
                • Exact Entry • Exact TP • Risk Score • AI Confidence • Live Updates
              </p>
              {onOpenPricing && !isPro && (
                <button
                  onClick={onOpenPricing}
                  className="mt-1 text-amber-300 font-bold hover:underline cursor-pointer"
                >
                  🚀 Join VIXY ELITE Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AI LESSON FUNNEL DEMO */}
      {activeTab === 'LESSON' && (
        <div className="bg-[#070212] p-5 rounded-2xl border border-indigo-800/50 font-mono space-y-4 relative z-10">
          <div className="flex items-center justify-between border-b border-indigo-900/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-indigo-300 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                🧠 AI LESSON: {lessons[activeLessonIndex]?.title || lessons[0]?.title || 'Orderbook Imbalance'}
              </span>
            </div>
            <span className="text-xs text-purple-300/60">Community Education</span>
          </div>

          {/* Lesson Topic Selector Pills */}
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-purple-900/40 font-mono text-xs">
            {lessons.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setActiveLessonIndex(idx)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeLessonIndex === idx
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-[#12072e] text-purple-300/70 hover:text-white'
                }`}
              >
                {item?.title || 'Topic'}
              </button>
            ))}
          </div>

          <div className="space-y-3 font-sans text-xs text-slate-200">
            <div className="p-3 bg-[#12072e] rounded-xl border border-purple-800/40 space-y-1">
              <span className="text-xs font-black text-indigo-300 font-mono block">Core Concept:</span>
              <p className="text-sm font-bold text-white">{lessons[activeLessonIndex]?.concept || lessons[0]?.concept || ''}</p>
            </div>

            <p className="text-xs leading-relaxed text-purple-200/90 font-sans">
              {lessons[activeLessonIndex]?.body || lessons[0]?.body || ''}
            </p>

            <div className="bg-[#0d0522] p-3 rounded-xl border border-purple-700/40 font-mono text-purple-200 text-xs">
              💡 {lessons[activeLessonIndex]?.detail || lessons[0]?.detail || ''}
            </div>

            <div className="bg-[#0a031a] p-4 rounded-xl border border-amber-500/50 space-y-2 font-mono">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Want to see how VIXY AI incorporates this in live trades?
              </span>
              <p className="text-xs text-slate-300 font-sans">
                VIXY ELITE members receive automated order block heatmaps, sub-second volume delta overlays, and full execution plans.
              </p>
              {onOpenPricing && !isPro && (
                <button
                  onClick={onOpenPricing}
                  className="mt-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
                >
                  View Complete Model Output in VIXY ELITE AI →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: 🔥 DAILY RECAP & SOCIAL PROOF */}
      {activeTab === 'RECAP' && (
        <div className="bg-[#070212] p-5 rounded-2xl border border-emerald-800/50 font-mono space-y-4 relative z-10">
          <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-emerald-400 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
                🔥 VIXY AI DAILY RECAP
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">100% AUDITED</span>
            </div>
            <span className="text-xs text-purple-300/60">Today's Performance</span>
          </div>

          <div className="space-y-4 font-sans">
            {/* Accuracy Scoreboard */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#0d0522] rounded-xl border border-purple-800/40">
                <span className="text-[10px] text-purple-300/60 block font-mono uppercase">AI Calls Today</span>
                <span className="text-xl font-black font-mono text-white">18</span>
              </div>
              <div className="p-3 bg-[#0d0522] rounded-xl border border-purple-800/40">
                <span className="text-[10px] text-purple-300/60 block font-mono uppercase">Correct Calls</span>
                <span className="text-xl font-black font-mono text-emerald-400">16</span>
              </div>
              <div className="p-3 bg-[#0d0522] rounded-xl border border-purple-800/40">
                <span className="text-[10px] text-purple-300/60 block font-mono uppercase">Accuracy</span>
                <span className="text-xl font-black font-mono text-amber-300">88.9%</span>
              </div>
            </div>

            {/* Top Highlights */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between bg-[#12072e] p-3 rounded-xl border border-purple-800/40">
                <span className="text-purple-300/80">🚀 Largest Move:</span>
                <span className="text-emerald-400 font-bold">BTC +3.6%</span>
              </div>
              <div className="flex items-center justify-between bg-[#12072e] p-3 rounded-xl border border-purple-800/40">
                <span className="text-purple-300/80">🎯 Best Call:</span>
                <span className="text-cyan-300 font-bold">BTC Long (+214 pips)</span>
              </div>
              <div className="flex items-center justify-between bg-[#12072e] p-3 rounded-xl border border-purple-800/40">
                <span className="text-purple-300/80">🐋 Top Whale:</span>
                <span className="text-amber-300 font-bold">$118M Coinbase Withdrawal</span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-[#12082e] to-purple-950/60 rounded-xl border border-emerald-500/40 space-y-2 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-3 font-mono">
              <div>
                <span className="text-xs font-black text-emerald-300 block">
                  ⭐ Elite Members received 5 complete trade plans today.
                </span>
                <p className="text-xs text-purple-200/80 font-sans">
                  Don't miss tomorrow's early Asian session order flow signals.
                </p>
              </div>
              {onOpenPricing && !isPro && (
                <button
                  onClick={onOpenPricing}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md whitespace-nowrap cursor-pointer"
                >
                  Unlock Tomorrow's Signals
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
