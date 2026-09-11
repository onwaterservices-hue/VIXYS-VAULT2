import React, { useState, useEffect } from "react";
import {
  Database,
  Brain,
  Activity,
  Lock,
  TrendingUp,
  Cpu,
  Server,
  BarChart3,
  Zap,
  Target,
} from "lucide-react";

// Every value on this page is read from a route that exists in server.ts.
//
// This page used to poll /api/signal/learning-metrics, which was never
// registered (production answered 404 not_found), so it always rendered a
// hardcoded fallback: Brier 0.000 (a perfect score), lock precision 0%, engine
// OFFLINE, an unconditional VERIFIED badge, "NEXT RUN IN 15m" for a learning run
// that does not exist, directional accuracy that repeated lock precision, and a
// shadow "v1.1.0-RC" candidate nothing evaluates. The engine does not train:
// /api/model-status serves incrementalTraining and lastWeightUpdateSecAgo as
// null. Settled cycles are graded by settlement.
//
// A source that fails to load clears to null, so its cards read "Unavailable"
// instead of zeros or the previous poll's numbers. A field the server serves as
// null renders as a dash.

const UNAVAILABLE = "Unavailable";
const DASH = "—";

async function fetchSource(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
// Server percentages are already on a 0-100 scale with one decimal.
const fmtPct = (v: unknown) => (isNum(v) ? `${v.toFixed(1)}%` : DASH);
const fmtCount = (v: unknown) => (isNum(v) ? v.toLocaleString() : DASH);
// Brier is a 0-1 fraction.
const fmtBrier = (v: unknown) => (isNum(v) ? v.toFixed(3) : DASH);
const fmtGraded = (side: any) =>
  isNum(side?.wins) && isNum(side?.losses)
    ? `${side.wins}W / ${side.losses}L`
    : DASH;
const fmtWinRate = (side: any) =>
  isNum(side?.wins) && isNum(side?.losses) && side.wins + side.losses > 0
    ? fmtPct(Math.round((side.wins / (side.wins + side.losses)) * 1e3) / 10)
    : DASH;

// /api/live-engine/health `engine`: CONNECTED when the serving instance finished
// an engine tick under 15s ago, STALE when longer ago, NOT_STARTED when it has
// not ticked. The server exposes no exact tick age, so only that band is shown.
const ENGINE_TICK_AGE: Record<string, string> = {
  CONNECTED: "< 15s AGO",
  STALE: "15s+ AGO",
  NOT_STARTED: "NO TICK YET",
};
const ENGINE_COLOR: Record<string, string> = {
  CONNECTED: "text-emerald-400",
  STALE: "text-amber-400",
  NOT_STARTED: "text-red-400",
};

export const VixyLearningCenter = () => {
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [calibration, setCalibration] = useState<any>(null);
  const [engineHealth, setEngineHealth] = useState<any>(null);
  const [shadow, setShadow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [model, calib, health, shadowReadout] = await Promise.all([
        fetchSource("/api/model-status"),
        fetchSource("/api/signal/calibration-report"),
        fetchSource("/api/live-engine/health"),
        // Admin-gated by the session cookie; this page is ADMIN/OWNER only.
        fetchSource("/api/research/shadow-l5", { credentials: "include" }),
      ]);
      if (cancelled) return;
      setModelStatus(model);
      setCalibration(calib);
      setEngineHealth(health);
      setShadow(shadowReadout);
      setLoading(false);
    };
    load();
    const int = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(int);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin text-emerald-500">
          <Brain size={32} />
        </div>
      </div>
    );
  }

  const engineState: string | null =
    typeof engineHealth?.engine === "string" ? engineHealth.engine : null;
  const engineText = engineState ?? "UNAVAILABLE";
  const engineColor =
    (engineState && ENGINE_COLOR[engineState]) || "text-red-400";
  const engineTickAge = engineState
    ? (ENGINE_TICK_AGE[engineState] ?? DASH)
    : UNAVAILABLE;

  // recentSettlements are the 10 newest settled cycles; timestamp is resolvedAt.
  // A late sweep can grade an older cycle after a newer one, so take the latest.
  const recentSettlements: any[] = Array.isArray(modelStatus?.recentSettlements)
    ? modelStatus.recentSettlements
    : [];
  const lastSettlementMs = recentSettlements.reduce<number | null>((max, s) => {
    const ts = typeof s?.timestamp === "string" ? Date.parse(s.timestamp) : NaN;
    return Number.isFinite(ts) && (max === null || ts > max) ? ts : max;
  }, null);
  const lastSettlementText = !modelStatus
    ? UNAVAILABLE
    : lastSettlementMs === null
      ? DASH
      : new Date(lastSettlementMs).toLocaleTimeString();

  // hasActiveModel is settledCount >= minRequired on the server.
  const calibrationGateText = !modelStatus
    ? UNAVAILABLE
    : isNum(modelStatus.settledCount) &&
        isNum(modelStatus.minRequired) &&
        typeof modelStatus.hasActiveModel === "boolean"
      ? `${modelStatus.settledCount}/${modelStatus.minRequired} ${modelStatus.hasActiveModel ? "MET" : "NOT MET"}`
      : DASH;
  const noTrainingReported =
    !!modelStatus &&
    modelStatus.incrementalTraining == null &&
    modelStatus.lastWeightUpdateSecAgo == null;

  // Only buckets and regimes that hold settled cycles are real rows.
  const bucketRows: any[] = Array.isArray(calibration?.confidenceBuckets)
    ? calibration.confidenceBuckets.filter(
        (b: any) => isNum(b?.sampleCount) && b.sampleCount > 0,
      )
    : [];
  const regimeRows: any[] = Array.isArray(calibration?.regimeBreakdown)
    ? calibration.regimeBreakdown.filter(
        (r: any) => isNum(r?.totalCycles) && r.totalCycles > 0,
      )
    : [];

  const ruleVersion =
    typeof shadow?.tableVersion === "string" ? shadow.tableVersion : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-purple-500/20 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 font-mono tracking-tight">
            <Brain className="text-emerald-400 w-8 h-8" />
            VIXY VAULT
          </h2>
          <p className="text-sm text-purple-300/70 mt-1 uppercase tracking-widest font-bold">
            Settled-Cycle Calibration • Admin Observation
          </p>
        </div>
        <div className={`flex flex-col items-end`}>
          <div className="flex items-center gap-2 px-4 py-2 bg-[#0c0620] border border-white/10 rounded-xl shadow-xl">
            <div className="flex flex-col items-end">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                Engine Tick (Serving Instance)
              </div>
              <div
                className={`text-sm font-bold flex items-center gap-1.5 ${engineColor}`}
              >
                <Server className="w-4 h-4" />
                {engineText}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VIXY CLOUD ENGINE */}
        <div className="bg-[#0c0620] rounded-xl border border-white/10 p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Cpu className="w-24 h-24 text-blue-500" />
          </div>
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <Server className="w-4 h-4 text-blue-400" /> VIXY CLOUD ENGINE
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-[#0a0518] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 font-mono">STATUS</span>
              <span className={`text-sm font-bold font-mono ${engineColor}`}>
                ● {engineText}
              </span>
            </div>
            <div className="flex justify-between items-center bg-[#0a0518] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 font-mono">
                LAST ENGINE TICK
              </span>
              <span className="text-sm text-white font-mono">
                {engineTickAge}
              </span>
            </div>
            <div className="flex justify-between items-center bg-[#0a0518] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 font-mono">UPTIME</span>
              <span
                className="text-sm text-slate-500 font-mono"
                title="No engine route reports uptime."
              >
                {UNAVAILABLE}
              </span>
            </div>
          </div>
        </div>

        {/* SETTLEMENT PIPELINE */}
        <div className="bg-[#0c0620] rounded-xl border border-white/10 p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-24 h-24 text-emerald-500" />
          </div>
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <Database className="w-4 h-4 text-emerald-400" /> SETTLEMENT PIPELINE
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-[#0a0518] p-3 rounded-xl border border-white/5">
              <div className="text-[10px] text-slate-500 font-mono mb-1">
                LIFETIME OBSERVATIONS
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {modelStatus
                  ? fmtCount(modelStatus.lifetimeObservations)
                  : UNAVAILABLE}
              </div>
            </div>
            <div className="bg-[#0a0518] p-3 rounded-xl border border-white/5">
              <div className="text-[10px] text-slate-500 font-mono mb-1">
                SETTLED CYCLES
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {modelStatus ? fmtCount(modelStatus.settledCount) : UNAVAILABLE}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0a0518] p-2 rounded-xl border border-white/5">
              <div className="text-[10px] text-slate-500 font-mono mb-1">
                LAST SETTLEMENT
              </div>
              <div
                className="text-xs text-slate-300 font-mono truncate"
                title="Latest resolvedAt among the 10 most recent settled cycles."
              >
                {lastSettlementText}
              </div>
            </div>
            <div className="bg-[#0a0518] p-2 rounded-xl border border-white/5">
              <div className="text-[10px] text-slate-500 font-mono mb-1">
                CALIBRATION GATE
              </div>
              <div className="text-xs text-slate-300 font-mono truncate">
                {calibrationGateText}
              </div>
            </div>
          </div>
          {noTrainingReported && (
            <div className="text-[10px] text-slate-500 font-mono mt-3">
              NO WEIGHT TRAINING REPORTED — settled cycles are graded, not
              trained on.
            </div>
          )}
        </div>
      </div>

      {/* MODEL PERFORMANCE */}
      <div className="bg-[#0c0620] rounded-xl border border-white/10 p-6 shadow-2xl">
        <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
          <Target className="w-4 h-4 text-purple-400" /> MODEL PERFORMANCE
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0a0518] p-4 rounded-xl border border-purple-500/20 text-center">
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest mb-1">
              LOCK PRECISION
            </div>
            <div className="text-3xl font-black text-white">
              {calibration
                ? fmtPct(calibration.overallWinRatePct)
                : UNAVAILABLE}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 font-mono">
              SETTLED LOCKS:{" "}
              {calibration ? fmtCount(calibration.sampleSize) : UNAVAILABLE}
            </div>
          </div>
          <div className="bg-[#0a0518] p-4 rounded-xl border border-purple-500/20 text-center">
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest mb-1">
              BRIER SCORE
            </div>
            <div className="text-3xl font-black text-purple-400">
              {calibration ? fmtBrier(calibration.avgBrierScore) : UNAVAILABLE}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 font-mono">
              SCORED ROWS:{" "}
              {calibration ? fmtCount(calibration.scoredRows) : UNAVAILABLE}
            </div>
          </div>
          <div className="bg-[#0a0518] p-4 rounded-xl border border-purple-500/20 text-center">
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest mb-1">
              DIRECTIONAL ACCURACY
            </div>
            <div className="text-3xl font-black text-white">
              {modelStatus
                ? fmtPct(modelStatus.historicalAccuracy)
                : UNAVAILABLE}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 font-mono">
              CALLED DIRECTION = OUTCOME · N{" "}
              {modelStatus ? fmtCount(modelStatus.settledCount) : UNAVAILABLE}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CONFIDENCE CALIBRATION */}
        <div className="bg-[#0c0620] rounded-xl border border-white/10 p-5 shadow-2xl">
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <BarChart3 className="w-4 h-4 text-amber-400" /> CONFIDENCE
            CALIBRATION
          </h3>
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-[10px] text-slate-500 font-mono font-bold mb-2 uppercase px-2">
              <div>Bucket</div>
              <div>Pred</div>
              <div>Actual</div>
              <div>N</div>
              <div>Error</div>
            </div>
            {!calibration ? (
              <div className="bg-[#0a0518] p-3 rounded border border-white/5 text-xs text-slate-500 font-mono">
                Calibration report unavailable.
              </div>
            ) : bucketRows.length === 0 ? (
              <div className="bg-[#0a0518] p-3 rounded border border-white/5 text-xs text-slate-500 font-mono">
                No settled locks in any confidence bucket yet.
              </div>
            ) : (
              bucketRows.map((b: any, i: number) => {
                const under =
                  isNum(b.empiricalWinRate) &&
                  isNum(b.predictedConfidence) &&
                  b.empiricalWinRate < b.predictedConfidence;
                return (
                  <div
                    key={i}
                    className="grid grid-cols-5 gap-2 items-center bg-[#0a0518] p-2 rounded border border-white/5 text-xs font-mono"
                  >
                    <div className="text-amber-400">{b.bucket ?? DASH}</div>
                    <div className="text-slate-300">
                      {fmtPct(b.predictedConfidence)}
                    </div>
                    <div className="text-white font-bold">
                      {fmtPct(b.empiricalWinRate)}
                    </div>
                    <div className="text-slate-500">
                      {fmtCount(b.sampleCount)}
                    </div>
                    <div
                      className={under ? "text-red-400" : "text-emerald-400"}
                    >
                      {isNum(b.calibrationDiff)
                        ? `${under ? "-" : "+"}${b.calibrationDiff.toFixed(1)}`
                        : DASH}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* REGIME PERFORMANCE */}
        <div className="bg-[#0c0620] rounded-xl border border-white/10 p-5 shadow-2xl flex flex-col">
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <TrendingUp className="w-4 h-4 text-pink-400" /> REGIME PERFORMANCE
          </h3>
          <div className="space-y-3 flex-1">
            {!calibration ? (
              <div className="bg-[#0a0518] p-3 rounded-xl border border-white/5 text-xs text-slate-500 font-mono">
                Regime breakdown unavailable.
              </div>
            ) : regimeRows.length === 0 ? (
              <div className="bg-[#0a0518] p-3 rounded-xl border border-white/5 text-xs text-slate-500 font-mono">
                No settled cycles carry a regime tag yet.
              </div>
            ) : (
              regimeRows.map((r: any, i: number) => (
                <div
                  key={i}
                  className="bg-[#0a0518] p-3 rounded-xl border border-white/5 flex justify-between items-center"
                >
                  <div>
                    <div className="text-sm font-bold text-white mb-0.5">
                      {r.regime ?? DASH}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      N: {fmtCount(r.totalCycles)} | Avg conf:{" "}
                      {fmtPct(r.avgConfidence)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-pink-400">
                      {fmtPct(r.winRatePct)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-3">
            CURRENT REGIME:{" "}
            {modelStatus
              ? typeof modelStatus.currentRegime === "string"
                ? modelStatus.currentRegime
                : DASH
              : UNAVAILABLE}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FEATURE RELIABILITY */}
        <div className="bg-[#0c0620] rounded-xl border border-white/10 p-5 shadow-2xl">
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <Zap className="w-4 h-4 text-yellow-400" /> FEATURE RELIABILITY
          </h3>
          <div className="space-y-3">
            <div className="bg-[#0a0518] p-3 rounded-xl border border-white/5">
              <div className="text-sm font-bold text-slate-400 mb-0.5">
                {UNAVAILABLE}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                No engine route measures feature reliability.
              </div>
            </div>
          </div>
        </div>

        {/* L5 SHADOW RULE */}
        <div className="bg-[#0c0620] rounded-xl border border-white/10 p-5 shadow-2xl">
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <Lock className="w-4 h-4 text-emerald-500" /> L5 SHADOW RULE
            (OBSERVATION)
          </h3>

          <div className="bg-[#0a0518] p-4 rounded-xl border border-white/10 mb-4">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
              <div className="text-xs text-slate-400 font-mono">ENGINE</div>
              <div className="text-xs text-blue-400 font-mono">
                L5 RULE
                {ruleVersion && (
                  <span className="text-white ml-2">{ruleVersion}</span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-1/3 text-left">
                  <div className="text-sm font-bold text-white">
                    {shadow ? fmtGraded(shadow.engine) : UNAVAILABLE}
                  </div>
                </div>
                <div className="w-1/3 text-center text-[10px] text-slate-500 font-mono tracking-widest">
                  GRADED
                </div>
                <div className="w-1/3 text-right">
                  <div className="text-sm font-bold text-blue-400">
                    {shadow ? fmtGraded(shadow.rule) : UNAVAILABLE}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-1/3 text-left">
                  <div className="text-sm font-bold text-white">
                    {shadow ? fmtWinRate(shadow.engine) : UNAVAILABLE}
                  </div>
                </div>
                <div className="w-1/3 text-center text-[10px] text-slate-500 font-mono tracking-widest">
                  PRECISION
                </div>
                <div className="w-1/3 text-right">
                  <div className="text-sm font-bold text-blue-400">
                    {shadow ? fmtWinRate(shadow.rule) : UNAVAILABLE}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed text-center">
            {shadow ? (
              <>
                Observation only: the L5 rule is recorded beside the engine and
                feeds no decision. {fmtCount(shadow.rowsWithShadow)} cycles
                carry a shadow record; {fmtCount(shadow.rule?.ungraded)} rule
                would-locks are ungraded.
              </>
            ) : (
              <>Shadow readout unavailable.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VixyLearningCenter;
