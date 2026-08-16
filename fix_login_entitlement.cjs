const fs = require('fs');

let content = fs.readFileSync('backend.ts', 'utf8');

const loginEnd = `  console.log(\`[AUTH LOGIN SUCCESS] email=\${cleanEmail} userId=\${user.id || user.uid}\`);
  res.json({
    success: true,
    user
  });`;

const newLoginEnd = `  console.log(\`[AUTH LOGIN SUCCESS] email=\${cleanEmail} userId=\${user.id || user.uid}\`);
  
  const serverSession = { ...user, passwordHash: undefined };
  const entitlement = getUserEntitlement(cleanEmail);
  
  res.json({
    success: true,
    user: serverSession,
    entitlement
  });`;

content = content.replace(loginEnd, newLoginEnd);
fs.writeFileSync('backend.ts', content);
console.log('Login route fixed to include entitlement!');
