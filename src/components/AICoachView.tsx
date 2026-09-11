import React from 'react';
import { Compass, Brain, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';
import { headline, lockStatusOf, lockStatusWord, lockStatusSentence } from '../lib/engineSemantics';

/**
 * VIXY VAULT - COACH
 *
 * This page used to explain a fixed confidence cap with two invented limiting
 * factors (an ask wall at a stale strike, a momentum slowdown nobody measured),
 * recommend entries at a made-up VWAP floor for an invented edge, and offer
 * strategy profiles whose thresholds changed nothing the engine does.
 *
 * It now teaches only from the engine's own state, live:
 *   - the calibrated P(win) and its sample size when a historical cell matches,
 *     otherwise the engine score and the server's reason
 *   - the lock gate checklist the server evaluates every tick, current vs required
 * Nothing on this page is estimated in the browser, and when the feed is not
 * live the page says so instead of showing anything.
 */

type GateCheck = {
  id: string;
  label: string;
  pass: boolean;
  current: string | number;
  required: string;
  gating?: boolean;
};

export const AICoachView: React.FC = () => {
  const { decision, dataHealthStatus } = useCanonical15mDecision() as any;
  const live = dataHealthStatus === 'LIVE' && Boolean(decision);

  const checks: GateCheck[] = Array.isArray(decision?.lockGate?.checks) ? decision.lockGate.checks : [];
  const gating = checks.filter((c) => c && c.gating !== false && c.id !== 'CALIBRATED_P');
  const failing = gating.filter((c) => !c.pass);
  const passing = gating.filter((c) => c.pass);
  const eligible = Boolean(decision?.lockEligibility?.eligible ?? decision?.lockGate?.eligible ?? false);
  const lock = lockStatusOf(decision);
  const cycleOpen = lock.kind === 'OPEN';

  const calibrated = decision?.calibrated ?? null;
  const pWinPct = typeof calibrated?.pWin === 'number' ? Math.round(calibrated.pWin * 100) : null;
  const n = typeof calibrated?.n === 'number' ? calibrated.n : null;
  const side = calibrated?.currentSide === 'UP' || calibrated?.currentSide === 'DOWN' ? calibrated.currentSide : null;
  const h = headline(decision);

  return (
    <div className="space-y-6 font-sans text-slate-200">
      {/* Header */}
      <div className="bg-[#0a0518] rounded-2xl border border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-1">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Learn from the live engine</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">VIXY Coach</h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5 max-w-2xl">
            Why is the number what it is, and why hasn't VIXY locked yet? Every row below is the engine's own state this tick. Nothing here is estimated in your browser.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-[#0c0620] text-purple-200 font-mono text-xs font-bold border border-purple-700/40 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          ENGINE {live ? 'LIVE' : 'NOT LIVE'}
        </div>
      </div>

      {!live ? (
        <div className="bg-[#0a0518] rounded-2xl border border-slate-800 p-6 text-sm text-slate-400">
          The 15-minute engine is not reporting live right now, so there is nothing to coach from. This page fills in as soon as the feed returns.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Why isn't this 99%? */}
          <div className="bg-[#0a0518] rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider">Why isn't this 99%?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              VIXY's headline number is not a confidence dial, and nothing caps it. It is how often past cycles in a similar state finished on the current side of the strike, together with how many of those cycles there were. A small sample or a mixed history keeps it lower. That is the honest answer, not a safety margin.
            </p>
            <div className="bg-[#0c0620] p-4 rounded-xl border border-purple-500/30 font-mono text-xs space-y-1.5">
              <span className="text-purple-300 font-bold block uppercase tracking-wider text-[11px]">Right now</span>
              {pWinPct !== null ? (
                <p className="text-slate-200 font-sans text-[12px] leading-relaxed">
                  <strong className="text-white font-mono">P(WIN{side ? ` ${side}` : ''}) {pWinPct}%</strong> across{' '}
                  <strong className="text-white font-mono">n={n ?? '—'}</strong> similar past cycles.
                </p>
              ) : h.kind === 'ENGINE_SCORE' ? (
                <p className="text-slate-200 font-sans text-[12px] leading-relaxed">
                  No historical cell matches this state yet{calibrated?.reason ? ` (${calibrated.reason})` : ''}, so the engine shows its score of{' '}
                  <strong className="text-white font-mono">{h.value}</strong> instead of a probability.
                </p>
              ) : (
                <p className="text-slate-400 font-sans text-[12px]">The engine has not published a number for this tick.</p>
              )}
            </div>
          </div>

          {/* What is holding the lock back */}
          <div className="bg-[#0a0518] rounded-2xl border border-slate-800 p-6 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{cycleOpen ? 'What is holding the lock back' : 'Lock status'}</h3>
              <span
                className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                  eligible || !cycleOpen ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {!cycleOpen ? lockStatusWord(lock) : gating.length ? `${passing.length}/${gating.length} GATES` : 'NO GATE DATA'}
              </span>
            </div>

            {!cycleOpen ? (
              <p className="text-xs text-cyan-200 font-sans leading-relaxed">{lockStatusSentence(lock)}</p>
            ) : gating.length === 0 ? (
              <p className="text-xs text-slate-400 font-sans">The server did not send its gate checklist this tick.</p>
            ) : failing.length === 0 ? (
              <p className="text-xs text-emerald-300 font-sans flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Every gating check passes. The engine is allowed to lock.
              </p>
            ) : (
              <div className="space-y-2">
                {failing.map((c) => (
                  <div key={c.id} className="bg-[#0c0620] p-3 rounded-xl border border-amber-500/30 flex items-start justify-between gap-3 text-xs">
                    <span className="text-amber-200 font-bold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      {c.label}
                    </span>
                    <span className="text-right text-slate-300 whitespace-nowrap">
                      <strong className="text-white">{String(c.current)}</strong> <span className="text-slate-500">/ {c.required}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {cycleOpen && passing.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-400 hover:text-white">Passing ({passing.length})</summary>
                <div className="mt-2 space-y-1.5">
                  {passing.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {c.label}
                      </span>
                      <span className="whitespace-nowrap">
                        <strong className="text-slate-200">{String(c.current)}</strong> / {c.required}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Your risk is yours */}
          <div className="lg:col-span-2 bg-[#0a0518] rounded-2xl border border-slate-800 p-5 flex gap-3">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              VIXY tells you when history favours a side and why the lock is or isn't allowed. It does not size positions or choose your risk. Earlier versions of this page showed strategy profiles with confidence and edge thresholds; they did not change anything the engine does and have been removed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
