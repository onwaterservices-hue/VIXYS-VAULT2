const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');
const startIndex = content.indexOf('function loadPersistentStore() {');
const endIndex = content.indexOf('async function startServer() {');

const replacement = `
import { loadPersistentStore as loadPersistentStoreExt, loadPersistentStoreAsync as loadPersistentStoreAsyncExt } from "./src/services/persistentStoreLoaders";

function loadPersistentStore() {
  const result = loadPersistentStoreExt({
    fs, STORE_FILE_PATH, db, disableNetwork,
    serverUsers, userDiscordProfiles, userSubscriptions, userDayPasses,
    persistentSignalLogs, persistentTelemetryObservations,
    firestoreRetryAtMs, firestoreRetryAt, firestoreBackoffMs,
    lastFirestoreWriteError, persistenceState, firestoreNetworkDisabled,
    discordSyncQueue, discordSyncMetrics, latestCalibrationState,
    serverLearningEngine, productionMaintenanceState
  });
  if (result) {
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
__name(loadPersistentStore, "loadPersistentStore");

async function loadPersistentStoreAsync() {
  return loadPersistentStoreAsyncExt({
    db, canAttemptFirestoreWrite, getDocs, collection, setDoc, doc,
    serverUsers, sanitizeAndNormalizeServerUsers, userSubscriptions,
    userDayPasses, userDiscordProfiles
  });
}
__name(loadPersistentStoreAsync, "loadPersistentStoreAsync");

`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('server.ts', newContent);
console.log("Replaced definitions in server.ts");
