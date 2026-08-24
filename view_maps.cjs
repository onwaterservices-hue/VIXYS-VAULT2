const fs = require('fs');
const store = JSON.parse(fs.readFileSync('data/vixy_store.json', 'utf8'));

console.log("=== SUBSCRIPTIONS KEYS ===");
if (store.subscriptions) {
  console.log(Object.keys(store.subscriptions).length, "subscriptions found");
  console.log(Object.keys(store.subscriptions).slice(0, 3));
  console.log(JSON.stringify(store.subscriptions[Object.keys(store.subscriptions)[0]], null, 2));
}

console.log("\n=== DAY PASSES KEYS ===");
if (store.dayPasses) {
  console.log(Object.keys(store.dayPasses).length, "day passes found");
  console.log(Object.keys(store.dayPasses).slice(0, 3));
  console.log(JSON.stringify(store.dayPasses[Object.keys(store.dayPasses)[0]], null, 2));
}
