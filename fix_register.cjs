const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf-8');

const registerOriginal = `app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'EMAIL_AND_PASSWORD_REQUIRED', message: 'Email and password are required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const existing = serverUsers.find(u => u.email?.toLowerCase() === cleanEmail);
  
  if (existing) {
    return res.status(400).json({ success: false, error: 'USER_EXISTS', message: 'Account already exists. Please sign in.' });
  }
  
  const newUser = {
    id: \`usr_\${Date.now().toString().slice(-4)}\`,
    email: cleanEmail,
    name: name?.trim() || cleanEmail.split('@')[0],
    passwordHash: password, // In production this should be hashed
    role: cleanEmail === 'vixyvault0@gmail.com' ? 'OWNER' : 'USER',
    subscription: cleanEmail === 'vixyvault0@gmail.com' ? 'ELITE_PASS' : 'NONE',
    joined: new Date().toISOString()
  };
  serverUsers.unshift(newUser as any);`;

const registerNew = `app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'EMAIL_AND_PASSWORD_REQUIRED', message: 'Email and password are required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const existing = serverUsers.find(u => u.email?.toLowerCase() === cleanEmail);
  
  if (existing) {
    return res.status(400).json({ success: false, error: 'USER_EXISTS', message: 'Account already exists. Please sign in.' });
  }
  
  const newUser = {
    id: \`usr_\${Date.now().toString().slice(-4)}\`,
    email: cleanEmail,
    name: name?.trim() || cleanEmail.split('@')[0],
    passwordHash: password,
    role: 'USER',
    subscription: 'NONE',
    joined: new Date().toISOString()
  };
  serverUsers.unshift(newUser as any);

  try {
    const entitlement = await reconcileUserEntitlement({ email: cleanEmail, userId: newUser.id });
    if (cleanEmail === 'vixyvault0@gmail.com' || entitlement.entitlements.canAccessAdminPanel) {
      newUser.role = 'OWNER';
      newUser.subscription = 'ELITE_PASS';
    } else if (entitlement.entitlements.proQuant || entitlement.entitlements.eliteQuant || entitlement.dayPass.active) {
      newUser.role = 'PRO';
      newUser.subscription = entitlement.plan === 'NONE' ? 'DAY_PASS' : entitlement.plan;
    }
  } catch(e) {
    console.warn("Failed to reconcile user entitlements on register", e);
  }`;

code = code.replace(registerOriginal, registerNew);
fs.writeFileSync('backend.ts', code);
