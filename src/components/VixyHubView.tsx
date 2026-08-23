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
        { id: "terminal", label: "Dashboard", icon: LayoutDashboard, desc: "Global command center", isPro: false },
        { id: "compare", label: "Asset Compare", icon: Sliders, desc: "BTC, ETH, SOL tracking", isPro: false },
        { id: "scalping", label: "Scalping Desk", icon: Zap, desc: "15S ultra-fast execution", isPro: true },
        { id: "onehour", label: "1-Hour Desk", icon: Clock, desc: "1H positional swing tracking", isPro: true },
      ]
    },
    {
      group: "INTELLIGENCE",
      items: [
        { id: "history", label: "VIXY LOCKS", icon: BarChart2, desc: "Historical cycle results", isPro: false },
        { id: "scanner", label: "Edge Scanner", icon: Target, desc: "Market anomaly detection", isPro: true },
        { id: "markets", label: "Markets", icon: TrendingUp, desc: "Broad market internals", isPro: false },
        { id: "patterns", label: "Pattern Engine", icon: Sparkles, desc: "Algorithmic cluster analysis", isPro: false },
        { id: "whales", label: "Whale Tracker", icon: Layers, desc: "Institutional order flow", isPro: true },
      ]
    },
    {
      group: "RESEARCH",
      items: [
        { id: "explainability", label: "Explainability Vault", icon: BrainCircuit, desc: "Neural weight inspection", isPro: false },
        { id: "perflab", label: "Performance War Room", icon: Award, desc: "Predictive model accuracy", isPro: true },
        { id: "replay", label: "Replay Center", icon: History, desc: "Historical session playback", isPro: false },
        { id: "journal", label: "Trade Journal", icon: BookOpen, desc: "Personalized execution log", isPro: false },
      ]
    },
    {
      group: "SYSTEM",
      items: [
        { id: "alerts", label: "Alerts", icon: Bell, desc: "Custom notification rules", isPro: false },
        { id: "pricing", label: "Pricing", icon: CreditCard, desc: "Manage subscription plans", isPro: false },
        { id: "settings", label: "Settings", icon: Settings, desc: "Account and platform prefs", isPro: false },
        { id: "vixy-learning", label: "VIXY Learning Center", icon: BrainCircuit, desc: "Documentation & guides", isPro: false },
        { id: "leaderboard", label: "Leaderboard", icon: Trophy, desc: "Top trader rankings", isPro: false },
        { id: "changelog", label: "System Status", icon: Activity, desc: "Service health & updates", isPro: false },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#05020a] p-4 md:p-8 lg:p-12 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="vixy-page-title text-white mb-2">VIXY'S VAULT <span className="text-purple-400">HUB</span></h1>
            <p className="text-purple-300/70 text-sm font-medium">Select a terminal to initiate neural analysis protocol</p>
          </div>
          
          <div className="vixy-card px-4 py-2 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-emerald-400 font-bold font-mono text-xs">BTC/USDT</span>
            </div>
            <div className="h-4 w-px bg-purple-900/40" />
            <span className="text-white font-mono font-black text-sm">${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`text-xs font-mono font-bold ${ticker.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Flagship Hero Card */}
        <a 
          href={TAB_TO_PATH['vixylive']} 
          onClick={(e) => handleNavigate(e, 'vixylive', true)}
          className="block vixy-card-elevated border-amber-500/30 overflow-hidden group hover:border-amber-400/50 transition-all duration-300 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-purple-600/5 to-amber-500/5 group-hover:from-amber-500/10 group-hover:via-purple-600/10 group-hover:to-amber-500/10 transition-colors" />
          
          <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center justify-between relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-purple-600 p-0.5 shadow-[0_0_30px_rgba(251,191,36,0.3)] group-hover:shadow-[0_0_40px_rgba(251,191,36,0.5)] transition-shadow">
                <div className="w-full h-full bg-[#0a0518] rounded-2xl flex items-center justify-center">
                  <Flame className="w-10 h-10 text-amber-400" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-purple-400 font-['Syne'] tracking-tight">VIXY LIVE</h2>
                  <span className="vixy-badge text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500">FLAGSHIP</span>
                </div>
                <p className="text-purple-200/80 font-medium">Real-time 15-minute predictive engine & live signal execution</p>
              </div>
            </div>

            <div className="flex items-center gap-6 md:gap-12 w-full md:w-auto bg-[#0a0518]/50 p-4 rounded-2xl border border-purple-900/30">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-purple-400/70 font-mono font-bold uppercase tracking-wider mb-1">Confidence</span>
                <span className="text-glow-amber text-2xl font-black font-mono">{confidence.toFixed(1)}%</span>
              </div>
              <div className="w-px h-10 bg-purple-900/40" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-purple-400/70 font-mono font-bold uppercase tracking-wider mb-1">Lock Quality</span>
                <span className="text-glow-purple text-2xl font-black font-mono">{lockQuality}/100</span>
              </div>
              <div className="w-px h-10 bg-purple-900/40" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-purple-400/70 font-mono font-bold uppercase tracking-wider mb-1">Cycle Expiry</span>
                <span className="text-glow-amber text-2xl font-black font-mono">{cycleExpiry}</span>
              </div>
              
              {!hasActiveAccess && (
                <div className="absolute top-4 right-4 md:static">
                  <div className="p-2 bg-purple-900/40 rounded-xl border border-purple-500/30">
                    <Lock className="w-5 h-5 text-purple-300" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </a>

        {/* Terminal Grid */}
        <div className="space-y-10">
          {terminals.map((group) => (
            <div key={group.group} className="space-y-4">
              <h3 className="vixy-section-title px-1">{group.group}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isLocked = item.isPro && !hasActiveAccess;
                  
                  return (
                    <a
                      key={item.id}
                      href={TAB_TO_PATH[item.id] || '#'}
                      onClick={(e) => handleNavigate(e, item.id, item.isPro)}
                      className="vixy-card group p-5 hover:bg-[#0c0620] hover:border-purple-500/40 transition-all duration-200 flex flex-col relative overflow-hidden h-36"
                    >
                      <div className="flex items-start justify-between mb-auto">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl transition-colors ${
                            isLocked 
                              ? 'bg-purple-950/30 text-purple-500/50' 
                              : 'bg-purple-900/30 text-purple-300 group-hover:bg-purple-600 group-hover:text-white'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <h4 className={`font-bold transition-colors ${isLocked ? 'text-purple-300/50' : 'text-purple-100 group-hover:text-white'}`}>
                            {item.label}
                          </h4>
                        </div>
                        
                        {item.isPro && (
                          <span className={`vixy-badge ${isLocked ? 'bg-purple-950/40 text-purple-500/50 border border-purple-900/20' : 'bg-purple-600 text-white shadow-sm'}`}>
                            PRO
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-end justify-between">
                        <p className={`text-xs font-medium max-w-[80%] ${isLocked ? 'text-purple-500/40' : 'text-purple-300/60 group-hover:text-purple-200'}`}>
                          {item.desc}
                        </p>
                        
                        {isLocked ? (
                          <Lock className="w-4 h-4 text-purple-500/40" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-purple-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                        )}
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
