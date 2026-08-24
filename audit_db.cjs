const fs = require('fs');
const store = JSON.parse(fs.readFileSync('data/vixy_store.json', 'utf8'));
const users = store.users || [];

let totalUsers = users.length;
let emptyEmail = 0;
let validEmails = new Set();
let duplicates = new Set();
let withPassword = 0;
let passwordless = 0;
let activeDayPass = 0;
let activeSubs = 0;
let adminUsers = 0;

for (const u of users) {
  const email = (u.email || '').trim().toLowerCase();
  if (!email) {
    emptyEmail++;
  } else {
    if (validEmails.has(email)) duplicates.add(email);
    validEmails.add(email);
  }

  const hasPwd = !!(u.passwordHash && typeof u.passwordHash === 'string' && u.passwordHash !== 'AuthManaged2026!' && u.passwordHash.length > 0);
  if (hasPwd) withPassword++;
  else passwordless++;

  if (u.role === 'ADMIN') adminUsers++;
  if (u.subscription === 'PRO' || u.subscription === 'ELITE') activeSubs++;
  if (u.dayPassActive || u.dayPassExpiration > Date.now()) activeDayPass++;
}

console.log("=== DATABASE AUDIT REPORT ===");
console.log(`TOTAL CANONICAL USERS: ${totalUsers}`);
console.log(`UNIQUE NON-EMPTY EMAILS: ${validEmails.size}`);
console.log(`EMPTY EMAIL RECORDS: ${emptyEmail}`);
console.log(`DUPLICATE EMAILS: ${duplicates.size}`);
if (duplicates.size > 0) console.log(`Duplicate emails list:`, Array.from(duplicates));
console.log(`USERS WITH VALID PASSWORD HASH: ${withPassword}`);
console.log(`PASSWORDLESS USERS: ${passwordless}`);
console.log(`ACTIVE DAY PASS USERS: ${activeDayPass}`);
console.log(`ACTIVE SUBSCRIPTIONS: ${activeSubs}`);
console.log(`ADMIN USERS: ${adminUsers}`);
console.log(`duplicate canonical users = ${duplicates.size}`);
