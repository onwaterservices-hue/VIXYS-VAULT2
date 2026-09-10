// The calibrated conviction that BUILDS must be real, provenance-carrying and
// never padded. This pins the server contract (adapter + gate) and the card.
import { serverSrc, sliceBetween, readRepoFile, createHarness } from './_engineSource.mjs';
const t = createHarness('calibrated-conviction.characterization');

t.section('adapter exposes the strike-side table as calibrated P(win), never a fabricated number');
const adapter = sliceBetween(serverSrc, 'const kalshiReal = kalshiImpliedAtMs > 0', 'const decisionObj = {', 'calibrated block');
t.check('pWin comes from strikeSide.p or is null', adapter.includes('const pWin = typeof strikeSideNow.p === "number" ? strikeSideNow.p : null;'));
t.check('sample size n is carried', adapter.includes('n: typeof strikeSideNow.n === "number" ? strikeSideNow.n : 0'));
t.check('provenance: checkpoint, distance bin, vol bin, table version', /checkpointSec:.*distBin:.*volBin:[\s\S]*tableVersion:/.test(adapter) || (adapter.includes('checkpointSec:') && adapter.includes('distBin:') && adapter.includes('volBin:') && adapter.includes('tableVersion:')));
t.check('criterion is stated (product criterion, not continuation)', adapter.includes('P(settle on the current side of the open strike)'));
t.check('edge vs market is null unless BOTH sides are real', adapter.includes('const edgeVsMarketPct = pWin !== null && marketForSide !== null ?') && adapter.includes(': null;'));
t.check('market probability is gated on a recent real Kalshi read', adapter.includes('kalshiReal && side ?'));
t.check('no literal probability fallbacks in the calibrated block', !/\?\? 0\.5\d/.test(adapter) && !/\|\| 0\.5\d/.test(adapter));
t.check('conviction trail is downsampled to <=60 points, never synthesised', adapter.includes('trailRaw.length > 60 ? Math.ceil(trailRaw.length / 60) : 1'));

t.section('decision payload carries calibrated, market, trail and the gate checklist');
const decision = sliceBetween(serverSrc, 'const decisionObj = {', 'convictionTrailCoverage: {', 'decisionObj head');
t.check('calibrated block attached', decision.includes('calibrated: calibratedBlock,'));
t.check('market.kalshiImpliedYes is null when not real', decision.includes('kalshiImpliedYes: kalshiReal ? currentKalshiImpliedProb : null'));
t.check('convictionTrail attached with coverage note', decision.includes('convictionTrail,') && serverSrc.includes("this instance's view of the cycle"));
t.check('evidenceAlignment no longer defaults to a fabricated 6', serverSrc.includes('const evidenceAlign = latestBtc15mPipeline?.evidenceAgreementCount ?? null;') && !serverSrc.includes('evidenceAgreementCount ?? 6;'));
const gateOut = sliceBetween(serverSrc, 'lockGate: active15mCycle.lockEligibility', 'strikeSide: active15mCycle.lockEligibility.strikeSide', 'lockGate out');
t.check('lockGate exposes eligible and checks', gateOut.includes('eligible: Boolean(active15mCycle.lockEligibility.eligible)') && gateOut.includes('checks: Array.isArray(active15mCycle.lockEligibility.checks)'));

t.section('the lock ladder is the gate\'s own booleans, not a countdown');
const gate = sliceBetween(serverSrc, 'active15mCycle.lockEligibility = {', 'predictionDirection: dir,', 'lockEligibility');
for (const id of ['WINDOW', 'STRIKE', 'LOCK_QUALITY', 'AGREEMENT', 'MTF', 'STRIKE_FEASIBLE', 'REVERSAL', 'EVIDENCE', 'STABILITY', 'NO_CONFLICT', 'STABLE_SIGNAL', 'PROTECTION', 'DATA_QUALITY', 'NOT_CHOPPY', 'PERSISTENCE', 'NOT_LOCKED', 'CALIBRATED_P']) {
  t.check(`check ${id} present`, gate.includes(`id: "${id}"`));
}
t.check('LOCK_QUALITY check uses the real pass boolean and tier bar', gate.includes('pass: lockQualityPass') && gate.includes('required: `≥${minLockQuality} (${lockTier})`'));
t.check('CALIBRATED_P check is marked non-gating unless the flag is on', gate.includes('gating: VIXY_LOCK_RULE === "strike_side"'));

t.section('conviction trail is recorded per tick from real values');
const trail = sliceBetween(serverSrc, '// ── CONVICTION TRAIL (observation only)', '// Flag-gated Layer 5.', 'trail');
t.check('p is the table value or null (never a default)', trail.includes('p: strikeSide.p === null || strikeSide.p === undefined ? null : strikeSide.p'));
t.check('capped at 320 points', trail.includes('if (trail.length > 320)'));
t.check('reset on cycle transition', serverSrc.includes('convictionTrail: [],'));

t.section('the card shows P(win) with n and labels the legacy score honestly');
const pc = readRepoFile('src/components/CryptoPredictionCenterView.tsx').replace(/\/\*[\s\S]*?\*\//g, '');
t.check('P(win) rendered from calibrated.pWin', pc.includes('Math.round(calibrated.pWin * 100)'));
t.check('sample size shown beside P(win)', pc.includes('P(WIN) · n={calibrated.n}'));
t.check('honest empty state when no cell matches', pc.includes('no matching history yet'));
t.check('legacy score relabelled ENGINE SCORE, not CONVICTION', pc.includes('ENGINE SCORE') && !pc.includes('uppercase tracking-wider">CONVICTION</span>'));
t.done();
