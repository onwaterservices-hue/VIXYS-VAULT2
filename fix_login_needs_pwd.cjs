const fs = require('fs');

let content = fs.readFileSync('backend.ts', 'utf8');

const regex = /if \(\!hasPasswordHash\) \{\n\s*return res\.status\(401\)\.json\(\{ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password\.' \}\);\n\s*\}/;

const newBlock = `if (!hasPasswordHash) {
    return res.status(400).json({ 
      success: false, 
      error: 'ACCOUNT_NEEDS_PASSWORD', 
      message: 'Account found. Please set a password to continue.' 
    });
  }`;

content = content.replace(regex, newBlock);
fs.writeFileSync('backend.ts', content);
console.log('Login modified to return ACCOUNT_NEEDS_PASSWORD');
