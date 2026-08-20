const fs = require('fs');
const data = JSON.parse(fs.readFileSync('dump.json', 'utf8'));

const users = data.users;
let withPassword = 0;
let withoutPassword = [];
let AuthManaged2026 = 0;

users.forEach(u => {
  const pwd = u.passwordHash;
  if (!pwd || pwd.length === 0) {
    withoutPassword.push({ email: u.email, reason: 'empty or missing' });
  } else if (pwd === 'AuthManaged2026!') {
    AuthManaged2026++;
    withoutPassword.push({ email: u.email, reason: 'AuthManaged2026!' });
  } else {
    withPassword++;
  }
});

console.log(`Total: ${users.length}`);
console.log(`With real password: ${withPassword}`);
console.log(`With AuthManaged2026!: ${AuthManaged2026}`);
console.log(`Missing password completely: ${withoutPassword.length - AuthManaged2026}`);
console.log("\nAccounts without a real user-set password:");
withoutPassword.forEach(u => console.log(`${u.email} -> ${u.reason}`));

