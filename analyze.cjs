const fs = require('fs');
const data = JSON.parse(fs.readFileSync('dump.json', 'utf8'));

let withPassword = 0;
let withDayPass = 0;
let withManualExtension = 0;
let withSubscription = 0;
let withOldFreeTrial = 0;
let ownerRecord = null;

const users = data.users;
users.forEach(u => {
  const email = u.email?.toLowerCase();
  if (email === 'vixyvault0@gmail.com') ownerRecord = u;
  
  if (u.passwordHash && u.passwordHash.length > 0) withPassword++;
  if (u.dayPassActive) withDayPass++;
  if (u.subscription && u.subscription !== 'NONE') withSubscription++;
  if (u.freeTrial || u.trial || u.trialActive || u.freeTrialActive) withOldFreeTrial++;
  if (u.manualExtension || u.trialExtension || u.dayPassExtended || u.goodwillExtension) withManualExtension++;
});

// the `dayPasses` map from the backend might hold the actual daypass entities
let totalDayPassEntries = data.dayPasses.length;
let manualExtensionsInDayPasses = data.dayPasses.filter(dp => dp[1].type === 'GOODWILL' || dp[1].extended || dp[1].metadata?.extension).length;

console.log("=== STEP 1 REPORT ===");
console.log("Total hydrated users:", users.length);
console.log("Users with password:", withPassword);
console.log("Users with active subscription:", withSubscription);
console.log("Users with old free trial flags:", withOldFreeTrial);
console.log("Total day passes in cache:", totalDayPassEntries);
console.log("Manual extensions found in users:", withManualExtension);
console.log("Manual extensions found in dayPasses:", manualExtensionsInDayPasses);
console.log("OWNER Record:", JSON.stringify(ownerRecord, null, 2));

// check some daypasses to see how the 3-day extension was implemented
if (data.dayPasses.length > 0) {
  console.log("Sample day pass:", JSON.stringify(data.dayPasses[0][1], null, 2));
}

