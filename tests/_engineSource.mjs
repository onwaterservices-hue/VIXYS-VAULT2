// Shared source extractor for the 15M characterization tests.
//
// These tests execute the REAL implementation taken verbatim out of the
// server.ts in THIS repository. Nothing here reimplements engine logic: the
// function bodies are sliced out of the file and evaluated with controlled
// globals injected, so a test can only pass if the shipped code behaves the
// way the test says it does.
//
// Paths are derived from this module's own location so the tests move with the
// checkout. Two older suites here read server.ts from an absolute path outside
// the repo (a copy ~950 lines behind HEAD) and so were not guarding this
// checkout at all; they have since been repointed.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function readRepoFile(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

export const serverSrc = readRepoFile('server.ts');

// Every extraction asserts its anchors appear EXACTLY once before slicing.
// An anchor that has become ambiguous means the file moved underneath the test
// and the slice can no longer be trusted, so this throws rather than guessing.
export function sliceBetween(src, startAnchor, endAnchor, label) {
  const nStart = src.split(startAnchor).length - 1;
  const nEnd = src.split(endAnchor).length - 1;
  if (nStart !== 1) throw new Error(`${label}: start anchor ${JSON.stringify(startAnchor)} appears ${nStart}x, expected exactly 1`);
  if (nEnd !== 1) throw new Error(`${label}: end anchor ${JSON.stringify(endAnchor)} appears ${nEnd}x, expected exactly 1`);
  const i = src.indexOf(startAnchor);
  const j = src.indexOf(endAnchor, i);
  if (j < 0) throw new Error(`${label}: end anchor appears before start anchor`);
  return src.slice(i, j);
}

/** Slice from startAnchor up to and INCLUDING endAnchor. */
export function sliceThrough(src, startAnchor, endAnchor, label) {
  const nStart = src.split(startAnchor).length - 1;
  const nEnd = src.split(endAnchor).length - 1;
  if (nStart !== 1) throw new Error(`${label}: start anchor appears ${nStart}x, expected exactly 1`);
  if (nEnd !== 1) throw new Error(`${label}: end anchor appears ${nEnd}x, expected exactly 1`);
  const i = src.indexOf(startAnchor);
  const j = src.indexOf(endAnchor, i);
  if (j < 0) throw new Error(`${label}: end anchor precedes start anchor`);
  return src.slice(i, j + endAnchor.length);
}

// The strike-side helper the gate calls, executed verbatim with the real table.
export function buildStrikeSideHelper(lockRule = 'off', bar = 0.95) {
  const helperSrc = sliceBetween(serverSrc, 'function computeStrikeSideProbability(', '__name(computeStrikeSideProbability', 'computeStrikeSideProbability');
  const table = JSON.parse(readRepoFile('src/data/strikeSideTable.v1.json'));
  const js = helperSrc.replace('(strikeSideTableV1 as any)', 'strikeSideTableV1');
  return new Function('strikeSideTableV1', 'VIXY_LOCK_RULE', 'VIXY_LOCK_RULE_BAR', 'Math', `${js}; return computeStrikeSideProbability;`)(table, lockRule, bar, Math);
}

export function extractFn(name, startAnchor) {
  return sliceBetween(serverSrc, startAnchor, `__name(${name}`, name);
}

// --- tiny assertion harness, matching the style of the existing .mjs tests ---
export function createHarness(title) {
  let pass = 0, fail = 0;
  const failures = [];
  return {
    section(s) { console.log(`\n== ${s} ==`); },
    check(label, cond, detail = '') {
      if (cond) { pass++; console.log(`  PASS  ${label}`); }
      else { fail++; failures.push(`${label} ${detail}`); console.log(`  FAIL  ${label}  ${detail}`); }
    },
    eq(label, actual, expected) {
      const ok = Object.is(actual, expected);
      this.check(label, ok, ok ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    done() {
      console.log(`\n=== ${title}: ${pass} passed, ${fail} failed ===`);
      if (fail > 0) { console.log('FAILURES:'); failures.forEach((f) => console.log('  - ' + f)); }
      process.exit(fail === 0 ? 0 : 1);
    },
  };
}
