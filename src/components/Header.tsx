import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { BTCTicker, UserSubscription, AuthState, ExchangeApiKeys, AlertSettings } from '../types';
import { Logo } from './Logo';
import { useAuthSubscription } from '../hooks/useAuthSubscription';

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

        {/* Right Section: UTC Clock + Notifications + Account Area */}
        <div className="flex items-center gap-3">
          {/* UTC Clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 font-bold bg-[#0e121a] px-3 py-1.5 rounded-lg border border-slate-800/80">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-white font-mono">{utcTime || '15:26:43'}</span>
            <span className="text-[10px] text-slate-500">UTC</span>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-lg bg-[#0e121a] border border-slate-800 text-slate-300 hover:text-white transition-all relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
            </button>

            {/* Notifications Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0e0826] border border-purple-700/50 p-3 shadow-2xl z-50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white pb-2 border-b border-purple-900/40">
                  <span>System Notifications</span>
                  <span className="text-[10px] text-amber-300 font-mono">LIVE ALERTS</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="p-2 rounded-xl bg-[#140b36] border border-purple-800/30">
                    <div className="text-amber-300 font-bold">15M BTC Cycle Locked</div>
                    <div className="text-[10px] text-slate-400">Direction: UP | Conviction 78%</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#140b36] border border-purple-800/30">
                    <div className="text-emerald-400 font-bold">Whale Inflow Detected</div>
                    <div className="text-[10px] text-slate-400">1,250 BTC transferred to Binance</div>
                  </div>
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
                      setActiveTab('settings');
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-purple-200 hover:text-white hover:bg-purple-900/40 transition-all font-medium text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-purple-400" />
                    <span>Account Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('pricing');
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-amber-300 hover:text-white hover:bg-amber-950/40 transition-all font-bold text-left cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>Manage Subscription</span>
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
