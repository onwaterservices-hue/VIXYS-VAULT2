import React, { useState, useEffect, useRef } from 'react';
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
  Sliders,
  Check,
  Shield
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
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        if (setSettings) {
          setSettings((prev) => ({
            ...prev,
            discordLinked: false,
            discordUsername: undefined,
            discordUserId: undefined,
            guildMember: false,
            roleAssigned: 'NONE',
            syncStatus: 'DISCONNECTED',
          }));
        }
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
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const data = event.data.data;
        setProfile(data);
        setStatusMessage(`● DISCORD NETWORK AUTHORIZED: Welcome @${data.discordGlobalName || data.discordUsername}!`);
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
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsConnecting(false);
        setErrorMessage(event.data.error || 'Discord authentication failed. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Initiate real Discord OAuth redirect/popup with strict timeout safety
  const handleConnectOAuth = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setErrorMessage(null);
    setStatusMessage('Initiating secure Discord OAuth authorization...');

    // Safety timeout: If authorization popup is closed or blocked, reset isConnecting after 15 seconds
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsConnecting(false);
      setStatusMessage('OAuth window opened. Click "CONNECT DISCORD" again if you need to retry authorization.');
    }, 15000);

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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsConnecting(false);
      setErrorMessage(err.message || 'Failed to start Discord OAuth. Please check network connection.');
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
        setErrorMessage(res?.message || 'Server membership verification pending. Make sure you joined the server.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification error connecting to Discord');
    } finally {
      setIsVerifying(false);
    }
  };

  // Disconnect Identity
  const handleDisconnect = async () => {
    try {
      await disconnectDiscordApi();
      setProfile(null);
      setStatusMessage('Discord identity disconnected.');
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
  const roleAssigned = profile?.guildRoles?.[0] || (guildMember ? 'PRO MEMBER' : 'None');

  // =========================================================================
  // STATE 3 (FULLY VERIFIED USER) — SLEEK ULTRA-COMPACT COMMAND RIBBON
  // =========================================================================
  if (mode === 'dashboard' && isFullyVerified && !isLoadingProfile) {
    return (
      <div className={`bg-[#070412]/95 rounded-2xl border border-purple-500/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_20px_rgba(109,24,255,0.12)] font-mono text-xs relative overflow-hidden transition-all duration-200 hover:border-purple-500/50 ${className}`}>
        {/* Subtle Ambient Radial Glow Backdrop */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 flex-wrap relative z-10">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>DISCORD NETWORK CONNECTED</span>
          </span>

          <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
            <span>SERVER VERIFIED: {roleAssigned}</span>
          </span>

          <span className="text-purple-300/80 text-[11px] font-bold hidden md:inline">
            @{username || displayName}
          </span>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <a
            href="https://discord.gg/a9q3UCAjGH"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-md shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>OPEN DISCORD</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleVerifyMembership}
            disabled={isVerifying}
            className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/50 text-purple-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Refresh Discord Role"
          >
            <RefreshCw className={`w-3 h-3 text-purple-300 ${isVerifying ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">REFRESH ROLE</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIXY NETWORK GATEWAY — FULL PREMIUM GATEWAY PANEL (NOT CONNECTED / CONNECTING / NEEDS SERVER)
  // =========================================================================
  return (
    <div id="vixy-discord-gateway" className={`bg-[#06030e] rounded-2xl border border-purple-500/30 p-5 sm:p-6 shadow-[0_0_30px_rgba(109,24,255,0.15)] font-mono text-xs relative overflow-hidden transition-all duration-200 hover:border-purple-500/50 ${className}`}>
      {/* Visual Ambient Grid Texture + Radial Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800c_1px,transparent_1px),linear-gradient(to_bottom,#8080800c_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40" />

      {/* GATEWAY HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 shadow-inner">
            <Radio className="w-4 h-4 animate-pulse text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-white text-sm tracking-wider uppercase">
                VIXY NETWORK GATEWAY
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-[9px] text-purple-300 font-extrabold uppercase tracking-widest">
                PRIVATE INTELLIGENCE CHANNEL
              </span>
            </div>
            <div className="text-[11px] text-purple-300/70 font-sans mt-0.5">
              Connect your Discord account to activate your exclusive VIXY Vault intelligence network access.
            </div>
          </div>
        </div>

        {/* NETWORK STATUS BADGE */}
        <div className="flex items-center gap-2 shrink-0">
          {isConnecting ? (
            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <RefreshCw className="w-3 h-3 text-purple-300 animate-spin" />
              <span>AUTHENTICATING...</span>
            </span>
          ) : isLinked && !guildMember ? (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>NEEDS SERVER JOIN</span>
            </span>
          ) : isLinked ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>NETWORK CONNECTED</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>NOT CONNECTED</span>
            </span>
          )}
        </div>
      </div>

      {/* FEEDBACK STATUS NOTICES */}
      {statusMessage && (
        <div className="mt-3.5 p-3 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-sans flex items-center gap-2.5 relative z-10 shadow-lg">
          <Zap className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3.5 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-sans flex items-center justify-between gap-2.5 relative z-10 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-300 hover:text-white underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* STATE 2 OR LINKED WITH MISSING SERVER */}
      {isLinked && !guildMember ? (
        <div className="mt-4 pt-2 space-y-4 relative z-10">
          {/* 5-Step Pipeline Progress Indicator */}
          <div className="grid grid-cols-5 gap-1 text-[10px] text-center font-bold font-mono">
            <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300">1. LINKED ✓</div>
            <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 animate-pulse">2. JOIN SERVER</div>
            <div className="p-1.5 rounded-lg bg-[#0d0722] border border-purple-900/40 text-purple-400">3. VERIFY</div>
            <div className="p-1.5 rounded-lg bg-[#0d0722] border border-purple-900/40 text-purple-400">4. ROLE SYNC</div>
            <div className="p-1.5 rounded-lg bg-[#0d0722] border border-purple-900/40 text-purple-400">5. GRANTED</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
            <div className="text-xs font-extrabold text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Discord Identity Connected (@{displayName}), Server Join Pending</span>
            </div>
            <p className="text-xs text-amber-200/90 font-sans leading-relaxed">
              Your Discord identity is linked, but you haven't joined the official VIXY Vault Discord server yet. Click "JOIN DISCORD SERVER" below, then hit "VERIFY MEMBERSHIP" to unlock your member role.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href="https://discord.gg/a9q3UCAjGH"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-white" />
              <span>JOIN DISCORD SERVER</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleVerifyMembership}
              disabled={isVerifying}
              className="px-5 py-3 rounded-xl bg-[#130B2C] hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-300 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Verifying...' : 'VERIFY MEMBERSHIP'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 1: UNCONNECTED — PRIVATE NETWORK UNLOCKED PERKS & OAUTH CTA */
        <div className="mt-4 pt-2 space-y-5 relative z-10">
          {/* 5-Step Pipeline Progress Indicator */}
          <div className="grid grid-cols-5 gap-1 text-[10px] text-center font-bold font-mono">
            <div className="p-1.5 rounded-lg bg-purple-900/40 border border-purple-500/40 text-purple-200 animate-pulse">1. DISCORD LINK</div>
            <div className="p-1.5 rounded-lg bg-[#0d0722] border border-purple-900/40 text-purple-400">2. SERVER JOIN</div>
            <div className="p-1.5 rounded-lg bg-[#0d0722] border border-purple-900/40 text-purple-400">3. VERIFY</div>
            <div className="p-1.5 rounded-lg bg-[#0d0722] border border-purple-900/40 text-purple-400">4. ROLE SYNC</div>
            <div className="p-1.5 rounded-lg bg-[#0d0722] border border-purple-900/40 text-purple-400">5. ACCESS GRANTED</div>
          </div>

          {/* UNLOCKED PERKS CHECKLIST GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              'Real-time quant signals',
              'Private PRO channels',
              'Automated membership verification',
              'AI market alerts',
              'Strategy discussion',
              'Member-only intelligence',
            ].map((perk, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#090417]/80 border border-purple-900/40 text-purple-200 text-xs font-sans">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{perk}</span>
              </div>
            ))}
          </div>

          {/* ACTIONS & SECURITY NOTICE */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-purple-900/40">
            <div className="flex items-center gap-2 text-purple-300/70 text-[11px] font-sans">
              <Shield className="w-4 h-4 text-purple-400 shrink-0" />
              <span>🔒 Secure Discord OAuth • We never receive your Discord password.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <a
                href="https://discord.gg/a9q3UCAjGH"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-xl bg-[#0F0824] hover:bg-purple-900/40 border border-purple-800/50 text-purple-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer w-1/2 sm:w-auto"
              >
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span>JOIN SERVER</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <button
                onClick={handleConnectOAuth}
                disabled={isConnecting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:via-violet-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer disabled:opacity-60 w-1/2 sm:w-auto"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>CONNECTING...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 text-white" />
                    <span>CONNECT DISCORD →</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
