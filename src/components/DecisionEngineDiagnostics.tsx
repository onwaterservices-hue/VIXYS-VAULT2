import React from 'react';
import { Activity, ShieldAlert, Clock, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DecisionEngineDiagnosticsProps {
  rawApiData?: any;
}

export const DecisionEngineDiagnostics: React.FC<DecisionEngineDiagnosticsProps> = ({ rawApiData }) => {
  const prob = rawApiData?.livePrediction?.probability ?? rawApiData?.probability ?? 0.5;
  const pUp = Math.round(Number(rawApiData?.upProbability ?? (prob > 1 ? prob : prob * 100)) * 10) / 10;
  const pDown = Math.round(Number(rawApiData?.downProbability ?? (100 - pUp)) * 10) / 10;
  const rawConfidence = Number(rawApiData?.confidence ?? rawApiData?.confidencePct ?? 72);
  
  // Calculate P(SKIP) / Uncertainty parity band based on confidence & chop/veto
  const isSkipped = rawApiData?.stage === 'NO_TRADE' || rawApiData?.status === 'NO_TRADE' || rawApiData?.action === 'SKIP' || rawApiData?.qualificationStatus === 'SKIPPED';
  const pSkip = isSkipped ? 100 : Math.max(0, Math.round((100 - Math.abs(pUp - pDown) * 1.5 - (rawConfidence * 0.2)) * 10) / 10);
  
  const qualificationReason = rawApiData?.qualificationReason || rawApiData?.choppyReason || 'ACTIVE_MONITORING';
  const entryWindowClosed = rawApiData?.qualificationStatus === 'ENTRY_WINDOW_CLOSED' || (rawApiData?.elapsedSeconds !== undefined && rawApiData.elapsedSeconds >= 720);

  // Skip/No-Trade transition logs from rawApiData or fallback history
  const skipLogs = rawApiData?.skipLogs || [
    {
      timestamp: new Date().toLocaleTimeString(),
      cycleId: rawApiData?.cycleId || '15M-CURRENT',
      reason: qualificationReason,
      category: isSkipped ? 'SKIP_TRIGGERED' : 'ACTIVE_ANALYSIS',
      pUp,
      pDown,
      pSkip
    }
  ];

  return (
    <div className="bg-[#0B061A]/90 border border-purple-900/60 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-4 font-mono text-xs text-purple-100">
      <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider text-purple-200 uppercase">DecisionEngine Diagnostics & Probability Matrix</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${entryWindowClosed ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}`}>
            {entryWindowClosed ? '⏱ ENTRY WINDOW CLOSED (720s+)' : '⚡ ACTIVE ENTRY WINDOW'}
          </span>
        </div>
      </div>

      {/* Real-time P(UP), P(DOWN), P(SKIP) Probabilities */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#080414] border border-cyan-500/30 rounded-xl p-3 text-center space-y-1">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">P(UP) Probability</span>
          <div className="text-lg font-black text-cyan-200">{pUp}%</div>
          <div className="w-full bg-purple-950/60 h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, pUp))}%` }} />
          </div>
        </div>

        <div className="bg-[#080414] border border-rose-500/30 rounded-xl p-3 text-center space-y-1">
          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">P(DOWN) Probability</span>
          <div className="text-lg font-black text-rose-200">{pDown}%</div>
          <div className="w-full bg-purple-950/60 h-1.5 rounded-full overflow-hidden">
            <div className="bg-rose-400 h-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, pDown))}%` }} />
          </div>
        </div>

        <div className="bg-[#080414] border border-purple-500/30 rounded-xl p-3 text-center space-y-1">
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">P(SKIP) / Edge Parity</span>
          <div className="text-lg font-black text-purple-200">{pSkip}%</div>
          <div className="w-full bg-purple-950/60 h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-400 h-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, pSkip))}%` }} />
          </div>
        </div>
      </div>

      {/* Entry Window Expiry vs Cycle Expiry Audit Distinction */}
      <div className="bg-purple-950/30 border border-purple-800/50 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Temporal Audit: Entry Window vs Cycle Expiry</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-bold">Decoupled State Active</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-purple-200/90">
          <div className="bg-[#080414] p-2.5 rounded-lg border border-purple-900/60">
            <div className="text-cyan-300 font-bold mb-0.5">Entry Window (Lock Gate)</div>
            <div>Status: <span className={entryWindowClosed ? 'text-amber-300 font-bold' : 'text-emerald-300 font-bold'}>{entryWindowClosed ? 'Closed (≥720s elapsed)' : 'Open (180s - 720s)'}</span></div>
            <div className="text-[10px] text-purple-400 mt-1">Prevents late locks; cycle remains fully analyzable.</div>
          </div>
          <div className="bg-[#080414] p-2.5 rounded-lg border border-purple-900/60">
            <div className="text-purple-300 font-bold mb-0.5">15M Cycle Expiry (Settlement)</div>
            <div>Status: <span className="text-cyan-300 font-bold">Active Contract Horizon</span></div>
            <div className="text-[10px] text-purple-400 mt-1">Settles at 15:00 interval boundary against strike.</div>
          </div>
        </div>
      </div>

      {/* SKIP Transition Reason Logger */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Skip & No-Trade Transition Logger</span>
          </span>
          <span className="text-[10px] text-purple-400">Explicit Audit Trail</span>
        </div>
        <div className="bg-[#080414] border border-purple-900/60 rounded-xl p-3 space-y-2 max-h-36 overflow-y-auto">
          <div className="flex items-center justify-between text-[10px] text-purple-400 border-b border-purple-900/40 pb-1">
            <span>TIMESTAMP / CYCLE</span>
            <span>TRANSITION REASON</span>
            <span>STATUS</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-purple-300">{new Date().toLocaleTimeString()}</span>
            <span className="text-amber-300 font-semibold">{qualificationReason}</span>
            <span className={isSkipped ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {isSkipped ? 'SKIP (VETOED)' : 'ANALYZING'}
            </span>
          </div>
          <div className="text-[10px] text-purple-400/80 pt-1">
            ℹ️ The engine maintains real-time P(UP)/P(DOWN) modeling throughout the 15M cycle regardless of entry window closure.
          </div>
        </div>
      </div>
    </div>
  );
};
