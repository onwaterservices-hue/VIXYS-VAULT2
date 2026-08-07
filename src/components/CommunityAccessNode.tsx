import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  Zap,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  ShieldAlert,
  Radio,
  UserCheck,
  LogOut,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  Sliders
} from 'lucide-react';
import { AlertSettings } from '../types';
import {
  getDiscordAuthUrlApi,
  getDiscordUserProfileApi,
  verifyDiscordMembershipApi,
  disconnectDiscordApi
} from '../services/api';

interface CommunityAccessNodeProps {
  settings?: AlertSettings;
  setSettings?: React.Dispatch<React.SetStateAction<AlertSettings>>;
  onOpenDiscordModal?: () => void;
  onNavigateAlerts?: () => void;
  mode?: 'dashboard' | 'settings';
  className?: string;
  compact?: boolean;
}

export const CommunityAccessNode: React.FC<CommunityAccessNodeProps> = ({
  settings,
  setSettings,
  onOpenDiscordModal,
  onNavigateAlerts,
  mode = 'dashboard',
  className = '',
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load backend profile on mount
  const loadProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await getDiscordUserProfileApi();
      if (res && res.linked && res.profile) {
        setProfile(res.profile);
        if (setSettings) {
          setSettings((prev) => ({
            ...prev,
            discordLinked: true,
            discordUsername: res.profile.discordUsername,
            discordUserId: res.profile.discordUserId,
            guildMember: res.profile.guildMember,
            roleAssigned: res.profile.guildRoles?.[0] || (res.profile.guildMember ? 'PRO' : 'None'),
            lastSyncTimestamp: res.profile.lastSync || new Date().toLocaleTimeString(),
            syncStatus: res.profile.verificationStatus === 'VERIFIED' ? 'HEALTHY' : 'NEEDS_GUILD',
          }));
        }
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.warn('Failed to fetch Discord user profile from backend:', e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();

    // Listen for OAuth message from popup callback window
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DISCORD_OAUTH_SUCCESS' && event.data?.data) {
        const data = event.data.data;
        setProfile(data);
        setStatusMessage(`Successfully authenticated as ${data.discordGlobalName || data.discordUsername}!`);
        setIsConnecting(false);
        setErrorMessage(null);

        if (setSettings) {
          setSettings((prev) => ({
            ...prev,
            discordLinked: true,
            discordUsername: data.discordUsername,
            discordUserId: data.discordUserId,
            guildMember: data.guildMember,
            roleAssigned: data.guildRoles?.[0] || (data.guildMember ? 'PRO' : 'None'),
            lastSyncTimestamp: data.lastSync || new Date().toLocaleTimeString(),
            syncStatus: data.guildMember ? 'HEALTHY' : 'NEEDS_GUILD',
          }));
        }
      } else if (event.data?.type === 'DISCORD_OAUTH_ERROR') {
        setIsConnecting(false);
        setErrorMessage(event.data.error || 'Discord authentication failed.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Initiate real Discord OAuth redirect/popup
  const handleConnectOAuth = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    setStatusMessage('Initiating Discord OAuth authorization...');

    try {
      const authData = await getDiscordAuthUrlApi();
      if (authData && authData.url) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          authData.url,
          'discord_oauth_popup',
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
        );

        if (!popup) {
          window.location.href = authData.url;
        }
      } else {
        throw new Error('Failed to retrieve Discord authorization URL from backend.');
      }
    } catch (err: any) {
      setIsConnecting(false);
      setErrorMessage(err.message || 'Failed to start Discord OAuth.');
    }
  };

  // Verify Guild Membership & Roles via backend
  const handleVerifyMembership = async () => {
    setIsVerifying(true);
    setErrorMessage(null);
    setStatusMessage('Querying Discord server membership & verifying roles...');

    try {
      const res = await verifyDiscordMembershipApi(profile?.discordUserId);
      if (res && res.success && res.profile) {
        setProfile(res.profile);
        setStatusMessage(res.message);
        if (setSettings) {
          setSettings((prev) => ({
            ...prev,
            discordLinked: true,
            guildMember: res.profile.guildMember,
            roleAssigned: res.profile.guildRoles?.[0] || (res.profile.guildMember ? 'PRO' : 'None'),
            lastSyncTimestamp: new Date().toLocaleTimeString(),
            syncStatus: res.profile.guildMember ? 'HEALTHY' : 'NEEDS_GUILD',
          }));
        }
      } else {
        setErrorMessage(res?.message || 'Server membership verification failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Disconnect Identity
  const handleDisconnect = async () => {
    try {
      await disconnectDiscordApi();
      setProfile(null);
      setStatusMessage('Discord identity unlinked.');
      if (setSettings) {
        setSettings((prev) => ({
          ...prev,
          discordLinked: false,
          discordUsername: undefined,
          discordUserId: undefined,
          syncStatus: 'DISCONNECTED',
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isLinked = !!profile || (settings?.discordLinked ?? false);
  const displayName = profile?.discordGlobalName || profile?.discordUsername || settings?.discordUsername;
  const username = profile?.discordUsername;
  const avatarUrl = profile?.discordAvatar;
  const guildMember = profile?.guildMember ?? settings?.guildMember ?? false;
  const isFullyVerified = isLinked && guildMember;
  const roleAssigned = profile?.guildRoles?.[0] || (guildMember ? 'PRO' : 'None');

  // =========================================================================
  // 1. DASHBOARD MODE: FULLY VERIFIED USER -> SLEEK ULTRA-COMPACT RIBBON
  // =========================================================================
  if (mode === 'dashboard' && isFullyVerified && !isLoadingProfile) {
    return (
      <div className={`bg-[#080414]/90 rounded-2xl border border-emerald-800/50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg font-mono text-xs relative overflow-hidden ${className}`}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>DISCORD CONNECTED</span>
          </span>

          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SERVER MEMBER VERIFIED</span>
          </span>

          <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>MEMBERSHIP ROLE ACTIVE: {roleAssigned}</span>
          </span>

          <span className="text-purple-300/60 text-[10px] hidden lg:inline ml-1">
            (@{username || displayName})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDiscordModal && (
            <button
              onClick={onOpenDiscordModal}
              className="px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sliders className="w-3 h-3 text-purple-300" />
              <span>Manage Connection</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. DASHBOARD MODE: UNLINKED OR NEEDS SERVER JOIN -> TACTICAL ONBOARDING BANNER
  // =========================================================================
  if (mode === 'dashboard') {
    return (
      <div className={`bg-[#0B061A] rounded-2xl border border-purple-800/60 p-4 sm:p-5 shadow-2xl font-mono text-xs relative overflow-hidden transition-all ${className}`}>
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-inner">
              <Radio className="w-4 h-4 animate-pulse text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-xs uppercase tracking-widest">
                  COMMUNITY ACCESS REQUIRED
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800/50 text-[9px] text-purple-300 font-bold uppercase tracking-wider">
                  VIXY NETWORK GATEWAY
                </span>
              </div>
              <div className="text-[10px] text-purple-300/70 font-medium">
                Unlock your complete VIXY Vault membership & real-time quant alerts.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLinked ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>Needs Server Join</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-indigo-400" />
                <span>Setup Required</span>
              </span>
            )}
          </div>
        </div>

        {/* FEEDBACK NOTICES */}
        {statusMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-[11px] font-sans flex items-center gap-2 relative z-10">
            <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-[11px] font-sans flex items-center gap-2 relative z-10">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STATE A: AUTHORIZED BUT HAS NOT JOINED DISCORD SERVER */}
        {isLinked && !guildMember ? (
          <div className="pt-4 space-y-3.5 relative z-10">
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Discord Account Authorized (@{displayName}), but Server Membership Missing</span>
              </div>
              <p className="text-[11px] text-amber-200/80 font-sans leading-relaxed">
                Your Discord account is linked, but you haven't joined the official VIXY Vault server yet. Join the server to receive your automated PRO channels and live signals.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <a
                href="https://discord.gg/a9q3UCAjGH"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-amber-600/20 active:scale-95"
              >
                <span>JOIN DISCORD SERVER</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleVerifyMembership}
                disabled={isVerifying}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Verifying...' : 'VERIFY MEMBERSHIP'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* STATE B: UNCONNECTED COMPACT DASHBOARD BANNER */
          <div className="flex flex-wrap items-center justify-between gap-3 py-1 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white uppercase tracking-wider text-xs">
                  Discord Not Connected
                </span>
                <span className="text-purple-400/60 hidden sm:inline">•</span>
                <span className="text-purple-300/80 text-[11px]">
                  Connect to unlock real-time member signals & PRO channels.
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://discord.gg/a9q3UCAjGH"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/40 text-purple-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer hidden sm:flex"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>JOIN SERVER</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <button
              onClick={handleConnectOAuth}
              disabled={isConnecting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-60"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5 text-white" />
                  <span>CONNECT DISCORD</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 3. SETTINGS MODE: DETAILED & COLLAPSIBLE COMMUNITY ACCESS CONTROL CARD
  // =========================================================================
  return (
    <div className={`bg-[#0B061A] rounded-2xl border border-purple-800/60 p-4 sm:p-5 shadow-2xl font-mono text-xs relative overflow-hidden transition-all ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-inner">
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-xs uppercase tracking-widest">
                Community Connection
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800/50 text-[9px] text-purple-300 font-bold uppercase tracking-wider">
                OAUTH2 GATEWAY
              </span>
            </div>
            <div className="text-[10px] text-purple-300/60 font-medium">
              Real-time Discord API Permission & Role Synchronization
            </div>
          </div>
        </div>

        {/* STATUS BADGES */}
        <div className="flex items-center gap-2">
          {isLinked ? (
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Connected</span>
              </span>
              {guildMember ? (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                  PRO Verified
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                  Needs Server Join
                </span>
              )}
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Not Connected</span>
            </span>
          )}
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {statusMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-[11px] font-sans flex items-center gap-2 relative z-10">
          <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-[11px] font-sans flex items-center gap-2 relative z-10">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* MAIN COMPACT READOUT */}
      {isLoadingProfile ? (
        <div className="py-6 text-center text-purple-300/60 font-mono text-xs flex items-center justify-center gap-2 relative z-10">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Querying Discord Backend Status...</span>
        </div>
      ) : isLinked && displayName ? (
        <div className="pt-4 space-y-4 relative z-10">
          <div className="p-3.5 rounded-xl bg-[#070314]/90 border border-purple-900/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-purple-900/40 border border-purple-600/40 flex items-center justify-center text-purple-300 shrink-0 font-bold">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="text-[10px] text-purple-300/60 uppercase font-mono font-semibold">
                  Linked Discord Identity
                </div>
                <div className="text-sm font-extrabold text-white font-mono flex items-center gap-2">
                  <span>{displayName}</span>
                  {username && <span className="text-xs text-purple-300/60 font-normal">(@{username})</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-[#120B28] px-3 py-1.5 rounded-lg border border-purple-900/50">
                <span className="text-[9px] text-purple-300/60 block">ROLE</span>
                <span className="text-emerald-300 font-black">{roleAssigned}</span>
              </div>
              <div className="bg-[#120B28] px-3 py-1.5 rounded-lg border border-purple-900/50">
                <span className="text-[9px] text-purple-300/60 block">MEMBERSHIP</span>
                <span className={guildMember ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {guildMember ? 'Verified ✓' : 'Needs Join ✗'}
                </span>
              </div>
              <div className="bg-[#120B28] px-3 py-1.5 rounded-lg border border-purple-900/50 col-span-2 sm:col-span-1">
                <span className="text-[9px] text-purple-300/60 block">LAST SYNC</span>
                <span className="text-purple-200 font-bold">{profile?.lastSync || 'Just now'}</span>
              </div>
            </div>
          </div>

          {!guildMember && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Join the VIXY Vault Community Server</span>
                </div>
                <p className="text-[11px] text-amber-200/80 font-sans">
                  Account authorized, but server membership is missing. Join to receive your automated PRO role.
                </p>
              </div>

              <a
                href="https://discord.gg/a9q3UCAjGH"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>Join Discord Server</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* COLLAPSIBLE MANAGEMENT DRAWER TOGGLE */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/50 border border-purple-800/50 text-purple-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isExpanded ? 'Hide Advanced Controls' : 'Manage Connection'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <span className="text-[10px] text-purple-300/50 font-mono">
              Auto-Sync Active (Stripe ➔ Discord)
            </span>
          </div>

          {/* EXPANDED CONTROLS */}
          {isExpanded && (
            <div className="p-4 rounded-xl bg-[#070314]/90 border border-purple-900/60 space-y-4 pt-4 border-t border-purple-900/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-purple-300/70">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-time OAuth Verification & Bot Role Sync Active</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleVerifyMembership}
                    disabled={isVerifying}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/40 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                    <span>{isVerifying ? 'Verifying...' : 'Force Verification'}</span>
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-2 rounded-xl bg-purple-950/40 hover:bg-rose-950/50 border border-purple-800/50 hover:border-rose-500/40 text-purple-300 hover:text-rose-300 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect Identity</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* UNLINKED STATE IN SETTINGS */
        <div className="pt-4 space-y-4 relative z-10">
          <div className="p-4 rounded-xl bg-[#070314]/90 border border-purple-900/60 space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Connect Discord Account</span>
            </div>
            <p className="text-xs text-purple-200/90 font-sans leading-relaxed">
              Connect your Discord account through Discord's official authorization page. VIXY AI will retrieve your real identity and automatically synchronize your paid subscription roles.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <a
              href="https://discord.gg/a9q3UCAjGH"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/40 text-purple-200 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>JOIN DISCORD SERVER</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            <button
              onClick={handleConnectOAuth}
              disabled={isConnecting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-60"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Redirecting...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>CONNECT DISCORD</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
