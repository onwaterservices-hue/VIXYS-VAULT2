// CHARACTERIZATION -- the lock score is shown on the 0-100 scale the server sends.
//
// The Prediction Center, the hub and the workspace Lock Quality card multiplied
// any lock score <= 10 by ten (a leftover 0-10 scale). The server's lockQuality
// is clamped to 0-99, and a 14-day replay scored <= 10 on 564 of 19,978 ticks
// (2.8%), so a weak 8 read as "80 / 100" and could show the gate as met.
// /api/vixy/15m/current also defaulted a missing lockScore to 50, reversalRisk to
// 20 and capital preservation to 0.
import { serverSrc, readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('lock-score-scale-honesty.characterization');
const sites = [
  ['src/components/CryptoPredictionCenterView.tsx', 'rawLockScore', /typeof rawLockScore === 'number' && Number\.isFinite\(rawLockScore\) \? (Math\.max\(0, Math\.min\(100, Math\.round\(rawLockScore\)\)\)) : null;/],
  ['src/components/VixyHubView.tsx', 'lockScoreRaw', /lockScoreRaw === null \? null : (Math\.max\(0, Math\.min\(100, Math\.round\(lockScoreRaw\)\)\));/],
  ['src/components/vixy-live-workspace/ModuleCards.tsx', 'raw', /typeof raw === 'number' && Number\.isFinite\(raw\) \? (Math\.max\(0, Math\.min\(100, Math\.round\(raw\)\)\)) : null;/],
];
for (const [file, v, re] of sites) {
  const src = readRepoFile(file);
  t.check(`${file}: no x10 rescale`, !/<= ?10 \? ?\(?Math\.round\([A-Za-z]+ \* ?10\)/.test(src));
  const m = src.match(re);
  t.check(`${file}: shows the score as sent`, Boolean(m));
  if (m) {
    const f = new Function(v, `return ${m[1]};`);
    t.eq(`${file}: 8 stays 8 (was 80)`, f(8), 8);
    t.eq(`${file}: 10 stays 10 (was 100)`, f(10), 10);
    t.eq(`${file}: 57.4 -> 57`, f(57.4), 57);
  }
}

const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
const r0 = code.indexOf('app.get("/api/vixy/15m/current"');
const route = code.slice(r0, code.indexOf('\napp.', r0 + 10));
t.check('15m/current: no lockScore / lockProgressPct default 50', !/lockQuality \?\? 50/.test(route));
t.check('15m/current: no reversalRisk default 20', !/threatScore \?\? 20/.test(route));
t.check('15m/current: no capital preservation from a missing survival score', !/survivalScore \?\? 100/.test(route) && /typeof latestGuardianDecision\?\.survivalScore === "number"/.test(route));

t.done();
