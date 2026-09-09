#!/usr/bin/env node
// VIXY VERIFY -- the single gate that must pass after any engine modification.
//
// Runs every check in order and reports each one's real result. A stage that
// cannot run reports SKIP with the reason; it is never silently counted as a
// pass. Exit code is non-zero if any stage FAILS.
//
// SCOPE: the VIXY 15-MINUTE engine. Nothing here validates a 1H or 2H model.
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheReady = existsSync(join(ROOT, '.cache', 'replay15m'));

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: false, ...opts });

const stages = [
  {
    name: 'typecheck',
    run: () => run('npx', ['tsc', '--noEmit']),
  },
  {
    name: 'engine + settlement + learning tests',
    run: () => run(process.execPath, [join(ROOT, 'tests/run-all.mjs')]),
    summarize: (o) => (o.match(/(\d+)\/(\d+) test files passed/) || [])[0],
  },
  {
    name: 'dev/prod isolation',
    run: () => run(process.execPath, [join(ROOT, 'scripts/verifyDevIsolation.mjs')]),
    summarize: (o) => (o.match(/Checks:\s+(\S+) passed/) || [])[1],
  },
  {
    name: 'replay determinism + leakage',
    skip: cacheReady ? null : 'no candle cache — run `npx tsx scripts/replay15m.ts --days 2` once first',
    run: () => run(process.execPath, [join(ROOT, 'scripts/verifyReplayDeterminism.mjs')]),
  },
  {
    name: 'production build',
    run: () => run('npm', ['run', 'build']),
  },
];

let failed = 0, skipped = 0;
const results = [];

console.log('\nVIXY VERIFY — 15M ENGINE');
console.log('='.repeat(64));

for (const s of stages) {
  if (s.skip) {
    skipped++;
    results.push({ name: s.name, status: 'SKIP', note: s.skip });
    console.log(`SKIP  ${s.name}\n        ${s.skip}`);
    continue;
  }
  process.stdout.write(`....  ${s.name}`);
  const r = s.run();
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === 0;
  if (!ok) failed++;
  const note = s.summarize ? (s.summarize(out) || '') : '';
  results.push({ name: s.name, status: ok ? 'PASS' : 'FAIL', note, out });
  process.stdout.write(`\r${ok ? 'PASS' : 'FAIL'}  ${s.name}${note ? `  (${note})` : ''}\n`);
  if (!ok) console.log(out.split('\n').slice(-25).map((l) => `        ${l}`).join('\n'));
}

console.log('='.repeat(64));
console.log(`${results.filter((r) => r.status === 'PASS').length} passed · ${failed} failed · ${skipped} skipped`);
console.log(failed === 0
  ? (skipped ? 'STATUS: PASS (with skips — read them, they are not passes)' : 'STATUS: PASS')
  : 'STATUS: FAIL');
console.log('');
process.exit(failed === 0 ? 0 : 1);
