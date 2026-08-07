# VIXY AI -- signal engine

Real-time crypto prediction market engine for the 15s scalp desk and 1H desk.
Every number the UI shows traces back to a real API call or a real database row.

## How the pieces fit together

```
Binance WS (price + order book) ---\
                                     >--> Postgres/Timescale --> features.js --> signalEngine.js --> /api/signal
Kalshi API (live odds)  -----------/                                                     |
                                                                                            v
                                                                                   signal_history (logged pre-outcome)
                                                                                            |
                                                                          settlementJob.js (cron, every 5 min)
                                                                                            |
                                                                                            v
                                                                                  settled_contracts (real labels)
                                                                                            |
                                                                            trainModel.js (offline, run weekly/monthly)
                                                                                            |
                                                                                            v
                                                                                    models table (versioned)
```

## Setup

1. `npm install ws node-fetch pg`
2. Create a Postgres database (Supabase, Neon, or Vercel Postgres all work) with the TimescaleDB extension if available.
3. Run `sql/schema.sql` against it.
4. Add a `models` table migration:
   ```sql
   CREATE TABLE models (
     id SERIAL PRIMARY KEY,
     asset TEXT NOT NULL,
     desk TEXT NOT NULL,
     coefficients JSONB NOT NULL,
     validation_brier NUMERIC(6,4),
     validation_n INT,
     trained_at TIMESTAMPTZ DEFAULT now()
   );
   ```
5. Set environment variables in Vercel: `DATABASE_URL`, `CRON_SECRET`, `KALSHI_API_KEY` (once you move to authenticated endpoints for order placement).
6. Run `lib/binanceFeed.js` and `lib/kalshiFeed.js` as a small always-on worker (Railway, Render, or a tiny VPS -- these need a persistent WebSocket connection, which serverless functions can't hold open). Vercel serves the `/api` routes; the feeds run separately and just write to the same database.
7. Add the cron entry to `vercel.json` for settlement checks.

## The honesty rule this codebase enforces

`signalEngine.js` will not emit a `modelProbability` until `settled_contracts`
has at least `MIN_TRAINING_SAMPLES` (500, adjustable) real labeled rows for
that asset+desk. Below that threshold, the API returns a `status` field
explaining exactly how much data is still needed, plus an explicitly-labeled
"raw order flow lean" that is not a probability.

**Do not bypass this by lowering the threshold to make numbers appear
sooner, and do not seed `settled_contracts` with synthetic rows.** The
whole point of this architecture is that every stat you eventually put on
the pricing page is real and reproducible from the database.

## Bootstrapping real training data (no need to wait on live cycles)

```bash
psql $DATABASE_URL -f sql/migration_models.sql
psql $DATABASE_URL -f sql/migration_active_model.sql

node scripts/backfillKalshi.js --desk 1h --months 6
node scripts/backfillKalshi.js --desk 15m --months 6
node scripts/backfillKalshi.js --desk 15s --months 1   # shorter window -- see note below

node scripts/backfillFeatures.js        # fills momentum/volatility for 15m + 1h rows
node scripts/backfillFeatures15s.js     # fills momentum15s/volatility for 15s rows
```

Note on the 15s desk: Binance's public `1s` kline interval doesn't retain
deep history the way `1m`/`1h` do, so the 15s desk's backfilled dataset will
be thinner than 15m/1h. `backfillFeatures15s.js` reports how many rows it
could actually fill -- if most come back empty, that desk's model will build
up mostly from live capture over time instead of backfill. That's expected,
not a bug.

## Training and safely promoting a model

Training and going live are two separate, deliberate steps -- a freshly
trained model is saved as a **candidate** (`is_active = false`) and never
automatically replaces what's live:

```bash
node scripts/trainModel.js --asset BTC --desk 1h
node scripts/trainModel.js --asset BTC --desk 15m
node scripts/trainModel15s.js --asset BTC

node scripts/promoteModel.js --asset BTC --desk 1h
node scripts/promoteModel.js --asset BTC --desk 15m
node scripts/promoteModel.js --asset BTC --desk 15s
```

`promoteModel.js` only flips a candidate to active if:
- it has enough validation samples to trust the score (`MIN_VALIDATION_N`),
- and it beats the current active model's Brier score by a real margin (`MIN_IMPROVEMENT`), not just noise,
- and, for the very first model on a desk, it beats a coin flip (Brier < 0.25).

`signalEngine.js` (`loadModel`) only ever reads the model where
`is_active = true` -- so re-running `trainModel.js` on a schedule is safe to
automate (e.g. weekly via cron) precisely because promotion is gated
separately and logged every time.

## Still to build

- Polymarket CLOB integration (same pattern as `kalshiFeed.js`).
- Leaderboard query: rank users by realized PnL from `journal_entries`
  only -- never seed with placeholder users.
