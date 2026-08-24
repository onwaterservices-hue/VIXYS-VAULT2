const fs = require('fs');
const store = JSON.parse(fs.readFileSync('data/vixy_store.json', 'utf8'));

console.log(`Current Day Pass keys in DB: ${store.dayPasses ? Object.keys(store.dayPasses).length : 0}`);
console.log(`Current Subscription keys in DB: ${store.subscriptions ? Object.keys(store.subscriptions).length : 0}`);
