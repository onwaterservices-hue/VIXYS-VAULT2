const fs = require('fs');

function fixAuth(filepath) {
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');

  // Update error handling in handleSubmit
  const target = `        if (res?.error === 'USER_EXISTS' && mode === 'register') {
           setErrorMsg('Account already exists. Sign in instead.');
           return;
        }
        if (res?.error === 'INVALID_CREDENTIALS') {
           setErrorMsg('Invalid email or password.');
           return;
        }`;

  const replace = `        if (res?.error === 'ACCOUNT_NEEDS_PASSWORD') {
           setMode('register');
           setSuccessMsg('ACCOUNT FOUND: Set a password to finish setup and access your existing entitlement.');
           return;
        }
        if (res?.error === 'USER_EXISTS' && mode === 'register') {
           setErrorMsg('Account already exists. Sign in instead.');
           return;
        }
        if (res?.error === 'INVALID_CREDENTIALS') {
           setErrorMsg('Invalid email or password.');
           return;
        }`;

  content = content.replace(target, replace);
  
  // To avoid overlapping successMsg/errorMsg visual bugs, we should clear errorMsg when setting successMsg, and vice versa. 
  // We already do `setErrorMsg('')` at the start of handleSubmit.

  fs.writeFileSync(filepath, content);
}

fixAuth('src/components/AuthView.tsx');
fixAuth('src/components/AuthModal.tsx');
