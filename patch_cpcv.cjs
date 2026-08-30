const fs = require('fs');
let content = fs.readFileSync('src/components/CryptoPredictionCenterView.tsx', 'utf8');

content = content.replace(
  `const secondsRemaining = canonicalDecision?.timeRemainingSec ?? (900 - (Math.floor(nowMs / 1000) % 900));`,
  `const secondsRemaining = cycleSecondsRemaining;`
);

content = content.replace(
  `const secondsRemaining = canonicalDecision?.timeRemainingSec ?? (900 - (Math.floor(nowMs / 1000) % 900));`,
  `const secondsRemaining = cycleSecondsRemaining;`
);

fs.writeFileSync('src/components/CryptoPredictionCenterView.tsx', content, 'utf8');
console.log("Patched src/components/CryptoPredictionCenterView.tsx successfully");
