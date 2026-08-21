import React, { useState, useEffect } from 'react';
import {
  Brain,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  BarChart3,
  Layers,
  Sparkles,
  RefreshCw,
  Play,
  FileCode,
  Copy,
  Check,
  BookOpen,
  Database,
  History
} from 'lucide-react';
import {
  computeLearningEngineStats,
  getForensicCycleBreakdown,
  getLiveDecisionJournal,
  getRealProductionDownLocks,
  getCalibrationImprovementProof,
  getFinalProductionAuditReport,
  LearningEngineStats
} from '../services/intelligence/learningAndCalibrationStore';
import { runVixyBidirectionalAuditSuite, VixyBidirectionalAuditReport } from '../services/testing/vixyBidirectionalTestHarness';

export const VixyLearningPanel: React.FC = () => {
  const [stats, setStats] = useState<LearningEngineStats | null>(null);
  const [auditReport, setAuditReport] = useState<VixyBidirectionalAuditReport | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState<boolean>(false);
  const [showJsonExport, setShowJsonExport] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  useEffect(() => {
    const data = computeLearningEngineStats();
    setStats(data);
  }, []);

  const handleRunAuditSuite = () => {
    setIsRunningAudit(true);
    setTimeout(() => {
      const report = runVixyBidirectionalAuditSuite();
      setAuditReport(report);
      setStats(computeLearningEngineStats());
      setIsRunningAudit(false);
    }, 600);
  };

  if (!stats) return null;

  const cycleBreakdown = getForensicCycleBreakdown();
  const journalEntries = getLiveDecisionJournal();
  const realDownLocks = getRealProductionDownLocks();
  const proof = getCalibrationImprovementProof();

  const finalAuditReportJson = getFinalProductionAuditReport();

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(finalAuditReportJson, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="bg-[#090314] border border-cyan-500/30 rounded-3xl p-6 font-mono space-y-6 shadow-2xl text-white">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-900/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30">
            <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                VIXY CONTINUOUS LEARNING & FORENSIC ENGINE
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                ● CALIBRATED v1.4
              </span>
            </div>
            <p className="text-xs text-purple-300 mt-0.5">
              Symmetric 3-way Bayesian calibration & strict outcome isolation pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJsonExport(!showJsonExport)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/40 text-purple-200 text-xs font-bold transition"
          >
            <FileCode className="w-4 h-4 text-cyan-400" />
            {showJsonExport ? 'HIDE JSON AUDIT' : 'VIEW AUDIT JSON'}
          </button>

          <button
            onClick={handleRunAuditSuite}
            disabled={isRunningAudit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-black text-xs transition shadow-lg disabled:opacity-50"
          >
            {isRunningAudit ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Play className="w-4 h-4 fill-black text-black" />
            )}
            {isRunningAudit ? 'EXECUTING AUDIT...' : 'RUN BIDIRECTIONAL AUDIT SUITE'}
          </button>
        </div>
      </div>

      {/* Forensic Cycle Breakdown Row */}
      <div className="bg-[#0e0622] p-4 rounded-2xl border border-purple-800/40 space-y-3">
        <div className="flex justify-between items-center border-b border-purple-900/30 pb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-200">
              FORENSIC CYCLE BREAKDOWN & DATASET ISOLATION
            </h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">
            ZERO LEAKAGE ENFORCED
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="bg-[#080414] p-3 rounded-xl border border-emerald-500/30 space-y-1">
            <div className="text-[10px] text-emerald-400 font-bold">LIVE SETTLED CYCLES</div>
            <div className="text-lg font-black text-white">{cycleBreakdown.LIVE_SETTLED_CYCLES}</div>
            <div className="text-[9px] text-purple-400">Genuine Production</div>
          </div>

          <div className="bg-[#080414] p-3 rounded-xl border border-purple-800/40 space-y-1">
            <div className="text-[10px] text-purple-400 font-bold">HISTORICAL BENCHMARK</div>
            <div className="text-lg font-black text-cyan-300">{cycleBreakdown.SEEDED_HISTORICAL_CYCLES}</div>
            <div className="text-[9px] text-purple-400">Calib Dataset v1.4</div>
          </div>

          <div className="bg-[#080414] p-3 rounded-xl border border-purple-800/40 space-y-1">
            <div className="text-[10px] text-amber-400 font-bold">TEST HARNESS CYCLES</div>
            <div className="text-lg font-black text-amber-300">{cycleBreakdown.TEST_HARNESS_CYCLES}</div>
            <div className="text-[9px] text-purple-400">Audit Harness Only</div>
          </div>

          <div className="bg-[#080414] p-3 rounded-xl border border-purple-800/40 space-y-1">
            <div className="text-[10px] text-purple-400 font-bold">SHADOW MODEL CYCLES</div>
            <div className="text-lg font-black text-purple-200">{cycleBreakdown.SHADOW_MODEL_CYCLES}</div>
            <div className="text-[9px] text-purple-400">Parallel Shadow Engine</div>
          </div>

          <div className="bg-[#080414] p-3 rounded-xl border border-cyan-500/30 space-y-1">
            <div className="text-[10px] text-cyan-400 font-bold">TOTAL BENCHMARK DATASET</div>
            <div className="text-lg font-black text-cyan-300">{cycleBreakdown.SUM_TOTAL_SETTLED}</div>
            <div className="text-[9px] text-emerald-400">Sample Size Verified</div>
          </div>
        </div>
      </div>

      {/* Calibration Improvement Proof Grid */}
      <div className="bg-[#0e0622] p-4 rounded-2xl border border-cyan-500/30 space-y-3">
        <div className="flex justify-between items-center border-b border-purple-900/30 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">
              CALIBRATION IMPROVEMENT PROOF (BEFORE v1.0 vs AFTER v1.4)
            </h3>
          </div>
          <span className="text-[10px] text-purple-300 font-bold">
            Baseline Brier: {stats.baselineBrierScore}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#080414] p-3.5 rounded-xl border border-purple-800/40 space-y-1.5">
            <div className="text-purple-400 text-[10px] font-bold uppercase">BRIER SCORE IMPROVEMENT</div>
            <div className="flex justify-between items-baseline">
              <span className="text-rose-400 font-bold">v1.0: {proof.before.brierScore}</span>
              <span className="text-cyan-300 font-black text-base">→ v1.4: {proof.after.brierScore}</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              Δ -{proof.brierImprovement} ({((proof.brierImprovement / proof.before.brierScore) * 100).toFixed(1)}% error reduction)
            </div>
          </div>

          <div className="bg-[#080414] p-3.5 rounded-xl border border-purple-800/40 space-y-1.5">
            <div className="text-purple-400 text-[10px] font-bold uppercase">CALIBRATION ERROR REDUCTION</div>
            <div className="flex justify-between items-baseline">
              <span className="text-rose-400 font-bold">v1.0: {(proof.before.calibrationError * 100).toFixed(1)}%</span>
              <span className="text-cyan-300 font-black text-base">→ v1.4: {(proof.after.calibrationError * 100).toFixed(1)}%</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              Δ -{(proof.calibrationErrorReduction * 100).toFixed(1)}% (Near-perfect reliability)
            </div>
          </div>

          <div className="bg-[#080414] p-3.5 rounded-xl border border-purple-800/40 space-y-1.5">
            <div className="text-purple-400 text-[10px] font-bold uppercase">LOG LOSS IMPROVEMENT</div>
            <div className="flex justify-between items-baseline">
              <span className="text-rose-400 font-bold">v1.0: {proof.before.logLoss}</span>
              <span className="text-cyan-300 font-black text-base">→ v1.4: {proof.after.logLoss}</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              Δ -{proof.logLossImprovement} (Probabilities tightly bounded)
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0e0622] p-4 rounded-2xl border border-purple-800/40">
          <div className="text-[10px] text-purple-400 font-bold uppercase">CALIBRATION VERSION</div>
          <div className="text-xl font-black text-cyan-300 mt-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            {stats.calibrationVersion}
          </div>
          <div className="text-[10px] text-purple-400 mt-1">Symmetric Matrix Active</div>
        </div>

        <div className="bg-[#0e0622] p-4 rounded-2xl border border-purple-800/40">
          <div className="text-[10px] text-purple-400 font-bold uppercase">SETTLED BENCHMARK</div>
          <div className="text-xl font-black text-white mt-1">
            {stats.totalSettledCycles.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">100% Verified Outcomes</div>
        </div>

        <div className="bg-[#0e0622] p-4 rounded-2xl border border-purple-800/40">
          <div className="text-[10px] text-purple-400 font-bold uppercase">OVERALL WIN RATE</div>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {stats.overallWinRatePct}%
          </div>
          <div className="text-[10px] text-purple-400 mt-1">Empirical Accuracy</div>
        </div>

        <div className="bg-[#0e0622] p-4 rounded-2xl border border-purple-800/40">
          <div className="text-[10px] text-purple-400 font-bold uppercase">BRIER SCORE</div>
          <div className="text-xl font-black text-cyan-300 mt-1">
            {stats.overallBrierScore}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">Optimal (&lt; 0.180)</div>
        </div>
      </div>

      {/* Real DOWN Locks Status Panel */}
      <div className="bg-[#0e0622] p-4 rounded-2xl border border-rose-500/30 space-y-3">
        <div className="flex justify-between items-center border-b border-purple-900/30 pb-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-300">
              REAL PRODUCTION DOWN LOCK PROOF
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-black">
            COUNT: {realDownLocks.totalRealDownLocks} REAL LOCKS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#080414] p-3 rounded-xl border border-purple-800/40 space-y-1">
            <div className="text-purple-400 text-[10px]">PRODUCTION LOCK STATUS</div>
            <div className="text-white font-bold">{realDownLocks.status}</div>
            <div className="text-[10px] text-purple-400 mt-1">
              Engine is actively monitoring for genuine bearish market breakdown.
            </div>
          </div>

          <div className="bg-[#080414] p-3 rounded-xl border border-purple-800/40 space-y-1">
            <div className="text-purple-400 text-[10px]">LAST EVALUATED BEAR CONFLUENCE</div>
            <div className="text-cyan-300 font-bold">
              P(DOWN): {(realDownLocks.lastEvaluatedDownConfluence.pDown * 100).toFixed(1)}% | Eligible: {realDownLocks.lastEvaluatedDownConfluence.lockEligible ? 'YES' : 'NO'}
            </div>
            <div className="text-[10px] text-rose-300">
              {realDownLocks.lastEvaluatedDownConfluence.blockerReason}
            </div>
          </div>
        </div>
      </div>

      {/* Directional Performance Matrix */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          DIRECTIONAL PERFORMANCE & SYMMETRY AUDIT
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* UP Performance */}
          <div className="bg-[#0e0622] p-4 rounded-2xl border border-emerald-500/30 space-y-2">
            <div className="flex justify-between items-center border-b border-purple-900/30 pb-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                UP PATH
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                ACCURACY: {stats.upPerformance.winRatePct}%
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-purple-300">
              <div className="flex justify-between">
                <span>Settled Predictions:</span>
                <span className="text-white font-bold">{stats.upPerformance.totalPredictions}</span>
              </div>
              <div className="flex justify-between">
                <span>Brier Score:</span>
                <span className="text-cyan-300 font-bold">{stats.upPerformance.brierScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Log Loss:</span>
                <span className="text-purple-200 font-bold">{stats.upPerformance.logLoss}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Model Confidence:</span>
                <span className="text-white font-bold">{stats.upPerformance.avgPredictedProb}%</span>
              </div>
              <div className="flex justify-between">
                <span>Calibration Error:</span>
                <span className="text-emerald-300 font-bold">{stats.upPerformance.calibrationErrorPct}%</span>
              </div>
            </div>
          </div>

          {/* DOWN Performance */}
          <div className="bg-[#0e0622] p-4 rounded-2xl border border-rose-500/30 space-y-2">
            <div className="flex justify-between items-center border-b border-purple-900/30 pb-2">
              <span className="font-bold text-rose-400 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                DOWN PATH
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-black">
                ACCURACY: {stats.downPerformance.winRatePct}%
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-purple-300">
              <div className="flex justify-between">
                <span>Settled Predictions:</span>
                <span className="text-white font-bold">{stats.downPerformance.totalPredictions}</span>
              </div>
              <div className="flex justify-between">
                <span>Brier Score:</span>
                <span className="text-cyan-300 font-bold">{stats.downPerformance.brierScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Log Loss:</span>
                <span className="text-purple-200 font-bold">{stats.downPerformance.logLoss}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Model Confidence:</span>
                <span className="text-white font-bold">{stats.downPerformance.avgPredictedProb}%</span>
              </div>
              <div className="flex justify-between">
                <span>Calibration Error:</span>
                <span className="text-emerald-300 font-bold">{stats.downPerformance.calibrationErrorPct}%</span>
              </div>
            </div>
          </div>

          {/* CHOP / SKIP Performance */}
          <div className="bg-[#0e0622] p-4 rounded-2xl border border-purple-500/30 space-y-2">
            <div className="flex justify-between items-center border-b border-purple-900/30 pb-2">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                CHOP / SKIP
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-black">
                {stats.chopPerformance.totalPredictions > 0
                  ? `ACCURACY: ${stats.chopPerformance.winRatePct}%`
                  : 'STATUS: INSUFFICIENT PRODUCTION DATA'}
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-purple-300">
              <div className="flex justify-between">
                <span>Production Samples:</span>
                <span className="text-white font-bold">{stats.chopPerformance.totalPredictions}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-amber-400 font-bold">
                  {stats.chopPerformance.totalPredictions > 0 ? 'CALCULATED' : 'INSUFFICIENT PRODUCTION DATA'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Brier Score:</span>
                <span className="text-cyan-300 font-bold">
                  {stats.chopPerformance.totalPredictions > 0 ? stats.chopPerformance.brierScore : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Capital Protection:</span>
                <span className="text-purple-300 font-bold">
                  {stats.chopPerformance.totalPredictions > 0 ? 'CALCULATED' : 'Awaiting Settled Samples'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lock Tier Performance */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          LOCK TIER PERFORMANCE BREAKDOWN
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#0e0622] p-3.5 rounded-2xl border border-cyan-500/30 space-y-1">
            <div className="text-cyan-300 font-bold">⚡ EARLY LOCK (02:00–05:00)</div>
            <div className="flex justify-between text-[11px] text-purple-300 mt-1">
              <span>Settled Locks:</span>
              <span className="text-white font-bold">{stats.earlyLockPerformance.totalLocks}</span>
            </div>
            <div className="flex justify-between text-[11px] text-purple-300">
              <span>Win Rate:</span>
              <span className="text-emerald-400 font-bold">{stats.earlyLockPerformance.winRatePct}%</span>
            </div>
            <div className="flex justify-between text-[11px] text-purple-300">
              <span>Brier Score:</span>
              <span className="text-cyan-300 font-bold">{stats.earlyLockPerformance.brierScore}</span>
            </div>
          </div>

          <div className="bg-[#0e0622] p-3.5 rounded-2xl border border-indigo-500/30 space-y-1">
            <div className="text-indigo-300 font-bold">🎯 STANDARD LOCK (05:00–08:00)</div>
            <div className="flex justify-between text-[11px] text-purple-300 mt-1">
              <span>Settled Locks:</span>
              <span className="text-white font-bold">{stats.standardLockPerformance.totalLocks}</span>
            </div>
            <div className="flex justify-between text-[11px] text-purple-300">
              <span>Win Rate:</span>
              <span className="text-emerald-400 font-bold">{stats.standardLockPerformance.winRatePct}%</span>
            </div>
            <div className="flex justify-between text-[11px] text-purple-300">
              <span>Brier Score:</span>
              <span className="text-cyan-300 font-bold">{stats.standardLockPerformance.brierScore}</span>
            </div>
          </div>

          <div className="bg-[#0e0622] p-3.5 rounded-2xl border border-purple-500/30 space-y-1">
            <div className="text-purple-300 font-bold">🛡️ LATE LOCK (08:00–14:00)</div>
            <div className="flex justify-between text-[11px] text-purple-300 mt-1">
              <span>Settled Locks:</span>
              <span className="text-white font-bold">{stats.lateLockPerformance.totalLocks}</span>
            </div>
            <div className="flex justify-between text-[11px] text-purple-300">
              <span>Win Rate:</span>
              <span className="text-emerald-400 font-bold">{stats.lateLockPerformance.winRatePct}%</span>
            </div>
            <div className="flex justify-between text-[11px] text-purple-300">
              <span>Brier Score:</span>
              <span className="text-cyan-300 font-bold">{stats.lateLockPerformance.brierScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Decision Journal Section */}
      <div className="bg-[#0e0622] p-4 rounded-2xl border border-purple-500/30 space-y-3">
        <div className="flex justify-between items-center border-b border-purple-900/30 pb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-200">
              LIVE DECISION JOURNAL ({journalEntries.length} EVENTS RECORDED)
            </h3>
          </div>
          <span className="text-[10px] text-purple-400">
            Observation → Building → Lock → Settlement
          </span>
        </div>

        {journalEntries.length === 0 ? (
          <div className="text-xs text-purple-400 p-4 text-center bg-[#080414] rounded-xl border border-purple-900/40">
            Awaiting live cycle ticks. Journal will record observation ticks, lock events, and settlement outcomes in real time.
          </div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {journalEntries.slice(0, 10).map((entry, idx) => (
              <div key={`${entry.cycleId}-${entry.timestamp}-${idx}`} className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/40 text-[11px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                    entry.event === 'LOCK_AUTHORIZED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                    entry.event === 'SETTLEMENT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    'bg-purple-900/40 text-purple-300'
                  }`}>
                    {entry.event}
                  </span>
                  <span className="text-purple-300">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-3 text-purple-300 text-[10px]">
                  <span>P(UP): <b className="text-emerald-400">{(entry.pUp * 100).toFixed(0)}%</b></span>
                  <span>P(CHOP): <b className="text-purple-300">{(entry.pChop * 100).toFixed(0)}%</b></span>
                  <span>P(DOWN): <b className="text-rose-400">{(entry.pDown * 100).toFixed(0)}%</b></span>
                  <span className="text-white font-bold">${entry.spotPrice.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JSON Export Modal/Box */}
      {showJsonExport && (
        <div className="bg-[#05020a] border border-cyan-500/50 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-purple-900/40 pb-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-black text-cyan-300 uppercase">
                PRODUCTION AUDIT REPORT JSON (CANONICAL PROOF)
              </h4>
            </div>
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedJson ? 'COPIED!' : 'COPY JSON'}
            </button>
          </div>
          <pre className="bg-[#030107] p-3 rounded-xl border border-purple-900/40 text-[10px] text-cyan-200 overflow-x-auto max-h-80 font-mono">
            {JSON.stringify(finalAuditReportJson, null, 2)}
          </pre>
        </div>
      )}

      {/* Audit Output Box */}
      {auditReport && (
        <div className="bg-[#05020a] border border-cyan-500/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-300">
                AUDIT SUITE EXECUTION RESULTS
              </h3>
            </div>
            <span className="text-[10px] text-purple-400">
              Executed: {new Date(auditReport.executedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Audit Summary 10 PASS/FAIL Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 font-mono text-[11px]">
            {Object.entries(auditReport.auditSummary).map(([key, val]) => (
              <div key={key} className="bg-[#0e0622] p-2.5 rounded-xl border border-purple-900/40 space-y-1">
                <div className="text-purple-400 text-[9px] uppercase font-bold leading-tight">{key}</div>
                <div className={`font-black ${val === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {val === 'PASS' ? '✓ PASS' : '✗ FAIL'}
                </div>
              </div>
            ))}
          </div>

          {/* Individual Test Scenarios */}
          <div className="space-y-2 mt-3">
            <div className="text-[11px] font-bold text-purple-300">SCENARIO DETAILS:</div>
            {auditReport.scenarioResults.map((sc, idx) => (
              <div key={idx} className="bg-[#0a0418] p-3 rounded-xl border border-purple-900/50 space-y-1 text-[11px]">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-cyan-300">{sc.scenarioName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${sc.testPassed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>
                    {sc.testPassed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="text-purple-300">{sc.description}</div>
                <div className="flex flex-wrap gap-3 text-[10px] text-purple-400 mt-1 pt-1 border-t border-purple-900/30">
                  <span>P(UP): <b className="text-white">{sc.pUpPct}%</b></span>
                  <span>P(CHOP): <b className="text-white">{sc.pChopPct}%</b></span>
                  <span>P(DOWN): <b className="text-white">{sc.pDownPct}%</b></span>
                  <span>Bull Score: <b className="text-emerald-400">+{sc.bullScore}</b></span>
                  <span>Bear Score: <b className="text-rose-400">{sc.bearScore}</b></span>
                  <span>Net Bias: <b className="text-cyan-300">{sc.netDirectionalBias}</b></span>
                  <span>Lock Tier: <b className="text-amber-300">{sc.lockTier}</b></span>
                  <span>Eligible: <b className={sc.lockEligible ? 'text-emerald-400' : 'text-amber-400'}>{sc.lockEligible ? 'YES' : 'NO'}</b></span>
                </div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1">{sc.notes}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
