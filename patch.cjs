const fs = require('fs');
let c = fs.readFileSync('backend.ts', 'utf8');
c = c.replace('app.post("/api/admin/strip-pwd", async (req, res) => {', 
`app.post("/api/admin/give-day-pass", async (req, res) => {
  const email = req.body.email.toLowerCase();
  const userId = req.body.userId;
  const nowMs = Date.now();
  const dayPassId = "dp_" + nowMs;
  const dp = {
    entitlementId: dayPassId,
    email,
    userId,
    status: "ACTIVE",
    plan: "ELITE_QUANT",
    startedAt: new Date().toISOString(),
    expiresAt: new Date(nowMs + 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };
  userDayPasses.set(email, dp);
  if (userId) userDayPasses.set(userId, dp);
  if (db) {
    setDoc(doc(db, "day_passes", email), dp, {merge:true}).catch(()=>{});
    if (userId) setDoc(doc(db, "day_passes", userId), dp, {merge:true}).catch(()=>{});
  }
  savePersistentStore();
  return res.json({success: true, dp});
});

app.post("/api/admin/strip-pwd", async (req, res) => {`);
fs.writeFileSync('backend.ts', c);
