// CHARACTERIZATION -- client display-honesty batch.
//
// Twelve web-client surfaces presented something that was not what it
// claimed to be:
//   1. the engine score (0–100) rendered as a percentage, and /vixy-locks
//      labelled every ledger `confidence` as a percent whatever lockPolicy
//      wrote it;
//   2. /vixy-locks printed invented model identifiers (v5.2,
//      VIXY-ENSEMBLE-5.X, VIXY-VAULT-v5) instead of each row's modelVersion;
//   3. the canonical 15M feed started LIVE before any response arrived;
//   4. always-pulsing live dots with nothing feeding them;
//   5. the landing MARKET STATE said ANALYZING MARKET on a dead feed;
//   6. a failed /api/model-status rendered as "0 settled / 500";
//   7. the 1-hour desk fell back to BTC's price for other assets;
//   8. the landing EV calculator printed "+-10.0%" and credited the user's
//      own sliders to "model probabilities";
//   9. the scanner said MEASURED · 15M while the engine was not live;
//  10. Binance fallback prices were labelled Coinbase;
//  11. System Status labelled the Brier mean with the settled count as n;
//  12. the scalping desk showed an inert $10,000 simulated balance.
import { transformSync } from 'esbuild';
import { readRepoFile, serverSrc, createHarness } from './_engineSource.mjs';
import { headline, headlineText } from '../src/lib/engineSemantics.ts';

const t = createHarness('client-display-honesty-batch.characterization');
const strip = (s) => s.replace(/\/\/[^\n]*/g, '');

const mc = strip(readRepoFile('src/components/MarketCardsView.tsx'));
const scan = strip(readRepoFile('src/components/OpportunityScannerView.tsx'));
const cmp = strip(readRepoFile('src/components/CompareView.tsx'));
const landRaw = readRepoFile('src/components/LandingPage.tsx');
const land = strip(landRaw);
const ex = strip(readRepoFile('src/components/ExplainabilityVaultView.tsx'));
const vault = strip(readRepoFile('src/components/AIBrainMemoryVault.tsx'));
const haRaw = readRepoFile('src/components/HistoricalAccuracy.tsx');
const ha = strip(haRaw);
const hookSrc = strip(readRepoFile('src/hooks/useCanonical15mDecision.ts'));
const coach = strip(readRepoFile('src/components/AICoachView.tsx'));
const nav = strip(readRepoFile('src/components/TopNavControls.tsx'));
const scalp = strip(readRepoFile('src/components/ScalpingDeskView.tsx'));
const apiRaw = readRepoFile('src/services/api.ts');
const api = strip(apiRaw);
const badge = strip(readRepoFile('src/components/ModelStatusBadge.tsx'));
const oneHourRaw = readRepoFile('src/components/OneHourDeskView.tsx');
const oneHour = strip(oneHourRaw);
const changelog = strip(readRepoFile('src/components/ChangelogView.tsx'));

// Compile one TypeScript declaration sliced from a source file and return it.
function evalTs(src, re, name, label) {
  const m = src.match(re);
  t.check(`${label}: found in source`, Boolean(m));
  if (!m) return null;
  const { code } = transformSync(m[0].replace(/^export\s+/, ''), { loader: 'ts', format: 'esm' });
  return new Function(`${code}; return ${name};`)();
}

// ---------------------------------------------------------------------------
t.section('1. score vs percent: the shared rendering decision');
const pwin = headline({ calibrated: { pWin: 0.742, n: 1026, currentSide: 'UP' }, confidence: 88 });
const score = headline({ confidence: 88 });
t.eq('calibrated P(win) is the headline kind', pwin.kind, 'PWIN');
t.eq('calibrated P(win) renders as a percent', headlineText(pwin), '74%');
t.eq('engine score is the headline kind without a cell', score.kind, 'ENGINE_SCORE');
t.eq('engine score renders "N / 100", never "%"', headlineText(score), '88 / 100');
t.eq('placeholder confidence 0 renders a dash', headlineText(headline({ confidence: 0 })), '—');
t.eq('no decision renders a dash', headlineText(headline(null)), '—');
t.eq('a null headline renders a dash', headlineText(null), '—');

t.section('1. score vs percent: every surface uses it');
t.check('Market cards: no raw value + %', !mc.includes('{engineHeadline.value}%') && mc.includes('{headlineText(engineHeadline)}'));
t.check('Scanner: no raw value + %', !scan.includes('{h.value}%') && scan.includes('{headlineText(h)}'));
t.check('Compare: no raw value + %', !cmp.includes('{h.value}%') && cmp.includes('{headlineText(h)}'));
// A raw "value%" is allowed only where the headline is proven to be a P(win).
const heroPctUses = land.split('`${heroHeadline.value}%`').length - 1;
const heroPctGuarded = land.split("heroHeadline.kind === 'PWIN' ? `${heroHeadline.value}%`").length - 1;
t.check('Landing hero: value renders through headlineText', land.includes("heroLive ? headlineText(heroHeadline) : '—'"));
t.check('Landing: every raw value + % is guarded by kind === PWIN', heroPctUses === heroPctGuarded, `uses=${heroPctUses} guarded=${heroPctGuarded}`);
t.check('Landing hero bar names what it measures', land.includes('aria-label={heroLive ? `${heroHeadline.label} ${headlineText(heroHeadline)}`'));
t.check('Explainability: header names the number shown', ex.includes("head?.kind === 'ENGINE_SCORE' ? 'ENGINE SCORE' : 'CALIBRATED P(WIN)'"));
t.check('Explainability: value rendered through headlineText', ex.includes('{headlineText(head)}') && !ex.includes(": head.value) : '—'"));
t.check('Brain vault: locked value is not "confidence N%"', !vault.includes('` • confidence ${lockedConfidence}%`'));
t.check('Brain vault: engine score out of 100 unless the rule decided',
  vault.includes('` • engine score ${lockedConfidence} / 100`') && vault.includes("lockPolicy === 'STRIKE_SIDE_RULE'"));

t.section('1. /vixy-locks: what a ledger confidence is, per lockPolicy');
// The premise, read from server.ts: the rule writes its measured p; the engine gate writes its score.
t.check('server: rule-decided locks store round(rule p × 100) as confidence',
  /const conf = ruleDecides\s*\?\s*Math\.round\(gate\.lockRuleP \* 100\)\s*:\s*Math\.max\(65, Math\.min\(96, Math\.round\(currentConfidence\)\)\);/.test(serverSrc));
t.check('server: the ledger row records lockPolicy and modelVersion',
  serverSrc.includes('logItem.lockPolicy = lockPolicy;') && serverSrc.includes('logItem.modelVersion = lockModelVersion;'));
const ledgerConfidence = evalTs(haRaw, /const ledgerConfidence = \(row: any\): \{ label: string; text: string \} => \{[\s\S]*?\n\};/, 'ledgerConfidence', 'ledgerConfidence');
if (ledgerConfidence) {
  const rule = ledgerConfidence({ lockPolicy: 'STRIKE_SIDE_RULE', confidence: 97 });
  t.eq('STRIKE_SIDE_RULE row is labelled Rule P(win)', rule.label, 'Rule P(win)');
  t.eq('STRIKE_SIDE_RULE row renders a percent', rule.text, '97%');
  const gate = ledgerConfidence({ lockPolicy: 'ENGINE_GATE', confidence: 88 });
  t.eq('ENGINE_GATE row is labelled Engine Score', gate.label, 'Engine Score');
  t.eq('ENGINE_GATE row renders N / 100', gate.text, '88 / 100');
  t.eq('ENGINE_GATE_FILTERED row is an engine score', ledgerConfidence({ lockPolicy: 'ENGINE_GATE_FILTERED', confidence: 70 }).text, '70 / 100');
  t.eq('row with no lockPolicy is an engine score', ledgerConfidence({ confidence: 88 }).label, 'Engine Score');
  t.eq('missing confidence renders a dash, not 0', ledgerConfidence({ confidence: null }).text, '--');
}
t.check('ledger row label and value come from ledgerConfidence',
  ha.includes('{ledgerConfidence(log).label}') && ha.includes('{ledgerConfidence(log).text}') && !ha.includes("`${log.confidence}%`"));
t.check('provenance modal labels per lockPolicy',
  ha.includes("activeProvenance.lockPolicy === 'STRIKE_SIDE_RULE' ? <>Rule P(win)</> : <>Engine Score</>"));
t.check('no AVG CONF mixing scores and percents', !ha.includes("'AVG CONF'") && ha.includes("'AVG ENGINE SCORE'") && ha.includes("'AVG RULE P(WIN)'"));
t.check('engine scores and rule percents are averaged separately',
  ha.includes("s.lockPolicy !== 'STRIKE_SIDE_RULE'") && ha.includes("s.lockPolicy === 'STRIKE_SIDE_RULE'"));

// ---------------------------------------------------------------------------
t.section('2. /vixy-locks: no invented model identifiers');
for (const lit of ['VIXY-ENSEMBLE-5.X', 'VIXY-ENSEMBLE', '>v5.2<', 'VIXY-VAULT-v5']) {
  t.check(`no "${lit}"`, !ha.includes(lit));
}
t.check("ledger row shows its own modelVersion or a dash", ha.includes("MDL: {log.modelVersion || '—'}"));

// ---------------------------------------------------------------------------
t.section('3. canonical feed does not start LIVE');
t.check('FeedHealthStatus has a CONNECTING state', /export type FeedHealthStatus = 'CONNECTING' \|/.test(hookSrc));
t.check("initial status is CONNECTING, not LIVE",
  hookSrc.includes("useState<FeedHealthStatus>('CONNECTING')") && !hookSrc.includes("useState<FeedHealthStatus>('LIVE')"));
const applyStart = hookSrc.indexOf('const applySafeUpdate');
const applyEnd = hookSrc.indexOf('const fetchFromServer = async');
const applySlice = applyStart >= 0 && applyEnd > applyStart ? hookSrc.slice(applyStart, applyEnd) : '';
const liveSets = (s) => s.split("setDataHealthStatus('LIVE')").length - 1;
t.check('LIVE is only ever set inside applySafeUpdate (after a real decision)',
  applySlice.length > 0 && liveSets(hookSrc) === liveSets(applySlice) && liveSets(applySlice) >= 1);
t.check('hook reports whether a server decision replaced the placeholder',
  hookSrc.includes('useState<boolean>(false)') && (applySlice.split('setHasServerDecision(true)').length - 1) === 2 && hookSrc.includes('    hasServerDecision,\n'));
t.check('heartbeat does not turn a never-connected feed into STALE', hookSrc.includes("prev === 'CONNECTING' || prev === 'DISCONNECTED'"));
t.check('Coach requires a real server decision, not a truthy placeholder',
  coach.includes("dataHealthStatus === 'LIVE' && hasServerDecision === true") && !coach.includes('Boolean(decision)'));
t.check('Landing feed pill says CONNECTING before data', land.includes("connecting ? 'CONNECTING' : 'OFFLINE'"));
t.check('Explainability LIVE badge stays gated on the feed status', ex.includes("isBtc && engineFeedHealth === 'LIVE'"));

// ---------------------------------------------------------------------------
t.section('4. live indicators are derived, not decorative');
t.check('top nav: no "Direct Feed" claim', !nav.includes('Direct Feed'));
t.check('top nav: no always-on green pulse', !nav.includes('bg-emerald-400 animate-pulse'));
t.check('top nav: stream dot reflects a received quote for the selected asset', nav.includes("selectedHasQuote ? 'bg-emerald-400' : 'bg-slate-600'"));
t.check('top nav: venue dots are selection markers only', nav.includes("isSelected ? 'bg-slate-300' : 'bg-slate-600'"));
t.check('scalping desk: no hardcoded LIVE MARKET DATA', !scalp.includes('● LIVE MARKET DATA'));
t.check('scalping desk: badge derived from book and tape status',
  scalp.includes("book.status === 'LIVE' && prints.status === 'LIVE'") && scalp.includes('{marketDataBadge.text}'));

// ---------------------------------------------------------------------------
t.section('5. landing MARKET STATE depends on the feed');
const heroMarketState = evalTs(landRaw, /export function heroMarketState\([\s\S]*?\n\}\n/, 'heroMarketState', 'heroMarketState');
if (heroMarketState) {
  t.eq('placeholder WATCH while CONNECTING says CONNECTING', heroMarketState('WATCH', 'CONNECTING').label, 'CONNECTING');
  t.eq('nothing pulses while connecting', heroMarketState('WATCH', 'CONNECTING').pulse, false);
  t.eq('disconnected feed is FEED OFFLINE, not ANALYZING', heroMarketState('WATCH', 'DISCONNECTED').label, 'FEED OFFLINE');
  t.eq('a stale feed is FEED STALE', heroMarketState('WATCH', 'STALE').label, 'FEED STALE');
  t.eq('an old lock on a dead feed is not re-announced', heroMarketState('LOCKED_UP', 'API_ERROR').label, 'FEED OFFLINE');
  t.eq('LIVE non-lock state is ANALYZING MARKET', heroMarketState('WATCH', 'LIVE').label, 'ANALYZING MARKET');
  t.eq('LIVE pulses', heroMarketState('WATCH', 'LIVE').pulse, true);
  t.eq('LIVE lock is shown', heroMarketState('LOCKED_DOWN', 'LIVE').label, 'LOCKED — DOWN');
}
t.check('hero chip reads heroMarketState with the feed status',
  land.includes('heroMarketState(canonical15m.currentState, dataHealthStatus)') && !land.includes('stateDisplayName'));
t.check('hero chip pulse is conditional', land.includes("heroState.pulse ? 'animate-pulse' : ''"));

// ---------------------------------------------------------------------------
t.section('6. failed model-status is unavailable, not zero');
t.check('fallback returns null counts and an unavailable flag',
  api.includes('unavailable: true,\n    settledCount: null,\n    minRequired: null,') && !api.includes('settledCount: 0,') && !api.includes('minRequired: 500,'));
t.check('fallback keeps no active model and a null Brier', api.includes('hasActiveModel: false,\n    activeModelBrier: null,'));
t.check('ModelStatusResponse counts are nullable', api.includes('settledCount: number | null;') && api.includes('minRequired: number | null;'));
t.check('brain vault: no 0 / 500 defaults', !vault.includes('settledCount ?? 0') && !vault.includes('minRequired ?? 500'));
t.check('brain vault: unavailable is said, counts dash',
  vault.includes("'MODEL STATUS UNAVAILABLE'") && vault.includes("{settled !== null ? settled : '—'}") && vault.includes("settled !== null && minRequired !== null ? `${settled} / ${minRequired}` : '—'"));
t.check('model status badge: no 0 / 500 defaults', !badge.includes('settledCount ?? 0') && !badge.includes('minRequired ?? 500'));
t.check('model status badge: says unavailable', badge.includes('Model status unavailable') && badge.includes('status.unavailable'));

// ---------------------------------------------------------------------------
t.section('7. 1-hour desk never shows another asset\'s price');
t.check("no fallback to BTC's quote", !oneHour.includes("spotPrices?.['BTC']"));
t.check('no fallback to the untagged ticker', !oneHour.includes('ticker?.price'));
const spotDecl = oneHourRaw.match(/const selectedQuote = Number\(spotPrices\?\.\[selectedAsset\]\?\.price\);\s*const spotPrice: number \| null = [^;]+;/);
t.check('spot declaration found', Boolean(spotDecl));
if (spotDecl) {
  const { code } = transformSync(spotDecl[0], { loader: 'ts', format: 'esm' });
  const spotFor = new Function('spotPrices', 'selectedAsset', `${code}; return spotPrice;`);
  const prices = { BTC: { price: 80123.4, change24h: 1 } };
  t.eq('ETH with only a BTC quote has no spot', spotFor(prices, 'ETH'), null);
  t.eq('BTC uses its own quote', spotFor(prices, 'BTC'), 80123.4);
  t.eq('a zero quote is no spot', spotFor({ SOL: { price: 0 } }, 'SOL'), null);
  t.eq('no quotes at all is no spot', spotFor({}, 'XRP'), null);
}
t.check('no strike ladder without a spot', oneHour.includes('if (spotPrice === null) return [];'));
t.check('header spot renders a dash when missing', oneHour.includes("{spotPrice !== null ? fmtUsd(spotPrice) : '—'}"));

// ---------------------------------------------------------------------------
t.section('8. landing EV calculator');
const signedEdgeText = evalTs(landRaw, /export function signedEdgeText\([\s\S]*?\n\}\n/, 'signedEdgeText', 'signedEdgeText');
if (signedEdgeText) {
  t.eq('negative edge is "-10.0%", never "+-10.0%"', signedEdgeText(52 - 62), '-10.0%');
  t.eq('positive edge is signed', signedEdgeText(68 - 52), '+16.0%');
  t.eq('zero edge carries no sign', signedEdgeText(0), '0.0%');
}
t.check('no hardcoded "+" before the edge', !land.includes('+{estimatedEdge}%') && land.includes('{signedEdgeText(estimatedEdge)}'));
t.check('edge colour follows its sign', land.includes("estimatedEdge > 0 ? 'text-emerald-400' : estimatedEdge < 0 ? 'text-rose-400' : 'text-slate-300'"));
t.check('no "based on model probabilities" claim', !land.includes('based on model probabilities'));
t.check('note says both inputs are the user\'s sliders', land.includes('your own probability estimate minus the market price, both set with the sliders above'));

// ---------------------------------------------------------------------------
t.section('9. scanner badge');
t.check('MEASURED · 15M only while the engine is live',
  scan.includes("isBtc ? (engineLive ? 'MEASURED · 15M' : 'ENGINE NOT LIVE') : 'UNRANKED'"));

// ---------------------------------------------------------------------------
t.section('10. ticker venue labels');
const tickerSourceLabel = evalTs(apiRaw, /export function tickerSourceLabel\([\s\S]*?\n\}\n/, 'tickerSourceLabel', 'tickerSourceLabel');
if (tickerSourceLabel) {
  t.eq('server rows are Coinbase', tickerSourceLabel('Coinbase'), 'Coinbase');
  t.eq('fallback rows are Binance USDT', tickerSourceLabel('Binance'), 'Binance (USDT)');
  t.eq('unknown source is a dash', tickerSourceLabel(undefined), '—');
}
t.check('fetch tags server rows Coinbase and fallback rows Binance',
  api.includes("data.map((row) => ({ ...row, source: 'Coinbase' as TickerSource }))") && api.includes("source: 'Binance' as TickerSource,"));
t.check('server all-tickers route reads Coinbase only', /app\.get\("\/api\/crypto\/all-tickers"[\s\S]{0,700}api\.exchange\.coinbase\.com\/products/.test(serverSrc));
t.check('market cards: no hardcoded Coinbase labels',
  !mc.includes('Live Spot Matrix • Coinbase') && !mc.includes('-USD · Coinbase</span>') && mc.includes('tickerSourceLabel(liveInfo?.source)'));
t.check('scanner: no hardcoded Spot · Coinbase', !scan.includes('Spot · Coinbase') && scan.includes('Spot · {tickerSourceLabel(s?.source)}'));

// ---------------------------------------------------------------------------
t.section('11. System Status Brier n');
t.check('Brier is not labelled with the settled count as n', !changelog.includes('(n=${model.settledCount})'));
t.check('Brier renders alone or a dash', changelog.includes("model && model.brier !== null ? model.brier.toFixed(3) : '—'"));

// ---------------------------------------------------------------------------
t.section('12. scalping desk paper sandbox');
for (const lit of ['Simulated Balance', '$10,000.00', 'BUY UP YES ($500)', 'BUY DOWN NO ($500)']) {
  t.check(`no inert "${lit}"`, !scalp.includes(lit));
}
t.check('sandbox says it is not built', scalp.includes('Paper execution is not built yet') && scalp.includes('Paper Sandbox · Inactive'));

t.done();
