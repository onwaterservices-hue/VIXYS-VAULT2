import React, { useEffect, useState } from "react";
import { Gift, X, Check } from "lucide-react";

/**
 * Tiny congrats toast shown once a NEW, valid referral code attaches to the
 * account (fired by useReferralCapture via the `vixy:referral-attached`
 * window event). It states only what is true: the discount percent the server
 * returned and, when a promoter/display name is known, who it is from --
 * never an email. Auto-dismisses; nothing is fabricated.
 */

interface AttachedDetail {
  code: string;
  discountPercent: number | null;
  referrerLabel: string | null;
}

export default function ReferralCongratsToast() {
  const [detail, setDetail] = useState<AttachedDetail | null>(null);

  useEffect(() => {
    const onAttached = (e: Event) => {
      const d = (e as CustomEvent).detail as AttachedDetail;
      if (!d || !d.code) return;
      setDetail(d);
    };
    window.addEventListener("vixy:referral-attached", onAttached as EventListener);
    return () => window.removeEventListener("vixy:referral-attached", onAttached as EventListener);
  }, []);

  useEffect(() => {
    if (!detail) return;
    const t = setTimeout(() => setDetail(null), 8000);
    return () => clearTimeout(t);
  }, [detail]);

  if (!detail) return null;

  const pct = typeof detail.discountPercent === "number" ? detail.discountPercent : null;
  const from = detail.referrerLabel ? ` from ${detail.referrerLabel}` : "";
  const headline = pct !== null ? `You unlocked ${pct}% off${from}!` : `Referral code applied${from}!`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] max-w-sm animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/40 bg-[#0a0713]/95 backdrop-blur px-4 py-3.5 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/40">
          <Gift className="h-4 w-4 text-emerald-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>Congratulations!</span>
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-emerald-100/90">
            {headline}
          </p>
          <p className="mt-1 font-mono text-[11px] tracking-[0.15em] text-emerald-300/70">
            {detail.code} · applied at checkout
          </p>
        </div>
        <button
          onClick={() => setDetail(null)}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
