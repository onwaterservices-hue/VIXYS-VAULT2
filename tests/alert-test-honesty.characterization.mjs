// CHARACTERIZATION -- the alert test button reports what the server did.
//
// AlertSettingsView's Discord and Telegram test buttons set success: true with
// "dispatched successfully!" for any response. They POST to /api/alerts/send,
// which has no server route, so users were told a test alert went out when
// nothing was sent. The payload was also a staged signal: $64,108 spot, $64,228
// target, 91% confidence, "Taker buy delta spike +1,420 BTC".
import { readRepoFile, serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('alert-test-honesty.characterization');
const src = readRepoFile('src/components/AlertSettingsView.tsx').replace(/\/\/[^\n]*/g, '');

t.check('no unconditional success', !/success:\s*true,\s*\n\s*message:\s*res\.message \|\|/.test(src));
t.eq('both tests take success from the server response', (src.match(/success: res\?\.success === true,/g) || []).length, 2);
t.check('says when nothing was sent', src.includes('Test alert was not sent: the alert delivery endpoint is unavailable.'));
t.check('no staged prices or taker-delta story', !/64108|64228|\+1,420 BTC|confidence: 91/.test(src));
t.check('payload is labelled a test', (src.match(/reasoning: 'TEST ALERT - not a signal'/g) || []).length === 2);
t.check('(still true) the server has no /api/alerts/send route', !serverSrc.includes('"/api/alerts/send"'));

t.done();
