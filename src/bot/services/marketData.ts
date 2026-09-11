export interface MarketOverview {
  asset: string;
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap?: number;
  lastFetchedAt: number;
  isStale?: boolean;
  prediction: {
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    momentumScore: number;
    whalePressureScore: number;
    liquidityScore: number;
    volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    riskLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
    targetPrice: number;
    reasoning: string;
    brierScore: number;
    accuracy: number;
    totalSettled: number;
    // Authoritative lock facts, present only when the embed is built from a
    // real VIXY lock (broadcastSignalToDiscord). The slash-command path that
    // builds a MarketOverview from a live ticker leaves them undefined and the
    // embeds omit the corresponding fields rather than invent them.
    lockedProbability?: number;
    lockedAt?: string;
    lockRule?: string;
    strike?: number;
    // Measured win rate of settled locks in this engine score's bucket.
    scoreWinRatePct?: number | null;
    scoreWinRateSampleSize?: number | null;
    scoreBucket?: string | null;
  };
}

// A ticker reading as one venue returned it. Nothing is filled in: a venue that
// returns an incomplete ticker is treated as unavailable.
//
// This replaced fetchLiveMarketOverview. When Binance and Coinbase both failed,
// it served a stale cache entry of any age, or else $64,821.50, +2.45% and 18,450
// volume for every asset, with the 24h high/low at price +/-2%. It also attached
// a "prediction": a confidence, momentum, whale-pressure and liquidity score
// computed from the 24h change, a target at +/-0.45%, fixed "institutional taker
// buy delta" reasoning and a fixed record (Brier 0.168, 71.8%, 18,427 settled).
export interface MarketQuote {
  asset: string;
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  source: 'BINANCE' | 'COINBASE';
  lastFetchedAt: number;
}

// A fresh reading is reused for 30s to limit venue calls. An older one is never
// served in place of a failed fetch.
const quoteCache = new Map<string, MarketQuote>();
const CACHE_TTL_MS = 30000;

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  XRP: 'XRPUSDT',
  BNB: 'BNBUSDT',
  DOGE: 'DOGEUSDT',
};

type VenueReading = Omit<MarketQuote, 'asset' | 'symbol' | 'lastFetchedAt'>;
const allFinite = (...values: number[]) => values.every((v) => Number.isFinite(v));

async function fetchFromBinance(symbol: string): Promise<VenueReading | null> {
  const binanceSymbol = BINANCE_SYMBOLS[symbol] || `${symbol}USDT`;
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`, {
      headers: { 'User-Agent': 'VIXY-AI-Bot/1.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = parseFloat(json.lastPrice);
    const change24h = parseFloat(json.priceChangePercent);
    const high24h = parseFloat(json.highPrice);
    const low24h = parseFloat(json.lowPrice);
    const volume24h = parseFloat(json.volume);
    if (!allFinite(price, change24h, high24h, low24h, volume24h) || price <= 0) return null;
    return { price, change24h, high24h, low24h, volume24h, source: 'BINANCE' };
  } catch {
    return null;
  }
}

async function fetchFromCoinbase(symbol: string): Promise<VenueReading | null> {
  try {
    const res = await fetch(`https://api.exchange.coinbase.com/products/${symbol}-USD/stats`, {
      headers: { 'User-Agent': 'VIXY-AI-Bot/1.0' },
    });
    if (!res.ok) return null;
    const stats = await res.json();
    const price = parseFloat(stats.last);
    const open = parseFloat(stats.open);
    const high24h = parseFloat(stats.high);
    const low24h = parseFloat(stats.low);
    const volume24h = parseFloat(stats.volume);
    // The 24h change needs a real open; it used to read 0% without one.
    if (!allFinite(price, open, high24h, low24h, volume24h) || price <= 0 || open <= 0) return null;
    const change24h = Math.round(((price - open) / open) * 10000) / 100;
    return { price, change24h, high24h, low24h, volume24h, source: 'COINBASE' };
  } catch {
    return null;
  }
}

export async function fetchLiveMarketQuote(assetInput: string = 'BTC'): Promise<MarketQuote> {
  const symbol = assetInput.toUpperCase().replace('USDT', '').replace('USD', '').trim() || 'BTC';
  const now = Date.now();
  const cached = quoteCache.get(symbol);
  if (cached && now - cached.lastFetchedAt < CACHE_TTL_MS) return cached;

  const reading = (await fetchFromBinance(symbol)) || (await fetchFromCoinbase(symbol));
  if (!reading) {
    throw new Error(`MARKET_DATA_UNAVAILABLE: no complete ${symbol} ticker from Binance or Coinbase`);
  }
  const quote: MarketQuote = { asset: `${symbol}/USD`, symbol, ...reading, lastFetchedAt: now };
  quoteCache.set(symbol, quote);
  return quote;
}
