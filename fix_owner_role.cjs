const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "userRole === 'ADMIN' ||",
  "userRole === 'ADMIN' || userRole === 'OWNER' ||"
);

content = content.replace(
  "role === 'PRO' || role === 'ADMIN'",
  "role === 'PRO' || role === 'ADMIN' || role === 'OWNER' || role === 'ELITE'"
);

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx updated for OWNER role');
