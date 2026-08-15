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
  LogIn,
  UserCheck,
} from 'lucide-react';
import { createDayPassCheckoutApi, restoreAccessApi, getEntitlementsApi } from '../services/api';
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
  onViewPricing,
  onOpenAuth,
  isAuthenticated = false,
  userEmail,
  userId,
  discordUserId,
}) => {
  const [isProcessingDayPass, setIsProcessingDayPass] = useState(false);
  const [isCheckingEntitlement, setIsCheckingEntitlement] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
    showPlans?: boolean;
  } | null>(null);

  const handleDayPassCheckout = async () => {
    setIsProcessingDayPass(true);
    setRestoreFeedback(null);
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

  const handleNormalSignIn = () => {
    if (onOpenAuth) {
      onOpenAuth('login');
    }
  };

  const handleCreateAccount = () => {
    if (onOpenAuth) {
      onOpenAuth('signup');
    }
  };

  const handleCheckActiveEntitlement = async () => {
    if (!isAuthenticated && !userEmail && !userId) {
      handleNormalSignIn();
      return;
    }

    setIsCheckingEntitlement(true);
    setRestoreFeedback(null);

    try {
      const restoreRes = await restoreAccessApi({
        email: userEmail,
        uid: userId,
        discordUserId,
      });

      if (restoreRes.success && restoreRes.restored) {
        setRestoreFeedback({
          type: 'success',
          message: restoreRes.message || 'Active entitlement restored successfully! Reloading terminal...',
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return;
      }

      // Check entitlements directly
      const entRes = await getEntitlementsApi(userEmail, userId);
      if (
        entRes &&
        (entRes.status === 'active' ||
          entRes.dayPass?.active ||
          entRes.entitlements?.proQuant ||
          entRes.entitlements?.eliteQuant)
      ) {
        setRestoreFeedback({
          type: 'success',
          message: 'Active subscription verified! Unlocking terminal...',
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return;
      }

      setRestoreFeedback({
        type: 'info',
        showPlans: true,
        message: 'No active subscription or 24-hour Day Pass found for this account.',
      });
    } catch (err: any) {
      setRestoreFeedback({
        type: 'error',
        message: err?.message || 'Unable to verify entitlements. Please check your connection.',
      });
    } finally {
      setIsCheckingEntitlement(false);
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
          {/* Direct 24H Day Pass Button */}
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

          {/* View All Subscription Plans Button */}
          <button
            onClick={onViewPricing}
            className="w-full py-3 px-4 rounded-xl bg-[#140B28] hover:bg-[#1C1038] border border-purple-500/40 text-purple-200 font-bold transition-all flex items-center justify-center gap-2 font-mono text-xs cursor-pointer active:scale-[0.99]"
          >
            <CreditCard className="w-3.5 h-3.5 text-purple-400" />
            <span>View All Subscription Plans & Billing (Starter / Pro / Elite)</span>
          </button>

          {/* Standard Normal Sign In / Restore Section */}
          <div className="pt-2 border-t border-purple-900/40 space-y-2.5">
            {!isAuthenticated ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleNormalSignIn}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-900/40 hover:bg-purple-900/70 border border-purple-700/50 text-white font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-purple-300" />
                  <span>Already have an account or active pass? Sign In to Restore Access</span>
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-purple-300/70">
                  <span>Don't have an account yet?</span>
                  <button
                    type="button"
                    onClick={handleCreateAccount}
                    className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#080414] border border-purple-800/60 rounded-xl p-3 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-purple-300">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Signed in as <strong className="text-white">{userEmail || 'VIXY Trader'}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNormalSignIn}
                    className="text-[10px] text-purple-400 hover:text-white underline cursor-pointer"
                  >
                    Switch Account
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCheckActiveEntitlement}
                  disabled={isCheckingEntitlement}
                  className="w-full py-2 px-3 rounded-lg bg-purple-800/70 hover:bg-purple-700 text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isCheckingEntitlement ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking Active Entitlements...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-purple-300" />
                      <span>Re-sync & Check Active Entitlement</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Status / Feedback Box if any */}
            {restoreFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs space-y-2 text-left ${
                  restoreFeedback.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300'
                    : restoreFeedback.type === 'info'
                    ? 'bg-purple-950/70 border border-purple-600/50 text-purple-200'
                    : 'bg-rose-950/70 border border-rose-500/50 text-rose-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  {restoreFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <span className="text-[11px] leading-relaxed">{restoreFeedback.message}</span>
                </div>

                {restoreFeedback.showPlans && (
                  <div className="pt-1.5 flex flex-wrap gap-2 border-t border-purple-800/40">
                    <button
                      type="button"
                      onClick={handleDayPassCheckout}
                      className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase font-mono cursor-pointer"
                    >
                      Get 24H Day Pass ($9.99)
                    </button>
                    {onViewPricing && (
                      <button
                        type="button"
                        onClick={onViewPricing}
                        className="px-3 py-1 rounded bg-purple-800 hover:bg-purple-700 text-white font-bold text-[10px] uppercase font-mono cursor-pointer"
                      >
                        View Subscription Plans
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Trust Badge Footer */}
        <p className="text-[10px] text-purple-300/50 font-sans">
          30-day money-back guarantee on all subscriptions. Cancel anytime in 1 click.
        </p>
      </div>
    </div>
  );
};
