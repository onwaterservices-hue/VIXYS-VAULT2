const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

if (!content.includes('autoTradingEnabled: true')) {
  content = content.replace(
    'startedAt: null,',
    'startedAt: null,\n  autoTradingEnabled: true,'
  );
}

if (!content.includes('reconcilePendingExecutions')) {
  content = content.replace(
    'executeAutoTradesForSignal,',
    'executeAutoTradesForSignal,\n  reconcilePendingExecutions,'
  );
}

const pattern = /latestCalibrationState = result\.latestCalibrationState;\s*productionMaintenanceState = result\.productionMaintenanceState;\s*\}/;
if (pattern.test(content) && !content.includes('reconcilePendingExecutions(db)')) {
  content = content.replace(
    pattern,
    `latestCalibrationState = result.latestCalibrationState;
    productionMaintenanceState = result.productionMaintenanceState;
  }
  
  if (db) {
    reconcilePendingExecutions(db).catch(err => console.error("Reconciliation error:", err));
  }`
  );
}

const targetCall = `executeAutoTradesForSignal(logItem, db).catch((err) =>
      console.error("[Kalshi Execution Error]:", err),
    );`;
const newCall = `const globalAutoTradingEnabled = productionMaintenanceState.autoTradingEnabled !== false;
    const checkEntitlement = async (userId) => {
      const u = serverUsers.find((user) => (user.email || "").toLowerCase() === userId);
      return isEliteOrAdmin(u);
    };

    executeAutoTradesForSignal(logItem, db, globalAutoTradingEnabled, checkEntitlement).catch((err) =>
      console.error("[Kalshi Execution Error]:", err),
    );`;

if (content.includes(targetCall)) {
  content = content.replace(targetCall, newCall);
} else {
    // maybe it has slightly different formatting. Let's use regex
    const re = /executeAutoTradesForSignal\(logItem,\s*db\)\.catch\(\s*\(err\)\s*=>\s*console\.error\("\[Kalshi Execution Error\]:",\s*err\),\s*\);/m;
    if (re.test(content)) {
        content = content.replace(re, newCall);
    } else {
        console.log("Could not find executeAutoTradesForSignal call to replace!");
    }
}

fs.writeFileSync('server.ts', content, 'utf8');
console.log("server.ts updated");
