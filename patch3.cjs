const fs = require('fs');
let code = fs.readFileSync('src/components/HistoricalAccuracy.tsx', 'utf8');

if (!code.includes('last10WinRate,')) {
    code = code.replace(/return {/m, 'return {\n      last10WinRate,');
    fs.writeFileSync('src/components/HistoricalAccuracy.tsx', code);
    console.log("Patched last10WinRate into return object");
} else {
    console.log("last10WinRate already in return object");
}
