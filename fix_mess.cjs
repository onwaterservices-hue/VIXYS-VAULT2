const fs = require('fs');
let content = fs.readFileSync('backend.ts', 'utf8');

const startStr = "d.passwordHash.startsWith('vixy";
const endStr = "      || allDocs.find(d => d.passwordHash && typeof d.passwordHash === 'string' && d.passwordHash !== 'AuthManaged2026!' && d.passwordHash.length > 0);";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex + startStr.length);
  // Note: we must escape the dollar sign in the source code so we don't cause the same issue in the repair script itself! Actually we are just concatenating strings so it's fine.
  const replacement = "$'))\n" + endStr;
  const after = content.substring(endIndex + endStr.length);
  
  fs.writeFileSync('backend.ts', before + replacement + after);
  console.log('Fixed the duplicated block successfully.');
} else {
  console.log('Could not find boundaries.');
}
