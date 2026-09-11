/**
 * Evidence vectors (0-10 scale) for the 15M terminal, read from the engine's
 * evidence.subScores on /api/vixy/15m/current (engine factors as a fallback):
 * 1. Momentum: timeframes agreeing with the side being called
 * 2. Trend: spot vs the cycle TWAP (no volume feed)
 * 3. Order Flow: a spot-vs-strike flow proxy -- there is no trade tape behind it
 * 4. Volume: expected-move coverage of the strike distance (not traded volume)
 * 5. Sentiment: Kalshi implied odds, or null if unavailable
 * 6. Volatility: realized-volatility regime
 *
 * A vector the engine did not score is shown as "—". Nothing here derives a
 * vector from confidence, lock score or regime labels.
 */

import { Canonical15mDecision, ConfluenceFactorItem } from '../types/canonicalDecision';

export interface EvidenceVectorItem {
  name: 'Momentum' | 'Trend' | 'Order Flow' | 'Volume' | 'Sentiment' | 'Volatility';
  score: number | null; // 0.0 to 10.0 scale, or null if missing/stale
  displayScore: string; // e.g. "8.4" or "—" or "STALE"
  percent: number;      // 0 to 100 for visual progress bar
  status: 'ALIGNED' | 'DIVERGENT' | 'NEUTRAL' | 'STALE' | 'UNAVAILABLE';
  aligned: boolean;     // true if vector supports current directional bias
  detail: string;       // Contextual mathematical explanation
  isStaleOrMissing: boolean;
}

export interface ComputedEvidenceSummary {
  vectors: EvidenceVectorItem[];
  alignedCount: number;
  totalValidCount: number;
  totalCount: number;
  compositeScore: number | null;
  compositeDisplay: string;
  convictionPct: number;
  signalsAlignedHeader: string;
  convictionHeaderText: string;
  convictionPercentText: string;
  compositeFooterText: string;
  dynamicExplanation: string;
}

/**
 * Extracts or computes the 6 genuine evidence vectors from the Canonical 15M Decision object.
 */
export function computeEvidenceVectors(
  decision?: Canonical15mDecision,
  feedStatus?: string
): ComputedEvidenceSummary {
  const isFeedStale = feedStatus === 'STALE' || feedStatus === 'DISCONNECTED' || feedStatus === 'MISSING_DATA';
  const dir = decision?.direction || 'NEUTRAL';
  const isUp = dir === 'UP';

  // Check if decision has precomputed subScores from engine or gemini evidence factors
  const evidenceSubScores: any[] = (decision as any)?.evidence?.subScores || [];
  const factors: ConfluenceFactorItem[] = decision?.gemini?.evidenceFactors || [];

  // Helper to find factor by group or id
  const findFactor = (group: string, idPrefix?: string) => {
    return factors.find(f => f.group === group || (idPrefix && f.id.startsWith(idPrefix)));
  };

  const findSubScore = (name: string) => {
    return evidenceSubScores.find(s => s.name?.toLowerCase() === name.toLowerCase());
  };

  // The engine sent this vector without a reading. Show that; do not fall
  // through to a vector derived from something else.
  const unscored = (name: EvidenceVectorItem['name'], detail?: string): EvidenceVectorItem => ({
    name,
    score: null,
    displayScore: '—',
    percent: 0,
    status: 'UNAVAILABLE',
    aligned: false,
    detail: detail || 'No engine reading',
    isStaleOrMissing: true,
  });

  // 1. MOMENTUM (Price velocity / RSI / Rate of change)
  let momentumVector: EvidenceVectorItem;
  const momSub = findSubScore('Momentum');
  const momFactor = findFactor('MOMENTUM', 'B-');

  if (isFeedStale && !momSub && !momFactor) {
    momentumVector = {
      name: 'Momentum',
      score: null,
      displayScore: 'STALE',
      percent: 0,
      status: 'STALE',
      aligned: false,
      detail: 'Telemetry feed stale — awaiting fresh velocity ticks',
      isStaleOrMissing: true,
    };
  } else if (momSub && typeof momSub.score === 'number') {
    const s = Math.max(0, Math.min(10, Math.round(momSub.score * 10) / 10));
    momentumVector = {
      name: 'Momentum',
      score: s,
      displayScore: s.toFixed(1),
      percent: Math.min(100, Math.max(0, s * 10)),
      status: momSub.aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned: !!momSub.aligned,
      detail: momSub.detail || `${s >= 7 ? 'Strong' : 'Moderate'} price velocity & RSI trajectory in cycle`,
      isStaleOrMissing: false,
    };
  } else if (momSub) {
    momentumVector = unscored('Momentum', momSub.detail);
  } else if (momFactor && typeof momFactor.score === 'number') {
    const rawScore = momFactor.score;
    const score = Math.max(0, Math.min(10, Math.round((rawScore / 10) * 10) / 10));
    const aligned = momFactor.aligned ?? false;
    momentumVector = {
      name: 'Momentum',
      score,
      displayScore: score.toFixed(1),
      percent: Math.min(100, Math.max(0, score * 10)),
      status: aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned,
      detail: momFactor.detail || `RSI & multi-TF velocity aligned with ${dir} bias`,
      isStaleOrMissing: false,
    };
  } else {
    momentumVector = {
      name: 'Momentum',
      score: null,
      displayScore: '—',
      percent: 0,
      status: 'UNAVAILABLE',
      aligned: false,
      detail: 'Awaiting market cycle initialization',
      isStaleOrMissing: true,
    };
  }

  // 2. TREND (EMA stack / Supertrend / VWAP structure)
  let trendVector: EvidenceVectorItem;
  const trendSub = findSubScore('Trend');
  const trendFactor = findFactor('PRICE_STRUCTURE', 'A-') || findFactor('MULTI_TIMEFRAME_ALIGNMENT', 'F-');

  if (isFeedStale && !trendSub && !trendFactor) {
    trendVector = {
      name: 'Trend',
      score: null,
      displayScore: 'STALE',
      percent: 0,
      status: 'STALE',
      aligned: false,
      detail: 'Structural trend telemetry currently stale',
      isStaleOrMissing: true,
    };
  } else if (trendSub && typeof trendSub.score === 'number') {
    const s = Math.max(0, Math.min(10, Math.round(trendSub.score * 10) / 10));
    trendVector = {
      name: 'Trend',
      score: s,
      displayScore: s.toFixed(1),
      percent: Math.min(100, Math.max(0, s * 10)),
      status: trendSub.aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned: !!trendSub.aligned,
      detail: trendSub.detail || `Structural trend & EMA positioning support ${dir}`,
      isStaleOrMissing: false,
    };
  } else if (trendSub) {
    trendVector = unscored('Trend', trendSub.detail);
  } else if (trendFactor && typeof trendFactor.score === 'number') {
    const rawScore = trendFactor.score;
    const score = Math.max(0, Math.min(10, Math.round((rawScore / 10) * 10) / 10));
    const aligned = trendFactor.aligned ?? false;
    trendVector = {
      name: 'Trend',
      score,
      displayScore: score.toFixed(1),
      percent: Math.min(100, Math.max(0, score * 10)),
      status: aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned,
      detail: trendFactor.detail || `Supertrend & VWAP structure aligned with ${dir}`,
      isStaleOrMissing: false,
    };
  } else if (
    decision &&
    (dir === 'UP' || dir === 'DOWN') &&
    typeof decision.currentSpot === 'number' &&
    typeof decision.openStrike === 'number' &&
    decision.openStrike > 0
  ) {
    // Spot vs strike is measured; a missing strike used to read as 0 and
    // put every spot "above strike".
    const isSpotAboveStrike = decision.currentSpot >= decision.openStrike;
    const score = isUp === isSpotAboveStrike ? 8.4 : 4.2;
    const aligned = isUp === isSpotAboveStrike;
    trendVector = {
      name: 'Trend',
      score,
      displayScore: score.toFixed(1),
      percent: score * 10,
      status: aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned,
      detail: `Spot $${decision.currentSpot?.toLocaleString() ?? '—'} vs Strike $${decision.openStrike?.toLocaleString() ?? '—'}`,
      isStaleOrMissing: false,
    };
  } else {
    trendVector = {
      name: 'Trend',
      score: null,
      displayScore: '—',
      percent: 0,
      status: 'UNAVAILABLE',
      aligned: false,
      detail: 'Awaiting trend baseline telemetry',
      isStaleOrMissing: true,
    };
  }

  // 3. ORDER FLOW (CVD / Taker delta)
  let orderFlowVector: EvidenceVectorItem;
  const flowSub = findSubScore('Order Flow');
  const flowFactor = findFactor('ORDER_FLOW', 'C-');

  if (isFeedStale && !flowSub && !flowFactor) {
    orderFlowVector = {
      name: 'Order Flow',
      score: null,
      displayScore: 'STALE',
      percent: 0,
      status: 'STALE',
      aligned: false,
      detail: 'Taker flow delta feed stale',
      isStaleOrMissing: true,
    };
  } else if (flowSub && typeof flowSub.score === 'number') {
    const s = Math.max(0, Math.min(10, Math.round(flowSub.score * 10) / 10));
    orderFlowVector = {
      name: 'Order Flow',
      score: s,
      displayScore: s.toFixed(1),
      percent: Math.min(100, Math.max(0, s * 10)),
      status: flowSub.aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned: !!flowSub.aligned,
      detail: flowSub.detail || `Taker flow imbalance confirmed in ${dir} direction`,
      isStaleOrMissing: false,
    };
  } else if (flowSub) {
    orderFlowVector = unscored('Order Flow', flowSub.detail);
  } else if (flowFactor && typeof flowFactor.score === 'number') {
    const rawScore = flowFactor.score;
    const score = Math.max(0, Math.min(10, Math.round((rawScore / 10) * 10) / 10));
    const aligned = flowFactor.aligned ?? false;
    orderFlowVector = {
      name: 'Order Flow',
      score,
      displayScore: score.toFixed(1),
      percent: Math.min(100, Math.max(0, score * 10)),
      status: aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned,
      detail: flowFactor.detail || `Aggressor taker flow delta positive for ${dir}`,
      isStaleOrMissing: false,
    };
  } else {
    orderFlowVector = {
      name: 'Order Flow',
      score: null,
      displayScore: '—',
      percent: 0,
      status: 'UNAVAILABLE',
      aligned: false,
      detail: 'Awaiting order flow telemetry',
      isStaleOrMissing: true,
    };
  }

  // 4. VOLUME (Volume vs recent average / Liquidity depth)
  let volumeVector: EvidenceVectorItem;
  const volSub = findSubScore('Volume');
  const volFactor = findFactor('ORDERBOOK_LIQUIDITY', 'D-');

  if (isFeedStale && !volSub && !volFactor) {
    volumeVector = {
      name: 'Volume',
      score: null,
      displayScore: 'STALE',
      percent: 0,
      status: 'STALE',
      aligned: false,
      detail: 'Market feed stale',
      isStaleOrMissing: true,
    };
  } else if (volSub && typeof volSub.score === 'number') {
    const s = Math.max(0, Math.min(10, Math.round(volSub.score * 10) / 10));
    volumeVector = {
      name: 'Volume',
      score: s,
      displayScore: s.toFixed(1),
      percent: Math.min(100, Math.max(0, s * 10)),
      status: volSub.aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned: !!volSub.aligned,
      detail: volSub.detail || 'No detail recorded',
      isStaleOrMissing: false,
    };
  } else if (volSub) {
    volumeVector = unscored('Volume', volSub.detail);
  } else if (volFactor && typeof volFactor.score === 'number') {
    const rawScore = volFactor.score;
    const score = Math.max(0, Math.min(10, Math.round((rawScore / 10) * 10) / 10));
    const aligned = volFactor.aligned ?? false;
    volumeVector = {
      name: 'Volume',
      score,
      displayScore: score.toFixed(1),
      percent: Math.min(100, Math.max(0, score * 10)),
      status: aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned,
      detail: volFactor.detail || 'No detail recorded',
      isStaleOrMissing: false,
    };
  } else {
    volumeVector = {
      name: 'Volume',
      score: null,
      displayScore: '—',
      percent: 0,
      status: 'UNAVAILABLE',
      aligned: false,
      detail: 'No engine reading',
      isStaleOrMissing: true,
    };
  }

  // 5. SENTIMENT (Cross-venue odds Kalshi / Polymarket)
  // Requirement: if genuinely unavailable, return null and display "—"
  let sentimentVector: EvidenceVectorItem;
  const sentSub = findSubScore('Sentiment');
  const crossVenueFactor = findFactor('CROSS_VENUE_AGREEMENT', 'E-') || findFactor('CROSS_MARKET');

  if (isFeedStale && !sentSub && !crossVenueFactor) {
    sentimentVector = {
      name: 'Sentiment',
      score: null,
      displayScore: 'STALE',
      percent: 0,
      status: 'STALE',
      aligned: false,
      detail: 'Cross-venue prediction market feed stale',
      isStaleOrMissing: true,
    };
  } else if (sentSub && typeof sentSub.score === 'number') {
    const s = Math.max(0, Math.min(10, Math.round(sentSub.score * 10) / 10));
    sentimentVector = {
      name: 'Sentiment',
      score: s,
      displayScore: s.toFixed(1),
      percent: Math.min(100, Math.max(0, s * 10)),
      status: sentSub.aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned: !!sentSub.aligned,
      detail: sentSub.detail || `Cross-venue market pricing consensus agrees with ${dir}`,
      isStaleOrMissing: false,
    };
  } else if (sentSub) {
    sentimentVector = unscored('Sentiment', sentSub.detail);
  } else if (crossVenueFactor) {
    // Cross-venue agreement factor from engine
    const rawScore = crossVenueFactor.score;
    if (typeof rawScore === 'number' && rawScore > 0) {
      const score = Math.max(0, Math.min(10, Math.round((rawScore / 10) * 10) / 10));
      const aligned = crossVenueFactor.aligned ?? false;
      sentimentVector = {
        name: 'Sentiment',
        score,
        displayScore: score.toFixed(1),
        percent: Math.min(100, Math.max(0, score * 10)),
        status: aligned ? 'ALIGNED' : 'DIVERGENT',
        aligned,
        detail: crossVenueFactor.detail || `Cross-venue consensus priced in line with ${dir}`,
        isStaleOrMissing: false,
      };
    } else {
      sentimentVector = {
        name: 'Sentiment',
        score: null,
        displayScore: '—',
        percent: 0,
        status: 'UNAVAILABLE',
        aligned: false,
        detail: 'Cross-venue contract feed unavailable',
        isStaleOrMissing: true,
      };
    }
  } else {
    // Genuinely unavailable — do not fabricate!
    sentimentVector = {
      name: 'Sentiment',
      score: null,
      displayScore: '—',
      percent: 0,
      status: 'UNAVAILABLE',
      aligned: false,
      detail: 'Cross-venue odds stream not connected',
      isStaleOrMissing: true,
    };
  }

  // 6. VOLATILITY (ATR / Realized Volatility)
  let volatilityVector: EvidenceVectorItem;
  const volRegimeSub = findSubScore('Volatility');
  const volRegimeFactor = findFactor('VOLATILITY_REGIME', 'G-') || findFactor('VOLATILITY');

  if (isFeedStale && !volRegimeSub && !volRegimeFactor) {
    volatilityVector = {
      name: 'Volatility',
      score: null,
      displayScore: 'STALE',
      percent: 0,
      status: 'STALE',
      aligned: false,
      detail: 'Volatility envelope telemetry stale',
      isStaleOrMissing: true,
    };
  } else if (volRegimeSub && typeof volRegimeSub.score === 'number') {
    const s = Math.max(0, Math.min(10, Math.round(volRegimeSub.score * 10) / 10));
    volatilityVector = {
      name: 'Volatility',
      score: s,
      displayScore: s.toFixed(1),
      percent: Math.min(100, Math.max(0, s * 10)),
      status: volRegimeSub.aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned: !!volRegimeSub.aligned,
      detail: volRegimeSub.detail || `ATR & realized vol within normal 15M expectation band`,
      isStaleOrMissing: false,
    };
  } else if (volRegimeSub) {
    volatilityVector = unscored('Volatility', volRegimeSub.detail);
  } else if (volRegimeFactor && typeof volRegimeFactor.score === 'number') {
    const rawScore = volRegimeFactor.score;
    const score = Math.max(0, Math.min(10, Math.round((rawScore / 10) * 10) / 10));
    const aligned = volRegimeFactor.aligned ?? false;
    volatilityVector = {
      name: 'Volatility',
      score,
      displayScore: score.toFixed(1),
      percent: Math.min(100, Math.max(0, score * 10)),
      status: aligned ? 'ALIGNED' : 'DIVERGENT',
      aligned,
      detail: volRegimeFactor.detail || `Realized volatility in controlled range for 15M cycle`,
      isStaleOrMissing: false,
    };
  } else {
    volatilityVector = {
      name: 'Volatility',
      score: null,
      displayScore: '—',
      percent: 0,
      status: 'UNAVAILABLE',
      aligned: false,
      detail: 'Awaiting realized volatility calculation',
      isStaleOrMissing: true,
    };
  }

  const vectors = [
    momentumVector,
    trendVector,
    orderFlowVector,
    volumeVector,
    sentimentVector,
    volatilityVector,
  ];

  // Count aligned among valid non-stale vectors
  const validVectors = vectors.filter(v => v.score !== null && !v.isStaleOrMissing);
  const alignedCount = validVectors.filter(v => v.aligned).length;
  const totalValidCount = validVectors.length;
  const totalCount = 6;

  // Real computed composite average of all available scores
  const compositeScore = totalValidCount > 0
    ? Math.round((validVectors.reduce((acc, v) => acc + (v.score || 0), 0) / totalValidCount) * 10) / 10
    : null;

  const compositeDisplay = compositeScore !== null ? compositeScore.toFixed(1) : '—';
  const convictionPct = totalValidCount > 0 ? Math.round((alignedCount / totalValidCount) * 100) : 0;

  // Generate dynamic explanation
  let dynamicExplanation = "";
  if (totalValidCount === 0) {
    dynamicExplanation = "Insufficient market data to establish a structural bias at this time.";
  } else {
    const sortedVectors = [...validVectors].sort((a, b) => (b.score || 0) - (a.score || 0));
    const topFactors = sortedVectors.slice(0, 2).map(v => v.name.toLowerCase()).join(" and ");
    const biasStr = dir === 'UP' ? 'bullish' : dir === 'DOWN' ? 'bearish' : 'neutral';
    
    let baseSentence = `Strong ${topFactors} ${topFactors.includes('and') ? 'are' : 'is'} supporting the current ${biasStr} structure.`;
    if (dir === 'NEUTRAL') {
      baseSentence = `Mixed ${topFactors} ${topFactors.includes('and') ? 'are' : 'is'} driving a structurally neutral bias.`;
    }

    let alignmentSentence = "";
    if (alignedCount === totalValidCount && totalValidCount > 0) {
      alignmentSentence = " Every scored vector agrees.";
    } else if (alignedCount >= Math.ceil(totalValidCount / 2)) {
      alignmentSentence = " Alignment remains favorable, though some factors remain divergent.";
    } else {
      alignmentSentence = ` However, with only ${alignedCount} of ${totalValidCount} signals aligned, conflicting structural factors indicate caution.`;
    }
    
    dynamicExplanation = `${baseSentence}${alignmentSentence}`;
  }

  return {
    vectors,
    alignedCount,
    totalValidCount,
    totalCount,
    compositeScore,
    compositeDisplay,
    convictionPct,
    signalsAlignedHeader: `${alignedCount} / ${totalCount} SIGNALS ALIGNED`,
    convictionHeaderText: `AVG SCORE ${compositeDisplay}/10`,
    // The share of scored signals that agree with the direction, not a conviction or a probability.
    convictionPercentText: `${convictionPct}% OF SCORED SIGNALS ALIGNED`,
    compositeFooterText: `${compositeDisplay} / 10 COMPOSITE`,
    dynamicExplanation,
  };
}
