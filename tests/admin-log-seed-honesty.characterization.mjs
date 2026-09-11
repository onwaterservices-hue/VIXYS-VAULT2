// CHARACTERIZATION -- admin logs, tickets and calibration boot empty, not staged.
//
// Every cold instance served invented admin records:
//   /api/admin/audit-logs       an ADMIN_LOGIN "Master Admin authenticated with
//                               Level 0 Clearance" under the owner's email, a role
//                               promotion of trader.alex@gmail.com, a Stripe renewal
//                               for quant.sarah@optionstrade.io, a bot health check
//   /api/admin/support-tickets  three staged tickets dated 2026-08-05..11
//   /api/admin/diagnostics      recentLogs "Engine Cycle #287 executed successfully",
//                               "L2 Order Flow Delta spike (+1,420 BTC)", and a
//                               calibration seed of 0.685 / 0.685 / 88.9% accuracy
//   /api/admin/stats            predictionsGeneratedToday / aiRequestsToday =
//                               engineLogs.length (3 seeds + every 20th cycle)
import { serverSrc, readRepoFile, sliceBetween, createHarness } from './_engineSource.mjs';

const t = createHarness('admin-log-seed-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('boot seeds are empty');
// Staged sentences are matched whole: the OWNER-only batch-manual-grant list is
// entitlement configuration and is out of scope here.
t.check('engineLogs boots empty', /^const engineLogs = \[\];$/m.test(serverSrc));
t.check('serverAuditLogs boots empty', /^const serverAuditLogs = \[\];$/m.test(serverSrc));
t.check('serverSupportTickets boots empty', /^const serverSupportTickets = \[\];$/m.test(serverSrc));
for (const staged of [
  'Engine Cycle #287', 'L2 Order Flow Delta spike', 'Level 0 Clearance', 'Promoted trader.alex@gmail.com to ELITE_PASS',
  'Pro Pass renewed for quant.sarah@optionstrade.io', 'Discord signal broadcaster synced successfully',
  'Kalshi API Latency Spike during 15M Candle Lock', 'Stripe Webhook Event Entitlement Resync Request',
  'Pro Pass Annual Billing Inquiry',
]) t.check(`no staged entry in code: ${staged}`, !code.includes(staged));

t.section('calibration seed (real code)');
{
  const calSrc = sliceBetween(serverSrc, 'let latestCalibrationState = {', 'let latestGuardianDecision = {', 'calibration seed');
  const cal = new Function(`${calSrc}; return latestCalibrationState;`)();
  t.eq('boot rawModelProbability is null (was 0.685)', cal.rawModelProbability, null);
  t.eq('boot calibratedModelProbability is null (was 0.685)', cal.calibratedModelProbability, null);
  t.eq('boot historicalAccuracy is null (was 88.9)', cal.historicalAccuracy, null);
  t.eq('boot calibrationSampleSize is 0', cal.calibrationSampleSize, 0);
}

t.section('recorded events are the only entries (real code)');
{
  const addSrc = sliceBetween(serverSrc, 'function addServerAuditLog(', '__name(addServerAuditLog', 'addServerAuditLog');
  const audit = new Function(`const serverAuditLogs = [];\n${addSrc}\naddServerAuditLog("ADMIN", "ROLE_UPDATED", "test");\nreturn serverAuditLogs;`)();
  t.eq('one recorded audit event -> one entry', audit.length, 1);
  t.eq('...and it is that event', audit[0] && audit[0].action, 'ROLE_UPDATED');
  const pushSrc = sliceBetween(serverSrc, 'function pushEngineLog(', '__name(pushEngineLog', 'pushEngineLog');
  const logs = new Function(`const engineLogs = [];\n${pushSrc}\npushEngineLog("WARN", "test");\nreturn engineLogs;`)();
  t.eq('one pushed engine log -> one entry', logs.length, 1);
}

t.section('admin stats count only what they count');
t.check('predictionsGeneratedToday is not the log length', /predictionsGeneratedToday: null,/.test(serverSrc) && !/predictionsGeneratedToday: engineLogs\.length/.test(code));
t.check('aiRequestsToday is not the log length', /aiRequestsToday: null,/.test(serverSrc) && !/aiRequestsToday: engineLogs\.length/.test(code));

t.section('admin panel says when nothing is recorded');
{
  const panel = readRepoFile('src/components/AdminPanel.tsx');
  t.eq('dashboard card and audit section both have an empty state',
    (panel.match(/No audit events recorded by this server instance yet\./g) || []).length, 2);
  t.check('audit section says the log is per instance and not a complete history',
    panel.includes('are held in memory per server instance, so this list is not'));
  t.check('tickets list has an empty state', panel.includes('No support tickets recorded.'));
}

t.done();
