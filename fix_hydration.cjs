const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetFunction = `  if (result) {
    firestoreRetryAtMs = result.firestoreRetryAtMs;
    firestoreRetryAt = result.firestoreRetryAt;
    firestoreBackoffMs = result.firestoreBackoffMs;
    lastFirestoreWriteError = result.lastFirestoreWriteError;
    persistenceState = result.persistenceState;
    firestoreNetworkDisabled = result.firestoreNetworkDisabled;
    discordSyncMetrics = result.discordSyncMetrics;
    latestCalibrationState = result.latestCalibrationState;
    productionMaintenanceState = result.productionMaintenanceState;
  }
}
__name(loadPersistentStore, "loadPersistentStore");`;

const replacement = `  if (result) {
    firestoreRetryAtMs = result.firestoreRetryAtMs;
    firestoreRetryAt = result.firestoreRetryAt;
    firestoreBackoffMs = result.firestoreBackoffMs;
    lastFirestoreWriteError = result.lastFirestoreWriteError;
    persistenceState = result.persistenceState;
    firestoreNetworkDisabled = result.firestoreNetworkDisabled;
    discordSyncMetrics = result.discordSyncMetrics;
    latestCalibrationState = result.latestCalibrationState;
    productionMaintenanceState = result.productionMaintenanceState;
  }

  // --- VIXY LOCK STATE HYDRATION ---
  // Safely reconstruct the minimum required active15mCycle state on startup
  // from the most recent persistent signal log to prevent data loss across restarts.
  if (persistentSignalLogs.length > 0) {
    const mostRecentLog = persistentSignalLogs[0];
    if (mostRecentLog && mostRecentLog.status === "LOCKED") {
      const logExpires = new Date(mostRecentLog.expiresAt || 0).getTime();
      const now = Date.now();
      // Only hydrate if it's a valid, currently active lock
      if (logExpires > now && !active15mCycle.isLocked) {
        console.log(\`[VIXY_LOCK_HYDRATION] Reconstructing active15mCycle from persisted log: \${mostRecentLog.id}\`);
        active15mCycle.isLocked = true;
        active15mCycle.status = "LOCKED";
        active15mCycle.stage = "LOCKED";
        active15mCycle.lockedDirection = mostRecentLog.direction || "NEUTRAL";
        active15mCycle.lockedDecision = mostRecentLog.decision || (mostRecentLog.direction === "UP" ? "BUY UP" : "BUY DOWN");
        active15mCycle.lockedConfidence = mostRecentLog.confidence || 75;
        active15mCycle.lockedProbability = mostRecentLog.probability || 0.5;
        active15mCycle.lockedStrike = mostRecentLog.targetStrike || 0;
        active15mCycle.lockedSpot = mostRecentLog.spotAtLock || 0;
        active15mCycle.lockedAt = mostRecentLog.lockedAt || new Date().toISOString();
        active15mCycle.lockedReason = "HYDRATED_FROM_PERSISTENT_STORE";
        active15mCycle.intervalStart = new Date(mostRecentLog.intervalStart).getTime();
        active15mCycle.intervalEnd = new Date(mostRecentLog.intervalEnd).getTime();
        active15mCycle.cycleId = mostRecentLog.cycleId || \`15M-\${mostRecentLog.intervalStart}\`;
        
        lockedCycleIds.add(active15mCycle.cycleId);
        current15mIntervalStart = active15mCycle.intervalStart;
      }
    }
  }
}
__name(loadPersistentStore, "loadPersistentStore");`;

if (content.includes(targetFunction)) {
    content = content.replace(targetFunction, replacement);
    fs.writeFileSync('server.ts', content);
    console.log("Fixed loadPersistentStore hydration.");
} else {
    console.log("Could not find target function for hydration.");
}
