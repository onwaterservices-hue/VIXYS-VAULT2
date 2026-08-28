const fs = require('fs');
const data = JSON.parse(fs.readFileSync('forensic_audit_32.json', 'utf8'));
console.log("Total entries in forensic report:", data.length);

const safeAuto = data.filter(d => d.action === 'SAFE AUTO-RECOVERY');
const manualReview = data.filter(d => d.action.includes('MANUAL REVIEW'));
const doNotTouch = data.filter(d => d.action.includes('DO NOT TOUCH'));
const alreadyRecovered = data.filter(d => d.action.includes('RECOVERED'));

console.log("SAFE AUTO-RECOVERY:", safeAuto.length);
console.log("MANUAL REVIEW:", manualReview.length);
console.log("DO NOT TOUCH:", doNotTouch.length);
console.log("ALREADY RECOVERED:", alreadyRecovered.length);

console.log("\n--- Breakdown of all 36 items ---");
data.forEach((d, i) => {
  console.log(`${i+1}. Email: ${d.stripeEmail.padEnd(30)} | Sub: ${d.stripeSubId} | VIXY User: ${d.hasVixyUser ? d.vixyLoginEmail : 'NONE'} | Action: ${d.action}`);
});
