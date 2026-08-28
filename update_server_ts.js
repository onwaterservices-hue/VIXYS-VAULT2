const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add autoTradingEnabled to productionMaintenanceState
if (!content.includes('autoTradingEnabled: true')) {
  content = content.replace(
    'startedAt: null,',
    'startedAt: null,\n  autoTradingEnabled: true,'
  );
}

// 2. Call reconcilePendingExecutions inside loadPersistentStore or after db init
// Let's import reconcilePendingExecutions at the top
if (!content.includes('reconcilePendingExecutions')) {
  content = content.replace(
    'executeAutoTradesForSignal,',
    'executeAutoTradesForSignal,\n  reconcilePendingExecutions,'
  );
}

// And call reconcilePendingExecutions where db is available. Let's do it right after loadPersistentStoreAsyncExt or anywhere db is initialized.
// Wait, the best place is inside loadPersistentStore after we do the assignments.
const hydrateTarget = 'latestCalibrationState = result.latestCalibrationState;\\n    productionMaintenanceState = result.productionMaintenanceState;\\n  }';
if (content.includes('latestCalibrationState = result.latestCalibrationState;')) {
  // It's there. Let's see if we can insert it.
  content = content.replace(
    /latestCalibrationState = result\.latestCalibrationState;\s*productionMaintenanceState = result\.productionMaintenanceState;\s*\}/,
    \`latestCalibrationState = result.latestCalibrationState;
    productionMaintenanceState = result.productionMaintenanceState;
  }
  
  // Reconcile pending Kalshi executions
  if (db) {
    reconcilePendingExecutions(db).catch(err => console.error("Reconciliation error:", err));
  }\`
  );
}


// 3. Update executeAutoTradesForSignal call
const targetCall = \`executeAutoTradesForSignal(logItem, db).catch((err) =>
      console.error("[Kalshi Execution Error]:", err),
    );\`;
const newCall = \`
    const globalAutoTradingEnabled = productionMaintenanceState.autoTradingEnabled !== false;
    const checkEntitlement = async (userId) => {
      const u = serverUsers.find((user) => (user.email || "").toLowerCase() === userId);
      return isEliteOrAdmin(u);
    };

    executeAutoTradesForSignal(logItem, db, globalAutoTradingEnabled, checkEntitlement).catch((err) =>
      console.error("[Kalshi Execution Error]:", err),
    );\`;

if (content.includes(targetCall)) {
  content = content.replace(targetCall, newCall);
}

fs.writeFileSync('server.ts', content, 'utf8');
