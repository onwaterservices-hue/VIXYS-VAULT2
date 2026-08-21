const historicalAcc = 71.8;
const isITM = false;
const distFromStrikeAbs = 10;
const agreementCount = 4;
const candidateDir = "DOWN";

// --- OLD MATH ---
const old_agreementBonus = (agreementCount - 6) * .05; // -0.10
const old_moneynessBonus = isITM ? .1 : distFromStrikeAbs < 5 ? 0 : candidateDir === "UP" ? .04 : -.04; // -0.04
const old_rawDirectionalBias = candidateDir === "NEUTRAL" ? 0 : (candidateDir === "UP" ? 1 : -1) * (old_agreementBonus + old_moneynessBonus); // -1 * (-0.14) = 0.14
const old_baseProb = .5 + old_rawDirectionalBias; // 0.64
const old_boundedProb = Math.min(.96, Math.max(.05, Math.round(old_baseProb * 1e3) / 1e3)); // 0.64
const old_calibratedModelProb = Math.min(.96, Math.max(.05, Math.round((old_boundedProb * .85 + historicalAcc / 100 * .15) * 1e3) / 1e3)); // 0.64 * 0.85 + 0.1077 = 0.6517

console.log("OLD MATH RESULTS (DOWN SIGNAL):");
console.log("Base Prob:", old_baseProb);
console.log("Calibrated Prob:", old_calibratedModelProb);
console.log("Engine Decision:", old_calibratedModelProb >= 0.505 ? "UP" : (old_calibratedModelProb <= 0.495 ? "DOWN" : "NEUTRAL"));
console.log("-----------------------");

// --- NEW MATH ---
const new_agreementBonus = (agreementCount - 6) * .05; // -0.10
const new_moneynessBonus = isITM ? .1 : distFromStrikeAbs < 5 ? 0 : .04; // 0.04
const new_convictionMagnitude = Math.max(0, 0.10 + new_agreementBonus + new_moneynessBonus); // 0.10 - 0.10 + 0.04 = 0.04
const new_rawDirectionalBias = candidateDir === "NEUTRAL" ? 0 : (candidateDir === "UP" ? 1 : -1) * new_convictionMagnitude; // -0.04
const new_baseProb = .5 + new_rawDirectionalBias; // 0.46
const new_boundedProb = Math.min(.96, Math.max(.05, Math.round(new_baseProb * 1e3) / 1e3)); // 0.46
const edgeFromNeutral = new_boundedProb - 0.5; // -0.04
const accuracyMultiplier = 0.85 + (historicalAcc / 100 * 0.15); // 0.9577
const new_calibratedModelProb = Math.min(.96, Math.max(.05, Math.round((0.5 + edgeFromNeutral * accuracyMultiplier) * 1e3) / 1e3)); // 0.5 - 0.038308 = 0.462

console.log("NEW MATH RESULTS (DOWN SIGNAL):");
console.log("Base Prob:", new_baseProb);
console.log("Calibrated Prob:", new_calibratedModelProb);
console.log("Engine Decision:", new_calibratedModelProb >= 0.505 ? "UP" : (new_calibratedModelProb <= 0.495 ? "DOWN" : "NEUTRAL"));
