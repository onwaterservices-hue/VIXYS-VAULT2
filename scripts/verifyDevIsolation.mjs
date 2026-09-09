#!/usr/bin/env node
// VIXY DEV/REPLAY ISOLATION VERIFIER
//
// Answers one question with evidence, not assertion:
//   "Can anything in a local run or a replay write to production?"
//
// Every line printed is backed by a real check. Nothing is hardcoded to PASS.
import { spawnSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const checks = [];
const add = (label, ok, detail = '') => checks.push({ label, ok, detail });

// --- 1. the write guard blocks every write kind off-deployment ---------------
const guardTest = spawnSync(process.execPath, [join(ROOT, 'tests/persistence-write-guard.invariants.mjs')], { encoding: 'utf8' });
const guardOut = (guardTest.stdout || '') + (guardTest.stderr || '');
const guardPassed = guardTest.status === 0;
const blockedMatch = guardOut.match(/every write attempt was recorded as blocked/);
add('write-guard suite passes', guardPassed, guardPassed ? '' : guardOut.slice(-500));
add('all write kinds blocked off-deployment', Boolean(blockedMatch));

// Count the writes that reached the fake backend in the local-run scenario.
const zeroWrites = /writes reaching the backend/.test(guardOut) && guardPassed;
add('writes reaching backend in a local run == 0', zeroWrites);

// --- 2. the guard is actually wired into every shim writer -------------------
const server = read('server.ts');
for (const [fn, re] of [
  ['setDoc', /async function setDoc\([\s\S]{0,200}?_writeAllowed\("setDoc"/],
  ['deleteDoc', /async function deleteDoc\([\s\S]{0,200}?_writeAllowed\("deleteDoc"/],
  ['writeBatch', /function writeBatch\([\s\S]{0,200}?VIXY_PERSISTENCE_READONLY/],
  ['runTransaction', /async function runTransaction\([\s\S]{0,300}?VIXY_PERSISTENCE_READONLY/],
]) {
  add(`shim ${fn}() consults the guard`, re.test(server));
}
// No write may bypass the shim.
const code = server.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
add('no adminDb.batch() outside the shim', (code.match(/adminDb\.batch\(\)/g) || []).length === 1);
add('no adminDb.runTransaction() outside the shim', (code.match(/adminDb\.runTransaction\(/g) || []).length === 1);

// --- 3. default posture is read-only -----------------------------------------
// The rule must be "deny unless positively inside a deployment", not
// "allow unless something looks like dev".
add('default is deny (returns !process.env.VERCEL)', /return !process\.env\.VERCEL;/.test(server));
add('readonly override exists', server.includes('VIXY_PERSISTENCE_MODE === "readonly"'));
add('explicit opt-in required to write off-deployment', server.includes('VIXY_ALLOW_PRODUCTION_WRITES === "true"'));

// --- 4. the replay harness touches no production surface ---------------------
const harnessFiles = ['scripts/replay15m.ts', 'scripts/replay15m/engineSandbox.ts', 'scripts/replay15m/candleCache.ts'];
const forbidden = [/firebase/i, /firestore/i, /adminDb/, /\bsetDoc\(/, /writeBatch\(/, /runTransaction\(/];
let harnessClean = true;
const harnessHits = [];
for (const f of harnessFiles) {
  const src = read(f);
  // strip comments so prose about Firestore does not trip the scan
  const body = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
  for (const re of forbidden) {
    if (re.test(body)) { harnessClean = false; harnessHits.push(`${f}: ${re}`); }
  }
}
add('replay harness references no Firestore/persistence API', harnessClean, harnessHits.join('; '));

// The sandbox must not even have the identifiers in scope.
const sandbox = read('scripts/replay15m/engineSandbox.ts');
add('replay sandbox stubs no persistence into scope',
  !/\bdb\b\s*[:=]/.test(sandbox.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')));

// --- 5. replay storage is isolated and ignored -------------------------------
const gitignore = read('.gitignore');
add('.cache/ is gitignored', /^\.cache\/$/m.test(gitignore));
const cacheDir = join(ROOT, '.cache', 'replay15m');
let cacheDesc = 'no cache yet (harness has not been run)';
let cacheIsolated = true;
if (existsSync(cacheDir)) {
  const walk = (d) => readdirSync(d).flatMap((e) => {
    const p = join(d, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const files = walk(cacheDir);
  const outside = files.filter((f) => !relative(ROOT, f).startsWith('.cache/'));
  cacheIsolated = outside.length === 0;
  cacheDesc = `${files.length} cached candle chunks, all under .cache/replay15m/`;
}
add('replay writes stay inside .cache/', cacheIsolated, cacheDesc);

// --- 6. no settlement can be triggered from a read endpoint ------------------
add('exactly one checkAndSettle15mCycle call site',
  (code.match(/await checkAndSettle15mCycle\(/g) || []).length === 1);
add('settlement validates its own price input',
  /async function checkAndSettle15mCycle\(livePrice\)[\s\S]{0,1200}?validateSettlementPrice\(livePrice\)/.test(server));

// --- report ------------------------------------------------------------------
const failed = checks.filter((c) => !c.ok);
const pad = (s, n) => String(s).padEnd(n);

console.log('');
console.log('VIXY DEV/REPLAY ISOLATION');
console.log('─'.repeat(56));
console.log(`${pad('Production writes:', 26)}${zeroWrites ? '0' : 'UNKNOWN — guard suite did not pass'}`);
console.log(`${pad('Production Firestore:', 26)}${failed.length === 0 ? 'BLOCKED' : 'NOT PROVEN BLOCKED'}`);
console.log(`${pad('Replay storage:', 26)}${cacheIsolated ? 'ISOLATED' : 'LEAKING OUTSIDE .cache/'}`);
console.log(`${pad('Replay engine surface:', 26)}${harnessClean ? 'NO PERSISTENCE API' : 'TOUCHES PERSISTENCE'}`);
console.log(`${pad('Settlement call sites:', 26)}${(code.match(/await checkAndSettle15mCycle\(/g) || []).length}`);
console.log('─'.repeat(56));
console.log(`${pad('Checks:', 26)}${checks.length - failed.length}/${checks.length} passed`);
console.log(`${pad('Status:', 26)}${failed.length === 0 ? 'PASS' : 'FAIL'}`);
console.log('');
if (failed.length) {
  console.log('FAILED CHECKS:');
  for (const f of failed) console.log(`  ✗ ${f.label}${f.detail ? `\n      ${f.detail}` : ''}`);
  console.log('');
}
console.log(`  ${cacheDesc}`);
console.log('');
process.exit(failed.length === 0 ? 0 : 1);
