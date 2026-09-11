// CHARACTERIZATION -- no route returns stored Kalshi credentials to an unauthenticated caller.
//
// server.ts registered GET /api/internal/dump-creds with no authentication. It read the
// whole kalshi_credentials collection (user emails, encrypted API key ids and private
// keys, auto-trade configs) and returned every document. vercel.json rewrites
// /api/(.*) to this app and production runs the Admin SDK, so it was publicly
// reachable. Found 2026-09-11 and removed.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('no-unauthenticated-credential-dump.characterization');
t.check('the credential dump route is gone', !serverSrc.includes('/api/internal/dump-creds'));
t.check('no handler serialises raw kalshi_credentials documents',
  !/collection\(db, "kalshi_credentials"\)\);\s*\n\s*res\.json\(\{ size: docs\.size, data: docs\.docs\.map/.test(serverSrc));
// Every read of the whole collection must sit behind a role check or be the
// engine's own server-side use (never serialised to a response).
const scans = [...serverSrc.matchAll(/getDocs\(collection\(db, "kalshi_credentials"\)\)/g)].length;
t.eq('no remaining full-collection credential scans in routes', scans, 0);
t.done();
