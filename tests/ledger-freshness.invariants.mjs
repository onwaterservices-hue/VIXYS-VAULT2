// The ledger a reader sees must be the ledger, not one instance's stale copy.
// Two defects pinned here: (1) boot hydration used an UN-ORDERED limit(300),
// which returns an arbitrary 300 docs (the oldest by id in practice) — so once
// signal_logs passed 300 rows the newest settlements would never hydrate;
// (2) a warm instance hydrated once and then served its in-memory copy
// forever, so /api/signal/resolved-log and the research readout missed
// settlements written by other instances.
import { serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';
const t = createHarness('ledger-freshness.invariants');

t.section('Firestore shim supports ordered queries through the Admin datapath');
const shim = sliceBetween(serverSrc, 'function limit(n: number): any {', 'async function getDocs(qOrColl: any)', 'query shim');
t.check('orderBy is a first-class constraint', shim.includes('function orderBy(field: string, direction: "asc" | "desc" = "asc"): any') && shim.includes('{ __vixyOrderBy: [field, direction] }'));
t.check('query() applies orderBy on the Admin query builder', shim.includes('else if (c && c.__vixyOrderBy) q = q.orderBy(c.__vixyOrderBy[0], c.__vixyOrderBy[1]);'));
t.check('client SDK path imports orderBy under the same alias scheme', serverSrc.includes('orderBy as _clientOrderBy,'));

t.section('hydration reads the NEWEST 300 rows and merges by id');
const hydrate = sliceBetween(serverSrc, 'async function hydrateSignalHistoryFromFirestore() {', '__name(hydrateSignalHistoryFromFirestore', 'hydrate');
t.check('ordered newest-first by intervalStart before the limit', hydrate.includes('query(collection(db, "signal_logs"), orderBy("intervalStart", "desc"), limit(300))'));
t.check('no un-ordered limit(300) remains', !hydrate.includes('query(collection(db, "signal_logs"), limit(300))'));
t.check('rows are merged by id, never replaced', hydrate.includes('if (!persistentSignalLogs.find((s) => s.id === rec.id)) {') && hydrate.includes('persistentSignalLogs.push(rec);'));
t.check('a successful hydration stamps the freshness clock', hydrate.includes('_ledgerLastHydrateMs = Date.now();'));

t.section('ensureLedgerFresh: TTL refresh, single-flight, empty-ledger fallback');
const fresh = sliceBetween(serverSrc, 'function ensureLedgerFresh(maxAgeMs = LEDGER_FRESH_MS) {', '__name(ensureLedgerFresh', 'ensureLedgerFresh');
t.check('TTL is 4 minutes', serverSrc.includes('const LEDGER_FRESH_MS = 4 * 60e3;'));
t.check('an empty ledger falls back to the boot hydration promise', fresh.includes('if (persistentSignalLogs.length === 0) return ensureLedgerHydrated();'));
t.check('a fresh ledger short-circuits without a Firestore read', fresh.includes('if (Date.now() - _ledgerLastHydrateMs < maxAgeMs) return Promise.resolve({ hydrated: 0, reason: "FRESH" });'));
t.check('refresh is single-flight', fresh.includes('if (!_ledgerRefreshPromise) {') && fresh.includes('.finally(() => { _ledgerRefreshPromise = null; });'));

t.section('every ledger reader asks for a fresh ledger');
const resolvedLog = sliceBetween(serverSrc, 'app.get("/api/signal/resolved-log"', 'const limit2 = Math.min(200', 'resolved-log');
t.check('/api/signal/resolved-log refreshes', resolvedLog.includes('await ensureLedgerFresh();') && !resolvedLog.includes('persistentSignalLogs.length === 0'));
const research = sliceBetween(serverSrc, 'app.get("/api/research/shadow-l5"', 'const rows = persistentSignalLogs.filter(', 'shadow-l5');
t.check('/api/research/shadow-l5 refreshes', research.includes('await ensureLedgerFresh();'));
const settle = sliceBetween(serverSrc, 'app.all("/api/cron/settle"', '// RECONCILIATION:', 'cron settle');
t.check('/api/cron/settle refreshes before reconciling (so it never rebuilds rows another instance wrote)', settle.includes('hydration = await ensureLedgerFresh().catch(() => null);'));

t.done();
