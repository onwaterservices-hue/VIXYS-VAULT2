import React, { useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Zap,
  Sparkles,
  Layers,
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
  Award,
  Target,
  Lock,
  Flame,
  Clock,
  ChevronRight,
  ShieldCheck,
  User,
  LogOut
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
  userProduct = "NONE",
  hasActiveAccess = false,
  isAuthenticated = false,
  onOpenAuth,
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
        {
          id: "hub",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          id: "terminal",
          label: "Crypto Prediction Center",
          icon: Sparkles,
          badge: "FLAGSHIP",
          isFlagship: true,
        },
        {
          id: "vixylive",
          label: "VIXY LIVE",
          icon: Flame,
          badge: "LIVE",
        },
      ],
    },
    {
      title: "TERMINALS",
      items: [
        {
          id: "scalping",
          label: "Scalping Desk",
          icon: Zap,
          badge: "PRO",
          isDesk: true,
        },
        {
          id: "onehour",
          label: "1-Hour Desk",
          icon: Clock,
          badge: "PRO",
          isDesk: true,
        },
      ],
    },
    {
      title: "INTELLIGENCE",
      items: [
        { id: "markets", label: "Markets", icon: TrendingUp },
        { id: "patterns", label: "Pattern Engine", icon: Sparkles, badge: "PRO" },
        { id: "whales", label: "Whale Tracker", icon: Layers },
        { id: "scanner", label: "Edge Scanner", icon: Target, badge: "+EV" },
        {
          id: "explainability",
          label: "News & Sentiment",
          icon: BrainCircuit,
        },
      ],
    },
    {
      title: "HISTORY",
      items: [
        {
          id: "history",
          label: "VIXY Locks",
          icon: BarChart2,
          badge: "LEDGER",
          isLockLayer: true,
        },
        {
          id: "perflab",
          label: "Performance",
          icon: Award,
        },
        { id: "journal", label: "Trade Journal", icon: BookOpen },
      ],
    },
    {
      title: "ACCOUNT & SYSTEM",
      items: [
        { id: "alerts", label: "Alerts", icon: Bell },
        { id: "pricing", label: "Pricing", icon: CreditCard, badge: "PRO" },
        { id: "settings", label: "Settings", icon: Settings },
        {
          id: "design-system",
          label: "Design System V2",
          icon: Layers,
          badge: "V2",
        },
      ],
    },
  ];

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#06040b] border-r border-purple-900/30 shrink-0 font-mono select-none transition-all duration-300 ${
          isCollapsed
            ? "w-20 p-2.5 space-y-4 items-center"
            : "w-64 p-4 space-y-4"
        }`}
      >
        {/* Fold / Collapse Toggle Header */}
        <div
          className={`flex items-center w-full ${
            isCollapsed
              ? "justify-center py-1"
              : "justify-between pb-2 border-b border-purple-900/30"
          }`}
        >
          {!isCollapsed && (
            <span className="text-[10px] font-mono font-bold text-purple-300/70 uppercase tracking-widest">
              COMMAND MATRIX
            </span>
          )}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand Navigation Sidebar" : "Collapse Sidebar"}
            className="p-1.5 rounded-lg bg-[#0a0618] hover:bg-purple-950/60 border border-purple-900/40 text-purple-300 hover:text-white transition-all shadow-sm cursor-pointer"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-purple-300" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-purple-300" />
            )}
          </button>
        </div>

        {/* Fast Search Trigger Bar */}
        {isCollapsed ? (
          <button
            onClick={onOpenSearch}
            title="Smart Search (⌘K)"
            className="w-10 h-10 rounded-lg bg-[#0a0618] hover:bg-purple-950/60 border border-purple-900/40 flex items-center justify-center text-purple-300 hover:text-white transition-all shadow-sm cursor-pointer"
          >
            <Search className="w-4 h-4 text-purple-400" />
          </button>
        ) : (
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#0a0618] hover:bg-purple-950/50 border border-purple-900/40 text-slate-300 text-xs font-medium transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-sans text-slate-300">Quick Search...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 text-[10px] font-mono font-bold border border-purple-800/60">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Navigation List */}
        <nav className="flex-1 space-y-4 overflow-y-auto w-full pr-1 scrollbar-none">
          {navSections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-mono font-bold text-purple-300/60 uppercase tracking-widest">
                  {sec.title}
                </div>
              )}
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeTab === item.id;

                  const handleItemClick = () => {
                    setActiveTab(item.id);
                  };

                  if (isCollapsed) {
                    return (
                      <a
                        key={item.id}
                        href={TAB_TO_PATH[item.id] ?? '#'}
                        onClick={(e) => {
                          e.preventDefault();
                          handleItemClick();
                        }}
                        title={item.label}
                        className={`w-full h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group cursor-pointer ${
                          isActive
                            ? "bg-gradient-to-r from-purple-950/90 via-purple-900/60 to-indigo-950/70 text-white border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                            : "text-slate-400 hover:text-white hover:bg-purple-950/30"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-purple-400 rounded-r-full shadow-[0_0_8px_#c084fc]" />
                        )}
                        <IconComponent
                          className={`w-4 h-4 ${isActive ? "text-purple-300" : "group-hover:text-purple-300"}`}
                        />
                        {/* Hover Tooltip Popup */}
                        <div className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-[#0a0618] border border-purple-800/60 text-white text-xs font-bold whitespace-nowrap shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                          {item.label}
                        </div>
                      </a>
                    );
                  }

                  return (
                    <a
                      key={item.id}
                      href={TAB_TO_PATH[item.id] ?? '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        handleItemClick();
                      }}
                      className={`relative w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans transition-all duration-200 group cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-purple-950/90 via-purple-900/60 to-indigo-950/70 text-white font-bold border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)] shadow-[inset_0_1px_1px_rgba(192,132,252,0.15)]"
                          : "text-slate-300 hover:text-white hover:bg-purple-950/30 hover:border hover:border-purple-900/30"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-purple-400 rounded-r-full shadow-[0_0_8px_#c084fc]" />
                      )}
                      <div className="flex items-center gap-2.5 pl-0.5">
                        <IconComponent
                          className={`w-4 h-4 ${
                            isActive
                              ? "text-purple-300"
                              : "text-slate-400 group-hover:text-purple-300"
                          }`}
                        />
                        <span className={isActive ? "font-bold text-white" : "font-medium"}>
                          {item.label}
                        </span>
                      </div>

                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                            isActive
                              ? "bg-purple-950 text-purple-300 border-purple-500/50"
                              : "bg-[#0a0618] text-slate-400 border-purple-900/30"
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
          ))}

          {/* Account Banner at Bottom */}
          {!isCollapsed && (
            <div className="pt-3 border-t border-purple-900/30 mt-3 space-y-2 font-sans">
              <div className="p-3 rounded-xl bg-[#0a0618] border border-purple-900/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    VIXY INSTITUTIONAL
                  </span>
                  <span className="text-[9px] bg-purple-950 px-1.5 py-0.2 rounded text-emerald-400 border border-purple-800/60 font-mono">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug font-sans">
                  Real-time 15M cycle authorization & orderbook telemetry enabled.
                </p>
              </div>

              <div className="px-1 flex items-center justify-between text-[10px] text-purple-300/60 font-mono">
                <span>VIXY SYSTEM v2.0</span>
                <span className="text-emerald-400 font-bold">STABLE</span>
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex">
          <div className="w-72 bg-[#080514] border-r border-purple-900/50 p-4 space-y-5 flex flex-col font-mono select-none">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/40">
              <span className="font-extrabold text-white text-sm">
                COMMAND MATRIX
              </span>
              <button
                onClick={onCloseMobile}
                className="p-1 text-purple-400 hover:text-white"
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
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#0e0824] border border-purple-800/40 text-purple-300 text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-400" />
                <span>Smart Search...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 text-[10px]">
                ⌘K
              </kbd>
            </button>

            <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
              {navSections.map((sec, secIdx) => (
                <div key={secIdx} className="space-y-1">
                  <div className="px-2 text-[10px] font-black text-purple-400/60 uppercase tracking-widest">
                    {sec.title}
                  </div>
                  <div className="space-y-1">
                    {sec.items.map((item) => {
                      const IconComponent = item.icon;
                      const isActive = activeTab === item.id;
                      const isFlagship = (item as any).isFlagship;

                      return (
                        <a
                          key={item.id}
                          href={TAB_TO_PATH[item.id] ?? '#'}
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveTab(item.id);
                            onCloseMobile();
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? "bg-purple-600 text-white shadow-lg"
                              : "text-purple-200 hover:bg-purple-900/30"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <IconComponent className="w-4 h-4 text-purple-400" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                              {item.badge}
                            </span>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
