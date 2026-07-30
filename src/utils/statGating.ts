export const MIN_SAMPLE_DISPLAY = 20;
export const MIN_SAMPLE_CONFIDENT = 100;

export interface WilsonIntervalResult {
  wins: number;
  n: number;
  winRatePct: number;
  loPct: number;
  hiPct: number;
  isWide: boolean;
  isGated: boolean;
  message: string;
}

/**
 * Wilson score interval calculation for honest small-sample statistics.
 * At small sample sizes, a point estimate like "75%" can obscure huge uncertainty.
 * The Wilson score interval provides a mathematically sound 95% confidence range.
 */
export function calculateWilsonInterval(wins: number, n: number, z = 1.96): WilsonIntervalResult {
  if (n <= 0) {
    return {
      wins: 0,
      n: 0,
      winRatePct: 0,
      loPct: 0,
      hiPct: 100,
      isWide: true,
      isGated: true,
      message: `Collecting data — n=0, need ${MIN_SAMPLE_DISPLAY} more trades before statistically meaningful`,
    };
  }

  const isGated = n < MIN_SAMPLE_DISPLAY;
  const p = wins / n;
  const winRatePct = Math.round(p * 1000) / 10; // e.g. 75.0%

  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));

  const lo = Math.max(0, (center - margin) / denom);
  const hi = Math.min(1, (center + margin) / denom);

  const loPct = Math.round(lo * 100);
  const hiPct = Math.round(hi * 100);
  const isWide = hiPct - loPct > 30;

  const message = isGated
    ? `Collecting data — n=${n}, need ${MIN_SAMPLE_DISPLAY - n} more trade${MIN_SAMPLE_DISPLAY - n === 1 ? '' : 's'} before statistically meaningful`
    : `95% interval: ${loPct}%–${hiPct}%${isWide ? ' (wide — treat as noisy)' : ''}`;

  return {
    wins,
    n,
    winRatePct,
    loPct,
    hiPct,
    isWide,
    isGated,
    message,
  };
}

/**
 * Global source of truth for connection status
 */
export type DataSourceType = 'mock' | 'live';
export const CURRENT_DATA_SOURCE: DataSourceType = 'mock';
