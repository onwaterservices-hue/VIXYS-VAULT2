import { describe, it, expect } from 'vitest';
import { classifyFreshness, isDeliverable, formatAge, withCurrentFreshness } from '../src/services/providers/freshness';
import type { LiveObservation } from '../src/services/providers/types';
import { dedupKeys, normalizeUrl, InMemoryDedupStore, DEDUP_TTL_MS } from '../src/services/intelligence/dedup';
import { RateLimiter, RATE_LIMITS } from '../src/services/intelligence/rateLimiter';

const T0 = 1_700_000_000_000;

describe('freshness', () => {
  it('classifies market data by age', () => {
    expect(classifyFreshness('MARKET', T0, T0)).toBe('LIVE');
    expect(classifyFreshness('MARKET', T0 - 9_000, T0)).toBe('LIVE');
    expect(classifyFreshness('MARKET', T0 - 20_000, T0)).toBe('DEGRADED');
    expect(classifyFreshness('MARKET', T0 - 60_000, T0)).toBe('STALE');
  });

  it('treats a missing or invalid timestamp as UNAVAILABLE', () => {
    expect(classifyFreshness('MARKET', 0, T0)).toBe('UNAVAILABLE');
    expect(classifyFreshness('MARKET', Number.NaN, T0)).toBe('UNAVAILABLE');
  });

  it('does not let provider clock skew inflate freshness', () => {
    // A future-dated source timestamp must not be treated as negative age.
    expect(classifyFreshness('MARKET', T0 + 5_000, T0)).toBe('LIVE');
  });

  it('allows news to remain valid far longer than market ticks', () => {
    expect(classifyFreshness('NEWS', T0 - 10 * 60 * 1000, T0)).toBe('LIVE');
    expect(classifyFreshness('MARKET', T0 - 10 * 60 * 1000, T0)).toBe('STALE');
  });

  it('only delivers LIVE and DEGRADED', () => {
    expect(isDeliverable('LIVE')).toBe(true);
    expect(isDeliverable('DEGRADED')).toBe(true);
    expect(isDeliverable('STALE')).toBe(false);
    expect(isDeliverable('UNAVAILABLE')).toBe(false);
  });

  it('recomputes freshness at delivery time, not fetch time', () => {
    const obs: LiveObservation<{ price: number }> = {
      kind: 'MARKET', source: 'BINANCE', sourceTimestamp: T0, fetchedAt: T0,
      freshness: 'LIVE', dedupKey: 'k', payload: { price: 1 },
    };
    // Same observation, evaluated a minute later, must no longer claim LIVE.
    expect(withCurrentFreshness(obs, T0 + 60_000).freshness).toBe('STALE');
  });

  it('formats age readably', () => {
    expect(formatAge(T0 - 5_000, T0)).toBe('5s ago');
    expect(formatAge(T0 - 120_000, T0)).toBe('2m ago');
    expect(formatAge(T0 - 7_200_000, T0)).toBe('2h ago');
  });
});

describe('dedup', () => {
  it('builds stable keys per event type', () => {
    expect(dedupKeys.blockchain('BTC', '0xABC')).toBe('chain:btc:0xabc');
    expect(dedupKeys.signal('15M-2026-01-01T00:00:00.000Z', 'FREE')).toBe('15M-2026-01-01T00:00:00.000Z#FREE');
    expect(dedupKeys.signal('15M-2026-01-01T00:00:00.000Z', 'ELITE')).toBe('15M-2026-01-01T00:00:00.000Z#ELITE');
  });

  it('buckets order flow per minute', () => {
    // Anchor to a minute boundary: T0 itself is 20s into its minute, so
    // T0 + 59s would legitimately land in the next bucket.
    const minuteStart = Math.floor(T0 / 60_000) * 60_000;
    expect(dedupKeys.orderFlow('btcusdt', minuteStart)).toBe(dedupKeys.orderFlow('BTCUSDT', minuteStart + 59_000));
    expect(dedupKeys.orderFlow('BTCUSDT', minuteStart)).not.toBe(dedupKeys.orderFlow('BTCUSDT', minuteStart + 60_000));
  });

  it('normalizes tracking params so one article is one key', () => {
    const a = normalizeUrl('https://www.coindesk.com/markets/story?utm_source=twitter');
    const b = normalizeUrl('https://coindesk.com/markets/story/');
    expect(a).toBe(b);
  });

  it('claims once and suppresses duplicates', async () => {
    const store = new InMemoryDedupStore();
    expect(await store.claim('news:x', DEDUP_TTL_MS.NEWS, T0)).toBe(true);
    expect(await store.claim('news:x', DEDUP_TTL_MS.NEWS, T0 + 1000)).toBe(false);
    expect(await store.claim('news:y', DEDUP_TTL_MS.NEWS, T0 + 1000)).toBe(true);
  });

  it('allows reclaiming after the TTL expires', async () => {
    const store = new InMemoryDedupStore();
    await store.claim('flow:k', DEDUP_TTL_MS.ORDER_FLOW, T0);
    expect(await store.claim('flow:k', DEDUP_TTL_MS.ORDER_FLOW, T0 + DEDUP_TTL_MS.ORDER_FLOW + 1)).toBe(true);
  });
});

describe('rate limiter', () => {
  it('allows up to the limit then blocks', () => {
    const rl = new RateLimiter();
    const max = RATE_LIMITS.BREAKING_NEWS.maxEvents;
    for (let i = 0; i < max; i++) {
      expect(rl.consume('BREAKING_NEWS', T0).allowed).toBe(true);
    }
    const blocked = rl.consume('BREAKING_NEWS', T0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAtMs).toBeGreaterThan(T0);
  });

  it('recovers once the window slides past', () => {
    const rl = new RateLimiter();
    rl.consume('BREAKING_NEWS', T0);
    const after = T0 + RATE_LIMITS.BREAKING_NEWS.windowMs + 1;
    expect(rl.consume('BREAKING_NEWS', after).allowed).toBe(true);
  });

  it('limits each channel independently', () => {
    const rl = new RateLimiter();
    rl.consume('FLOW_FORGE', T0);
    expect(rl.consume('FLOW_FORGE', T0).allowed).toBe(false);
    // A saturated channel must not starve an unrelated one.
    expect(rl.consume('HOURLY_MARKET', T0).allowed).toBe(true);
  });

  it('peek does not consume budget', () => {
    const rl = new RateLimiter();
    const before = rl.peek('WHALE_TRACKER', T0);
    rl.peek('WHALE_TRACKER', T0);
    expect(rl.peek('WHALE_TRACKER', T0)).toBe(before);
  });
});
