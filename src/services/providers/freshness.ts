/**
 * Freshness classification for VIXY Live Intelligence.
 *
 * A number is only worth showing if we know how old it is. These helpers turn
 * a pair of timestamps into an explicit Freshness state, and decide whether an
 * observation is allowed to be delivered at all.
 *
 * Deliberately pure: the clock is injected, so behavior is deterministic and
 * fully testable without mocking global time.
 */

import type { Freshness, LiveObservation, ObservationKind } from './types';
import { FRESHNESS_POLICY_MS } from './types';

/**
 * Classify how fresh an observation is for its kind.
 *
 * A future-dated sourceTimestamp (clock skew between us and a provider) is
 * treated as age 0 rather than negative, so mild skew never inflates freshness
 * into a false LIVE on genuinely old data.
 */
export function classifyFreshness(
  kind: ObservationKind,
  sourceTimestamp: number,
  now: number,
): Freshness {
  if (!Number.isFinite(sourceTimestamp) || sourceTimestamp <= 0) {
    return 'UNAVAILABLE';
  }
  const policy = FRESHNESS_POLICY_MS[kind];
  if (!policy) return 'UNAVAILABLE';

  const ageMs = Math.max(0, now - sourceTimestamp);
  if (ageMs <= policy.live) return 'LIVE';
  if (ageMs <= policy.degraded) return 'DEGRADED';
  return 'STALE';
}

/**
 * Whether an observation may be sent to Discord.
 *
 * LIVE and DEGRADED are deliverable (DEGRADED should be labeled as such in the
 * embed). STALE and UNAVAILABLE are never deliverable -- we stay silent instead
 * of publishing something we cannot stand behind.
 */
export function isDeliverable(freshness: Freshness): boolean {
  return freshness === 'LIVE' || freshness === 'DEGRADED';
}

/** Human-readable age, e.g. "4s ago" / "12m ago". For embed footers. */
export function formatAge(sourceTimestamp: number, now: number): string {
  if (!Number.isFinite(sourceTimestamp) || sourceTimestamp <= 0) return 'unknown';
  const seconds = Math.max(0, Math.floor((now - sourceTimestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Recompute freshness on an existing observation.
 * Freshness decays with time, so it must be evaluated at delivery, not only at
 * fetch -- an observation that sat in a queue can no longer claim to be LIVE.
 */
export function withCurrentFreshness<T>(
  observation: LiveObservation<T>,
  now: number,
): LiveObservation<T> {
  return {
    ...observation,
    freshness: classifyFreshness(observation.kind, observation.sourceTimestamp, now),
  };
}
