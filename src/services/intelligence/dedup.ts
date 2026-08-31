/**
 * Delivery deduplication for VIXY Live Intelligence.
 *
 * The same real-world event routinely arrives more than once: three outlets
 * publish the same story, a cron overlaps itself, or a serverless instance
 * retries. Without a claim step each of those becomes a duplicate Discord post.
 *
 * This mirrors the pattern already proven in production for 15M signals
 * (shouldBroadcastCycle + claimBroadcastAtomically + markBroadcastOutcome),
 * generalized so any intelligence type can reuse it.
 *
 * The store is an interface so the engine can run against Firestore in
 * production and an in-memory implementation in tests, with identical logic.
 */

/** Canonical dedup key builders. Keys must be stable across restarts. */
export const dedupKeys = {
  /** News is identified by its canonical URL, not its headline (titles vary). */
  news: (canonicalUrl: string): string => `news:${normalizeUrl(canonicalUrl)}`,
  /** A blockchain event is globally unique by chain + transaction hash. */
  blockchain: (chain: string, txHash: string): string =>
    `chain:${chain.toLowerCase()}:${txHash.toLowerCase()}`,
  /** Order flow is bucketed per minute so a 1-min cadence emits at most one. */
  orderFlow: (symbol: string, epochMs: number): string =>
    `flow:${symbol.toUpperCase()}:${Math.floor(epochMs / 60_000)}`,
  /** One hourly digest per UTC hour. */
  hourly: (epochMs: number): string => `hourly:${Math.floor(epochMs / 3_600_000)}`,
  /** Protection posts only on transition, so the key encodes the transition. */
  protection: (fromState: string, toState: string, cycleId: string): string =>
    `protect:${cycleId}:${fromState}->${toState}`,
  /** Existing verified signal pattern -- preserved exactly. */
  signal: (cycleId: string, tier: 'FREE' | 'ELITE'): string => `${cycleId}#${tier}`,
};

/**
 * Strip tracking noise so the same article shared with different UTM params
 * resolves to one key.
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const drop = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'];
    drop.forEach((p) => url.searchParams.delete(p));
    url.hash = '';
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.hostname.replace(/^www\./, '')}${path}${url.search}`.toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/** Backing store for claims. Firestore in prod, in-memory in tests. */
export interface DedupStore {
  /**
   * Atomically claim a key. Returns true only for the caller that won the
   * claim; every subsequent caller for the same key gets false.
   */
  claim(key: string, ttlMs: number, now: number): Promise<boolean>;
}

/**
 * In-memory store. Correct for a single process and for tests; NOT sufficient
 * across serverless instances -- production must back this with Firestore.
 */
export class InMemoryDedupStore implements DedupStore {
  private claims = new Map<string, number>();

  async claim(key: string, ttlMs: number, now: number): Promise<boolean> {
    const expiresAt = this.claims.get(key);
    if (expiresAt !== undefined && expiresAt > now) {
      return false;
    }
    this.claims.set(key, now + ttlMs);
    this.evictExpired(now);
    return true;
  }

  /** Keeps the map bounded so a long-lived process cannot leak memory. */
  private evictExpired(now: number): void {
    for (const [key, expiresAt] of this.claims) {
      if (expiresAt <= now) this.claims.delete(key);
    }
  }

  /** Test helper. */
  size(): number {
    return this.claims.size;
  }
}

/** Default claim lifetimes, tuned to how long a duplicate could plausibly arrive. */
export const DEDUP_TTL_MS = {
  NEWS: 24 * 60 * 60 * 1000,
  BLOCKCHAIN: 24 * 60 * 60 * 1000,
  ORDER_FLOW: 5 * 60 * 1000,
  HOURLY: 2 * 60 * 60 * 1000,
  PROTECTION: 60 * 60 * 1000,
  SIGNAL: 60 * 60 * 1000,
} as const;
