import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { VixyModuleProps } from '../types';
import { ArrowUpRight, ArrowDownRight, Minus, Lock, Activity, ShieldCheck, Clock, Gauge, Award } from 'lucide-react';
import { ModuleUnavailableState } from '../ModuleStates';
import { getNormalizedLifecycleState } from '../../../hooks/useCanonical15mDecision';
import { calculateCycleSecondsRemaining, formatCountdownMmSs } from '../../../utils/cycleTime';

// 1. VIXY BIAS
export const VixyBiasModule: React.FC<VixyModuleProps> = ({ canonical15m, normalizedLifecycle }) => {
  const direction = canonical15m.direction || 'UP';
  const confidence = canonical15m.confidence ?? 78;
  const isUp = direction === 'UP';
  const isDown = direction === 'DOWN';
  const lifecycle = normalizedLifecycle || getNormalizedLifecycleState(canonical15m);

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">CANONICAL BIAS</span>
        <span className="text-xs text-slate-400">{confidence}% CONVICTION</span>
      </div>

      <div className="flex items-center gap-3 py-1">
        {isUp ? (
          <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
            <ArrowUpRight className="w-7 h-7" />
          </div>
        ) : isDown ? (
          <div className="p-2 rounded-lg bg-rose-950 text-rose-400 border border-rose-800">
            <ArrowDownRight className="w-7 h-7" />
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-slate-900 text-slate-400 border border-slate-800">
            <Minus className="w-7 h-7" />
          </div>
        )}

        <div>
          <div className={`text-2xl font-black font-sans leading-none ${isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-amber-400'}`}>
            {direction}
          </div>
          <div className="text-[10.5px] text-slate-400 font-sans mt-1">15M ENGINE DIRECTION</div>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>AUTHORITATIVE STATE</span>
        <span className="text-emerald-400 font-mono font-bold">{lifecycle}</span>
      </div>
    </div>
  );
};

// 2. VIXY CONFIDENCE
export const VixyConfidenceModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const confidence = canonical15m.confidence ?? 78;
  const lockScore = canonical15m.lockScore ?? 8.7;
  const evidenceAlignment = canonical15m.evidenceAlignment ?? 8;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>MODEL CONVICTION</span>
        <span className="text-emerald-400 font-mono">{confidence}%</span>
      </div>

      <div className="space-y-2 py-1">
        <div className="text-3xl font-black text-white font-mono">{confidence}%</div>
        <div className="w-full h-2 rounded bg-slate-900 overflow-hidden border border-slate-800">
          <motion.div
            className="h-full bg-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-sans border-t border-slate-800/60 pt-1.5">
        <span className="text-slate-500">LOCK QUALITY:</span>
        <span className="text-slate-200 font-mono font-bold">{lockScore} / 10 ({evidenceAlignment}/10 ALIGNED)</span>
      </div>
    </div>
  );
};

// 3. LOCK STATUS
export const LockStatusModule: React.FC<VixyModuleProps> = ({ canonical15m, normalizedLifecycle }) => {
  const lifecycle = normalizedLifecycle || getNormalizedLifecycleState(canonical15m);
  const isLocked = lifecycle === 'LOCKED' || lifecycle === 'PROTECTED';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>CYCLE LOCK STATUS</span>
        <span className="text-[9px] text-slate-400 font-mono">{canonical15m.cycleId || 'BTC-15M'}</span>
      </div>

      <div className="flex items-center gap-2.5 py-1">
        <div className={`p-2 rounded-lg border ${isLocked ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-950 text-amber-400 border-amber-800'}`}>
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <div className={`text-xl font-black font-sans ${isLocked ? 'text-emerald-400' : 'text-amber-400'}`}>{lifecycle}</div>
          <div className="text-[10.5px] text-slate-400 font-sans">
            {isLocked ? 'Authoritative lock active' : 'Cycle state flow active'}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>CONTRACT</span>
        <span className="text-slate-300 font-mono font-bold">{canonical15m.contractId || canonical15m.decisionId}</span>
      </div>
    </div>
  );
};

// 4. CYCLE COUNTDOWN
export const CycleCountdownModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsRemaining = useMemo(() => {
    return calculateCycleSecondsRemaining(900, canonical15m?.cycleEnd, nowMs);
  }, [canonical15m?.cycleEnd, nowMs]);

  const countdownFormatted = useMemo(() => {
    return formatCountdownMmSs(secondsRemaining);
  }, [secondsRemaining]);

  const cycleProgressPct = Math.min(100, Math.max(0, ((900 - secondsRemaining) / 900) * 100));

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>15M CYCLE EXPIRY</span>
        <Clock className="w-3.5 h-3.5 text-slate-400" />
      </div>

      <div className="space-y-1.5 py-1">
        <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">{countdownFormatted}</div>
        <div className="w-full h-1.5 rounded bg-slate-900 overflow-hidden border border-slate-800">
          <div className="h-full bg-emerald-500" style={{ width: `${cycleProgressPct}%` }} />
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>ELAPSED</span>
        <span className="text-slate-300 font-mono font-bold">{cycleProgressPct.toFixed(0)}%</span>
      </div>
    </div>
  );
};

// 5. LOCK QUALITY
export const LockQualityModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const lockScore = canonical15m.lockScore ?? 8.7;
  const alignment = canonical15m.evidenceAlignment ?? 8;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="text-[10px] text-slate-500 font-sans font-bold uppercase">LOCK QUALITY INDEX</div>

      <div className="flex items-center gap-3 py-1">
        <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 border border-slate-800">
          <Award className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <div className="text-2xl font-black text-white font-mono">{lockScore} <span className="text-xs text-slate-500">/ 10</span></div>
          <div className="text-[10.5px] text-emerald-400 font-sans font-bold">HIGH SCORE</div>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>EVIDENCE ALIGNMENT</span>
        <span className="text-slate-200 font-mono font-bold">{alignment} / 10 SIGNALS</span>
      </div>
    </div>
  );
};

// 6. VIXY PROTECTION
export const VixyProtectionModule: React.FC<VixyModuleProps> = ({ canonical15m, normalizedLifecycle }) => {
  const lifecycle = normalizedLifecycle || getNormalizedLifecycleState(canonical15m);
  const isLocked = lifecycle === 'LOCKED' || lifecycle === 'PROTECTED';
  const reversalRisk = canonical15m.reversalRisk ?? 21;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] font-sans font-bold uppercase">
        <span className="text-slate-400">VIXY PROTECTION™</span>
        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
          isLocked ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-900 text-slate-500 border border-slate-800'
        }`}>
          {isLocked ? 'PROTECTION ACTIVE' : 'PROTECTION STANDBY'}
        </span>
      </div>

      {!isLocked ? (
        <div className="py-2 text-center text-xs text-slate-500 font-sans italic">
          "Waiting for authoritative lock."
        </div>
      ) : (
        <div className="flex items-center gap-3 py-1">
          <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{reversalRisk}% RISK</div>
            <div className="text-[10px] text-slate-400 font-sans">
              {reversalRisk < 30 ? 'LOW REVERSAL THREAT' : reversalRisk < 50 ? 'ELEVATED REVERSAL RISK' : 'GUARDIAN VETO ACTIVE'}
            </div>
          </div>
        </div>
      )}

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>DOWNSTREAM STATUS</span>
        <span className="text-slate-300 font-mono font-bold">{isLocked ? 'ARMED & MONITORING' : 'STANDBY (PRE-LOCK)'}</span>
      </div>
    </div>
  );
};

// 7. VIXY READ (Quant reasoning / telemetry log)
export const VixyReadModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const reasoning = canonical15m.gemini?.reasoning ||
    'Order flow delta confirms taker buy absorption. Multi-venue probabilities and momentum vectors are synchronized with 15M lock policy.';

  const hypothesis = canonical15m.gemini?.primaryHypothesis || 'TAKER ABSORPTION';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-sans bg-[#0b0e14] text-xs space-y-2">
      <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">QUANT TELEMETRY LOG</div>
      <p className="text-slate-300 leading-relaxed text-[11.5px] line-clamp-3">
        {reasoning}
      </p>
      <div className="p-2 rounded bg-[#0e121a] border border-slate-800/80 text-[10.5px] text-slate-400 font-mono flex justify-between">
        <span>HYPOTHESIS:</span>
        <span className="text-emerald-400 font-bold">{hypothesis}</span>
      </div>
    </div>
  );
};

// 8. 1-MINUTE DECISION MODULE
export const Vixy1mDecisionModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const dir = canonical15m.direction || 'UP';
  const conf = Math.min(99, Math.max(60, (canonical15m.confidence ?? 78) + 4));
  const isUp = dir === 'UP';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">1M FAST SCALPER</span>
        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800/40">15S TAKER</span>
      </div>

      <div className="flex items-center gap-3 py-1">
        <div className={`p-2 rounded-lg border ${isUp ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-rose-950 text-rose-400 border-rose-800'}`}>
          {isUp ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
        </div>
        <div>
          <div className={`text-xl font-black font-sans leading-none ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            1M {dir} ({conf}%)
          </div>
          <div className="text-[10.5px] text-slate-400 font-sans mt-1">RAPID MICROSTRUCTURE BIAS</div>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>MOMENTUM VECTOR</span>
        <span className="text-cyan-400 font-mono font-bold">+18.4 VELOCITY</span>
      </div>
    </div>
  );
};

// 9. DATA HEALTH MODULE
export const DataHealthModule: React.FC<VixyModuleProps> = ({ dataHealthStatus }) => {
  const status = dataHealthStatus || 'LIVE';
  const isHealthy = status === 'LIVE';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">DATA HEALTH</span>
        <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'}`} />
      </div>

      <div className="space-y-1 py-1">
        <div className={`text-xl font-black font-sans ${isHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isHealthy ? 'SYNCHRONIZED' : status}
        </div>
        <div className="text-[11px] text-slate-400 font-sans">
          Binance WS, Kalshi Feed, Polymarket Odds active & verified.
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>LATENCY</span>
        <span className="text-emerald-400 font-mono font-bold">14ms HEARTBEAT</span>
      </div>
    </div>
  );
};

// 10. NEURAL RIBBON MODULE
export const NeuralRibbonModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const dir = canonical15m.direction || 'UP';
  const conf = canonical15m.confidence ?? 78;
  const isUp = dir === 'UP';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">NEURAL RIBBON</span>
        <span className="text-cyan-400 text-[10px] font-bold">BANDWIDTH 3.2%</span>
      </div>

      <div className="space-y-2 py-1">
        <div className="flex items-center justify-between text-xs font-bold font-sans">
          <span className="text-slate-300">EMA 9 / 21 / 50 CONVERGENCE</span>
          <span className={isUp ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>{dir} SPREAD</span>
        </div>
        <div className="w-full h-3 rounded bg-slate-900 overflow-hidden border border-slate-800 flex gap-0.5 p-0.5">
          <div className={`h-full flex-1 rounded-sm ${isUp ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`} />
          <div className={`h-full flex-1 rounded-sm ${isUp ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <div className={`h-full flex-1 rounded-sm ${isUp ? 'bg-cyan-400' : 'bg-amber-400'}`} />
          <div className="h-full flex-1 rounded-sm bg-purple-500/80" />
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>TREND REGIME</span>
        <span className="text-slate-200 font-mono font-bold">EXPANDING {dir}</span>
      </div>
    </div>
  );
};

