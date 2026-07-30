import { HistoricalPrediction, SupportTicket, AdminStats } from '../types';

// Generator for 150 realistic backtested and live-logged prediction trades
function generatePredictions(): HistoricalPrediction[] {
  const assets = ['BTC', 'ETH', 'SOL', 'NVDA', 'SPY', 'XRP', 'DOGE', 'SUI'];
  const timeframes: ('15S' | '15M' | '1H')[] = ['15M', '15M', '15M', '1H', '15S']; // weighted towards 15M
  const basePrices: Record<string, number> = {
    BTC: 64200,
    ETH: 3450,
    SOL: 158.50,
    NVDA: 135.20,
    SPY: 552.00,
    XRP: 0.585,
    DOGE: 0.125,
    SUI: 1.88,
  };

  const predictions: HistoricalPrediction[] = [];
  const now = Date.now();

  // Pseudo-random seedable generator for deterministic results
  let seed = 12345;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < 150; i++) {
    const asset = assets[i % assets.length];
    const timeframe = timeframes[Math.floor(random() * timeframes.length)];
    const basePrice = basePrices[asset];
    
    // Time delta: spread out over past 5 days
    const minutesAgo = (i + 1) * 25 + Math.floor(random() * 15);
    const timestamp = now - minutesAgo * 60 * 1000;
    const dateObj = new Date(timestamp);
    const timeString = `${dateObj.getUTCMonth() + 1}/${dateObj.getUTCDate()} ${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')} UTC`;

    // Direction & Win Rate (~76% win rate calibrated)
    const isWin = random() < 0.76;
    const direction: 'YES' | 'NO' = random() > 0.45 ? 'YES' : 'NO';
    const confidence = Math.floor(72 + random() * 24); // 72% to 96%
    const edge = Math.round((2.5 + random() * 8.5) * 10) / 10; // 2.5% to 11.0%

    // Target vs actual price variance
    const variancePct = (random() * 0.012 + 0.002) * (direction === 'YES' ? 1 : -1);
    const targetPrice = Number((basePrice * (1 + (random() - 0.5) * 0.01)).toFixed(asset === 'XRP' || asset === 'DOGE' ? 4 : 2));
    let actualClose: number;

    if (isWin) {
      actualClose = direction === 'YES' 
        ? Number((targetPrice * (1 + Math.abs(variancePct))).toFixed(asset === 'XRP' || asset === 'DOGE' ? 4 : 2))
        : Number((targetPrice * (1 - Math.abs(variancePct))).toFixed(asset === 'XRP' || asset === 'DOGE' ? 4 : 2));
    } else {
      actualClose = direction === 'YES' 
        ? Number((targetPrice * (1 - Math.abs(variancePct))).toFixed(asset === 'XRP' || asset === 'DOGE' ? 4 : 2))
        : Number((targetPrice * (1 + Math.abs(variancePct))).toFixed(asset === 'XRP' || asset === 'DOGE' ? 4 : 2));
    }

    const pnlPct = isWin 
      ? Math.round((4.2 + random() * 6.5) * 10) / 10 
      : -Math.round((3.1 + random() * 4.2) * 10) / 10;

    const hashPart = Math.floor(random() * 0xffffff).toString(16).padStart(6, '0');
    const hashPart2 = Math.floor(random() * 0xffffff).toString(16).padStart(6, '0');

    predictions.push({
      id: `SIG-${9950 - i}`,
      timeString,
      timestamp,
      asset,
      timeframe,
      targetPrice,
      actualClose,
      direction,
      confidence,
      edge,
      result: isWin ? 'WIN' : 'LOSS',
      pnlPct,
      hash: `0x${hashPart}...${hashPart2}`,
    });
  }

  return predictions;
}

export const INITIAL_HISTORICAL_PREDICTIONS: HistoricalPrediction[] = generatePredictions();

export const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'TICK-402',
    userEmail: 'trader88@quantfund.io',
    subject: 'Discord Webhook latency delay on 15m candle close',
    category: 'Alerts & Webhooks',
    status: 'IN_PROGRESS',
    date: '10 mins ago',
    priority: 'HIGH',
  },
  {
    id: 'TICK-401',
    userEmail: 'crypto_marco@gmail.com',
    subject: 'Request API key documentation for automated execution',
    category: 'API Access',
    status: 'OPEN',
    date: '1 hour ago',
    priority: 'MEDIUM',
  },
  {
    id: 'TICK-400',
    userEmail: 'sarah.v@alpha.capital',
    subject: 'Billing upgrade from Pro to Elite tier',
    category: 'Subscription',
    status: 'RESOLVED',
    date: '3 hours ago',
    priority: 'LOW',
  },
];

export const INITIAL_ADMIN_STATS: AdminStats = {
  mrr: 12450,
  activeSubscribers: 248,
  predictionsToday: 96,
  winRate: 88.4,
  apiLatencyMs: 14,
  serverStatus: 'HEALTHY',
  totalPredictionsAnalyzed: 4812,
  brierScore: 0.084,
};
