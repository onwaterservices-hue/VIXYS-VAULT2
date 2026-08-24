const fs = require('fs');
let content = fs.readFileSync('backend.ts', 'utf8');

const target1 = `  const reason = isQuotaError ? 'RESOURCE_EXHAUSTED' : rawMsg;
  if (isQuotaError) {
    firestoreQuotaFailureCount += 1;
  }

  // Open circuit breaker with exponential backoff
  firestoreRetryAtMs = Date.now() + firestoreBackoffMs;
  firestoreRetryAt = new Date(firestoreRetryAtMs).toISOString();
  lastFirestoreWriteError = reason;
  persistenceState = db ? 'DEGRADED_LOCAL_FALLBACK' : 'LOCAL_DISK_ONLY';`;

const replace1 = `  const reason = isQuotaError ? 'RESOURCE_EXHAUSTED' : rawMsg;
  if (isQuotaError) {
    firestoreQuotaFailureCount += 1;
  }

  // Open circuit breaker with exponential backoff
  firestoreRetryAtMs = Date.now() + firestoreBackoffMs;
  firestoreRetryAt = new Date(firestoreRetryAtMs).toISOString();
  lastFirestoreWriteError = reason;
  
  if (isQuotaError) {
    persistenceState = serverUsers.length > 0 ? 'DEGRADED_CACHE_ACTIVE' : 'RESOURCE_EXHAUSTED';
  } else {
    persistenceState = db ? 'DEGRADED_LOCAL_FALLBACK' : 'LOCAL_DISK_ONLY';
  }`;

content = content.replace(target1, replace1);

// Also replace health check reporting if necessary
content = content.replace(/persistenceState === 'HEALTHY_FIRESTORE' \? 'HEALTHY' : persistenceState/g, "persistenceState === 'HEALTHY_FIRESTORE' ? 'HEALTHY' : (persistenceState === 'DEGRADED_CACHE_ACTIVE' ? 'DEGRADED_CACHE_ACTIVE' : persistenceState)");

fs.writeFileSync('backend.ts', content);
