// RUNTIME INVARIANT TESTS — ONE 15-MINUTE DECISION ENGINE, NO INVENTED PREDICTIONS
//
// POST /api/predict was a public, unauthenticated second "15-minute binary
// prediction" engine. With Gemini configured (as in production on 2026-09-11)
// every anonymous call spent a paid model request; its prompt handed the model
// an example answer to copy (probability 88, confidence 91, "6/7 Models Agree",
// a 94% "historical match" dated 2026-03-14), and missing inputs were filled
// with invented market data ($64,108, 68% buy volume, +1,420 BTC delta).
// Without Gemini it returned those numbers verbatim. The only client wrapper,
// fetchPrediction, was never called and carried the same fabricated fallback.
// The live 15M engine is the only decision engine.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const server = readFileSync(join(root, 'server.ts'), 'utf8');
const api = readFileSync(join(root, 'src/services/api.ts'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

const code = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');

console.log('\n=== SINGLE PREDICTION ENGINE INVARIANTS ===\n');

check('no /api/predict route is registered', !/app\.(post|get|all)\(\s*\[?\s*"\/api\/predict"/.test(server));
check('the client has no fetchPrediction wrapper', !/export async function fetchPrediction\(/.test(api));
check('nothing in the client calls /api/predict', !/['"`]\/api\/predict['"`]/.test(code(api)));
check('no server prompt asks a model for a "15-minute binary prediction"', !/15-minute binary prediction/.test(server));
check('the invented "6/7 Models Agree" consensus is gone from the server', !/6\/7 Models Agree/.test(code(server)));
check('the invented 94% historical match is gone from the server', !/similarityScore: "94%"|"similarityScore": "94%"/.test(server));
check('the invented +1,420 BTC delta is gone from the client', !/Net Taker Delta \+1,420 BTC/.test(code(api)));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
