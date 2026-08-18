const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/tmp/tsx-0/17870-4d26ee7f229e4139dd205fca09c0ae9ac43dd930', 'utf8'));
if (data.map) {
  const map = data.map;
  if (map.sourcesContent && map.sourcesContent.length > 0) {
    fs.writeFileSync('backend.ts.recovered', map.sourcesContent[0]);
    console.log('Recovered original source code from map!');
  } else {
    fs.writeFileSync('backend.ts.recovered', data.code);
    console.log('No sourcesContent found, wrote transpiled code.');
  }
} else {
  fs.writeFileSync('backend.ts.recovered', data.code);
  console.log('No map found, wrote transpiled code.');
}
