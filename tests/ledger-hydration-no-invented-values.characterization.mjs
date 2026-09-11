// Ledger rows and hydrated locks must not record values nothing measured.
//
// SKIP ledger rows stored `probability` and `lockedProbability` as
// `livePrediction?.probability || 50`: a missing prediction recorded 50 on a
// field whose real values are 0-1 (the Performance Lab renders it x100, so 5000%).
// Lock hydration on a cold start filled a missing confidence with 75, a missing
// probability with 0.5 and a missing lock time with the current time.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('ledger-hydration-no-invented-values.characterization');
const code = serverSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

t.section('SKIP ledger rows');
t.check('no probability default of 50', !code.includes('livePrediction?.probability || 50'));
const bounded = 'active15mCycle.livePrediction.probability > 0 && active15mCycle.livePrediction.probability <= 1 ? active15mCycle.livePrediction.probability : null';
t.eq('all four writers record a 0-1 probability or null', code.split(bounded).length - 1, 4);

t.section('lock hydration');
const hStart = code.indexOf('[VIXY_LOCK_HYDRATION] Reconstructing active15mCycle');
const hydration = hStart < 0 ? '' : code.slice(hStart, code.indexOf('lockedCycleIds.add(active15mCycle.cycleId);', hStart));
t.check('hydration block found', hydration.length > 200);
t.check('no confidence default of 75', !hydration.includes('mostRecentLog.confidence || 75'));
t.check('no probability default of 0.5', !hydration.includes('mostRecentLog.probability || 0.5'));
t.check('no invented lock time', !hydration.includes('mostRecentLog.lockedAt || new Date().toISOString()'));
t.check('missing confidence and probability become null', hydration.includes('? mostRecentLog.confidence : null') && hydration.includes('? mostRecentLog.probability : null'));
t.check('hydration does not create a locked snapshot (the probability mutation check needs one)', !hydration.includes('lockedSnapshot'));

t.done();
