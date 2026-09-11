// The Explainability page must explain the real engine. Before this test it
// showed a fixed "78.4% calibrated / 84.0% raw" probability, six invented
// engine modules with weights and "observed facts" at $64,200, a scripted
// confidence timeline, "historical matches" with 96.4% similarity on made-up
// dates, and a cross-asset ranking that included NVDA and SPY, which VIXY
// has no data for.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('explainability-honesty.characterization');

const strip = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('{/*');
    })
    .join('\n');

const raw = readRepoFile('src/components/ExplainabilityVaultView.tsx');
const ex = strip(raw);
const app = readRepoFile('src/App.tsx');

t.section('no invented explainability data');
for (const lit of [
  '78.4%',
  '84.0%',
  '88.0%',
  '76.4%',
  '+$4.2M',
  '$18.4M',
  '$64,200',
  '$64,650',
  '$95,800',
  'NVDA',
  'SPY',
  'July 14, 2026',
  '96.4',
  '1,400+',
  '1,420',
  '12% Conflict',
  '5 / 6 Engines',
  'WOULD INCREASE CONFIDENCE',
  'engineModules',
  'historicalMatches',
  'opportunityRankings',
  'confidenceTimeline',
  'Showing Raw Model Scores',
  '18% ATR',
]) {
  t.check(`no fabricated literal "${lit}"`, !ex.includes(lit));
}

t.section('explains the live engine');
t.check('engine content only for BTC while LIVE', ex.includes("isBtc && engineFeedHealth === 'LIVE'"));
t.check('headline comes from the shared engine semantics', ex.includes('headline(engineDecision)'));
t.check('an engine score is labelled as not a probability', ex.includes('This is not a probability'));
t.check('evidence families come from the live payload', ex.includes('engineDecision?.gemini?.evidenceFactors'));
t.check('family backing is read from the bias', ex.includes("f.direction === 'UP' || f.direction === 'DOWN'"));
t.check('blockers are the failing lock gate checks', ex.includes('engineDecision?.lockGate?.checks') && ex.includes('!c.pass'));
t.check('timeline is the engine conviction trail', ex.includes('engineDecision?.convictionTrail'));
t.check('calibration fields are shown as the server sends them', ex.includes('calibrated?.tableVersion') && ex.includes('calibrated?.volBin'));

t.section('past cycles come from the ledger');
t.check('reads the resolved log', ex.includes('/api/signal/resolved-log?limit='));
t.check('record is the BTC ledger stats', ex.includes('stats?.perAsset?.BTC'));
t.check('outcomes are read from status, never assumed', ex.includes("status === 'RESOLVED'") && ex.includes("'NO TRADE'") && ex.includes("'PENDING'"));

t.section('gating and wiring');
t.check('unlock still requires discordLinked AND guildMember', /discordLinked[\s\S]{0,60}&&[\s\S]{0,60}guildMember/.test(raw));
const mount = app.slice(app.indexOf('<ExplainabilityVaultView'), app.indexOf('/>', app.indexOf('<ExplainabilityVaultView')));
t.check('App passes the live engine to Explainability', mount.includes('engineDecision={canonical15m.decision}') && mount.includes('engineFeedHealth={canonical15m.dataHealthStatus}'));

t.done();
