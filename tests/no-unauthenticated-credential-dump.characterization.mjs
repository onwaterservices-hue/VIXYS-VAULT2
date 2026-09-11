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
// A full scan of the collection is allowed only inside the OWNER-only audit route,
// which reduces documents to counters (see auto-trade-audit-counts-only).
const auditStart = serverSrc.indexOf('app.get("/api/admin/auto-trade/audit", requireRole(["OWNER"]), async (req, res) => {');
const auditEnd = auditStart >= 0 ? serverSrc.indexOf('\n});\n', auditStart) : -1;
const scanIdx = [...serverSrc.matchAll(/getDocs\(collection\(db, "kalshi_credentials"\)\)/g)].map((m) => m.index);
t.check('every full credential scan sits inside the OWNER-only counts audit',
  scanIdx.every((i) => auditStart >= 0 && i > auditStart && i < auditEnd), `scans at ${scanIdx.join(',')}; audit ${auditStart}-${auditEnd}`);
t.done();
