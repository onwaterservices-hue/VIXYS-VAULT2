const fs = require('fs');
const data = JSON.parse(fs.readFileSync('final_strict_audit_36.json', 'utf8'));

const safe = data.filter(d => d.recAction === 'SAFE AUTO-RECOVERY');
const manual = data.filter(d => d.recAction.startsWith('MANUAL REVIEW'));
const doNotTouch = data.filter(d => d.recAction.startsWith('DO NOT TOUCH'));
const alreadyRecovered = data.filter(d => d.recAction.startsWith('RECOVERED'));

console.log("Total Subscriptions in Stripe:", data.length);
console.log("Already Recovered (Harvey & Sergio):", alreadyRecovered.length);
console.log("Remaining Orphaned Active Stripe Subscriptions:", data.length - alreadyRecovered.length);
console.log("SAFE AUTO-RECOVERY Count:", safe.length);
console.log("MANUAL REVIEW Count:", manual.length);
console.log("DO NOT TOUCH Count:", doNotTouch.length);

console.log("\n--- SAFE AUTO-RECOVERY ---");
safe.forEach(s => console.log(`- ${s.stripeEmail} | ${s.stripeSubId} | User: ${s.vixyUserId}`));

console.log("\n--- DO NOT TOUCH ---");
doNotTouch.forEach(s => console.log(`- ${s.stripeEmail} | ${s.stripeSubId} | ${s.recAction}`));

console.log("\n--- MANUAL REVIEW ---");
manual.forEach(s => console.log(`- ${s.stripeEmail} | ${s.stripeSubId} | ${s.recAction}`));
