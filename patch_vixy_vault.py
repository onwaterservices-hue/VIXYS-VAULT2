import re

with open("backend.ts", "r") as f:
    text = f.read()

# We need to find the settlement logic block
search_str = r'serverLearningEngine\.settledHistory\.unshift\(\{\s*id:\s*prevLog\.id,\s*asset:\s*"BTC",\s*desk:\s*"15m",\s*timestamp:\s*prevLog\.resolvedAt,\s*prediction:\s*prevLog\.direction,\s*confidence:\s*prevLog\.confidence,\s*actualOutcome:\s*prevLog\.actualOutcome,\s*brierScore:\s*prevLog\.brierScore,?\s*\}\);'

replacement = """serverLearningEngine.settledHistory.unshift({
            id: prevLog.id,
            asset: "BTC",
            desk: "15m",
            timestamp: prevLog.resolvedAt,
            prediction: prevLog.direction,
            confidence: prevLog.confidence,
            actualOutcome: prevLog.actualOutcome,
            brierScore: prevLog.brierScore,
          });
          
          // --- VIXY VAULT CLOUD LEARNING ENGINE ---
          try {
             const outcomePayload = {
                cycleId: prevLog.cycleId || prevLog.id,
                timestamp: prevLog.resolvedAt,
                openPrice: prevLog.entryPrice || prevLog.spotAtLock || current15mStrikePrice,
                strike: prevLog.targetStrike || current15mStrikePrice,
                closePrice: prevLog.settlementPrice,
                direction: prevLog.direction,
                confidence: prevLog.confidence,
                reversalRisk: prevLog.reversalRisk || 0,
                finalDecision: prevLog.decision || "UNKNOWN",
                settlementOutcome: prevLog.outcome,
                wasCorrect: prevLog.wasCorrect,
                brierScore: prevLog.brierScore,
                regime: serverLearningEngine.currentRegime || "UNKNOWN",
                learningEligible: true,
                recordedAt: new Date().toISOString()
             };
             
             // Persist to Vixy Vault Learning Storage in Firestore
             if (db) {
                const { doc, setDoc } = require("firebase/firestore");
                setDoc(doc(db, "decision_outcomes", outcomePayload.cycleId), outcomePayload, { merge: true }).catch(err => console.warn("[VIXY_VAULT] Failed to save outcome to Firestore:", err?.message));
             }
             console.log(`[VIXY_VAULT_LEARNING] Settled cycle ${outcomePayload.cycleId} recorded to cloud learning engine. Outcome: ${outcomePayload.settlementOutcome}`);
          } catch(e) {
             console.warn("[VIXY_VAULT_LEARNING] Error persisting learning outcome:", e);
          }
          // --- END VIXY VAULT CLOUD LEARNING ENGINE ---
"""

new_text = re.sub(search_str, replacement, text)

if text == new_text:
    print("Failed to replace!")
else:
    with open("backend.ts", "w") as f:
        f.write(new_text)
    print("Successfully patched backend.ts for VIXY VAULT learning storage.")
