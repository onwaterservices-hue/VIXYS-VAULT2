const http = require('http');

const req1 = http.get('http://localhost:3000/api/vixy/state', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("STATE:", data);
  });
});
req1.on('error', (e) => { console.error(`Problem with request: ${e.message}`); });

const req2 = http.get('http://localhost:3000/api/vixy/15m/current', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("CURRENT:", data);
  });
});
req2.on('error', (e) => { console.error(`Problem with request: ${e.message}`); });
