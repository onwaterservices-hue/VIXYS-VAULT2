const fs = require('fs');

let code = fs.readFileSync('extracted.txt', 'utf8');

// Strip __name
code = code.replace(/__name\(loadPersistentStore,\s*"loadPersistentStore"\);\n/g, '');

const paramString = `{
  fs, STORE_FILE_PATH, db, disableNetwork,
  serverUsers, userDiscordProfiles, userSubscriptions, userDayPasses,
  persistentSignalLogs, persistentTelemetryObservations,
  firestoreRetryAtMs, firestoreRetryAt, firestoreBackoffMs,
  lastFirestoreWriteError, persistenceState, firestoreNetworkDisabled,
  discordSyncQueue, discordSyncMetrics, latestCalibrationState,
  serverLearningEngine, productionMaintenanceState
}`;

code = code.replace('function loadPersistentStore() {', `export function loadPersistentStore(${paramString}) {`);

const returnStatement = `
  return {
    firestoreRetryAtMs, firestoreRetryAt, firestoreBackoffMs,
    lastFirestoreWriteError, persistenceState, firestoreNetworkDisabled,
    discordSyncMetrics, latestCalibrationState, productionMaintenanceState
  };
`;
// Insert return statement at the end of loadPersistentStore
code = code.replace(/}\s*async function loadPersistentStoreAsync/, `${returnStatement}}\n\nasync function loadPersistentStoreAsync`);

const asyncParamString = `{
  db, canAttemptFirestoreWrite, getDocs, collection, setDoc, doc,
  serverUsers, sanitizeAndNormalizeServerUsers, userSubscriptions,
  userDayPasses, userDiscordProfiles
}`;

code = code.replace('async function loadPersistentStoreAsync() {', `export async function loadPersistentStoreAsync(${asyncParamString}) {`);

fs.writeFileSync('src/services/persistentStoreLoaders.ts', code);
console.log("Transformed extracted code");
