const fs = require('fs');
let backend = fs.readFileSync('backend.ts', 'utf8');

backend = backend.replace(
  "  if (existing) {\n\n\n    return res.status(400).json({\n      success: false,\n      error: 'USER_EXISTS',\n      needsPassword: !hasPasswordHash,\n      message: hasPasswordHash ? 'Account already exists. Sign in instead.' : 'Set a password to finish your VIXY VAULT account setup.'\n    });\n  }",
  `  if (existing) {
    const hasPasswordHash = !!(existing.passwordHash && typeof existing.passwordHash === 'string' && existing.passwordHash !== 'AuthManaged2026!' && existing.passwordHash.length > 0);
    return res.status(400).json({
      success: false,
      error: 'USER_EXISTS',
      needsPassword: !hasPasswordHash,
      message: hasPasswordHash ? 'Account already exists. Sign in instead.' : 'Set a password to finish your VIXY VAULT account setup.'
    });
  }`
);

fs.writeFileSync('backend.ts', backend);
console.log('Fixed register reference error.');
