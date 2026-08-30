const fs = require('fs');
let content = fs.readFileSync('src/hooks/useCanonical15mDecision.ts', 'utf8');

content = content.replace(
  `const calculatedSec = Math.max(0, Math.floor((dynamicDecision.cycleEnd - nowMs) / 1000));`,
  `const endMs = typeof dynamicDecision.cycleEnd === 'string' ? new Date(dynamicDecision.cycleEnd).getTime() : dynamicDecision.cycleEnd;\n    const calculatedSec = Math.max(0, Math.floor((endMs - nowMs) / 1000));`
);

fs.writeFileSync('src/hooks/useCanonical15mDecision.ts', content, 'utf8');
console.log("Patched src/hooks/useCanonical15mDecision.ts successfully (fix ISO string)");
