/**
 * VIXY VAULT - Invite to Earn.
 *
 * Conversion-based referral rewards. Every number is server-derived; nothing is
 * seeded, hardcoded, or interpolated client-side.
 *
 * HONESTY RULES:
 *  - PENDING is never displayed as earned. A user who thinks they have $47 and
 *    can only spend $32 files a support ticket.
 *  - Empty state shows real zeros, framed as an invitation.
 *  - No streaks or countdown timers: they manufacture urgency the economics do
 *    not support and push people to spam links instead of bringing customers.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Gift, Copy, Share2, CalendarPlus, MessageSquare, Check, Trophy, Loader2, Lock,
} from "lucide-react";
import { getReferralProgramApi, ReferralProgram } from "../services/api";

interface ReferralRow {
  status?: string;
  createdAt?: string;
  plan?: string;
  rewardCredits?: number;
  rewardState?: string;
  referredEmailMasked?: string;
}

interface ReferralMe {
  code: string | null;
  link: string | null;
  canChooseCode: boolean;
  discountPercent: number;
  freeDaysEarned: number;
  friendsJoined: number;
  friendsConverted: number;
  referrals: ReferralRow[];
}

interface CreditBalance {
  available: number;
  pending: number;
  escrowed: number;
  redeemed: number;
  reversed: number;
  lifetimeEarned: number;
  creditsPerDay: number;
  payoutThreshold: number;
  daysAffordable: number;
}

const usd = (c = 0) => "$" + (Math.max(0, c) / 100).toFixed(2);

export default function ReferralPanel() {
  const [data, setData] = useState<ReferralMe | null>(null);
  const [bal, setBal] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  // Public program terms (credit per plan, share of price, rules), computed on
  // the server from referralPolicy.ts -- the only source of referral economics.
  const [program, setProgram] = useState<ReferralProgram | null>(null);
  useEffect(() => {
    let cancelled = false;
    getReferralProgramApi().then((p) => {
      if (!cancelled) setProgram(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // True only in the session where the claim just happened, so the layout
  // switch comes with an unmissable "locked to your account" confirmation.
  const [justClaimed, setJustClaimed] = useState(false);

  const load = useCallback(async () => {
    try {
      const meRes = await fetch("/api/referral/me", { credentials: "include" });
      if (!meRes.ok) throw new Error(String(meRes.status));
      setData(await meRes.json());
      setError(null);
      // Render the invite half immediately. Credits load separately below and
      // must never be able to hold the whole page in a loading state.
      setLoading(false);
      // Credits are a separate concern: if the ledger is unavailable the page
      // still renders the invite half rather than failing whole.
      try {
        // Hard timeout: a slow or hanging ledger read must not freeze the page.
        const bRes = await fetch("/api/referral/balance", {
          credentials: "include",
          signal: AbortSignal.timeout(8000),
        });
        if (bRes.ok) setBal(await bRes.json());
      } catch {
        /* balance is optional */
      }
    } catch {
      setError("Couldn't load your referrals. Retry in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const claimCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (code.length < 4) {
      setCodeError("Codes are at least 4 characters.");
      return;
    }
    setBusy(true);
    setCodeError(null);
    try {
      const r = await fetch("/api/referral/claim-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const j = await r.json();
      if (!r.ok || j?.success === false) {
        setCodeError(j?.message || "That code isn't available.");
      } else {
        setCodeInput("");
        setJustClaimed(true);
        await load();
      }
    } catch {
      setCodeError("Couldn't claim that code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const post = async (path: string, body?: unknown) => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body ?? {}),
      });
      const j = await r.json();
      if (j?.ticketId) {
        setNotice("Ticket " + j.ticketId + " created. DM this ID to VIXY on Discord.");
      } else {
        setNotice(j?.message || (j?.ok ? "Done." : "That didn't go through."));
      }
      if (j?.ok) await load();
    } catch {
      setNotice("Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!data?.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Couldn't copy. Select the link and copy manually.");
    }
  };

  const copyCode = async () => {
    if (!data?.code) return;
    try {
      await navigator.clipboard.writeText(data.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setNotice("Couldn't copy. Select the code and copy manually.");
    }
  };

  // navigator.share only exists on some browsers (mostly mobile). Falling back
  // to copy beats a button that silently does nothing on desktop.
  const shareLink = async () => {
    if (!data?.link) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url: data.link });
        return;
      } catch {
        /* user cancelled or share failed — fall through to copy */
      }
    }
    await copyLink();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-white/40">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your referrals...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-rose-300 mb-3">{error}</p>
        <button
          onClick={() => { setLoading(true); void load(); }}
          className="px-4 py-2 text-xs tracking-[0.15em] border border-white/15 rounded-lg hover:bg-white/5"
        >
          RETRY
        </button>
      </div>
    );
  }

  const available = bal?.available ?? 0;
  const pending = bal?.pending ?? 0;
  const lifetime = bal?.lifetimeEarned ?? 0;
  const threshold = bal?.payoutThreshold ?? 2500;
  const perDay = bal?.creditsPerDay ?? 999;
  const qualified = data?.friendsConverted ?? 0;

  // --radar-pct is a UNITLESS NUMBER: the CSS does calc(3.6deg * var(--radar-pct)).
  const pct = Math.min(100, Math.round((available / Math.max(1, threshold)) * 100));
  const canDay = available >= perDay;
  const canPayout = available >= threshold;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5">

      <div className="hud-corners rounded-2xl border border-violet-500/25 bg-[#0a0713]/90 p-5 sm:p-8">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-violet-300" />
          <span className="text-[12px] tracking-[0.2em] text-violet-300 font-mono">
            INVITE TO EARN
          </span>
        </div>

        <h1 className="hud-gradient-text text-3xl sm:text-4xl font-semibold mb-2">
          {lifetime > 0
            ? "You've earned " + usd(lifetime) + " so far."
            : "Turn invites into VIXY credit."}
        </h1>
        <p className="text-sm text-white/55 max-w-xl leading-relaxed">
          Your friend gets {data?.discountPercent ?? program?.discountPercent}% off their first month. You earn credit when
          they become a paying member -- not when they click, and not when they sign up.
        </p>

        {program && program.tiers.length > 0 && (
          <div className="mt-6" aria-label="How much you earn per friend">
            <div className="text-[12px] tracking-[0.15em] text-white/50 font-mono mb-2">WHAT YOU EARN PER FRIEND</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {program.tiers.map((t) => (
                <div key={t.plan} className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4">
                  <div className="text-sm font-semibold text-white">
                    Friend subscribes to {t.label}{" "}
                    <span className="text-white/50 font-normal">(${(t.monthlyPriceCents / 100).toFixed(2)}/mo)</span>
                  </div>
                  <div className="mt-2 text-3xl font-bold text-emerald-300 font-mono">${t.rewardUsd}</div>
                  <div className="text-xs text-white/60 mt-1">
                    {t.rewardCredits.toLocaleString()} credits · {t.shareOfMonthlyPricePercent}% of their monthly price
                  </div>
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-1.5 text-[13px] text-white/60 leading-relaxed list-disc pl-5">
              <li>
                You earn once per friend, the first time they pay for a plan.
                {program.sameRewardOnAnnualPlans ? " Annual plans earn the same credit as monthly." : ""}
                {program.dayPassEarnsCredit ? "" : " Day passes don't earn credit."}
              </li>
              {program.rewardCappedAtAmountPaid && (
                <li>Credit never exceeds what your friend actually paid.</li>
              )}
              <li>
                Credit becomes spendable {program.clawbackHoldDays} days after their payment, in case of a refund.
              </li>
              <li>
                Spend {program.creditsPerFreeDay.toLocaleString()} credits on a free day of access, or request a payout
                once you reach {usd(program.payoutThresholdCredits)}. Credits expire after {program.creditExpiryDays} days.
              </li>
            </ul>
          </div>
        )}

        {!data?.code ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/50 p-5">
            <div className="text-[11px] tracking-[0.15em] text-white/40 font-mono mb-2">
              CLAIM YOUR CODE
            </div>
            <p className="text-sm text-white/40 mb-3">
              4-16 letters and numbers. Friends type this at checkout, so make it easy
              to say out loud. Once claimed it's locked to your account for good — pick
              one you like.
            </p>
            <div className="flex gap-2 flex-wrap">
              <input
                value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !busy) void claimCode(); }}
                placeholder="VIXY2026"
                maxLength={16}
                className="flex-1 min-w-[200px] bg-black/50 border border-white/12 rounded-lg px-4 py-3 font-mono tracking-[0.2em] text-white"
              />
              <button
                onClick={claimCode}
                disabled={busy}
                className="px-6 py-3 rounded-lg bg-violet-600/20 border border-violet-400/60 text-violet-300 text-xs tracking-[0.15em] font-mono hover:bg-violet-600/30 disabled:opacity-40 flex items-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {busy ? "CLAIMING..." : "CLAIM CODE"}
              </button>
            </div>
            {codeError && <p className="mt-2 text-xs text-rose-300">{codeError}</p>}
          </div>
        ) : (
          <div className={`mt-6 rounded-xl border p-5 ${justClaimed ? "border-emerald-400/50 bg-emerald-950/20" : "border-violet-500/30 bg-black/50"}`}>
            {justClaimed && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-mono tracking-[0.1em]">
                <Check className="w-4 h-4" />
                <span>CODE CLAIMED — it's locked to your account. Time to earn.</span>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <div className="text-[11px] tracking-[0.15em] text-violet-300/80 font-mono">
                YOUR REFERRAL CODE
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/35 font-mono">
                <Lock className="w-3 h-3" />
                <span>Locked to your account</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap mb-1">
              <div className="hud-gradient-text font-mono font-black tracking-[0.25em] text-3xl sm:text-4xl select-all">
                {data.code}
              </div>
              <button
                onClick={copyCode}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-violet-400/40 bg-violet-600/15 hover:bg-violet-600/30 text-xs tracking-[0.12em] flex items-center gap-2 text-violet-200 font-mono"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? "COPIED" : "COPY CODE"}
              </button>
            </div>
            <p className="text-sm text-white/55 mb-4">
              Go invite and earn — friends get {data?.discountPercent ?? 20}% off with it,
              you earn credit when they go paid.
            </p>

            <div className="text-[11px] tracking-[0.15em] text-white/40 font-mono mb-2">
              YOUR LINK
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[240px] font-mono text-sm bg-black/50 border border-white/12 rounded-lg px-4 py-3 text-white/80 truncate">
                {data.link}
              </div>
              <button
                onClick={copyLink}
                className="min-h-[44px] px-4 rounded-lg border border-white/12 hover:bg-white/5 text-xs tracking-[0.12em] flex items-center justify-center gap-2 text-white/70 flex-1 sm:flex-none"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "COPIED" : "COPY"}
              </button>
              <button
                onClick={shareLink}
                className="min-h-[44px] px-4 rounded-lg border border-white/12 hover:bg-white/5 text-xs tracking-[0.12em] flex items-center justify-center gap-2 text-white/70 flex-1 sm:flex-none"
              >
                <Share2 className="w-4 h-4" /> SHARE
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px] items-center">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="hud-stat-card rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-5">
            <div className="hud-stat-label text-emerald-300/80">AVAILABLE</div>
            <div className="hud-stat-value text-glow-emerald">{available.toLocaleString()}</div>
            <div className="text-xs text-emerald-200/70 mt-1">{usd(available)} - ready now</div>
          </div>
          <div className="hud-stat-card rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-5">
            <div className="hud-stat-label text-amber-300/80">PENDING</div>
            <div className="hud-stat-value text-glow-amber">{pending.toLocaleString()}</div>
            <div className="text-xs text-amber-100/80 mt-1">clears after the refund window</div>
          </div>
          <div className="hud-stat-card rounded-xl border border-violet-400/25 bg-white/[0.02] p-5">
            <div className="hud-stat-label text-white/40">QUALIFIED</div>
            <div className="hud-stat-value text-glow-purple">{qualified}</div>
            <div className="text-xs text-white/40 mt-1">paying members you brought</div>
          </div>
        </div>

        <div
          className="radar-wrap mx-auto max-w-[220px]"
          style={{ ["--radar-pct" as any]: pct }}
        >
          <div className="radar-outer-glow" />
          <div className="radar-ring-track" />
          <div className="radar-progress" />
          <div className="radar-sweep-ring" />
          <div className="radar-core">
            <div className="radar-value">{pct}%</div>
            <div className="radar-label">TO PAYOUT</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/50 p-5">
        <div className="flex justify-between items-baseline mb-3 flex-wrap gap-2">
          <span className="text-sm text-white/55">
            Payout unlocks at {threshold.toLocaleString()} credits
          </span>
          <span className={canPayout ? "text-sm text-emerald-300" : "text-sm text-white/40"}>
            {canPayout
              ? "Unlocked"
              : (threshold - available).toLocaleString() + " to go"}
          </span>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => post("/api/referral/redeem-day", { days: 1 })}
            disabled={busy || !canDay}
            className="flex-1 min-w-[200px] px-5 py-3 rounded-lg border border-violet-400/40 bg-violet-600/20 text-violet-200 hover:bg-violet-600/30 disabled:opacity-35 text-sm flex items-center justify-center gap-2"
          >
            <CalendarPlus className="w-4 h-4" />
            Add a day - {perDay.toLocaleString()}
          </button>
          <button
            onClick={() => post("/api/referral/request-payout")}
            disabled={busy || !canPayout}
            className="flex-1 min-w-[200px] px-5 py-3 rounded-lg border border-white/12 text-white/70 hover:bg-white/5 disabled:opacity-35 text-sm flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Request payout - {available.toLocaleString()}
          </button>
        </div>

        {notice && <p className="mt-3 text-xs text-white/60">{notice}</p>}
      </div>

      <div>
        <div className="text-[11px] tracking-[0.2em] text-white/30 font-mono mb-3">YOUR FUNNEL</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="text-2xl text-white/85">{data?.friendsJoined ?? 0}</div>
            <div className="text-xs text-white/40 mt-1">Signed up</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="text-2xl text-white/85">{qualified}</div>
            <div className="text-xs text-white/40 mt-1">Paid</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="text-2xl text-white/85">{data?.freeDaysEarned ?? 0}</div>
            <div className="text-xs text-white/40 mt-1">Free days</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="text-2xl text-white/85">{usd(lifetime)}</div>
            <div className="text-xs text-white/40 mt-1">Earned</div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] tracking-[0.2em] text-white/30 font-mono mb-3">YOUR INVITES</div>
        {(data?.referrals?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/50 p-6 text-sm text-white/40">
            {data?.code
              ? "Share your link to get started." +
                (program?.tiers?.[0]
                  ? " A friend who subscribes to " + program.tiers[0].label + " earns you " + program.tiers[0].rewardCredits.toLocaleString() + " credits ($" + program.tiers[0].rewardUsd + ")."
                  : "")
              : "Claim a code above to start inviting."}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
            {(data as ReferralMe).referrals.map((r, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-3 bg-white/[0.02]">
                <div className="min-w-0">
                  <div className="text-sm text-white/80 truncate">
                    {r.referredEmailMasked || "New member"}
                    {r.plan ? " - " + r.plan : ""}
                  </div>
                  <div className="text-xs text-white/30">
                    {r.createdAt ? String(r.createdAt).slice(0, 10) : ""}
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="text-sm text-white/70">
                    {r.rewardCredits ? "+" + r.rewardCredits : "--"}
                  </div>
                  <div className="text-xs text-white/40">{r.rewardState || r.status || ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
