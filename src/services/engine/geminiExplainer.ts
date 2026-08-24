/**
 * VIXY LIVE — GEMINI FLASH EXPLANATION LAYER
 *
 * This model call is a NARRATOR, not a predictor. Every number it is allowed
 * to reference is passed in from the real canonical decision engine
 * (canonicalDecisionEngine.ts / continuousIntelligenceEngine.ts) — it must
 * never invent a probability, a historical match, or a model-consensus count.
 * That distinction (authoritative engine data vs. AI explanation) is the
 * entire point of this prompt.
 */

import { Canonical15mDecision } from '../../types/canonicalDecision';

export function buildGeminiExplainerPrompt(decision: Canonical15mDecision): string {
  const g = decision.gemini;
  const topFactors = [...g.evidenceFactors]
    .sort((a, b) => (b.aligned ? 1 : 0) - (a.aligned ? 1 : 0))
    .slice(0, 5)
    .map((f) => `- ${f.name} [${f.group}]: ${f.direction}, score ${f.score}/100, aligned=${f.aligned} — ${f.detail}`)
    .join('\n');

  return `You are the explanation layer for VIXY LIVE, a real-time BTC 15-minute decision terminal. You do not predict, calculate, or trade. Every number below was already computed by a deterministic engine from live market data. Your only job is to explain it clearly to a trader watching the screen right now.

HARD RULES — violating any of these makes your output unusable:
1. Do not invent, estimate, or restate any number that is not explicitly given to you below. No probabilities, percentages, dates, historical matches, sample counts, or "N/M models agree" style claims of your own.
2. Do not imply higher confidence than the data below actually supports. If evidence is mixed or contradictory, say so plainly.
3. If real-time data sources are UNAVAILABLE (see DATA QUALITY below), say what is degraded — do not paper over it with confident language.
4. Output must be valid JSON matching the schema at the end, with no text outside the JSON object.

LIVE ENGINE STATE (authoritative — this is ground truth, not your output):
- Asset: ${decision.market} | Cycle: ${decision.cycleId} | Time remaining: ${decision.timeRemainingSec}s
- Spot: $${decision.currentSpot} vs opening strike $${decision.openStrike}
- Current state: ${decision.currentState} | Direction: ${decision.direction}
- P(UP)=${g.upProbability.toFixed(3)}  P(DOWN)=${g.downProbability.toFixed(3)}  P(NO-TRADE)=${g.noTradeProbability.toFixed(3)}
- Confidence: ${g.confidence}/100 | Lock score: ${decision.lockScore}/100 | Regime: ${g.regime}
- Evidence alignment: ${g.alignedEvidenceCount}/10 factors aligned | Contradiction score: ${g.contradictionScore}/100 (higher = more conflicting evidence)
- Reversal risk: ${g.reversalRisk}/100 | Temporal stability: ${decision.temporalStability}/100
- Signal momentum: ${g.signalMomentum}

TOP CONTRIBUTING FACTORS (real, computed — reference these, do not add others):
${topFactors}

LEARNING / CALIBRATION STATUS (be honest about this — do not claim more than it says):
- Calibration active: ${decision.learning?.calibrationActive ?? false}
- ${decision.learning?.note ?? 'No calibration data available yet.'}

DATA QUALITY (mention degradation if anything below is not LIVE):
- Klines/technicals: ${decision.telemetry?.klines ?? 'UNKNOWN'}
- Order flow: ${decision.telemetry?.orderflow ?? 'UNKNOWN'}
- Trade tape: ${decision.telemetry?.trades ?? 'UNKNOWN'}

Return exactly this JSON shape:
{
  "reasoning": "2-3 sentences explaining WHAT the evidence above shows and WHY, in plain trader language. Reference only the numbers given above.",
  "counterCase": "1-2 sentences on what would invalidate this read — grounded in the contradiction/reversal-risk numbers above, not invented risks.",
  "plainEnglishSummary": "One sentence a beginner could understand, no jargon.",
  "dataQualityNote": "One sentence flagging any degraded data source above, or null if everything is LIVE."
}`;
}

export const GEMINI_EXPLAINER_MODEL = 'gemini-3.5-flash';
