const fs = require('fs');
let code = fs.readFileSync('src/components/HistoricalAccuracy.tsx', 'utf8');
console.log(code.substring(code.indexOf('const metrics = useMemo'), code.indexOf('const assetMatrix = useMemo')));
