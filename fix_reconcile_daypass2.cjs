const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const bad1 = "const isDayPass = session.mode === 'payment' && (session.amount_total === 999 || session.amount_total === 990); // Fallback to amount heuristic since line items aren't always expanded";
const good1 = "const expectedPriceId = process.env.STRIPE_DAY_PASS_PRICE_ID || 'price_1U4cKTCYsvFDvgUJZHASVwRG'; const isDayPass = session.mode === 'payment' && session.line_items?.data.some(item => item.price?.id === expectedPriceId);";

const bad2 = "const isDayPass = matchingSession.mode === 'payment' && (matchingSession.amount_total === 999 || matchingSession.amount_total === 990); // Fallback to amount heuristic";
const good2 = "const expectedPriceId2 = process.env.STRIPE_DAY_PASS_PRICE_ID || 'price_1U4cKTCYsvFDvgUJZHASVwRG'; const isDayPass = matchingSession.mode === 'payment' && matchingSession.line_items?.data.some(item => item.price?.id === expectedPriceId2);";

code = code.replace(bad1, good1);
code = code.replace(bad2, good2);
fs.writeFileSync('backend.ts', code);
