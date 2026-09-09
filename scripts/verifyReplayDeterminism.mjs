#!/usr/bin/env node
// Proves the 15M replay is deterministic and free of look-ahead.
//
//   1. same seed  -> byte-identical per-cycle records
//   2. diff seed  -> different records (the seed genuinely reaches the pipeline,
//                    so determinism is not just "nothing is random")
//   3. zero look-ahead violations reported by the harness itself
//
// Runs fully offline against the cached candles.
import { spawnSync } from 'child_process';
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'vixy-replay-'));

// Derive the replay window from what is ACTUALLY cached, rather than assuming
// "the last N days" is on disk. --offline is a hard error on a cache miss (by
// design: the harness never silently reaches the network mid-run), so a window
// chosen by wall-clock would fail as soon as `now` moved past the cache.
const CHUNK_SECONDS = 300 * 60;
const cacheDir = join(ROOT, '.cache', 'replay15m', 'BTC-USD-60');
function cachedWindow(wantChunks = 3) {
  if (!existsSync(cacheDir)) return null;
  const starts = readdirSync(cacheDir)
    .filter((f) => /^\d+\.json$/.test(f))
    .map((f) => Number(f.replace('.json', '')))
    .sort((a, b) => a - b);
  if (starts.length < wantChunks) return null;
  // find the longest contiguous run, then take the last `wantChunks` of it
  let bestRun = [], run = [starts[0]];
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] === starts[i - 1] + CHUNK_SECONDS) run.push(starts[i]);
    else { if (run.length > bestRun.length) bestRun = run; run = [starts[i]]; }
  }
  if (run.length > bestRun.length) bestRun = run;
  if (bestRun.length < wantChunks) return null;
  const picked = bestRun.slice(-wantChunks);
  return {
    startIso: new Date(picked[0] * 1000).toISOString(),
    endIso: new Date((picked[picked.length - 1] + CHUNK_SECONDS) * 1000).toISOString(),
  };
}

const win = cachedWindow();
if (!win) {
  console.log('replay determinism: SKIP — not enough contiguous cached candles.');
  console.log('  Populate the cache first: npx tsx scripts/replay15m.ts --days 2');
  process.exit(0);
}
console.log(`replay window (from cache): ${win.startIso} -> ${win.endIso}`);

const runReplay = (seed, out) =>
  spawnSync('npx', ['tsx', join(ROOT, 'scripts/replay15m.ts'),
    '--start', win.startIso, '--end', win.endIso,
    '--offline', '--seed', String(seed), '--json', out],
    { cwd: ROOT, encoding: 'utf8' });

let failed = 0;
const check = (label, ok, detail = '') => {
  if (ok) console.log(`  PASS  ${label}`);
  else { failed++; console.log(`  FAIL  ${label}  ${detail}`); }
};

try {
  const a = join(tmp, 'a.json'), b = join(tmp, 'b.json'), c = join(tmp, 'c.json');
  const r1 = runReplay(1, a);
  check('replay run completes', r1.status === 0, ((r1.stderr || '') + (r1.stdout || '')).slice(-400));
  if (r1.status !== 0) { console.log(`\n${failed} failure(s)`); process.exit(1); }

  const out1 = (r1.stdout || '');
  const viol = out1.match(/lookahead violations\s*:\s*(\d+)/);
  check('harness reports zero look-ahead violations', viol && viol[1] === '0', viol ? `got ${viol[1]}` : 'not reported');

  runReplay(1, b);
  runReplay(7, c);
  const load = (p) => { const d = JSON.parse(readFileSync(p, 'utf8')); delete d.generatedAt; return d; };
  const A = load(a), B = load(b), C = load(c);

  check('same seed -> identical records', JSON.stringify(A.records) === JSON.stringify(B.records));
  check('same seed -> identical full payload', JSON.stringify(A) === JSON.stringify(B));
  check('different seed -> different records (seed reaches the pipeline)',
    JSON.stringify(A.records) !== JSON.stringify(C.records));
  check('replay produced cycles', Array.isArray(A.records) && A.records.length > 0, `n=${A.records?.length}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(failed === 0 ? '\nreplay determinism: PASS' : `\nreplay determinism: FAIL (${failed})`);
process.exit(failed === 0 ? 0 : 1);
