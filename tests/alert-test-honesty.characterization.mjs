// CHARACTERIZATION -- no alert "test" path that cannot deliver.
//
// AlertSettingsView once had Discord and Telegram test buttons whose handlers
// POSTed a staged signal ($64,108 spot, 91% confidence, "Taker buy delta spike
// +1,420 BTC") to /api/alerts/send and reported "dispatched successfully!".
// The server has no such route, so nothing was ever sent. The buttons were
// removed in c3c807f; the handlers and the sendTestAlert client call stayed
// behind, unreferenced. They are deleted so the dead path cannot be re-mounted.
import { readRepoFile, serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('alert-test-honesty.characterization');
const strip = (s) => s.replace(/\/\/[^\n]*/g, '');
const view = strip(readRepoFile('src/components/AlertSettingsView.tsx'));
const api = strip(readRepoFile('src/services/api.ts'));

t.check('no test-alert handlers in the view', !/handleTestDiscord|handleTestTelegram|isSendingTest/.test(view));
t.check('no client call to the missing endpoint', !api.includes('/api/alerts/send') && !/sendTestAlert/.test(api + view));
t.check('no staged prices or taker-delta story', !/64108|64228|\+1,420 BTC|confidence: 91/.test(view + api));
t.check('Discord account linking is kept', view.includes('handleLinkDiscordAccount') && view.includes('getDiscordAuthUrlSecure'));
t.check('(still true) the server has no /api/alerts/send route', !serverSrc.includes('"/api/alerts/send"'));

t.done();
