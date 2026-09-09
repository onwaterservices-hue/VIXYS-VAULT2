// Coinbase Exchange 1-minute candle source with an on-disk cache.
//
// Reruns must be deterministic and offline, so every chunk fetched is written
// to .cache/replay15m/ and read back from there on subsequent runs. A run whose
// window is fully cached makes no network calls at all; --offline turns a cache
// miss into a hard error rather than a fetch.
//
// There is no synthetic data here. A gap in Coinbase's history stays a gap: the
// minute is absent from the returned series and the replay reports the missing
// coverage rather than interpolating across it.
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface Candle {
  time: number;   // unix seconds, start of the minute
  low: number;
  high: number;
  open: number;
  close: number;
  volume: number;
}

const PRODUCT = 'BTC-USD';
const GRANULARITY = 60;
// Coinbase caps a candles response at 300 rows, so a chunk is 300 minutes.
const CHUNK_SECONDS = 300 * GRANULARITY;
const ENDPOINT = `https://api.exchange.coinbase.com/products/${PRODUCT}/candles`;

export interface FetchStats {
  chunksTotal: number;
  chunksFromCache: number;
  chunksFetched: number;
  chunksFailed: number;
  candlesReturned: number;
  minutesExpected: number;
  minutesMissing: number;
}

function cacheDir(root: string) {
  const dir = join(root, '.cache', 'replay15m', `${PRODUCT}-${GRANULARITY}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchChunk(startSec: number, endSec: number, attempt = 1): Promise<Candle[]> {
  const url = `${ENDPOINT}?granularity=${GRANULARITY}`
    + `&start=${new Date(startSec * 1000).toISOString()}`
    + `&end=${new Date(endSec * 1000).toISOString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'vixy-replay15m/1.0' } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`HTTP ${res.status} after ${attempt} attempts`);
    await sleep(500 * attempt);
    return fetchChunk(startSec, endSec, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error('candles response was not an array');
  // Coinbase returns [time, low, high, open, close, volume], newest first.
  return rows.map((r: number[]) => ({
    time: r[0], low: r[1], high: r[2], open: r[3], close: r[4], volume: r[5],
  }));
}

/**
 * Returns every 1-minute candle in [startSec, endSec), ascending by time, with
 * duplicates removed. Chunks are cached individually so a widened window only
 * fetches what it does not already have.
 */
export async function getCandles(
  root: string,
  startSec: number,
  endSec: number,
  opts: { offline?: boolean; onProgress?: (done: number, total: number) => void } = {},
): Promise<{ candles: Candle[]; stats: FetchStats }> {
  const dir = cacheDir(root);
  const firstChunk = Math.floor(startSec / CHUNK_SECONDS) * CHUNK_SECONDS;
  const chunkStarts: number[] = [];
  for (let s = firstChunk; s < endSec; s += CHUNK_SECONDS) chunkStarts.push(s);

  const stats: FetchStats = {
    chunksTotal: chunkStarts.length,
    chunksFromCache: 0, chunksFetched: 0, chunksFailed: 0,
    candlesReturned: 0, minutesExpected: 0, minutesMissing: 0,
  };

  const byTime = new Map<number, Candle>();
  let done = 0;
  for (const chunkStart of chunkStarts) {
    const file = join(dir, `${chunkStart}.json`);
    let rows: Candle[] | null = null;

    if (existsSync(file)) {
      try {
        rows = JSON.parse(readFileSync(file, 'utf8'));
        stats.chunksFromCache++;
      } catch {
        rows = null; // corrupt cache entry -- refetch below
      }
    }

    if (rows === null) {
      if (opts.offline) {
        throw new Error(
          `--offline was requested but chunk ${new Date(chunkStart * 1000).toISOString()} is not cached.\n`
          + `Run once without --offline to populate ${dir}`,
        );
      }
      try {
        rows = await fetchChunk(chunkStart, chunkStart + CHUNK_SECONDS);
        writeFileSync(file, JSON.stringify(rows));
        stats.chunksFetched++;
        await sleep(220); // stay well inside the public rate limit
      } catch (err) {
        // A failed chunk is recorded as missing coverage, never filled in.
        stats.chunksFailed++;
        console.error(`  ! chunk ${new Date(chunkStart * 1000).toISOString()} failed: ${(err as Error).message}`);
        rows = [];
      }
    }

    for (const c of rows) {
      if (c.time >= startSec && c.time < endSec) byTime.set(c.time, c);
    }
    opts.onProgress?.(++done, chunkStarts.length);
  }

  const candles = [...byTime.values()].sort((a, b) => a.time - b.time);
  stats.candlesReturned = candles.length;
  stats.minutesExpected = Math.floor((endSec - startSec) / 60);
  stats.minutesMissing = Math.max(0, stats.minutesExpected - candles.length);
  return { candles, stats };
}
