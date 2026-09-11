import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tag, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { getDiscordAuthUrlSecure, getTagTrialOfferApi, getTagTrialStatusApi, TagTrialOffer, TagTrialStatus } from '../services/api';

// Offer card for the Discord server-tag trial: display the VIXY Vault server tag
// next to your Discord username and get free access. Every state rendered here
// comes from /api/discord/tag-trial-status. The tag itself is confirmed with
// Discord during the claim (OAuth), never inferred in the browser.

const DISCORD_INVITE_URL = 'https://discord.gg/a9q3UCAjGH';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

const REASON_TEXT: Record<string, string> = {
  TAG_NOT_EQUIPPED: "Discord says the VIXY Vault tag isn't on your profile yet. In Discord, open User Settings → Profiles → Server Tag, choose VIXY Vault, then claim again.",
  TAG_STATE_UNKNOWN: "Discord didn't return your server tag this time. Please try again in a minute.",
  INVALID_DISCORD_ID: "Discord returned an account we couldn't read. Please try again.",
  ALREADY_CLAIMED: 'This Discord account or VIXY account has already used the free server-tag trial.',
  ALREADY_HAS_ACCESS: 'This account already has active access, so there is nothing to unlock.',
  ENTITLEMENT_UNRESOLVED: "We couldn't confirm your current access. Please try again shortly.",
  SERVICE_UNAVAILABLE: 'Claims are temporarily unavailable. Please try again shortly.',
  NOT_CONFIGURED: 'Claims are temporarily unavailable. Please try again shortly.',
  CLAIM_FAILED: 'The claim could not be saved. Please try again.',
  guild_membership_required: 'Join the VIXY Vault Discord server first, then claim again.',
  discord_already_linked_elsewhere: 'That Discord account is already linked to a different VIXY account.',
  vixy_account_already_linked_to_different_discord: 'This VIXY account is linked to a different Discord account. Claim with that account.',
  missing_params: 'Discord authorization was cancelled.',
  invalid_or_expired_state: 'The Discord authorization expired. Please claim again.',
};

function reasonText(reason: string | null, minAgeDays: number): string {
  if (reason === 'DISCORD_ACCOUNT_TOO_NEW') {
    return `Your Discord account must be at least ${minAgeDays} days old to claim this trial.`;
  }
  return (reason && REASON_TEXT[reason]) || `Discord verification did not complete (${reason || 'unknown'}). Please try again.`;
}

// "3 days", "1 day", or "36 hours" for a duration the server returned.
export function formatFreeTime(hours: number): string {
  if (hours % 24 === 0) {
    const d = hours / 24;
    return `${d} day${d === 1 ? '' : 's'}`;
  }
  return `${hours} hours`;
}

// The last minute a claim still counts, in the viewer's time zone, e.g.
// "Fri 11:59 PM EDT". A deadline at exactly midnight printed as "Sat 12:00 AM"
// reads as Saturday night, a full day late.
export function formatClaimDeadline(endsAt: string | number): string {
  const ms = typeof endsAt === 'number' ? endsAt : Date.parse(endsAt);
  if (!Number.isFinite(ms)) return '';
  return new Date(ms - 60 * 1000).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

interface DiscordTagTrialOfferProps {
  isAuthenticated: boolean;
  onOpenAuth?: () => void;
  onViewPricing?: () => void;
  onAccessGranted?: () => void;
  className?: string;
}

export const DiscordTagTrialOffer: React.FC<DiscordTagTrialOfferProps> = ({
  isAuthenticated,
  onOpenAuth,
  onViewPricing,
  onAccessGranted,
  className = '',
}) => {
  const [status, setStatus] = useState<TagTrialStatus | null>(null);
  // The public offer (durations + launch promo deadline) so signed-out visitors
  // see the real terms instead of a hardcoded default.
  const [publicOffer, setPublicOffer] = useState<TagTrialOffer | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const baselineAttemptAt = useRef<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAccessGrantedRef = useRef(onAccessGranted);
  onAccessGrantedRef.current = onAccessGranted;

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setWaiting(false);
  }, []);

  // Stores the status and, when its last attempt is new (or `settleAny`),
  // shows that attempt's outcome. Returns true once an outcome was shown.
  const applyStatus = useCallback((s: TagTrialStatus | null, settleAny: boolean) => {
    if (!s) return false;
    setStatus(s);
    const attempt = s.lastAttempt;
    if (!attempt || (!settleAny && attempt.at === baselineAttemptAt.current)) return false;
    baselineAttemptAt.current = attempt.at;
    if (attempt.outcome === 'GRANTED') {
      // The length actually granted, read from the trial record itself.
      const t = s.trial;
      const grantedHours =
        t?.claimedAt && t?.expiresAt
          ? Math.round((Date.parse(t.expiresAt) - Date.parse(t.claimedAt)) / 3600e3)
          : s.offer.durationHours;
      setResult({ type: 'success', text: `Verified with Discord. Your free access is active for ${formatFreeTime(grantedHours)}.` });
      const cb = onAccessGrantedRef.current;
      if (cb) setTimeout(cb, 1500);
    } else {
      setResult({ type: 'error', text: reasonText(attempt.reason, s.offer.minDiscordAccountAgeDays) });
    }
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    getTagTrialOfferApi().then((o) => {
      if (!cancelled) setPublicOffer(o);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    // Only surface a past attempt on load when we arrived from the claim
    // redirect; otherwise an old refusal would greet every visit.
    const fromClaimRedirect = new URLSearchParams(window.location.search).has('tag_trial');
    getTagTrialStatusApi().then((s) => {
      if (!cancelled) applyStatus(s, fromClaimRedirect);
    });
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'VIXY_TAG_TRIAL_RESULT') return;
      getTagTrialStatusApi().then((s) => {
        if (applyStatus(s, false)) stopPolling();
      });
    };
    window.addEventListener('message', onMessage);
    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
      stopPolling();
    };
  }, [isAuthenticated, applyStatus, stopPolling]);

  const handleClaim = async () => {
    if (!isAuthenticated) {
      onOpenAuth?.();
      return;
    }
    setResult(null);
    setWaiting(true);
    try {
      const [fresh, auth] = await Promise.all([getTagTrialStatusApi(), getDiscordAuthUrlSecure('tag_trial')]);
      if (fresh) setStatus(fresh);
      baselineAttemptAt.current = fresh?.lastAttempt?.at ?? status?.lastAttempt?.at ?? null;

      const width = 600;
      const height = 760;
      const popup = window.open(
        auth.url,
        'vixy_tag_trial',
        `width=${width},height=${height},top=${window.screen.height / 2 - height / 2},left=${window.screen.width / 2 - width / 2},scrollbars=yes`,
      );
      if (!popup) {
        window.location.href = auth.url;
        return;
      }
      const startedAt = Date.now();
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = setInterval(async () => {
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          stopPolling();
          setResult({
            type: 'error',
            text: 'No result from Discord yet. If you finished authorizing, refresh this page to see your trial status.',
          });
          return;
        }
        const s = await getTagTrialStatusApi();
        if (applyStatus(s, false)) stopPolling();
      }, POLL_INTERVAL_MS);
    } catch (err: any) {
      stopPolling();
      setResult({ type: 'error', text: err?.message || 'Could not start Discord verification.' });
    }
  };

  const offer = status?.offer ?? publicOffer;
  const freeLabel = offer ? formatFreeTime(offer.durationHours) : null;
  const minAge = offer?.minDiscordAccountAgeDays ?? 30;
  const promoEndsLabel = offer?.promo.active ? formatClaimDeadline(offer.promo.endsAt) || null : null;
  const trial = status?.trial ?? null;
  const active = trial?.status === 'ACTIVE';
  const used = !!status?.claimed && !active;

  return (
    <div className={`rounded-2xl border border-indigo-400/40 bg-[#0a0620]/90 p-4 text-left font-sans space-y-3 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500 text-white font-mono tracking-wider">
          Discord
        </span>
        <span className="text-sm font-black text-white font-mono uppercase">
          {freeLabel ? `Wear the VIXY tag, get ${freeLabel} free` : 'Wear the VIXY tag, get free access'}
        </span>
      </div>

      {active && trial?.expiresAt ? (
        <div className="flex items-start gap-2 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Your free trial is active until <strong>{new Date(trial.expiresAt).toLocaleString()}</strong>. Keep the
            VIXY Vault tag on your Discord profile: removing it ends the trial.
          </span>
        </div>
      ) : used ? (
        <div className="space-y-2 text-xs text-purple-200">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-purple-300" />
            <span>
              {trial?.endedReason === 'TAG_REMOVED'
                ? 'Your free server-tag trial ended when the VIXY Vault tag was removed.'
                : 'You have already used your free server-tag trial.'}{' '}
              A monthly plan keeps the terminal open.
            </span>
          </div>
          {onViewPricing && (
            <button
              type="button"
              onClick={onViewPricing}
              className="px-3 py-1.5 rounded-lg bg-purple-800 hover:bg-purple-700 text-white font-bold text-[11px] uppercase font-mono cursor-pointer"
            >
              View monthly plans
            </button>
          )}
        </div>
      ) : (
        <>
          {offer?.promo.active && promoEndsLabel && (
            <p className="text-[11px] font-semibold text-amber-300 leading-relaxed">
              Launch offer: claim by {promoEndsLabel} and get {formatFreeTime(offer.promo.durationHours)} free. After
              that, claims get {formatFreeTime(offer.standardDurationHours)}.
            </p>
          )}
          <ol className="list-decimal pl-4 space-y-1 text-[11px] text-purple-200/90">
            <li>
              Join the{' '}
              <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="underline text-indigo-300 hover:text-white">
                VIXY Vault Discord server
              </a>
              .
            </li>
            <li>In Discord, open User Settings → Profiles → Server Tag, press Select and choose VIXY Vault.</li>
            <li>Claim below. We confirm your tag with Discord and unlock the terminal right away.</li>
          </ol>
          <button
            type="button"
            onClick={handleClaim}
            disabled={waiting}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wide font-mono flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {waiting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Waiting for Discord...</span>
              </>
            ) : (
              <>
                <Tag className="w-4 h-4" />
                <span>
                  {isAuthenticated
                    ? freeLabel
                      ? `Claim ${freeLabel} free`
                      : 'Claim free access'
                    : 'Create a free account to claim'}
                </span>
              </>
            )}
          </button>
          <p className="text-[10px] text-purple-300/60 leading-relaxed">
            One claim per Discord account and per VIXY account. Your Discord account must be at least {minAge} days
            old. Not available while you have paid access. Keep the tag on: we check it every hour, and removing it
            ends the trial.
          </p>
        </>
      )}

      {result && (
        <div
          className={`flex items-start gap-2 p-2.5 rounded-xl text-[11px] leading-relaxed ${
            result.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/70 border border-rose-500/50 text-rose-200'
          }`}
        >
          {result.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          )}
          <span>{result.text}</span>
        </div>
      )}
    </div>
  );
};
