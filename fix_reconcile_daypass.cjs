const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const bad1 = "const isDayPass = session.mode === 'payment' || session.amount_total === 999;";
const good1 = "const isDayPass = session.mode === 'payment' && (session.amount_total === 999 || session.amount_total === 990); // Fallback to amount heuristic since line items aren't always expanded";

const bad2 = "const isDayPass = matchingSession.mode === 'payment' || matchingSession.amount_total === 999;";
const good2 = "const isDayPass = matchingSession.mode === 'payment' && (matchingSession.amount_total === 999 || matchingSession.amount_total === 990); // Fallback to amount heuristic";

code = code.replace(bad1, good1);
code = code.replace(bad2, good2);
fs.writeFileSync('backend.ts', code);
