import React, { useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Zap,
  Sparkles,
  Sliders,
  BookOpen,
  Bell,
  BarChart2,
  CreditCard,
  Settings,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  BrainCircuit,
  Globe,
  Award,
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
  Flame,
  Clock,
  Layers,
} from "lucide-react";
import { TAB_TO_PATH } from "../utils/routePaths";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSearch: () => void;
  userRole?: "UNPAID" | "PRO" | "ELITE" | "ADMIN" | "OWNER" | string;
  userProduct?: string;
  hasActiveAccess?: boolean;
  isAuthenticated?: boolean;
  onOpenAuth?: (mode: "login" | "register") => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
  onOpenSearch,
  userRole = "ADMIN",
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("vixy_sidebar_collapsed") === "true";
  });

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("vixy_sidebar_collapsed", String(nextState));
  };

  const navSections = [
    {
      title: "COMMAND",
      items: [
        { id: "terminal", label: "Dashboard", icon: LayoutDashboard },
        { id: "scanner", label: "Prediction Center", icon: Target, badge: "+EV" },
        {
          id: "vixylive",
          label: "VIXY LIVE",
          icon: Flame,
          badge: "LIVE",
          isFlagship: true,
        },
      ],
    },
    {
      title: "TERMINALS",
      items: [
        {
          id: "scalping",
          label: "Scalping Desk",
          subtitle: "15s - Ultra Fast",
          icon: Zap,
          badge: "15S",
        },
        {
          id: "onehour",
          label: "1H Desk",
          subtitle: "Longer Term Analysis",
          icon: Clock,
          badge: "1H",
        },
        { id: "compare", label: "Asset Compare", icon: Sliders, badge: "VS" },
      ],
    },
    {
      title: "INTELLIGENCE",
      items: [
        { id: "markets", label: "Markets", icon: TrendingUp },
        { id: "patterns", label: "Pattern Engine", icon: Sparkles },
        { id: "whales", label: "Whale Tracker", icon: Layers },
        { id: "changelog", label: "News & Sentiment", icon: Activity, badge: "LIVE" },
      ],
    },
    {
      title: "HISTORY",
      items: [
        {
          id: "history",
          label: "VIXY Locks",
          icon: BarChart2,
          badge: "RESULTS",
        },
        { id: "perflab", label: "Performance", icon: Award, badge: "V1.0" },
        { id: "replay", label: "Replay Center", icon: History },
        { id: "journal", label: "Trade Journal", icon: BookOpen },
      ],
    },
    {
      title: "ACCOUNT",
      items: [
        { id: "pricing", label: "Portfolio", icon: CreditCard, badge: "PRO" },
        { id: "settings", label: "Settings", icon: Settings },
        { id: "alerts", label: "Alerts", icon: Bell },
        {
          id: "discord-bot",
          label: "Discord Bot",
          icon: Bot,
          badge: "ADMIN",
          adminOnly: true,
        },
        {
          id: "vixy-learning",
          label: "Learning Center",
          icon: BrainCircuit,
          badge: "ADMIN",
          adminOnly: true,
        },
      ],
    },
    {
      title: "LEGAL & SUPPORT",
      items: [
        { id: "contact", label: "Contact & Support", icon: LifeBuoy },
        { id: "about", label: "About Vixy Vault", icon: Info },
        { id: "terms", label: "Terms of Service", icon: FileText },
        { id: "privacy", label: "Privacy Policy", icon: ShieldCheck },
        { id: "risk", label: "Risk Notice", icon: AlertTriangle, badge: "NOTICE" },
        { id: "refunds", label: "Refund Policy", icon: CreditCard },
      ],
    },
  ];

  const renderNavSection = (sec: typeof navSections[0], isMobile = false) => {
    const visibleItems = sec.items.filter(
      (item) => !(item as any).adminOnly || userRole === "ADMIN" || userRole === "OWNER"
    );

    if (visibleItems.length === 0) return null;

    return (
      <div key={sec.title} className="space-y-1">
        {(!isCollapsed || isMobile) && (
          <div className="px-3 text-[10px] font-mono font-bold text-violet-400/70 uppercase tracking-[0.2em] mb-1.5">
            {sec.title}
          </div>
        )}
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            const subtitle = (item as any).subtitle;

            return (
              <a
                key={item.id}
                href={TAB_TO_PATH[item.id] ?? "#"}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(item.id);
                  if (isMobile) onCloseMobile();
                }}
                title={
                  isCollapsed && !isMobile
                    ? `${item.label}${subtitle ? ` (${subtitle})` : ""}`
                    : undefined
                }
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer group ${
                  isActive
                    ? "vixy-nav-active shadow-sm font-semibold"
                    : "vixy-nav-inactive"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <IconComponent
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-violet-300"
                    }`}
                  />
                  {(!isCollapsed || isMobile) && (
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="truncate leading-tight font-medium">
                        {item.label}
                      </span>
                      {subtitle && (
                        <span
                          className={`text-[10px] leading-tight truncate ${
                            isActive
                              ? "text-violet-200"
                              : "text-slate-400/80 group-hover:text-slate-300"
                          }`}
                        >
                          {subtitle}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {(!isCollapsed || isMobile) && item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shrink-0 ${
                      item.badge === "LIVE"
                        ? isActive
                          ? "bg-violet-900/80 text-white border-violet-400/50"
                          : "bg-violet-950/80 text-violet-300 border-violet-500/30"
                        : item.badge === "15S"
                        ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                        : item.badge === "1H"
                        ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/30"
                        : "bg-slate-900/80 text-slate-400 border-slate-700/40"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside
        className={`hidden lg:flex flex-col vixy-sidebar-bg border-r border-violet-900/20 shrink-0 font-sans transition-all duration-300 h-screen sticky top-0 ${
          isCollapsed ? "w-20 p-2.5 space-y-4 items-center" : "w-64 p-4 space-y-4"
        }`}
      >
        {/* Fold / Collapse Toggle Header */}
        <div
          className={`flex items-center w-full ${
            isCollapsed
              ? "justify-center py-1"
              : "justify-between pb-2 border-b border-violet-900/20"
          }`}
        >
          {!isCollapsed && (
            <span className="text-[10px] font-mono font-bold text-violet-400/70 uppercase tracking-[0.2em]">
              Navigation
            </span>
          )}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="p-1.5 rounded-lg bg-violet-950/30 hover:bg-violet-900/40 border border-violet-800/30 text-violet-300 hover:text-white transition-all cursor-pointer"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-violet-300" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-violet-300" />
            )}
          </button>
        </div>

        {/* Search Trigger */}
        {isCollapsed ? (
          <button
            onClick={onOpenSearch}
            title="Smart Search (⌘K)"
            className="w-10 h-10 rounded-xl bg-violet-950/30 hover:bg-violet-900/40 border border-violet-800/30 flex items-center justify-center text-violet-300 hover:text-white transition-all cursor-pointer"
          >
            <Search className="w-4 h-4 text-violet-400" />
          </button>
        ) : (
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-violet-950/20 hover:bg-violet-900/30 border border-violet-800/25 text-slate-300 text-xs font-medium transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-violet-400 group-hover:text-violet-300 transition-colors" />
              <span>Smart Search...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
          {navSections.map((sec) => renderNavSection(sec))}
        </nav>

        {/* Pinned Bottom Upsell Card */}
        {!isCollapsed ? (
          <div className="pt-3 border-t border-violet-900/20 mt-auto shrink-0 w-full">
            {["ADMIN", "OWNER", "ELITE", "PRO"].includes(userRole) ? (
              <div className="p-3.5 vixy-upsell-card space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-violet-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    {userRole === "ADMIN" || userRole === "OWNER"
                      ? "MASTER ADMIN"
                      : userRole === "ELITE"
                      ? "VIXY ELITE"
                      : "VIXY PRO"}
                  </span>
                  <span className="text-[9px] bg-violet-500/20 px-1.5 py-0.5 rounded text-violet-300 border border-violet-500/30 font-semibold">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Full AI model suite, trading signals & terminal access active.
                </p>
              </div>
            ) : (
              <div className="p-3.5 vixy-upsell-card space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-violet-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    Unlock More
                  </span>
                  <span className="text-[9px] bg-violet-500/20 px-1.5 py-0.5 rounded text-violet-200 border border-violet-500/30 font-semibold">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Get real-time probability signals, AI heatmaps & trade targets.
                </p>
                <button
                  onClick={() => setActiveTab("pricing")}
                  className="w-full py-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] font-mono uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                >
                  Upgrade to Elite →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className="pt-3 border-t border-violet-900/20 mt-auto shrink-0 flex justify-center"
            title="Upgrade to Elite / VIXY Quant"
          >
            <button
              onClick={() => setActiveTab("pricing")}
              className="w-10 h-10 rounded-xl vixy-upsell-card flex items-center justify-center text-violet-400 hover:text-white transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex">
          <div className="w-72 bg-[#070412] border-r border-violet-900/20 p-4 space-y-4 flex flex-col font-sans h-full">
            <div className="flex items-center justify-between pb-3 border-b border-violet-900/20">
              <span className="font-bold text-white text-sm">
                Navigation Menu
              </span>
              <button
                onClick={onCloseMobile}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Search Trigger */}
            <button
              onClick={() => {
                onOpenSearch();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-violet-950/20 border border-violet-900/30 text-slate-300 text-xs font-medium cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-violet-400" />
                <span>Smart Search...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-200 text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>

            <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
              {navSections.map((sec) => renderNavSection(sec, true))}
            </nav>

            {/* Mobile Bottom Card */}
            <div className="pt-3 border-t border-violet-900/20 shrink-0">
              {["ADMIN", "OWNER", "ELITE", "PRO"].includes(userRole) ? (
                <div className="p-3.5 vixy-upsell-card space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-violet-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      {userRole === "ADMIN" || userRole === "OWNER"
                        ? "MASTER ADMIN"
                        : userRole === "ELITE"
                        ? "VIXY ELITE"
                        : "VIXY PRO"}
                    </span>
                    <span className="text-[9px] bg-violet-500/20 px-1.5 py-0.5 rounded text-violet-300 border border-violet-500/30 font-semibold">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Full AI model suite, trading signals & terminal access active.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 vixy-upsell-card space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-violet-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      Unlock More
                    </span>
                    <span className="text-[9px] bg-violet-500/20 px-1.5 py-0.5 rounded text-violet-200 border border-violet-500/30 font-semibold">
                      PRO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Get real-time probability signals, AI heatmaps & trade targets.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab("pricing");
                      onCloseMobile();
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] font-mono uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    Upgrade to Elite →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
