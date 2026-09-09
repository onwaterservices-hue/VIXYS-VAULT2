# WHALE TRACKER MISSION — real data end to end

Blueprint + execution prompt for rebuilding `/whale-tracker` on live venue data.
Written 2026-09-09 ~16:00Z after a production audit through Claude in Chrome.
Read `ENGINE_PROGRESS.md` (SESSION 4) and `CLAUDE.md` before starting.

---

## VERIFIED FACTS (do not re-derive; re-verify only if something contradicts)

1. **The page is fabricated end to end today.** `WhaleTrackerView.tsx` renders
   an invented "LIVE INSTITUTIONAL BLOCK STREAM" (fake entities incl. a real
   company name "BlackRock Custody Bridge", "Whale Strike Defense Walls"
   quoting BTC $64,000 while BTC trades ~$78k). Verified live 15:30Z.
2. **`/api/whales` (server.ts ~16178) is real Coinbase prints up top, but:**
   - on ANY failure or an empty result it serves a **hardcoded fallback array**
     of 4 fake orders (entities "Institutional Volume Cluster #02", "Apex
     Quant Liquidity #14", "BlackRock Custody Bridge", "Satoshi Era Cluster
     #089"; venues Kalshi/Polymarket/Derive; confidences 89–95) **with HTTP
     200**. Production served exactly this for `?asset=ETH` at 15:59Z —
     verified from the live page.
   - even the REAL path invents per-row `confidence` (`88 + sizeUSD/5e4`) and
     `entityName` ("Institutional Block Router" / "Algorithmic Sweeper").
     Nobody knows the entity behind a print; the field is fiction.
3. **`/api/radar` (server.ts ~16127, on branch `feat/engine-replay-harness` /
   PR #28) is already honest and is the model to follow**: real Coinbase L2
   book (8 levels + 30-level depth), real last-100-trade tape with CORRECT
   maker/taker semantics (Coinbase `side` is the MAKER side), whale filter
   ≥ $10k, taker buy/sell skew over the window, explicit 503
   `RADAR_UNAVAILABLE` on venue failure. Nothing estimated or defaulted.
4. **Coinbase Exchange public API is keyless and reachable from the browser**
   (`api.exchange.coinbase.com` returned 200 from the production page; the
   site sets no CSP meta). Client-side WebSocket
   (`wss://ws-feed.exchange.coinbase.com`, `matches` channel) is therefore
   viable as a later enhancement. **No API key is required for any of this.**
   The owner's crypto.com key is NOT needed (crypto.com public market data is
   also keyless); never commit any key, and this feature must never touch
   private/trading endpoints.
5. Both endpoints already take `?asset=` (BTC/ETH/SOL map to Coinbase
   `-USD` products).
6. Tests pin current behavior: `tests/radar-endpoint.characterization.mjs`,
   `tests/radar-component.characterization.mjs`,
   `tests/orderflow-endpoint.characterization.mjs`. Extend them; a fixed
   fallback must FAIL a pinned test, not silently change.

## THE BLUEPRINT

**One principle: every number on the page is an observed venue fact or a
labeled deterministic rule over observed facts. If the venue is down, the page
says so. No synthetic rows, ever.**

### Backend (small — the machinery exists)
1. `/api/whales`: delete the fabricated fallback array entirely. On venue
   failure or zero qualifying prints return an explicit degraded/empty payload
   (`{orders: [], degraded: true, reason}` or 503 — match `/api/radar`'s
   style). Drop `confidence` and `entityName` from real rows. Keep an honest
   size tier if wanted (`sizeTier: "≥$1M" | "≥$250k" | "≥$100k" | "≥$10k"`) —
   it is a labeled rule, not a model opinion. Keep the corrected aggressor
   mapping (maker "sell" ⇒ taker BOUGHT).
2. Optionally fold whales into `/api/radar` (it already computes the same tape)
   and have `/api/whales` delegate — avoid two diverging trade fetches.
3. Per-asset whale thresholds are a product decision — make them named
   constants and SHOW the active threshold on the page ("prints ≥ $100k").

### Frontend (the real work — `WhaleTrackerView.tsx`)
1. Replace every static/config-driven element with polls of `/api/whales` +
   `/api/radar` every 3–5s (the terminal's existing cadence). Asset tabs
   BTC/ETH/SOL pass `?asset=`.
2. Block stream = real prints: venue, real timestamp (relative + UTC), price,
   size USD, taker side. No entity names. No per-row confidence.
3. "Strike Defense Walls" → **"RESTING BOOK DEPTH"**: render `/api/radar`'s
   real bid/ask ladders and 30-level depth totals. Resting depth is NOT
   aggressor flow and must not be labeled defense/sentiment.
4. Header stats become computed-over-the-visible-window values with their
   window stated: tracked volume = sum of tape USD; buy share =
   `skew.takerBuyShare`; feed age = `lastTradeAgeMs`. Remove "250ms BRIDGE
   LATENCY", "STREAMING ACTIVE", "89% BULL DEFENSE" unless each is measured.
5. Reversal tie-in (observation only): show spot distance to the current 15M
   strike from `/api/vixy/15m/current` (`currentSpot`, `openStrike`) beside
   the tape. NOTHING here feeds the engine — flowSkill research measured
   45–51% (nothing predictive) at n≈671 cycles.
6. Honest empty/error states: "COINBASE UNAVAILABLE — nothing to show" beats a
   fake row. Feed-age badge goes STALE when `lastTradeAgeMs` is large.
7. Do not restyle the page's look; keep the design language, replace the data.

### Tests / verification (required before claiming done)
- Extend the characterization suites: pin that `/api/whales` NEVER returns an
  order with `entityName`, never fabricates on failure (degraded/503 path),
  and that thresholds/tier labels are what the page displays.
- `npx tsc --noEmit`, `node tests/run-all.mjs` (20/20 files green today),
  `npm run build` — all clean.
- Browser verification through Claude in Chrome on the deployed build: watch
  the page ≥2 minutes on BTC and ETH; cross-check 2–3 rendered prints against
  `api.exchange.coinbase.com/products/<X>-USD/trades` directly; kill-switch
  check: request an unsupported asset and confirm the honest empty state.
- Report the four states separately: SOURCE FIXED / BUILD VERIFIED / DEPLOYED /
  PRODUCTION VERIFIED. Never claim a later state than reached.

### Do not touch
Engine gate logic, `validationPassed`, thresholds/tiers, settlement,
Firestore rules, credentials, `/api/orderflow` semantics (pinned), and the
PR #28 persistence fixes. No Firestore writes from this feature (public venue
data needs no persistence; the laptop write guard stays untriggered).

### Branch/PR discipline
Cut `feat/whale-tracker-real-data` from `main` AFTER PR #28 merges (it carries
`/api/radar` and the honesty fixes). If #28 is somehow still unmerged, branch
from `feat/engine-replay-harness` instead and say so in the PR description.
Update `ENGINE_PROGRESS.md` when done.

---

## THE PROMPT (paste this into the executing Claude session)

> **VIXY VAULT — WHALE TRACKER: REAL DATA END TO END**
>
> Work in `/Users/olivergershey/VIXYS-VAULT2`. First read
> `WHALE_TRACKER_MISSION.md` and `ENGINE_PROGRESS.md` (SESSION 4) in full and
> follow them — the audit, root causes, endpoint shapes, thresholds and
> do-not-touch list are already established there; do not re-derive or
> contradict them. Verify branch/commit against origin before any work.
>
> Mission: make the `/whale-tracker` page real. Delete the fabricated fallback
> and invented per-row fields in `/api/whales`; rewire `WhaleTrackerView.tsx`
> to poll `/api/whales` + `/api/radar` (3–5s) for BTC/ETH/SOL; render real
> prints (venue, time, price, size, taker side), real resting book depth
> labeled as RESTING DEPTH (never "defense"/sentiment), window-labeled
> computed stats, spot-vs-strike distance from `/api/vixy/15m/current`
> (observation only), and honest degraded/empty states. No entity names, no
> per-row confidence, no synthetic rows under any failure. No API keys —
> Coinbase public endpoints are keyless.
>
> Quality bar: every number is an observed venue fact or a labeled
> deterministic rule; a venue outage renders as an outage. Extend the pinned
> characterization tests so the old fabrications can never return silently.
> Verify: tsc, full test suite, production build, then browser verification
> through Claude in Chrome on the deployed page (cross-check rendered prints
> against Coinbase's own trade feed). Report SOURCE FIXED / BUILD VERIFIED /
> DEPLOYED / PRODUCTION VERIFIED separately and never overstate. Branch
> `feat/whale-tracker-real-data` from main after PR #28 merges; open a PR;
> update `ENGINE_PROGRESS.md` with what was done and what remains.
