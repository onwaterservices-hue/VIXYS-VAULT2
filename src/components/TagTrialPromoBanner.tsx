import React, { useEffect, useState } from 'react';
import { Clock, Tag, X } from 'lucide-react';
import { getTagTrialOfferApi, TagTrialOffer } from '../services/api';
import { DiscordTagTrialOffer, formatFreeTime } from './DiscordTagTrialOffer';

// Site-wide announcement for the Discord server-tag launch promo. It renders
// only while the server reports the promo as active, and hides itself at the
// server's deadline. The countdown is to that real, server-enforced instant
// (claims after it get the standard duration) -- not an invented urgency timer.
// Every duration shown comes from /api/discord/tag-trial-offer.

function formatTimeLeft(ms: number): string {
  const h = Math.floor(ms / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

interface TagTrialPromoBannerProps {
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onViewPricing?: () => void;
  onAccessGranted?: () => void;
}

export const TagTrialPromoBanner: React.FC<TagTrialPromoBannerProps> = ({
  isAuthenticated,
  onOpenAuth,
  onViewPricing,
  onAccessGranted,
}) => {
  const [offer, setOffer] = useState<TagTrialOffer | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTagTrialOfferApi().then((o) => {
      if (!cancelled) setOffer(o);
    });
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (!offer) return;
    try {
      setDismissed(sessionStorage.getItem(`vixy_tag_promo_dismissed_${offer.promo.endsAt}`) === '1');
    } catch {
      /* storage unavailable: the banner simply stays visible */
    }
  }, [offer]);

  if (!offer || !offer.promo.active) return null;
  const endsMs = Date.parse(offer.promo.endsAt);
  const left = endsMs - now;
  if (!Number.isFinite(endsMs) || left <= 0) return null;

  const promoLabel = formatFreeTime(offer.promo.durationHours);
  const standardLabel = formatFreeTime(offer.standardDurationHours);
  const endsLabel = new Date(endsMs).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`vixy_tag_promo_dismissed_${offer.promo.endsAt}`, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {!dismissed && (
        <div
          role="region"
          aria-label="Discord server tag launch offer"
          className="relative z-[55] w-full bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 text-white border-b border-indigo-300/30"
        >
          <div className="max-w-7xl mx-auto pl-3 pr-9 sm:px-10 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center font-mono">
            <span className="px-2 py-0.5 rounded bg-white/15 text-[10px] font-black uppercase tracking-wider">
              Tonight only
            </span>
            <span className="text-[12px] sm:text-[13px] font-bold">
              Wear the VIXY tag in our Discord and get {promoLabel} free
            </span>
            <span className="text-[11px] text-indigo-100/90 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Ends {endsLabel} ({formatTimeLeft(left)} left). After that the tag unlocks {standardLabel}.
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="px-3 py-1 rounded-lg bg-white text-indigo-800 text-[11px] font-black uppercase tracking-wide hover:bg-indigo-50 cursor-pointer flex items-center gap-1.5"
            >
              <Tag className="w-3.5 h-3.5" />
              Claim {promoLabel}
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-indigo-100/80 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
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
              className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-[#0a0620] border border-indigo-400/40 text-indigo-200 hover:text-white cursor-pointer"
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
