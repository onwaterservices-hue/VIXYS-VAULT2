/**
 * VIXY Live Intelligence — shared provider contracts.
 *
 * Every external data source (market, order flow, news, blockchain, macro)
 * normalizes into the same shape so downstream code -- dedup, rate limiting,
 * tier filtering, embeds -- never has to know which vendor produced a value.
 *
 * Design rules enforced by these types:
 *  1. A value is never presented without its source and timestamps.
 *  2. "Unavailable" is a first-class state, not an excuse to substitute data.
 *  3. Providers return data; they never format Discord messages.
 *
 * This module is pure types + constants. It imports nothing and has no
 * runtime side effects, so it is safe to load anywhere (server, tests).
 */

/** Where an observation came from. Displayed to users for auditability. */
export type ProviderSource =
  | 'BINANCE'
  | 'COINBASE'
  | 'KALSHI'
  | 'VIXY_ENGINE'
  | 'COINDESK'
  | 'COINTELEGRAPH'
  | 'DECRYPT'
  | 'FEDERAL_RESERVE'
  | 'SEC_EDGAR'
  | 'MEMPOOL_SPACE'
  | 'BLOCKCHAIR'
  | 'ETHERSCAN';

/**
 * How trustworthy the timing of an observation is.
 * STALE and UNAVAILABLE must suppress delivery -- never relabel as LIVE.
 */
export type Freshness = 'LIVE' | 'DEGRADED' | 'STALE' | 'UNAVAILABLE';

/** Operational state of a provider, surfaced in health reporting. */
export type ProviderStatus = 'OK' | 'DEGRADED' | 'UNAVAILABLE';

/** Categories of intelligence the network can emit. */
export type ObservationKind =
  | 'MARKET'
  | 'ORDER_FLOW'
  | 'NEWS'
  | 'BLOCKCHAIN'
  | 'MACRO'
  | 'PROTECTION'
  | 'TELEMETRY';

/**
 * A single normalized fact from a provider.
 *
 * sourceTimestamp = when the event happened / the source published it.
 * fetchedAt       = when VIXY retrieved it.
 * Both are required: freshness is meaningless without the pair.
 */
export interface LiveObservation<TPayload = unknown> {
  kind: ObservationKind;
  source: ProviderSource;
  /** Epoch ms as reported by the source. */
  sourceTimestamp: number;
  /** Epoch ms when VIXY fetched it. */
  fetchedAt: number;
  freshness: Freshness;
  /** Stable identity used to suppress duplicate delivery. */
  dedupKey: string;
  /** Normalized, provider-agnostic data. */
  payload: TPayload;
  /** Optional link back to the origin (article URL, tx explorer, etc). */
  sourceUrl?: string;
}

/**
 * Result envelope returned by every provider call.
 *
 * A failed fetch returns ok:false with an error -- it never throws a fabricated
 * observation, and never returns a stale payload dressed up as fresh.
 */
export type ProviderResult<T> =
  | { ok: true; status: ProviderStatus; observations: LiveObservation<T>[]; latencyMs: number }
  | { ok: false; status: 'UNAVAILABLE'; error: string; latencyMs: number };

/** Common interface so providers can be swapped without touching consumers. */
export interface IntelligenceProvider<T> {
  readonly name: string;
  readonly source: ProviderSource;
  fetch(): Promise<ProviderResult<T>>;
}

/**
 * Freshness thresholds in milliseconds, per observation kind.
 * Values reflect how fast each data class actually changes -- market ticks are
 * meaningless after seconds; a news article is still valid minutes later.
 */
export const FRESHNESS_POLICY_MS: Record<
  ObservationKind,
  { live: number; degraded: number }
> = {
  MARKET:      { live: 10_000,  degraded: 30_000 },
  ORDER_FLOW:  { live: 90_000,  degraded: 180_000 },
  NEWS:        { live: 900_000, degraded: 3_600_000 },
  BLOCKCHAIN:  { live: 300_000, degraded: 900_000 },
  MACRO:       { live: 900_000, degraded: 3_600_000 },
  PROTECTION:  { live: 30_000,  degraded: 90_000 },
  TELEMETRY:   { live: 30_000,  degraded: 90_000 },
};
