// scripts/backfillKalshi.js
//
// Pulls real historical SETTLED Kalshi markets (not live ones) and loads them
// into settled_contracts. This is what lets you skip waiting weeks for live
// contracts to expire -- Kalshi keeps settlement history, we're just reading it.
//
// Run: node scripts/backfillKalshi.js --desk 1h --months 3

const fetch = require('node-fetch');
const { pool } = require('../lib/db');

const BASE_URL = 'https://trading-api.kalshi.com/trade-api/v2';

const DESK_SERIES = {
  '15m': 'KXBTC15M',
  '1h': 'KXBTC1H',
  '15s': 'KXBTC15S',
};

async function fetchSettledPage(series, cursor) {
  const params = new URLSearchParams({
    series_ticker: series,
    status: 'settled',
    limit: '200',
  });
  if (cursor) params.set('cursor', cursor);

  const res = await fetch(`${BASE_URL}/markets?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Kalshi fetch failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function backfillDesk(desk, monthsBack) {
  const series = DESK_SERIES[desk];
  if (!series) throw new Error(`Unknown desk: ${desk}`);

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  let cursor = null;
  let totalInserted = 0;
  let keepGoing = true;

  while (keepGoing) {
    const { markets, cursor: nextCursor } = await fetchSettledPage(series, cursor);
    if (!markets || markets.length === 0) break;

    for (const m of markets) {
      const closeTime = new Date(m.close_time);
      if (closeTime < cutoff) {
        keepGoing = false;
        continue;
      }

      const outcome = m.result === 'yes' ? 'YES' : m.result === 'no' ? 'NO' : null;
      if (!outcome) continue;

      const inserted = await pool.query(
        `INSERT INTO settled_contracts (venue, ticker, asset, desk, strike, outcome, settle_price, features, settled_at)
         VALUES ('kalshi', $1, 'BTC', $2, $3, $4, $5, $6, $7)
         ON CONFLICT (ticker) DO NOTHING
         RETURNING id`,
        [
          m.ticker,
          desk,
          m.strike_price ?? m.floor_strike ?? 0,
          outcome,
          m.settlement_value ?? m.strike_price ?? 0,
          JSON.stringify({}),
          m.close_time,
        ]
      );
      if (inserted.rowCount > 0) totalInserted++;
    }

    console.log(`[backfillKalshi] ${desk}: processed page, running total inserted = ${totalInserted}`);
    cursor = nextCursor;
    if (!cursor) break;
  }

  console.log(`[backfillKalshi] done with ${desk}: ${totalInserted} settled contracts inserted`);
  return totalInserted;
}

async function main() {
  const args = process.argv.slice(2);
  const desk = args.includes('--desk') ? args[args.indexOf('--desk') + 1] : '1h';
  const months = args.includes('--months') ? parseInt(args[args.indexOf('--months') + 1]) : 3;

  const count = await backfillDesk(desk, months);
  console.log(`\nTotal real settled contracts now available for training on ${desk}: check with:`);
  console.log(`  SELECT count(*) FROM settled_contracts WHERE desk = '${desk}';`);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[backfillKalshi] fatal error:', err);
    process.exit(1);
  });
}

module.exports = { backfillDesk };
