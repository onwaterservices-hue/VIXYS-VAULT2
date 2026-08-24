const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

// Find the wss.on('connection') and replace the broken object literal.
// We look for:
/*
        const snapshot = buildVixySnapshot();
        //           type: 'VIXY_SNAPSHOT',
          sessionId: SERVER_SESSION_ID,
          ...
          serverTime: new Date().toISOString()
        };
*/
const brokenStart = "        const snapshot = buildVixySnapshot();\\n        //           type: 'VIXY_SNAPSHOT',";
// Actually, it's safer to use regex to replace everything from `const snapshot = buildVixySnapshot();` to the end of the object block, which is `ws.send(JSON.stringify(snapshot));`

code = code.replace(/const snapshot = buildVixySnapshot\(\);[\s\S]*?ws\.send\(JSON\.stringify\(snapshot\)\);/, 
  "const snapshot = buildVixySnapshot();\n        ws.send(JSON.stringify(snapshot));"
);

// We also need to fix `wss.clients` to `wssGlobal.clients`
code = code.replace(/wss\.clients/g, "wssGlobal.clients");
// And wss.on to wssGlobal.on
code = code.replace(/wss\.on/g, "wssGlobal.on");
// And wssGlobalGlobal to wssGlobal just in case
code = code.replace(/wssGlobalGlobal/g, "wssGlobal");

fs.writeFileSync('backend.ts', code);
console.log('Fixed backend.ts syntax!');
