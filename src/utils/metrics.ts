/**
 * VIXY VAULT — AUTHORITATIVE METRICS, THRESHOLDS, UNITS & SEMANTIC FORMATTERS
 * 
 * Single source of truth for all metric calculations, unit definitions,
 * threshold classifications, and semantic state color styling.
 */

export interface MetricFormattedState {
  valueText: string;
  unitText: string;
  subLabelText: string;
  semanticClass: string;
  isBullish: boolean;
  isBearish: boolean;
  isNeutral: boolean;
  isWarning: boolean;
}

/**
 * ORDER FLOW: Normalized order book and taker volume imbalance score [-1.000, +1.000]
 * Raw Data: Coinbase/Binance L2 orderbook delta & taker trade flow
 * Positive: Bullish buy absorption pressure (+0.050 to +1.000)
 * Negative: Bearish sell distribution pressure (-0.050 to -1.000)
 */
export function formatOrderFlow(imbalanceVal?: number | null): MetricFormattedState {
  const val = typeof imbalanceVal === 'number' && !isNaN(imbalanceVal) ? imbalanceVal : 0;
  const isBullish = val > 0;
  const isBearish = val < 0;
  const isNeutral = val === 0;

  const valueText = val > 0 ? `+${val.toFixed(3)}` : val.toFixed(3);
  const subLabelText = isBullish ? (val >= 0.05 ? 'BULLISH' : 'NET BUY') : isBearish ? (val <= -0.05 ? 'BEARISH' : 'NET SELL') : 'NEUTRAL';
  const semanticClass = isBullish ? 'text-[#00FF9D]' : isBearish ? 'text-[#FF3366]' : 'text-purple-400';

  return {
    valueText,
    unitText: 'SCORE',
    subLabelText,
    semanticClass,
    isBullish,
    isBearish,
    isNeutral,
    isWarning: false,
  };
}

/**
 * MOMENTUM: Realized return percentage over 5m/15m cycle
 * Raw Data: Spot price delta vs 5-minute rolling window open
 * Unit: Percentage (%)
 * Do NOT multiply by 100 twice!
 */
export function formatMomentum(momentumVal?: number | null): MetricFormattedState {
  const val = typeof momentumVal === 'number' && !isNaN(momentumVal) ? momentumVal : 0;
  // If value comes in as raw fraction (e.g. 0.0032), convert to percentage; if already percentage (e.g. 0.32 or -1.13), keep as is
  const pct = Math.abs(val) < 0.05 && val !== 0 ? val * 100 : val;

  const isStrongBull = pct >= 0.40;
  const isBullish = pct > 0;
  const isStrongBear = pct <= -0.40;
  const isBearish = pct < 0;
  const isNeutral = pct === 0;

  const valueText = pct > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`;
  const subLabelText = isStrongBull ? 'STRONG BULL' : isBullish ? 'BULLISH' : isStrongBear ? 'STRONG BEAR' : isBearish ? 'BEARISH' : 'NEUTRAL';
  const semanticClass = isBullish ? 'text-[#00FF9D]' : isBearish ? 'text-[#FF3366]' : 'text-purple-400';

  return {
    valueText,
    unitText: '5M RETURN',
    subLabelText,
    semanticClass,
    isBullish,
    isBearish,
    isNeutral,
    isWarning: false,
  };
}

/**
 * VOLATILITY: Rolling 15-Minute Realized Volatility (%)
 * Raw Data: 15-minute rolling standard deviation / true range percentage
 * Unit: Percentage (%)
 * Ranges:
 *  - Low: < 0.60%
 *  - Normal: 0.60% - 1.50%
 *  - Elevated: 1.50% - 3.00%
 *  - Extreme: > 3.00%
 */
export function formatVolatility(volVal?: number | null): MetricFormattedState {
  const val = typeof volVal === 'number' && !isNaN(volVal) ? volVal : 1.13;
  const pct = Math.abs(val) < 0.05 && val !== 0 ? val * 100 : val;

  const isLow = pct < 0.60;
  const isNormal = pct >= 0.60 && pct <= 1.50;
  const isElevated = pct > 1.50 && pct <= 3.00;
  const isExtreme = pct > 3.00;

  const valueText = `${pct.toFixed(2)}%`;
  const subLabelText = isLow ? 'LOW VOL' : isNormal ? 'NORMAL' : isElevated ? 'ELEVATED' : 'EXTREME';
  const semanticClass = isLow ? 'text-purple-300' : isNormal ? 'text-cyan-300' : isElevated ? 'text-amber-400' : 'text-[#FF3366]';

  return {
    valueText,
    unitText: 'REALIZED VOL (15M)',
    subLabelText,
    semanticClass,
    isBullish: false,
    isBearish: false,
    isNeutral: isNormal || isLow,
    isWarning: isElevated || isExtreme,
  };
}

/**
 * DISTANCE: Dollar difference from current Spot Price to Kalshi 15M Strike Price
 * Raw Data: spotPrice - kalshiStrikePrice ($ USD)
 * Unit: USD ($)
 * Favorable logic is tied to the current directional prediction:
 *  - If BUY UP: Spot > Strike (+$) is In The Money (Favorable)
 *  - If BUY DOWN: Spot < Strike (-$) is In The Money (Favorable)
 */
export function formatDistance(
  distanceVal?: number | null,
  predictedDirection?: 'UP' | 'DOWN' | 'BUY UP' | 'BUY DOWN' | 'NEUTRAL' | string
): MetricFormattedState {
  const val = typeof distanceVal === 'number' && !isNaN(distanceVal) ? distanceVal : 0;
  const isPositive = val > 0;
  const isNegative = val < 0;
  const isNeutral = val === 0;

  const absVal = Math.abs(val);
  const sign = isPositive ? '+' : isNegative ? '-' : '';
  const valueText = `${sign}$${absVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}`;

  const dirUpper = (predictedDirection || '').toUpperCase();
  const isUp = dirUpper.includes('UP') || dirUpper.includes('YES');
  const isDown = dirUpper.includes('DOWN') || dirUpper.includes('NO');

  let subLabelText = isPositive ? 'ABOVE STRIKE' : isNegative ? 'BELOW STRIKE' : 'AT STRIKE';
  if (isUp) {
    subLabelText = isPositive ? 'IN THE MONEY' : isNegative ? 'OUT OF MONEY' : 'AT THE MONEY';
  } else if (isDown) {
    subLabelText = isNegative ? 'IN THE MONEY' : isPositive ? 'OUT OF MONEY' : 'AT THE MONEY';
  }

  // Consistent strictly positive = Green, negative = Red, zero = Neutral Purple
  const semanticClass = isPositive ? 'text-[#00FF9D]' : isNegative ? 'text-[#FF3366]' : 'text-purple-300';

  return {
    valueText,
    unitText: 'STRIKE GAP',
    subLabelText,
    semanticClass,
    isBullish: isPositive,
    isBearish: isNegative,
    isNeutral,
    isWarning: isNegative,
  };
}

/**
 * REGIME: Authoritative market structure classification from model
 * Valid states:
 *  - TRENDING_BULL -> TRENDING / BULLISH (Neon Green)
 *  - TRENDING_BEAR -> TRENDING / BEARISH (Neon Red)
 *  - BREAKOUT_BULL -> BREAKOUT / BULLISH (Neon Green)
 *  - BREAKOUT_BEAR -> BREAKOUT / BEARISH (Neon Red)
 *  - RANGING_LOW_VOL -> RANGING / LOW VOL (Purple)
 *  - RANGING_NEUTRAL -> RANGING / NEUTRAL (Purple)
 *  - HIGH_VOLATILITY -> HIGH VOL / EXPANSION (Amber)
 *  - REVERSAL_RISK -> REVERSAL / DEFENSE (Rose)
 */
export function formatRegime(regimeRaw?: string | null): {
  primaryText: string;
  secondaryText: string;
  semanticClass: string;
  isBull: boolean;
  isBear: boolean;
} {
  const reg = (regimeRaw || 'RANGING_NEUTRAL').toUpperCase();

  if (reg.includes('BULL')) {
    const primary = reg.includes('BREAKOUT') ? 'BREAKOUT' : 'TRENDING';
    return {
      primaryText: primary,
      secondaryText: 'BULLISH',
      semanticClass: 'text-[#00FF9D]',
      isBull: true,
      isBear: false,
    };
  }

  if (reg.includes('BEAR')) {
    const primary = reg.includes('BREAKOUT') ? 'BREAKOUT' : 'TRENDING';
    return {
      primaryText: primary,
      secondaryText: 'BEARISH',
      semanticClass: 'text-[#FF3366]',
      isBull: false,
      isBear: true,
    };
  }

  if (reg.includes('HIGH_VOL') || reg.includes('VOLATILITY')) {
    return {
      primaryText: 'HIGH VOL',
      secondaryText: 'EXPANSION',
      semanticClass: 'text-amber-400',
      isBull: false,
      isBear: false,
    };
  }

  if (reg.includes('REVERSAL')) {
    return {
      primaryText: 'REVERSAL',
      secondaryText: 'DEFENSE',
      semanticClass: 'text-rose-400',
      isBull: false,
      isBear: false,
    };
  }

  return {
    primaryText: 'RANGING',
    secondaryText: reg.includes('LOW') ? 'LOW VOL' : 'NEUTRAL',
    semanticClass: 'text-purple-300',
    isBull: false,
    isBear: false,
  };
}

/**
 * LIVE DATA FRESHNESS: Dynamic second-by-second age formatting
 */
export function formatDataFreshness(dataAgeMs: number, feedStatus?: string): {
  label: string;
  ageText: string;
  statusClass: string;
  isLive: boolean;
  isStale: boolean;
} {
  const seconds = Math.max(0, Math.round(dataAgeMs / 1000));
  const ageText = `${seconds}s ago`;

  if (feedStatus === 'OFFLINE') {
    return { label: 'OFFLINE', ageText, statusClass: 'text-rose-400', isLive: false, isStale: true };
  }

  if (seconds <= 4) {
    return { label: 'LIVE', ageText, statusClass: 'text-[#00FF9D]', isLive: true, isStale: false };
  }
  if (seconds <= 12) {
    return { label: 'LIVE', ageText, statusClass: 'text-emerald-400', isLive: true, isStale: false };
  }
  if (seconds <= 20) {
    return { label: 'DELAYED', ageText, statusClass: 'text-amber-400', isLive: false, isStale: false };
  }
  return { label: 'STALE', ageText, statusClass: 'text-rose-400', isLive: false, isStale: true };
}

/**
 * CONFIDENCE BANDS & SEMANTIC DESCRIPTORS (VIXY VAULT STRICT CALIBRATION)
 *
 * Strict Calibration Bands:
 *  - 50–59% → LOW / DEVELOPING EDGE (e.g., DEVELOPING BULLISH EDGE or DEVELOPING BEARISH EDGE)
 *  - 60–69% → MODERATE BULLISH / BEARISH EDGE (e.g., MODERATE BULLISH EDGE or MODERATE BEARISH EDGE)
 *  - 70–79% → STRONG BULLISH / BEARISH CONFIDENCE (e.g., STRONG BULLISH CONFIDENCE or STRONG BEARISH CONFIDENCE)
 *  - 80–89% → HIGH BULLISH / BEARISH CONFIDENCE (e.g., HIGH BULLISH CONFIDENCE or HIGH BEARISH CONFIDENCE)
 *  - 90–100% → VERY HIGH BULLISH / BEARISH CONFIDENCE (e.g., VERY HIGH BULLISH CONFIDENCE or VERY HIGH BEARISH CONFIDENCE)
 */
export function formatConfidenceLabel(
  confidencePct: number | null | undefined,
  direction?: 'UP' | 'DOWN' | 'BUY UP' | 'BUY DOWN' | 'NEUTRAL' | 'PASS' | string
): {
  tierLabel: string;
  fullLabel: string;
  badgeClass: string;
  accentClass: string;
  meterPct: number;
} {
  const val = typeof confidencePct === 'number' && !isNaN(confidencePct) ? confidencePct : 50;
  // Standardize 0.0-1.0 fraction vs 0-100 percentage
  const pct = val <= 1 && val > 0 ? Math.round(val * 100) : Math.round(val);
  const clamped = Math.min(100, Math.max(0, pct));

  const dirUpper = (direction || '').toUpperCase();
  const isUp = dirUpper.includes('UP') || dirUpper.includes('YES');
  const isDown = dirUpper.includes('DOWN') || dirUpper.includes('NO');

  let tier = 'LOW';
  let tierLabel = 'DEVELOPING EDGE';
  let fullLabel = 'DEVELOPING EDGE';
  let badgeClass = 'bg-purple-950/40 border-purple-800/60 text-purple-300';
  let accentClass = 'text-purple-400';

  if (clamped >= 90) {
    tier = 'VERY HIGH';
    tierLabel = 'VERY HIGH CONFIDENCE';
    if (isUp) {
      fullLabel = 'VERY HIGH BULLISH CONFIDENCE';
      badgeClass = 'bg-[#00FF9D]/15 border-[#00FF9D]/60 text-[#00FF9D] shadow-[0_0_15px_rgba(0,255,157,0.3)]';
      accentClass = 'text-[#00FF9D]';
    } else if (isDown) {
      fullLabel = 'VERY HIGH BEARISH CONFIDENCE';
      badgeClass = 'bg-[#FF3366]/15 border-[#FF3366]/60 text-[#FF3366] shadow-[0_0_15px_rgba(255,51,102,0.3)]';
      accentClass = 'text-[#FF3366]';
    } else {
      fullLabel = 'VERY HIGH CONFIDENCE';
      badgeClass = 'bg-purple-900/40 border-purple-500/60 text-purple-200';
      accentClass = 'text-purple-300';
    }
  } else if (clamped >= 80) {
    tier = 'HIGH';
    tierLabel = 'HIGH CONFIDENCE';
    if (isUp) {
      fullLabel = 'HIGH BULLISH CONFIDENCE';
      badgeClass = 'bg-[#041510] border-emerald-500/50 text-[#00FF9D]';
      accentClass = 'text-[#00FF9D]';
    } else if (isDown) {
      fullLabel = 'HIGH BEARISH CONFIDENCE';
      badgeClass = 'bg-[#1a050a] border-rose-500/50 text-[#FF3366]';
      accentClass = 'text-[#FF3366]';
    } else {
      fullLabel = 'HIGH CONFIDENCE';
      badgeClass = 'bg-purple-900/30 border-purple-600/50 text-purple-300';
      accentClass = 'text-purple-300';
    }
  } else if (clamped >= 70) {
    tier = 'STRONG';
    tierLabel = 'STRONG CONFIDENCE';
    if (isUp) {
      fullLabel = 'STRONG BULLISH CONFIDENCE';
      badgeClass = 'bg-[#041510]/80 border-emerald-700/50 text-emerald-300';
      accentClass = 'text-emerald-400';
    } else if (isDown) {
      fullLabel = 'STRONG BEARISH CONFIDENCE';
      badgeClass = 'bg-[#1a050a]/80 border-rose-700/50 text-rose-300';
      accentClass = 'text-rose-400';
    } else {
      fullLabel = 'STRONG CONFIDENCE';
      badgeClass = 'bg-purple-900/30 border-purple-700/50 text-purple-300';
      accentClass = 'text-purple-400';
    }
  } else if (clamped >= 60) {
    tier = 'MODERATE';
    tierLabel = 'MODERATE EDGE';
    if (isUp) {
      fullLabel = 'MODERATE BULLISH EDGE';
      badgeClass = 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400';
      accentClass = 'text-emerald-400';
    } else if (isDown) {
      fullLabel = 'MODERATE BEARISH EDGE';
      badgeClass = 'bg-rose-950/30 border-rose-800/40 text-rose-400';
      accentClass = 'text-rose-400';
    } else {
      fullLabel = 'MODERATE EDGE';
      badgeClass = 'bg-purple-950/30 border-purple-800/40 text-purple-400';
      accentClass = 'text-purple-400';
    }
  } else {
    tier = 'DEVELOPING';
    tierLabel = 'DEVELOPING EDGE';
    if (isUp) {
      fullLabel = 'DEVELOPING BULLISH EDGE';
      badgeClass = 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400/90';
      accentClass = 'text-emerald-400/90';
    } else if (isDown) {
      fullLabel = 'DEVELOPING BEARISH EDGE';
      badgeClass = 'bg-rose-950/20 border-rose-900/40 text-rose-400/90';
      accentClass = 'text-rose-400/90';
    } else {
      fullLabel = 'DEVELOPING EDGE';
      badgeClass = 'bg-purple-950/20 border-purple-900/40 text-purple-400/80';
      accentClass = 'text-purple-400';
    }
  }

  return {
    tierLabel,
    fullLabel,
    badgeClass,
    accentClass,
    meterPct: clamped,
  };
}

export type DirectionVisualState = 'UP' | 'DOWN' | 'NEUTRAL' | 'DELAYED' | 'ERROR';

export interface VisualStateConfig {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
}

export function getVisualStateConfig(state: DirectionVisualState): VisualStateConfig {
  switch (state) {
    case 'UP':
      return {
        primaryColor: '#00FF9D',
        secondaryColor: '#A855F7',
        glowColor: 'rgba(0, 255, 157, 0.4)',
        borderClass: 'border-[#00FF9D]/60',
        textClass: 'text-[#00FF9D]',
        bgClass: 'bg-[#00FF9D]/10',
      };
    case 'DOWN':
      return {
        primaryColor: '#FF3366',
        secondaryColor: '#A855F7',
        glowColor: 'rgba(255, 51, 102, 0.4)',
        borderClass: 'border-[#FF3366]/60',
        textClass: 'text-[#FF3366]',
        bgClass: 'bg-[#FF3366]/10',
      };
    case 'DELAYED':
      return {
        primaryColor: '#FBBF24',
        secondaryColor: '#A855F7',
        glowColor: 'rgba(251, 191, 36, 0.3)',
        borderClass: 'border-amber-400/40',
        textClass: 'text-amber-400',
        bgClass: 'bg-amber-400/10',
      };
    case 'ERROR':
      return {
        primaryColor: '#F87171',
        secondaryColor: '#A855F7',
        glowColor: 'rgba(248, 113, 113, 0.2)',
        borderClass: 'border-red-400/30',
        textClass: 'text-red-400',
        bgClass: 'bg-red-400/10',
      };
    case 'NEUTRAL':
    default:
      return {
        primaryColor: '#C084FC',
        secondaryColor: '#A855F7',
        glowColor: 'rgba(192, 132, 252, 0.3)',
        borderClass: 'border-purple-500/40',
        textClass: 'text-purple-300',
        bgClass: 'bg-purple-900/20',
      };
  }
}

