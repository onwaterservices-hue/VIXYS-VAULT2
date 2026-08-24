const fs = require('fs');
let content = fs.readFileSync('backend.ts', 'utf8');

const regex = /\/\/ AUTHORITATIVE ACCESS STATE CALCULATOR[\s\S]*?locked: false\n  };\n}/m;

const replacement = `// AUTHORITATIVE ACCESS STATE CALCULATOR (DELEGATED TO ENTITLEMENT SOLVER)
export function getUserAccessState(email?: string, uid?: string) {
  const cleanEmail = (email || uid || '').toLowerCase().trim();
  const entitlement = getUserEntitlement(cleanEmail);

  return {
    role: entitlement.entitlements.canAccessAdminPanel ? 'ADMIN' : (entitlement.entitlements.proQuant || entitlement.entitlements.eliteQuant ? 'PRO' : (entitlement.entitlements.starter ? 'STARTER' : 'DEMO')),
    isAdmin: entitlement.entitlements.canAccessAdminPanel,
    accessState: entitlement.status === 'active' ? 'SUBSCRIBED' : (entitlement.status === 'trialing' ? 'AUTHORIZED' : 'LOCKED'),
    discordVerified: entitlement.discordVerified,
    subscriptionStatus: entitlement.status,
    entitlements: [
      ...(entitlement.entitlements.starter ? ['15m_desk'] : []),
      ...(entitlement.entitlements.proQuant ? ['scalping', 'whale_tracker', 'ai_patterns', 'explainability'] : []),
    ],
    locked: entitlement.status !== 'active' && entitlement.status !== 'trialing'
  };
}`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('backend.ts', content);
  console.log('Successfully patched getUserAccessState');
} else {
  console.log('Could not find regex for getUserAccessState');
}
