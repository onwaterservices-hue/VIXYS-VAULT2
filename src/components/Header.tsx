import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Settings,
  Menu,
  Clock,
  TrendingUp,
  Flame,
  Zap,
  Lock,
  Layers,
  CheckCircle2,
  Volume2,
  VolumeX,
  CheckCheck,
  Trash2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Radio,
  ExternalLink
} from 'lucide-react';
import { BTCTicker, UserSubscription, AuthState, ExchangeApiKeys, AlertSettings } from '../types';
import { Logo } from './Logo';
import { useAuthSubscription } from '../hooks/useAuthSubscription';
import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';
import { useSystemNotifications, SystemAlertItem } from '../hooks/useSystemNotifications';

interface HeaderProps {
  ticker: BTCTicker;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  userRole: 'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER' | string;
  setUserRole: (role: any) => void;
  subscription: UserSubscription;
  authState: AuthState;
  exchangeKeys?: ExchangeApiKeys;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  isLoading?: boolean;
  dayPassInfo?: {
    active: boolean;
    startedAt?: string | null;
    expiresAt?: string | null;
    secondsRemaining: number;
  };
  selectedAsset?: string;
  selectedTimeframe?: string;
  selectedVenue?: string;
  onOpenSearch?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  ticker,
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  subscription,
  authState,
  onOpenDiscordModal,
  onOpenAuth,
  onLogout,
  isLoading = false,
  dayPassInfo,
  selectedAsset = 'BTC',
  onOpenSearch,
  onOpenMobileMenu,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | '15M' | 'WHALE' | 'PROTECTION'>('ALL');

  // Authoritative live canonical decision hook
  const { decision: canonicalDecision, dataHealthStatus } = useCanonical15mDecision();

  // Dynamic live system notifications hook
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearAll,
    soundEnabled,
    toggleSound,
  } = useSystemNotifications(canonicalDecision);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationsOpen]);

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      const secs = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${mins}:${secs}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const {
    isAuthenticated,
    hasActiveAccess,
    passCountdownFormatted
  } = useAuthSubscription({
    authState,
    subscription,
    userRole,
    dayPassInfo
  });

  const btcPrice = ticker.price || 64591.20;
  const btcChange = ticker.change24h || 1.85;

  // Static/Live top tickers for ETH and SOL calculated dynamically relative to BTC ticker ratio
  const ethPrice = Math.round((btcPrice * 0.0435) * 100) / 100;
  const solPrice = Math.round((btcPrice * 0.00245) * 100) / 100;

  const isBtcPositive = btcChange >= 0;

  // Filter notifications by category
  const filteredNotifications = useMemo(() => {
    if (selectedCategory === '15M') {
      return notifications.filter((n) => n.type === '15M_LOCK' || n.type === '15M_SETTLED');
    }
    if (selectedCategory === 'WHALE') {
      return notifications.filter((n) => n.type === 'WHALE' || n.type === 'ORDERFLOW');
    }
    if (selectedCategory === 'PROTECTION') {
      return notifications.filter((n) => n.type === 'PROTECTION' || n.type === 'REGIME');
    }
    return notifications;
  }, [notifications, selectedCategory]);

  const formatTimeAgo = (ts: number) => {
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  const handleNotificationClick = (item: SystemAlertItem) => {
    markAsRead(item.id);
    if (item.actionTab) {
      setActiveTab(item.actionTab);
    }
    setIsNotificationsOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#05040a]/95 backdrop-blur-xl border-b border-purple-900/30 text-slate-200 select-none">
      <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3 font-mono">
        
        {/* Left Section: Mobile Menu Trigger + Brand Logo */}
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl bg-[#0a0618] border border-purple-900/40 text-purple-300 hover:text-white"
              title="Open Mobile Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab(hasActiveAccess ? 'hub' : 'landing')}
          >
            <Logo size="md" showSubtitle={true} />
          </div>
        </div>

        {/* Center Section: Top Ticker Market Pills (BTC, ETH, SOL) + Market Status */}
        <div className="hidden lg:flex items-center gap-3">
          {/* BTC Ticker Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a0618] border border-purple-900/40 text-xs font-bold shadow-sm">
            <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-[9px] border border-amber-500/30">
              ₿
            </div>
            <span className="text-slate-400 font-sans">BTC</span>
            <span className="text-white font-mono font-bold">${btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${isBtcPositive ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'}`}>
              {isBtcPositive ? '+' : ''}{btcChange.toFixed(2)}%
            </span>
          </div>

          {/* ETH Ticker Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a0618] border border-purple-900/40 text-xs font-bold shadow-sm">
            <div className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-black text-[9px] border border-purple-500/30">
              Ξ
            </div>
            <span className="text-slate-400 font-sans">ETH</span>
            <span className="text-white font-mono font-bold">${ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              +2.43%
            </span>
          </div>

          {/* SOL Ticker Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a0618] border border-purple-900/40 text-xs font-bold shadow-sm">
            <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-[9px] border border-cyan-500/30">
              S
            </div>
            <span className="text-slate-400 font-sans">SOL</span>
            <span className="text-white font-mono font-bold">${solPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              +3.12%
            </span>
          </div>

          {/* Market Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a0618] border border-purple-900/40 text-[11px] font-bold shadow-sm">
            <span className="text-purple-300/60 text-[10px] uppercase tracking-wider font-mono">REGIME</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>BULLISH</span>
            </span>
          </div>
        </div>

        {/* Right Section: UTC Clock + Live System Notifications + Account Area */}
        <div className="flex items-center gap-3">
          {/* UTC Clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 font-bold bg-[#0e121a] px-3 py-1.5 rounded-lg border border-slate-800/80">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-white font-mono">{utcTime || '15:26:43'}</span>
            <span className="text-[10px] text-slate-500">UTC</span>
          </div>

          {/* Live Notification Bell & Flyout System */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`p-2 rounded-xl border transition-all relative flex items-center justify-center cursor-pointer ${
                isNotificationsOpen
                  ? 'bg-purple-900/40 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                  : 'bg-[#0e121a] border-slate-800 text-slate-300 hover:text-white hover:border-purple-800/60'
              }`}
              title={`Live System Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
              <Bell className={`w-4 h-4 transition-transform ${unreadCount > 0 ? 'text-amber-300' : 'text-slate-400'}`} />
              
              {unreadCount > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-purple-600 text-[9px] font-black text-slate-950 shadow-md">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 animate-ping opacity-75 pointer-events-none" />
                </>
              )}
            </button>

            {/* Notifications Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0b061b] border border-purple-600/50 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden flex flex-col backdrop-blur-2xl">
                
                {/* Popover Header */}
                <div className="p-3.5 bg-gradient-to-r from-[#12092c] to-[#0c061d] border-b border-purple-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
                    <span className="text-xs font-black text-white tracking-wide uppercase font-sans">
                      System Notifications
                    </span>
                    <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      LIVE ALERTS
                    </span>
                  </div>

                  {/* Actions: Sound & Mark Read */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={toggleSound}
                      className={`p-1.5 rounded-lg border text-xs transition-all ${
                        soundEnabled
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800/60 hover:text-white'
                          : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                      title={soundEnabled ? 'Mute Alert Audio Pings' : 'Enable Alert Audio Pings'}
                    >
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>

                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-800/60 text-purple-300 hover:text-white transition-all text-xs flex items-center gap-1"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    )}

                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-900/40 text-rose-300 hover:text-rose-100 transition-all text-xs"
                        title="Clear all alerts"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Filtering Tabs */}
                <div className="flex items-center gap-1 p-2 bg-[#080415] border-b border-purple-900/30 text-[10px] font-bold overflow-x-auto">
                  {(['ALL', '15M', 'WHALE', 'PROTECTION'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-purple-300/70 hover:text-white hover:bg-purple-950/60'
                      }`}
                    >
                      {cat === 'ALL' ? `ALL (${notifications.length})` : cat === '15M' ? '15M LOCKS' : cat === 'WHALE' ? 'WHALES' : 'SHIELD'}
                    </button>
                  ))}
                </div>

                {/* Notifications List Body */}
                <div className="max-h-80 overflow-y-auto p-2 space-y-1.5 divide-y divide-purple-900/20">
                  {filteredNotifications.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <ShieldCheck className="w-8 h-8 text-purple-400/40 mx-auto" />
                      <div className="text-xs text-purple-300/80 font-bold">All caught up</div>
                      <div className="text-[10px] text-slate-500">Live surveillance active &amp; monitoring 24/7</div>
                    </div>
                  ) : (
                    filteredNotifications.map((item) => {
                      const is15m = item.type === '15M_LOCK' || item.type === '15M_SETTLED';
                      const isWhale = item.type === 'WHALE' || item.type === 'ORDERFLOW';
                      const isProtection = item.type === 'PROTECTION';

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer group ${
                            !item.read
                              ? 'bg-[#150b36] border-purple-600/40 hover:border-purple-400 shadow-sm'
                              : 'bg-[#0e0725]/60 border-purple-950/40 hover:bg-[#130b30] hover:border-purple-800/40 opacity-80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              {/* Type Icon Badge */}
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  is15m
                                    ? item.direction === 'DOWN'
                                      ? 'bg-rose-950/90 text-rose-400 border border-rose-700/50'
                                      : 'bg-emerald-950/90 text-emerald-400 border border-emerald-700/50'
                                    : isWhale
                                    ? 'bg-amber-950/90 text-amber-400 border border-amber-700/50'
                                    : isProtection
                                    ? 'bg-blue-950/90 text-blue-400 border border-blue-700/50'
                                    : 'bg-purple-950/90 text-purple-300 border border-purple-700/50'
                                }`}
                              >
                                {is15m ? (
                                  <Lock className="w-3 h-3" />
                                ) : isWhale ? (
                                  <Activity className="w-3 h-3" />
                                ) : isProtection ? (
                                  <ShieldAlert className="w-3 h-3" />
                                ) : (
                                  <Zap className="w-3 h-3" />
                                )}
                              </div>

                              {/* Content Details */}
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-white group-hover:text-purple-200 transition-colors">
                                    {item.title}
                                  </span>
                                  {item.direction && (
                                    <span
                                      className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                        item.direction === 'UP'
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                          : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                      }`}
                                    >
                                      {item.direction}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-300/90 leading-tight">
                                  {item.description}
                                </div>
                              </div>
                            </div>

                            {/* Right: Timestamp & Unread Dot */}
                            <div className="text-right shrink-0 space-y-1">
                              <span className="text-[9px] text-slate-500 font-mono block">
                                {formatTimeAgo(item.timestamp)}
                              </span>
                              {!item.read && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-[0_0_6px_#f59e0b]" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Popover Footer */}
                <div className="p-2.5 bg-[#080415] border-t border-purple-900/40 flex items-center justify-between text-[10px]">
                  <span className="text-purple-300/60 flex items-center gap-1 font-mono">
                    <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>Real-Time Event Stream</span>
                  </span>
                  <button
                    onClick={() => {
                      setActiveTab('crypto_prediction_center');
                      setIsNotificationsOpen(false);
                    }}
                    className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1"
                  >
                    <span>Open Prediction Center</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Account Area Dropdown / Login CTA */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0d0722] border border-purple-700/50 text-xs font-bold text-white hover:border-purple-400 transition-all shadow-md cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs border border-purple-400/40">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-white text-xs font-bold truncate max-w-[120px]">
                    {authState.user?.name || 'VIXY MEMBER'}
                  </div>
                  <div className="text-[9.5px] text-amber-300 font-extrabold tracking-wide uppercase">
                    {userRole === 'ADMIN' ? 'MASTER ADMIN' : userRole === 'ELITE' ? 'VIXY ELITE' : userRole === 'PRO' ? 'VIXY PRO' : passCountdownFormatted ? `PASS: ${passCountdownFormatted}` : 'FREE MEMBER'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
              </button>

              {/* Account Dropdown Menu */}
              {isAccountMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0e0826] border border-purple-700/60 p-2 shadow-2xl z-50 space-y-1">
                  <div className="p-3 rounded-xl bg-[#140b36] border border-purple-800/40 space-y-1">
                    <div className="text-xs font-bold text-white truncate">{authState.user?.email}</div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Authenticated Session Active</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('terminal');
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-purple-200 hover:text-white hover:bg-purple-900/40 transition-all font-medium text-left cursor-pointer"
                  >
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>Live Trading Terminal</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('pricing');
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-amber-300 hover:text-white hover:bg-amber-950/40 transition-all font-bold text-left cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>Membership Terminal</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-purple-200 hover:text-white hover:bg-purple-900/40 transition-all font-medium text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-purple-400" />
                    <span>Account Settings</span>
                  </button>

                  {userRole === 'ADMIN' && (
                    <button
                      onClick={() => {
                        setActiveTab('admin');
                        setIsAccountMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-indigo-300 hover:text-white hover:bg-indigo-950/40 transition-all font-bold text-left cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span>Master Admin Dashboard</span>
                    </button>
                  )}

                  <div className="h-[1px] bg-purple-900/40 my-1" />

                  <button
                    onClick={() => {
                      onLogout();
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-all font-bold text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 rounded-xl bg-[#0d0722] border border-purple-800/40 text-xs font-bold text-purple-200 hover:text-white transition-all cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Get Day Pass ($9.99)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
