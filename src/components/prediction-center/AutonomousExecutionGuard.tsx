import React from 'react';
import { ShieldCheck } from 'lucide-react';

// The engine's reversal lock gate, from server.ts canLockCurrentCycle
// (lockEligibility.checks, served as lockGate.checks on /api/vixy/15m/current):
//   { id: "REVERSAL", ..., required: "<30% & no veto" }
// i.e. reversalAssessment.threatScore < 30 AND reversalAssessment.vetoActive is false.
// tests/terminal-guard-scenario-honesty.characterization.mjs pins this number to
// the server's string, so the two cannot drift apart silently.
const REVERSAL_LOCK_GATE_MAX = 30;

export interface ReversalGateCheck {
  pass: boolean;
  current: string | number;
  required: string;
  gating?: boolean;
}

interface AutonomousExecutionGuardProps {
  spotPrice: number;
  strikePrice: number;
  /** What the strike number is (Kalshi strike, placeholder, cycle-open reference). */
  strikeLabel: string;
  /** reversalAssessment.threatScore (0-100) from /api/vixy/15m/current, or null when absent. */
  reversalRisk: number | null;
  /** The server's own REVERSAL row from lockGate.checks, when the payload carries it. */
  reversalGateCheck: ReversalGateCheck | null;
}

// Spot minus strike, in dollars and as a percent of the strike. Null when either
// price is missing, zero or not finite -- never a division by a stand-in strike.
function strikeCushion(spot: number, strike: number): { dollar: number; pct: number } | null {
  if (typeof spot !== 'number' || typeof strike !== 'number') return null;
  if (!Number.isFinite(spot) || !Number.isFinite(strike) || spot <= 0 || strike <= 0) return null;
  const dollar = spot - strike;
  return { dollar, pct: (dollar / strike) * 100 };
}

// The threat score against the lock-gate limit. `underLimit` only says whether the
// score clears the <30 half of the gate; the veto half comes from the server row.
function reversalGateReading(risk: number | null): { score: number; underLimit: boolean } | null {
  if (typeof risk !== 'number' || !Number.isFinite(risk)) return null;
  const score = Math.max(0, Math.min(100, Math.round(risk)));
  return { score, underLimit: score < REVERSAL_LOCK_GATE_MAX };
}

export const AutonomousExecutionGuard: React.FC<AutonomousExecutionGuardProps> = ({
  spotPrice,
  strikePrice,
  strikeLabel,
  reversalRisk,
  reversalGateCheck,
}) => {
  const cushion = strikeCushion(spotPrice, strikePrice);
  const reversal = reversalGateReading(reversalRisk);

  // Status of the gate: the server's own boolean (threat < 30 AND no veto) when
  // the row is present; otherwise only a score at/above 30 is a known failure.
  const gateStatus: 'PASS' | 'FAIL' | 'UNDER 30' | '—' = reversalGateCheck
    ? reversalGateCheck.pass ? 'PASS' : 'FAIL'
    : reversal === null
      ? '—'
      : reversal.underLimit ? 'UNDER 30' : 'FAIL';
  const gateStatusClass =
    gateStatus === 'PASS' ? 'text-emerald-400' : gateStatus === 'FAIL' ? 'text-rose-400' : 'text-purple-300';

  const reversalText = (() => {
    if (reversal === null) return 'Reversal threat score not reported by the engine yet.';
    const base = `Lock gate requires a threat score under ${REVERSAL_LOCK_GATE_MAX}% and no reversal veto.`;
    const observeOnly = reversalGateCheck?.gating === false ? ' This check is observation-only under the current lock policy.' : '';
    if (reversalGateCheck) {
      if (reversalGateCheck.pass) return `${base} Currently met: ${reversal.score}% with no veto.${observeOnly}`;
      if (reversal.underLimit) return `${base} Not met: score is ${reversal.score}% but a reversal veto is active.${observeOnly}`;
      return `${base} Not met: ${reversal.score}% is at or above ${REVERSAL_LOCK_GATE_MAX}%.${observeOnly}`;
    }
    return reversal.underLimit
      ? `${base} Score ${reversal.score}% is under the limit; veto status not in this payload.`
      : `${base} Not met: ${reversal.score}% is at or above ${REVERSAL_LOCK_GATE_MAX}%.`;
  })();

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#100728]/95 via-[#0b051b]/95 to-[#060212] border border-purple-800/40 shadow-2xl space-y-4 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-cyan-400/40 before:to-transparent">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-900/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-950 border border-purple-700/50 text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-white font-sans flex items-center gap-1.5">
              <span>STRIKE CUSHION & REVERSAL GATE</span>
            </div>
            <div className="text-[10px] text-purple-300/70 font-mono">
              Spot vs strike, and the engine's reversal lock-gate check
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Card 1: Strike Cushion */}
        <div className="p-3.5 rounded-2xl bg-[#12072e]/90 border border-purple-800/40 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-purple-400 font-bold uppercase">
            <span>STRIKE CUSHION</span>
            <span className={cushion === null ? 'text-purple-300' : cushion.dollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {cushion === null ? '—' : cushion.dollar > 0 ? 'ABOVE STRIKE' : cushion.dollar < 0 ? 'BELOW STRIKE' : 'AT STRIKE'}
            </span>
          </div>

          <div className="text-xl font-black font-mono text-white">
            {cushion === null ? '—' : `${cushion.dollar >= 0 ? '+' : '−'}$${Math.abs(cushion.dollar).toFixed(2)}`}
          </div>

          <div className="text-[10px] text-purple-300/80 font-sans leading-relaxed">
            {cushion === null
              ? 'Spot or strike not available yet.'
              : `Spot is ${Math.abs(cushion.pct).toFixed(2)}% ${cushion.dollar >= 0 ? 'above' : 'below'} the ${strikeLabel} ($${strikePrice.toFixed(2)}). At this price ${cushion.dollar >= 0 ? 'UP' : 'DOWN'} settles in the money (UP settles at or above strike).`}
          </div>
        </div>

        {/* Card 2: Reversal lock gate */}
        <div className="p-3.5 rounded-2xl bg-[#12072e]/90 border border-purple-800/40 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-purple-400 font-bold uppercase">
            <span>REVERSAL LOCK GATE</span>
            <span className={gateStatusClass}>{gateStatus}</span>
          </div>

          <div className={`text-xl font-black font-mono ${reversal === null ? 'text-purple-300' : reversal.underLimit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {reversal === null ? '—' : `${reversal.score}%`}
            <span className="text-xs text-purple-300 font-sans font-normal"> threat score · limit &lt;{REVERSAL_LOCK_GATE_MAX}%</span>
          </div>

          <div className="text-[10px] text-purple-300/80 font-sans leading-relaxed">
            {reversalText} The threat score is a 0–100 engine score, not a probability.
          </div>
        </div>

      </div>

    </div>
  );
};
