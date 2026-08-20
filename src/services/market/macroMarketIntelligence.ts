/**
 * VIXY VAULT — Macro Market & Cross-Asset Intelligence Engine
 * 
 * Satisfies Principle #3 & #5:
 * - Keeps individual coin data (SOL, ETH, XRP, etc.) 100% strictly separated.
 * - Extracts aggregated market-wide intelligence (BTC macro regime, ETH correlation,
 *   altcoin breadth, volume expansion, market-wide risk) and feeds them into
 *   VIXY intelligence as contextual features.
 */

import { CanonicalAsset, CANONICAL_CRYPTO_REGISTRY, resolveCanonicalAsset } from './cryptoUniverseRegistry';

export interface MacroMarketContext {
  timestamp: number;
  btcMacroRegime: 'BULL_EXPANSION' | 'BEAR_TREND' | 'CHOP_CONSOLIDATION' | 'BREAKOUT_SETUP';
  ethCorrelationBias: 'CONFIRMING_BULL' | 'CONFIRMING_BEAR' | 'DIVERGENT';
  marketBreadth: {
    advancingAssetsCount: number;
    decliningAssetsCount: number;
    advancersPct: number; // e.g. 78% of universe green
    altcoinRelativeStrength: 'OUTPERFORMING_BTC' | 'UNDERPERFORMING_BTC' | 'PARALLEL';
  };
  aggregateLiquidity: {
    volumeExpansion: 'EXPANDING' | 'NORMAL' | 'CONTRACTING';
    marketRiskScore: number; // 0 to 100
    regimeVolatility: 'COMPRESSED' | 'ELEVATED' | 'EXTREME';
  };
}

/**
 * Computes market-wide macro context from multi-asset price ticks without
 * contaminating any single asset's price, volume, or order book state.
 */
export function computeMacroMarketContext(
  assetTickers: Array<{ symbol: string; change24h: number; price: number; volume24h?: number }>,
  btcChange24h: number = 3.4,
  ethChange24h: number = 4.8
): MacroMarketContext {
  const total = assetTickers.length || 1;
  const advancing = assetTickers.filter(t => t.change24h > 0).length;
  const declining = assetTickers.filter(t => t.change24h < 0).length;
  const advancersPct = Math.round((advancing / Math.max(1, total)) * 100);

  // Determine BTC macro regime
  let btcMacroRegime: MacroMarketContext['btcMacroRegime'] = 'CHOP_CONSOLIDATION';
  if (btcChange24h > 2.5) btcMacroRegime = 'BULL_EXPANSION';
  else if (btcChange24h < -2.5) btcMacroRegime = 'BEAR_TREND';
  else if (Math.abs(btcChange24h) <= 1.0) btcMacroRegime = 'CHOP_CONSOLIDATION';
  else btcMacroRegime = 'BREAKOUT_SETUP';

  // ETH Correlation
  let ethCorrelationBias: MacroMarketContext['ethCorrelationBias'] = 'DIVERGENT';
  if (btcChange24h > 0 && ethChange24h > 0) ethCorrelationBias = 'CONFIRMING_BULL';
  else if (btcChange24h < 0 && ethChange24h < 0) ethCorrelationBias = 'CONFIRMING_BEAR';

  // Altcoin RS vs BTC
  const avgAltChange = assetTickers
    .filter(t => t.symbol !== 'BTC')
    .reduce((acc, t) => acc + t.change24h, 0) / Math.max(1, total - 1);
  
  let altcoinRelativeStrength: MacroMarketContext['marketBreadth']['altcoinRelativeStrength'] = 'PARALLEL';
  if (avgAltChange > btcChange24h + 1.5) altcoinRelativeStrength = 'OUTPERFORMING_BTC';
  else if (avgAltChange < btcChange24h - 1.5) altcoinRelativeStrength = 'UNDERPERFORMING_BTC';

  return {
    timestamp: Date.now(),
    btcMacroRegime,
    ethCorrelationBias,
    marketBreadth: {
      advancingAssetsCount: advancing,
      decliningAssetsCount: declining,
      advancersPct,
      altcoinRelativeStrength,
    },
    aggregateLiquidity: {
      volumeExpansion: advancersPct > 65 || advancersPct < 35 ? 'EXPANDING' : 'NORMAL',
      marketRiskScore: advancersPct > 80 ? 32 : (advancersPct < 30 ? 74 : 50),
      regimeVolatility: Math.abs(btcChange24h) > 5 ? 'EXTREME' : (Math.abs(btcChange24h) > 2 ? 'ELEVATED' : 'COMPRESSED'),
    },
  };
}

/**
 * Calculates asset-specific Relative Strength Index vs BTC without polluting the asset's raw data
 */
export function calculateAssetAlphaVsBTC(
  targetAssetChange24h: number,
  btcChange24h: number
): { alphaSpreadPct: number; leadershipStatus: 'MARKET_LEADER' | 'LAGGARD' | 'BENCHMARK_TRACKER' } {
  const alphaSpreadPct = Math.round((targetAssetChange24h - btcChange24h) * 100) / 100;
  let leadershipStatus: 'MARKET_LEADER' | 'LAGGARD' | 'BENCHMARK_TRACKER' = 'BENCHMARK_TRACKER';
  if (alphaSpreadPct >= 2.0) leadershipStatus = 'MARKET_LEADER';
  else if (alphaSpreadPct <= -2.0) leadershipStatus = 'LAGGARD';
  
  return { alphaSpreadPct, leadershipStatus };
}
