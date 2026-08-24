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

const origRegBlock = `    // If they already have a password, they should just sign in
    if (hasPasswordHash) {
      return res.status(400).json({
        success: false,
        error: 'USER_EXISTS',
        message: 'Account already exists. Sign in instead.'
      });
    } else {
      // They are a passwordless customer (e.g. from an existing Day Pass/Subscription record)
      // Attach the new password to their existing canonical record safely.
      const hashed = hashPassword(password);
      existing.passwordHash = hashed;`;

const newRegBlock = `    // If they already have a password OR they are not in the confirmed list, they should sign in
    ${targetList}
    if (hasPasswordHash || !CONFIRMED_PASSWORDLESS_CUSTOMERS.includes(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'USER_EXISTS',
        message: 'Account already exists. Sign in instead.'
      });
    } else {
      // They are a passwordless customer (e.g. from an existing Day Pass/Subscription record)
      // Attach the new password to their existing canonical record safely.
      const hashed = hashPassword(password);
      existing.passwordHash = hashed;`;

if (code.includes(origRegBlock)) {
  code = code.replace(origRegBlock, newRegBlock);
  fs.writeFileSync(file, code);
  console.log("Updated backend.ts register logic successfully.");
} else {
  console.log("Could not find the original check block in backend.ts.");
}
