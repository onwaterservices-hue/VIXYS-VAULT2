const fs = require('fs');
const store = JSON.parse(fs.readFileSync('data/vixy_store.json', 'utf8'));
const users = store.users || [];

let totalUsers = users.length;
let emptyEmail = 0;
let withPassword = 0;
let passwordless = 0;
let activeDayPass = 0;
let activeSubs = 0;
let adminUsers = 0;

for (const u of users) {
  const email = (u.email || '').trim().toLowerCase();
  if (!email) emptyEmail++;

  const hasPwd = !!(u.passwordHash && typeof u.passwordHash === 'string' && u.passwordHash !== 'AuthManaged2026!' && u.passwordHash.length > 0);
  if (hasPwd) withPassword++;
  else passwordless++;

  if (u.role === 'ADMIN' || u.isAdmin === true || email === 'vixyvault0@gmail.com') adminUsers++;
  
  if (u.subscription === 'PRO' || u.subscription === 'ELITE' || u.subscription === 'PRO_PASS' || u.subscription === 'ACTIVE') {
      activeSubs++;
  } else if (store.subscriptions) {
      // Check if they have a subscription record
      const subs = Array.isArray(store.subscriptions) ? store.subscriptions : Object.values(store.subscriptions);
      if (subs.some(sub => sub.email === email && sub.status === 'ACTIVE')) {
          activeSubs++;
      }
  }

  // Check day pass
  let hasActiveDayPass = false;
  if (u.dayPass && typeof u.dayPass === 'object') {
      if (u.dayPass.status === 'ACTIVE' || (u.dayPass.expiresAt && new Date(u.dayPass.expiresAt) > Date.now())) {
          hasActiveDayPass = true;
      }
  }
  if (!hasActiveDayPass && store.dayPasses) {
      const dps = Array.isArray(store.dayPasses) ? store.dayPasses : Object.values(store.dayPasses);
      if (dps.some(dp => dp.email === email && (dp.status === 'ACTIVE' || (dp.expiresAt && new Date(dp.expiresAt) > Date.now())))) {
          hasActiveDayPass = true;
      }
  }
  if (hasActiveDayPass) activeDayPass++;
}

console.log("=== ACCURATE ENTITLEMENT AUDIT ===");
console.log(`TOTAL CANONICAL USERS: ${totalUsers}`);
console.log(`EMPTY EMAIL RECORDS: ${emptyEmail}`);
console.log(`USERS WITH VALID PASSWORD HASH: ${withPassword}`);
console.log(`PASSWORDLESS USERS: ${passwordless}`);
console.log(`ACTIVE DAY PASS USERS: ${activeDayPass}`);
console.log(`ACTIVE SUBSCRIPTIONS: ${activeSubs}`);
console.log(`ADMIN USERS: ${adminUsers}`);
