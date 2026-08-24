const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

// Find the line with `wssGlobal = new WebSocketServer({ server, path: '/api/ws' });`
const wssIndex = code.indexOf("wssGlobal = new WebSocketServer({ server, path: '/api/ws' });");
console.log("Found wssGlobal instantiation at index: " + wssIndex);
