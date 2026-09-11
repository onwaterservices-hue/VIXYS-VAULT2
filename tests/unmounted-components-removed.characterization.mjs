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
  // Also unreachable from src/main.tsx, server.ts, api/ and scripts/ (esbuild
  // metafiles + a type-aware import graph), removed 2026-09-11:
  'src/components/DiscordStatusWidget.tsx',
  'src/bot/embeds/dashboard.ts',
  'src/bot/embeds/prediction.ts',
  'src/bot/services/aiEventRouter.ts',
  'src/config/discordConfig.ts',
  'src/config/env.config.ts',
  'src/services/webhookManager.ts',
  'src/services/engine/geminiExplainer.ts',
  'src/services/market/assetIntelligence.ts',
  'src/services/market/macroMarketIntelligence.ts',
  'src/services/market/venueAdapters.ts',
  'src/utils/metrics.ts',
  'src/utils/numeric.ts',
]) {
  t.check(`${p} stays removed`, !existsSync(join(root, p)));
}
t.check('the live Discord signal embed remains', existsSync(join(root, 'src/bot/embeds/signalEmbed.ts')));
t.check('the mounted VIXY Live cards remain', existsSync(join(root, 'src/components/vixy-live-workspace/ModuleCards.tsx')));

t.done();
