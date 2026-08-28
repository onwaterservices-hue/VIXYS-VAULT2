const fs = require('fs');
const file = './server.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'res.json({ size: docs.size, data: docs.docs.map(d => ({id: d.id, conf: d.data().credentials?.configured})) });',
  'res.json({ size: docs.size, data: docs.docs.map(d => ({id: d.id, data: d.data()})) });'
);
fs.writeFileSync(file, code);
console.log("Patched server 2!");
