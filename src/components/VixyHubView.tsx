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
    <div className="min-h-screen bg-[#05030a] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mb-1">
              VIXY'S VAULT <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400">HUB</span>
            </h1>
            <p className="text-purple-300/70 text-xs sm:text-sm font-mono">Select a terminal to initiate neural analysis protocol</p>
          </div>
          
          <div className="bg-[#080414] border border-purple-800/30 rounded-2xl px-4 py-2 flex items-center gap-4 font-mono shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-emerald-400 font-bold text-xs">BTC/USDT</span>
            </div>
            <div className="h-4 w-px bg-purple-800/40" />
            <span className="text-white font-black text-sm">${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`text-xs font-bold ${ticker.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Flagship Hero Card */}
        <a 
          href={TAB_TO_PATH['vixylive']} 
          onClick={(e) => handleNavigate(e, 'vixylive', true)}
          className="block bg-[#080414] border border-purple-800/30 hover:border-purple-600/50 rounded-2xl overflow-hidden group transition-all duration-300 relative shadow-xl shadow-purple-950/40"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-indigo-900/15 to-purple-900/10 group-hover:from-purple-800/20 group-hover:via-indigo-800/25 group-hover:to-purple-800/20 transition-all" />
          
          <div className="p-6 sm:p-8 md:p-10 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start lg:items-center justify-between relative z-10 font-mono">
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-violet-600 p-0.5 shadow-[0_0_25px_rgba(168,85,247,0.3)] group-hover:shadow-[0_0_35px_rgba(168,85,247,0.5)] transition-all shrink-0">
                <div className="w-full h-full bg-[#080414] rounded-[14px] flex items-center justify-center">
                  <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 animate-pulse" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-violet-200 to-indigo-300 tracking-tight">VIXY LIVE</h2>
                  <span className="px-2.5 py-0.5 text-[10px] rounded-lg font-black bg-purple-600/30 text-purple-300 border border-purple-500/40 tracking-wider">FLAGSHIP</span>
                </div>
                <p className="text-purple-200/80 font-medium text-xs sm:text-sm font-sans">Real-time 15-minute predictive engine &amp; live signal execution</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8 lg:gap-10 w-full lg:w-auto bg-[#0d0722]/80 p-4 rounded-2xl border border-purple-800/30">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-purple-400/80 font-bold uppercase tracking-wider mb-1">Confidence</span>
                <span className="text-xl sm:text-2xl font-black text-purple-200">{confidence.toFixed(1)}%</span>
              </div>
              <div className="w-px h-10 bg-purple-800/40" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-purple-400/80 font-bold uppercase tracking-wider mb-1">Lock Quality</span>
                <span className="text-xl sm:text-2xl font-black text-purple-200">{lockQuality}/100</span>
              </div>
              <div className="w-px h-10 bg-purple-800/40" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-purple-400/80 font-bold uppercase tracking-wider mb-1">Cycle Expiry</span>
                <span className="text-xl sm:text-2xl font-black text-purple-200">{cycleExpiry}</span>
              </div>
              
              {!hasActiveAccess && (
                <div className="ml-2">
                  <div className="p-2 bg-purple-900/40 rounded-xl border border-purple-500/30">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </a>

        {/* Terminal Grid */}
        <div className="space-y-8 sm:space-y-10">
          {terminals.map((group) => (
            <div key={group.group} className="space-y-4">
              <h3 className="text-xs font-mono font-black text-purple-400/80 uppercase tracking-widest px-1">{group.group}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isLocked = item.isPro && !hasActiveAccess;
                  
                  return (
                    <a
                      key={item.id}
                      href={TAB_TO_PATH[item.id] || '#'}
                      onClick={(e) => handleNavigate(e, item.id, item.isPro)}
                      className="bg-[#080414] border border-purple-800/30 hover:border-purple-600/50 hover:bg-[#0f0728] rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden h-36 shadow-lg shadow-purple-950/20 group"
                    >
                      <div className="flex items-start justify-between mb-auto font-mono">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl transition-all ${
                            isLocked 
                              ? 'bg-purple-950/30 text-purple-500/40' 
                              : 'bg-purple-900/30 text-purple-300 group-hover:bg-purple-600 group-hover:text-white'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <h4 className={`font-bold text-sm transition-colors ${isLocked ? 'text-purple-300/40' : 'text-purple-100 group-hover:text-white'}`}>
                            {item.label}
                          </h4>
                        </div>
                        
                        {item.isPro && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isLocked 
                              ? 'bg-purple-950/40 text-purple-500/50 border border-purple-900/30' 
                              : 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                          }`}>
                            PRO
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-end justify-between font-mono">
                        <p className={`text-xs font-sans font-medium max-w-[80%] ${isLocked ? 'text-purple-500/40' : 'text-purple-300/70 group-hover:text-purple-200'}`}>
                          {item.desc}
                        </p>
                        
                        {isLocked ? (
                          <Lock className="w-4 h-4 text-purple-500/40" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-purple-500 group-hover:text-purple-300 group-hover:translate-x-1 transition-all" />
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
