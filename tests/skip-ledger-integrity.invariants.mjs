// The ledger must never receive a finished-looking SKIP for a live cycle, nor a
// SKIP that shadows a lock committed by another instance.
import { serverSrc, sliceBetween, sliceThrough, createHarness } from './_engineSource.mjs';
const t = createHarness('skip-ledger-integrity.invariants');
const midCycle = sliceBetween(serverSrc, 'let skippedLog = persistentSignalLogs.find((s) => s.id === sigId);', '// lockedSnapshot is only populated by lock15mCycle', 'mid-cycle skip writer');
const rollover = sliceThrough(serverSrc, 'const sigId = `sig_skip_${active15mCycle.intervalStart}`;\n      if (!persistentSignalLogs.find((s) => s.id === sigId)) {', '| Reason: ${skippedLog.qualificationReason}`,', 'rollover skip writer');
t.section('mid-cycle NO_TRADE writer');
t.check('does not persist to the ledger mid-cycle', !midCycle.includes('persistSingleSignalLog('));
t.check('still records the in-memory marker', midCycle.includes('persistentSignalLogs.unshift(skippedLog)'));
t.section('rollover NO_TRADE writer');
t.check('checks memory for a lock row before persisting', rollover.includes('persistentSignalLogs.some((s) => s.id === lockRowId)'));
t.check('checks the shared ledger for a lock row before persisting', rollover.includes('getDoc(doc(db, "signal_logs", lockRowId))'));
t.check('fails closed when the ledger cannot be read', rollover.includes('lockExistsElsewhere = true;'));
t.check('persists only when no lock exists', /if \(lockExistsElsewhere\) \{[\s\S]*?\} else \{[\s\S]*?persistSingleSignalLog\(skippedLog\);/.test(rollover));
t.section('no fabricated fields in skip rows');
const both = midCycle + rollover;
t.check('no literal latencyMs: 12', !both.includes('latencyMs: 12'));
t.check('no literal "COINBASE_KRAKEN_CASCADE" data source', !both.includes('COINBASE_KRAKEN_CASCADE'));
t.check('no "|| 72" confidence default', !/\|\|\s*72\b/.test(both));
t.check('dataSource is the observed price venue', both.includes('dataSource: marketFeedHealth.priceSource || null'));
t.done();
