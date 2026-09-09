// The QUANT MODEL banner must not state numbers it did not observe.
import { readRepoFile, createHarness } from './_engineSource.mjs';
const t = createHarness('quant-banner.characterization');
const code = readRepoFile('src/components/TopNavControls.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
t.check('no "+1,467 BTC" story', !code.includes('1,467'));
t.check('no "91% AI confidence" story', !code.includes('91% AI confidence'));
t.check('no ETH/SOL edge stories', !code.includes('+15.8%') && !code.includes('+18.4%'));
t.check('no CONFIDENCE chip from static config', !code.includes('activeConfig.prediction.confidence'));
t.check('no EDGE chip from static config', !code.includes('activeConfig.prediction.edgePct'));
t.check('banner points to the cycle card as the single source of truth', code.includes('cycle card below'));
t.done();
