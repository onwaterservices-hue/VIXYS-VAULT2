// scripts/backfillFeatures.js
//
// For every settled_contracts row that's missing real features, pulls real
// historical price candles from Binance (free, no key needed) around the
// settlement time and computes the same momentum/volatility features the
// live engine uses -- so the training set is consistent with what the live
// model will see.

const fetch = require('node-fetch');
const { pool } = require('../lib/db');

const BINANCE_KLINES = 'https://api.binance.com/api/v3/klines';

async function fetchKlines(symbol, endTime, lookbackMinutes) {
  const startTime = endTime - lookbackMinutes * 60 * 1000;
  const params = new URLSearchParams({
    symbol,
    interval: '1m',
    startTime: String(startTime),
    endTime: String(endTime),
    limit: '1000',
  });
  const res = await fetch(`${BINANCE_KLINES}?${params}`);
  if (!res.ok) throw new Error(`Binance klines fetch failed: ${res.status}`);
  return res.json();
}

function computeMomentum(closes) {
  if (closes.length < 2) return null;
  return (closes[closes.length - 1] - closes[0]) / closes[0];
}

function computeVolatility(closes) {
  if (closes.length < 3) return null;
  const logReturns = [];
  for (let i = 1; i < closes.length; i++) {
    logReturns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / logReturns.length;
  return Math.sqrt(variance);
}

async function backfillRow(row) {
  const settleTimeMs = new Date(row.settled_at).getTime();
  const symbol = `${row.asset}USDT`;

  const klines = await fetchKlines(symbol, settleTimeMs, 20);
  if (!klines || klines.length === 0) return false;

  const closes = klines.map((k) => parseFloat(k[4]));
  const closes5m = closes.slice(-5);
  const closes15m = closes;

  const features = {
    orderBookImbalance: null,
    momentum5m: computeMomentum(closes5m),
    momentum15m: computeMomentum(closes15m),
    volatility15m: computeVolatility(closes15m),
    backfilled: true,
    source: 'binance_klines_1m',
  };

  await pool.query(`UPDATE settled_contracts SET features = $1 WHERE id = $2`, [
    JSON.stringify(features),
    row.id,
  ]);
  return true;
}

async function main() {
  const { rows } = await pool.query(
    `SELECT id, asset, settled_at FROM settled_contracts
     WHERE features->>'backfilled' IS NULL
     ORDER BY settled_at ASC`
  );

  console.log(`[backfillFeatures] ${rows.length} settled contracts need features computed`);

  let done = 0;
  for (const row of rows) {
    try {
      const ok = await backfillRow(row);
      if (ok) done++;
      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      console.error(`[backfillFeatures] failed for row ${row.id}:`, err.message);
    }
    if (done % 100 === 0 && done > 0) {
      console.log(`[backfillFeatures] progress: ${done}/${rows.length}`);
    }
  }

  console.log(`[backfillFeatures] done: ${done}/${rows.length} rows now have real historical features`);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[backfillFeatures] fatal error:', err);
    process.exit(1);
  });
}

module.exports = { backfillRow };
