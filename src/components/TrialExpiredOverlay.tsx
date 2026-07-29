import React from 'react';
import { Logo } from './Logo';
import {
  Sparkles,
  Lock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  RotateCcw,
  CreditCard,
  Crown,
} from 'lucide-react';

interface TrialExpiredOverlayProps {
  onUpgradeToPro: () => void;
  onViewPricing: () => void;
  onResetTrial: () => void;
}

export const TrialExpiredOverlay: React.FC<TrialExpiredOverlayProps> = ({
  onUpgradeToPro,
  onViewPricing,
  onResetTrial,
}) => {
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-widest">
          <Lock className="w-3.5 h-3.5 text-rose-400" />
          <span>3-HOUR FREE TRIAL PASS COMPLETED</span>
        </div>

        {/* Main Display Title Requested by User */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black text-white font-mono tracking-tight leading-none uppercase">
            VIXY'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-fuchsia-300">VAULT</span>
            <br />
            AWAITS YOU
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/80 font-sans max-w-md mx-auto leading-relaxed">
            You've experienced 12 full 15-minute prediction cycles. To maintain continuous access to sub-second L2 order flow, model probabilities, and webhook automation, upgrade your account below.
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
            onClick={onUpgradeToPro}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-purple-600/40 transition-all flex items-center justify-center gap-2 font-mono uppercase tracking-wide group"
          >
            <Zap className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
            <span>Upgrade to Professional Pass ($64/mo)</span>
            <ArrowRight className="w-4 h-4 text-purple-200 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <button
              onClick={onViewPricing}
              className="py-3 px-4 rounded-xl bg-[#140B28] hover:bg-[#1C1038] border border-purple-500/40 text-purple-200 font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
              <span>View All Tiers</span>
            </button>

            <button
              onClick={onResetTrial}
              className="py-3 px-4 rounded-xl bg-[#140B28] hover:bg-[#1C1038] border border-purple-900/50 text-purple-300/70 hover:text-white font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
              <span>Reset 3-Hour Demo</span>
            </button>
          </div>
        </div>

        <p className="text-[10px] text-purple-300/50 font-sans">
          30-day money-back guarantee on all subscriptions. Cancel anytime in 1 click.
        </p>
      </div>
    </div>
  );
};
