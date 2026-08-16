const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf-8');

code = code.replace(
  "// Fallback for migrated accounts without a password hash\n  if ((!user.passwordHash || user.passwordHash === 'AuthManaged2026!') && password !== 'Seattle007') {\n    user.passwordHash = password;\n  }",
  "// Fallback for migrated accounts without a password hash\n  console.log('Login attempt:', cleanEmail, 'hash:', user.passwordHash, 'pw:', password);\n  if ((!user.passwordHash || user.passwordHash === 'AuthManaged2026!') && password !== 'Seattle007') {\n    user.passwordHash = password;\n  }"
);

fs.writeFileSync('backend.ts', code);
