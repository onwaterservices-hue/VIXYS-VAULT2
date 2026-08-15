import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Zap,
  Sparkles,
  Layers,
  Sliders,
  BookOpen,
  Bell,
  BarChart2,
  CreditCard,
  Settings,
  X,
  Search,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  BrainCircuit,
  Globe,
  Award,
  Compass,
  History,
  Target,
  Trophy,
  Activity,
  FileText,
  ShieldCheck,
  AlertTriangle,
  LifeBuoy,
  Info,
  Bot,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSearch: () => void;
  userRole?: 'UNPAID' | 'PRO' | 'ADMIN';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
  onOpenSearch,
  userRole = 'ADMIN',
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('vixy_sidebar_collapsed') === 'true';
  });

  const [isSearchHidden, setIsSearchHidden] = useState<boolean>(() => {
    return localStorage.getItem('vixy_hide_search') === 'true';
  });

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('vixy_sidebar_collapsed', String(nextState));
  };

  const toggleHideSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isSearchHidden;
    setIsSearchHidden(nextState);
    localStorage.setItem('vixy_hide_search', String(nextState));
  };

  const navSections = [
    {
      title: 'COMMAND',
      items: [
        { id: 'terminal', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'compare', label: 'Asset Compare', icon: Sliders, badge: 'VS' },
        { id: 'scalping', label: 'Scalping Desk', icon: Zap, badge: '15S' },
        { id: 'onehour', label: '1-Hour Desk', icon: Sparkles, badge: '1H' },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { id: 'history', label: 'VIXY LOCKS', icon: BarChart2, badge: 'VIXY' },
        { id: 'scanner', label: 'Edge Scanner', icon: Target, badge: '+EV' },
        { id: 'markets', label: 'Markets', icon: TrendingUp },
        { id: 'patterns', label: 'Pattern Engine', icon: Sparkles },
        { id: 'whales', label: 'Whale Tracker', icon: Layers },
      ],
    },
    {
      title: 'RESEARCH',
      items: [
        { id: 'explainability', label: 'Explainability Vault', icon: BrainCircuit, badge: 'CORE' },
        { id: 'perflab', label: 'Performance Lab', icon: Award, badge: 'LAB' },
        { id: 'replay', label: 'Replay Center', icon: History },
        { id: 'journal', label: 'Trade Journal', icon: BookOpen },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'alerts', label: 'Alerts & Webhooks', icon: Bell },
        { id: 'pricing', label: 'Pricing & Plans', icon: CreditCard, badge: 'PRO' },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'discord-bot', label: 'Discord Bot Service', icon: Bot, badge: 'ADMIN' },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, badge: 'TOP' },
        { id: 'changelog', label: 'System Status', icon: Activity, badge: 'LIVE' },
        { id: 'landing', label: 'Landing Page', icon: Globe },
      ],
    },
    {
      title: 'LEGAL & SUPPORT',
      items: [
        { id: 'contact', label: 'Contact & Support', icon: LifeBuoy },
        { id: 'about', label: 'About Vixy Vault', icon: Info },
        { id: 'terms', label: 'Terms of Service', icon: FileText },
        { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
        { id: 'risk', label: 'Risk Notice', icon: AlertTriangle, badge: 'NOTICE' },
        { id: 'refunds', label: 'Refund Policy', icon: CreditCard },
      ],
    },
  ];

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#0a0518]/95 border-r border-purple-900/40 shrink-0 font-sans transition-all duration-300 ${
          isCollapsed ? 'w-20 p-2.5 space-y-4 items-center' : 'w-64 p-4 space-y-5'
        }`}
      >
        {/* Fold / Collapse Toggle Header */}
        <div
          className={`flex items-center w-full ${
            isCollapsed ? 'justify-center py-1' : 'justify-between pb-1 border-b border-purple-900/30'
          }`}
        >
          {!isCollapsed && (
            <span className="text-[10px] font-mono font-bold text-purple-300/60 uppercase tracking-wider">
              Navigation Menu
            </span>
          )}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse / Fold Sidebar'}
            className="p-1.5 rounded-xl bg-[#120826] hover:bg-purple-800/50 border border-purple-800/40 text-purple-300 hover:text-white transition-all shadow-sm active:scale-95"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-purple-300" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-purple-300" />
            )}
          </button>
        </div>

        {/* Fast Search Trigger Bar (Expandable / Collapsible / Icon Mode) */}
        {isCollapsed ? (
          <button
            onClick={onOpenSearch}
            title="Smart Search (⌘K)"
            className="w-12 h-12 rounded-2xl bg-[#120826] hover:bg-purple-800/50 border border-purple-800/40 flex items-center justify-center text-purple-300 hover:text-white transition-all shadow-sm"
          >
            <Search className="w-5 h-5 text-purple-400" />
          </button>
        ) : !isSearchHidden ? (
          <div className="relative group w-full">
            <button
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#120826] hover:bg-purple-900/40 border border-purple-800/40 text-purple-300 text-xs font-medium transition-all shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-400 group-hover:text-white transition-colors" />
                <span>Smart Search...</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 text-[10px] font-mono">
                  ⌘K
                </kbd>
                <span
                  onClick={toggleHideSearch}
                  title="Hide fast search bar (Press ⌘K anytime)"
                  className="p-1 rounded-lg hover:bg-purple-800/60 text-purple-400/80 hover:text-white transition-all cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#0e0720]/80 border border-purple-900/30 text-xs text-purple-300/70 transition-all w-full">
            <button
              onClick={onOpenSearch}
              title="Open Smart Search (⌘K)"
              className="flex items-center gap-2 hover:text-white transition-colors text-[11px] font-mono"
            >
              <Search className="w-3.5 h-3.5 text-purple-400" />
              <span>Search</span>
              <kbd className="px-1 py-0.2 rounded bg-purple-950 text-purple-300 text-[9px] border border-purple-800/40">⌘K</kbd>
            </button>
            <button
              onClick={toggleHideSearch}
              title="Restore full search bar"
              className="p-1 rounded hover:bg-purple-800/40 text-purple-400 hover:text-purple-200 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 space-y-4 overflow-y-auto w-full pr-1">
          {navSections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-mono font-black text-purple-400/60 uppercase tracking-widest">
                  {sec.title}
                </div>
              )}
              <div className="space-y-1">
                {sec.items
                  .filter((item) => item.id !== 'discord-bot' || userRole === 'ADMIN')
                  .map((item) => {
                    const IconComponent = item.icon;
                  const isActive = activeTab === item.id;

                  if (isCollapsed) {
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        title={`${item.label} ${item.badge ? `(${item.badge})` : ''}`}
                        className={`w-full h-11 rounded-2xl flex items-center justify-center transition-all duration-200 relative group ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/40'
                            : 'text-purple-300/80 hover:text-white hover:bg-purple-900/30'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                        {item.badge && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 border border-[#0a0518]" />
                        )}
                        {/* Hover Tooltip Popup */}
                        <div className="absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-[#130A2A] border border-purple-500/40 text-white text-xs font-bold whitespace-nowrap shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                          {item.label} {item.badge && <span className="text-amber-300 font-mono text-[10px]">[{item.badge}]</span>}
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all duration-200 group ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/40'
                          : 'text-purple-200/80 hover:text-white hover:bg-purple-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-purple-400 group-hover:text-purple-300'}`} />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 text-[9px] font-mono font-bold border border-purple-500/30">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Institutional Badge & Sales Funnel Conversion Card */}
          {!isCollapsed ? (
            <div className="pt-3 border-t border-purple-900/40 mt-3 space-y-2">
              {userRole === 'ADMIN' || userRole === 'PRO' ? (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/80 via-[#14082e] to-[#0a0319] border border-emerald-500/40 space-y-1.5 shadow-lg shadow-purple-950/50">
                  <div className="flex items-center justify-between text-xs font-mono font-black text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      {userRole === 'ADMIN' ? 'MASTER ADMIN' : 'VIXY ELITE PRO'}
                    </span>
                    <span className="text-[9px] bg-emerald-500/20 px-1.5 py-0.2 rounded text-emerald-300 border border-emerald-500/30">ALL UNLOCKED</span>
                  </div>
                  <p className="text-[11px] text-purple-200/90 leading-snug font-sans font-bold flex items-center gap-1">
                    ⚡ Complete Terminal, Models & Bot Access Active
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#14082e] to-[#0a0319] border border-amber-500/40 space-y-2 shadow-lg shadow-purple-950/50">
                  <div className="flex items-center justify-between text-xs font-mono font-black text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      VIXY ELITE AI
                    </span>
                    <span className="text-[9px] bg-amber-500/20 px-1.5 py-0.2 rounded text-amber-200 border border-amber-500/30">PRO</span>
                  </div>
                  <p className="text-[11px] text-purple-200/90 leading-snug font-sans">
                    Unlock complete entry prices, stop-loss targets, profit levels & AI heatmaps.
                  </p>
                  <button
                    onClick={() => setActiveTab('pricing')}
                    className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black text-[11px] font-mono uppercase tracking-wider shadow-md transition-transform active:scale-95 cursor-pointer"
                  >
                    Upgrade to Elite →
                  </button>
                </div>
              )}

              <div className="px-1 flex items-center justify-between text-[10px] text-purple-400/60 font-mono">
                <span>VIXY AI v3.4</span>
                <span className="text-emerald-400 font-bold">24 Models Active</span>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-purple-900/40 mt-3 flex justify-center" title="VIXY QUANT v3.4 Active">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-950 to-[#12082a] border border-purple-500/40 flex items-center justify-center">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                </span>
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex">
          <div className="w-72 bg-[#0a0518] border-r border-purple-900/40 p-4 space-y-6 flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/40">
              <span className="font-extrabold text-white text-sm">Navigation Menu</span>
              <button onClick={onCloseMobile} className="p-1 text-purple-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Search Trigger */}
            <button
              onClick={() => {
                onOpenSearch();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#120826] border border-purple-800/40 text-purple-300 text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-400" />
                <span>Smart Search...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>

            <nav className="flex-1 space-y-4 overflow-y-auto">
              {navSections.map((sec, secIdx) => (
                <div key={secIdx} className="space-y-1">
                  <div className="px-3 text-[10px] font-mono font-black text-purple-400/60 uppercase tracking-widest">
                    {sec.title}
                  </div>
                  <div className="space-y-1">
                    {sec.items
                      .filter((item) => item.id !== 'discord-bot' || userRole === 'ADMIN')
                      .map((item) => {
                        const IconComponent = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            onCloseMobile();
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all ${
                            isActive
                              ? 'bg-purple-600 text-white shadow-lg'
                              : 'text-purple-200 hover:bg-purple-900/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="w-4 h-4 text-purple-400" />
                            <span>{item.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-purple-900/40 mt-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/60 via-[#12082a] to-[#090417] border border-purple-500/30 space-y-2 shadow-lg shadow-purple-950/50">
                  <div className="flex items-center gap-2 text-xs font-mono font-black text-purple-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span className="tracking-wide uppercase">VIXY QUANT v3.4</span>
                  </div>
                  <p className="text-[11px] text-purple-300/80 leading-snug font-sans">
                    AI Probability Engine connected to 12 top liquidity bridges.
                  </p>
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
