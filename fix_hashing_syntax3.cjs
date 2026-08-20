const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf-8');

const startStr = "// --- SECURE PASSWORD HASHING ---";
const endStr = "import { initializeApp } from 'firebase/app';";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const goodCode = `// --- SECURE PASSWORD HASHING ---
function hashPassword(password) {
  if (!password) return password;
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return 'vixy$' + salt + ':' + derivedKey;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (!storedHash.startsWith('vixy$')) {
    // Legacy plaintext fallback
    return password === storedHash;
  }
  try {
    const withoutPrefix = storedHash.slice(5);
    const [salt, key] = withoutPrefix.split(':');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return key === derivedKey;
  } catch(e) {
    return false;
  }
}
// -------------------------------
`;
  
  code = code.slice(0, startIdx) + goodCode + code.slice(endIdx);
  fs.writeFileSync('backend.ts', code);
} else {
  console.log('Could not find boundaries');
}
