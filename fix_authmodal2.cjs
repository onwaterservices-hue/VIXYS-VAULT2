const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf-8');

code = code.replace(
  "const finalRole: 'ADMIN' | 'UNPAID' | 'PRO' = isAdminEmail ? 'ADMIN' : (canonicalUser.role === 'PRO' || canonicalUser.role === 'ELITE' || canonicalUser.role === 'ADMIN' || hasActiveEntitlement) ? 'PRO' : 'UNPAID';",
  "const finalRole = isAdminEmail ? 'ADMIN' : (canonicalUser.role === 'ADMIN' ? 'ADMIN' : ((canonicalUser.role === 'PRO' || canonicalUser.role === 'ELITE' || hasActiveEntitlement) ? 'PRO' : 'UNPAID'));"
);

fs.writeFileSync('src/components/AuthModal.tsx', code);
