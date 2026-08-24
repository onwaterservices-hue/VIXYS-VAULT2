/**
 * VIXY VAULT — Feature Engine & Market Regime Detection (Step 5 & 6)
 * Generates unified feature vectors combining underlying BTC state, cross-venue odds,
 * strike-to-spot distance, and micro-structure indicators.
 * Classifies regime into institutional categories.
 */

import { UnderlyingAssetMetrics } from '../market/assetIntelligence';
import { CrossVenueReconciliationResult } from './crossVenueReconciliation';

export type MarketRegimeType =
  | 'TRENDING_BULL'
  | 'TRENDING_BEAR'
  | 'RANGING'
  | 'HIGH_VOLATILITY'
  | 'LOW_VOLATILITY'
  | 'BREAKOUT'
  | 'BREAKDOWN'
  | 'MEAN_REVERSION'
  | 'LIQUIDITY_SHOCK'
  | 'UNCERTAIN';

export interface UnifiedFeatureVector {
  timestamp: number;
  asset: string;
  spotPrice: number;
  strikePrice: number;
  strikeDistanceUSD: number;
  strikeDistancePct: number;
  timeRemainingSec: number;
  
  // Normalized features (-1.0 to +1.0 or 0 to 1.0)
  momentumScore: number;
  orderFlowImbalance: number;
  volatilityNormalized: number;
  crossVenueConsensusBias: number;
  vwapDisplacement: number;
  absorptionRisk: number;
  dataQualityScore: number;

  regime: MarketRegimeType;
  regimeConfidence: number; // 0 - 100
  regimeDescription: string;
  isChoppy: boolean;
  chopReason: string | null;
}

export function extractFeaturesAndDetectRegime(
  underlying: UnderlyingAssetMetrics,
  crossVenue: CrossVenueReconciliationResult,
  strikePrice: number,
  expiryTs: number,
  now: number = Date.now()
): UnifiedFeatureVector {
  const spot = underlying.spotPrice;
  const strike = strikePrice > 0 ? strikePrice : spot;
  const strikeDistanceUSD = Math.round((spot - strike) * 100) / 100;
  const strikeDistancePct = strike > 0 ? Math.round((strikeDistanceUSD / strike) * 10000) / 100 : 0;
  const timeRemainingSec = Math.max(0, Math.floor((expiryTs - now) / 1000));

  // Normalized Momentum (-1.0 to +1.0)
  const momDir = underlying.momentum.directionalBias === 'BULLISH' ? 1 : underlying.momentum.directionalBias === 'BEARISH' ? -1 : 0;
  const momentumScore = Math.min(1.0, Math.max(-1.0, (underlying.momentum.tf1m * 2 + underlying.momentum.tf5m * 1.5) * 0.1 * momDir));

  // Order Flow Imbalance (-1.0 to +1.0)
  const orderFlowImbalance = Math.min(1.0, Math.max(-1.0, (underlying.orderFlow.bullVolumePct - 50) / 50));

  // Volatility Normalized (0.0 to 1.0)
  const volatilityNormalized = Math.min(1.0, underlying.volatility.realizedVol15mPct / 4.0);

  // Cross Venue Consensus Bias (-1.0 to +1.0)
  const consensusDir = crossVenue.consensusDirection === 'UP' ? 1 : crossVenue.consensusDirection === 'DOWN' ? -1 : 0;
  const crossVenueConsensusBias = Math.min(1.0, Math.max(-1.0, (crossVenue.qualityWeightedProbability - 0.5) * 2));

  // VWAP displacement
  const vwapDisplacement = Math.min(1.0, Math.max(-1.0, underlying.vwapDistancePct * 0.5));

  // Absorption Risk (0 to 1.0)
  const absorptionRisk = underlying.orderFlow.flowState === 'ABSORPTION' ? 0.8 : 0.15;

  // Data Quality Score (0 to 100)
  const dataQualityScore = underlying.feedHealth.status === 'OPTIMAL' ? 98 : underlying.feedHealth.status === 'DEGRADED' ? 75 : 40;

  // REGIME CLASSIFICATION LOGIC
  let regime: MarketRegimeType = 'RANGING';
  let regimeConfidence = 75;
  let regimeDescription = 'Price consolidating within standard intraday band';
  let isChoppy = false;
  let chopReason: string | null = null;

  const momAlign = underlying.momentum.alignmentScore;
  const isExtremeVol = underlying.volatility.regime === 'EXTREME';
  const isCompressedVol = underlying.volatility.regime === 'COMPRESSED';

  if (underlying.microstructure.suddenDrainDetected) {
    regime = 'LIQUIDITY_SHOCK';
    regimeConfidence = 92;
    regimeDescription = 'Sudden liquidity withdrawal detected across orderbook depth';
    isChoppy = true;
    chopReason = 'Microstructure liquidity shock / unstable spread';
  } else if (isExtremeVol && Math.abs(strikeDistancePct) > 0.4) {
    regime = 'HIGH_VOLATILITY';
    regimeConfidence = 88;
    regimeDescription = 'Wide volatility expansion with elevated directional variance';
  } else if (momAlign >= 80 && underlying.momentum.directionalBias === 'BULLISH' && orderFlowImbalance > 0.25) {
    if (strikeDistancePct > 0.3 && underlying.momentum.acceleration === 'ACCELERATING') {
      regime = 'BREAKOUT';
      regimeDescription = 'Aggressive upward structural breakout with volume expansion';
    } else {
      regime = 'TRENDING_BULL';
      regimeDescription = 'Sustained bullish impulse with buyer delta confluence';
    }
    regimeConfidence = 91;
  } else if (momAlign >= 80 && underlying.momentum.directionalBias === 'BEARISH' && orderFlowImbalance < -0.25) {
    if (strikeDistancePct < -0.3 && underlying.momentum.acceleration === 'ACCELERATING') {
      regime = 'BREAKDOWN';
      regimeDescription = 'Aggressive downward structural breakdown with seller dominance';
    } else {
      regime = 'TRENDING_BEAR';
      regimeDescription = 'Sustained bearish impulse with heavy sell delta';
    }
    regimeConfidence = 91;
  } else if (Math.abs(vwapDisplacement) > 0.6 && underlying.momentum.acceleration === 'REVERSING') {
    regime = 'MEAN_REVERSION';
    regimeConfidence = 82;
    regimeDescription = 'Extended displacement from VWAP showing early mean-reversion signals';
  } else if (isCompressedVol && Math.abs(strikeDistancePct) < 0.05) {
    regime = 'LOW_VOLATILITY';
    regimeConfidence = 85;
    regimeDescription = 'Compressed trading range / tight order book balance';
    isChoppy = true;
    chopReason = 'Sub-threshold volatility compression at strike';
  } else if (momAlign <= 40 && Math.abs(orderFlowImbalance) < 0.15) {
    regime = 'RANGING';
    regimeConfidence = 78;
    regimeDescription = 'Conflicted timeframe momentum with balanced order flow';
    isChoppy = true;
    chopReason = 'Multi-timeframe momentum conflict with no directional dominance';
  }

  return {
    timestamp: now,
    asset: underlying.asset,
    spotPrice: spot,
    strikePrice: strike,
    strikeDistanceUSD,
    strikeDistancePct,
    timeRemainingSec,
    momentumScore,
    orderFlowImbalance,
    volatilityNormalized,
    crossVenueConsensusBias,
    vwapDisplacement,
    absorptionRisk,
    dataQualityScore,
    regime,
    regimeConfidence,
    regimeDescription,
    isChoppy,
    chopReason,
  };
}
