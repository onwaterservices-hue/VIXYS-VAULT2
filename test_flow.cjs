const http = require('http');

function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({status: res.statusCode, body}));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  const email = 'test_user_' + Date.now() + '@example.com';
  const password = 'TestPassword123!';
  
  console.log('Registering...');
  const regRes = await makeRequest('/api/auth/register', {email, password, name: 'Test User'});
  console.log('Register Response:', regRes.status, regRes.body);
  
  console.log('Logging in...');
  const loginRes = await makeRequest('/api/auth/login', {email, password});
  console.log('Login Response:', loginRes.status, loginRes.body);
}

run();
