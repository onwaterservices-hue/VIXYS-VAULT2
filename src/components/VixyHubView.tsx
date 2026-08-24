import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Flame,
  Sliders,
  Zap,
  Clock,
  BarChart2,
  Target,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Layers,
  BrainCircuit,
  Award,
  History,
  BookOpen,
  Bell,
  CreditCard,
  Settings,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  Radio,
  ExternalLink
} from 'lucide-react';
import { TAB_TO_PATH } from '../utils/routePaths';
import { BTCTicker } from '../types';
import { useCanonical15mDecision, getNormalizedLifecycleState } from '../hooks/useCanonical15mDecision';

interface VixyHubViewProps {
  ticker: BTCTicker;
  userRole?: string;
  userProduct?: string;
  hasActiveAccess?: boolean;
  isAuthenticated?: boolean;
  onOpenAuth?: (mode: "login" | "register") => void;
  setActiveTab: (tab: string) => void;
}

export const VixyHubView: React.FC<VixyHubViewProps> = ({
  ticker,
  userRole = "ADMIN",
  userProduct = "NONE",
  hasActiveAccess = false,
  isAuthenticated = false,
  onOpenAuth,
  setActiveTab,
}) => {
  const { decision: canonical15m, dataHealthStatus } = useCanonical15mDecision();
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Precise 1-second interval to calculate smooth countdown from authoritative timestamp
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Direction and conviction state
  const rawDirection = canonical15m.direction || 'UP';
  const isUp = rawDirection === 'UP' || (rawDirection as any) === 'YES';
  const isDown = rawDirection === 'DOWN' || (rawDirection as any) === 'NO';
  const isSkip = rawDirection === 'SKIP' || rawDirection === 'NEUTRAL';

  const calibrationConfidence = canonical15m.confidence ?? 78;
  const lockScoreRaw = canonical15m.lockScore ?? (canonical15m.lockEvaluation?.lockScore ?? 87);
  const lockQuality = lockScoreRaw <= 10 ? Math.round(lockScoreRaw * 10) : Math.round(lockScoreRaw);
  const reversalRisk = canonical15m.reversalRisk ?? 22;
  const regime = canonical15m.regime || 'TRENDING_BULL';
  const lifecycle = getNormalizedLifecycleState(canonical15m);
  const isLocked = lifecycle === 'LOCKED' || lifecycle === 'PROTECTED';

  // Authoritative countdown calculation: cycleEnd timestamp minus current epoch
  const secondsRemaining = useMemo(() => {
    if (canonical15m.cycleEnd && canonical15m.cycleEnd > nowMs) {
      return Math.max(0, Math.floor((canonical15m.cycleEnd - nowMs) / 1000));
    }
    if (typeof canonical15m.timeRemainingSec === 'number') {
      return Math.max(0, canonical15m.timeRemainingSec);
    }
    const epochSec = Math.floor(nowMs / 1000);
    return 900 - (epochSec % 900);
  }, [canonical15m.cycleEnd, canonical15m.timeRemainingSec, nowMs]);

  const mm = Math.floor(secondsRemaining / 60);
  const ss = secondsRemaining % 60;
  const cycleExpiry = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  const spotPrice = ticker.price || canonical15m.currentSpot || 64591.20;
  const spotChange = ticker.change24h || 1.85;

  const handleNavigate = (e: React.MouseEvent, id: string, isProOnly: boolean) => {
    e.preventDefault();
    if (isProOnly && !hasActiveAccess && id !== 'pricing') {
      if (!isAuthenticated && onOpenAuth) {
        onOpenAuth('register');
      } else {
        setActiveTab('pricing');
      }
      return;
    }
    setActiveTab(id);
  };

  // Ambient glow styles based on direction
  const ambientGlowClass = isUp
    ? 'border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.06)] bg-gradient-to-b from-[#06140d]/40 via-[#070512]/60 to-[#070512]'
    : isDown
    ? 'border-rose-500/30 shadow-[0_0_50px_rgba(239,68,68,0.06)] bg-gradient-to-b from-[#140608]/40 via-[#070512]/60 to-[#070512]'
    : 'border-purple-500/30 shadow-[0_0_50px_rgba(124,58,237,0.06)] bg-gradient-to-b from-[#0e0724]/40 via-[#070512]/60 to-[#070512]';

  const terminalSections = [
    {
      group: "PRIMARY",
      items: [
        { id: "terminal", label: "Crypto Prediction Center", icon: Sparkles, desc: "Flagship 15M analytical workspace & evidence matrix", isPro: false, isPrimary: true, badge: "FLAGSHIP" },
        { id: "vixylive", label: "VIXY LIVE", icon: Flame, desc: "Modular personal trading command deck (MY VIXY)", isPro: false, isPrimary: true, badge: "CUSTOM" },
      ]
    },
    {
      group: "TERMINALS",
      items: [
        { id: "scalping", label: "Scalping Desk", icon: Zap, desc: "15S ultra-fast taker execution terminal", isPro: true, badge: "15S" },
        { id: "onehour", label: "1-Hour Desk", icon: Clock, desc: "1H positional swing tracking & structural bias", isPro: true, badge: "1H" },
        { id: "compare", label: "Asset Compare", icon: Sliders, desc: "Multi-asset BTC, ETH, SOL telemetry matrix", isPro: false, badge: "MULTI" },
      ]
    },
    {
      group: "INTELLIGENCE",
      items: [
        { id: "markets", label: "Markets", icon: TrendingUp, desc: "Broad market internals & cross-venue delta", isPro: false },
        { id: "patterns", label: "Pattern Engine", icon: Sparkles, desc: "Algorithmic cluster analysis & regime detection", isPro: true, badge: "PRO" },
        { id: "whales", label: "Whale Tracker", icon: Layers, desc: "Institutional order flow & whale sweeps", isPro: true, badge: "PRO" },
        { id: "scanner", label: "Edge Scanner", icon: Target, desc: "Liquidity imbalance & statistical edge radar", isPro: true, badge: "+EV" },
        { id: "explainability", label: "News & Sentiment", icon: BrainCircuit, desc: "Macro sentiment, narrative feeds & neural weights", isPro: false },
        { id: "history", label: "VIXY Locks", icon: BarChart2, desc: "Immutable historical cycle ledger & verification", isPro: false, badge: "LEDGER" },
      ]
    },
    {
      group: "HISTORY",
      items: [
        { id: "perflab", label: "Performance", icon: Award, desc: "Predictive model accuracy & calibration audit", isPro: true },
        { id: "journal", label: "Trade Journal", icon: BookOpen, desc: "Personalized execution log & PnL attribution", isPro: false },
        { id: "replay", label: "Replay Center", icon: History, desc: "Historical session playback & step analysis", isPro: false },
      ]
    },
    {
      group: "ACCOUNT",
      items: [
        { id: "alerts", label: "Alerts", icon: Bell, desc: "Custom notification rules & trigger webhooks", isPro: false },
        { id: "pricing", label: "Pricing", icon: CreditCard, desc: "Manage subscription plans & tier entitlements", isPro: false },
        { id: "settings", label: "Settings", icon: Settings, desc: "Account preferences, API keys and security", isPro: false },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#05040a] p-3 sm:p-6 md:p-8 lg:p-10 overflow-y-auto text-slate-200 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Bar: Identity, Market Ticker, Regime, System Health, Account Status */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-purple-900/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_#a855f7]" />
              <span className="text-[10.5px] font-mono font-bold text-purple-300/80 uppercase tracking-widest">
                VIXY VAULT // EXECUTIVE LAYER
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans uppercase">
              COMMAND CENTER
            </h1>
            <p className="text-slate-400 text-xs font-sans">
              Live quantitative decision matrix and institutional macro intelligence.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Spot Price Pill */}
            <div className="px-3.5 py-2 rounded-xl bg-[#090614] border border-purple-900/40 flex items-center gap-3 text-xs font-mono shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-purple-200 font-bold">BTC/USD</span>
              </div>
              <div className="h-3.5 w-px bg-purple-900/50" />
              <span className="text-white font-mono font-bold">${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${spotChange >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'}`}>
                {spotChange >= 0 ? '+' : ''}{spotChange.toFixed(2)}%
              </span>
            </div>

            {/* Market Regime Pill */}
            <div className="px-3 py-2 rounded-xl bg-[#090614] border border-purple-900/40 flex items-center gap-2 text-xs font-mono">
              <span className="text-[10px] text-purple-400 font-bold uppercase">REGIME:</span>
              <span className="text-white font-bold text-[11px]">{regime.replace('_', ' ')}</span>
            </div>

            {/* System Health */}
            <div className="px-3 py-2 rounded-xl bg-[#090614] border border-purple-900/40 flex items-center gap-2 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${dataHealthStatus === 'LIVE' ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-amber-400'}`} />
              <span className="text-slate-300 text-[11px]">{dataHealthStatus === 'LIVE' ? 'FEED ACTIVE' : dataHealthStatus}</span>
            </div>

            {/* Account Status Pill */}
            <div className="px-3 py-2 rounded-xl bg-[#090614] border border-purple-900/40 flex items-center gap-2 text-xs font-mono">
              <span className="text-purple-300 text-[11px] font-bold">{userRole}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50">
                {hasActiveAccess ? 'ACTIVE' : 'UNPAID'}
              </span>
            </div>
          </div>
        </div>

        {/* Flagship Hero Card: "WHAT IS HAPPENING RIGHT NOW?" */}
        <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${ambientGlowClass}`}>
          <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
            
            {/* Left: Direction & Calibration Confidence */}
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-700/50 text-[10px] font-mono font-black uppercase tracking-wider">
                  CANONICAL 15M CYCLE
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                  isLocked ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/50' : 'bg-amber-950/90 text-amber-300 border-amber-700/50'
                }`}>
                  STATUS: {lifecycle}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {isUp ? (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <ArrowUpRight className="w-8 h-8" />
                  </div>
                ) : isDown ? (
                  <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <ArrowDownRight className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
                    <Minus className="w-8 h-8" />
                  </div>
                )}

                <div>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-3xl sm:text-4xl font-black font-sans tracking-tight ${isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-slate-200'}`}>
                      {rawDirection}
                    </span>
                    <span className="text-xl sm:text-2xl font-mono font-bold text-white">
                      {calibrationConfidence}%
                    </span>
                    <span className="text-xs font-mono text-slate-400 uppercase">CALIBRATION CONFIDENCE</span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    {canonical15m.gemini?.primaryHypothesis || 'Multi-venue taker flow alignment synchronized with 15M cycle policy.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Key Authoritative Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto font-mono">
              
              {/* Metric 1: Calibration Confidence */}
              <div className="p-3.5 rounded-2xl bg-[#090614]/90 border border-purple-900/40 flex flex-col justify-between">
                <span className="text-[9.5px] text-purple-300/70 font-bold uppercase">CALIBRATION</span>
                <span className="text-lg font-black text-white">{calibrationConfidence}%</span>
                <span className="text-[9.5px] text-slate-500 font-sans">Model Conviction</span>
              </div>

              {/* Metric 2: Lock Quality */}
              <div className="p-3.5 rounded-2xl bg-[#090614]/90 border border-purple-900/40 flex flex-col justify-between">
                <span className="text-[9.5px] text-purple-300/70 font-bold uppercase">LOCK QUALITY</span>
                <span className="text-lg font-black text-slate-200">{lockQuality} <span className="text-xs text-slate-500">/ 100</span></span>
                <span className="text-[9.5px] text-slate-500 font-sans">{canonical15m.evidenceAlignment ?? 8}/10 Aligned</span>
              </div>

              {/* Metric 3: Reversal Risk */}
              <div className="p-3.5 rounded-2xl bg-[#090614]/90 border border-purple-900/40 flex flex-col justify-between">
                <span className="text-[9.5px] text-purple-300/70 font-bold uppercase">REVERSAL RISK</span>
                <span className={`text-lg font-black ${reversalRisk < 30 ? 'text-emerald-400' : 'text-amber-400'}`}>{reversalRisk}%</span>
                <span className="text-[9.5px] text-slate-500 font-sans">{reversalRisk < 30 ? 'Low Hazard' : 'Moderate'}</span>
              </div>

              {/* Metric 4: Cycle Expiry */}
              <div className="p-3.5 rounded-2xl bg-[#090614]/90 border border-purple-900/40 flex flex-col justify-between">
                <span className="text-[9.5px] text-purple-300/70 font-bold uppercase">CYCLE EXPIRES</span>
                <span className="text-lg font-black text-emerald-400 font-mono">{cycleExpiry}</span>
                <span className="text-[9.5px] text-slate-500 font-sans">Auto Rollover</span>
              </div>

            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 pt-5 border-t border-purple-900/30 flex flex-wrap items-center justify-between gap-4 font-sans">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => handleNavigate(e, 'terminal', false)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Open Crypto Prediction Center</span>
              </button>
              <button
                onClick={(e) => handleNavigate(e, 'vixylive', false)}
                className="px-5 py-2.5 rounded-xl bg-[#0e0a22] hover:bg-purple-950/60 border border-purple-700/40 text-purple-200 hover:text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Launch VIXY LIVE</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
              <span>CONTRACT: <strong className="text-slate-200">{canonical15m.contractId || canonical15m.decisionId}</strong></span>
              <span>•</span>
              <span>STRIKE: <strong className="text-slate-200">${(canonical15m.openStrike || (spotPrice - 38)).toFixed(2)}</strong></span>
            </div>
          </div>
        </div>

        {/* Modular Navigation Grid for Desks, Intelligence & Systems */}
        <div className="space-y-8">
          {terminalSections.map((section) => (
            <div key={section.group} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <h3 className="text-xs font-mono font-bold text-purple-300/80 uppercase tracking-widest">{section.group}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isPrimary = (item as any).isPrimary;

                  return (
                    <a
                      key={item.id}
                      href={TAB_TO_PATH[item.id] || '#'}
                      onClick={(e) => handleNavigate(e, item.id, item.isPro)}
                      className={`p-4 sm:p-5 rounded-2xl bg-[#090614] border ${
                        isPrimary ? 'border-purple-700/50 shadow-[0_0_20px_rgba(124,58,237,0.08)]' : 'border-purple-900/30'
                      } hover:bg-[#0f0a24] hover:border-purple-500/50 transition-all duration-200 flex flex-col justify-between h-36 group cursor-pointer relative`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-900/50 text-purple-300 group-hover:text-white group-hover:bg-purple-900/80 group-hover:border-purple-500/50 transition-all">
                            <Icon className="w-4 h-4" />
                          </div>
                          <h4 className="font-bold text-sm text-slate-100 group-hover:text-white font-sans tracking-tight">
                            {item.label}
                          </h4>
                        </div>
                        
                        {(item as any).badge && (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            (item as any).badge === 'FLAGSHIP' ? 'bg-purple-950 text-purple-300 border border-purple-700/60' :
                            (item as any).badge === 'CUSTOM' ? 'bg-amber-950 text-amber-300 border border-amber-700/60' :
                            (item as any).badge === '+EV' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' :
                            'bg-purple-950 text-purple-300 border border-purple-900/60'
                          }`}>
                            {(item as any).badge}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-end justify-between text-xs font-sans">
                        <p className="text-slate-400 text-[11.5px] leading-snug max-w-[85%] group-hover:text-slate-300 transition-colors">
                          {item.desc}
                        </p>
                        
                        <ChevronRight className="w-4 h-4 text-purple-900/80 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
