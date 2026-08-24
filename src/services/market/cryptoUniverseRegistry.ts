/**
 * VIXY VAULT — Centralized Canonical Crypto Universe Registry
 * 
 * Provides an authoritative, single source of truth for all crypto assets supported by VIXY.
 * Enforces canonical asset identification across the full pipeline:
 * User Selection -> Canonical Resolution -> Market Data -> Features -> VIXY Intelligence -> Signal -> UI
 */

export interface CanonicalAsset {
  assetId: string; // Globally unique canonical identifier (e.g., 'bitcoin', 'ethereum', 'solana')
  symbol: string; // Primary uppercase ticker (e.g., 'BTC', 'ETH', 'SOL')
  name: string; // Full human-readable display name (e.g., 'Bitcoin', 'Ethereum', 'Solana')
  category: 'LAYER_1' | 'LAYER_2' | 'DEFI' | 'MEME' | 'INFRASTRUCTURE' | 'PAYMENTS' | 'AI';
  color: string;
  badgeBg: string;
  precision: {
    priceDecimals: number;
    sizeDecimals: number;
    minOrderUSD: number;
  };
  providerIds: {
    binance: string; // e.g. 'BTCUSDT'
    coinbase: string; // e.g. 'BTC-USD'
    coingecko: string; // e.g. 'bitcoin'
    kalshi?: string; // e.g. 'KXBTC15M'
    polymarket?: string; // e.g. 'bitcoin-15m'
    deribit?: string; // e.g. 'BTC-PERPETUAL'
  };
  exchangeSymbols: string[]; // All recognizable aliases & ticker variants
  tradingPairs: {
    usdt: string;
    usd: string;
    usdc?: string;
  };
  status: 'ACTIVE' | 'SUPPORTED' | 'MAINTENANCE';
  marketDataSupport: {
    spot: boolean;
    orderBook: boolean;
    klines: boolean;
    webSocket: boolean;
    derivatives: boolean;
    takerFlow: boolean;
  };
  predictionMarketSupport: {
    kalshi: boolean;
    polymarket: boolean;
    draftkings: boolean;
  };
  benchmarkWeight: number; // 0 to 1 weighting in aggregate market intelligence
  isCoreIndexAsset?: boolean; // BTC, ETH used for macro regime baseline
}

/**
 * Authoritative Canonical Crypto Asset Registry
 */
export const CANONICAL_CRYPTO_REGISTRY: Record<string, CanonicalAsset> = {
  bitcoin: {
    assetId: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    category: 'LAYER_1',
    color: '#F7931A',
    badgeBg: 'rgba(247, 147, 26, 0.15)',
    precision: { priceDecimals: 2, sizeDecimals: 6, minOrderUSD: 10 },
    providerIds: {
      binance: 'BTCUSDT',
      coinbase: 'BTC-USD',
      coingecko: 'bitcoin',
      kalshi: 'KXBTC15M',
      polymarket: 'bitcoin-15m',
      deribit: 'BTC-PERPETUAL',
    },
    exchangeSymbols: ['BTC', 'BITCOIN', 'BTCUSDT', 'BTC-USD', 'XBT', 'XBTUSD'],
    tradingPairs: { usdt: 'BTCUSDT', usd: 'BTC-USD', usdc: 'BTCUSDC' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: true, polymarket: true, draftkings: true },
    benchmarkWeight: 0.50,
    isCoreIndexAsset: true,
  },
  ethereum: {
    assetId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    category: 'LAYER_1',
    color: '#627EEA',
    badgeBg: 'rgba(98, 126, 234, 0.15)',
    precision: { priceDecimals: 2, sizeDecimals: 5, minOrderUSD: 10 },
    providerIds: {
      binance: 'ETHUSDT',
      coinbase: 'ETH-USD',
      coingecko: 'ethereum',
      kalshi: 'KXETH15M',
      polymarket: 'ethereum-15m',
      deribit: 'ETH-PERPETUAL',
    },
    exchangeSymbols: ['ETH', 'ETHEREUM', 'ETHUSDT', 'ETH-USD', 'WETH'],
    tradingPairs: { usdt: 'ETHUSDT', usd: 'ETH-USD', usdc: 'ETHUSDC' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: true, polymarket: true, draftkings: true },
    benchmarkWeight: 0.25,
    isCoreIndexAsset: true,
  },
  solana: {
    assetId: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    category: 'LAYER_1',
    color: '#14F195',
    badgeBg: 'rgba(20, 241, 149, 0.15)',
    precision: { priceDecimals: 2, sizeDecimals: 4, minOrderUSD: 5 },
    providerIds: {
      binance: 'SOLUSDT',
      coinbase: 'SOL-USD',
      coingecko: 'solana',
      kalshi: 'KXSOL15M',
      polymarket: 'solana-15m',
      deribit: 'SOL-PERPETUAL',
    },
    exchangeSymbols: ['SOL', 'SOLANA', 'SOLUSDT', 'SOL-USD', 'WSOL'],
    tradingPairs: { usdt: 'SOLUSDT', usd: 'SOL-USD', usdc: 'SOLUSDC' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: true, polymarket: true, draftkings: true },
    benchmarkWeight: 0.12,
  },
  ripple: {
    assetId: 'ripple',
    symbol: 'XRP',
    name: 'XRP',
    category: 'PAYMENTS',
    color: '#23292F',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    precision: { priceDecimals: 4, sizeDecimals: 2, minOrderUSD: 5 },
    providerIds: {
      binance: 'XRPUSDT',
      coinbase: 'XRP-USD',
      coingecko: 'ripple',
      kalshi: 'KXXRP15M',
      polymarket: 'xrp-15m',
    },
    exchangeSymbols: ['XRP', 'RIPPLE', 'XRPUSDT', 'XRP-USD'],
    tradingPairs: { usdt: 'XRPUSDT', usd: 'XRP-USD' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: true, polymarket: true, draftkings: true },
    benchmarkWeight: 0.05,
  },
  dogecoin: {
    assetId: 'dogecoin',
    symbol: 'DOGE',
    name: 'Dogecoin',
    category: 'MEME',
    color: '#C2A633',
    badgeBg: 'rgba(194, 166, 51, 0.15)',
    precision: { priceDecimals: 4, sizeDecimals: 1, minOrderUSD: 5 },
    providerIds: {
      binance: 'DOGEUSDT',
      coinbase: 'DOGE-USD',
      coingecko: 'dogecoin',
      polymarket: 'doge-15m',
    },
    exchangeSymbols: ['DOGE', 'DOGECOIN', 'DOGEUSDT', 'DOGE-USD'],
    tradingPairs: { usdt: 'DOGEUSDT', usd: 'DOGE-USD' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: false, polymarket: true, draftkings: true },
    benchmarkWeight: 0.03,
  },
  cardano: {
    assetId: 'cardano',
    symbol: 'ADA',
    name: 'Cardano',
    category: 'LAYER_1',
    color: '#0033AD',
    badgeBg: 'rgba(0, 51, 173, 0.15)',
    precision: { priceDecimals: 4, sizeDecimals: 1, minOrderUSD: 5 },
    providerIds: {
      binance: 'ADAUSDT',
      coinbase: 'ADA-USD',
      coingecko: 'cardano',
      polymarket: 'ada-15m',
    },
    exchangeSymbols: ['ADA', 'CARDANO', 'ADAUSDT', 'ADA-USD'],
    tradingPairs: { usdt: 'ADAUSDT', usd: 'ADA-USD' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: false, polymarket: true, draftkings: true },
    benchmarkWeight: 0.02,
  },
  sui: {
    assetId: 'sui',
    symbol: 'SUI',
    name: 'Sui Network',
    category: 'LAYER_1',
    color: '#4DA2FF',
    badgeBg: 'rgba(77, 162, 255, 0.15)',
    precision: { priceDecimals: 4, sizeDecimals: 2, minOrderUSD: 5 },
    providerIds: {
      binance: 'SUIUSDT',
      coinbase: 'SUI-USD',
      coingecko: 'sui',
    },
    exchangeSymbols: ['SUI', 'SUIUSDT', 'SUI-USD'],
    tradingPairs: { usdt: 'SUIUSDT', usd: 'SUI-USD' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: false, polymarket: true, draftkings: false },
    benchmarkWeight: 0.02,
  },
  avalanche: {
    assetId: 'avalanche-2',
    symbol: 'AVAX',
    name: 'Avalanche',
    category: 'LAYER_1',
    color: '#E84142',
    badgeBg: 'rgba(232, 65, 66, 0.15)',
    precision: { priceDecimals: 2, sizeDecimals: 3, minOrderUSD: 5 },
    providerIds: {
      binance: 'AVAXUSDT',
      coinbase: 'AVAX-USD',
      coingecko: 'avalanche-2',
    },
    exchangeSymbols: ['AVAX', 'AVALANCHE', 'AVAXUSDT', 'AVAX-USD'],
    tradingPairs: { usdt: 'AVAXUSDT', usd: 'AVAX-USD' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: false, polymarket: true, draftkings: false },
    benchmarkWeight: 0.01,
  },
  chainlink: {
    assetId: 'chainlink',
    symbol: 'LINK',
    name: 'Chainlink',
    category: 'INFRASTRUCTURE',
    color: '#375BD2',
    badgeBg: 'rgba(55, 91, 210, 0.15)',
    precision: { priceDecimals: 3, sizeDecimals: 3, minOrderUSD: 5 },
    providerIds: {
      binance: 'LINKUSDT',
      coinbase: 'LINK-USD',
      coingecko: 'chainlink',
    },
    exchangeSymbols: ['LINK', 'CHAINLINK', 'LINKUSDT', 'LINK-USD'],
    tradingPairs: { usdt: 'LINKUSDT', usd: 'LINK-USD' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: false, polymarket: true, draftkings: false },
    benchmarkWeight: 0.01,
  },
  near: {
    assetId: 'near',
    symbol: 'NEAR',
    name: 'NEAR Protocol',
    category: 'LAYER_1',
    color: '#000000',
    badgeBg: 'rgba(255, 255, 255, 0.15)',
    precision: { priceDecimals: 3, sizeDecimals: 2, minOrderUSD: 5 },
    providerIds: {
      binance: 'NEARUSDT',
      coinbase: 'NEAR-USD',
      coingecko: 'near',
    },
    exchangeSymbols: ['NEAR', 'NEAR PROTOCOL', 'NEARUSDT', 'NEAR-USD'],
    tradingPairs: { usdt: 'NEARUSDT', usd: 'NEAR-USD' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: false, polymarket: true, draftkings: false },
    benchmarkWeight: 0.01,
  },
  binancecoin: {
    assetId: 'binancecoin',
    symbol: 'BNB',
    name: 'BNB Chain',
    category: 'LAYER_1',
    color: '#F3BA2F',
    badgeBg: 'rgba(243, 186, 47, 0.15)',
    precision: { priceDecimals: 2, sizeDecimals: 4, minOrderUSD: 10 },
    providerIds: {
      binance: 'BNBUSDT',
      coinbase: 'BNB-USD',
      coingecko: 'binancecoin',
    },
    exchangeSymbols: ['BNB', 'BINANCECOIN', 'BNBUSDT'],
    tradingPairs: { usdt: 'BNBUSDT', usd: 'BNB-USD' },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: true, takerFlow: true },
    predictionMarketSupport: { kalshi: false, polymarket: false, draftkings: false },
    benchmarkWeight: 0.02,
  },
};

/**
 * Fast lookup aliases map: maps any symbol/alias/id in uppercase/lowercase to CanonicalAsset
 */
const ALIAS_LOOKUP_MAP = new Map<string, CanonicalAsset>();

// Initialize alias index
Object.values(CANONICAL_CRYPTO_REGISTRY).forEach((asset) => {
  // Direct assetId
  ALIAS_LOOKUP_MAP.set(asset.assetId.toLowerCase(), asset);
  // Symbol
  ALIAS_LOOKUP_MAP.set(asset.symbol.toUpperCase(), asset);
  ALIAS_LOOKUP_MAP.set(asset.symbol.toLowerCase(), asset);
  // Name
  ALIAS_LOOKUP_MAP.set(asset.name.toLowerCase(), asset);
  // Exchange symbols
  asset.exchangeSymbols.forEach((alias) => {
    ALIAS_LOOKUP_MAP.set(alias.toUpperCase(), asset);
    ALIAS_LOOKUP_MAP.set(alias.toLowerCase(), asset);
  });
  // Provider IDs
  Object.values(asset.providerIds).forEach((pId) => {
    if (pId) {
      ALIAS_LOOKUP_MAP.set(pId.toUpperCase(), asset);
      ALIAS_LOOKUP_MAP.set(pId.toLowerCase(), asset);
    }
  });
});

/**
 * Authoritative Canonical Resolver
 * Guarantees that any query variant (e.g. 'BTC', 'bitcoin', 'btc', 'BTCUSDT', 'solana', 'SOL')
 * resolves strictly and immutably to its exact canonical identity without misidentification.
 */
export function resolveCanonicalAsset(queryOrSymbol?: string | null): CanonicalAsset {
  if (!queryOrSymbol) {
    return CANONICAL_CRYPTO_REGISTRY.bitcoin;
  }

  const clean = queryOrSymbol.toString().trim();
  if (!clean) return CANONICAL_CRYPTO_REGISTRY.bitcoin;

  // 1. Direct Lookup via Aliases Map
  const direct = ALIAS_LOOKUP_MAP.get(clean) || ALIAS_LOOKUP_MAP.get(clean.toUpperCase()) || ALIAS_LOOKUP_MAP.get(clean.toLowerCase());
  if (direct) {
    return direct;
  }

  // 2. Normalized Stripping (e.g. 'SOL/USDT' -> 'SOL', 'BTC-USD' -> 'BTC', 'SOL_USDC' -> 'SOL')
  const stripped = clean
    .toUpperCase()
    .replace(/[\/\-_]USDT$/, '')
    .replace(/[\/\-_]USDC$/, '')
    .replace(/[\/\-_]USD$/, '')
    .replace(/USDT$/, '')
    .replace(/USDC$/, '')
    .replace(/-USD$/, '')
    .replace(/\/USDT$/, '')
    .replace(/\/USD$/, '')
    .replace(/PERP$/, '')
    .trim();

  const strippedMatch = ALIAS_LOOKUP_MAP.get(stripped) || ALIAS_LOOKUP_MAP.get(stripped.toLowerCase());
  if (strippedMatch) {
    return strippedMatch;
  }

  // 3. Fallback: Dynamic construct for supported new crypto asset if not in registry
  const upper = clean.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  const fallbackAsset: CanonicalAsset = {
    assetId: upper.toLowerCase(),
    symbol: upper || 'BTC',
    name: upper || 'Bitcoin',
    category: 'LAYER_1',
    color: '#8B5CF6',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    precision: { priceDecimals: 2, sizeDecimals: 4, minOrderUSD: 5 },
    providerIds: {
      binance: `${upper}USDT`,
      coinbase: `${upper}-USD`,
      coingecko: upper.toLowerCase(),
    },
    exchangeSymbols: [upper, `${upper}USDT`],
    tradingPairs: { usdt: `${upper}USDT`, usd: `${upper}-USD` },
    status: 'ACTIVE',
    marketDataSupport: { spot: true, orderBook: true, klines: true, webSocket: true, derivatives: false, takerFlow: true },
    predictionMarketSupport: { kalshi: false, polymarket: true, draftkings: false },
    benchmarkWeight: 0.01,
  };

  return fallbackAsset;
}

/**
 * Returns all active canonical crypto assets in the universe
 */
export function getAllCanonicalAssets(): CanonicalAsset[] {
  return Object.values(CANONICAL_CRYPTO_REGISTRY);
}

/**
 * Data Integrity Guard: Validates that a requested asset matches the payload asset
 */
export function validateAssetIntegrity(
  requestedInput: string,
  payloadAssetIdOrSymbol: string
): { isValid: boolean; expected: CanonicalAsset; actual: CanonicalAsset } {
  const expected = resolveCanonicalAsset(requestedInput);
  const actual = resolveCanonicalAsset(payloadAssetIdOrSymbol);
  return {
    isValid: expected.assetId === actual.assetId,
    expected,
    actual,
  };
}
