const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/tmp/tsx-0/17870-4d26ee7f229e4139dd205fca09c0ae9ac43dd930', 'utf8'));
fs.writeFileSync('backend.ts.recovered', data.code);
console.log('Wrote transpiled code to backend.ts.recovered');
