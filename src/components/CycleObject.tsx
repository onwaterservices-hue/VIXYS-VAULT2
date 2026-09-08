import React, { useMemo } from "react";
import { useCanonical15mDecision } from "../hooks/useCanonical15mDecision";
import type { NormalizedLifecycleState } from "../hooks/useCanonical15mDecision";

/**
 * VIXY VAULT - CYCLE OBJECT
 *
 * The 15-minute cycle rendered once, as a single living object. Every value
 * comes from useCanonical15mDecision(); nothing here is estimated, seeded or
 * defaulted. When the engine hasn't said something, the object shows a dash.
 *
 * Ring   = time through the cycle (not confidence - that lives elsewhere).
 * Colour = lifecycle phase.
 * Shape  = hexagon overlay appears only when LOCKED.
 */

const CYCLE_SEC = 900;

const PHASES: NormalizedLifecycleState[] = [
  "CALIBRATING", "BUILDING", "CONFIRMING", "LOCKED", "PROTECTED", "SETTLED", "SKIPPED",
];

const PHASE_META: Record<NormalizedLifecycleState, { label: string; hint: string; color: string }> = {
  CALIBRATING: { label: "Calibrating", hint: "Reading the tape", color: "var(--vx-phase-calibrating)" },
  BUILDING: { label: "Building", hint: "Weighing the evidence", color: "var(--vx-phase-building)" },
  CONFIRMING: { label: "Confirming", hint: "Checking for conflict", color: "var(--vx-phase-confirming)" },
  LOCKED: { label: "Locked", hint: "Decision committed", color: "var(--vx-phase-locked)" },
  PROTECTED: { label: "Protected", hint: "Guarding the call", color: "var(--vx-phase-protected)" },
  SETTLED: { label: "Settled", hint: "Graded against the close", color: "var(--vx-phase-settled)" },
  SKIPPED: { label: "Skipped", hint: "No edge. Skip is a win.", color: "var(--vx-phase-skipped)" },
};

function mmss(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec)) return "--:--";
  const s = Math.max(0, Math.round(sec));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function HexOverlay({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ filter: `drop-shadow(0 0 8px ${color})`, opacity: 0.85 }}>
      <polygon points="50,3 91,26 91,74 50,97 9,74 9,26" fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

export default function CycleObject({ compact = false }: { compact?: boolean }) {
  const { decision, isLoading, normalizedLifecycle, dataHealthStatus, isStale, isDisconnected } =
    useCanonical15mDecision() as any;

  const phase: NormalizedLifecycleState = normalizedLifecycle || "CALIBRATING";
  const meta = PHASE_META[phase];

  const remaining: number | null =
    decision && Number.isFinite(decision.timeRemainingSec) ? Number(decision.timeRemainingSec) : null;

  const feedBad = Boolean(isDisconnected) || dataHealthStatus === "API_ERROR" || dataHealthStatus === "MISSING_DATA";

  // Progress through the cycle. Frozen at 0 when the feed is unhealthy so a
  // stale cycle can't sit there looking alive.
  const pct = useMemo(() => {
    if (feedBad || isLoading || remaining === null) return 0;
    return Math.round(Math.min(100, Math.max(0, ((CYCLE_SEC - remaining) / CYCLE_SEC) * 100)));
  }, [feedBad, isLoading, remaining]);

  const dir: string | null = decision?.direction === "UP" || decision?.direction === "DOWN" ? decision.direction : null;
  const conf: number | null = Number.isFinite(decision?.confidence) ? Math.round(Number(decision.confidence)) : null;
  const showCall = phase === "LOCKED" || phase === "PROTECTED" || phase === "SETTLED";
  const outcome: string | null = phase === "SETTLED" && decision?.finalOutcome ? String(decision.finalOutcome) : null;
  const dirColor = dir === "UP" ? "var(--vx-up)" : dir === "DOWN" ? "var(--vx-down)" : "var(--vx-text-2)";
  const phaseIdx = PHASES.indexOf(phase);

  const size = compact ? 148 : 264;
  const ringStyle = {
    "--radar-color": meta.color,
    "--radar-color-2": meta.color,
    "--radar-glow": meta.color,
    "--radar-pct": pct,
    width: size,
    height: size,
    opacity: feedBad ? 0.45 : 1,
    transition: "opacity 400ms ease",
  } as React.CSSProperties;

  return (
    <div className={compact ? "flex items-center gap-4" : "flex flex-col items-center"}>
      <div className="relative" style={{ width: size, height: size }}>
        <div className="radar-wrap" style={ringStyle}>
          <div className="radar-outer-glow" />
          <div className="radar-ring-track" />
          <div className="radar-progress" />
          {!feedBad && <div className="radar-sweep-ring" />}
          {!feedBad && <div className="radar-orbit"><span className="radar-glint" /></div>}
          {!feedBad && phase !== "CALIBRATING" && <div className="radar-orbit rev"><span className="radar-glint b" /></div>}
          {phase === "LOCKED" && <HexOverlay color={meta.color} />}

          <div className="radar-core" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: compact ? 2 : 4 }}>
            <span className="vx-label" style={{ color: meta.color }}>{meta.label}</span>

            {isLoading ? (
              <span className="font-mono text-white/30" style={{ fontSize: compact ? 22 : 40 }}>{"\u2014"}</span>
            ) : showCall && dir ? (
              <span className="font-mono font-bold leading-none" style={{ fontSize: compact ? 26 : 44, color: dirColor }}>
                {dir === "UP" ? "\u25B2" : "\u25BC"} {dir}
              </span>
            ) : (
              <span className="font-mono font-bold leading-none text-white" style={{ fontSize: compact ? 26 : 44 }}>{mmss(remaining)}</span>
            )}

            {!isLoading && showCall && dir && (
              <span className="font-mono text-white/70" style={{ fontSize: compact ? 11 : 14 }}>
                {conf !== null ? conf + "% confidence" : "\u2014"}
              </span>
            )}
            {!isLoading && showCall && (
              <span className="font-mono text-white/45" style={{ fontSize: compact ? 10 : 12 }}>{mmss(remaining)} left</span>
            )}
            {!isLoading && !showCall && (
              <span className="font-mono text-white/45" style={{ fontSize: compact ? 10 : 12 }}>{meta.hint}</span>
            )}
            {outcome && (
              <span className={"vx-state " + (outcome === "WIN" ? "live" : outcome === "LOSS" ? "warn" : "")}>{outcome}</span>
            )}
          </div>
        </div>
      </div>

      <div className={compact ? "flex flex-col gap-1.5" : "mt-5 flex flex-col items-center gap-2"}>
        <div className="flex items-center gap-1.5" aria-label={"Phase " + (phaseIdx + 1) + " of " + PHASES.length}>
          {PHASES.map((p, i) => (
            <span key={p} title={PHASE_META[p].label}
              className="block rounded-full transition-all duration-500"
              style={{
                width: i === phaseIdx ? 18 : 6, height: 6,
                background: i === phaseIdx ? meta.color : i < phaseIdx ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
                boxShadow: i === phaseIdx ? `0 0 10px ${meta.color}` : "none",
              }} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {feedBad ? (
            <span className="vx-state warn">Feed {String(dataHealthStatus || "DOWN").toLowerCase().replace("_", " ")}</span>
          ) : isStale ? (
            <span className="vx-state warn">Stale</span>
          ) : (
            <span className="vx-state live">Live</span>
          )}
          {!compact && <span className="vx-label">BTC 15m cycle</span>}
        </div>
      </div>
    </div>
  );
}
