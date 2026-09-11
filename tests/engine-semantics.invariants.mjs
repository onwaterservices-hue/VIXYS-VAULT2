/**
 * VIXY VAULT — engine semantics invariants.
 *
 * Pins that the words the terminal uses can never outrank the numbers. The
 * motivating live observation (2026-09-10, 7m15s into a cycle): conviction 52,
 * lock quality 44, reversal risk 43 — rendered as "STRONG EVIDENCE",
 * "MARKET ALIGNMENT: STRONG" and "CONVERGENCE". Those strings are now derived
 * here, and this file makes the old behaviour impossible to reintroduce
 * silently.
 *
 * Run: node tests/engine-semantics.invariants.mjs
 */
import {
  evidenceState, confidenceLabel, lockQualityLabel, alignmentLabel, headline, pWinLabel,
  lockStatusOf, lockStatusWord, lockStatusSentence,
} from "../src/lib/engineSemantics.ts";
import { readRepoFile, createHarness } from "./_engineSource.mjs";

const t = createHarness("engine-semantics.invariants");

t.section("the observed 52% cycle is described honestly");
t.eq("the screenshot case 52 / 53 / rr43 is DEVELOPING, not strong", evidenceState({ confidence: 52, lockQuality: 53, reversalRisk: 43 }), "DEVELOPING");
t.eq("the 435s live sample 52 / 44 / rr39 is WEAK BIAS", evidenceState({ confidence: 52, lockQuality: 44, reversalRisk: 39 }), "WEAK BIAS");
t.eq("50 / 39 is WEAK BIAS", evidenceState({ confidence: 50, lockQuality: 39, reversalRisk: 43 }), "WEAK BIAS");
t.eq("lock quality 53 is BUILDING (was 'STRONG EVIDENCE')", lockQualityLabel(53, 85), "BUILDING");
t.eq("confidence 52 is UNCERTAIN (was 'MODERATE CONFIDENCE')", confidenceLabel(52), "UNCERTAIN");
t.eq("6/11 families agreeing is MODERATE, not STRONG", alignmentLabel(6), "MODERATE");

t.section("words never outrank the real gate");
t.eq("LOCK READY only when the gate's own bar is met", evidenceState({ confidence: 91, lockQuality: 93, reversalRisk: 15, gateMinLockQuality: 85 }), "LOCK READY");
t.eq("a high score still below the gate bar is not LOCK READY", evidenceState({ confidence: 91, lockQuality: 80, reversalRisk: 15, gateMinLockQuality: 85 }), "HIGH CONVICTION");
t.eq("the gate's explicit verdict wins", evidenceState({ confidence: 70, lockQuality: 70, gateEligible: true }), "LOCK READY");
t.eq("MEETS LOCK GATE is granted only against the gate bar", lockQualityLabel(86, 85), "MEETS LOCK GATE");
t.eq("without a known gate bar, 86 is only NEAR GATE", lockQualityLabel(86, null), "NEAR GATE");

t.section("terminal and conflict states dominate");
t.eq("locked", evidenceState({ confidence: 88, lockQuality: 71, isLocked: true }), "LOCKED");
t.eq("skip beats locked", evidenceState({ confidence: 88, lockQuality: 71, isLocked: true, isSkip: true }), "SKIP");
t.eq("explicit conflict", evidenceState({ confidence: 80, lockQuality: 80, hasConflict: true }), "CONFLICTED");
t.eq("reversal risk >= 50 is a conflict", evidenceState({ confidence: 80, lockQuality: 80, reversalRisk: 55 }), "CONFLICTED");
t.eq("no numbers at all", evidenceState({ confidence: null, lockQuality: null }), "NO DATA");
t.eq("missing lock quality label", lockQualityLabel(null), "AWAITING ENGINE DATA");

t.section("the fabricated card strings are gone");
// Strip comments first: the source now documents the removed literals in
// comments ("+$28.4M was a literal"), and those must not count as renders.
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
const pc = code(readRepoFile("src/components/CryptoPredictionCenterView.tsx"));
t.check("no fake settlement rows (#48291 etc.)", !pc.includes("'#48291'") && !pc.includes("'#48290'"));
t.check("no invented pnl", !pc.includes("'+2.4%'") && !pc.includes("'+1.8%'"));
t.check("no hardcoded SESSION WIN RATE 78%", !/WIN RATE:[^<]*<span[^>]*>78%/.test(pc));
t.check("no hardcoded BRIER 0.142", !pc.includes("0.142"));
t.check("no hardcoded MARKET ALIGNMENT STRONG chip", !/MARKET ALIGNMENT<\/span>[\s\S]{0,400}>\s*STRONG\s*</.test(pc));
t.check("lock-quality label comes from engineSemantics", pc.includes("lockQualityLabel("));
const mc = code(readRepoFile("src/components/vixy-live-workspace/ModuleCards.tsx"));
t.check("no invented +$28.4M taker delta", !mc.includes("+$28.4M"));
t.check("no invented 98.4% RETENTION", !mc.includes("98.4% RETENTION"));
t.check("no invented $184.50 ATR / 4.1% bandwidth", !mc.includes("$184.50") && !mc.includes("4.1% EXPANDING"));
t.check("no invented BULL CONTINUATION / EXPANSION DRIFT", !mc.includes("BULL CONTINUATION") && !mc.includes("EXPANSION DRIFT"));
t.check("no ?? 87 lock-score fallback", !mc.includes("?? 87"));
t.check("no invented momentum +18.4 / RSI 64.2 / +2.4σ", !mc.includes("+18.4") && !mc.includes("64.2") && !mc.includes("+2.4σ"));
t.check("no invented EMA stack / 8.4 / 10 STRONG", !mc.includes("EMA 9") && !mc.includes("8.4 / 10 STRONG"));
t.check("no invented $1.42B turnover / $0.10 (TIGHT) spread", !mc.includes("$1.42B") && !mc.includes("$0.10 (TIGHT)"));
t.check("no || 'TRENDING_BULL' regime fallback", !mc.includes("|| 'TRENDING_BULL'"));
t.check("no invented edge scanner figures (+6.4% / +1.85 R:R / 7.2% / +18.4% EV)", !mc.includes("EDGE: +6.4%") && !mc.includes("+1.85 R:R") && !mc.includes("by 7.2%") && !mc.includes("EV (FAVORABLE)"));
const rr = code(readRepoFile("src/components/vixyV2/ContextualRightRail.tsx"));
t.check("right rail has no || 78 confidence fallback", !rr.includes("|| 78"));

t.section("headline(): the one number every surface shows");
const live = headline({ confidence: 52, calibrated: { pWin: 0.605, n: 261, currentSide: "UP" } });
t.check("prefers calibrated P(win) over the engine score", live.kind === "PWIN" && live.value === 61 && live.n === 261 && live.side === "UP");
t.check("labels it P(WIN <side>) · n=", live.label === "P(WIN UP) · n=261");
t.check("word comes from the P(win) scale, not the score scale", live.word === "MODEST EDGE");
const noCell = headline({ confidence: 52, calibrated: { pWin: null, n: 0, currentSide: null } });
t.check("falls back to the engine score, labelled as such", noCell.kind === "ENGINE_SCORE" && noCell.value === 52 && noCell.label === "ENGINE SCORE");
t.check("the score keeps its honest word (52 is UNCERTAIN)", noCell.word === "UNCERTAIN");
const nothing = headline({ confidence: null, calibrated: null });
t.check("no number when the engine published none — never a default", nothing.kind === "NONE" && nothing.value === null && nothing.label === "NO DATA");
t.check("an absent decision is NONE too", headline(undefined).kind === "NONE" && headline(null).value === null);
t.check("P(win) side is only UP/DOWN", headline({ calibrated: { pWin: 0.5, n: 40, currentSide: "FLAT" } }).side === null);
t.check("pWinLabel tiers: 95 AT LAYER-5 BAR / 85 STRONG / 70 CLEAR / 58 MODEST / 42 COIN FLIP / below AGAINST",
  pWinLabel(96) === "AT LAYER-5 BAR" && pWinLabel(85) === "STRONG EDGE" && pWinLabel(70) === "CLEAR EDGE" && pWinLabel(58) === "MODEST EDGE" && pWinLabel(50) === "COIN FLIP" && pWinLabel(30) === "AGAINST CURRENT SIDE");
t.check("pWinLabel(null) says there is no matching history", pWinLabel(null) === "NO MATCHING HISTORY");

t.section("lockStatusOf(): gate checks are not blockers after a lock");
// Captured from production 2026-09-11 01:36:28 local: the engine locked UP and,
// at the same tick, 8 gating checks read as failing, including NOT_LOCKED.
const lockedPayload = {
  currentState: "LOCKED_UP", direction: "UP", lockedAt: 1789104984817,
  lockGate: { eligible: false, checks: [
    { id: "LOCK_QUALITY", current: "75", pass: false },
    { id: "NOT_LOCKED", current: "locked", pass: false },
  ] },
};
t.eq("LOCKED_UP is LOCKED UP", lockStatusWord(lockStatusOf(lockedPayload)), "LOCKED UP");
t.eq("LOCKED_DOWN is LOCKED DOWN", lockStatusWord(lockStatusOf({ currentState: "LOCKED_DOWN" })), "LOCKED DOWN");
t.eq("PROTECTED is still a lock, side from direction", lockStatusWord(lockStatusOf({ currentState: "PROTECTED", direction: "DOWN" })), "LOCKED DOWN");
t.eq("SKIP is SKIPPED", lockStatusOf({ currentState: "SKIP", direction: "UP" }).kind, "SKIPPED");
t.eq("SETTLED is SETTLED", lockStatusOf({ currentState: "SETTLED" }).kind, "SETTLED");
t.eq("WATCH with an open NOT_LOCKED check is OPEN", lockStatusOf({ currentState: "WATCH", lockedAt: null, lockGate: { checks: [{ id: "NOT_LOCKED", current: "open" }] } }).kind, "OPEN");
t.eq("a lockedAt stamp alone means LOCKED", lockStatusOf({ currentState: "WATCH", direction: "UP", lockedAt: 1789104984817 }).kind, "LOCKED");
t.eq("the server's NOT_LOCKED=locked check alone means LOCKED", lockStatusOf({ currentState: "CONFIRMING", lockGate: { checks: [{ id: "NOT_LOCKED", current: "locked" }] } }).kind, "LOCKED");
t.eq("no decision is OPEN, never a guessed lock", lockStatusOf(undefined).kind, "OPEN");
t.check("an open cycle has no lock sentence", lockStatusSentence(lockStatusOf({ currentState: "WATCH" })) === "");
t.check("a locked cycle says nothing is blocking", lockStatusSentence(lockStatusOf(lockedPayload)).includes("nothing is blocking now"));

t.done();
