const http = require('http');
const fetch = require('node-fetch'); // wait node-fetch might not be installed, we can use built-in fetch if node >= 18

async function run() {
  console.log("Registering user ogershey@gmail.com...");
  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Smoke Test', email: 'ogershey@gmail.com', password: '1234' })
  });
  const data = await res.json();
  console.log("Register result:", data);
  if (!data.success && data.error !== 'USER_EXISTS') {
    return;
  }
}
run();
