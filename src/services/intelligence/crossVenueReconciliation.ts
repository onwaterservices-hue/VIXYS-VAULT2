/**
 * VIXY VAULT — Cross-Venue Reconciliation & Quality Weighting Engine (Step 3 & 4)
 * Cross-references Kalshi and Polymarket independently.
 * Evaluates agreement, disagreement penalty, weighted consensus probability, and arbitrage/divergence spread.
 */

import { NormalizedVenueContract } from '../market/venueAdapters';

export interface CrossVenueReconciliationResult {
  asset: string;
  venues: NormalizedVenueContract[];
  primaryVenue: 'Kalshi' | 'Polymarket';
  kalshiProbability: number;
  polymarketProbability: number;
  crossVenueSpreadPct: number; // e.g. 3.2%
  consensusDirection: 'UP' | 'DOWN' | 'CONFLICTED';
  consensusStrength: 'HIGH' | 'MODERATE' | 'CONFLICTED' | 'DIVERGENT';
  agreementScorePct: number; // 0 to 100
  severeDisagreementDetected: boolean;
  disagreementReason: string | null;
  qualityWeightedProbability: number;
  venueQualityWeights: Record<string, number>;
  arbitrageSpreadBps: number;
  reconciliationStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'DISAGREEMENT_WARNING' | 'PROTECTION_REQUIRED';
}

export function reconcileVenues(
  venues: NormalizedVenueContract[],
  asset: string = 'BTC'
): CrossVenueReconciliationResult {
  const kalshi = venues.find(v => v.venue === 'Kalshi');
  const poly = venues.find(v => v.venue === 'Polymarket');

  const kalshiProb = kalshi?.impliedProbability ?? 0.52;
  const polyProb = poly?.impliedProbability ?? 0.52;

  const spreadDiff = Math.abs(kalshiProb - polyProb);
  const crossVenueSpreadPct = Math.round(spreadDiff * 1000) / 10;
  const arbitrageSpreadBps = Math.round(spreadDiff * 10000);

  // Quality Weighting
  const kalshiQuality = kalshi?.qualityScore ?? 90;
  const polyQuality = poly?.qualityScore ?? 85;
  const totalQuality = kalshiQuality + polyQuality;
  const kalshiWeight = totalQuality > 0 ? kalshiQuality / totalQuality : 0.5;
  const polyWeight = totalQuality > 0 ? polyQuality / totalQuality : 0.5;

  const qualityWeightedProbability = Math.round(
    (kalshiProb * kalshiWeight + polyProb * polyWeight) * 1000
  ) / 1000;

  // Consensus Evaluation
  const kalshiLean = kalshiProb >= 0.53 ? 'UP' : kalshiProb <= 0.47 ? 'DOWN' : 'NEUTRAL';
  const polyLean = polyProb >= 0.53 ? 'UP' : polyProb <= 0.47 ? 'DOWN' : 'NEUTRAL';

  let consensusDirection: 'UP' | 'DOWN' | 'CONFLICTED' = 'CONFLICTED';
  let severeDisagreementDetected = false;
  let disagreementReason: string | null = null;

  if (kalshiLean === 'UP' && polyLean === 'UP') {
    consensusDirection = 'UP';
  } else if (kalshiLean === 'DOWN' && polyLean === 'DOWN') {
    consensusDirection = 'DOWN';
  } else if ((kalshiLean === 'UP' && polyLean === 'DOWN') || (kalshiLean === 'DOWN' && polyLean === 'UP')) {
    consensusDirection = 'CONFLICTED';
    severeDisagreementDetected = true;
    disagreementReason = `Severe Cross-Venue Disagreement: Kalshi implied ${Math.round(kalshiProb * 100)}% (${kalshiLean}) vs Polymarket ${Math.round(polyProb * 100)}% (${polyLean})`;
  } else {
    // One is neutral or within 48-52%
    consensusDirection = kalshiLean !== 'NEUTRAL' ? kalshiLean : polyLean !== 'NEUTRAL' ? polyLean : 'CONFLICTED';
  }

  // Agreement Score (100% minus spread penalty)
  let agreementScorePct = Math.max(0, Math.round(100 - (crossVenueSpreadPct * 6)));
  if (severeDisagreementDetected) {
    agreementScorePct = Math.min(35, agreementScorePct);
  }

  let consensusStrength: 'HIGH' | 'MODERATE' | 'CONFLICTED' | 'DIVERGENT' = 'HIGH';
  if (severeDisagreementDetected) {
    consensusStrength = 'CONFLICTED';
  } else if (crossVenueSpreadPct > 6.0) {
    consensusStrength = 'DIVERGENT';
  } else if (crossVenueSpreadPct > 3.0 || consensusDirection === 'CONFLICTED') {
    consensusStrength = 'MODERATE';
  }

  let reconciliationStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'DISAGREEMENT_WARNING' | 'PROTECTION_REQUIRED' = 'OPTIMAL';
  if (severeDisagreementDetected) {
    reconciliationStatus = 'PROTECTION_REQUIRED';
  } else if (crossVenueSpreadPct > 5.0) {
    reconciliationStatus = 'DISAGREEMENT_WARNING';
  } else if (crossVenueSpreadPct > 2.5) {
    reconciliationStatus = 'ACCEPTABLE';
  }

  return {
    asset: asset.toUpperCase(),
    venues,
    primaryVenue: 'Kalshi',
    kalshiProbability: kalshiProb,
    polymarketProbability: polyProb,
    crossVenueSpreadPct,
    consensusDirection,
    consensusStrength,
    agreementScorePct,
    severeDisagreementDetected,
    disagreementReason,
    qualityWeightedProbability,
    venueQualityWeights: {
      Kalshi: Math.round(kalshiWeight * 100) / 100,
      Polymarket: Math.round(polyWeight * 100) / 100,
    },
    arbitrageSpreadBps,
    reconciliationStatus,
  };
}
