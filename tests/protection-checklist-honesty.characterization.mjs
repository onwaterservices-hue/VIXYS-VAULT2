// CHARACTERIZATION -- /api/vixy/15m/current reports the gate it actually applied.
//
// protection.checklist was thirteen literal `true`s, so the public payload said
// allPassed on every cycle while lockGate in the same payload showed failing
// checks. protection.scoreComponents carried seven differently named metrics
// (directionalEdge, crossVenueAgreement, modelConsensus, ...) that were all the
// same number: lockQuality, or 50.
import { serverSrc, createHarness } from './_engineSource.mjs';
import { transformSync } from 'esbuild';

const t = createHarness('protection-checklist-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('checklist (real code)');
const a = serverSrc.indexOf('      checklist: (() => {');
const b = serverSrc.indexOf('      })(),', a);
t.check('checklist block found', a > 0 && b > a);
const body = serverSrc.slice(a, b + '      })()'.length).replace(/^\s*checklist:\s*/, '');
const m = { exports: {} };
new Function('module', 'exports', transformSync(`module.exports = (active15mCycle) => ${body};`, { loader: 'ts', format: 'cjs' }).code)(m, m.exports);
const checklist = m.exports;
const ids = ['WINDOW', 'NOT_CHOPPY', 'LOCK_QUALITY', 'EVIDENCE', 'STABILITY', 'REVERSAL', 'AGREEMENT', 'NO_CONFLICT', 'PROTECTION', 'FEED'];
const cycle = (eligible, failing = []) => ({ cycleId: 'BTC-15M-1', lockEligibility: { eligible, checks: ids.map((id) => ({ id, pass: !failing.includes(id) })) } });

const blocked = checklist(cycle(false, ['WINDOW', 'EVIDENCE', 'REVERSAL']));
t.eq('a blocked gate is not reported as allPassed', blocked.allPassed, false);
t.eq('failing WINDOW -> timeWindowPassed false', blocked.timeWindowPassed, false);
t.eq('failing EVIDENCE -> confidencePassed false', blocked.confidencePassed, false);
t.eq('failing REVERSAL -> reversalRiskPassed false', blocked.reversalRiskPassed, false);
t.eq('passing AGREEMENT -> evidenceConfluencePassed true', blocked.evidenceConfluencePassed, true);
const open = checklist(cycle(true));
t.eq('an eligible gate reports allPassed true', open.allPassed, true);
t.eq('...and each mapped check true', [open.timeWindowPassed, open.regimePassed, open.directionalScorePassed, open.confidencePassed, open.temporalStabilityPassed, open.reversalRiskPassed, open.evidenceConfluencePassed, open.noContradictionPassed, open.protectionEnginePassed, open.dataFreshnessPassed].every((v) => v === true), true);
t.eq('there is no cross-venue check, so crossVenuePassed is null', open.crossVenuePassed, null);
const none = checklist({ cycleId: null, lockEligibility: null });
t.check('no gate evaluation -> every flag null, nothing claimed', Object.values(none).every((v) => v === null), JSON.stringify(none));

t.section('literals are gone');
t.check('no all-true checklist literal', !/checklist: \{\s*cycleActive: true,/.test(code) && !/allPassed: true,/.test(code));
{
  const i = serverSrc.indexOf('      scoreComponents: {', a);
  const sc = serverSrc.slice(i, serverSrc.indexOf('      },', i));
  t.check('scoreComponents no longer copy lockQuality', !/lockQuality \?\? 50/.test(sc));
  t.eq('seven unmeasured components are null', (sc.match(/: null,/g) || []).length, 7);
}

t.done();
