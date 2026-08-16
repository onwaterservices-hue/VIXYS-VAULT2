const fs = require('fs');
const code = fs.readFileSync('backend.ts', 'utf8');
const i = code.indexOf('let matchedUser = serverUsers.find(');
console.log(code.substring(i, i + 800));
