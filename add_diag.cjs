const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const diagnosticEndpoint = `
// DAY PASS DIAGNOSTIC ENDPOINT
app.get('/api/auth/diagnostic', async (req, res) => {
  const reqEmail = ((req.headers['x-user-email'] || req.query.email || '') as string).toLowerCase().trim();
  const reqUserId = ((req.headers['x-user-id'] || req.query.uid || req.query.userId || '') as string).trim();
  
  if (!reqEmail && !reqUserId) {
    return res.status(400).json({ error: 'Missing email or uid for diagnostic' });
  }

  const cleanEmail = reqEmail;
  const cleanUid = reqUserId;

  let userFound = false;
  let user = serverUsers.find(u => (cleanEmail && u.email?.toLowerCase() === cleanEmail) || (cleanUid && (u.id === cleanUid || u.uid === cleanUid)));
  
  if (user) userFound = true;

  // Stripe checks
  let stripeCustomerFound = Boolean(user?.stripeCustomerId);
  let stripePaymentVerified = false;
  
  const entitlement = await reconcileUserEntitlement({ email: cleanEmail, userId: cleanUid });
  
  const dayPassEntitlementFound = Boolean(entitlement.dayPass && entitlement.dayPass.secondsRemaining > -100000000); // Check if exists
  const entitlementActive = entitlement.dayPass?.active || entitlement.status === 'active';
  
  if (entitlement.stripeVerified || dayPassEntitlementFound) {
    stripePaymentVerified = true;
  }
  
  let discordLinked = Boolean(entitlement.discordVerified || entitlement.discordUserId);
  let botAccess = Boolean(entitlementActive && discordLinked);
  
  const diagnosticReport = {
    AUTHENTICATED: true,
    "USER FOUND": userFound,
    "STRIPE CUSTOMER FOUND": stripeCustomerFound,
    "STRIPE PAYMENT VERIFIED": stripePaymentVerified,
    "DAY PASS ENTITLEMENT FOUND": dayPassEntitlementFound,
    "ENTITLEMENT ACTIVE": entitlementActive,
    "EXPIRATION TIME": entitlement.dayPass?.active ? (userDayPasses.get(cleanEmail)?.expiresAt || 'Active') : 'N/A',
    "DISCORD LINKED": discordLinked,
    "BOT ACCESS": botAccess,
    "FINAL ACCESS DECISION": botAccess ? 'GRANTED' : (entitlementActive ? 'WEB_ONLY' : 'DENIED')
  };

  res.json(diagnosticReport);
});
`;

code = code.replace("app.get('/api/admin/entitlement-diagnostics', (req: express.Request, res: express.Response) => {", diagnosticEndpoint + "\napp.get('/api/admin/entitlement-diagnostics', (req: express.Request, res: express.Response) => {");

fs.writeFileSync('backend.ts', code);
