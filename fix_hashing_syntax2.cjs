const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf-8');

const badCode = `// --- SECURE PASSWORD HASHING ---
function hashPassword(password) {
  if (!password) return password;
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return 'vixyimport { initializeApp } from 'firebase/app';`;

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
import { initializeApp } from 'firebase/app';`;

code = code.replace(badCode, goodCode);

fs.writeFileSync('backend.ts', code);
