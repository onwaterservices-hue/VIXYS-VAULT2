// CHARACTERIZATION -- the global status bar, hub hero and LIVE badges show only what they measure.
//
// The status bar on every page printed a literal "LATENCY: 0.8s" and turned SYSTEM ONLINE,
// VIXY ENGINE ACTIVE and FIRESTORE CONNECTED green from the market feed flag, defaulting that
// flag to LIVE. The hub hero and the right rail printed the 0-100 engine score as "N%", the
// hub called any reversal threat of 30+ "Moderate" and fell back to an invented contract id.
// The sidebar, scalping desk and watchlist carried literal LIVE badges; the notification
// panel claimed "Live surveillance active & monitoring 24/7"; the evidence card called the
// share of aligned signals "SIGNAL CONVICTION".
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('status-bar-and-live-badges.characterization');
const strip = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

t.section('system status bar');
{
  const bar = strip(readRepoFile('src/components/vixyV2/SystemStatusBar.tsx'));
  t.check('no literal latency', !bar.includes('0.8s') && !bar.includes('LATENCY'));
  t.check('no Firestore / system / engine claims derived from the feed flag', !bar.includes('FIRESTORE') && !bar.includes('ONLINE') && !bar.includes('VIXY ENGINE'));
  t.check('feed flag no longer defaults to LIVE', !bar.includes("dataHealthStatus = 'LIVE'") && bar.includes("dataHealthStatus = 'CONNECTING'"));
  t.check('data age comes from a prop, null shows a dash', bar.includes('dataAgeMs = null') && bar.includes('(dataAgeMs / 1000).toFixed(1)'));
  const app = readRepoFile('src/App.tsx');
  t.check('App passes the server feedHealth.dataAgeMs', /dataAgeMs=\{typeof \(canonical15m\.decision as any\)\?\.feedHealth\?\.dataAgeMs === 'number'/.test(app));
}

t.section('hub hero and rail headline');
{
  const hub = strip(readRepoFile('src/components/VixyHubView.tsx'));
  t.check('hub never appends % to the headline value', !hub.includes('`${hl.value}%`') && (hub.match(/headlineText\(hl\)/g) || []).length === 2);
  t.check('reversal risk is a score, not a percent, with no invented tier words', !hub.includes('`${reversalRisk}%`') && !hub.includes('Low Hazard') && hub.includes("'Threat score, not a probability'"));
  t.check('no invented contract id', !hub.includes('BTC-15M-CANONICAL'));
  t.check('BTC/USD dot does not pulse and is grey without a price', !/animate-pulse" \/>\s*<span className="text-purple-200 font-bold">BTC\/USD/.test(hub) && hub.includes("spotPrice !== null ? 'bg-emerald-400' : 'bg-slate-600'"));
  t.check('no institutional / neural / immutable / execution card copy', !/institutional macro|neural weights|Immutable historical|ultra-fast taker execution/.test(hub));
  const rail = strip(readRepoFile('src/components/vixyV2/ContextualRightRail.tsx'));
  t.check('rail signal badge uses headlineText', !rail.includes('`${hl.value}%`') && rail.includes('{headlineText(hl)}'));
  const ev = readRepoFile('src/utils/evidenceVectors.ts');
  t.check('Volume vector fallbacks invent no volume or liquidity reading', !/20-period moving average|liquidity expansion verified|Awaiting volume aggregation/.test(ev));
  t.check('aligned share is not called conviction', !ev.includes('% SIGNAL CONVICTION') && ev.includes('% OF SCORED SIGNALS ALIGNED') && ev.includes('AVG SCORE ${compositeDisplay}/10'));
}

t.section('LIVE badges and notification copy');
{
  const sidebar = readRepoFile('src/components/Sidebar.tsx');
  t.check('sidebar has no literal LIVE badge', !/badge: "LIVE"/.test(sidebar));
  const scalp = strip(readRepoFile('src/components/ScalpDecisionChart.tsx'));
  t.check('scalping desk engine state follows engineLive', !scalp.includes('<span className="text-[#00FF88] text-[9px]">LIVE</span>') && scalp.includes("{engineLive ? 'LIVE' : 'NOT LIVE'}"));
  const cards = strip(readRepoFile('src/components/vixy-live-workspace/ModuleCards.tsx'));
  t.check('watchlist header follows ticker status', !cards.includes('font-bold">LIVE TICKERS</span>') && cards.includes("{status === 'LIVE' ? 'LIVE TICKERS' : status === 'LOADING' ? 'LOADING' : 'UNAVAILABLE'}"));
  const header = strip(readRepoFile('src/components/Header.tsx'));
  t.check('no 24/7 surveillance or real-time stream claim', !header.includes('Live surveillance') && !header.includes('Real-Time Event Stream') && !/Radio className="w-3 h-3 text-cyan-400 animate-pulse"/.test(header));
}

t.done();
