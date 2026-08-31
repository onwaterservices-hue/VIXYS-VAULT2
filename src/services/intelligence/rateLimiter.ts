/**
 * Discord delivery rate limiting for VIXY Live Intelligence.
 *
 * Deduplication stops the SAME event being posted twice. Rate limiting stops
 * many DIFFERENT legitimate events from flooding a channel -- e.g. a volatile
 * hour where twenty real articles publish in ten minutes.
 *
 * Implemented as a per-channel sliding window with an injected clock so the
 * behavior is deterministic under test. Intentionally has no I/O: callers
 * decide whether to back it with a shared store for cross-instance limits.
 */

/** Channels the intelligence network can post to. */
export type IntelligenceChannel =
  | 'BOT_SIGNALS'
  | 'PREMIUM_SIGNALS'
  | 'FLOW_FORGE'
  | 'BREAKING_NEWS'
  | 'WHALE_TRACKER'
  | 'VIXY_PROTECTION'
  | 'AI_TERMINAL'
  | 'HOURLY_MARKET';

export interface RateLimitRule {
  /** Maximum messages allowed within the window. */
  maxEvents: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * Conservative starting limits. These are deliberately strict: it is far easier
 * to relax a limit after observing real volume than to apologize for spam.
 *
 * Signal channels are governed by the canonical 15M cycle (max one lock per
 * 15 minutes per tier) and are additionally protected by per-tier dedup keys.
 */
export const RATE_LIMITS: Record<IntelligenceChannel, RateLimitRule> = {
  BOT_SIGNALS:      { maxEvents: 2, windowMs: 15 * 60 * 1000 },
  PREMIUM_SIGNALS:  { maxEvents: 2, windowMs: 15 * 60 * 1000 },
  FLOW_FORGE:       { maxEvents: 1, windowMs: 5 * 60 * 1000 },
  BREAKING_NEWS:    { maxEvents: 1, windowMs: 5 * 60 * 1000 },
  WHALE_TRACKER:    { maxEvents: 4, windowMs: 15 * 60 * 1000 },
  VIXY_PROTECTION:  { maxEvents: 3, windowMs: 15 * 60 * 1000 },
  AI_TERMINAL:      { maxEvents: 2, windowMs: 15 * 60 * 1000 },
  HOURLY_MARKET:    { maxEvents: 1, windowMs: 60 * 60 * 1000 },
};

export interface RateLimitDecision {
  allowed: boolean;
  /** Messages still available in the current window. */
  remaining: number;
  /** When the window frees up, if currently blocked. */
  retryAtMs?: number;
}

/**
 * Sliding-window limiter.
 *
 * consume() both checks and records in one call, so a caller cannot
 * accidentally check without recording and bypass the limit.
 */
export class RateLimiter {
  private events = new Map<IntelligenceChannel, number[]>();

  constructor(private readonly rules: Record<IntelligenceChannel, RateLimitRule> = RATE_LIMITS) {}

  consume(channel: IntelligenceChannel, now: number): RateLimitDecision {
    const rule = this.rules[channel];
    if (!rule) return { allowed: true, remaining: Number.POSITIVE_INFINITY };

    const cutoff = now - rule.windowMs;
    const recent = (this.events.get(channel) ?? []).filter((ts) => ts > cutoff);

    if (recent.length >= rule.maxEvents) {
      this.events.set(channel, recent);
      const oldest = recent[0];
      return { allowed: false, remaining: 0, retryAtMs: oldest + rule.windowMs };
    }

    recent.push(now);
    this.events.set(channel, recent);
    return { allowed: true, remaining: rule.maxEvents - recent.length };
  }

  /** Non-mutating inspection, for health/telemetry reporting. */
  peek(channel: IntelligenceChannel, now: number): number {
    const rule = this.rules[channel];
    if (!rule) return Number.POSITIVE_INFINITY;
    const cutoff = now - rule.windowMs;
    const recent = (this.events.get(channel) ?? []).filter((ts) => ts > cutoff);
    return Math.max(0, rule.maxEvents - recent.length);
  }

  /** Test helper. */
  reset(): void {
    this.events.clear();
  }
}
