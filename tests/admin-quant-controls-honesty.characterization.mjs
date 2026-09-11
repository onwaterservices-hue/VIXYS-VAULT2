// Admin Quant Controls must show the thresholds the live lock gate applies.
// Before this test it showed a fixed "70.0%" minimum confidence and a
// "12 SECONDS (3s for 50/50 Pull)" persistence window. The engine gates on an
// engine score of at least 66, tiered lock quality and 6 seconds of persistence.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('admin-quant-controls-honesty.characterization');
const src = readRepoFile('src/components/AdminPanel.tsx');
const a = src.indexOf('const QuantControlsLive');
const section = a < 0 ? '' : src.slice(a, src.indexOf('export const AdminPanel', a));

t.check('section component exists', section.length > 200);
t.check('no fixed 70.0% confidence threshold', !src.includes('70.0%'));
t.check('no fixed 12 SECONDS persistence window', !src.includes('12 SECONDS'));
t.check('reads the live engine payload', section.includes('fetch("/api/vixy/15m/current"'));
t.check('shows the gate thresholds the server exposes', ['minLockQuality', 'minEvidenceAgreement', 'minMtfAligned', 'lockTier', 'lockPolicy'].every((k) => section.includes(k)));
t.check('lists each gate check with required and current', section.includes('c.required') && section.includes('String(c.current)'));
t.check('says so when the endpoint does not answer', section.includes('The engine endpoint did not answer.'));
t.check('section is mounted', src.includes('{activeSection === "quant_controls" && <QuantControlsLive />}'));

t.done();
