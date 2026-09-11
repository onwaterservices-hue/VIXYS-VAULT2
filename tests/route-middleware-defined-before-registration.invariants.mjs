// INVARIANTS -- no route registers a const/let middleware before it is defined.
//
// Route registration evaluates its middleware call (e.g. requireRole(["OWNER"]))
// at module load. PR #178 registered a route above `const requireRole = ...`, so
// loading dist/server.cjs threw "TypeError: requireRole is not a function" and every
// Vercel invocation failed (FUNCTION_INVOCATION_FAILED, 2026-09-11 ~18:53-19:00Z).
// tsc and the build do not catch this ordering.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('route-middleware-defined-before-registration.invariants');
const reg = /^app\.(get|post|put|delete|patch|all|use)\(\s*(?:"[^"]*"|\[[^\]]*\])\s*,\s*([A-Za-z_$][\w$]*)\(/gm;
const uses = [...serverSrc.matchAll(reg)].map((m) => ({ name: m[2], at: m.index }));
t.check('found middleware-call registrations to check', uses.length > 10, String(uses.length));
const names = [...new Set(uses.map((u) => u.name))];
let checked = 0;
for (const name of names) {
  const def = serverSrc.search(new RegExp(`^(?:const|let|var)\\s+${name.replace(/\$/g, '\\$')}\\s*=`, 'm'));
  if (def < 0) continue; // function declarations are hoisted; imports are bound before module code
  checked++;
  const early = uses.filter((u) => u.name === name && u.at < def);
  t.check(`${name}: every registration comes after its definition`, early.length === 0,
    early.length ? `line(s) ${early.map((u) => serverSrc.slice(0, u.at).split('\n').length).join(', ')}` : '');
}
t.check('requireRole was among the checked middleware', names.includes('requireRole') && checked > 0);
t.done();
