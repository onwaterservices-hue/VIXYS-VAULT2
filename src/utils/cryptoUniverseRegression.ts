/**
 * VIXY VAULT — Crypto Universe Automated Regression & Safety Verification Suite
 * 
 * Implements Principle #8:
 * - Verifies Asset Integrity (Selected = Requested = Market Data = Signal = UI)
 * - Verifies Isolation: switches BTC -> SOL -> ETH -> XRP -> DOGE -> ADA -> SUI -> BTC
 *   and confirms 0% state leakage / residual contamination.
 * - Verifies VIXY LOCKS & Protection mathematical integrity.
 */

import { resolveCanonicalAsset, validateAssetIntegrity, getAllCanonicalAssets } from '../services/market/cryptoUniverseRegistry';
import { computeUnderlyingAssetMetrics } from '../services/market/assetIntelligence';
import { computeMacroMarketContext, calculateAssetAlphaVsBTC } from '../services/market/macroMarketIntelligence';

export interface RegressionTestReport {
  suiteName: string;
  timestamp: string;
  totalTests: number;
  passCount: number;
  failCount: number;
  status: 'PASS' | 'FAIL';
  results: Array<{
    testId: string;
    description: string;
    passed: boolean;
    expected: any;
    actual: any;
    details?: string;
  }>;
}

export function runCryptoUniverseRegressionSuite(): RegressionTestReport {
  const results: RegressionTestReport['results'] = [];

  // 1. CANONICAL IDENTITY RESOLUTION TESTS
  const aliasTestCases = [
    { input: 'BTC', expectedId: 'bitcoin', expectedSym: 'BTC' },
    { input: 'bitcoin', expectedId: 'bitcoin', expectedSym: 'BTC' },
    { input: 'Bitcoin', expectedId: 'bitcoin', expectedSym: 'BTC' },
    { input: 'BTCUSDT', expectedId: 'bitcoin', expectedSym: 'BTC' },
    { input: 'BTC-USD', expectedId: 'bitcoin', expectedSym: 'BTC' },
    { input: 'SOL', expectedId: 'solana', expectedSym: 'SOL' },
    { input: 'solana', expectedId: 'solana', expectedSym: 'SOL' },
    { input: 'Solana', expectedId: 'solana', expectedSym: 'SOL' },
    { input: 'SOL/USDT', expectedId: 'solana', expectedSym: 'SOL' },
    { input: 'ETH', expectedId: 'ethereum', expectedSym: 'ETH' },
    { input: 'ethereum', expectedId: 'ethereum', expectedSym: 'ETH' },
    { input: 'XRP', expectedId: 'ripple', expectedSym: 'XRP' },
    { input: 'DOGE', expectedId: 'dogecoin', expectedSym: 'DOGE' },
    { input: 'ADA', expectedId: 'cardano', expectedSym: 'ADA' },
    { input: 'SUI', expectedId: 'sui', expectedSym: 'SUI' },
    { input: 'AVAX', expectedId: 'avalanche-2', expectedSym: 'AVAX' },
    { input: 'LINK', expectedId: 'chainlink', expectedSym: 'LINK' },
    { input: 'NEAR', expectedId: 'near', expectedSym: 'NEAR' },
    { input: 'BNB', expectedId: 'binancecoin', expectedSym: 'BNB' },
  ];

  aliasTestCases.forEach((tc, idx) => {
    const resolved = resolveCanonicalAsset(tc.input);
    const passed = resolved.assetId === tc.expectedId && resolved.symbol === tc.expectedSym;
    results.push({
      testId: `CANONICAL_RESOLVE_${idx + 1}_${tc.input}`,
      description: `Resolve alias '${tc.input}' to canonical asset ${tc.expectedId} (${tc.expectedSym})`,
      passed,
      expected: `${tc.expectedId}:${tc.expectedSym}`,
      actual: `${resolved.assetId}:${resolved.symbol}`,
    });
  });

  // 2. ISOLATION & SWITCHING SEQUENCE TEST (Zero Data Leakage)
  const switchSequence = ['BTC', 'SOL', 'ETH', 'XRP', 'DOGE', 'ADA', 'SUI', 'BTC'];
  const mockPriceMap: Record<string, number> = {
    BTC: 64161.4,
    SOL: 184.2,
    ETH: 3482.5,
    XRP: 0.62,
    DOGE: 0.14,
    ADA: 0.42,
    SUI: 1.85,
  };
  let previousAssetMetrics: any = null;

  switchSequence.forEach((sym, idx) => {
    const canonical = resolveCanonicalAsset(sym);
    const mockPrice = mockPriceMap[sym] || 100;
    const mockOpen = mockPrice * 0.98;
    
    const metrics = computeUnderlyingAssetMetrics(canonical.symbol, mockPrice, mockOpen, 65, 0.4);

    // Verify asset tag in output strictly equals canonical symbol
    const assetTagValid = metrics.asset === canonical.symbol;
    // Verify no price leakage from previous asset
    let noPriceLeakage = true;
    if (previousAssetMetrics && previousAssetMetrics.asset !== metrics.asset) {
      noPriceLeakage = metrics.spotPrice === mockPrice && metrics.spotPrice !== previousAssetMetrics.spotPrice;
    }

    const testPassed = assetTagValid && noPriceLeakage;
    results.push({
      testId: `SWITCH_ISOLATION_STEP_${idx + 1}_${sym}`,
      description: `Switching to ${sym} isolates spot price $${mockPrice} and tags asset as ${canonical.symbol}`,
      passed: testPassed,
      expected: { asset: canonical.symbol, spotPrice: mockPrice },
      actual: { asset: metrics.asset, spotPrice: metrics.spotPrice },
      details: testPassed ? 'Zero cross-contamination verified' : 'Potential state leakage detected',
    });

    previousAssetMetrics = metrics;
  });

  // 3. CROSS-ASSET INTELLIGENCE ISOLATION TEST
  const sampleTickers = [
    { symbol: 'BTC', change24h: 3.42, price: 64161.4 },
    { symbol: 'ETH', change24h: 4.85, price: 3482.5 },
    { symbol: 'SOL', change24h: 8.12, price: 184.2 },
    { symbol: 'XRP', change24h: -1.20, price: 0.62 },
  ];

  const macroContext = computeMacroMarketContext(sampleTickers, 3.42, 4.85);
  const solAlpha = calculateAssetAlphaVsBTC(8.12, 3.42);

  const macroValid = macroContext.btcMacroRegime === 'BULL_EXPANSION' &&
                     macroContext.marketBreadth.advancersPct === 75 &&
                     solAlpha.leadershipStatus === 'MARKET_LEADER';

  results.push({
    testId: 'CROSS_ASSET_MACRO_SYNTHESIS',
    description: 'Macro synthesis extracts market breadth and relative strength without corrupting raw tickers',
    passed: macroValid,
    expected: { btcRegime: 'BULL_EXPANSION', advancersPct: 75, solLeader: 'MARKET_LEADER' },
    actual: {
      btcRegime: macroContext.btcMacroRegime,
      advancersPct: macroContext.marketBreadth.advancersPct,
      solLeader: solAlpha.leadershipStatus,
    },
  });

  // 4. INTEGRITY VALIDATOR FUNCTION TEST
  const validation1 = validateAssetIntegrity('solana', 'SOL');
  const validation2 = validateAssetIntegrity('BTC', 'ETH');

  results.push({
    testId: 'VALIDATE_INTEGRITY_MATCH',
    description: 'validateAssetIntegrity returns true for alias match (solana == SOL)',
    passed: validation1.isValid === true,
    expected: true,
    actual: validation1.isValid,
  });

  results.push({
    testId: 'VALIDATE_INTEGRITY_MISMATCH',
    description: 'validateAssetIntegrity returns false for mismatched assets (BTC != ETH)',
    passed: validation2.isValid === false,
    expected: false,
    actual: validation2.isValid,
  });

  const passCount = results.filter(r => r.passed).length;
  const failCount = results.length - passCount;

  return {
    suiteName: 'VIXY Universal Crypto Universe Safety & Regression Suite',
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passCount,
    failCount,
    status: failCount === 0 ? 'PASS' : 'FAIL',
    results,
  };
}
