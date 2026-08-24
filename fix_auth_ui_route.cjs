const fs = require('fs');

['src/components/AuthModal.tsx', 'src/components/AuthView.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  const target = `        if (res?.error === 'USER_EXISTS' && mode === 'register') {
           setErrorMsg('Account already exists. Sign in instead.');
           return;
        }`;
        
  const replacement = `        if (res?.error === 'USER_EXISTS' && mode === 'register') {
           setMode('login');
           setErrorMsg('Account already exists. Sign in instead.');
           return;
        }`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log(`Updated routing in ${file}`);
  }
});
