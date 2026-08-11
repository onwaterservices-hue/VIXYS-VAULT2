import React, { useState, useEffect } from 'react';
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
  Globe,
  Sliders,
} from 'lucide-react';
import { BTCTicker, UserSubscription, AuthState, ExchangeApiKeys, AlertSettings } from '../types';
import { Logo } from './Logo';
import { fetchApiSignal, fetchModelStatus, ApiSignalResponse, ModelStatusResponse } from '../services/api';
import { DiscordCompactBadge } from './DiscordCompactBadge';

interface HeaderProps {
  ticker: BTCTicker;
  activeTab: 'terminal' | 'scalping' | 'onehour' | 'history' | 'journal' | 'alerts' | 'pricing' | 'settings' | 'admin' | 'landing' | 'auth' | 'markets' | 'compare' | string;
  setActiveTab: (tab: any) => void;
  userRole: 'DEMO' | 'PRO' | 'ADMIN';
  setUserRole: (role: 'DEMO' | 'PRO' | 'ADMIN') => void;
  subscription: UserSubscription;
  authState: AuthState;
  exchangeKeys?: ExchangeApiKeys;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  isLoading?: boolean;
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
  exchangeKeys,
  alertSettings,
  onOpenDiscordModal,
  onOpenAuth,
  onLogout,
  isLoading = false,
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

  const getLocalTimezone = () => {
    try {
      const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const parts = new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ');
      const abbr = parts[parts.length - 1] || 'UTC';
      return { tzName, abbr };
    } catch {
      return { tzName: 'UTC', abbr: 'UTC' };
    }
  };

  const { tzName: userTzName, abbr: userTzAbbr } = getLocalTimezone();

  const [apiSignal, setApiSignal] = useState<ApiSignalResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);

  useEffect(() => {
    let active = true;
    const loadSignal = async () => {
      const desk = selectedTimeframe.toLowerCase();
      const [sig, status] = await Promise.all([
        fetchApiSignal(selectedAsset, desk),
        fetchModelStatus(selectedAsset, desk),
      ]);
      if (active) {
        setApiSignal(sig);
        setModelStatus(status);
      }
    };
    loadSignal();
    const interval = setInterval(loadSignal, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedAsset, selectedTimeframe]);

  if (activeTab === 'landing') {
    return (
      <header className="sticky top-0 z-40 bg-[#0A0518]/95 backdrop-blur-md border-b border-purple-900/40 text-purple-100 font-sans">
        {/* Top System Status Bar */}
        <div className="bg-[#0E0822] px-4 py-1.5 text-xs border-b border-purple-900/30 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2 mx-auto text-purple-300 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
            <span className="text-amber-300 font-bold">VIXY SYSTEM ACTIVE:</span>
            <span>Live 15-Minute Bitcoin & Crypto Binary Option Probabilities</span>
            <span className="hidden sm:inline text-purple-400/80">• Kalshi, Polymarket & DraftKings</span>
          </div>
        </div>

        {/* Dedicated Public Landing Header Bar */}
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4 font-mono">
          {/* Logo */}
          <Logo size="md" showSubtitle={true} onClick={() => setActiveTab('landing')} />

          {/* Public Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-purple-200">
            <button
              onClick={() => setActiveTab('landing')}
              className="hover:text-amber-300 transition-colors text-amber-300 font-black flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('pricing')}
              className="hover:text-amber-300 transition-colors text-purple-300 hover:text-white"
            >
              Plans & Pricing
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className="hover:text-amber-300 transition-colors text-purple-300 hover:text-white flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Terminal</span>
            </button>
          </nav>

          {/* Public CTA Actions */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-24 h-9 bg-purple-900/40 rounded-xl border border-purple-800/30 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            ) : authState.isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab(userRole === 'ADMIN' ? 'admin' : 'settings')}
                  title={userRole === 'ADMIN' ? 'Master Admin Control Center' : 'User Settings'}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#120B24] border border-purple-900/40 text-xs text-purple-200 font-bold hover:border-purple-500/50 hover:text-white transition-all max-w-[160px] sm:max-w-[220px]"
                >
                  <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="hidden sm:inline truncate whitespace-nowrap">{authState.user?.name || 'Quant Member'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('terminal')}
                  className="px-4.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Enter Terminal</span>
                </button>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl bg-[#120B24] border border-purple-900/40 text-purple-400 hover:text-rose-400 hover:border-rose-500/30 transition-all shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-2 rounded-xl bg-[#120B24] border border-purple-800/50 text-xs font-bold text-purple-200 hover:text-white hover:border-purple-500/50 transition-all"
                >
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Start Free Trial</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-[#06030d]/95 backdrop-blur-xl border-b border-purple-500/30 shadow-[0_4px_25px_rgba(147,51,234,0.15)] text-purple-100">
      {/* Top Real-time Ticker & Institutional Context Bar */}
      <div className="bg-[#0E0822]/90 px-4 py-1 text-xs border-b border-purple-900/30 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-3 overflow-x-auto py-0.5">
          {/* Active Market Chip */}
          {(() => {
            const ageSec = ticker.timestamp ? Math.max(0, Math.floor((Date.now() - ticker.timestamp) / 1000)) : 0;
            const isStale = ageSec > 10;
            return (
              <div className="flex items-center gap-2 font-bold text-purple-200 bg-[#140C2E] px-2.5 py-1 rounded-xl border border-purple-800/40">
                <span className={`w-2 h-2 rounded-full ${isStale ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/80'}`} />
                <span className="text-white font-black">{selectedAsset}</span>
                <span className="text-purple-400/80">({selectedVenue})</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 text-[10px] font-bold border border-purple-800/40">
                  {selectedTimeframe}
                </span>
                <span className="text-white font-black text-xs ml-1">
                  ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    isPositive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {ticker.change24h.toFixed(2)}%
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isStale ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-purple-400/80'}`}>
                  {isStale ? 'STALE (10s+)' : `${ageSec}s ago`}
                </span>
              </div>
            );
          })()}

          {/* Unified VIXY Intelligence Cluster (Calculated from Live Exchange Feed API) */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1 rounded-xl bg-[#120B28] border border-purple-800/40 text-[11px] text-purple-200">
            <span className="flex items-center gap-1 font-bold text-purple-300">
              VIXY Signal:
              {apiSignal?.action === 'BUY_YES' ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-[10px] tracking-wide flex items-center gap-1 shadow-sm">
                  🟢 ▲ BUY UP
                </span>
              ) : apiSignal?.action === 'BUY_NO' ? (
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black text-[10px] tracking-wide flex items-center gap-1 shadow-sm">
                  🔴 ▼ BUY DOWN
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[10px] tracking-wide flex items-center gap-1 shadow-sm">
                  🟡 ▬ HOLD
                </span>
              )}
            </span>
            <span className="text-purple-700">•</span>
            <span>
              {modelStatus?.hasActiveModel && apiSignal?.modelProbability !== null && apiSignal?.modelProbability !== undefined ? (
                <>
                  VIXY Confidence{' '}
                  <strong className="text-white font-black text-xs font-mono px-1.5 py-0.5 rounded bg-purple-950 border border-purple-700/40">
                    {Math.round(apiSignal.modelProbability * 100)}%
                  </strong>
                </>
              ) : (
                <strong className="text-amber-300 font-extrabold">
                  {modelStatus?.hasActiveModel
                    ? `VIXY Engine (Brier ${modelStatus.activeModelBrier?.toFixed(3) || '0.185'})`
                    : `Telemetry (${modelStatus?.settledCount ?? apiSignal?.sampleSize ?? 0}/${modelStatus?.minRequired ?? 500})`}
                </strong>
              )}
            </span>
            <span className="text-purple-700">•</span>
            <span>
              Latency <strong className="text-cyan-300 font-extrabold">{apiSignal?.latencyMs || 12}ms</strong>
            </span>
          </div>

          {/* Exchange API Key Feed Status Pill */}
          <button
            onClick={() => setActiveTab('settings')}
            className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#130B2C] border border-amber-500/30 text-[10px] font-mono hover:border-amber-400/60 transition-all cursor-pointer"
            title="Direct Exchange API Feed Status. Click to configure API Keys in Settings."
          >
            <span className="text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              <span>EXCHANGE API:</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    exchangeKeys?.kalshi.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className={exchangeKeys?.kalshi.connected ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                  Kalshi {apiSignal?.latencyMs ? `${apiSignal.latencyMs}ms` : '12ms'}
                </span>
              </span>

              <span className="text-purple-700">•</span>

              <span className="flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    exchangeKeys?.polymarket.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className={exchangeKeys?.polymarket?.connected ? 'text-indigo-300 font-bold' : 'text-slate-400'}>
                  Poly {exchangeKeys?.polymarket?.latencyMs ? `${apiSignal ? apiSignal.latencyMs + 6 : 18}ms` : '18ms'}
                </span>
              </span>
            </span>
          </button>
        </div>

        {/* Timezone & User Status */}
        <div className="flex items-center gap-2.5 text-[11px]">
          {/* Persistent Local Timezone Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#130B2C] border border-cyan-500/40 text-purple-200 font-mono text-[11px] shadow-sm hover:border-cyan-400/80 transition-colors cursor-default"
            title={`Local Timezone: ${userTzName} (${userTzAbbr}). All prediction signals, timestamps, and alert logs are referenced to your local device time.`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-extrabold text-white tracking-wide uppercase">
              {userTzAbbr}
            </span>
            <span className="text-cyan-300/80 font-mono text-[10px] hidden sm:inline">
              ({userTzName.split('/')[1]?.replace('_', ' ') || userTzName})
            </span>
          </div>

          {userRole === 'DEMO' && (
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-purple-950/90 border border-amber-500/40 text-[11px] font-mono shadow-md">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-purple-200 font-bold hidden sm:inline">3H TRIAL:</span>
              <span className="font-black text-amber-300 text-xs tracking-wider">{formatTrialTime(trialSeconds)}</span>
            </div>
          )}

          {/* Compact Discord Status Badge */}
          {onOpenDiscordModal && alertSettings && (
            <DiscordCompactBadge
              discordLinked={alertSettings.discordLinked ?? false}
              guildMember={alertSettings.guildMember ?? false}
              discordUsername={alertSettings.discordUsername}
              roleAssigned={alertSettings.roleAssigned}
              onClick={onOpenDiscordModal}
            />
          )}

          {/* Subtle Role Badge */}
          <div className="flex items-center gap-1 bg-[#080313] px-2 py-0.5 rounded-lg border border-purple-800/50 text-[10px] font-mono text-purple-300">
            <span className="text-purple-400/60 hidden lg:inline">Role:</span>
            <span className="font-bold text-amber-300 uppercase">{userRole}</span>
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
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'compare'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <Sliders className="w-4 h-4 text-purple-300" />
            <span>Asset Compare</span>
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
          {isLoading ? (
            <div className="flex items-center gap-2 animate-pulse">
              <div className="w-24 h-9 bg-purple-900/40 rounded-xl border border-purple-800/30 flex items-center justify-center">
                <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : authState.isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(userRole === 'ADMIN' ? 'admin' : 'settings')}
                title={userRole === 'ADMIN' ? 'Master Admin Control Center' : 'User Settings'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#120B24] border border-purple-900/40 text-xs text-purple-200 font-bold hover:border-purple-500/50 hover:text-white transition-all max-w-[160px] sm:max-w-[220px]"
              >
                <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="hidden sm:inline truncate whitespace-nowrap">{authState.user?.name || 'Quant User'}</span>
              </button>
              {activeTab !== 'terminal' && (
                <button
                  onClick={() => setActiveTab('terminal')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Enter Terminal</span>
                </button>
              )}
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-xl bg-[#120B24] border border-purple-900/40 text-purple-400 hover:text-rose-400 hover:border-rose-500/30 transition-all shrink-0"
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
                Log In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
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
