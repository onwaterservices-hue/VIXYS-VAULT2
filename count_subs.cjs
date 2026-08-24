const fs = require('fs');
const store = JSON.parse(fs.readFileSync('data/vixy_store.json', 'utf8'));

const subsMap = store.subscriptions || {};
let active = 0;
for (const [k, v] of Object.entries(subsMap)) {
    if (v.status === 'ACTIVE' || v.plan !== 'NONE') {
        active++;
    }
}
console.log(active);
