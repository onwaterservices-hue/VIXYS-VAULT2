const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/function startServer\(\) \{/, 'async function startServer() {');
code = code.replace(/const vite = require\("vite"\);/, 'const vite = await import("vite");');
code = code.replace(/vite\.createServer/, 'vite.createServer');

fs.writeFileSync('server.ts', code);
