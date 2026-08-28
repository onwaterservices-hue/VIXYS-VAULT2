const fs = require('fs');
const rep = JSON.parse(fs.readFileSync('reconcile_report.json', 'utf8'));
console.log("Entries in reconcile_report.json:", rep.length);
rep.forEach((r, idx) => {
  console.log(`${idx+1}. ${r.email} | ${r.stripeCustId} | ${r.stripeSubId} | status: ${r.stripeStatus} | appPlan: ${r.appPlan}`);
});
