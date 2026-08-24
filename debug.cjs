const http = require('http');
const req = http.request('http://localhost:3000/api/auth/login', {
  method: 'POST', headers: {'Content-Type': 'application/json'}
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', JSON.stringify(JSON.parse(body), null, 2)));
});
req.write(JSON.stringify({email: 'fakeuser123@example.com', password: 'randompassword'}));
req.end();
