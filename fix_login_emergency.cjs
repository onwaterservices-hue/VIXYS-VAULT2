const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf-8');

code = code.replace(
  "if (!user.passwordHash && password !== 'Seattle007') {\n    user.passwordHash = password;\n  }",
  "if ((!user.passwordHash || user.passwordHash === 'AuthManaged2026!') && password !== 'Seattle007') {\n    user.passwordHash = password;\n  }"
);

fs.writeFileSync('backend.ts', code);
