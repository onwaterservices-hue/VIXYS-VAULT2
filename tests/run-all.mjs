// Runs every .mjs test in this directory as a child process and reports a
// combined result. Each test file exits non-zero on failure, so CI only needs
// this one entry point.
import { readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => f.endsWith('.mjs') && f !== 'run-all.mjs' && !f.startsWith('_')).sort();

let failed = 0;
const results = [];
for (const f of files) {
  const r = spawnSync(process.execPath, [join(here, f)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const summary = out.trim().split('\n').filter((l) => /passed,\s*\d+\s*failed/.test(l)).pop()
    || out.trim().split('\n').pop() || '(no output)';
  const ok = r.status === 0;
  if (!ok) { failed++; process.stdout.write(out); }
  results.push({ f, ok, summary: summary.replace(/^=+\s*|\s*=+$/g, '') });
}

console.log('\n================ TEST SUMMARY ================');
for (const { f, ok, summary } of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${f.padEnd(46)} ${summary}`);
}
console.log(`\n${results.length - failed}/${results.length} test files passed`);
process.exit(failed === 0 ? 0 : 1);
