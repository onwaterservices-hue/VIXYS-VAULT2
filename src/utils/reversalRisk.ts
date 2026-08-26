/**
 * Shared Reversal Risk Assessment & Threshold Definitions
 * 
 * Standardized across all UI panels and engine layers:
 * - Low Risk:       < 30%
 * - Moderate Risk:  30% - 49%
 * - High Risk:      >= 50%
 */

export type ReversalRiskTier = 'LOW' | 'MODERATE' | 'HIGH';

export interface ReversalRiskAssessment {
  score: number;
  tier: ReversalRiskTier;
  label: string;      // e.g. "LOW RISK", "MODERATE RISK", "HIGH RISK"
  shortLabel: string; // e.g. "LOW", "MODERATE", "HIGH"
  statusLabel: string;// e.g. "LOW HAZARD", "MODERATE", "ELEVATED"
  colorClass: string; // e.g. "text-emerald-400"
  badgeClass: string; // e.g. "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
  cardClass: string;  // e.g. "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
  barColorClass: string; // e.g. "bg-emerald-500"
}

export function getReversalRiskAssessment(riskScore: number = 0): ReversalRiskAssessment {
  const score = Math.max(0, Math.min(100, Math.round(riskScore)));

  if (score < 30) {
    return {
      score,
      tier: 'LOW',
      label: 'LOW RISK',
      shortLabel: 'LOW',
      statusLabel: 'LOW HAZARD',
      colorClass: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      cardClass: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400',
      barColorClass: 'bg-emerald-500',
    };
  }

  if (score < 50) {
    return {
      score,
      tier: 'MODERATE',
      label: 'MODERATE RISK',
      shortLabel: 'MODERATE',
      statusLabel: 'MODERATE',
      colorClass: 'text-amber-400',
      badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
      cardClass: 'bg-amber-950/80 border-amber-500/50 text-amber-400',
      barColorClass: 'bg-amber-500',
    };
  }

  return {
    score,
    tier: 'HIGH',
    label: 'HIGH RISK',
    shortLabel: 'HIGH',
    statusLabel: 'ELEVATED HAZARD',
    colorClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    cardClass: 'bg-rose-950/80 border-rose-500/50 text-rose-400',
    barColorClass: 'bg-rose-500',
  };
}
