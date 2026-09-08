/**
 * VIXY VAULT - Admin referral queue.
 *
 * The Discord payout workflow: a user hits the 2,500-credit threshold, requests
 * a payout, and their credits ESCROW immediately. They DM you the ticket ID.
 * You paste it here, see the whole picture, and resolve it.
 *
 * WHY THE TICKET ID IS THE JOIN KEY: you never look a user up by Discord handle
 * to pay them. The ticket resolves to exactly one escrowed ledger entry. Same
 * discipline as the Stripe attribution layer - no name matching, no email
 * matching.
 *
 * There is deliberately NO balance-editing control here. Every resolution
 * writes a ledger entry carrying the admin, a payout type and a reason.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Ticket, Check, X, RefreshCw } from "lucide-react";

interface PayoutTicket {
  ticketId: string;
  userId: string;
  credits: number;
  status: string;
  createdAt?: string;
  resolvedAt?: string;
  adminUserId?: string;
  payoutType?: string;
  reason?: string;
}

interface Overview {
  tickets: PayoutTicket[];
  openTickets: number;
  rewardsCreated: number;
  creditsAwarded: number;
  creditsPending: number;
  creditsReversed: number;
}

const usd = (c = 0) => "$" + (Math.max(0, c) / 100).toFixed(2);

export default function AdminReferralQueue() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [payoutType, setPayoutType] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/referral/overview", { credentials: "include" });
      if (!r.ok) throw new Error(String(r.status));
      setData(await r.json());
      setError(null);
    } catch {
      setError("Couldn't load the referral queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resolve = async (ticketId: string, outcome: "FULFILLED" | "DENIED") => {
    const why = (reason[ticketId] || "").trim();
    if (!why) {
      setNotice("A reason is required - it goes into the audit record.");
      return;
    }
    setBusy(ticketId);
    setNotice(null);
    try {
      const r = await fetch("/api/admin/referral/resolve-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ticketId,
          outcome,
          payoutType: payoutType[ticketId] || "OTHER",
          reason: why,
        }),
      });
      const j = await r.json();
      setNotice(j?.message || (j?.ok ? "Ticket " + outcome.toLowerCase() + "." : "Failed."));
      if (j?.ok) await load();
    } catch {
      setNotice("Request failed.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-white/40">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading referral queue...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-rose-300 mb-3">{error}</p>
        <button onClick={() => { setLoading(true); void load(); }}
          className="px-4 py-2 text-xs tracking-[0.15em] border border-white/15 rounded-lg hover:bg-white/5">
          RETRY
        </button>
      </div>
    );
  }

  const open = (data?.tickets || []).filter((t) => t.status === "REQUESTED");
  const closed = (data?.tickets || []).filter((t) => t.status !== "REQUESTED");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-violet-300" />
          <span className="text-[11px] tracking-[0.2em] text-violet-300 font-mono">
            REFERRAL PAYOUT QUEUE
          </span>
        </div>
        <button onClick={() => void load()}
          className="px-3 py-1.5 text-xs border border-white/12 rounded-lg hover:bg-white/5 text-white/60 flex items-center gap-2">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="text-2xl text-white/85">{data?.openTickets ?? 0}</div>
          <div className="text-xs text-white/40 mt-1">Open tickets</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="text-2xl text-white/85">{data?.rewardsCreated ?? 0}</div>
          <div className="text-xs text-white/40 mt-1">Rewards created</div>
        </div>
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
          <div className="text-2xl text-emerald-300">{usd(data?.creditsAwarded)}</div>
          <div className="text-xs text-emerald-200/70 mt-1">Credits awarded</div>
        </div>
        <div className="rounded-lg border border-rose-400/20 bg-rose-400/[0.05] p-4">
          <div className="text-2xl text-rose-300">{usd(data?.creditsReversed)}</div>
          <div className="text-xs text-rose-200/70 mt-1">Reversed</div>
        </div>
      </div>

      {notice && <p className="text-xs text-white/60">{notice}</p>}

      {open.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-sm text-white/40">
          No open payout requests.
        </div>
      ) : (
        <div className="space-y-3">
          {open.map((t) => (
            <div key={t.ticketId} className="rounded-xl border border-violet-400/25 bg-black/40 p-5">
              <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
                <div>
                  <div className="font-mono text-lg text-violet-200">{t.ticketId}</div>
                  <div className="text-xs text-white/40 mt-1">
                    {t.userId} - requested {t.createdAt ? t.createdAt.slice(0, 10) : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl text-white/85">{usd(t.credits)}</div>
                  <div className="text-xs text-amber-300/80">{t.credits} credits escrowed</div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <select
                  value={payoutType[t.ticketId] || "OTHER"}
                  onChange={(e) => setPayoutType({ ...payoutType, [t.ticketId]: e.target.value })}
                  className="bg-black/50 border border-white/12 rounded-lg px-3 py-2 text-sm text-white/80"
                >
                  <option value="EXTENDED_SUBSCRIPTION">Extended subscription</option>
                  <option value="MERCH">Merch</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  value={reason[t.ticketId] || ""}
                  onChange={(e) => setReason({ ...reason, [t.ticketId]: e.target.value })}
                  placeholder="Reason (required, stored in the audit record)"
                  className="flex-1 min-w-[220px] bg-black/50 border border-white/12 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => resolve(t.ticketId, "FULFILLED")}
                  disabled={busy === t.ticketId}
                  className="px-4 py-2 rounded-lg border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 text-sm flex items-center gap-2 disabled:opacity-40"
                >
                  <Check className="w-4 h-4" /> Fulfil
                </button>
                <button
                  onClick={() => resolve(t.ticketId, "DENIED")}
                  disabled={busy === t.ticketId}
                  className="px-4 py-2 rounded-lg border border-white/12 text-white/60 text-sm flex items-center gap-2 disabled:opacity-40"
                >
                  <X className="w-4 h-4" /> Deny
                </button>
              </div>
              <p className="text-[11px] text-white/30 mt-2">
                Denying releases the escrowed credits back to the user.
              </p>
            </div>
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <div>
          <div className="text-[11px] tracking-[0.2em] text-white/30 font-mono mb-2">HISTORY</div>
          <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
            {closed.slice(0, 25).map((t) => (
              <div key={t.ticketId} className="flex justify-between px-4 py-3 bg-white/[0.02] text-sm">
                <div className="min-w-0">
                  <span className="font-mono text-white/70">{t.ticketId}</span>
                  <span className="text-white/30 text-xs ml-2">{t.payoutType || ""}</span>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="text-white/60">{usd(t.credits)}</span>
                  <span className="text-xs text-white/40 ml-2">{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
