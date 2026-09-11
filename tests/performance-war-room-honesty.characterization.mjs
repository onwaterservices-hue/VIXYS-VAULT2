// CHARACTERIZATION -- the Performance War Room reads the live ledger, it does not stage one.
//
// The view used to be entirely static: invented run counts, Brier 0.052 and log
// loss 0.284, a reliability table and regime matrix nobody measured, benchmark
// rows for market consensus / momentum / random forecasters and HaydBot, six
// "PASS" integrity checks, a "PERSISTENCE VERIFIED" recovery matrix, a
// "RECONCILIATION PASSED" proof over 520 records, and a settlement tape of $64k
// BTC prints -- while production measured Brier 0.223 over 146 settled locks.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('performance-war-room-honesty.characterization');

const strip = (src) =>
  src
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*') && !s.startsWith('{/*');
    })
    .join('\n');

const raw = readRepoFile('src/components/PerformanceLabView.tsx');
const view = strip(raw);

t.section('no staged figures remain');
const fiction = [
  '0.052', '0.284', 'VIXY_BASELINE_V1', 'totalCyclesRecorded', 'correctLocks: 118',
  '78.2%', '62.4%', '49.8%', 'KALSHI/POLY_CONSENSUS', 'BTC_3M_MOMENTUM', 'RANDOM_UNIFORM', 'HaydBot',
  '6 / 6 PASSED', 'PERSISTENCE VERIFIED', 'RECONCILIATION PASSED', 'RESIDUAL = 0',
  "'520'", '>520<', '>396<', 'BTC-15M-8821', '$63,940.00', '$64,120.50',
  'Empirical Slope', '0.982', 'IMMUTABLE', 'Near-Ideal Curve', 'FROZEN MODEL',
  'maxWinStreak = 14', 'VERIFIED SETTLEMENT RECORD TAPE',
];
for (const f of fiction) t.check(`no staged value: ${f}`, !view.includes(f));
t.check('no hardcoded bucket table', !/const confidenceBuckets = \[/.test(view));
t.check('no hardcoded regime matrix', !/const regimeMatrix = \[/.test(view));
t.check('no hardcoded integrity checks', !/const integrityChecks = \[/.test(view));
t.check('no hardcoded settlement tape', !/const verifiedSettlements = \[/.test(view));

t.section('figures come from the live ledger');
t.check('reads resolved-log', view.includes("safeFetchJson<ResolvedLogResponse>('/api/signal/resolved-log?limit=50')"));
t.check('reads confidence buckets', view.includes("safeFetchJson<ConfidenceBucketsResponse>('/api/signal/confidence-buckets')"));
t.check('reads calibration report', view.includes("safeFetchJson<CalibrationReportResponse>('/api/signal/calibration-report')"));
t.check('accuracy is the ledger win rate', view.includes("fmt(stats?.winRatePct, 1, '%')"));
t.check('Brier is the ledger average', view.includes('fmt(stats?.avgBrierScore, 3)'));
t.check('log loss is the calibration report', view.includes('fmt(report?.avgLogLoss, 3)'));
t.check('confidence interval is Wilson over real wins / total', view.includes('wilsonInterval(stats.winCount, stats.total)'));
t.check('tape renders real settled rows', view.includes('settledRows.slice(0, 8).map'));

t.section('references are arithmetic, not judgments');
t.check('coin-flip Brier is exactly 0.25', raw.includes('const COIN_FLIP_BRIER = 0.25;'));
t.check('coin-flip log loss is exactly ln 2', raw.includes('const COIN_FLIP_LOG_LOSS = Math.log(2);'));
t.check('regime section says not recorded instead of inventing a matrix', view.includes('Not recorded. Lock rows do not store the market regime'));
t.check('reliability curve plots only bands with enough rows', view.includes('b.predictions >= MIN_BUCKET_N'));

t.section('Wilson interval (real function)');
{
  const start = raw.indexOf('function wilsonInterval(');
  const end = raw.indexOf('\n}\n', start) + 2;
  const js = raw.slice(start, end).replace(/: number \| null/g, '').replace(/\): \[number, number\] \| null/, ')').replace(/\(wins: number, n: number\)/, '(wins, n)');
  const wilson = new Function(`${js}; return wilsonInterval;`)();
  t.eq('n=0 -> null', wilson(0, 0), null);
  const [lo, hi] = wilson(105, 146);
  t.check('105/146 -> interval brackets 71.9%', lo < 71.9 && hi > 71.9, `got ${lo}-${hi}`);
  t.check('interval stays inside 0-100', lo >= 0 && hi <= 100);
}

t.done();
