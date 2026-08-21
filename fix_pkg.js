const fs = require('fs');
let pkg = fs.readFileSync('package.tmp.json', 'utf8');
const p = JSON.parse(pkg);
p.scripts.build = "vite build && esbuild backend.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs";
fs.writeFileSync('package.json', JSON.stringify(p, null, 2));
