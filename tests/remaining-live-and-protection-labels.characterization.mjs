// CHARACTERIZATION -- no unconditional LIVE badges, "protection" cards or skip-as-calibrating labels.
//
// /vixy-locks carried literal pulsing "ENGINE LIVE" and "LIVE RECORDING" badges, a
// pinging "IMMUTABLE LOCK / CAPITAL PROTECTED" chip, skipped cycles titled
// "CALIBRATING" and "CAPITAL PRESERVED", and an invented "Multi-model ensemble
// consensus" reason. The VIXY Live "VIXY PROTECTION" card showed the reversal veto
// (SAFE / VETOED) as protection with a late-cycle claim for a field that is always
// null. Replay Center rendered engine scores as %, Compare called a feed that can
// fall back to Binance "Coinbase", the hub described the whale tracker as
// "institutional order flow & whale sweeps", and the landing badge pinged.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('remaining-live-and-protection-labels.characterization');
const strip = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

t.section('/vixy-locks');
{
  const ha = strip(readRepoFile('src/components/HistoricalAccuracy.tsx'));
  t.check('no literal ENGINE LIVE badge', !ha.includes('> ENGINE LIVE') && ha.includes("liveState ? 'ENGINE STATE LOADED' : 'ENGINE STATE UNAVAILABLE'"));
  t.check('no LIVE RECORDING badge', !ha.includes('LIVE RECORDING'));
  t.check('no pinging IMMUTABLE LOCK / CAPITAL PROTECTED chip', !ha.includes('IMMUTABLE LOCK') && !ha.includes('CAPITAL PROTECTED') && !/rounded-full animate-ping/.test(ha));
  t.check('skips are NO CALL, not CALIBRATING', !/Shield[^>]*\/>\s*CALIBRATING/.test(ha) && (ha.match(/NO CALL/g) || []).length >= 4);
  t.check('no CAPITAL PRESERVED', !ha.includes('CAPITAL PRESERVED'));
  t.check('invalidated rows say INVALIDATED', ha.includes("'CRITICALLY_INVALIDATED' ? 'INVALIDATED' : 'NO CALL'"));
  t.check('no invented ensemble reason', !/Multi-model ensemble/.test(ha) && ha.includes('No reason was recorded for this lock.'));
  t.check('spot dot only with a real spot', ha.includes('{spot != null && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}'));
}

t.section('VIXY Live reversal veto card');
{
  const mc = strip(readRepoFile('src/components/vixy-live-workspace/ModuleCards.tsx'));
  t.check('card is REVERSAL VETO', mc.includes('title="REVERSAL VETO"') && !mc.includes('title="VIXY PROTECTION"'));
  t.check('no late-cycle protection claim', !mc.includes('Late-cycle protection') && !mc.includes('lateCycleProtectionActive'));
  t.check('score named for what it is', mc.includes('label="100 − GUARDIAN SURVIVAL SCORE"') && !mc.includes('CAPITAL PRESERVATION SCORE'));
  t.check('module picker title', readRepoFile('src/config/vixyLiveModules.ts').includes("title: 'Reversal Veto',"));
}

t.section('hub, replay, compare, landing');
t.check('hub whale tracker description is factual', !readRepoFile('src/components/VixyHubView.tsx').includes('whale sweeps'));
{
  const rc = readRepoFile('src/components/ReplayCenterView.tsx');
  t.check('replay lock frame labels engine score vs rule P', rc.includes("row.lockPolicy === 'STRIKE_SIDE_RULE' ? `rule P ${Math.round(row.confidence)}%` : `engine score ${Math.round(row.confidence)} / 100`"));
  t.check('replay engine card labels engine score vs rule P', rc.includes("active.lockPolicy === 'STRIKE_SIDE_RULE' ? Math.round(active.confidence) + '%' : Math.round(active.confidence) + ' / 100'"));
}
{
  const cv = strip(readRepoFile('src/components/CompareView.tsx'));
  t.check('compare does not name a venue it may not be using', !cv.includes('24H · Coinbase') && !cv.includes('live Coinbase spot'));
}
t.check('landing badge does not ping', !readRepoFile('src/components/LandingPage.tsx').includes('animate-ping'));

t.done();
