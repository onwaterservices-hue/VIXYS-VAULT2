const fs = require('fs');
let content = fs.readFileSync('backend.ts', 'utf8');

const target1 = `const moneynessBonus=isITM?.1:distFromStrikeAbs<5?0:candidateDir==="UP"?.04:-.04;const rawDirectionalBias=candidateDir==="NEUTRAL"?0:(candidateDir==="UP"?1:-1)*(agreementBonus+moneynessBonus);const baseProb=.5+rawDirectionalBias;const boundedProb=Math.min(.96,Math.max(.05,Math.round(baseProb*1e3)/1e3));const historicalAcc=serverLearningEngine.historicalAccuracy||71.8;const calibratedModelProb=Math.min(.96,Math.max(.05,Math.round((boundedProb*.85+historicalAcc/100*.15)*1e3)/1e3));`;

const replacement1 = `const moneynessBonus=isITM?.1:distFromStrikeAbs<5?0:.04;const convictionMagnitude=Math.max(0,0.10+agreementBonus+moneynessBonus);const rawDirectionalBias=candidateDir==="NEUTRAL"?0:(candidateDir==="UP"?1:-1)*convictionMagnitude;const baseProb=.5+rawDirectionalBias;const boundedProb=Math.min(.96,Math.max(.05,Math.round(baseProb*1e3)/1e3));const historicalAcc=serverLearningEngine.historicalAccuracy||71.8;const edgeFromNeutral=boundedProb-0.5;const accuracyMultiplier=0.85+(historicalAcc/100*0.15);const calibratedModelProb=Math.min(.96,Math.max(.05,Math.round((0.5+edgeFromNeutral*accuracyMultiplier)*1e3)/1e3));`;

if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    fs.writeFileSync('backend.ts', content, 'utf8');
    console.log("Math Patched successfully");
} else {
    console.log("Target 1 not found");
}
