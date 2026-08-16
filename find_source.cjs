const fs = require('fs');
const map = JSON.parse(fs.readFileSync('dist/server.cjs.map', 'utf8'));
const match = map.sources.find(s => s.includes('backend.ts'));
console.log('Match:', match);
if (match) {
    const idx = map.sources.indexOf(match);
    fs.writeFileSync('backend.ts.recovered', map.sourcesContent[idx]);
}
