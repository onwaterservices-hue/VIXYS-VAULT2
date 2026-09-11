// CHARACTERIZATION -- /api/signal/calibration-report measures, it does not invent.
//
// Production 2026-09-11: for 146 settled rows whose stored Brier averages 0.223,
// the report served Brier 0.709 and log loss 3.315. Cause: lock rows store
// probability as a FRACTION (0.661-0.797) and the report divided it by 100
// (p ~= 0.007). Empty buckets reported the bucket midpoint as calibration
// error, zero-cycle regimes reported 70% / 75, and a "SKIP" tier counted every
// settled lock.
import { serverSrc, sliceBetween, extractFn, createHarness } from './_engineSource.mjs';

const t = createHarness('calibration-report-honesty.characterization');
const probOf = new Function(`${extractFn('calibrationProbabilityOf', 'function calibrationProbabilityOf(')}; return calibrationProbabilityOf;`)();
const confOf = new Function(`${extractFn('calibrationConfidenceOf', 'function calibrationConfidenceOf(')}; return calibrationConfidenceOf;`)();

t.section('probability / confidence readers (real helpers)');
t.eq('fractional probability is used as-is', probOf({ probability: 0.755, confidence: 91 }), 0.755);
t.eq('percent confidence converts to a fraction when no probability', probOf({ confidence: 81 }), 0.81);
t.eq('no forecast -> null (never 0.75)', probOf({}), null);
t.eq('confidence 0 is not a forecast', probOf({ confidence: 0 }), null);
t.eq('confidence read as percent', confOf({ confidence: 88 }), 88);
t.eq('probability converts to percent when no confidence', confOf({ probability: 0.712 }), 71);
t.eq('no forecast -> null confidence', confOf({}), null);

t.section('report handler (real source)');
const start = serverSrc.indexOf('app.get("/api/signal/calibration-report"');
const handler = serverSrc.slice(start, serverSrc.indexOf('\n});', start));
const code = handler.split('\n').map((l) => l.split('//')[0]).join('\n');
t.check('handler found and async', /app\.get\("\/api\/signal\/calibration-report", async \(req, res\) =>/.test(handler));
t.check('hydrates the ledger before computing', /await ensureLedgerFresh\(\)/.test(handler));
t.check('no probability divided by 100', !/probability[^\n]*\)\s*\/\s*100/.test(code));
t.check('no `|| 75` default', !/\|\|\s*75\b/.test(code));
t.check('no invented 0.512 log loss', !/0\.512/.test(code));
t.check('no invented 70 / 75 regime defaults', !/winRatePct:[^\n]*: 70,/.test(code) && !/avgConfidence:[\s\S]{0,200}?: 75,/.test(code));
t.check('pseudo SKIP tier removed', !/tier: "SKIP"/.test(code));
t.check('tiers state their basis', /basis: `confidence >= \$\{t\.minConfidence\}/.test(handler));
t.check('reports how many rows were scored', /scoredRows: scored\.length/.test(handler));

t.section('arithmetic on ledger-shaped rows');
// Rows exactly as the ledger stores them: fractional probability, percent confidence.
const rows = [
  { probability: 0.755, confidence: 91, wasCorrect: true },
  { probability: 0.755, confidence: 88, wasCorrect: false },
  { probability: 0.661, confidence: 81, wasCorrect: true },
  { confidence: 86, wasCorrect: true }, // no probability -> 0.86
  { wasCorrect: false },                // no forecast -> excluded
];
const scored = rows.map((s) => ({ p: probOf(s), y: s.wasCorrect ? 1 : 0 })).filter((r) => r.p !== null);
const brier = scored.reduce((a, r) => a + (r.p - r.y) ** 2, 0) / scored.length;
t.eq('unscorable row excluded', scored.length, 4);
t.check('Brier is on the 0-1 scale of real probabilities (~0.19 here, not ~0.7)', brier > 0.15 && brier < 0.25, `got ${brier}`);

t.done();
