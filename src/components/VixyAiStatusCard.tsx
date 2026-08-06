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
  userRole?: 'DEMO' | 'PRO' | 'ADMIN';
  className?: string;
}

export const VixyAiStatusCard: React.FC<VixyAiStatusCardProps> = ({
  onOpenPricing,
  userRole = 'DEMO',
  className = '',
}) => {
  const isPro = userRole === 'PRO' || userRole === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'STATUS' | 'PULSE' | 'BREAKING' | 'WHALE' | 'LESSON'>('STATUS');
  const [secondsToScan, setSecondsToScan] = useState(842); // 14 mins 02s

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
            onClick={() => setActiveTab('BREAKING')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'BREAKING'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            BREAKING NEWS
          </button>
          <button
            onClick={() => setActiveTab('WHALE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'WHALE'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            WHALE ALERT
          </button>
          <button
            onClick={() => setActiveTab('LESSON')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'LESSON'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/50'
            }`}
          >
            AI LESSON
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

          <div className="space-y-3 font-sans">
            <div className="flex items-center gap-3 bg-[#0d0522] p-3 rounded-xl border border-purple-800/40">
              <div className="text-2xl">🐋</div>
              <div>
                <span className="text-sm font-black text-white font-mono">$42,000,000 BTC Withdrawn from Binance</span>
                <p className="text-xs text-purple-300/80">Historically this net outflow represents heavy spot accumulation.</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#12072e] p-3 rounded-xl border border-purple-800/40 font-mono">
              <span className="text-xs text-purple-300/70">VIXY AI Confidence Shift:</span>
              <span className="text-sm font-black text-emerald-400">72% → 79% (Bullish Delta)</span>
            </div>

            <div className="bg-[#0b031c] p-4 rounded-xl border border-amber-500/50 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="space-y-1 text-center md:text-left">
                <span className="text-xs font-bold text-amber-300 font-mono flex items-center justify-center md:justify-start gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Elite Trade Plan Dispatched
                </span>
                <p className="text-xs text-slate-300">
                  🔒 VIXY ELITE members received the updated strike target, execution stop, and take-profit levels.
                </p>
              </div>
              {onOpenPricing && (
                <button
                  onClick={onOpenPricing}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider whitespace-nowrap shadow-md"
                >
                  Unlock Trade Plan
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
                📚 AI LESSON: Why Funding Rate Matters
              </span>
            </div>
            <span className="text-xs text-purple-300/60">Community Education</span>
          </div>

          <div className="space-y-3 font-sans text-xs text-slate-200">
            <p>
              Funding rates reflect whether longs or shorts are paying a premium to hold leveraged positions. When funding flips negative during an uptrend, retail shorts are overcrowded—historically favoring strong upside short squeezes.
            </p>
            <div className="bg-[#12072e] p-3 rounded-xl border border-purple-800/40 font-mono text-purple-200">
              💡 Today perpetual funding flipped <strong>-0.014%</strong>, signaling an asymmetric long opportunity.
            </div>

            <div className="bg-[#0a031a] p-4 rounded-xl border border-purple-500/50 space-y-2 font-mono">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Want to see how VIXY AI incorporates funding in live trades?
              </span>
              <p className="text-xs text-slate-300 font-sans">
                VIXY ELITE members view real-time funding rate overlays integrated directly into high-frequency scalping signals.
              </p>
              {onOpenPricing && (
                <button
                  onClick={onOpenPricing}
                  className="mt-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md"
                >
                  View Complete Model Output in VIXY ELITE AI
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
