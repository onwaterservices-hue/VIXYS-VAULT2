import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart2,
  Database,
  Layers,
  RefreshCw,
  Target,
} from 'lucide-react';
import { safeFetchJson } from '../services/api';

// Performance War Room -- every figure on this page is read from the live ledger.
//
// This view used to be entirely static: a "frozen model" with invented run
// counts (184 cycles / 136 resolved / 118 correct), Brier 0.052, log loss 0.284,
// a reliability table and regime matrix nobody measured, benchmark rows for
// market consensus / momentum / random forecasters, six "PASS" integrity checks,
// a "PERSISTENCE VERIFIED" recovery matrix, a "RECONCILIATION PASSED" identity
// proof over 520 records, and a settlement tape of $64k BTC prints. Production
// at the time measured Brier 0.223 over 146 settled locks.
//
// Sources (all public, read-only):
//   /api/signal/resolved-log       settled counts, win rate, Brier, recent rows
//   /api/signal/confidence-buckets per-confidence-band outcomes
//   /api/signal/calibration-report log loss over rows that carry a probability
// Anything the ledger does not record is shown as not recorded, never estimated.

interface LedgerStats {
  total: number;
  winCount: number;
  lossCount: number;
  winRatePct: number | null;
  upWins: number;
  downWins: number;
  avgBrierScore: number | null;
  brierScoredCount?: number;
  skipped: number;
  excludedPending?: number;
}

interface LedgerRow {
  id: string;
  intervalStart?: string;
  direction?: string;
  status?: string;
  probability?: number | null;
  confidence?: number | null;
  targetStrike?: number | null;
  spotAtLock?: number | null;
  settlementPrice?: number | null;
  actualDirection?: string | null;
  wasCorrect?: boolean | null;
  brierScore?: number | null;
}

interface ResolvedLogResponse {
  recentResolved: LedgerRow[];
  stats: LedgerStats;
}

interface ConfidenceBucket {
  bucket: string;
  minConfidence: number;
  maxConfidence: number;
  predictions: number;
  wins: number;
  losses: number;
  empiricalAccuracyPct: number | null;
  avgPredictedConfidencePct: number | null;
  calibrationErrorPct: number | null;
}

interface ConfidenceBucketsResponse {
  totalSettledCycles: number;
  unbucketedRows?: number;
  buckets: ConfidenceBucket[];
}

interface CalibrationReportResponse {
  sampleSize: number;
  avgLogLoss: number | null;
  scoredRows?: number;
}

const MIN_BUCKET_N = 5;
const MIN_SAMPLE_FOR_STATUS = 30;
const COIN_FLIP_BRIER = 0.25; // (0.5 - y)^2 for any outcome
const COIN_FLIP_LOG_LOSS = Math.log(2); // -ln(0.5)

// Wilson score interval for a binomial proportion (z = 1.96).
function wilsonInterval(wins: number, n: number): [number, number] | null {
  if (!n) return null;
  const z = 1.96;
  const p = wins / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - half) * 100, Math.min(1, centre + half) * 100];
}

const dash = '—';
const fmt = (v: number | null | undefined, digits: number, suffix = '') =>
  typeof v === 'number' && Number.isFinite(v) ? `${v.toFixed(digits)}${suffix}` : dash;
const timeUtc = (iso?: string) => (iso ? `${new Date(iso).toISOString().slice(11, 16)}Z` : dash);
const usd = (v?: number | null) =>
  typeof v === 'number' && Number.isFinite(v) ? `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : dash;

export const PerformanceLabView: React.FC = () => {
  const [ledger, setLedger] = useState<ResolvedLogResponse | null>(null);
  const [buckets, setBuckets] = useState<ConfidenceBucketsResponse | null>(null);
  const [report, setReport] = useState<CalibrationReportResponse | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [l, b, r] = await Promise.all([
        safeFetchJson<ResolvedLogResponse>('/api/signal/resolved-log?limit=50'),
        safeFetchJson<ConfidenceBucketsResponse>('/api/signal/confidence-buckets'),
        safeFetchJson<CalibrationReportResponse>('/api/signal/calibration-report'),
      ]);
      if (!active) return;
      if (l) setLedger(l);
      if (b) setBuckets(b);
      if (r) setReport(r);
      setLoadedAt(Date.now());
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const stats = ledger?.stats ?? null;
  const settledRows = useMemo(
    () => (ledger?.recentResolved ?? []).filter((r) => r.status === 'RESOLVED' && typeof r.wasCorrect === 'boolean'),
    [ledger],
  );

  const ci = stats ? wilsonInterval(stats.winCount, stats.total) : null;
  const sampleStatus = !stats ? 'LOADING' : stats.total < MIN_SAMPLE_FOR_STATUS ? 'INSUFFICIENT SAMPLE' : 'MEASURED';

  const measuredBuckets = useMemo(
    () =>
      (buckets?.buckets ?? []).filter(
        (b) => b.predictions >= MIN_BUCKET_N && b.avgPredictedConfidencePct !== null && b.empiricalAccuracyPct !== null,
      ),
    [buckets],
  );
  // Sample-weighted mean |predicted - realized| over buckets with enough rows.
  const calibrationErrorPct = useMemo(() => {
    const n = measuredBuckets.reduce((a, b) => a + b.predictions, 0);
    if (!n) return null;
    return (
      measuredBuckets.reduce(
        (a, b) => a + b.predictions * Math.abs((b.avgPredictedConfidencePct as number) - (b.empiricalAccuracyPct as number)),
        0,
      ) / n
    );
  }, [measuredBuckets]);

  // Streaks over the settled rows returned, oldest first.
  const streaks = useMemo(() => {
    const ordered = [...settledRows].sort(
      (a, b) => new Date(a.intervalStart || 0).getTime() - new Date(b.intervalStart || 0).getTime(),
    );
    let bestWin = 0;
    let bestLoss = 0;
    let win = 0;
    let loss = 0;
    for (const r of ordered) {
      if (r.wasCorrect) {
        win += 1;
        loss = 0;
      } else {
        loss += 1;
        win = 0;
      }
      bestWin = Math.max(bestWin, win);
      bestLoss = Math.max(bestLoss, loss);
    }
    return { bestWin, bestLoss, n: ordered.length };
  }, [settledRows]);

  // Deterministic "always UP" baseline over the same settled rows.
  const alwaysUp = useMemo(() => {
    const graded = settledRows.filter((r) => r.actualDirection === 'UP' || r.actualDirection === 'DOWN');
    if (!graded.length) return null;
    return { accuracy: (graded.filter((r) => r.actualDirection === 'UP').length / graded.length) * 100, n: graded.length };
  }, [settledRows]);

  const unscoredRows = stats && typeof stats.brierScoredCount === 'number' ? stats.total - stats.brierScoredCount : null;
  const skipRatePct = stats && stats.skipped + stats.total > 0 ? (stats.skipped / (stats.skipped + stats.total)) * 100 : null;

  const composition: Array<[string, string | number, string]> = [
    ['SETTLED LOCKS', stats ? stats.total : dash, 'text-white'],
    ['WINS (UP / DOWN)', stats ? `${stats.winCount} (${stats.upWins} / ${stats.downWins})` : dash, 'text-emerald-400'],
    ['LOSSES', stats ? stats.lossCount : dash, 'text-red-400'],
    ['SKIPPED CYCLES', stats ? stats.skipped : dash, 'text-purple-300'],
    ['PENDING LOCKS', stats && typeof stats.excludedPending === 'number' ? stats.excludedPending : dash, 'text-blue-400'],
    ['ROWS WITH A BRIER', stats && typeof stats.brierScoredCount === 'number' ? stats.brierScoredCount : dash, 'text-purple-200'],
    ['ROWS WITHOUT A BRIER', unscoredRows ?? dash, 'text-amber-300'],
    ['ROWS WITH NO CONFIDENCE', buckets && typeof buckets.unbucketedRows === 'number' ? buckets.unbucketedRows : dash, 'text-amber-300'],
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans text-purple-100 pb-20">

      {/* 1. BANNER */}
      <div className="bg-gradient-to-r from-[#14082B] via-[#0D051F] to-[#170A33] border-2 border-purple-500/50 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-purple-950/80">
        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-mono text-xs font-bold border border-purple-500/40 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                BTC 15-MINUTE ENGINE
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
                STATUS: {sampleStatus}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">VIXY PERFORMANCE WAR ROOM</h1>
            <p className="text-purple-300/80 mt-2 font-mono text-xs">
              Live ledger readout • settled locks only • refreshed every 60s
            </p>
          </div>
          <div className="font-mono text-xs text-purple-300/80 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            {loadedAt ? `Updated ${new Date(loadedAt).toISOString().slice(11, 19)}Z` : 'Loading ledger…'}
          </div>
        </div>
      </div>

      {/* 2. CORE METRIC TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-[#0c0620] p-4 rounded-2xl border border-purple-500/30 space-y-1">
          <span className="text-[10px] text-purple-300/70 uppercase font-bold block">Directional Accuracy</span>
          <span className="text-2xl font-black text-emerald-400">{fmt(stats?.winRatePct, 1, '%')}</span>
          <span className="text-[10px] text-emerald-300/80 block font-semibold">
            {ci ? `95% CI ${ci[0].toFixed(1)}–${ci[1].toFixed(1)}% • n=${stats?.total}` : dash}
          </span>
        </div>
        <div className="bg-[#0c0620] p-4 rounded-2xl border border-purple-500/30 space-y-1">
          <span className="text-[10px] text-purple-300/70 uppercase font-bold block">Brier Score</span>
          <span className="text-2xl font-black text-purple-200">{fmt(stats?.avgBrierScore, 3)}</span>
          <span className="text-[10px] text-purple-400 block font-semibold">
            coin-flip = {COIN_FLIP_BRIER.toFixed(3)} • n={stats?.brierScoredCount ?? dash} scored
          </span>
        </div>
        <div className="bg-[#0c0620] p-4 rounded-2xl border border-purple-500/30 space-y-1">
          <span className="text-[10px] text-purple-300/70 uppercase font-bold block">Log Loss</span>
          <span className="text-2xl font-black text-purple-200">{fmt(report?.avgLogLoss, 3)}</span>
          <span className="text-[10px] text-purple-400 block font-semibold">
            coin-flip = {COIN_FLIP_LOG_LOSS.toFixed(3)} • n={report?.scoredRows ?? dash}
          </span>
        </div>
        <div className="bg-[#0c0620] p-4 rounded-2xl border border-purple-500/30 space-y-1">
          <span className="text-[10px] text-purple-300/70 uppercase font-bold block">Calibration Error</span>
          <span className="text-2xl font-black text-amber-300">{fmt(calibrationErrorPct, 1, '%')}</span>
          <span className="text-[10px] text-purple-400 block font-semibold">
            weighted over {measuredBuckets.length} band(s) with n ≥ {MIN_BUCKET_N}
          </span>
        </div>
        <div className="bg-[#0c0620] p-4 rounded-2xl border border-purple-500/30 space-y-1">
          <span className="text-[10px] text-purple-300/70 uppercase font-bold block">Skipped Cycles</span>
          <span className="text-2xl font-black text-amber-300">{stats ? stats.skipped : dash}</span>
          <span className="text-[10px] text-amber-400 block font-semibold">{fmt(skipRatePct, 1, '% of recorded cycles')}</span>
        </div>
        <div className="bg-[#0c0620] p-4 rounded-2xl border border-purple-500/30 space-y-1">
          <span className="text-[10px] text-purple-300/70 uppercase font-bold block">Max Streaks</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-emerald-400">{streaks.n ? `+${streaks.bestWin}` : dash}</span>
            <span className="text-sm text-purple-400 font-bold">/</span>
            <span className="text-lg font-black text-red-400">{streaks.n ? `-${streaks.bestLoss}` : dash}</span>
          </div>
          <span className="text-[10px] text-purple-400 block font-semibold">last {streaks.n} settled rows</span>
        </div>
      </div>

      {/* 3. CONFIDENCE BANDS & RELIABILITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0c0620] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                CONFIDENCE BAND OUTCOMES
              </h3>
              <p className="text-xs text-purple-300/70 mt-0.5">Predicted confidence vs realized win rate, per band.</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/30">
              N = {buckets ? buckets.totalSettledCycles : dash} SETTLED
            </span>
          </div>
          <div className="space-y-3 font-mono text-xs">
            {(buckets?.buckets ?? []).filter((b) => b.predictions > 0).map((b) => {
              const status = b.predictions >= MIN_BUCKET_N ? 'MEASURED' : 'THIN SAMPLE';
              return (
                <div key={b.bucket} className="bg-[#0a0518] p-3.5 rounded-xl border border-purple-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white">{b.bucket} Confidence</span>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-300/70 text-[11px]">{b.predictions} settled</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        status === 'MEASURED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>{status}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px] pt-1 border-t border-purple-900/30">
                    <div><span className="text-purple-400 text-[9px] block uppercase">Predicted</span><span className="text-purple-200 font-bold">{fmt(b.avgPredictedConfidencePct, 1, '%')}</span></div>
                    <div><span className="text-purple-400 text-[9px] block uppercase">Realized</span><span className="text-emerald-400 font-bold">{fmt(b.empiricalAccuracyPct, 1, '%')}</span></div>
                    <div><span className="text-purple-400 text-[9px] block uppercase">Gap</span><span className="text-amber-300 font-bold">{fmt(b.calibrationErrorPct, 1, '%')}</span></div>
                    <div><span className="text-purple-400 text-[9px] block uppercase">W / L</span><span className="text-purple-300 font-bold">{b.wins} / {b.losses}</span></div>
                  </div>
                </div>
              );
            })}
            {buckets && !buckets.buckets.some((b) => b.predictions > 0) && (
              <div className="text-purple-400 text-[11px]">No settled locks in any confidence band yet.</div>
            )}
            {!!buckets?.unbucketedRows && (
              <div className="text-purple-400 text-[10px]">{buckets.unbucketedRows} settled row(s) carry no confidence and sit in no band.</div>
            )}
          </div>
        </div>

        <div className="bg-[#0c0620] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                RELIABILITY CURVE
              </h3>
              <p className="text-xs text-purple-300/70 mt-0.5">Dashed line = perfect calibration. Bands with n ≥ {MIN_BUCKET_N} only.</p>
            </div>
          </div>
          <div className="h-64 bg-[#0a0518] rounded-xl border border-purple-900/40 p-4 relative font-mono">
            {/* x: predicted 50-100%, y: realized 0-100% */}
            <svg className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="50" x2="100" y2="0" stroke="#6B7280" strokeDasharray="2 2" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
              {measuredBuckets.map((b) => {
                const x = (((b.avgPredictedConfidencePct as number) - 50) / 50) * 100;
                const y = 100 - (b.empiricalAccuracyPct as number);
                return <circle key={b.bucket} cx={x} cy={y} r="1.8" fill="#10B981" stroke="#FFFFFF" strokeWidth="0.4" />;
              })}
            </svg>
            {measuredBuckets.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-purple-400 text-[11px]">
                No band has {MIN_BUCKET_N}+ settled locks yet.
              </div>
            )}
            <div className="absolute top-2 left-3 text-[10px] text-purple-400">Realized win rate (%)</div>
            <div className="absolute bottom-1 right-3 text-[10px] text-purple-400">Predicted confidence 50–100%</div>
          </div>
        </div>
      </div>

      {/* 4. REGIME */}
      <div className="bg-[#0c0620] rounded-2xl border border-purple-500/30 p-6 space-y-3 shadow-xl">
        <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          MARKET REGIME BREAKDOWN
        </h3>
        <div className="bg-[#0a0518] p-3.5 rounded-xl border border-amber-500/30 font-mono text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="text-purple-200">
            Not recorded. Lock rows do not store the market regime at lock time, so no per-regime accuracy can be computed yet.
          </span>
        </div>
      </div>

      {/* 5. BASELINES THAT CAN BE COMPUTED */}
      <div className="bg-[#0c0620] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
        <div className="border-b border-purple-900/50 pb-3">
          <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            BASELINE COMPARISON
          </h3>
          <p className="text-xs text-purple-300/70 mt-0.5">Only baselines computable from the same settled rows. No external model figures are shown.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-purple-900/50 text-purple-400 text-[10px] uppercase">
                <th className="pb-3 font-extrabold">Forecaster</th>
                <th className="pb-3 font-extrabold text-center">Accuracy</th>
                <th className="pb-3 font-extrabold text-center">Brier</th>
                <th className="pb-3 font-extrabold text-center">Log Loss</th>
                <th className="pb-3 font-extrabold text-right">Sample</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/30">
              <tr className="bg-purple-900/20 font-bold">
                <td className="py-3 font-black text-white">VIXY 15M engine</td>
                <td className="py-3 text-center text-emerald-400">{fmt(stats?.winRatePct, 1, '%')}</td>
                <td className="py-3 text-center text-purple-200">{fmt(stats?.avgBrierScore, 3)}</td>
                <td className="py-3 text-center text-purple-200">{fmt(report?.avgLogLoss, 3)}</td>
                <td className="py-3 text-right text-purple-300">{stats ? stats.total : dash}</td>
              </tr>
              <tr>
                <td className="py-3 text-white">Always 50/50</td>
                <td className="py-3 text-center text-purple-400">{dash}</td>
                <td className="py-3 text-center text-purple-200">{COIN_FLIP_BRIER.toFixed(3)}</td>
                <td className="py-3 text-center text-purple-200">{COIN_FLIP_LOG_LOSS.toFixed(3)}</td>
                <td className="py-3 text-right text-purple-400">exact</td>
              </tr>
              <tr>
                <td className="py-3 text-white">Always UP</td>
                <td className="py-3 text-center text-purple-200">{alwaysUp ? `${alwaysUp.accuracy.toFixed(1)}%` : dash}</td>
                <td className="py-3 text-center text-purple-400">{dash}</td>
                <td className="py-3 text-center text-purple-400">{dash}</td>
                <td className="py-3 text-right text-purple-300">{alwaysUp ? `${alwaysUp.n} recent` : dash}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. LEDGER COMPOSITION */}
      <div className="bg-[#0c0620] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl font-mono">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          LEDGER COMPOSITION (LIVE)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {composition.map(([label, value, tone]) => (
            <div key={label} className="bg-[#0a0518] p-3 rounded-xl border border-purple-900/40">
              <span className="text-purple-400 text-[10px] block font-bold">{label}</span>
              <span className={`text-lg font-black ${tone}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. SETTLED LEDGER TAPE */}
      <div className="bg-[#0c0620] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
        <div className="border-b border-purple-900/50 pb-3">
          <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            SETTLED LEDGER TAPE
          </h3>
          <p className="text-xs text-purple-300/70 mt-0.5">Most recent settled locks as stored in the ledger.</p>
        </div>
        <div className="space-y-2 font-mono text-xs">
          {settledRows.slice(0, 8).map((s) => (
            <div key={s.id} className="bg-[#0a0518] p-3 rounded-xl border border-purple-900/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white">{s.direction ?? dash}</span>
                  <span className="text-purple-400 text-[10px]">{timeUtc(s.intervalStart)}</span>
                </div>
                <div className="text-purple-300/80 text-[11px] mt-0.5">
                  P(win) {typeof s.probability === 'number' ? `${(s.probability * 100).toFixed(1)}%` : dash}
                  {' • '}spot {usd(s.spotAtLock)} vs strike {usd(s.targetStrike)}
                  {' • '}Brier {fmt(s.brierScore, 3)}
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold block mb-0.5 ${
                  s.wasCorrect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>{s.wasCorrect ? 'WIN' : 'LOSS'}</span>
                <span className="text-purple-400 text-[10px] block">settled {s.actualDirection ?? dash} @ {usd(s.settlementPrice)}</span>
              </div>
            </div>
          ))}
          {ledger && settledRows.length === 0 && (
            <div className="text-purple-400 text-[11px]">No settled locks returned yet.</div>
          )}
        </div>
      </div>

    </div>
  );
};
