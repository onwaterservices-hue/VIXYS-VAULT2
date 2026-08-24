// scripts/backfillFeatures15s.js
//
// Same purpose as backfillFeatures.js, but for the 15s scalp desk, which
// needs finer time resolution than 1-minute candles can give.
//
// HONEST LIMITATION: Binance's public kline API supports a '1s' interval,
// but only retains it for a limited recent lookback window (their docs
// don't guarantee deep 1s history the way 1m/1h candles go back years).
// So the 15s desk's backfill will realistically cover a shorter real
// history than 15m/1h -- which is exactly why the model for this desk
// will hit its MIN_TRAINING_SAMPLES threshold later than the others.
// That's not a bug to work around, it's just what the data actually
// supports -- don't stretch this backfill by interpolating fake sub-minute
// prices from 1m candles.
//
// Run: node scripts/backfillFeatures15s.js

const fetch = require('node-fetch');
const { pool } = require('../lib/db');

const BINANCE_KLINES = 'https://api.binance.com/api/v3/klines';

async function fetchSecondKlines(symbol, endTime, lookbackSeconds) {
  const startTime = endTime - lookbackSeconds * 1000;
  const params = new URLSearchParams({
    symbol,
    interval: '1s',
    startTime: String(startTime),
    endTime: String(endTime),
    limit: '1000',
  });
  const res = await fetch(`${BINANCE_KLINES}?${params}`);
  if (!res.ok) {
    if (res.status === 400) return null; // likely out of the retained 1s history window
    throw new Error(`Binance 1s klines fetch failed: ${res.status}`);
  }
  return res.json();
}

function computeMomentum(closes) {
  if (closes.length < 2) return null;
  return (closes[closes.length - 1] - closes[0]) / closes[0];
}

function computeVolatility(closes) {
  if (closes.length < 3) return null;
  const logReturns = [];
  for (let i = 1; i < closes.length; i++) logReturns.push(Math.log(closes[i] / closes[i - 1]));
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / logReturns.length;
  return Math.sqrt(variance);
}

async function backfillRow(row) {
  const settleTimeMs = new Date(row.settled_at).getTime();
  const symbol = `${row.asset}USDT`;

  const klines = await fetchSecondKlines(symbol, settleTimeMs, 60); // 60s window for a 15s desk
  if (!klines || klines.length === 0) return 'no_data';

  const closes = klines.map((k) => parseFloat(k[4]));
  const closes15s = closes.slice(-15);

  const features = {
    orderBookImbalance: null, // unavailable historically, same caveat as the other backfill
    momentum5m: null,         // not meaningful at 15s desk resolution -- left null on purpose
    momentum15m: null,
    momentum15s: computeMomentum(closes15s),
    volatility15m: computeVolatility(closes),
    backfilled: true,
    source: 'binance_klines_1s',
  };

  await pool.query(`UPDATE settled_contracts SET features = $1 WHERE id = $2`, [
    JSON.stringify(features),
    row.id,
  ]);
  return 'ok';
}

async function main() {
  const { rows } = await pool.query(
    `SELECT id, asset, settled_at FROM settled_contracts
     WHERE desk = '15s' AND features->>'backfilled' IS NULL
     ORDER BY settled_at ASC`
  );

  console.log(`[backfillFeatures15s] ${rows.length} settled 15s contracts to process`);

  let ok = 0;
  let noData = 0;
  for (const row of rows) {
    try {
      const result = await backfillRow(row);
      if (result === 'ok') ok++;
      else noData++;
      await new Promise((r) => setTimeout(r, 150)); // stay well under Binance's rate limit
    } catch (err) {
      console.error(`[backfillFeatures15s] failed for row ${row.id}:`, err.message);
    }
  }

  console.log(`[backfillFeatures15s] done: ${ok} rows filled, ${noData} skipped (outside Binance's retained 1s history)`);
  if (noData > rows.length * 0.5) {
    console.log(
      `[backfillFeatures15s] note: most rows had no 1s history available. This desk's real training set will build up mainly from LIVE capture going forward, not backfill -- that's expected, not an error.`
    );
  }
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[backfillFeatures15s] fatal error:', err);
    process.exit(1);
  });
}

module.exports = { backfillRow };
