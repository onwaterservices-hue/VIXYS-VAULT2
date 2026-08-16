import re

with open("backend.ts", "r") as f:
    code = f.read()

bad = """
  // TROUBLESHOOTING GRACE LOGIC
  if (dayPassRecord && !dayPassRecord.troubleshootingGraceApplied) {
    try {
      const expMs = new Date(dayPassRecord.expiresAt).getTime();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      const newExp = new Date(expMs + threeDaysMs);
      
      dayPassRecord.expiresAt = newExp.toISOString();
      dayPassRecord.troubleshootingGraceApplied = true;
      dayPassRecord.troubleshootingGraceAppliedAt = new Date().toISOString();
      
      if (dayPassRecord.status === 'EXPIRED' && newExp.getTime() > Date.now()) {
        dayPassRecord.status = 'ACTIVE';
      }
      
      console.log(`[GRACE APPLIED] Added 3 days to Day Pass for ${dayPassRecord.email}. New exp: ${dayPassRecord.expiresAt}`);
      if (typeof canAttemptFirestoreWrite === 'function' && canAttemptFirestoreWrite('day_passes')) {
        ensureFirestoreNetworkEnabled().then(() => {
          if (db) {
            setDoc(doc(db, 'day_passes', dayPassRecord.email.toLowerCase()), dayPassRecord, { merge: true }).catch(() => {});
            if (dayPassRecord.userId) {
              setDoc(doc(db, 'day_passes', dayPassRecord.userId), dayPassRecord, { merge: true }).catch(() => {});
            }
          }
        }).catch(e => {});
      }
    } catch(e) {
      console.warn("Failed to apply grace", e);
    }
  }
"""

if bad in code:
    code = code.replace(bad, "")
    with open("backend.ts", "w") as f:
        f.write(code)
    print("Replaced successfully")
else:
    print("Could not find the block")
