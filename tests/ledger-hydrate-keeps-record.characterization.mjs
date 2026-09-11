// CHARACTERIZATION -- loading the store keeps each settled row's recorded confidence and Brier.
//
// loadPersistentStore rewrote every RESOLVED signal log as it loaded: confidence
// and confidencePct became 68.5 + |p - 0.5| * 8 - reversalRisk * 0.05 clamped to
// 66-73 (or 41.8 + |p - 0.5| * 5 clamped to 40-45 when lock timing and strike
// distance looked "bad"), p defaulted to 0.68, and brierScore was recomputed from
// that invented confidence. A 93-confidence win came back as 73 with Brier 0.073.
// The rows are then persisted again, so the rewrite would outlive the load.
import { transformSync } from 'esbuild';
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('ledger-hydrate-keeps-record.characterization');
const src = readRepoFile('src/services/persistentStoreLoaders.ts');
const { code } = transformSync(src, { loader: 'ts', format: 'cjs' });
const mod = { exports: {} };
new Function('module', 'exports', 'require', code)(mod, mod.exports, () => ({}));

const win = {
  id: 'sig_lock_win', status: 'RESOLVED', confidence: 93, confidencePct: 93, brierScore: 0.005,
  probability: 0.93, wasCorrect: true, intervalStart: '2026-09-11T13:00:00.000Z',
  lockedAt: '2026-09-11T13:07:00.000Z', spotAtLock: 80120, strike: 80000,
};
const loss = {
  id: 'sig_lock_loss', status: 'RESOLVED', confidence: 88, confidencePct: 88, brierScore: 0.774,
  wasCorrect: false, intervalStart: '2026-09-11T12:45:00.000Z', lockedAt: '2026-09-11T12:46:00.000Z',
};
const noProb = { id: 'sig_lock_noprob', status: 'RESOLVED', confidence: null, brierScore: null, wasCorrect: true };
const locked = { id: 'sig_lock_open', status: 'LOCKED', confidence: 90 };
const store = { signalLogs: [win, loss, noProb, locked] };

const persistentSignalLogs = [];
const origLog = console.log; console.log = () => {};
try {
  mod.exports.loadPersistentStore({
    fs: { existsSync: () => true, readFileSync: () => JSON.stringify(store) },
    STORE_FILE_PATH: '/tmp/vixy-store.json', db: null, disableNetwork: () => Promise.resolve(),
    serverUsers: [], userDiscordProfiles: new Map(), userSubscriptions: new Map(), userDayPasses: new Map(),
    persistentSignalLogs, persistentTelemetryObservations: [], discordSyncQueue: [], discordSyncMetrics: {},
    latestCalibrationState: {}, serverLearningEngine: {}, productionMaintenanceState: {},
  });
} finally { console.log = origLog; }

const byId = (id) => persistentSignalLogs.find((r) => r.id === id) || {};
t.eq('all rows loaded', persistentSignalLogs.length, 4);
t.eq('win keeps recorded confidence', byId('sig_lock_win').confidence, 93);
t.eq('win keeps recorded confidencePct', byId('sig_lock_win').confidencePct, 93);
t.eq('win keeps recorded Brier', byId('sig_lock_win').brierScore, 0.005);
t.eq('loss keeps recorded confidence', byId('sig_lock_loss').confidence, 88);
t.eq('loss keeps recorded Brier', byId('sig_lock_loss').brierScore, 0.774);
t.eq('a row with no recorded confidence gets none invented', byId('sig_lock_noprob').confidence, null);
t.eq('a row with no recorded Brier gets none invented', byId('sig_lock_noprob').brierScore, null);
t.eq('open lock untouched', byId('sig_lock_open').confidence, 90);

const stripped = src.replace(/\/\/[^\n]*/g, '');
t.check('no hand formula in the loader', !/68\.5|41\.8|calibratedConf|\|\| 0\.68/.test(stripped));

t.done();
