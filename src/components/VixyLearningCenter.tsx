import React, { useState, useEffect } from "react";
import {
  Database,
  Brain,
  Activity,
  Lock,
  TrendingUp,
  Cpu,
  Server,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Clock,
  Zap,
  Target,
} from "lucide-react";

export const VixyLearningCenter = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLearningStats = async () => {
      try {
        const response = await fetch("/api/signal/learning-metrics");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchLearningStats();
    const int = setInterval(fetchLearningStats, 10000);
    return () => clearInterval(int);
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

  const stats = data || {
    modelVersion: "VIXY_VAULT_v1.0",
    learningStatus: "WAITING",
    cyclesAnalyzed: 0,
    totalObservations: 0,
    calibration: "UNKNOWN",
    lockPrecision: "0%",
    brierScore: "0.000",
    recentImprovements: "No data",
    shadowModelStatus: "PENDING",
    lastLearningRun: "N/A",
    engineUptime: "0s",
    uniqueCycles: 0,
    settledCycles: 0,
    duplicateOutcomes: 0,
    heartbeat: {
      engineStatus: "OFFLINE",
      lastHeartbeat: "Never",
      uptime: 0,
    },
    regimes: [],
    features: [],
    calibrationBuckets: [],
    shadowComparison: {
      productionBrier: "0.000",
      shadowBrier: "0.000",
      productionPrecision: "0%",
      shadowPrecision: "0%",
      sampleSize: 0,
    },
  };

  const uptimeStr = stats.heartbeat?.uptime
    ? `${Math.floor(stats.heartbeat.uptime / 3600)}h ${Math.floor((stats.heartbeat.uptime % 3600) / 60)}m`
    : stats.engineUptime;

  const timeSinceHeartbeat = stats.heartbeat?.lastHeartbeat
    ? Math.floor(
        (Date.now() - new Date(stats.heartbeat.lastHeartbeat).getTime()) / 1000,
      )
    : 999;

  const engineStatusColor =
    timeSinceHeartbeat < 60 ? "text-emerald-400" : "text-red-500";
  const engineStatusText = timeSinceHeartbeat < 60 ? "ONLINE" : "OFFLINE";

  const nextLearningRun = new Date(Date.now() + 15 * 60 * 1000).toISOString();

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
            Continuous Cloud Learning Center • Admin Observation
          </p>
        </div>
        <div className={`flex flex-col items-end`}>
          <div className="flex items-center gap-2 px-4 py-2 bg-[#0F0826] border border-white/10 rounded-lg shadow-xl">
            <div className="flex flex-col items-end">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                Background Execution
              </div>
              <div
                className={`text-sm font-bold flex items-center gap-1.5 ${timeSinceHeartbeat < 60 ? "text-emerald-400" : "text-red-400"}`}
              >
                <Server className="w-4 h-4" />
                VERIFIED
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VIXY CLOUD ENGINE */}
        <div className="bg-[#120D1D] rounded-xl border border-white/10 p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Cpu className="w-24 h-24 text-blue-500" />
          </div>
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <Server className="w-4 h-4 text-blue-400" /> VIXY CLOUD ENGINE
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-[#0a0514] p-3 rounded-lg border border-white/5">
              <span className="text-xs text-slate-400 font-mono">STATUS</span>
              <span
                className={`text-sm font-bold font-mono ${engineStatusColor}`}
              >
                ● {engineStatusText}
              </span>
            </div>
            <div className="flex justify-between items-center bg-[#0a0514] p-3 rounded-lg border border-white/5">
              <span className="text-xs text-slate-400 font-mono">
                LAST HEARTBEAT
              </span>
              <span className="text-sm text-white font-mono">
                {timeSinceHeartbeat < 999
                  ? `${timeSinceHeartbeat}s AGO`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center bg-[#0a0514] p-3 rounded-lg border border-white/5">
              <span className="text-xs text-slate-400 font-mono">UPTIME</span>
              <span className="text-sm text-blue-400 font-mono">
                {uptimeStr}
              </span>
            </div>
          </div>
        </div>

        {/* LEARNING PIPELINE */}
        <div className="bg-[#120D1D] rounded-xl border border-white/10 p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-24 h-24 text-emerald-500" />
          </div>
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <Database className="w-4 h-4 text-emerald-400" /> LEARNING PIPELINE
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-[#0a0514] p-3 rounded-lg border border-white/5">
              <div className="text-[10px] text-slate-500 font-mono mb-1">
                TOTAL OBSERVATIONS
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {stats.totalObservations}
              </div>
            </div>
            <div className="bg-[#0a0514] p-3 rounded-lg border border-white/5">
              <div className="text-[10px] text-slate-500 font-mono mb-1">
                SETTLED CYCLES
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {stats.settledCycles}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0a0514] p-2 rounded-lg border border-white/5">
              <div className="text-[10px] text-slate-500 font-mono mb-1">
                LAST LEARNING RUN
              </div>
              <div className="text-xs text-slate-300 font-mono truncate">
                {stats.lastLearningRun
                  ? new Date(stats.lastLearningRun).toLocaleTimeString()
                  : "N/A"}
              </div>
            </div>
            <div className="bg-[#0a0514] p-2 rounded-lg border border-white/5">
              <div className="text-[10px] text-slate-500 font-mono mb-1">
                NEXT RUN IN
              </div>
              <div className="text-xs text-slate-300 font-mono truncate">
                15m
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DATA INTEGRITY ALERTS */}
      {stats.duplicateOutcomes > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="text-red-500 w-5 h-5" />
          <div>
            <div className="text-sm font-bold text-red-500">
              DATA INTEGRITY WARNING
            </div>
            <div className="text-xs text-red-400">
              Detected {stats.duplicateOutcomes} duplicate outcomes in learning
              dataset.
            </div>
          </div>
        </div>
      )}

      {/* MODEL PERFORMANCE */}
      <div className="bg-[#120D1D] rounded-xl border border-white/10 p-6 shadow-2xl">
        <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
          <Target className="w-4 h-4 text-purple-400" /> MODEL PERFORMANCE
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0a0514] p-4 rounded-lg border border-purple-500/20 text-center">
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest mb-1">
              LOCK PRECISION
            </div>
            <div className="text-3xl font-black text-white">
              {stats.lockPrecision}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 font-mono">
              SAMPLE SIZE: {stats.settledCycles}
            </div>
          </div>
          <div className="bg-[#0a0514] p-4 rounded-lg border border-purple-500/20 text-center">
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest mb-1">
              BRIER SCORE
            </div>
            <div className="text-3xl font-black text-purple-400">
              {stats.brierScore}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 font-mono">
              TARGET &lt; 0.150
            </div>
          </div>
          <div className="bg-[#0a0514] p-4 rounded-lg border border-purple-500/20 text-center">
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest mb-1">
              DIRECTIONAL ACCURACY
            </div>
            <div className="text-3xl font-black text-white">
              {stats.lockPrecision}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 font-mono">
              BASE ACCURACY
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CONFIDENCE CALIBRATION */}
        <div className="bg-[#120D1D] rounded-xl border border-white/10 p-5 shadow-2xl">
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
            {stats.calibrationBuckets.map((b: any, i: number) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-2 items-center bg-[#0a0514] p-2 rounded border border-white/5 text-xs font-mono"
              >
                <div className="text-amber-400">{b.bucket}</div>
                <div className="text-slate-300">{b.pred}</div>
                <div className="text-white font-bold">{b.act}</div>
                <div className="text-slate-500">{b.n}</div>
                <div
                  className={`${b.err.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}
                >
                  {b.err}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* REGIME PERFORMANCE */}
        <div className="bg-[#120D1D] rounded-xl border border-white/10 p-5 shadow-2xl flex flex-col">
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <TrendingUp className="w-4 h-4 text-pink-400" /> REGIME PERFORMANCE
          </h3>
          <div className="space-y-3 flex-1">
            {stats.regimes.map((r: any, i: number) => (
              <div
                key={i}
                className="bg-[#0a0514] p-3 rounded-lg border border-white/5 flex justify-between items-center"
              >
                <div>
                  <div className="text-sm font-bold text-white mb-0.5">
                    {r.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    N: {r.cycles} | Brier: {r.brier}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-pink-400">
                    {r.winRate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FEATURE RELIABILITY */}
        <div className="bg-[#120D1D] rounded-xl border border-white/10 p-5 shadow-2xl">
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <Zap className="w-4 h-4 text-yellow-400" /> FEATURE RELIABILITY
          </h3>
          <div className="space-y-3">
            {stats.features.map((f: any, i: number) => (
              <div
                key={i}
                className="bg-[#0a0514] p-3 rounded-lg border border-white/5 flex justify-between items-center"
              >
                <div>
                  <div className="text-sm font-bold text-white mb-0.5">
                    {f.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Activations: {f.n}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-yellow-400">
                    {f.reliability}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SHADOW MODEL */}
        <div className="bg-[#120D1D] rounded-xl border border-white/10 p-5 shadow-2xl">
          <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <Lock className="w-4 h-4 text-emerald-500" /> SHADOW MODEL INTEGRITY
          </h3>

          <div className="bg-[#0a0514] p-4 rounded-xl border border-white/10 mb-4">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
              <div className="text-xs text-slate-400 font-mono">
                PRODUCTION <span className="text-white ml-2">v1.0.0</span>
              </div>
              <div className="text-xs text-blue-400 font-mono">
                CANDIDATE <span className="text-white ml-2">v1.1.0-RC</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-1/3 text-left">
                  <div className="text-sm font-bold text-white">
                    {stats.shadowComparison.productionBrier}
                  </div>
                </div>
                <div className="w-1/3 text-center text-[10px] text-slate-500 font-mono tracking-widest">
                  BRIER
                </div>
                <div className="w-1/3 text-right">
                  <div className="text-sm font-bold text-blue-400">
                    {stats.shadowComparison.shadowBrier}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-1/3 text-left">
                  <div className="text-sm font-bold text-white">
                    {stats.shadowComparison.productionPrecision}
                  </div>
                </div>
                <div className="w-1/3 text-center text-[10px] text-slate-500 font-mono tracking-widest">
                  PRECISION
                </div>
                <div className="w-1/3 text-right">
                  <div className="text-sm font-bold text-blue-400">
                    {stats.shadowComparison.shadowPrecision}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed text-center">
            Shadow model <span className="text-blue-400">v1.1.0-RC</span> is
            actively evaluating against production. It cannot be promoted
            without statistically significant improvement across{" "}
            {stats.shadowComparison.sampleSize} sample cycles and manual
            administrative approval.
          </div>
        </div>
      </div>
    </div>
  );
};

export default VixyLearningCenter;
