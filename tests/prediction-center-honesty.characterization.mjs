// The prediction center page must not carry invented figures. Every number a
// subscriber sees there is a live read, an engine value, or an explicit
// "unavailable" / "no direct feed" state. This pins the surfaces that used to
// ship literals ("+$28.4M BUY", "$64,495", "1,250 BTC", "0.994").
import { readRepoFile, createHarness } from './_engineSource.mjs';
const t = createHarness('prediction-center-honesty.characterization');

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const pc = strip(readRepoFile('src/components/CryptoPredictionCenterView.tsx'));
const ndm = strip(readRepoFile('src/components/prediction-center/NeuralDecompositionMatrix.tsx'));
const rail = strip(readRepoFile('src/components/vixyV2/ContextualRightRail.tsx'));
const hook = strip(readRepoFile('src/hooks/useSystemNotifications.ts'));
const cc = strip(readRepoFile('src/components/CandleChart.tsx'));

t.section('cross-venue evidence card: live reads or explicit unavailability');
t.check('no "+$28.4M BUY" literal', !pc.includes('+$28.4M'));
t.check('no "SYNCHRONIZED (4/4)" decor', !pc.includes('SYNCHRONIZED (4/4)'));
t.check('no literal Kalshi/Polymarket percentages', !pc.includes("57% YES") && !pc.includes("59% YES"));
t.check('no "Coinbase Premium Index" row (no source exists)', !pc.includes('Coinbase Premium Index'));
t.check('rows are fed by the radar snapshot and the real market flag', pc.includes('radarSnap?.book') && pc.includes('radarSnap?.skew') && pc.includes('marketRead ?'));
t.check('Polymarket row says there is no direct feed', pc.includes("value: 'no direct feed'"));
t.check('header badge counts live rows instead of claiming 4/4', pc.includes('LIVE ({liveRows}/4)'));

t.section('PRICE card: the price to beat, never a fabricated 24h range or seeded spot');
t.check('no spot × 1.018 / × 0.982 "24H HIGH/LOW"', !pc.includes('spotPrice * 1.018') && !pc.includes('spotPrice * 0.982') && !pc.includes('24H HIGH'));
t.check('no seeded $64,591.20 / $3,480 / $185 spot or +1.85% change', !pc.includes('64591.20') && !pc.includes("'ETH' ? 3480") && !pc.includes('|| 1.85'));
t.check('strip shows the Kalshi strike as PRICE TO BEAT and spot vs strike in $ and bps', pc.includes('PRICE TO BEAT (KALSHI STRIKE)') && pc.includes('SPOT VS STRIKE') && pc.includes("bps ${spotPrice >= targetPrice ? 'above' : 'below'}"));

t.section('VIXY READ card: no stale hard-coded hypothesis');
t.check('no "$64,495" hypothesis literal', !pc.includes('$64,495') && !pc.includes('momentum vector +14.2'));
t.check('statement derives from strike distance, price side, family alignment and P(win)', pc.includes('WHERE THIS CYCLE STANDS') && pc.includes('evidenceSummary.alignedCount') && pc.includes('calibrated?.distBps'));

t.section('evidence family matrix: engine families, no invented weights');
t.check('consumes the real evidence vectors', ndm.includes('vectors: EvidenceVectorItem[]') && pc.includes('vectors={evidenceSummary.vectors}'));
t.check('no weight / contribution / stability literals', !ndm.includes('weight:') && !ndm.includes('contribution:') && !ndm.includes('STABILITY COEFFICIENT') && !ndm.includes('0.994'));
t.check('no "$28.4M" or "+$12.50" metric literals', !ndm.includes('28.4M') && !ndm.includes('+$12.50') && !ndm.includes('58% YES'));
t.check('footer states the engine score is not a probability', ndm.includes('not a probability'));
t.check('unavailable/stale families render their honest displayScore', ndm.includes('family.displayScore'));

t.section('right rail: engine events replace templated whale lines; no invented reversal risk');
t.check('no templated feed lines', !rail.includes('Whale wallet moved') && !rail.includes('Large buyer detected') && !rail.includes('Funding rate remains neutral'));
t.check('feed is built from the ledger + this cycle\'s lock', rail.includes('fetchResolvedLogApi') && rail.includes('ENGINE EVENT FEED') && rail.includes('No engine events loaded yet'));
t.check('reversal risk has no ?? 28 default', !rail.includes('?? 28') && rail.includes("reversalRiskRaw === null ? 'NO DATA'"));

t.section('system notifications: only engine transitions, no seeded or random alerts');
t.check('no whale/orderflow templates', !hook.includes('WHALE_EVENT_TEMPLATES') && !hook.includes('1,250 BTC') && !hook.includes('28.4M'));
t.check('no periodic random injection', !hook.includes('Math.random() * ') );
t.check('no invented lock defaults', !hook.includes('|| 91') && !hook.includes("'$80,350'"));
t.check('storage key bumped so seeded v1 items are dropped', hook.includes("'vixy_system_notifications_v2'"));

t.section('chart engine events land on the containing bar');
t.check('lock/settle markers use the last candle whose open <= t', cc.includes('if (ct <= tMs) hit = i;'));

t.done();
