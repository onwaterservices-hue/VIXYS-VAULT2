const fs = require('fs');

const file = 'backend.ts';
let code = fs.readFileSync(file, 'utf8');

const targetList = `const CONFIRMED_PASSWORDLESS_CUSTOMERS = [
  "abe.carrillo987@gmail.com",
  "ajhuns07@gmail.com",
  "albertt2700@gmail.com",
  "alexescobar7503@gmail.com",
  "dm2664817@gmail.com",
  "ludinvelasquez47@gmail.com",
  "ragnarks1996@gmail.com",
  "xavierrosales503@icloud.com",
  "nathan.velasquez29@icloud.com",
  "jeremygarr30@gmail.com",
  "trelll2008@icloud.com",
  "gifyzslide@gmail.com",
  "dhdh@gmail.com"
];`;

const originalCheck = `  if (!hasPasswordHash) {
    const entitlement = getUserEntitlement(cleanEmail);
    const hasActiveEntitlement = entitlement.plan !== 'NONE' || entitlement.dayPass?.active;
    
    if (hasActiveEntitlement) {
      return res.status(400).json({ 
        success: false, 
        error: 'ACCOUNT_NEEDS_PASSWORD', 
        message: 'Account found. Please set a password to continue.' 
      });
    } else {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }
  }`;

const newCheck = `  if (!hasPasswordHash) {
    ${targetList}
    if (CONFIRMED_PASSWORDLESS_CUSTOMERS.includes(cleanEmail)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ACCOUNT_NEEDS_PASSWORD', 
        message: 'Account found. Please set a password to continue.' 
      });
    } else {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }
  }`;

if (code.includes(originalCheck)) {
  code = code.replace(originalCheck, newCheck);
  fs.writeFileSync(file, code);
  console.log("Updated backend.ts login logic successfully.");
} else {
  console.log("Could not find the original check block in backend.ts.");
}
