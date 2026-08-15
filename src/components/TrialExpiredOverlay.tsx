import React, { useState } from 'react';
import { Logo } from './Logo';
import {
  Sparkles,
  Lock,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Crown,
  Loader2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { createDayPassCheckoutApi, restoreAccessApi } from '../services/api';
import { getStripeDayPassUrl } from '../config/stripeLinks';

interface TrialExpiredOverlayProps {
  onUpgradeToPro?: () => void;
  onViewPricing?: () => void;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
  onResetTrial?: () => void;
  isAuthenticated?: boolean;
  userEmail?: string;
  userId?: string;
  discordUserId?: string;
}

export const TrialExpiredOverlay: React.FC<TrialExpiredOverlayProps> = ({
  onUpgradeToPro,
  onViewPricing,
  onOpenAuth,
  onResetTrial,
  isAuthenticated = false,
  userEmail,
  userId,
  discordUserId,
}) => {
  const [isProcessingDayPass, setIsProcessingDayPass] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreEmail, setRestoreEmail] = useState(userEmail || '');
  const [restoreSessionId, setRestoreSessionId] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error'; message: string; notFound?: boolean } | null>(null);

  const handleDayPassCheckout = async () => {
    setIsProcessingDayPass(true);
    const directUrl = getStripeDayPassUrl({ email: userEmail, uid: userId });
    try {
      const apiRes = await createDayPassCheckoutApi({ userEmail, uid: userId, discordUserId });
      if (apiRes?.url) {
        window.location.href = apiRes.url;
      } else {
        window.location.href = directUrl;
      }
    } catch {
      window.location.href = directUrl;
    } finally {
      setIsProcessingDayPass(false);
    }
  };

  const handleRestoreClick = () => {
    if (!isAuthenticated && !userId) {
      if (onOpenAuth) {
        onOpenAuth('login');
        return;
      }
    }
    setShowRestoreModal(true);
  };

  const handleRestoreAccess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = (restoreEmail || userEmail || '').trim().toLowerCase();
    const targetSession = restoreSessionId.trim();

    if (!targetEmail && !targetSession && !userId) {
      setRestoreStatus({ type: 'error', message: 'Please log in or provide your account email to restore active access.' });
      return;
    }

    setIsRestoring(true);
    setRestoreStatus(null);

    try {
      const res = await restoreAccessApi({
        email: targetEmail || undefined,
        stripeSessionId: targetSession || undefined,
        uid: userId,
        discordUserId,
      });

      if (res.success && res.restored) {
        setRestoreStatus({
          type: 'success',
          message: res.message || 'Access successfully verified and restored! Reloading terminal...',
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setRestoreStatus({
          type: 'error',
          notFound: true,
          message: res.message || 'No active VIXY subscription or 24-hour Day Pass was found for this account.',
        });
      }
    } catch (err: any) {
      setRestoreStatus({
        type: 'error',
        message: err?.message || 'Failed to restore access. Please try again or contact support.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05020E]/94 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 text-purple-100 font-mono select-none overflow-y-auto">
      {/* Background Ambient Radial Lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 blur-[180px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] bg-violet-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Main Lockout Card Container */}
      <div className="relative z-10 max-w-xl w-full bg-[#0D071E]/95 p-6 sm:p-10 rounded-3xl border-2 border-purple-500/50 shadow-2xl shadow-purple-950/90 text-center space-y-6 backdrop-blur-xl my-auto">
        {/* Animated Emblem */}
        <div className="flex justify-center">
          <div className="scale-110 sm:scale-125 hover:scale-130 transition-transform">
            <Logo size="xl" showText={false} />
          </div>
        </div>

        {/* Lockout Header Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>VIXY TERMINAL ACCESS LOCKED</span>
        </div>

        {/* Main Display Title */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black text-white font-mono tracking-tight leading-none uppercase">
            VIXY'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-purple-300 to-amber-300">VAULT</span>
            <br />
            AWAITS YOU
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/80 font-sans max-w-md mx-auto leading-relaxed">
            Get instant unfiltered access to the live 15-minute decision engine, real-time Lock feed, L2 orderbook depth, and Discord signals with a 24-Hour Day Pass or Monthly Subscription.
          </p>
        </div>

        {/* Exclusive Feature Preview List */}
        <div className="bg-[#070312] p-4 sm:p-5 rounded-2xl border border-purple-900/50 text-left text-xs space-y-3 font-sans">
          <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider font-mono flex items-center justify-between border-b border-purple-900/40 pb-2">
            <span className="flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> UNRESTRICTED QUANT MEMBER ADVANTAGES
            </span>
            <span className="text-emerald-400 font-mono text-[10px]">+EV ACCELERATOR</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-purple-100 text-[11px]">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>Sub-Second L2 Net Taker Volume Delta Depth</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>Live 15-Minute Reversal & Pivot Score</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>Kalshi & Polymarket Arbitrage Radar</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>Instant Discord & Telegram Webhook Signals</span>
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="space-y-3 pt-1">
          <button
            onClick={handleDayPassCheckout}
            disabled={isProcessingDayPass}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 font-mono uppercase tracking-wide group cursor-pointer active:scale-[0.99] disabled:opacity-75"
          >
            {isProcessingDayPass ? (
              <>
                <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                <span>Redirecting to Day Pass Checkout...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
                <span>Get 24H Day Pass ($9.99) — Direct Checkout</span>
                <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <button
            onClick={onViewPricing}
            className="w-full py-3 px-4 rounded-xl bg-[#140B28] hover:bg-[#1C1038] border border-purple-500/40 text-purple-200 font-bold transition-all flex items-center justify-center gap-1.5 font-mono text-xs cursor-pointer active:scale-[0.99]"
          >
            <CreditCard className="w-3.5 h-3.5 text-purple-400" />
            <span>View All Subscription Plans & Billing (Starter / Pro / Elite)</span>
          </button>

          {/* Self-service Restore Access Accordion / Button */}
          {!showRestoreModal ? (
            <button
              onClick={handleRestoreClick}
              className="w-full py-2 text-[11px] text-purple-400/80 hover:text-purple-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Already paid or need to restore active access? Click here</span>
            </button>
          ) : (
            <div className="bg-[#080414] border border-purple-800/60 p-4 rounded-xl text-left space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Restore Entitlement
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowRestoreModal(false);
                    setRestoreStatus(null);
                  }}
                  className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-purple-950/60"
                >
                  Close
                </button>
              </div>

              {isAuthenticated && userEmail && (
                <div className="bg-purple-950/40 border border-purple-800/40 rounded-lg p-2 text-[11px] flex items-center justify-between">
                  <div>
                    <span className="text-purple-400 font-mono text-[9px] block uppercase tracking-wider">Authenticated Account</span>
                    <span className="text-white font-bold">{userEmail}</span>
                  </div>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => onOpenAuth('login')}
                      className="text-[10px] text-purple-300 hover:text-white underline cursor-pointer"
                    >
                      Switch Account
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleRestoreAccess} className="space-y-2.5">
                <div>
                  <label className="text-[10px] text-purple-300 block mb-1">Account Email / Billing Email</label>
                  <input
                    type="email"
                    value={restoreEmail}
                    onChange={(e) => setRestoreEmail(e.target.value)}
                    placeholder="e.g. trader@gmail.com"
                    className="w-full bg-[#0e0720] border border-purple-700/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-purple-300 block mb-1">Stripe Checkout Session ID (Optional)</label>
                  <input
                    type="text"
                    value={restoreSessionId}
                    onChange={(e) => setRestoreSessionId(e.target.value)}
                    placeholder="cs_live_... or session ID"
                    className="w-full bg-[#0e0720] border border-purple-700/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-amber-400 font-mono text-[11px]"
                  />
                </div>

                {restoreStatus && (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] space-y-2 ${
                      restoreStatus.type === 'success'
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      {restoreStatus.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span>{restoreStatus.message}</span>
                    </div>

                    {restoreStatus.notFound && (
                      <div className="pt-1.5 flex flex-wrap gap-2 border-t border-rose-900/40">
                        <button
                          type="button"
                          onClick={handleDayPassCheckout}
                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase font-mono cursor-pointer"
                        >
                          Get 24H Day Pass
                        </button>
                        {onViewPricing && (
                          <button
                            type="button"
                            onClick={onViewPricing}
                            className="px-2.5 py-1 rounded bg-purple-800 hover:bg-purple-700 text-white font-bold text-[10px] uppercase font-mono cursor-pointer"
                          >
                            View Subscription Plans
                          </button>
                        )}
                        {onOpenAuth && (
                          <button
                            type="button"
                            onClick={() => onOpenAuth('login')}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono cursor-pointer"
                          >
                            Log In / Switch Account
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRestoring}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking Stripe & Firestore...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Verify & Restore Entitlement</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="text-[10px] text-purple-300/50 font-sans">
          30-day money-back guarantee on all subscriptions. Cancel anytime in 1 click.
        </p>
      </div>
    </div>
  );
};
