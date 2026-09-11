// CHARACTERIZATION -- Settings shows no invented keys, connections or profile values.
//
// App.tsx seeded Kalshi and Polymarket as CONNECTED with invented keys
// (kalshi_sec_9810239102, poly_l2_0x892a71f02931) and latencies (12ms, 18ms).
// SettingsView showed a default API key vault_live_98a7b6c5d4e3f210, "Regenerate"
// made a random key the server never issued, "Test API Handshake" and "Enable"
// marked Polymarket/DraftKings CONNECTED at 14-15ms without contacting anything,
// a curl sample pointed at api.vixysvault.com, and the profile fell back to
// "Quant User", "trader@vixysvault.com" and "July 2026".
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('settings-no-fake-connections.characterization');
const strip = (x) => x.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/[^\n]*/g, '');
const app = strip(readRepoFile('src/App.tsx'));
const view = strip(readRepoFile('src/components/SettingsView.tsx'));

t.section('seeded venue state');
t.check('no invented venue keys', !/kalshi_sec_9810239102|poly_l2_0x892a71f02931|0x7129\.\.\.8a19/.test(app));
t.check('no venue seeded CONNECTED', !/connected: true,\s*\n\s*apiKey: '/.test(app));

t.section('settings page');
for (const lit of ['vault_live_98a7b6c5d4e3f210', 'vault_live_', 'simulatedLatency', 'handleTestConnection', 'handleToggleConnect', 'handleRegenerateKey', 'api.vixysvault.com', "'Quant User'", 'trader@vixysvault.com', "'July 2026'", 'Live Production API Secret Key'])
  t.check(`no ${lit}`, !view.includes(lit));
t.check('venue cards say there is no integration', (view.match(/No integration yet/g) || []).length === 2 && view.includes('Polymarket and DraftKings are not integrated yet'));
t.check('API section says no public API or keys exist', view.includes('There is no public VIXY REST or WebSocket API yet'));
t.check('no key is copied when none exists', /onClick=\{handleCopyKey\}\s*\n\s*disabled=\{!apiKey\}/.test(view));

t.done();
