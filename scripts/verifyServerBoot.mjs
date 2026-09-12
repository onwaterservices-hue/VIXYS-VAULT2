#!/usr/bin/env node
// VERIFY SERVER BOOT -- loads the built bundle the way Vercel does and fails if
// module evaluation throws or never completes.
//
// Why this exists: PR #178 registered an Express route above `const requireRole = ...`.
// Route registration evaluates its middleware call at module load, so the built
// dist/server.cjs threw "requireRole is not a function" and every Vercel invocation
// failed for ~8 minutes (2026-09-11 18:53-19:00Z). tsc passed, the build passed, and
// the test suite passed -- none of them ever load the bundle.
//
// api/index.ts does exactly one thing: `import { app } from '../dist/server.cjs'`.
// This script does the same in a child process and asserts the export is usable.
// A pass means the bundle evaluated; it does not mean any route behaves correctly.
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = join(ROOT, 'dist', 'server.cjs');
const TIMEOUT_MS = Number(process.env.VIXY_BOOT_TIMEOUT_MS || 60000);
const MARKER = 'VIXY_BOOT_OK';

if (!existsSync(BUNDLE)) {
  console.error(`FAIL  dist/server.cjs is missing — run \`npm run build\` first (looked in ${BUNDLE})`);
  process.exit(1);
}

// The bundle calls startServer() at module scope, which binds a port and starts
// timers, so it never "finishes". Print the marker on the turn after the require
// resolves: reaching that point is the proof that evaluation completed.
const probe = `
  const mod = require(${JSON.stringify(BUNDLE)});
  if (!mod || typeof mod.app !== 'function') {
    console.error('BOOT_BAD_EXPORT ' + typeof (mod && mod.app));
    process.exit(2);
  }
  setImmediate(() => { console.log(${JSON.stringify(MARKER)}); process.exit(0); });
`;

// Keep the boot inert: no production writes (the Firestore shim already refuses
// when VERCEL is unset) and the production branch of startServer, which serves
// dist/ statically instead of booting a Vite dev server.
const child = spawn(process.execPath, ['-e', probe], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, NODE_ENV: 'production', VIXY_PERSISTENCE_MODE: 'readonly' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let out = '';
let timedOut = false;
child.stdout.on('data', (d) => { out += d; });
child.stderr.on('data', (d) => { out += d; });

const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, TIMEOUT_MS);

child.on('close', (code) => {
  clearTimeout(timer);
  const booted = out.includes(MARKER) && code === 0;
  const tail = out.trim().split('\n').slice(-25).join('\n');
  if (timedOut) {
    console.error(`FAIL  dist/server.cjs did not finish loading within ${TIMEOUT_MS}ms`);
    console.error(tail ? tail.replace(/^/gm, '        ') : '        (no output)');
    process.exit(1);
  }
  if (!booted) {
    console.error(`FAIL  loading dist/server.cjs the way api/index.ts does threw (exit ${code})`);
    console.error(tail ? tail.replace(/^/gm, '        ') : '        (no output)');
    process.exit(1);
  }
  console.log('PASS  dist/server.cjs evaluates and exports `app` (the check PR #178 lacked)');
  process.exit(0);
});
