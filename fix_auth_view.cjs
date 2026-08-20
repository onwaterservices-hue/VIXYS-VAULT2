const fs = require('fs');
let code = fs.readFileSync('src/components/AuthView.tsx', 'utf-8');

code = code.replace(
  "role: assignedRole,",
  "role: serverUser?.role || assignedRole,"
);

code = code.replace(
  "setUserRole(assignedRole);",
  "setUserRole(serverUser?.role || assignedRole);"
);

fs.writeFileSync('src/components/AuthView.tsx', code);
