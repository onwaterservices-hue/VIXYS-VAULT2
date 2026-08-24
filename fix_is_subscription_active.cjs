const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "userRole === 'PRO' ||\n    userRole === 'ADMIN' ||",
  "userRole === 'PRO' ||\n    userRole === 'ELITE' ||\n    userRole === 'ADMIN' ||"
);

fs.writeFileSync('src/App.tsx', code);
