const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target1 = `let active15mCycle = {
  cycleId: \`15M-\${new Date(current15mIntervalStart).toISOString()}\`,`;

const replacement1 = `// ============================================================================
// ⚠️ VIXY LOCK - CRITICAL PRODUCTION INFRASTRUCTURE ⚠️
// ============================================================================
// The \`active15mCycle\` object below is the STRICT AUTHORITATIVE SOURCE OF TRUTH
// for the live VIXY LOCK state machine.
//
// 1. DO NOT MODIFY the lock thresholds, confidence gates, or calculation logic.
// 2. THIS STATE IS EPHEMERAL IN MEMORY, but defensively hydrates on startup from \`persistentSignalLogs\`.
// 3. Calibration features must remain STRICTLY SHADOW-ONLY and CANNOT alter \`active15mCycle\`.
// 4. DO NOT refactor this logic without explicit approval.
// ============================================================================
let active15mCycle = {
  cycleId: \`15M-\${new Date(current15mIntervalStart).toISOString()}\`,`;

if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    console.log("Added protection comments for active15mCycle.");
}

const target2 = `async function checkAndSettle15mCycle(livePrice) {`;

const replacement2 = `// ----------------------------------------------------------------------------
// ⚠️ VIXY LOCK SETTLEMENT & SHADOW CALIBRATION ⚠️
// ----------------------------------------------------------------------------
// 1. This function is authoritative for lock settlement and persistent outcome generation.
// 2. The shadow calibration block executes here. It MUST ONLY observe the settled result.
// 3. Shadow calibration must NEVER influence the production decision state.
// ----------------------------------------------------------------------------
async function checkAndSettle15mCycle(livePrice) {`;

if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    console.log("Added protection comments for checkAndSettle15mCycle.");
}

fs.writeFileSync('server.ts', content);
