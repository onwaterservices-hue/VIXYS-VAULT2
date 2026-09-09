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
  duplicatesDropped: number;   // same trade_id seen twice across pages (should be 0)
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
  let res: Response;
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'vixy-replay15m/1.0' } });
  } catch (err) {
    // Network-level failure (ECONNRESET, DNS, timeout). A 21-day walk died on
    // one of these after 8,525 requests; retry with backoff instead of dying.
    if (attempt >= 8) throw err;
    await sleep(1000 * attempt);
    return fetchPage(after, attempt + 1);
  }
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
function bucketize(trades: RawTrade[], bucketSeconds: number, into?: Map<number, TradeTick>): Map<number, TradeTick> {
  const width = bucketSeconds * 1000;
  const buckets = into ?? new Map<number, TradeTick>();
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
    // time order is the one with the greatest timestamp, so track it explicitly.
    // (Previously `ms >= (b as any)._lastMs ?? -Infinity`, which parses as
    // `(ms >= undefined) ?? -Infinity` === false, so the price never updated
    // after the first print. Caught by tests/replay-harness.invariants.mjs.)
    const lastMs = (b as any)._lastMs ?? -Infinity;
    if (ms >= lastMs) { (b as any)._lastMs = ms; b.price = price; }
  }
  return buckets;
}
const stripLastMs = (rows: TradeTick[]) => rows.map((b) => { const c = { ...b } as any; delete c._lastMs; return c as TradeTick; });

/**
 * Binary-search a trade_id cursor whose newest trade is at or after targetMs,
 * so a walk can START at the top of the missing span instead of at "now".
 * ~20 probe requests replace thousands of pages of already-cached history.
 */
async function seekCursorAtOrAfter(targetMs: number): Promise<number | null> {
  const head = await fetchPage(null);
  if (!head.trades.length) return null;
  let hiId = head.trades[0].trade_id;            // newest
  const headOldest = Date.parse(head.trades[head.trades.length - 1].time);
  if (headOldest <= targetMs) return null;        // target is within the first page: no seek needed
  let loId = Math.max(1, hiId - 20_000_000);      // ~40 days of prints at ~5/s
  for (let i = 0; i < 40 && hiId - loId > 1500; i++) {
    const midId = Math.floor((loId + hiId) / 2);
    const pg = await fetchPage(midId + 1000);     // returns ids < midId+1000, i.e. around midId
    await sleep(120);
    if (!pg.trades.length) { loId = midId; continue; }
    const newestMs = Date.parse(pg.trades[0].time);
    if (newestMs >= targetMs) hiId = midId; else loId = midId;
  }
  return hiId + 1000;                             // cursor: first page will contain ids just below hiId+1000
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
    tradesUsed: 0, duplicatesDropped: 0, requests: 0, hoursFromCache: 0, hoursFetched: 0,
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
    // Walk backwards until we pass the OLDEST missing hour. Start at a cursor
    // seeked to just after the NEWEST missing hour so cached history above it is
    // not re-paged. Pages are folded into buckets immediately -- raw trades are
    // never retained (a 21-day walk holding ~9M raw prints ran out of memory).
    const need = Math.min(...missing);
    const writtenHours = new Set<number>();
    const newestMissingEnd = Math.max(...missing) + HOUR_MS;
    const folded = new Map<number, TradeTick>();
    let prevPageIds = new Set<number>();          // pages are contiguous, so overlap can only be with the previous page
    let after: number | null = null;
    try { after = await seekCursorAtOrAfter(newestMissingEnd + 60_000); } catch { after = null; }
    opts.onProgress?.(after === null ? '  trades: walking from the newest print' : `  trades: seeked cursor ${after} near ${new Date(newestMissingEnd).toISOString()}`);
    let oldestSeen = Infinity;
    let guard = 0;
    const MAX_REQUESTS = 20000;
    while (oldestSeen > need && guard < MAX_REQUESTS) {
      const page = await fetchPage(after);
      stats.requests++; guard++;
      if (!page.trades.length) break;
      const keep: RawTrade[] = []; const ids = new Set<number>();
      for (const t of page.trades) {
        const ms = Date.parse(t.time);
        if (ms < oldestSeen) oldestSeen = ms;
        ids.add(t.trade_id);
        if (prevPageIds.has(t.trade_id)) { stats.duplicatesDropped++; continue; }
        if (ms >= need && ms < endMs) keep.push(t);
      }
      prevPageIds = ids;
      stats.tradesUsed += keep.length;
      bucketize(keep, bucketSeconds, folded);
      after = page.after;
      if (after === null) break;
      // Checkpoint: any missing hour whose whole span lies ABOVE oldestSeen has
      // been fully walked; persist it now and drop its buckets from memory.
      if (guard % 50 === 0 || oldestSeen <= need) {
        const nowMs0 = Date.now();
        for (const h of missing) {
          if (writtenHours.has(h)) continue;
          if (!(h > oldestSeen) || !(h + HOUR_MS <= Math.min(endMs, nowMs0))) continue;
          const rows: TradeTick[] = [];
          for (const [ts, b] of folded) if (ts >= h && ts < h + HOUR_MS) { rows.push(b); }
          rows.sort((a, b) => a.tsMs - b.tsMs);
          if (rows.length) { writeFileSync(join(dir, `${h}.json`), JSON.stringify(stripLastMs(rows))); writtenHours.add(h); stats.hoursFetched++; }
          for (const [ts] of folded) if (ts >= h && ts < h + HOUR_MS) folded.delete(ts);
        }
      }
      if (guard % 25 === 0) {
        opts.onProgress?.(
          `  trades: ${stats.requests} requests, back to ${new Date(oldestSeen).toISOString()}, ${stats.tradesUsed} kept, ${writtenHours.size} hours checkpointed`,
        );
      }
      await sleep(120);
    }
    // Final flush: whatever complete missing hours remain in memory.
    const nowMs = Date.now();
    for (const h of missing) {
      if (writtenHours.has(h)) { cached.set(h, JSON.parse(readFileSync(join(dir, `${h}.json`), 'utf8'))); continue; }
      const rows: TradeTick[] = []; for (const [ts, b] of folded) if (ts >= h && ts < h + HOUR_MS) rows.push(b);
      rows.sort((a, b) => a.tsMs - b.tsMs);
      const clean = stripLastMs(rows);
      cached.set(h, clean);
      const hourComplete = h + HOUR_MS <= Math.min(endMs, nowMs) && oldestSeen <= h;
      if (hourComplete && clean.length) { writeFileSync(join(dir, `${h}.json`), JSON.stringify(clean)); writtenHours.add(h); stats.hoursFetched++; }
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
