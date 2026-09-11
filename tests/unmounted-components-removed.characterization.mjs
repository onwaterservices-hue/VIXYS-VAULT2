// Components nothing imported, several of which carried fabricated fallbacks
// (spot 64,591.20 / 77,141.09 / 64,250 / 78,800 / 64,376.65, a 72 confidence
// default, whale prints at fixed offsets, a static signal matrix). They were
// removed rather than repaired; this keeps them from quietly returning.
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHarness } from './_engineSource.mjs';

const t = createHarness('unmounted-components-removed.characterization');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const p of [
  'src/components/vixy-live',
  'src/components/brains',
  'src/components/MultiVenueIntelligencePanel.tsx',
  'src/components/VixyAiStatusCard.tsx',
  'src/components/DecisionEngineDiagnostics.tsx',
  'src/components/CompactSignalChart.tsx',
  'src/components/DiscordCompactBadge.tsx',
  'src/components/PredictionHealthWatch.tsx',
  'src/components/TradeExecutionGuard.tsx',
  'src/components/VaultCard.tsx',
  'src/components/VixyPerformanceMatrix.tsx',
  'src/components/LiveScalpChart.tsx',
  'src/services/workspaceService.ts',
  'src/services/streamManager.ts',
  'src/utils/visualState.ts',
  'src/utils/cryptoUniverseRegression.ts',
]) {
  t.check(`${p} stays removed`, !existsSync(join(root, p)));
}
t.check('the mounted VIXY Live cards remain', existsSync(join(root, 'src/components/vixy-live-workspace/ModuleCards.tsx')));

t.done();
