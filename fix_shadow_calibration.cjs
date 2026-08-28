const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetLines = `          prevLog.outcome = prevLog.wasCorrect ? "WIN" : "LOSS";
          serverLearningEngine.todaySettledCount += 1;
          serverLearningEngine.lifetimeObservations += 1;`;

const replacementLines = `          prevLog.outcome = prevLog.wasCorrect ? "WIN" : "LOSS";
          serverLearningEngine.todaySettledCount += 1;
          serverLearningEngine.lifetimeObservations += 1;

          // --- SHADOW CALIBRATION ---
          // Calibration ONLY observes the settled outcome. It MUST NOT modify the live decision.
          try {
            const rawProb = prevLog.probability || (prevLog.confidence / 100);
            const regime = serverLearningEngine.currentRegime || "TRENDING_BULL";
            let regimeFactor = 1.0;
            if (regime === 'TRENDING_BEAR' && prevLog.direction === 'DOWN') regimeFactor = 1.04;
            else if (regime === 'TRENDING_BULL' && prevLog.direction === 'UP') regimeFactor = 1.04;
            else if (regime === 'CHOPPY' || regime === 'CHOP') regimeFactor = 0.88;
            
            const baseCalibrated = 0.5 + (rawProb - 0.5) * 0.88 * regimeFactor;
            const calibratedProbability = Math.min(0.92, Math.max(0.08, Math.round(baseCalibrated * 1000) / 1000));
            const adjustmentPct = Math.round((calibratedProbability - rawProb) * 1000) / 10;
            
            prevLog.shadowCalibration = {
              predictedProbability: rawProb,
              calibratedProbability,
              confidenceBucket: prevLog.confidence >= 90 ? "90-100" : (prevLog.confidence >= 80 ? "80-90" : "70-80"),
              calibrationError: Math.round(Math.abs(calibratedProbability - (prevLog.wasCorrect ? 1 : 0)) * 1000) / 1000,
              adjustmentPct,
              sampleSize: serverLearningEngine.lifetimeObservations,
              regime
            };
          } catch (e) {
            console.error("[SHADOW_CALIBRATION] Failed to attach shadow calibration:", e);
          }
          // --- END SHADOW CALIBRATION ---`;

if (content.includes(targetLines)) {
    content = content.replace(targetLines, replacementLines);
    fs.writeFileSync('server.ts', content);
    console.log("Fixed shadow calibration logic.");
} else {
    console.log("Could not find target lines for shadow calibration.");
}
