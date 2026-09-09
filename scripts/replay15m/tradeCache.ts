// Coinbase Exchange TRADE-LEVEL history, aggregated to fixed-width observation
// buckets, cached on disk.
//
// WHY THIS EXISTS
//   The 1-minute-candle replay cannot reproduce the engine's behaviour. The
//   pipeline reads getPriceAtAgo(15 | 30 | 60 | 300 | 900) off rollingBtcTicks.
//   Production fills that buffer roughly every 3 seconds; 1-minute candles fill
//   it once a minute, so the 15s, 30s and 60s lookbacks all resolve to the SAME
//   previous-minute price. Three of five timeframe votes collapse into one on
//   ~85% of ticks, inflating evidence agreement, confidence and lock quality.
//
//   Trades give real sub-second history, so the buffer can be filled at
//   production's cadence.
//
// NO SYNTHETIC DATA
//   Buckets are formed only from trades that actually printed. A bucket that
//   contains no trades gets NO new price of its own: `price` is carried from the
//   last real trade and the bucket is flagged `synthetic: false, empty: true`
//   with tradeCount 0. That carry-forward is faithful rather than invented --
//   production polls Coinbase's spot price every 3s, and with no intervening
//   trade that endpoint returns the same last-trade price. The count of empty
//   buckets is reported so the reader can judge it.
//
//   Nothing is interpolated. No price is ever manufactured between two trades.
//
// PAGINATION
//   Coinbase pages trades backwards by trade_id via the cb-after header. There
//   is no time-range query, so a window is reached by walking back from the
//   newest trade. Windows ending at "now" are therefore cheap; windows far in
//   the past are not.
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface RawTrade {
  trade_id: number;
  side: 'buy' | 'sell';
  size: string;
  price: string;
  time: string;
}

/** One observation bucket: everything real that happened in [tsMs, tsMs+width). */
export interface TradeTick {
  tsMs: number;
  price: number;        // last trade price in the bucket, or carried forward
  tradeCount: number;
  buyVolume: number;    // taker BUY size -- real aggressor side, not derived
  sellVolume: number;   // taker SELL size
  high: number | null;
  low: number | null;
  empty: boolean;       // true when no trade printed in this bucket
}

export interface TradeStats {
  bucketSeconds: number;
  bucketsTotal: number;
  bucketsWithTrades: number;
  bucketsEmpty: number;
  tradesUsed: number;
  requests: number;
  hoursFromCache: number;
  hoursFetched: number;
  coverageStartMs: number | null;
  coverageEndMs: number | null;
}

const PRODUCT = 'BTC-USD';
const ENDPOINT = `https://api.exchange.coinbase.com/products/${PRODUCT}/trades`;
const HOUR_MS = 3600_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cacheDir(root: string, bucketSeconds: number) {
  const dir = join(root, '.cache', 'replay15m', `${PRODUCT}-trades-${bucketSeconds}s`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function fetchPage(after: number | null, attempt = 1): Promise<{ trades: RawTrade[]; after: number | null }> {
  const url = `${ENDPOINT}?limit=1000${after !== null ? `&after=${after}` : ''}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'vixy-replay15m/1.0' } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 6) throw new Error(`HTTP ${res.status} after ${attempt} attempts`);
    await sleep(400 * attempt);
    return fetchPage(after, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const trades = (await res.json()) as RawTrade[];
  const nextAfter = res.headers.get('cb-after');
  return { trades, after: nextAfter ? Number(nextAfter) : null };
}

/** Fold raw trades into fixed-width buckets. Only real prints contribute. */
function bucketize(trades: RawTrade[], bucketSeconds: number): Map<number, TradeTick> {
  const width = bucketSeconds * 1000;
  const buckets = new Map<number, TradeTick>();
  for (const t of trades) {
    const ms = Date.parse(t.time);
    if (!Number.isFinite(ms)) continue;
    const price = parseFloat(t.price);
    const size = parseFloat(t.size);
    if (!Number.isFinite(price) || price <= 0) continue;
    const key = Math.floor(ms / width) * width;
    let b = buckets.get(key);
    if (!b) {
      b = { tsMs: key, price, tradeCount: 0, buyVolume: 0, sellVolume: 0, high: price, low: price, empty: false };
      buckets.set(key, b);
    }
    b.tradeCount += 1;
    // Coinbase reports `side` as the MAKER side, so the taker (aggressor) is the
    // opposite: side "sell" means the resting order was a sell, i.e. the taker
    // bought. This is the real aggressor split, not a proxy derived from price.
    if (t.side === 'sell') b.buyVolume += size; else b.sellVolume += size;
    if (b.high === null || price > b.high) b.high = price;
    if (b.low === null || price < b.low) b.low = price;
    // trades arrive newest-first within a page; the LAST trade of the bucket in
    // time order is the one with the greatest timestamp, so track it explicitly
    if (ms >= (b as any)._lastMs ?? -Infinity) { (b as any)._lastMs = ms; b.price = price; }
  }
  for (const b of buckets.values()) delete (b as any)._lastMs;
  return buckets;
}

/**
 * Returns observation ticks covering [startMs, endMs) at `bucketSeconds`
 * resolution, ascending. Complete UTC hours are cached; a partial trailing hour
 * is never cached (it would be incomplete forever).
 */
export async function getTradeTicks(
  root: string,
  startMs: number,
  endMs: number,
  opts: { offline?: boolean; bucketSeconds?: number; onProgress?: (msg: string) => void } = {},
): Promise<{ ticks: TradeTick[]; stats: TradeStats }> {
  const bucketSeconds = opts.bucketSeconds ?? 3;
  const dir = cacheDir(root, bucketSeconds);
  const width = bucketSeconds * 1000;

  const hourKeys: number[] = [];
  for (let h = Math.floor(startMs / HOUR_MS) * HOUR_MS; h < endMs; h += HOUR_MS) hourKeys.push(h);

  const stats: TradeStats = {
    bucketSeconds, bucketsTotal: 0, bucketsWithTrades: 0, bucketsEmpty: 0,
    tradesUsed: 0, requests: 0, hoursFromCache: 0, hoursFetched: 0,
    coverageStartMs: null, coverageEndMs: null,
  };

  const cached = new Map<number, TradeTick[]>();
  const missing: number[] = [];
  for (const h of hourKeys) {
    const f = join(dir, `${h}.json`);
    if (existsSync(f)) {
      try { cached.set(h, JSON.parse(readFileSync(f, 'utf8'))); stats.hoursFromCache++; continue; } catch { /* refetch */ }
    }
    missing.push(h);
  }

  if (missing.length) {
    if (opts.offline) {
      throw new Error(
        `--offline requested but ${missing.length} hour(s) of trade data are not cached ` +
        `(earliest ${new Date(missing[0]).toISOString()}).\n` +
        `Run once without --offline to populate ${dir}`,
      );
    }
    // Walk backwards from the newest trade until we pass the window start.
    const need = Math.min(...missing);
    const collected: RawTrade[] = [];
    let after: number | null = null;
    let oldestSeen = Infinity;
    let guard = 0;
    const MAX_REQUESTS = 20000;
    while (oldestSeen > need && guard < MAX_REQUESTS) {
      const page = await fetchPage(after);
      stats.requests++; guard++;
      if (!page.trades.length) break;
      for (const t of page.trades) {
        const ms = Date.parse(t.time);
        if (ms < oldestSeen) oldestSeen = ms;
        if (ms >= need && ms < endMs) collected.push(t);
      }
      after = page.after;
      if (after === null) break;
      if (guard % 25 === 0) {
        opts.onProgress?.(
          `  trades: ${stats.requests} requests, back to ${new Date(oldestSeen).toISOString()}, ${collected.length} in window`,
        );
      }
      await sleep(120);
    }
    stats.tradesUsed = collected.length;

    const all = bucketize(collected, bucketSeconds);
    // Group into hours and persist only COMPLETE hours.
    const nowMs = Date.now();
    const byHour = new Map<number, TradeTick[]>();
    for (const b of [...all.values()].sort((a, b2) => a.tsMs - b2.tsMs)) {
      const h = Math.floor(b.tsMs / HOUR_MS) * HOUR_MS;
      if (!byHour.has(h)) byHour.set(h, []);
      byHour.get(h)!.push(b);
    }
    for (const h of missing) {
      const rows = byHour.get(h) || [];
      cached.set(h, rows);
      const hourComplete = h + HOUR_MS <= Math.min(endMs, nowMs);
      if (hourComplete && rows.length) {
        writeFileSync(join(dir, `${h}.json`), JSON.stringify(rows));
        stats.hoursFetched++;
      }
    }
  }

  // Flatten, then fill gaps by carrying the last REAL price forward.
  const real = new Map<number, TradeTick>();
  for (const h of hourKeys) for (const b of cached.get(h) || []) real.set(b.tsMs, b);

  const ticks: TradeTick[] = [];
  let lastPrice: number | null = null;
  const firstKey = Math.floor(startMs / width) * width;
  for (let ts = firstKey; ts < endMs; ts += width) {
    const b = real.get(ts);
    if (b) {
      lastPrice = b.price;
      ticks.push(b);
      stats.bucketsWithTrades++;
    } else if (lastPrice !== null) {
      // No print in this window. Production's 3s spot poll would have returned
      // the same last-trade price, so the price is carried, NOT invented, and
      // the bucket is marked empty with zero volume.
      ticks.push({ tsMs: ts, price: lastPrice, tradeCount: 0, buyVolume: 0, sellVolume: 0, high: null, low: null, empty: true });
      stats.bucketsEmpty++;
    } else {
      // Before the first observed trade there is nothing to carry. Emit nothing.
      continue;
    }
    stats.bucketsTotal++;
  }

  if (ticks.length) {
    stats.coverageStartMs = ticks[0].tsMs;
    stats.coverageEndMs = ticks[ticks.length - 1].tsMs;
  }
  return { ticks, stats };
}

export function describeTradeCache(root: string, bucketSeconds = 3) {
  const dir = cacheDir(root, bucketSeconds);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  const hours = files.map((f) => Number(f.replace('.json', ''))).sort((a, b) => a - b);
  return {
    dir,
    hours: hours.length,
    earliest: hours.length ? new Date(hours[0]).toISOString() : null,
    latest: hours.length ? new Date(hours[hours.length - 1] + HOUR_MS).toISOString() : null,
  };
}
