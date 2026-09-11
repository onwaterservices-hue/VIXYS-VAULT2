// CHARACTERIZATION -- the leaderboard's YOU row is the requester's own; the Kalshi
// panel shows the engine's real live-trading state and scores as scores.
//
// Leaderboard: LeaderboardView marked a row as the viewer's own when its name
// contained a fixed substring, and /api/leaderboard names the owner's row with
// exactly that substring, so every visitor saw the owner's row tagged YOU and
// listed under My Logged Trades while their own row never matched. Every
// non-owner row was also served an invented tier badge.
//
// Kalshi: the engine hard-disables live-capital orders and blocks every order
// whose environment resolves to live, yet the panel read ARMED & ACTIVE and
// offered the live venue as real capital. The "Signal Confidence Gate" slider
// was labelled as a percentage with Recommended / Extreme Conviction claims, but
// the engine compares it against the raw 0-100 engine score, not a probability.
import crypto from 'crypto';
import { serverSrc, readRepoFile, sliceBetween, createHarness } from './_engineSource.mjs';

const t = createHarness('leaderboard-viewer-and-kalshi-live-state.characterization');
const strip = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

// ---------------------------------------------------------------- leaderboard
t.section('/api/leaderboard marks the viewer from the verified session (real route code)');
const routeSrc = strip(sliceBetween(serverSrc, 'app.get("/api/leaderboard", (req, res) => {', 'app.get("/api/signal-snapshots"', 'leaderboard route'));
{
  t.check('viewer id comes from journalOwnerId(req)', /const viewerId = journalOwnerId\(req\);/.test(routeSrc));
  t.check('route reads no client-supplied identity', !/req\.(query|body|headers|params)/.test(routeSrc) && !routeSrc.includes('x-user'));
  const owner = strip(sliceBetween(serverSrc, 'function journalOwnerId(req) {', '__name(journalOwnerId', 'journalOwnerId'));
  t.check('journalOwnerId is the signed-session identity', owner.includes('authenticateSession(req)'));
  t.check('no invented QUANT TRADER tier', !routeSrc.includes('QUANT TRADER'));

  let handler = null;
  const app = { get: (_p, h) => { handler = h; } };
  const run = (entries, viewerId) => {
    new Function('app', 'serverJournalEntries', 'journalOwnerId', 'crypto', routeSrc)(app, entries, () => viewerId, crypto);
    let body = null;
    handler({}, { json: (b) => { body = b; } });
    return body.leaderboard;
  };
  const entries = [
    { userId: 'usr_owner_01', pnlUSD: 50, outcome: 'WIN' },
    { userId: 'usr_owner_01', pnlUSD: 20, outcome: 'WIN' },
    { userId: 'uid_viewer_abcd', pnlUSD: 5, outcome: 'LOSS' },
    { userId: 'uid_other_wxyz', pnlUSD: 1, outcome: 'WIN' },
    { userId: 'trader.person@example.com', pnlUSD: 2, outcome: 'WIN' },
  ];
  const nameOf = (id) => 'Quant_' + crypto.createHash('sha256').update(id + '-leaderboard').digest('hex').slice(0, 4);
  const ownerRow = (rows) => rows.find((r) => r.badge === 'MASTER ADMIN');

  const asViewer = run(entries, 'uid_viewer_abcd');
  const viewerRows = asViewer.filter((r) => r.isViewer === true);
  t.eq('signed-in trader: exactly one row is theirs', viewerRows.length, 1);
  t.eq('signed-in trader: it is their own row', viewerRows[0] && viewerRows[0].traderName, nameOf('uid_viewer_abcd'));
  t.eq('signed-in trader: the owner row is not theirs', ownerRow(asViewer).isViewer, false);
  t.eq('owner row keeps its real role badge and name', ownerRow(asViewer).traderName, 'Vixy Master Admin');
  t.check('non-owner rows carry no tier badge', asViewer.filter((r) => r !== ownerRow(asViewer)).every((r) => r.badge === null));
  t.check('no raw userId on any public row', asViewer.every((r) => !('userId' in r)));
  const payload = JSON.stringify(asViewer);
  t.check('an email journal id never appears, not even its tail', !payload.includes('example.com') && !payload.includes('@') && !payload.includes('.com'));

  const signedOut = run(entries, '');
  t.check('signed out: no row is the viewer', signedOut.every((r) => r.isViewer === false));

  const asOwner = run(entries, 'usr_owner_01');
  t.check('owner signed in: only the owner row is theirs', asOwner.filter((r) => r.isViewer).length === 1 && ownerRow(asOwner).isViewer === true);
}

t.section('LeaderboardView uses the served flag, not names');
{
  const lb = strip(readRepoFile('src/components/LeaderboardView.tsx'));
  t.check('isYouRow reads isViewer', lb.includes('const isYouRow = (trd: LeaderboardUser): boolean => trd?.isViewer === true;'));
  t.check('no name-substring matching', !/\.includes\('(You|Quantum|Master Admin)'\)/.test(lb));
  t.check('tabs and YOU badge share isYouRow', lb.includes("filterTab === 'MY_LOGS' && !isYouRow(trd)") && lb.includes("filterTab === 'COMMUNITY' && isYouRow(trd)") && lb.includes('const isUser = isYouRow(trd);'));
  t.check('badge rendered only when served', lb.includes('{trd.badge ? ('));
  t.check('no QUANT TRADER in the view', !lb.includes('QUANT TRADER'));
  const api = strip(readRepoFile('src/services/api.ts'));
  const iface = api.slice(api.indexOf('export interface LeaderboardUser'), api.indexOf('}', api.indexOf('export interface LeaderboardUser')));
  t.check('LeaderboardUser.badge is nullable', /badge: string \| null;/.test(iface));
  t.check('LeaderboardUser has isViewer', /isViewer: boolean;/.test(iface));
}

// ---------------------------------------------------------------------- kalshi
t.section('one live-trading flag, enforced by the engine');
const flagSrc = strip(readRepoFile('src/services/trading/kalshiLiveTradingFlag.ts'));
const engine = strip(readRepoFile('src/services/trading/kalshiExecutionEngine.ts'));
const panel = strip(readRepoFile('src/components/KalshiAutoTradePanel.tsx'));
{
  const literal = /AUTO_TRADING_LIVE_ENABLED\s*=\s*(true|false)/g;
  t.check('flag module defines the constant', /export const AUTO_TRADING_LIVE_ENABLED = (true|false);/.test(flagSrc));
  t.eq('no second literal in engine, panel or server', [engine, panel, strip(serverSrc)].reduce((n, s) => n + (s.match(literal) || []).length, 0), 0);
  t.check('engine imports and re-exports the flag', engine.includes("import { AUTO_TRADING_LIVE_ENABLED } from './kalshiLiveTradingFlag';") && engine.includes('export { AUTO_TRADING_LIVE_ENABLED };'));
  t.check('engine still blocks live orders on the flag', engine.includes("if (environment === 'live' && !AUTO_TRADING_LIVE_ENABLED) {") && engine.includes("reason: 'live_disabled'"));
  t.check('panel imports the same flag', panel.includes("import { AUTO_TRADING_LIVE_ENABLED } from '../services/trading/kalshiLiveTradingFlag';"));
  t.check('panel does not bundle the Node engine', !panel.includes('kalshiExecutionEngine'));
}

t.section('panel states the real live state');
{
  t.check('ARMED & ACTIVE only when live orders are enabled', /AUTO_TRADING_LIVE_ENABLED\s*\?\s*'ARMED & ACTIVE'\s*:\s*'ARMED · LIVE ORDERS DISABLED'/.test(panel));
  t.eq('ARMED & ACTIVE appears only in that gated branch', (panel.match(/ARMED & ACTIVE/g) || []).length, 1);
  t.check('armed toast gated on the flag', /AUTO_TRADING_LIVE_ENABLED\s*\?\s*'⚡ Kalshi Auto-Trading is now ACTIVE\./.test(panel) && panel.includes('Live-capital orders are disabled in the execution engine'));
  const opt = panel.slice(panel.indexOf('<option value="live"'), panel.indexOf('</option>', panel.indexOf('<option value="live"')));
  t.check('live option says it is disabled when the flag is off', /AUTO_TRADING_LIVE_ENABLED\s*\?\s*'Live DCM Production \(CFTC Regulated Real Capital\)'\s*:\s*'Live Production — live orders DISABLED in execution engine'/.test(opt));
  t.check('explanation shown when the flag is off', /\{!AUTO_TRADING_LIVE_ENABLED && \(/.test(panel) && panel.includes('blocked and logged as BLOCKED'));
}

t.section('score gate is labelled as a score; behaviour unchanged');
{
  t.check('no percent on the gate value', !panel.includes('{config.confidenceThreshold}%'));
  for (const s of ['Signal Confidence Gate', 'Recommended', 'Extreme Conviction', 'High Volume']) t.check(`no "${s}" label`, !panel.includes(s));
  t.check('labelled Engine Score Gate', panel.includes('Engine Score Gate'));
  t.check('value reads ≥ N / 100', panel.includes('≥ {config.confidenceThreshold} / 100'));
  t.check('says the score is not a win probability', panel.includes('not a win probability'));
  t.check('slider range and binding unchanged', /min=\{60\}\s*max=\{95\}\s*step=\{1\}\s*value=\{config\.confidenceThreshold\}/.test(panel) && panel.includes('setConfig({ ...config, confidenceThreshold: Number(e.target.value) })'));
  t.check('engine still gates on the raw score', engine.includes('const userThreshold = config.confidenceThreshold || 80;') && engine.includes('if (confidence < userThreshold) {') && engine.includes('const confidence = Math.round(signal.confidence || 0);'));
}

t.done();
