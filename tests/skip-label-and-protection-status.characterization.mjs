// CHARACTERIZATION -- a skip is not capital protection; the served protection status is the engine's.
//
// The paid terminal titled a skipped cycle "VIXY SKIP — CAPITAL PROTECTED" in the
// cycle chip and the context bar. A skip means the lock gate was not met and no
// call was made; nothing protected anything. The canonical decision payload also
// served the engine's reversal veto status through an allow-list that lacked
// "SAFE", so every non-vetoed tick reached the REVERSAL VETO card as "WATCH", a
// status the engine never set.
import { serverSrc, readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('skip-label-and-protection-status.characterization');
const strip = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

t.section('paid terminal skip label');
{
  const cpcv = strip(readRepoFile('src/components/CryptoPredictionCenterView.tsx'));
  t.check('no "CAPITAL PROTECTED" skip label', !cpcv.includes('CAPITAL PROTECTED'));
  t.check('chip and context bar both read NO CALL THIS CYCLE', (cpcv.match(/VIXY SKIP — NO CALL THIS CYCLE/g) || []).length === 2);
}

t.section('served protectionStatus');
{
  const src = strip(serverSrc);
  const m = src.match(/const protectionStat = \[([\s\S]*?)\]\.includes\(active15mCycle\.protectionStatus\)\s*\?\s*active15mCycle\.protectionStatus\s*:\s*([^;]+);/);
  t.check('protectionStat block found', !!m);
  const allowed = m ? [...m[1].matchAll(/"([A-Z_]+)"/g)].map((x) => x[1]) : [];
  const engineValues = new Set([
    ...[...src.matchAll(/active15mCycle\.protectionStatus = "([A-Z_]+)"/g)].map((x) => x[1]),
    ...[...src.matchAll(/^\s*protectionStatus: "([A-Z_]+)",/gm)].map((x) => x[1]),
  ]);
  t.check('engine sets SAFE and VETOED', engineValues.has('SAFE') && engineValues.has('VETOED'));
  for (const v of engineValues) t.check(`engine value ${v} passes through unchanged`, allowed.includes(v));
  t.check('an unknown status is null, not an invented WATCH', m && m[2].trim() === 'null');
  const types = readRepoFile('src/types/canonicalDecision.ts');
  t.check('canonical type admits SAFE and null', /protectionStatus: 'SAFE' \|[^;]*\| null;/.test(types));
}

t.done();
