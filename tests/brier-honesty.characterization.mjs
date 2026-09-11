// CHARACTERIZATION -- Brier scores average only rows that carry one, and nothing invents one.
//
// Averages used `sum + item.brierScore` (one row without a score -> NaN, served
// as null: /api/model-status showed no Brier with 147 settled rows) and
// `acc + (x.brierScore || 0)` (a row without a score counted as a PERFECT 0).
// /api/performance-stats returned a literal 0.185 beside verified: true.
import { serverSrc, extractFn, createHarness } from './_engineSource.mjs';

const t = createHarness('brier-honesty.characterization');
const meanBrier = new Function(`${extractFn('meanBrier', 'function meanBrier(')}; return meanBrier;`)();

t.section('meanBrier (real function from server.ts)');
t.eq('mean of finite scores', meanBrier([{ brierScore: 0.2 }, { brierScore: 0.4 }]).mean, 0.30000000000000004);
t.eq('count of finite scores', meanBrier([{ brierScore: 0.2 }, { brierScore: 0.4 }]).n, 2);
const mixed = meanBrier([{ brierScore: 0.3 }, {}, { brierScore: null }, { brierScore: NaN }, { brierScore: undefined }, { brierScore: 0.1 }]);
t.check('rows without a finite score are skipped, not counted as 0', Math.abs(mixed.mean - 0.2) < 1e-12, `got ${mixed.mean}`);
t.eq('skipped rows are not counted', mixed.n, 2);
t.eq('no scored rows -> null, not 0', meanBrier([{}, { brierScore: null }]).mean, null);
t.eq('empty -> null', meanBrier([]).mean, null);
t.eq('undefined input -> null', meanBrier(undefined).mean, null);
t.check('a genuine 0 score still counts', meanBrier([{ brierScore: 0 }, { brierScore: 0.5 }]).mean === 0.25);

t.section('no averaging site can go NaN or treat a missing score as perfect');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
t.check('no raw `+ item.brierScore` reduce', !/\+\s*item\.brierScore\b/.test(code));
t.check('no raw `+ h.brierScore` reduce', !/\+\s*h\.brierScore\b/.test(code));
t.check('no `(x.brierScore || 0)` default', !/\.brierScore\s*\|\|\s*0\b/.test(code));
t.check('averaging sites call meanBrier', (code.match(/meanBrier\(/g) || []).length >= 7, `calls=${(code.match(/meanBrier\(/g) || []).length}`);

t.section('nothing invents a Brier or a win rate');
t.check('no literal 0.185 Brier', !/brierScore:\s*0\.185/.test(code));
t.check('performance-stats returns a null Brier (and does not call journal stats verified)', /res\.json\(\{ winRate, brierScore: null, sampleSize, verified: false, source: "SELF_REPORTED_JOURNAL" \}\);/.test(serverSrc));
t.check('resolved-log win rate is null with nothing settled', /totalCount > 0 \? Math\.round\(\(winCount \/ totalCount\) \* 1e3\) \/ 10 : null;/.test(serverSrc));
t.check('resolved-log exposes how many rows the Brier covers', /brierScoredCount,/.test(serverSrc));

t.done();
