const fs = require('fs');
const store = JSON.parse(fs.readFileSync('data/vixy_store.json', 'utf8'));

console.log("=== STORE KEYS ===");
console.log(Object.keys(store));

console.log("\n=== USERS SCHEMA SAMPLE (first 2) ===");
console.log(JSON.stringify(store.users.slice(0, 2), null, 2));

if (store.dayPasses) {
  console.log(`\n=== DAY PASSES: ${store.dayPasses.length} ===`);
  console.log(JSON.stringify(store.dayPasses.slice(0, 1), null, 2));
}

if (store.subscriptions) {
  console.log(`\n=== SUBSCRIPTIONS: ${store.subscriptions.length} ===`);
  console.log(JSON.stringify(store.subscriptions.slice(0, 1), null, 2));
}

