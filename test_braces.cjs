const fs = require('fs');
const map = JSON.parse(fs.readFileSync('dist/server.cjs.map', 'utf8'));
const match = map.sources.find(s => s.includes('backend.ts'));
const idx = map.sources.indexOf(match);
const content = map.sourcesContent[idx].split('\n');
console.log(content.slice(4180, 4200).join('\n'));
