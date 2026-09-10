# COMPETITOR TEARDOWN — Battle of the Bots (2026-09-10)

What the two competitors the owner named show publicly, what can be inferred
about their models, and where VIXY stands on the same criterion — with every
VIXY number traceable to a measurement in `ENGINE_PROGRESS.md` and every
competitor number traceable to their own public page on the date above.
Nothing here was obtained from a logged-in area.

## HaydBot (haydbot.online) — read 2026-09-10 ~15:00Z

**Public scoreboard ("TODAY'S RECORD, resets at midnight"):**

| operator | record | hit rate |
|---|---|---|
| BTC | 20–16 | 56% |
| ETH | 23–13 | 64% |
| SOL | 25–11 | 69% |
| XRP | 19–17 | 53% |
| BNB | 25–11 | 69% |
| HYPE | 26–10 | 72% |
| DOGE | 22–14 | 61% |

36 BTC calls by ~15:00Z means they call roughly **60% of cycles** and hit
**56%** of the ones they call. That is close to the base rate of "name the
side price sits on at minute 8" without any selection.

**BTC V2 operator, self-description (their operator config, public bundle):**
model `Persistence-fade v1`; signals `Strike persistence`, `Vol barrier`,
`VWAP fade`; decision `Locks by 8 min`; venues `Coinbase · Binance · Kalshi`;
edge claim "Longer tape before it commits". The other operators are
`Momentum + flow fusion` (EMA cross, VWAP deviation, realized vol) locking
"within 5 min"; the DOGE one is "High-beta volatility bands"; the
cross-coin one is a "6k-path leadership simulation" (Monte Carlo relative
strength). All refresh every 10s.

**What their panel shows per cycle (owner's screenshot of the BTC bot):**
a side with a Kalshi contract price ("UP 80¢"), two confidence figures side
by side (95% and 41%), "KALSHI PRICE TO BEAT $78,320.48 · ABOVE target — High
Confidence · P(above target) 82% ±$34.70 expected", signal chips, "whale
flow" and "order-book walls".

**Read:** "strike persistence" is the same idea as VIXY's Layer 5 (does the
current side of the strike persist to settlement); "vol barrier" is a
volatility-scaled distance test; "VWAP fade" is a mean-reversion veto. It is
a reasonable design. But their published record is the number that matters:
56% on 60% coverage. Their panel's 95%/41% pair is the incoherence VIXY
removed in SESSION 7 (two "confidences" that cannot both be probabilities of
the same event). Their "P(above target) 82%" has no sample size attached and
no calibration table anywhere on the site.

**Their reversal model** (the owner's note that "its reversal model for
scalping is really good"): nothing public quantifies it. On our side the
same concept exists as `pLockedSide` / `protectSignal` (the table's P for
the locked side once price has crossed) — measured in SESSION 6 to catch 40%
of losses at 1.8% false alarms with ~120s warning, and shipped as an
observation. That is the honest comparison point if they publish theirs.

## VALHALLA (solvalhalla.com) — read 2026-09-10

The public site is a member gate: "Founder Lifetime Membership $1,500 …
8 of 25 remaining … INCLUDES RAGNAROK PRIME · MANUAL DISCORD ACTIVATION".
No model description, no record, no per-cycle output is visible without
paying. Nothing can be said about their model from public data, and nothing
was attempted beyond the public pages.

## VIXY on the same criterion (did the side we named settle)

| policy | window | locks | coverage | hit rate | source |
|---|---|---|---|---|---|
| strike-side rule, checkpoint-only | Sep 8–10, 209 untouched cycles | 95 | 45.5% | **98.9%** | L5_PROMOTION_REPORT §1 |
| shipped `strike_side_only` gate, 3s ticks | same 208 cycles | 111 | 53.4% | **97.3%** | SESSION 8 |
| shipped gate, today (−2% day) | Sep 10 04:00–14:45Z, 43 cycles | 22 | 51.2% | 90.9% | SESSION 8 |
| live shadow, today, gradeable rows | Sep 10 | 10 | — | 80.0% | SESSION 8 |
| engine gate (production today) | ledger, 88 resolved | 88 | ~8% of cycles | 77% | `/api/signal/resolved-log` |

Against HaydBot's 56% on 60% coverage, the rule's measured 90–97% on 45–53%
coverage wins any hit-rate scoring by a wide margin and loses on call count.
The two live losses today were traced to a real defect (cold instances
binning volatility on a partial range; fixed in the PR that carries this
file) and to the replay's rounded strike — not to the table. **The claim to
make on Saturday is the measured one:** precision on the contract's own
criterion, with the sample size, on a stated window. Not "95% confidence".

## What would actually beat them

1. Flip `VIXY_LOCK_RULE=strike_side_only` only after the range-hydration fix
   is deployed and the live shadow (now gradeable on skipped cycles) shows
   the rule at or above the bar over a full day. That is the difference
   between 8% coverage at 77% (engine today) and ~50% coverage at ≥90%.
2. Coverage is a dial they do not have: `VIXY_LOCK_RULE_BAR=0.93` measured
   59% coverage at 93.5% on the untouched window. If the battle scores
   total wins rather than hit rate, that dial matters.
3. Publish the per-day tally from the real ledger the way they do
   ("20–16"), computed from `/api/signal/resolved-log`, and show the P(win)
   with `n` beside every call. They show a number; VIXY shows a number with
   its evidence.
4. Kalshi price at lock is now captured on every would-lock. Once it has a
   few days of data it answers the only question their panel dodges: is the
   contract already priced at the model's probability (no edge) or not.
