// Shared source extractor for the 15M characterization tests.
//
// These tests execute the REAL implementation taken verbatim out of the
// server.ts in THIS repository. Nothing here reimplements engine logic: the
// function bodies are sliced out of the file and evaluated with controlled
// globals injected, so a test can only pass if the shipped code behaves the
// way the test says it does.
//
// Two of the older test files in this directory read server.ts from
// /Users/olivergershey/Downloads/VIXYS-VAULT2-main/server.ts -- a stale copy
// outside the repo that is 950 lines behind HEAD. Everything added here reads
// the repo copy via a path derived from this module's own location, so the
// tests move with the checkout.
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
