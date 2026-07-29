import React from 'react';
import {
  ShieldCheck,
  Bell,
  CreditCard,
  Settings,
  LayoutDashboard,
  Sparkles,
  BarChart2,
  BookOpen,
  User,
  LogOut,
  Flame,
  Clock,
  Zap,
  BrainCircuit,
} from 'lucide-react';
import { BTCTicker, UserSubscription, AuthState } from '../types';
import { Logo } from './Logo';

interface HeaderProps {
  ticker: BTCTicker;
  activeTab: 'terminal' | 'scalping' | 'onehour' | 'history' | 'journal' | 'alerts' | 'pricing' | 'settings' | 'admin' | 'landing' | 'auth' | 'markets' | 'compare';
  setActiveTab: (tab: any) => void;
  userRole: 'DEMO' | 'PRO' | 'ADMIN';
  setUserRole: (role: 'DEMO' | 'PRO' | 'ADMIN') => void;
  subscription: UserSubscription;
  authState: AuthState;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  trialSeconds?: number;
  onResetTrial?: () => void;
  onExpireTrial?: () => void;
  selectedAsset?: string;
  selectedTimeframe?: string;
  selectedVenue?: string;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  ticker,
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  subscription,
  authState,
  onOpenAuth,
  onLogout,
  trialSeconds = 10800,
  onResetTrial,
  onExpireTrial,
  selectedAsset = 'BTC',
  selectedTimeframe = '15M',
  selectedVenue = 'Kalshi',
  onOpenSearch,
}) => {
  const isPositive = ticker.change24h >= 0;

  const formatTrialTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0A0518]/95 backdrop-blur-md border-b border-purple-900/40 text-purple-100">
      {/* Top Real-time Ticker & Institutional Context Bar */}
      <div className="bg-[#0E0822]/90 px-4 py-1.5 text-xs border-b border-purple-900/30 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-4 overflow-x-auto py-0.5">
          <div className="flex items-center gap-2.5 font-bold text-purple-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/80" />
            <span className="text-white font-black">{selectedAsset}</span>
            <span className="text-purple-400/80">({selectedVenue})</span>
            <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 text-[10px] font-bold border border-purple-800/40">
              {selectedTimeframe}
            </span>
            <span className="text-white font-black text-sm ml-1">
              ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                isPositive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isPositive ? '+' : ''}
              {ticker.change24h.toFixed(2)}%
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-purple-300/80 text-[11px] border-l border-purple-900/40 pl-4">
            <span>
              Prediction: <span className="text-emerald-400 font-extrabold">YES (BULLISH)</span>
            </span>
            <span>
              Confidence: <span className="text-purple-100 font-extrabold">91%</span>
            </span>
            <span>
              Edge: <span className="text-emerald-300 font-extrabold">+12.2%</span>
            </span>
          </div>
        </div>

        {/* 3-Hour Free Trial Badge for DEMO users + Role Switcher */}
        <div className="flex items-center gap-3 text-[11px]">
          {userRole === 'DEMO' && (
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-purple-950/90 border border-amber-500/40 text-[11px] font-mono shadow-md">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-purple-200 font-bold hidden sm:inline">3H TRIAL PASS:</span>
              <span className="font-black text-amber-300 text-xs tracking-wider">{formatTrialTime(trialSeconds)}</span>
              <div className="flex items-center gap-1 ml-1 border-l border-purple-800/60 pl-1.5">
                {onExpireTrial && (
                  <button
                    onClick={onExpireTrial}
                    title="Simulate trial expiration to view VIXY'S VAULT lockout overlay"
                    className="px-1.5 py-0.2 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[9px] font-bold border border-rose-500/30 transition-all"
                  >
                    [Expire Now]
                  </button>
                )}
                {onResetTrial && (
                  <button
                    onClick={onResetTrial}
                    title="Reset 3-hour trial timer back to 03:00:00"
                    className="px-1.5 py-0.2 rounded bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 text-[9px] font-bold border border-purple-500/30 transition-all"
                  >
                    [Reset 3h]
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-purple-300/70 hidden lg:inline font-mono">Access Level:</span>
            <div className="bg-[#080313] p-1 rounded-xl flex items-center border border-purple-800/50 gap-1">
              <button
                onClick={() => setUserRole('DEMO')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  userRole === 'DEMO'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-purple-300/60 hover:text-purple-200'
                }`}
              >
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Free Trial</span>
              </button>
              <button
                onClick={() => setUserRole('PRO')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  userRole === 'PRO'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/40 border border-purple-400/40'
                    : 'text-purple-300/60 hover:text-purple-200'
                }`}
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Pro Member</span>
              </button>
              <button
                onClick={() => setUserRole('ADMIN')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  userRole === 'ADMIN'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border border-indigo-400/40'
                    : 'text-purple-300/60 hover:text-purple-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-cyan-300" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 font-mono">
        {/* Brand Logo Component */}
        <Logo size="md" showSubtitle={true} onClick={() => setActiveTab('terminal')} />

        {/* Desktop Navigation - High-Contrast Ergonomic Nav Board */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-[#0D071E] p-1.5 rounded-2xl border border-purple-800/40 shadow-inner shadow-purple-950/50">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'terminal'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-purple-300" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('scalping')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
              activeTab === 'scalping'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Scalping Desk</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 text-[9px] font-black border border-amber-500/40">
              15S
            </span>
          </button>

          <button
            onClick={() => setActiveTab('onehour')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
              activeTab === 'onehour'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <Clock className="w-4 h-4 text-purple-300" />
            <span>1-Hour Desk</span>
            <span className="px-1.5 py-0.2 rounded bg-purple-950/90 text-purple-300 text-[9px] font-black border border-purple-500/40">
              1H
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-purple-300" />
            <span>Signals & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'journal'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <BookOpen className="w-4 h-4 text-purple-300" />
            <span>Journal</span>
          </button>

          <div className="h-4 w-[1px] bg-purple-800/40 mx-1" />

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === 'alerts'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-300/80 hover:text-white hover:bg-purple-900/30'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts</span>
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === 'pricing'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-300/80 hover:text-white hover:bg-purple-900/30'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pricing</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-300/80 hover:text-white hover:bg-purple-900/30'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          {userRole === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 border border-indigo-400/30'
                  : 'text-indigo-300 hover:text-white hover:bg-indigo-500/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('landing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === 'landing'
                ? 'bg-purple-900/60 text-white shadow-lg border border-purple-500/40'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-900/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Landing</span>
          </button>
        </nav>

        {/* Right CTA / Auth Status */}
        <div className="flex items-center gap-3">
          {authState.isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#120B24] border border-purple-900/40 text-xs text-purple-200 font-bold hover:border-purple-500/50 transition-all"
              >
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">{authState.user?.name || 'Quant User'}</span>
              </button>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-xl bg-[#120B24] border border-purple-900/40 text-purple-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-2 rounded-xl bg-[#120B24] border border-purple-900/40 text-xs font-bold text-purple-200 hover:text-white hover:border-purple-500/50 transition-all"
              >
                Log in
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <span>Start Free Trial</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bar */}
      <div className="lg:hidden flex items-center justify-around bg-[#0E0822] border-t border-purple-900/30 px-2 py-2 overflow-x-auto text-[11px] font-mono">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex flex-col items-center gap-1 px-2 py-1 ${activeTab === 'terminal' ? 'text-purple-400 font-bold' : 'text-purple-300/60'}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('scalping')}
          className={`flex flex-col items-center gap-1 px-2 py-1 ${activeTab === 'scalping' ? 'text-amber-400 font-bold' : 'text-amber-300/60'}`}
        >
          <Zap className="w-4 h-4" />
          Scalping
        </button>
        <button
          onClick={() => setActiveTab('onehour')}
          className={`flex flex-col items-center gap-1 px-2 py-1 ${activeTab === 'onehour' ? 'text-purple-400 font-bold' : 'text-purple-300/60'}`}
        >
          <Clock className="w-4 h-4" />
          1H Desk
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 px-2 py-1 ${activeTab === 'history' ? 'text-purple-400 font-bold' : 'text-purple-300/60'}`}
        >
          <BarChart2 className="w-4 h-4" />
          Signals
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex flex-col items-center gap-1 px-2 py-1 ${activeTab === 'journal' ? 'text-purple-400 font-bold' : 'text-purple-300/60'}`}
        >
          <BookOpen className="w-4 h-4" />
          Journal
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center gap-1 px-2 py-1 ${activeTab === 'alerts' ? 'text-purple-400 font-bold' : 'text-purple-300/60'}`}
        >
          <Bell className="w-4 h-4" />
          Alerts
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex flex-col items-center gap-1 px-2 py-1 ${activeTab === 'pricing' ? 'text-purple-400 font-bold' : 'text-purple-300/60'}`}
        >
          <CreditCard className="w-4 h-4" />
          Pricing
        </button>
      </div>
    </header>
  );
};
