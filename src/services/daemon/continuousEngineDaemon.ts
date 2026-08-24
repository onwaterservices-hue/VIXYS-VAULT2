/**
 * VIXY Continuous Execution Daemon (Option B: Dedicated Always-On Worker)
 * 
 * Runs an autonomous 24/7 background loop independent of web traffic:
 * - Ingests real-time Binance BTC market ticks every 3-5 seconds
 * - Runs Gemini Continuous Shadow Engine inference
 * - Computes Bayesian calibrated probabilities & temporal memory
 * - Enforces VIXY Protection Engine rules
 * - Persists 15-minute epoch cycles & locks directly to Firestore
 * - Auto-settles expired contracts and updates accuracy ledger
 */

import { executeBoundedEngineTick } from '../engine/boundedEngineTick';

const TICK_INTERVAL_MS = 5000; // 5-second sampling loop

console.log('================================================================');
console.log('⚡ VIXY VAULT — CONTINUOUS EXECUTION DAEMON (24/7 AUTONOMOUS)');
console.log(`⚡ Loop Frequency: ${TICK_INTERVAL_MS / 1000}s | Independent of Web Traffic`);
console.log('================================================================');

let totalTicksExecuted = 0;
let consecutiveErrors = 0;

async function runDaemonLoop() {
  while (true) {
    try {
      totalTicksExecuted++;
      const result = await executeBoundedEngineTick();
      consecutiveErrors = 0;

      if (totalTicksExecuted % 12 === 0 || result.settledPreviousCycle) {
        console.log(`[DAEMON-TICK #${totalTicksExecuted}] ${result.timestamp} | BTC: $${result.marketData.spotPrice} | P(UP): ${(result.geminiShadow.upProbability * 100).toFixed(1)}% | LockScore: ${result.protectionDecision.lockScore} | State: ${result.protectionDecision.state} | Firestore: ${result.persistedToFirestore ? 'SYNCED ✓' : 'OFFLINE ⚠️'}`);
      }
    } catch (err: any) {
      consecutiveErrors++;
      console.error(`[DAEMON-ERROR #${consecutiveErrors}]`, err.message || err);
      if (consecutiveErrors > 10) {
        console.warn('[DAEMON-WARNING] High consecutive errors; backing off 15s...');
        await new Promise(r => setTimeout(r, 15000));
      }
    }

    await new Promise(resolve => setTimeout(resolve, TICK_INTERVAL_MS));
  }
}

// Start the daemon loop
runDaemonLoop();
