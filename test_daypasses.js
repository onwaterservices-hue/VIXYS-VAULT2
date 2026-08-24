const fs = require('fs');
const store = JSON.parse(fs.readFileSync('store.json', 'utf8'));
const dayPasses = store.dayPasses || {};
console.log("Total day passes in store:", Object.keys(dayPasses).length);
const aug15 = Object.values(dayPasses).filter(dp => dp.startedAt && dp.startedAt.startsWith('2026-08-15'));
console.log("Aug 15 day passes:", aug15.length);
