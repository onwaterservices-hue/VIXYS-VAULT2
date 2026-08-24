import re

with open("backend.ts", "r") as f:
    code = f.read()

route = """
app.get('/api/admin/reconcile-day-passes', async (req, res) => {
  try {
    let eligibleCount = 0;
    let graceAppliedCount = 0;
    let alreadyGraceCount = 0;
    let matchedCount = 0;
    
    const uniquePasses = new Map<string, DayPassRecord>();
    userDayPasses.forEach((dp) => {
      if (dp.email) uniquePasses.set(dp.email.toLowerCase(), dp);
    });

    const results: any[] = [];

    for (const [email, dp] of uniquePasses.entries()) {
      if (dp.entitlementId === 'dp_test_001') continue; // Ignore tests

      eligibleCount++;
      const userMatched = serverUsers.find(u => u.email?.toLowerCase() === email || u.id === dp.userId || u.uid === dp.userId);
      if (userMatched) matchedCount++;

      if (dp.troubleshootingGraceApplied) {
        alreadyGraceCount++;
        results.push({ email, status: 'ALREADY_GRACED', expiresAt: dp.expiresAt });
      } else {
        const expMs = new Date(dp.expiresAt).getTime();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const newExp = new Date(expMs + threeDaysMs);
        
        dp.expiresAt = newExp.toISOString();
        dp.troubleshootingGraceApplied = true;
        dp.troubleshootingGraceAppliedAt = new Date().toISOString();
        
        if (dp.status === 'EXPIRED' && newExp.getTime() > Date.now()) {
          dp.status = 'ACTIVE';
        }

        userDayPasses.set(email, dp);
        if (dp.userId) userDayPasses.set(dp.userId, dp);

        if (db) {
          await setDoc(doc(db, 'day_passes', email), dp, { merge: true });
          if (dp.userId) {
            await setDoc(doc(db, 'day_passes', dp.userId), dp, { merge: true });
          }
        }
        
        graceAppliedCount++;
        results.push({ email, status: 'GRACE_APPLIED', newExpiresAt: dp.expiresAt });
      }
    }
    
    savePersistentStore();

    res.json({
      success: true,
      eligibleCount,
      matchedCount,
      alreadyGraceCount,
      graceAppliedCount,
      results
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
"""

target = "app.post('/api/auth/register'"
if "app.get('/api/admin/reconcile-day-passes'" not in code:
    code = code.replace(target, route + "\n" + target)
    with open("backend.ts", "w") as f:
        f.write(code)
