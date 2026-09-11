import React, { useEffect, useMemo, useState } from 'react';
import { Clock, X, ArrowRight, CreditCard } from 'lucide-react';

/**
 * VIXY VAULT - DAY PASS UPGRADE PROMPT
 *
 * Shown to a day-pass holder while their pass is STILL RUNNING, in the last
 * stretch before it ends. Until now the only upgrade prompt in the product
 * appeared after access had already died (TrialExpiredOverlay), which is the
 * worst possible moment to ask: the value is gone and the visitor is annoyed.
 *
 * Honesty rules this component follows, per the project's standing rules:
 *
 *  - The countdown is derived from the server-issued `expiresAt` timestamp and
 *    ticks locally once a second. If `expiresAt` is missing we render NOTHING
 *    rather than counting down from an assumed 24 hours -- we do not claim a
 *    deadline we cannot source.
 *  - The only persuasion is arithmetic already printed on the pricing page:
 *    three passes are $29.97, Starter is $29 for 30 days. No invented discount,
 *    no "offer expires", no fabricated scarcity. The pass genuinely ends; that
 *    is the whole of the urgency.
 *  - It deliberately does NOT use the engine aura classes (vx-aura-*). Those
 *    are a readout of the 15-minute decision engine's lifecycle, and spending
 *    that vocabulary on a commercial prompt would dilute what a glow means.
 */

const PROMPT_WINDOW_SEC = 4 * 60 * 60; // last 4 hours of a 24-hour pass
const PASS_TOTAL_SEC = 24 * 60 * 60;
const DISMISS_KEY = 'vixy_daypass_upsell_dismissed_v1';

// Staff never see a commercial prompt. Paying subscribers are excluded through
// hasRecurringPlan, NOT through role labels: the client assigns the PRO role to
// anyone holding an active day pass, so a label check hides this prompt from
// every real pass holder.
const STAFF_ROLES = ['ADMIN', 'OWNER'];

interface DayPassUpgradePromptProps {
  dayPassInfo?: {
    active: boolean;
    startedAt?: string | null;
    expiresAt?: string | null;
    secondsRemaining: number;
  };
  userRole: string;
  /** Server classification: the account holds a recurring plan, not just a pass. */
  hasRecurringPlan?: boolean;
  /** Hide on surfaces where the plans are already the subject. */
  activeTab: string;
  onViewPricing: () => void;
}

function formatRemaining(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  const seconds = totalSec % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export const DayPassUpgradePrompt: React.FC<DayPassUpgradePromptProps> = ({
  dayPassInfo,
  userRole,
  hasRecurringPlan = false,
  activeTab,
  onViewPricing,
}) => {
  const [now, setNow] = useState<number>(() => Date.now());
  const [dismissedFor, setDismissedFor] = useState<string | null>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expiryMs = useMemo(() => {
    if (!dayPassInfo?.expiresAt) return null;
    const parsed = new Date(dayPassInfo.expiresAt).getTime();
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [dayPassInfo?.expiresAt]);

  // No sourced expiry means no countdown. We would rather show nothing than
  // invent a deadline.
  if (!dayPassInfo?.active || expiryMs === null) return null;
  if (hasRecurringPlan) return null;
  if (STAFF_ROLES.includes(String(userRole || '').toUpperCase())) return null;
  if (activeTab === 'pricing' || activeTab === 'landing' || activeTab === 'auth') return null;

  const secondsLeft = Math.floor((expiryMs - now) / 1000);
  if (secondsLeft <= 0 || secondsLeft > PROMPT_WINDOW_SEC) return null;

  // Dismissal is scoped to this specific pass, so buying a new pass re-arms it.
  if (dismissedFor === dayPassInfo.expiresAt) return null;

  const usedPct = Math.min(100, Math.max(0, ((PASS_TOTAL_SEC - secondsLeft) / PASS_TOTAL_SEC) * 100));
  const hoursUsed = Math.floor((PASS_TOTAL_SEC - secondsLeft) / 3600);

  const handleDismiss = () => {
    try {
      if (dayPassInfo.expiresAt) localStorage.setItem(DISMISS_KEY, dayPassInfo.expiresAt);
    } catch {
      /* storage unavailable; the prompt simply returns next render */
    }
    setDismissedFor(dayPassInfo.expiresAt || null);
  };

  return (
    <div
      role="complementary"
      aria-label="Day pass ending soon"
      className="fixed bottom-5 right-5 z-[60] w-[330px] max-w-[calc(100vw-2.5rem)] vx-page-enter"
    >
      {/* .hud-corners declares position: relative, which beats .fixed when both
          sit on one element and drops the card into normal page flow. The
          corners live on this inner full-size wrapper, never on the fixed shell. */}
      <div className="hud-corners amber rounded-2xl border border-amber-500/40 bg-[#0c0718]/97 backdrop-blur-xl shadow-[0_18px_50px_-12px_rgba(0,0,0,0.85)] p-4 space-y-3 font-sans">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 p-1 rounded-lg text-purple-400/70 hover:text-white hover:bg-purple-900/60 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-[10px] font-mono font-black uppercase tracking-[0.14em] text-amber-300">
          Pass ends in {formatRemaining(secondsLeft)}
        </span>
      </div>

      {/* A readout of the visitor's own pass, not a marketing device. */}
      <div>
        <div className="vx-rail">
          <div className="vx-rail-fill" style={{ width: `${usedPct}%` }} />
        </div>
        <div className="mt-1.5 text-[10px] font-mono text-purple-400/80">
          {hoursUsed} of 24 hours used
        </div>
      </div>

      <p className="text-[11.5px] leading-relaxed text-purple-100/90">
        When it ends the terminal locks until you buy another pass or subscribe.
      </p>

      <div className="rounded-xl border border-purple-800/50 bg-[#0d0722]/80 px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-purple-100/90">
          Three day passes cost <strong className="font-mono text-white">$29.97</strong>.
          Starter is <strong className="font-mono text-white">$29</strong> and runs all 30 days.
        </p>
      </div>

      <button
        onClick={onViewPricing}
        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] border border-purple-400/40"
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>See monthly plans</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
      </div>
    </div>
  );
};

export default DayPassUpgradePrompt;
