const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf-8');

const loginEndpointOriginal = `app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'CREDENTIALS_REQUIRED', message: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = serverUsers.find(u => u.email?.toLowerCase() === cleanEmail);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  }

  // Fallback for migrated accounts without a password hash
  if (!user.passwordHash && password !== 'Seattle007') {
    user.passwordHash = password;
  }

  if (user.passwordHash !== password && password !== 'Seattle007') {
    return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  }
  
  res.json({
    success: true,
    user
  });
});`;

const loginEndpointNew = `app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'CREDENTIALS_REQUIRED', message: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = serverUsers.find(u => u.email?.toLowerCase() === cleanEmail);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  }

  if (!user.passwordHash && password !== 'Seattle007') {
    user.passwordHash = password;
  }

  if (user.passwordHash !== password && password !== 'Seattle007') {
    return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  }
  
  // Enforce authoritative entitlement sync
  const entitlement = await reconcileUserEntitlement({ email: cleanEmail, userId: user.id || user.uid });
  const finalRole = entitlement.entitlements.canAccessAdminPanel ? 'ADMIN' : (entitlement.entitlements.proQuant || entitlement.entitlements.eliteQuant || entitlement.dayPass.active ? 'PRO' : 'UNPAID');
  
  // Update user in-memory before returning
  user.role = finalRole as any;
  user.subscription = entitlement.plan as any;
  
  res.json({
    success: true,
    user: {
      ...user,
      role: finalRole
    }
  });
});`;

code = code.replace(loginEndpointOriginal, loginEndpointNew);
fs.writeFileSync('backend.ts', code);
