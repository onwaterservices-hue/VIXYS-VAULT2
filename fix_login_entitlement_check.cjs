const fs = require('fs');
let content = fs.readFileSync('backend.ts', 'utf8');

const target = `  if (!hasPasswordHash) {
    return res.status(400).json({ 
      success: false, 
      error: 'ACCOUNT_NEEDS_PASSWORD', 
      message: 'Account found. Please set a password to continue.' 
    });
  }`;

const replace = `  if (!hasPasswordHash) {
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

content = content.replace(target, replace);
fs.writeFileSync('backend.ts', content);
