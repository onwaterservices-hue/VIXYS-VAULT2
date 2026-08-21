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
  Lock,
} from 'lucide-react';
import { BTCTicker, UserSubscription, AuthState, ExchangeApiKeys, AlertSettings } from '../types';
import { Logo } from './Logo';
import { fetchApiSignal, fetchModelStatus, ApiSignalResponse, ModelStatusResponse } from '../services/api';
import { useLiveSignal } from '../hooks/useLiveSignal';
import { useAuthSubscription } from '../hooks/useAuthSubscription';
import { DiscordCompactBadge } from './DiscordCompactBadge';

interface HeaderProps {
  ticker: BTCTicker;
  activeTab: 'terminal' | 'scalping' | 'onehour' | 'history' | 'journal' | 'alerts' | 'pricing' | 'settings' | 'admin' | 'landing' | 'auth' | 'markets' | 'compare' | string;
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
  onResetTrial?: () => void;
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
  dayPassInfo,
  onResetTrial,
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

  const { signal: apiSignal, status: modelStatus } = useLiveSignal(selectedAsset || 'BTC', selectedTimeframe || '15M');

  const {
    isAuthenticated,
    hasActiveAccess,
    passCountdownFormatted,
    isDayPassActive
  } = useAuthSubscription({
    authState,
    subscription,
    userRole,
    dayPassInfo
  });

  const handleNavigateVixyLive = () => {
    if (!isAuthenticated) {
      onOpenAuth('register');
    } else if (!hasActiveAccess) {
      setActiveTab('pricing');
    } else {
      setActiveTab('vixylive');
    }
  };

  const handleNavigateTerminal = () => {
    if (!isAuthenticated) {
      onOpenAuth('register');
    } else if (!hasActiveAccess) {
      setActiveTab('pricing');
    } else {
      setActiveTab('terminal');
    }
  };

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
              onClick={handleNavigateVixyLive}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                hasActiveAccess
                  ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 hover:opacity-95'
                  : 'bg-[#180C2E] border border-purple-800/60 text-purple-300 hover:text-white hover:border-purple-500'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>VIXY LIVE</span>
              {hasActiveAccess ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
              ) : (
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-950/90 text-purple-300 text-[9px] font-black border border-purple-500/40">
                  <Lock className="w-2.5 h-2.5" />
                  <span>LOCKED</span>
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('landing')}
              className="hover:text-amber-300 transition-colors text-purple-300 hover:text-white flex items-center gap-1"
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
              onClick={handleNavigateTerminal}
              className="hover:text-amber-300 transition-colors text-purple-300 hover:text-white flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Terminal</span>
              {!hasActiveAccess && <Lock className="w-3 h-3 text-purple-400" />}
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
                {hasActiveAccess && passCountdownFormatted && (
                  <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-[11px] font-bold text-emerald-300 shadow-sm animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>PASS ACTIVE: {passCountdownFormatted}</span>
                  </div>
                )}
                <button
                  onClick={() => setActiveTab(userRole === 'ADMIN' ? 'admin' : 'settings')}
                  title={userRole === 'ADMIN' ? 'Master Admin Control Center' : 'User Settings'}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#120B24] border border-purple-900/40 text-xs text-purple-200 font-bold hover:border-purple-500/50 hover:text-white transition-all max-w-[160px] sm:max-w-[220px]"
                >
                  <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="hidden sm:inline truncate whitespace-nowrap">{authState.user?.name || 'Quant Member'}</span>
                </button>
                <button
                  onClick={handleNavigateTerminal}
                  className="px-4.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Enter Terminal</span>
                  {!hasActiveAccess && <Lock className="w-3 h-3 text-purple-200" />}
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
                {/* Micro-status line for desktop navigation */}
                <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-purple-200 bg-[#0F0826] px-3.5 py-1.5 rounded-xl border-2 border-purple-500/40 shadow-lg shadow-purple-950/60">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
                  <span className="font-black text-white tracking-wider">24H VAULT ACCESS</span>
                  <span className="text-purple-400/60">•</span>
                  <span className="text-cyan-300 font-black px-1.5 py-0.5 bg-cyan-950/60 rounded border border-cyan-500/40">$9.99</span>
                  <span className="text-purple-400/60">•</span>
                  <span className="text-emerald-400 font-bold">INSTANT ACTIVATION</span>
                </div>

                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-2 rounded-xl bg-[#120B24] border border-purple-700/60 text-xs font-bold text-purple-200 hover:text-white hover:border-purple-400 transition-all font-mono cursor-pointer"
                >
                  Log In
                </button>

                {/* Premium VIXY Vault Access Control CTA - Ultra High Standout */}
                <button
                  onClick={() => onOpenAuth('register')}
                  className="relative group overflow-hidden rounded-xl p-[2px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-xl shadow-cyan-950/80 cursor-pointer"
                  title="Unlock 24 Hours of VIXY Decision Intelligence ($9.99)"
                >
                  {/* Animated Radiant Edge Glow Gradient */}
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-500 via-cyan-400 to-indigo-500 rounded-xl opacity-90 group-hover:opacity-100 transition-opacity animate-pulse blur-[1px] group-hover:blur-[2px]" />
                  
                  <div className="relative flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#0A0518] text-xs font-mono font-bold transition-colors group-hover:bg-[#0E0722]">
                    <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
                    <span className="text-white tracking-wider font-black text-[11px] sm:text-xs drop-shadow">
                      VIXY VAULT ACCESS
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-[11px] font-black tracking-tight shadow-md">
                      24H PASS • $9.99
                    </span>
                  </div>
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
      {/* Top Real-time Ticker & Institutional Context Bar - Compact High-Performance Terminal Strip */}
      <div className="bg-[#0b051c]/90 px-3 sm:px-4 py-1 text-xs border-b border-purple-900/40 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none">
          {/* Active Market Chip - LIVE Status */}
          {(() => {
            const ageSec = ticker.timestamp ? Math.max(0, Math.floor((Date.now() - ticker.timestamp) / 1000)) : 0;
            const isStale = ageSec > 25;
            return (
              <div className="flex items-center gap-1.5 font-bold text-purple-200 bg-[#120826] px-2.5 py-0.5 rounded-lg border border-purple-800/50 shadow-sm shrink-0">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isStale ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/80'}`} />
                  <span className="text-[10px] text-emerald-400 font-black tracking-wider">LIVE</span>
                </span>
                <span className="text-white font-black text-xs">{selectedAsset}</span>
                <span className="text-white font-black text-xs">
                  ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                    isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {ticker.change24h.toFixed(2)}%
                </span>
                <span className={`text-[9.5px] font-mono ${isStale ? 'text-amber-400 font-bold' : 'text-purple-400/70'}`}>
                  {isStale ? 'STALE' : `${ageSec}s`}
                </span>
              </div>
            );
          })()}

          {/* VIXY Signal & Confidence Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#120826] border border-purple-800/50 text-[10.5px] text-purple-200 shrink-0">
            <span className="text-purple-400 font-bold">VIXY:</span>
            {((apiSignal as any)?.execution?.state === 'LOCK_UP' || apiSignal?.action === 'BUY_YES') ? (
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-black text-[10px] tracking-wide flex items-center gap-1">
                ▲ BUY UP
              </span>
            ) : ((apiSignal as any)?.execution?.state === 'LOCK_DOWN' || apiSignal?.action === 'BUY_NO') ? (
              <span className="px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40 font-black text-[10px] tracking-wide flex items-center gap-1">
                ▼ BUY DOWN
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded bg-purple-900/40 text-purple-300 border border-purple-700/50 font-black text-[10px] tracking-wide flex items-center gap-1">
                ▬ PASS
              </span>
            )}
            
            <span className="text-purple-800">•</span>
            <span className="text-purple-300">
              CONF{' '}
              <strong className="text-white font-black font-mono tabular-nums px-1 py-0.2 rounded bg-purple-950/80 border border-purple-700/40">
                {Math.round(apiSignal?.confidence || 92)}%
              </strong>
            </span>
          </div>

          {/* System Health Indicators Bar */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-[#120826] border border-purple-800/50 text-[10px] font-mono shrink-0">
            <span className="flex items-center gap-1 text-cyan-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{apiSignal?.latencyMs || 12}ms</span>
            </span>
            <span className="text-purple-800">•</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-black border border-cyan-500/40">
              CALIB v1.4
            </span>
            <span className="text-purple-800">•</span>
            <span className="text-purple-400 font-bold">SYS:</span>
            <span className="flex items-center gap-1" title="System Connected">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-emerald-300 font-bold">CONN</span>
            </span>
            <span className="flex items-center gap-1" title="Market Data Live">
              <span className={`w-1.5 h-1.5 rounded-full ${(apiSignal as any)?.marketFeedLive !== false ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span className={(apiSignal as any)?.marketFeedLive !== false ? 'text-emerald-300 font-bold' : 'text-rose-400'}>MKT</span>
            </span>
            <span className="flex items-center gap-1" title="Engine Pipeline Live">
              <span className={`w-1.5 h-1.5 rounded-full ${(apiSignal as any)?.engineLive !== false ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span className={(apiSignal as any)?.engineLive !== false ? 'text-emerald-300 font-bold' : 'text-rose-400'}>ENG</span>
            </span>
            <span className="flex items-center gap-1" title="Signal Integrity Live">
              <span className={`w-1.5 h-1.5 rounded-full ${(apiSignal as any)?.signalLive !== false ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={(apiSignal as any)?.signalLive !== false ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>SIG</span>
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
              (apiSignal as any)?.isSignalFrozen
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : (apiSignal as any)?.signalLive !== false
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              {(apiSignal as any)?.isSignalFrozen ? 'FROZEN' : (apiSignal as any)?.signalLive !== false ? 'HEALTHY' : 'DEGRADED'}
            </span>
          </div>
        </div>

        {/* Timezone & User Status */}
        <div className="flex items-center gap-2 text-[11px] shrink-0">
          {/* Timezone Indicator */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#120826] border border-purple-800/50 text-purple-300 font-mono text-[10px]"
            title={`Local Timezone: ${userTzName} (${userTzAbbr})`}
          >
            <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="font-bold text-white uppercase">{userTzAbbr}</span>
          </div>

          {/* VIXY ELITE DAY PASS Status Indicator */}
          {dayPassInfo?.active && dayPassInfo.expiresAt ? (
            <div
              onClick={() => setActiveTab('pricing')}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-950/80 to-purple-950/80 border border-amber-500/40 text-[10.5px] font-mono shadow-sm cursor-pointer hover:border-amber-400 transition-all"
              title={`VIXY Elite Day Pass expires at: ${new Date(dayPassInfo.expiresAt).toLocaleString()}`}
            >
              <Flame className="w-3 h-3 text-amber-400 animate-pulse shrink-0" />
              <span className="text-amber-300 font-bold hidden sm:inline">PASS</span>
              <span className="font-mono font-black text-amber-200 text-[10.5px]">
                {formatTrialTime(Math.max(0, Math.floor((new Date(dayPassInfo.expiresAt).getTime() - Date.now()) / 1000)))}
              </span>
            </div>
          ) : null}

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
            <span className="font-bold text-amber-300 uppercase">{userRole}</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 font-mono">
        {/* Brand Logo Component */}
        <Logo size="md" showSubtitle={true} onClick={() => setActiveTab('terminal')} />

        {/* Desktop Navigation - High-Contrast Ergonomic Nav Board */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#0D071E] p-1 rounded-2xl border border-purple-800/40 shadow-inner shadow-purple-950/50">
          {/* Dashboard */}
          <button
            onClick={handleNavigateTerminal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-purple-300" />
            <span>Dashboard</span>
            {!hasActiveAccess && <Lock className="w-3 h-3 text-purple-400" />}
          </button>

          {/* VIXY LIVE - FLAGSHIP NAVIGATION ITEM */}
          <button
            onClick={handleNavigateVixyLive}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
              activeTab === 'vixylive'
                ? 'bg-gradient-to-r from-amber-500 via-purple-600 to-amber-500 text-slate-950 shadow-[0_0_25px_rgba(251,191,36,0.5)] border border-amber-300 ring-2 ring-amber-400/30'
                : 'bg-gradient-to-r from-amber-500/20 via-purple-900/30 to-amber-500/10 border border-amber-500/50 text-amber-200 hover:text-white hover:border-amber-400 hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="tracking-wider uppercase">VIXY LIVE</span>
            {hasActiveAccess ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ) : (
              <span className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-purple-950/90 text-purple-300 text-[8.5px] font-black border border-purple-500/40">
                <Lock className="w-2 h-2" />
                <span>LOCK</span>
              </span>
            )}
          </button>

          {/* Asset Compare */}
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'compare'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-purple-300" />
            <span>Asset Compare</span>
          </button>

          {/* Scalping Desk - Specialized Desk */}
          <button
            onClick={() => setActiveTab('scalping')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'scalping'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Scalping Desk</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 text-[9px] font-black border border-amber-500/40">
              15S
            </span>
          </button>

          {/* 1-Hour Desk - Specialized Desk */}
          <button
            onClick={() => setActiveTab('onehour')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'onehour'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-300" />
            <span>1-Hour Desk</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 text-[9px] font-black border border-cyan-500/40">
              1H
            </span>
          </button>

          {/* VIXY LOCKS - Historical Results Layer */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/30'
                : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-purple-300" />
            <span>VIXY LOCKS</span>
            <span className="px-1 py-0.2 rounded bg-purple-950 text-purple-300 text-[8.5px] font-mono font-bold border border-purple-500/30">
              RESULTS
            </span>
          </button>

          <div className="h-4 w-[1px] bg-purple-800/40 mx-0.5" />

          {/* Secondary Utilities */}
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
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
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
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
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
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
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
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
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
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
                <span>Get 24H Day Pass — $9.99</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bar */}
      <div className="lg:hidden flex items-center justify-around bg-[#0E0822] border-t border-purple-900/30 px-2 py-2 overflow-x-auto text-[11px] font-mono">
        <button
          onClick={handleNavigateVixyLive}
          className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer ${activeTab === 'vixylive' ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-slate-950 font-black' : 'text-amber-300 font-bold'}`}
        >
          <div className="relative flex items-center justify-center">
            <Flame className="w-4 h-4 animate-pulse text-amber-400" />
            {!hasActiveAccess && (
              <Lock className="w-2.5 h-2.5 text-purple-300 absolute -top-1 -right-2" />
            )}
          </div>
          <span className="flex items-center gap-1">
            VIXY LIVE
          </span>
        </button>
        <button
          onClick={handleNavigateTerminal}
          className={`flex flex-col items-center gap-1 px-2 py-1 cursor-pointer ${activeTab === 'terminal' ? 'text-purple-400 font-bold' : 'text-purple-300/60'}`}
        >
          <div className="relative flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4" />
            {!hasActiveAccess && (
              <Lock className="w-2.5 h-2.5 text-purple-400 absolute -top-1 -right-2" />
            )}
          </div>
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
          VIXY LOCKS
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
