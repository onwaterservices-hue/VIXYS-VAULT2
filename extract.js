const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');

const startIndex = content.indexOf('function loadPersistentStore() {');
const endIndex = content.indexOf('async function startServer() {');

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const extractedCode = content.substring(startIndex, endIndex);
fs.writeFileSync('extracted.txt', extractedCode);
console.log("Extracted code to extracted.txt");
