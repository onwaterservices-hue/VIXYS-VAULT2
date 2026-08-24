const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const searchStr1 = `          status: active15mCycle.isLocked ? (active15mCycle.isCriticallyInvalidated ? 'CRITICALLY_INVALIDATED' : 'LOCKED') : 'ANALYZING',`;
const replaceStr1 = `          status: active15mCycle.stage,`;

code = code.replace(searchStr1, replaceStr1);

fs.writeFileSync('backend.ts', code);
