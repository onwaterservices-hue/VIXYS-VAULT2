const fs = require('fs');
const store = JSON.parse(fs.readFileSync('data/vixy_store.json', 'utf8'));

// 1. Subscriptions
let activeSubs = 0;
const subsMap = store.subscriptions || {};
const uniqueSubs = new Set();
for (const [k, v] of Object.entries(subsMap)) {
    if ((v.plan === 'ELITE_PASS' || v.plan === 'PRO_PASS' || v.status === 'ACTIVE') && v.plan !== 'NONE') {
        if (!uniqueSubs.has(v.email)) {
            uniqueSubs.add(v.email);
            activeSubs++;
        }
    }
}

// 2. Day Passes
let activeDayPasses = 0;
const dpMap = store.dayPasses || {};
const uniqueDp = new Set();
for (const [k, v] of Object.entries(dpMap)) {
    if (v.status === 'ACTIVE' || (v.expiresAt && new Date(v.expiresAt).getTime() > Date.now())) {
        const identifier = v.stripeCheckoutSessionId || v.email || k;
        if (!uniqueDp.has(identifier)) {
            uniqueDp.add(identifier);
            activeDayPasses++;
        }
    }
}

// 3. Admins
let admins = 0;
if (store.users) {
    for (const u of store.users) {
        if (u.role === 'ADMIN' || u.role === 'OWNER' || u.email === 'vixyvault0@gmail.com') {
            admins++;
        }
    }
}

console.log(`ACTIVE DAY PASSES: ${activeDayPasses}`);
console.log(`ACTIVE SUBSCRIPTIONS: ${activeSubs}`);
console.log(`ADMINS: ${admins}`);
