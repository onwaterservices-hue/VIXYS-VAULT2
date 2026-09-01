import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle2, Sparkles, RefreshCw, ExternalLink, ShieldCheck, ArrowRight, X, Users, BellRing, Zap, HelpCircle } from 'lucide-react';
import { AlertSettings } from '../types';
import { getDiscordAuthUrlApi, verifyDiscordMembershipApi } from '../services/api';

// Backend-authoritative entitlement tier -> display label. Replaces the old
// `guildMember ? 'PRO' : 'None'` guess, which showed PRO for any free user who
// had merely joined the Discord server. Only the backend knows the real tier.
const tierLabel = (tier?: string, fallback: string = 'None') => {
  switch (String(tier || '').toUpperCase()) {
    case 'ELITE': return 'VIXY ELITE';
    case 'DAY_PASS': return 'VIXY (24hr) ELITE';
    case 'NONE': return 'None';
    default: return fallback;
  }
};

interface DiscordOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AlertSettings;
  setSettings: React.Dispatch<React.SetStateAction<AlertSettings>>;
  onComplete?: () => void;
}

export const DiscordOnboardingModal: React.FC<DiscordOnboardingModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  onComplete,
}) => {
  const [step, setStep] = useState<'CONNECT' | 'CHECK_SERVER' | 'JOIN_SERVER' | 'SUCCESS'>(
    settings.discordLinked ? 'SUCCESS' : 'CONNECT'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSyncSec, setLastSyncSec] = useState<number>(5);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DISCORD_OAUTH_SUCCESS' && event.data?.data) {
        const data = event.data.data;
        setSettings((prev) => ({
          ...prev,
          discordLinked: true,
          discordUsername: data.discordUsername,
          discordUserId: data.discordUserId,
          guildMember: data.guildMember,
          serverJoined: data.guildMember,
          roleAssigned: tierLabel(data.entitlementTier, data.guildRoles?.[0] || 'None'),
          lastSyncTimestamp: new Date().toLocaleTimeString(),
          syncStatus: data.guildMember ? 'HEALTHY' : 'NEEDS_GUILD',
        }));
        setIsProcessing(false);
        setErrorMessage(null);

        if (data.guildMember) {
          setStep('SUCCESS');
        } else {
          setStep('JOIN_SERVER');
        }
      } else if (event.data?.type === 'DISCORD_OAUTH_ERROR') {
        setIsProcessing(false);
        setErrorMessage(event.data.error || 'Discord OAuth failed.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setSettings]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Real OAuth Connect via Discord Authorization URL
  const handleConnectOAuth = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const authData = await getDiscordAuthUrlApi(settings.emailAddress);
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
        throw new Error('Failed to load Discord OAuth endpoint.');
      }
    } catch (e: any) {
      console.error(e);
      setIsProcessing(false);
      setErrorMessage(e.message || 'Error opening Discord OAuth page');
    }
  };

  // Real "I've Joined" Verification via Backend
  const handleVerifyJoined = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await verifyDiscordMembershipApi(settings.discordUserId, settings.emailAddress);
      if (res && res.success && res.profile) {
        setSettings((prev) => ({
          ...prev,
          discordLinked: true,
          guildMember: res.profile.guildMember,
          serverJoined: res.profile.guildMember,
          roleAssigned: tierLabel(res.profile.entitlementTier, res.profile.guildRoles?.[0] || 'None'),
          lastSyncTimestamp: new Date().toLocaleTimeString(),
          syncStatus: res.profile.guildMember ? 'HEALTHY' : 'NEEDS_GUILD',
        }));

        setIsProcessing(false);
        if (res.profile.guildMember) {
          setStep('SUCCESS');
          setLastSyncSec(1);
        } else {
          setErrorMessage('Not detected in server yet. Click "Join Discord" first, then retry.');
        }
      } else {
        setIsProcessing(false);
        setErrorMessage(res?.message || 'Membership verification failed.');
      }
    } catch (e: any) {
      console.error(e);
      setIsProcessing(false);
      setErrorMessage(e.message || 'Error verifying membership');
    }
  };

  const handleFinish = () => {
    onClose();
    if (onComplete) onComplete();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-mono"
    >
      <div className="relative w-full max-w-lg bg-[#0F0826] border border-purple-600/40 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-white">
        {/* Background Glowing Ambient Orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-800/40 text-purple-300 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-purple-400 uppercase font-black tracking-widest flex items-center gap-1.5">
              <span>Account Onboarding</span>
              <span className="text-purple-600">•</span>
              <span className="text-emerald-400 font-bold">Automated Sync</span>
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Connect Discord Community
            </h2>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-sans">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* STEP 1: CONNECT DISCORD */}
        {step === 'CONNECT' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-[#080414] border border-purple-900/60 space-y-3">
              <div className="text-xs font-bold text-purple-200">
                ⚠️ Finish Account Setup
              </div>
              <p className="text-xs text-purple-300/80 leading-relaxed font-sans">
                Connect your Discord account to automatically sync your subscription roles, unlock live quant alerts, and access private trading channels.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-bold">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>VIP Community</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Live Signal Alerts</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PRO Channels</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Automated Roles</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConnectOAuth}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating Discord OAuth...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>Connect Discord</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 2: JOIN SERVER IF NOT YET MEMBER */}
        {step === 'JOIN_SERVER' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-[#080414] border border-indigo-500/40 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Users className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-black text-white">Join our Discord Community</h3>
                <p className="text-xs text-purple-300/80 font-sans mt-1">
                  Click below to join the official VIXY Vault server. Our automated bot will immediately assign your <strong>PRO Role</strong> upon joining.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-800/40 text-xs font-mono text-purple-300 flex items-center justify-between">
                <span className="truncate">https://discord.gg/a9q3UCAjGH</span>
                <a
                  href="https://discord.gg/a9q3UCAjGH"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Join Discord</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <button
              onClick={handleVerifyJoined}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Server Membership...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I've Joined</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 3: SUCCESS STATE */}
        {step === 'SUCCESS' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-[#0B1A14] to-purple-950/80 border border-emerald-500/60 shadow-xl shadow-emerald-500/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <span>🟢 DISCORD CONNECTED</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                  </div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {settings.discordUsername || 'Trader#1337'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-500/20 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-purple-300/60 block">Role Synced</span>
                  <span className="text-emerald-300 font-extrabold">{settings.roleAssigned || 'PRO Role Synced'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-purple-300/60 block">Last Sync</span>
                  <span className="text-purple-200 font-bold">{lastSyncSec} seconds ago</span>
                </div>
                <div>
                  <span className="text-[10px] text-purple-300/60 block">Subscription</span>
                  <span className="text-emerald-400 font-bold">Active ✓</span>
                </div>
                <div>
                  <span className="text-[10px] text-purple-300/60 block">Automation</span>
                  <span className="text-cyan-300 font-bold">100% Automated</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Launch Terminal</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
