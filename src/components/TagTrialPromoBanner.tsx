import React, { useEffect, useState } from 'react';
import { Clock, Gift, Tag, X } from 'lucide-react';
import { getReferralProgramApi, getTagTrialOfferApi, ReferralProgram, TagTrialOffer } from '../services/api';
import { DiscordTagTrialOffer, formatClaimDeadline, formatFreeTime } from './DiscordTagTrialOffer';

// Site-wide announcement bar with two segments:
//  - the Discord server-tag launch promo, shown only while the server reports
//    it active and hidden at the server's deadline. The countdown is to that
//    real, server-enforced instant (claims after it get the standard duration),
//    not an invented urgency timer. Durations come from /api/discord/tag-trial-offer.
//  - Invite to Earn, with the credit range and share of plan price computed on
//    the server from referralPolicy.ts (/api/referral/program).
// Nothing here hardcodes a duration, a dollar amount or a percentage.
// Mobile first: one compact line per segment, 36px+ tap targets.

function formatTimeLeft(ms: number): string {
  const h = Math.floor(ms / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

const INVITE_DISMISS_KEY = 'vixy_invite_banner_dismissed_v1';

interface TagTrialPromoBannerProps {
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onOpenRefer?: () => void;
  onViewPricing?: () => void;
  onAccessGranted?: () => void;
}

export const TagTrialPromoBanner: React.FC<TagTrialPromoBannerProps> = ({
  isAuthenticated,
  onOpenAuth,
  onOpenRefer,
  onViewPricing,
  onAccessGranted,
}) => {
  const [offer, setOffer] = useState<TagTrialOffer | null>(null);
  const [program, setProgram] = useState<ReferralProgram | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [open, setOpen] = useState(false);
  const [tagDismissed, setTagDismissed] = useState(false);
  const [inviteDismissed, setInviteDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTagTrialOfferApi().then((o) => {
      if (!cancelled) setOffer(o);
    });
    getReferralProgramApi().then((p) => {
      if (!cancelled) setProgram(p);
    });
    try {
      setInviteDismissed(localStorage.getItem(INVITE_DISMISS_KEY) === '1');
    } catch {
      /* storage unavailable: the segment stays visible */
    }
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (!offer) return;
    try {
      setTagDismissed(sessionStorage.getItem(`vixy_tag_promo_dismissed_${offer.promo.endsAt}`) === '1');
    } catch {
      /* storage unavailable: the segment stays visible */
    }
  }, [offer]);

  const endsMs = offer ? Date.parse(offer.promo.endsAt) : NaN;
  const left = endsMs - now;
  const tagActive =
    !!offer && offer.promo.active && Number.isFinite(endsMs) && left > 0;

  const tiers = program?.tiers ?? [];
  const inviteReady = tiers.length > 0;
  const showTag = tagActive && !tagDismissed;
  const showInvite = inviteReady && !inviteDismissed;
  if (!showTag && !showInvite && !open) return null;

  const rewardValues = tiers.map((t) => Number(t.rewardUsd));
  const shareValues = tiers.map((t) => t.shareOfMonthlyPricePercent);
  const rewardRange =
    inviteReady ? `$${Math.min(...rewardValues).toFixed(2)}–$${Math.max(...rewardValues).toFixed(2)}` : '';
  const minShare = inviteReady ? Math.min(...shareValues) : 0;
  const maxShare = inviteReady ? Math.max(...shareValues) : 0;
  const shareRange = minShare === maxShare ? `${minShare}%` : `${Math.round(minShare)}–${Math.round(maxShare)}%`;

  const dismissTag = () => {
    setTagDismissed(true);
    try {
      if (offer) sessionStorage.setItem(`vixy_tag_promo_dismissed_${offer.promo.endsAt}`, '1');
    } catch {
      /* ignore */
    }
  };
  const dismissInvite = () => {
    setInviteDismissed(true);
    try {
      localStorage.setItem(INVITE_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const promoLabel = offer ? formatFreeTime(offer.promo.durationHours) : '';
  const standardLabel = offer ? formatFreeTime(offer.standardDurationHours) : '';
  const endsLabel = Number.isFinite(endsMs) ? formatClaimDeadline(endsMs) : '';

  return (
    <>
      {(showTag || showInvite) && (
        <div className="relative z-[55] w-full text-white font-mono">
          {tagActive && !tagDismissed && (
            <div
              role="region"
              aria-label="Discord server tag launch offer"
              className="relative bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 border-b border-indigo-300/30"
            >
              <div className="max-w-7xl mx-auto pl-3 pr-12 sm:px-12 py-1.5 flex items-center justify-center gap-2 sm:gap-3">
                <span className="hidden sm:inline px-2 py-0.5 rounded bg-white/15 text-[11px] font-black uppercase tracking-wider shrink-0">
                  Tonight only
                </span>
                <span className="min-w-0 text-[12px] sm:text-[13px] font-bold leading-snug">
                  <span className="sm:hidden">Tonight: VIXY tag = {promoLabel} free</span>
                  <span className="hidden sm:inline">Wear the VIXY tag in our Discord and get {promoLabel} free</span>
                  <span className="text-indigo-100/90 font-normal"> · {formatTimeLeft(left)} left</span>
                </span>
                <span className="hidden lg:flex items-center gap-1 text-[11px] text-indigo-100/90 shrink-0">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Claim by {endsLabel}. After that, claims get {standardLabel}.
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="shrink-0 min-h-[36px] px-3 rounded-lg bg-white text-indigo-800 text-[12px] font-black uppercase tracking-wide hover:bg-indigo-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Claim
                </button>
                <button
                  type="button"
                  onClick={dismissTag}
                  aria-label="Dismiss tag offer"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-indigo-100/80 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {showInvite && (
            <div
              role="region"
              aria-label="Invite to Earn"
              className="relative bg-[#120a26] border-b border-violet-500/30"
            >
              <div className="max-w-7xl mx-auto pl-3 pr-12 sm:px-12 py-1.5 flex items-center justify-center gap-2 sm:gap-3">
                <Gift className="w-4 h-4 text-violet-300 shrink-0" />
                <span className="min-w-0 text-[12px] sm:text-[13px] leading-snug text-violet-50">
                  <span className="font-bold">Invite to Earn:</span>{' '}
                  <span className="sm:hidden">{rewardRange} credit per paid friend</span>
                  <span className="hidden sm:inline">
                    earn {rewardRange} credit for every friend who subscribes ({shareRange} of their monthly plan). Friends get{' '}
                    {program?.discountPercent}% off their first month.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenRefer?.()}
                  className="shrink-0 min-h-[36px] px-3 rounded-lg border border-violet-400/50 bg-violet-600/30 hover:bg-violet-600/50 text-[12px] font-black uppercase tracking-wide cursor-pointer"
                >
                  {isAuthenticated ? 'Invite' : 'Join'}
                </button>
                <button
                  type="button"
                  onClick={dismissInvite}
                  aria-label="Dismiss Invite to Earn"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-violet-200/80 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-[#0a0620] border border-indigo-400/40 text-indigo-200 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <DiscordTagTrialOffer
              isAuthenticated={isAuthenticated}
              onOpenAuth={() => {
                setOpen(false);
                onOpenAuth();
              }}
              onViewPricing={
                onViewPricing
                  ? () => {
                      setOpen(false);
                      onViewPricing();
                    }
                  : undefined
              }
              onAccessGranted={onAccessGranted}
            />
          </div>
        </div>
      )}
    </>
  );
};
