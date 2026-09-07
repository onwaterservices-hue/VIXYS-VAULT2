import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Gift, Link2, Loader2, RefreshCw, Share2, TriangleAlert } from "lucide-react";

/**
 * VIXY VAULT - REFER TO EARN
 *
 * Every value comes from GET /api/referral/me. Nothing is estimated or seeded
 * client-side. A missing field renders as an em dash, never 0: a dash means
 * "not reported", a zero means "the server says zero".
 */

type Status = "JOINED" | "CONVERTED" | "REVERSED";

interface Row {
  maskedEmail: string;
  status: Status;
  joinedAt: string | null;
  convertedAt: string | null;
}

interface Summary {
  code: string | null;
  link: string | null;
  canChooseCode: boolean;
  discountPercent: number;
  freeDaysEarned: number | null;
  friendsJoined: number | null;
  friendsConverted: number | null;
  referrals: Row[];
}

const CODE_RE = /^[A-Z0-9]{4,16}$/;

function num(v: number | null | undefined): string {
  return typeof v === "number" && Number.isFinite(v) ? String(v) : "\u2014";
}

function ago(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const d = Math.floor((Date.now() - t) / 86400000);
  return d <= 0 ? "TODAY" : d === 1 ? "YESTERDAY" : d + "D AGO";
}

async function copyText(v: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(v);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const el = document.createElement("textarea");
    el.value = v;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function Pill({ status }: { status: Status }) {
  const tone: Record<Status, string> = {
    CONVERTED: "border-violet-400/40 bg-violet-400/10 text-violet-200",
    JOINED: "border-white/15 bg-white/5 text-white/55",
    REVERSED: "border-amber-400/30 bg-amber-400/10 text-amber-200/80",
  };
  const label: Record<Status, string> = {
    CONVERTED: "PURCHASED",
    JOINED: "SIGNED UP",
    REVERSED: "REFUNDED",
  };
  return (
    <span className={"rounded border px-2 py-0.5 font-mono text-[10px] tracking-wider " + tone[status]}>
      {label[status]}
    </span>
  );
}

export default function ReferralPanel() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/referral/me", { credentials: "include" });
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Sign in to see your invite link."
            : "Couldn't load your invite status.",
        );
      }
      setData((await res.json()) as Summary);
    } catch (e) {
      setError((e as Error).message || "Couldn't load your invite status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  const flash = useCallback((w: "link" | "code") => {
    setCopied(w);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1800);
  }, []);

  const doCopy = useCallback(
    async (w: "link" | "code") => {
      const v = w === "link" ? data?.link : data?.code;
      if (v && (await copyText(v))) flash(w);
    },
    [data, flash],
  );

  const doShare = useCallback(async () => {
    if (!data?.link) return;
    const pct = data.discountPercent || 20;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "VIXY'S VAULT",
          text: `Take ${pct}% off VIXY'S VAULT with my link.`,
          url: data.link,
        });
        return;
      } catch { /* sheet dismissed - fall back to copy */ }
    }
    if (await copyText(data.link)) flash("link");
  }, [data, flash]);

  const doClaim = useCallback(async () => {
    const code = draft.trim().toUpperCase();
    if (!CODE_RE.test(code)) {
      setClaimError("Use 4-16 letters and numbers.");
      return;
    }
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch("/api/referral/claim-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        setClaimError(json?.message || "That code isn't available.");
        return;
      }
      setDraft("");
      await load();
    } catch {
      setClaimError("Network error. Try again.");
    } finally {
      setClaiming(false);
    }
  }, [draft, load]);

  const pct = data?.discountPercent ?? 20;
  const rows = data?.referrals ?? [];
  const hasCode = Boolean(data?.code);
  const ghost =
    "inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 font-mono text-xs tracking-wider text-white/70 transition-colors hover:border-violet-400/50 hover:text-white";
  const label = "font-mono text-[10px] uppercase tracking-[0.18em] text-white/40";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="relative overflow-hidden rounded-xl border border-violet-500/25 bg-[#0a0713]/90 p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-28 -top-32 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-violet-300" />
              <span className={label}>REFER TO EARN</span>
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Give {pct}% off. Get a free day.
            </h2>
            <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-white/55">
              Share your link. Your friend takes {pct}% off whatever they buy, and the day
              their purchase clears you get 24 hours of full Vault access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh invite status"
            className="rounded-lg border border-white/10 p-2 text-white/40 transition-colors hover:border-violet-400/40 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-7">
          {loading ? (
            <div className="flex h-[112px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-5 font-mono text-xs tracking-wider text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" /> LOADING INVITE LINK
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-5 py-4">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div className="text-sm text-amber-100/85">
                {error}
                <button type="button" onClick={() => void load()} className="ml-2 underline underline-offset-4 hover:text-white">
                  Retry
                </button>
              </div>
            </div>
          ) : hasCode ? (
            <div className="rounded-lg border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.14] to-transparent p-5">
              <span className={label}>YOUR CODE</span>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <span className="font-mono text-4xl font-bold tracking-[0.14em] text-white sm:text-5xl">
                  {data!.code}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void doCopy("code")} className={ghost}>
                    {copied === "code" ? <Check className="h-3.5 w-3.5 text-violet-300" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "code" ? "COPIED" : "COPY CODE"}
                  </button>
                  <button type="button" onClick={() => void doCopy("link")} className={ghost}>
                    {copied === "link" ? <Check className="h-3.5 w-3.5 text-violet-300" /> : <Link2 className="h-3.5 w-3.5" />}
                    {copied === "link" ? "COPIED" : "COPY LINK"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void doShare()}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 font-mono text-xs tracking-wider text-white shadow-[0_0_28px_-6px_rgba(139,92,246,0.8)] transition-colors hover:bg-violet-400"
                  >
                    <Share2 className="h-3.5 w-3.5" /> SHARE
                  </button>
                </div>
              </div>
              {data!.link && <p className="mt-4 truncate font-mono text-xs text-white/30">{data!.link}</p>}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
              <label htmlFor="vixy-ref-code" className={label}>CLAIM YOUR CODE</label>
              <p className="mt-2 text-sm text-white/50">
                4-16 letters and numbers. Friends type this at checkout, so make it easy to say out loud.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  id="vixy-ref-code"
                  value={draft}
                  maxLength={16}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="VIXY2026"
                  onChange={(e) => setDraft(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  onKeyDown={(e) => { if (e.key === "Enter" && !claiming) void doClaim(); }}
                  className="flex-1 rounded-lg border border-white/12 bg-black/50 px-4 py-3 font-mono tracking-[0.14em] text-white placeholder:text-white/20 focus:border-violet-400/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void doClaim()}
                  disabled={claiming || draft.length < 4}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-5 py-3 font-mono text-xs tracking-wider text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                >
                  {claiming && <Loader2 className="h-3.5 w-3.5 animate-spin" />} CLAIM CODE
                </button>
              </div>
              {claimError && <p className="mt-3 text-sm text-amber-200/85">{claimError}</p>}
            </div>
          )}
        </div>

        <dl className="relative mt-5 grid grid-cols-3 divide-x divide-white/[0.07] rounded-lg border border-white/[0.07] bg-white/[0.015]">
          <div className="px-4 py-5 sm:px-6">
            <dt className={label}>FREE DAYS</dt>
            <dd className="mt-2 font-mono text-3xl font-bold tabular-nums text-violet-200">{num(data?.freeDaysEarned)}</dd>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <dt className={label}>SIGNED UP</dt>
            <dd className="mt-2 font-mono text-3xl font-bold tabular-nums text-white/85">{num(data?.friendsJoined)}</dd>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <dt className={label}>PURCHASED</dt>
            <dd className="mt-2 font-mono text-3xl font-bold tabular-nums text-white/85">{num(data?.friendsConverted)}</dd>
          </div>
        </dl>

        <ol className="relative mt-5 flex flex-col gap-3 font-mono text-[11px] tracking-wider text-white/50 sm:flex-row sm:items-center sm:gap-0">
          <li className="sm:pr-5">01 SHARE YOUR LINK</li>
          <li aria-hidden className="hidden h-px w-8 bg-gradient-to-r from-violet-400/50 to-violet-400/10 sm:block" />
          <li className="sm:px-5">02 THEY TAKE {pct}% OFF</li>
          <li aria-hidden className="hidden h-px w-8 bg-gradient-to-r from-violet-400/50 to-violet-400/10 sm:block" />
          <li className="text-violet-200/90 sm:pl-5">03 YOU GET A FREE DAY</li>
        </ol>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#0a0713]/70 p-6">
        <span className={label}>YOUR INVITES</span>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-white/40">
            {hasCode
              ? "Nobody has used your code yet. Send it to one person today."
              : "Claim a code above to start inviting."}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/[0.06]">
            {rows.map((r, i) => (
              <li key={r.maskedEmail + i} className="flex items-center justify-between gap-4 py-3">
                <span className="truncate font-mono text-sm text-white/70">{r.maskedEmail}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[10px] tracking-wider text-white/30">{ago(r.convertedAt || r.joinedAt)}</span>
                  <Pill status={r.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
