const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const bad = "const dayPassEntitlementFound = Boolean(entitlement.dayPass && entitlement.dayPass.secondsRemaining > -100000000); // Check if exists";
const good = "const dayPassEntitlementFound = Boolean(entitlement.dayPass && (entitlement.dayPass.active || userDayPasses.has(cleanEmail) || userDayPasses.has(cleanUid)));";

code = code.replace(bad, good);
fs.writeFileSync('backend.ts', code);
