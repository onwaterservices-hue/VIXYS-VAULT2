// Single source of truth mapping each internal tab key to its real, public URL.
// Internal tab keys (used everywhere else in the app as `activeTab === '...'`)
// are unchanged by this file — this only controls what shows in the address bar.
export const TAB_TO_PATH: Record<string, string> = {
  hub: '/hub',
  landing: '/',
  terminal: '/dashboard',
  vixylive: '/vixy-live',
  compare: '/asset-compare',
  scalping: '/scalping-desk',
  onehour: '/1-hour-desk',
  history: '/vixy-locks',
  scanner: '/edge-scanner',
  markets: '/markets',
  patterns: '/pattern-engine',
  whales: '/whale-tracker',
  explainability: '/explainability-vault',
  perflab: '/performance-war-room',
  coach: '/vixy-coach',
  replay: '/replay-center',
  journal: '/trade-journal',
  alerts: '/alerts',
  settings: '/settings',
  admin: '/admin',
  pricing: '/pricing',
  auth: '/auth',
  terms: '/terms',
  privacy: '/privacy',
  risk: '/risk',
  refunds: '/refunds',
  contact: '/contact',
  about: '/about',
  'discord-bot': '/discord-bot',
  'vixy-learning': '/vixy-learning-center',
  leaderboard: '/leaderboard',
  changelog: '/system-status',
};

export const PATH_TO_TAB: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_TO_PATH).map(([tab, path]) => [path.replace(/^\//, ''), tab])
);
