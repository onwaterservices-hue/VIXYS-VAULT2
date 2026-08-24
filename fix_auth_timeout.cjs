const fs = require('fs');

function addTimeout(filepath) {
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');

  // Find the try block start
  const target = `    try {
      let res;`;
  
  const replace = `    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      let res;`;

  content = content.replace(target, replace);
  
  const targetFetchReg = `const fetchRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password, name: userName })
        });`;
        
  const replaceFetchReg = `const fetchRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password, name: userName }),
          signal: controller.signal
        });`;

  content = content.replace(targetFetchReg, replaceFetchReg);

  const targetFetchLogin = `const fetchRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password })
        });`;
        
  const replaceFetchLogin = `const fetchRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password }),
          signal: controller.signal
        });`;

  content = content.replace(targetFetchLogin, replaceFetchLogin);

  const targetEnd = `      } else {
        const fetchRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password }),
          signal: controller.signal
        });
        res = await fetchRes.json();
      }`;
      
  const replaceEnd = `      } else {
        const fetchRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password }),
          signal: controller.signal
        });
        res = await fetchRes.json();
      }
      clearTimeout(timeoutId);`;

  content = content.replace(targetEnd, replaceEnd);
  
  const targetCatch = `    } catch (err) {
      setLoading(false);
      setErrorMsg('Network error. Please check your connection and try again.');
    }`;
    
  const replaceCatch = `    } catch (err: any) {
      setLoading(false);
      if (err.name === 'AbortError') {
        setErrorMsg('Request timed out. Please try again.');
      } else {
        setErrorMsg('Network error. Please check your connection and try again.');
      }
    }`;
    
  content = content.replace(targetCatch, replaceCatch);

  fs.writeFileSync(filepath, content);
}

addTimeout('src/components/AuthView.tsx');
addTimeout('src/components/AuthModal.tsx');
