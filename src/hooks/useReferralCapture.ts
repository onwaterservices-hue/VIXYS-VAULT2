import { useEffect } from "react";

/**
 * VIXY VAULT - referral capture
 *
 * A visitor lands on /?ref=VIXY2026 signed out, so there is nobody to attach
 * the referral to yet. This stores the code, strips it from the address bar,
 * and posts it once as soon as an authenticated session exists.
 *
 * localStorage rather than sessionStorage on purpose: signup bounces through
 * Stripe and email, which can land the user in a new tab. Expires after 30
 * days so a stale code cannot attach itself to an unrelated signup later.
 */

const KEY = "vixy.referral.pending";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_RE = /^[A-Z0-9]{4,16}$/;

interface Pending { code: string; seenAt: number }

function readPending(): Pending | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pending;
    if (!p?.code || !CODE_RE.test(p.code)) return null;
    if (!p.seenAt || Date.now() - p.seenAt > MAX_AGE_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch { return null; }
}

export function captureReferralFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ref") || params.get("referral");
    if (!raw) return null;
    const code = raw.trim().toUpperCase();
    if (!CODE_RE.test(code)) return null;
    // First code wins: arriving via one friend's link and later clicking
    // another must not silently reassign the credit.
    if (!readPending()) {
      window.localStorage.setItem(KEY, JSON.stringify({ code, seenAt: Date.now() }));
    }
    params.delete("ref");
    params.delete("referral");
    const q = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (q ? "?" + q : "") + window.location.hash);
    return code;
  } catch { return null; }
}

export function useReferralCapture(userEmail: string | null | undefined): void {
  useEffect(() => { captureReferralFromUrl(); }, []);

  useEffect(() => {
    if (!userEmail) return;
    const pending = readPending();
    if (!pending) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/referral/attach", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: pending.code }),
        });
        if (cancelled) return;
        // Clear on success and on any definitive 4xx rejection. Only a
        // transient 5xx keeps it queued for the next mount.
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          window.localStorage.removeItem(KEY);
        }
      } catch { /* offline - leave it queued */ }
    })();
    return () => { cancelled = true; };
  }, [userEmail]);
}

export default useReferralCapture;
