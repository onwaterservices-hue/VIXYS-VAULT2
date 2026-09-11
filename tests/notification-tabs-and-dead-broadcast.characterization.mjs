// CHARACTERIZATION -- notification tabs name what they hold; the unused Discord broadcaster copy is gone.
//
// The header notification panel had a WHALES tab for alert types nothing creates and a
// SHIELD tab whose only reachable content was the "15M Cycle Skipped" notification.
// src/bot/discordBotService.ts kept an unused broadcastSignalToDiscord that posted
// "(N% Conf)", "AI Reasoning" and a "Brier Calibrated" footer; the live broadcaster is in
// src/bot/index.ts.
import { serverSrc, readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('notification-tabs-and-dead-broadcast.characterization');
const strip = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

t.section('notification tabs');
{
  const header = strip(readRepoFile('src/components/Header.tsx'));
  t.check('no WHALES or SHIELD tab', !header.includes("'WHALES'") && !header.includes("'SHIELD'") && !header.includes("selectedCategory === 'WHALE'") && !header.includes("selectedCategory === 'PROTECTION'"));
  t.check('tabs are ALL, 15M, SKIPS', header.includes("(['ALL', '15M', 'SKIPS'] as const)"));
  t.check('SKIPS lists the skip notification', /selectedCategory === 'SKIPS'\) \{\s*return notifications\.filter\(\(n\) => n\.type === 'REGIME'\);/.test(header));
  const hook = readRepoFile('src/hooks/useSystemNotifications.ts');
  t.check('REGIME is the skip notification', /type: 'REGIME',\s*title: '15M Cycle Skipped'/.test(hook));
}

t.section('Discord broadcaster');
{
  const svc = strip(readRepoFile('src/bot/discordBotService.ts'));
  t.check('no broadcaster copy in discordBotService', !svc.includes('broadcastSignalToDiscord') && !svc.includes('% Conf') && !svc.includes('AI Reasoning') && !svc.includes('Brier Calibrated'));
  const index = readRepoFile('src/bot/index.ts');
  t.check('the live broadcaster remains in src/bot/index.ts', index.includes('export async function broadcastSignalToDiscord('));
  t.check('server imports it from ./src/bot', /broadcastSignalToDiscord,[\s\S]{0,400}from "\.\/src\/bot";/.test(serverSrc));
}

t.done();
