import React, { useEffect, useState } from 'react';
import { Brain, Info, Layers, RefreshCw, Target } from 'lucide-react';
import { fetchModelStatus, fetchApiSignal, ModelStatusResponse, ApiSignalResponse } from '../services/api';

interface AIBrainMemoryVaultProps {
  asset?: string;
  desk?: string;
}

// "Why this signal?" drawer -- shows what the engine actually knows, nothing staged.
//
// This drawer (15-second desk) used to render a hardcoded "FINAL DECISION: BUY UP
// (91.6% CONFIDENCE)" regardless of market state, eight invented "engines" with
// fixed weights (seven BULLISH), a "real-time quant reasoning stream" of four
// fixed sentences cycled by a timer ("Net Taker Delta +1,420 BTC", "Resistance
// wall at $64,280"), "71.8% (Calibrated)", "18,427+ Stored Setups", "Trending
// Bull Volatility", "Autosave Active", and an observation count that added +1
// every 6 seconds on a timer.
//
// There is no separate 15-second model. VIXY's only measured model is the BTC
// 15-minute engine, and /api/signal and /api/model-status for desk=15s both
// describe it. Everything below is read from those two endpoints.

type SignalWithCycle = ApiSignalResponse & {
  isLocked?: boolean;
  lockedDirection?: string | null;
  lockedConfidence?: number | null;
  lockedProbability?: number | null;
  lockPolicy?: string | null;
  cycleStage?: string | null;
  timeRemainingSec?: number | null;
};

const humanize = (v?: string | null) =>
  v ? v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : null;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;

export const AIBrainMemoryVault: React.FC<AIBrainMemoryVaultProps> = ({
  asset = 'BTC',
  desk = '15m',
}) => {
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [apiSignal, setApiSignal] = useState<SignalWithCycle | null>(null);

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      const [status, sig] = await Promise.all([
        fetchModelStatus(asset, desk),
        fetchApiSignal(asset, desk),
      ]);
      if (active) {
        setModelStatus(status);
        setApiSignal(sig as SignalWithCycle);
      }
    };
    loadStatus();
    const interval = setInterval(loadStatus, 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [asset, desk]);

  // Real values or nothing. These used to default to 148 settled and a 0.182
  // Brier score whenever the endpoint had not answered.
  // A failed /api/model-status returns null counts, never 0 / 500.
  const settled: number | null = typeof modelStatus?.settledCount === 'number' ? modelStatus.settledCount : null;
  const minRequired: number | null = typeof modelStatus?.minRequired === 'number' ? modelStatus.minRequired : null;
  const brier: number | null = typeof modelStatus?.activeModelBrier === 'number' ? modelStatus.activeModelBrier : null;
  const winRate: number | null = typeof modelStatus?.historicalAccuracy === 'number' ? modelStatus.historicalAccuracy : null;
  const regime = humanize(modelStatus?.currentRegime ?? null);

  const isLocked = Boolean(apiSignal?.isLocked);
  const lockedDirection = apiSignal?.lockedDirection ?? null;
  const lockedConfidence = typeof apiSignal?.lockedConfidence === 'number' ? apiSignal.lockedConfidence : null;
  const lockedProbability = typeof apiSignal?.lockedProbability === 'number' ? apiSignal.lockedProbability : null;
  // lockedConfidence is the engine score (0–100) under ENGINE_GATE. Under
  // STRIKE_SIDE_RULE, server.ts lock15mCycle stores round(rule p × 100) there
  // instead. /api/signal does not send lockPolicy today, so this reads as an
  // engine score unless the payload says the rule decided.
  const lockPolicy = typeof apiSignal?.lockPolicy === 'string' ? apiSignal.lockPolicy : null;
  const stage = humanize(apiSignal?.cycleStage ?? apiSignal?.signalState ?? null);
  const secondsLeft = typeof apiSignal?.timeRemainingSec === 'number' ? apiSignal.timeRemainingSec : null;

  const decisionText =
    isLocked && lockedDirection
      ? `LOCKED ${lockedDirection}` +
        (lockedConfidence !== null
          ? lockPolicy === 'STRIKE_SIDE_RULE'
            ? ` • rule P(win) ${lockedConfidence}%`
            : ` • engine score ${lockedConfidence} / 100`
          : '') +
        (lockedProbability !== null ? ` • P(win) ${(lockedProbability * 100).toFixed(1)}%` : '')
      : `NO LOCK THIS CYCLE${stage ? ` • ${stage}` : ''}`;
  const decisionTone =
    isLocked && lockedDirection === 'UP'
      ? 'text-emerald-300 bg-emerald-950/60 border-emerald-500/30'
      : isLocked && lockedDirection === 'DOWN'
        ? 'text-rose-300 bg-rose-950/60 border-rose-500/30'
        : 'text-slate-300 bg-slate-900/60 border-slate-600/30';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0b051a]/90 backdrop-blur-xl border border-purple-500/30 p-5 shadow-[0_0_35px_rgba(147,51,234,0.15)] space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-900/60 to-purple-950/80 border border-purple-500/40 text-purple-300">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white font-mono tracking-wider uppercase">
              Why this signal? — what the engine knows
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {asset} 15-minute engine • Brier Score: {brier === null ? '—' : brier.toFixed(3)}
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold">
          {!modelStatus ? 'LOADING…' : settled !== null ? `${settled} SETTLED LOCKS` : 'MODEL STATUS UNAVAILABLE'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Settled record */}
        <div className="p-4 rounded-xl bg-[#11082c]/80 border border-purple-500/20 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-900/30 pb-2">
            <span className="text-xs font-bold text-purple-300 font-mono uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Settled record (15-minute engine)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Settled Locks</span>
              <span className="text-2xl font-black font-mono text-cyan-300 tracking-tight">{settled !== null ? settled : '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Win Rate</span>
              <span className="text-xl font-black font-mono text-purple-200">{winRate === null ? '—' : `${winRate.toFixed(1)}%`}</span>
            </div>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-300">
              <span>Toward calibration target</span>
              <span className="text-amber-400 font-bold">{settled !== null && minRequired !== null ? `${settled} / ${minRequired}` : '—'}</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-purple-900/50">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${settled !== null && minRequired !== null ? Math.min(100, (settled / Math.max(1, minRequired)) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: This cycle */}
        <div className="p-4 rounded-xl bg-[#11082c]/80 border border-purple-500/20 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-900/30 pb-2">
            <span className="text-xs font-bold text-amber-300 font-mono uppercase flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              This cycle ({asset} 15-minute)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Stage</span>
              <span className="text-sm font-bold font-mono text-purple-200">{stage ?? '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Time Left</span>
              <span className="text-sm font-bold font-mono text-purple-200">{secondsLeft === null ? '—' : mmss(secondsLeft)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Regime (engine's current read)</span>
              <span className="text-sm font-bold font-mono text-purple-200">{regime ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Engine decision */}
      <div className="p-4 rounded-xl bg-[#0d061f] border border-purple-500/30 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold text-purple-200">
          <span className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            ENGINE DECISION
          </span>
          <span className={`font-black text-xs px-2.5 py-0.5 rounded-full border ${decisionTone}`}>
            {apiSignal ? decisionText : 'LOADING…'}
          </span>
        </div>
      </div>

      {/* Scope note */}
      <div className="p-3 rounded-xl bg-[#0e0622] border border-purple-500/30 flex items-start gap-2 text-[11px] font-mono text-slate-300">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <span>
          There is no separate 15-second model. VIXY's only measured model is the {asset} 15-minute engine; this drawer shows its
          settled record and the current cycle. Nothing here is simulated.
        </span>
      </div>
    </div>
  );
};
