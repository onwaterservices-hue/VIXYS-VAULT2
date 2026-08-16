const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf-8');

code = code.replace(
  "if ((!user.passwordHash || user.passwordHash === 'AuthManaged2026!') && password !== 'Seattle007') {\n    user.passwordHash = password;\n  }",
  "if ((!user.passwordHash || user.passwordHash === 'AuthManaged2026!') && password !== 'Seattle007') {\n    user.passwordHash = password;\n    if (typeof canAttemptFirestoreWrite === 'function' && canAttemptFirestoreWrite('users')) {\n      ensureFirestoreNetworkEnabled().then(() => {\n        setDoc(doc(db, 'users', user.id || user.uid), { passwordHash: password }, { merge: true }).catch(e => console.warn('Failed to update passwordHash', e));\n      }).catch(e => {});\n    }\n  }"
);

fs.writeFileSync('backend.ts', code);
