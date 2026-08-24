import React from 'react';
import {
  LayoutDashboard, Flame, Sliders, Zap, Clock, BarChart2, Target, TrendingUp,
  Sparkles, Layers, BrainCircuit, Award, History, BookOpen, Bell, CreditCard,
  Settings, Bot, Trophy, Activity, Globe, Lock, ChevronRight
} from 'lucide-react';
import { TAB_TO_PATH } from '../utils/routePaths';
import { BTCTicker } from '../types';
import { useLiveSignal } from '../hooks/useLiveSignal';

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
  const { signal } = useLiveSignal('BTC', '15m');
  
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

  const confidence = signal?.confidence || 0;
  const lockQuality = signal?.lockEvaluation?.lockQuality ?? 0;
  
  const timeRemaining = signal?.timeRemaining ?? 0;
  const mm = Math.floor(timeRemaining / 60);
  const ss = timeRemaining % 60;
  const cycleExpiry = `${mm}:${ss.toString().padStart(2, '0')}`;
  
  const terminals = [
    {
      group: "VIXY VAULT",
      items: [
        { id: "terminal", label: "Dashboard", icon: LayoutDashboard, desc: "Global command center & execution matrix", isPro: false, isPrimary: true },
        { id: "compare", label: "Asset Compare", icon: Sliders, desc: "Multi-asset BTC, ETH, SOL telemetry tracking", isPro: false, isPrimary: true },
        { id: "scalping", label: "Scalping Desk", icon: Zap, desc: "15S ultra-fast taker execution terminal", isPro: true, isPrimary: true },
        { id: "onehour", label: "1-Hour Desk", icon: Clock, desc: "1H positional swing tracking & structural bias", isPro: true, isPrimary: true },
      ]
    },
    {
      group: "INTELLIGENCE",
      items: [
        { id: "history", label: "VIXY Locks", icon: BarChart2, desc: "Historical cycle results & immutable ledger", isPro: false },
        { id: "scanner", label: "Edge Scanner", icon: Target, desc: "Market anomaly & liquidity imbalance detection", isPro: true },
        { id: "markets", label: "Markets", icon: TrendingUp, desc: "Broad market internals & cross-venue delta", isPro: false },
        { id: "patterns", label: "Pattern Engine", icon: Sparkles, desc: "Algorithmic cluster analysis & regime shifts", isPro: false },
        { id: "whales", label: "Whale Tracker", icon: Layers, desc: "Institutional order flow & whale sweeps", isPro: true },
      ]
    },
    {
      group: "RESEARCH",
      items: [
        { id: "explainability", label: "Explainability Vault", icon: BrainCircuit, desc: "Neural weight inspection & decision breakdown", isPro: false },
        { id: "perflab", label: "Performance War Room", icon: Award, desc: "Predictive model accuracy & calibration audit", isPro: true },
        { id: "replay", label: "Replay Center", icon: History, desc: "Historical session playback & step analysis", isPro: false },
        { id: "journal", label: "Trade Journal", icon: BookOpen, desc: "Personalized execution log & PnL attribution", isPro: false },
      ]
    },
    {
      group: "SYSTEM",
      items: [
        { id: "alerts", label: "Alerts", icon: Bell, desc: "Custom notification rules & trigger webhooks", isPro: false },
        { id: "pricing", label: "Pricing", icon: CreditCard, desc: "Manage subscription plans & tier entitlements", isPro: false },
        { id: "settings", label: "Settings", icon: Settings, desc: "Account, API keys and platform preferences", isPro: false },
        { id: "vixy-learning", label: "VIXY Learning Center", icon: BrainCircuit, desc: "Documentation, methodology & system guides", isPro: false },
        { id: "leaderboard", label: "Leaderboard", icon: Trophy, desc: "Top trader rankings & verified track records", isPro: false },
        { id: "changelog", label: "System Status", icon: Activity, desc: "Service health, telemetry & engine updates", isPro: false },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#05040a] p-4 md:p-8 lg:p-12 overflow-y-auto text-slate-200 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
              <span className="text-[10px] font-mono font-extrabold text-purple-300/80 uppercase tracking-widest">
                VIXY VAULT / COMMAND
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans uppercase">
              COMMAND CENTER
            </h1>
            <p className="text-purple-200/60 text-xs font-sans font-medium">
              REAL-TIME QUANTITATIVE INTELLIGENCE & GLOBAL DECISION MATRIX
            </p>
          </div>
          
          <div className="px-4 py-2 rounded-xl bg-[#0a0618] border border-purple-900/40 flex items-center gap-4 text-xs font-mono shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-purple-200 font-extrabold">BTC/USDT</span>
            </div>
            <div className="h-4 w-px bg-purple-900/50" />
            <span className="text-white font-mono font-extrabold">${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded-md ${ticker.change24h >= 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'}`}>
              {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Flagship Hero Card */}
        <a 
          href={TAB_TO_PATH['vixylive']} 
          onClick={(e) => handleNavigate(e, 'vixylive', false)}
          className="block p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#0d0722] via-[#090518] to-[#0e0724] border border-purple-600/40 hover:border-purple-400/80 transition-all duration-200 relative group shadow-[0_0_30px_rgba(168,85,247,0.12)] hover:shadow-[0_0_40px_rgba(168,85,247,0.25)]"
        >
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-950/90 to-purple-900/60 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:border-purple-400 transition-colors">
                <Flame className="w-7 h-7 text-purple-300 group-hover:text-amber-400 transition-colors" />
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-black text-white font-sans tracking-tight uppercase group-hover:text-purple-300 transition-colors">
                    VIXY LIVE
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-950/90 text-purple-300 border border-purple-600/50 text-[10px] font-mono font-black uppercase tracking-wider">
                    FLAGSHIP
                  </span>
                </div>
                <p className="text-slate-400 text-xs font-sans font-medium">
                  Real-time 15-minute predictive decision stream & live machine execution
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 w-full md:w-auto bg-[#0a0618] p-4 rounded-xl border border-purple-900/50 font-mono shadow-inner">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider mb-1">CONFIDENCE</span>
                <span className="text-lg font-black text-white">{confidence.toFixed(1)}%</span>
              </div>
              <div className="w-px h-8 bg-purple-900/50" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider mb-1">LOCK QUALITY</span>
                <span className="text-lg font-black text-slate-200">{lockQuality}/100</span>
              </div>
              <div className="w-px h-8 bg-purple-900/50" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider mb-1">CYCLE EXPIRY</span>
                <span className="text-lg font-black text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]">{cycleExpiry}</span>
              </div>
            </div>
          </div>
        </a>

        {/* Terminal Grid */}
        <div className="space-y-8">
          {terminals.map((group) => (
            <div key={group.group} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <h3 className="text-xs font-mono font-black text-purple-300/80 uppercase tracking-widest">{group.group}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  
                  return (
                    <a
                      key={item.id}
                      href={TAB_TO_PATH[item.id] || '#'}
                      onClick={(e) => handleNavigate(e, item.id, item.isPro)}
                      className={`p-4 sm:p-5 rounded-2xl bg-[#0a0618] border ${
                        item.isPrimary ? 'border-purple-800/50 shadow-[0_0_15px_rgba(168,85,247,0.08)]' : 'border-purple-900/30'
                      } hover:bg-[#0f0924] hover:border-purple-500/50 hover:-translate-y-1 transition-all duration-200 ease-out flex flex-col justify-between h-36 group shadow-md hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)] cursor-pointer relative`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-900/50 text-purple-300 group-hover:text-white group-hover:bg-purple-900/80 group-hover:border-purple-500/50 transition-all">
                            <Icon className="w-4 h-4" />
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-100 group-hover:text-white font-sans tracking-tight">
                            {item.label}
                          </h4>
                        </div>
                        
                        {item.isPro && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 text-[9px] font-mono font-extrabold uppercase">
                            PRO
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-end justify-between text-xs font-sans">
                        <p className="text-slate-400 font-medium text-[11.5px] leading-snug max-w-[85%] group-hover:text-slate-300 transition-colors">
                          {item.desc}
                        </p>
                        
                        <ChevronRight className="w-4 h-4 text-purple-900/80 group-hover:text-purple-300 group-hover:translate-x-1 transition-all" />
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
