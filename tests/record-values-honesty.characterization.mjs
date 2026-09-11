// CHARACTERIZATION -- ledger rows and user records store what happened, or null.
//
// - LOCKED ledger rows were stamped dataSource "COINBASE_KRAKEN_CASCADE" and
//   latencyMs 12 whatever fed the price (SKIP rows were fixed earlier; the
//   lock row kept both literals).
// - SKIP / NO_TRADE rows fell back to probability 50 and lockedProbability 50
//   (the field is 0-1, so also the wrong scale) and confidence 0.
// - Restoring a lock from the store fell back to confidence 75 and p 0.5.
// - User records were given a random "hw_xxxxxx" / "hw_sub_" / "hw_auto_"
//   device fingerprint and an invented IP ("172.x.x.10", "172.56.22.10",
//   "127.0.0.1"); AdminPanel lists fingerprints as device data. A random
//   fingerprint never matches another user, so the duplicate check at signup
//   could never fire.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('record-values-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('ledger rows');
t.check('no constant lock latency', !/latencyMs:\s*12\b/.test(code));
t.check('no literal cascade data source', !code.includes('COINBASE_KRAKEN_CASCADE'));
t.check('lock row names the feed that priced it', code.includes('dataSource: marketFeedHealth.priceSource || null,\n      latencyMs: null,\n      cycleId,'));
t.check('no probability 50 fallback on skip rows', !/robability \|\| 50\b/.test(code));
t.eq('skip rows keep p null when unknown', (code.match(/probability: active15mCycle\.livePrediction\?\.probability \?\? null,/g) || []).length, 2);
t.check('no confidence 0 fallback on skip rows', !/confidence(Pct)?: active15mCycle\.livePrediction\?\.confidence \|\| 0,/.test(code));

t.section('lock hydration');
t.check('no confidence 75 / p 0.5 fallback', !/mostRecentLog\.confidence \|\| 75|mostRecentLog\.probability \|\| 0\.5/.test(code));
t.check('recorded values or null', code.includes('active15mCycle.lockedConfidence = mostRecentLog.confidence ?? null;') && code.includes('active15mCycle.lockedProbability = mostRecentLog.probability ?? null;'));

t.section('user records');
t.check('no invented fingerprints', !/`hw_\$\{|hw_sub_|hw_auto_|"hw_anon"/.test(code));
t.check('no invented IPs', !/ipHash:\s*"(127\.0\.0\.1|172\.56\.22\.10)"|`172\.\$\{/.test(code) && !/ipHash: userData\.ipHash \|\| "127/.test(code));
{
  const m = code.match(/const genHwFingerprint = hardwareFingerprint \|\| null;[\s\S]*?const isDupFingerprint = [\s\S]*?\);/);
  t.check('signup dedup block found', !!m);
  const dedup = (hardwareFingerprint, ipAddress, serverUsers, cleanEmail) =>
    new Function('hardwareFingerprint', 'ipAddress', 'serverUsers', 'cleanEmail', `${m[0]} return { genHwFingerprint, genIpHash, isDupFingerprint };`)(hardwareFingerprint, ipAddress, serverUsers, cleanEmail);
  const users = [{ email: 'a@x.com', hardwareFingerprint: 'fp-real-1' }];
  const none = dedup(undefined, undefined, users, 'b@x.com');
  t.eq('no fingerprint sent: stored null', none.genHwFingerprint, null);
  t.eq('no IP sent: stored null', none.genIpHash, null);
  t.eq('no fingerprint sent: not flagged duplicate', none.isDupFingerprint, false);
  t.eq('real matching fingerprint: flagged duplicate', dedup('fp-real-1', '10.0.0.1', users, 'b@x.com').isDupFingerprint, true);
  t.eq('real new fingerprint: not flagged', dedup('fp-real-2', '10.0.0.1', users, 'b@x.com').isDupFingerprint, false);
}

t.done();
