const fs = require('fs');
const map = JSON.parse(fs.readFileSync('dist/server.cjs.map', 'utf8'));
const index = map.sources.indexOf('backend.ts');
if (index !== -1) {
    fs.writeFileSync('backend.ts.recovered', map.sourcesContent[index]);
    console.log('Recovered backend.ts successfully!');
} else {
    console.log('Could not find backend.ts in source map');
}
