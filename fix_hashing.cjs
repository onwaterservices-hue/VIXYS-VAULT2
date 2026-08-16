const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf-8');

const hashMethods = `
// --- SECURE PASSWORD HASHING ---
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

// Insert after import crypto from 'crypto';
code = code.replace(/import crypto from 'crypto';/, "import crypto from 'crypto';\n" + hashMethods);

// Login verification update
code = code.replace(
  "if ((!user.passwordHash || user.passwordHash === 'AuthManaged2026!') && password !== 'Seattle007') {\n    user.passwordHash = password;\n    if (typeof canAttemptFirestoreWrite === 'function' && canAttemptFirestoreWrite('users')) {\n      ensureFirestoreNetworkEnabled().then(() => {\n        setDoc(doc(db, 'users', user.id || user.uid), { passwordHash: password }, { merge: true }).catch(e => console.warn('Failed to update passwordHash', e));\n      }).catch(e => {});\n    }\n  }",
  `if ((!user.passwordHash || user.passwordHash === 'AuthManaged2026!') && password !== 'Seattle007') {
    const hashed = hashPassword(password);
    user.passwordHash = hashed;
    if (typeof canAttemptFirestoreWrite === 'function' && canAttemptFirestoreWrite('users')) {
      ensureFirestoreNetworkEnabled().then(() => {
        setDoc(doc(db, 'users', user.id || user.uid), { passwordHash: hashed }, { merge: true }).catch(e => console.warn('Failed to update passwordHash', e));
      }).catch(e => {});
    }
  } else if (user.passwordHash && !user.passwordHash.startsWith('vixy$') && user.passwordHash === password) {
    // Migrate plaintext to hash on login
    const hashed = hashPassword(password);
    user.passwordHash = hashed;
    if (typeof canAttemptFirestoreWrite === 'function' && canAttemptFirestoreWrite('users')) {
      ensureFirestoreNetworkEnabled().then(() => {
        setDoc(doc(db, 'users', user.id || user.uid), { passwordHash: hashed }, { merge: true }).catch(e => {});
      }).catch(e => {});
    }
  }`
);

code = code.replace(
  /if \(user\.passwordHash !== password && password !== 'Seattle007'\) \{/g,
  `if (!verifyPassword(password, user.passwordHash) && password !== 'Seattle007') {`
);

// Register update
code = code.replace(
  "passwordHash: password, // In production this should be hashed",
  "passwordHash: hashPassword(password),"
);

// Admin create user update
code = code.replace(
  "passwordHash: password || 'DefaultPass2026!',",
  "passwordHash: password ? hashPassword(password) : hashPassword('DefaultPass2026!'),"
);

// Fallback users update (optional, but good)
code = code.replace(
  "passwordHash: newPassword,",
  "passwordHash: hashPassword(newPassword),"
);

fs.writeFileSync('backend.ts', code);
