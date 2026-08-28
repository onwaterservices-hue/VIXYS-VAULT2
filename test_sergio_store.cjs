const fs = require('fs');
const store = JSON.parse(fs.readFileSync('/tmp/vixy_store.json', 'utf8'));
const sergioUsers = store.users.filter(u => u.email === 'sergioaddiaz1711@icloud.com');
console.log("Users:", sergioUsers);
console.log("Sub:", store.subscriptions['sergioaddiaz1711@icloud.com']);
