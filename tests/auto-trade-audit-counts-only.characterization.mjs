// CHARACTERIZATION -- the owner-only auto-trade audit returns counts, never records.
//
// The owner asked (2026-09-11) to see who has Kalshi auto-trade enabled, split by
// paper vs live, before deciding whether its order path should be routed through
// the Admin SDK. The route reduces each kalshi_credentials / auto_trade_executions
// document to counters and returns only those.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('auto-trade-audit-counts-only.characterization');
const start = serverSrc.indexOf('app.get("/api/admin/auto-trade/audit", requireRole(["OWNER"]), async (req, res) => {');
const end = serverSrc.indexOf('\n});\n', start);
const handler = start > 0 ? serverSrc.slice(start, end) : '';
t.check('audit route exists and is OWNER-only', start > 0);
t.check('reads through the Admin-aware functions', handler.includes('getDocs(collection(db, "kalshi_credentials"))') && handler.includes('getDocs(collection(db, "auto_trade_executions"))'));
t.check('responds only with the counters object', (handler.match(/res\.json\(/g) || []).length === 2 && handler.includes('res.json(out)'));
for (const leak of ['userEmail', 'keyIdEncrypted', 'privateKeyEncrypted', 'decryptString', 'd.id', 'docs.map', 'data: d.data()']) {
  t.check(`handler never touches ${leak}`, !handler.includes(leak));
}
t.check('reports whether live orders are allowed by code', handler.includes('liveOrdersAllowedByCode: AUTO_TRADING_LIVE_ENABLED'));
t.check('errors carry a code or name only', !/err\?\.message/.test(handler));
t.check('registered after requireRole is defined (module-load order)', serverSrc.indexOf('const requireRole =') > 0 && serverSrc.indexOf('const requireRole =') < start);

t.done();
