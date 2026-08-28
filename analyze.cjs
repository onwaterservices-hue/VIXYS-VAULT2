const fs = require('fs');

const raw = fs.readFileSync('/tmp/vixy_store.json', 'utf8');
const data = JSON.parse(raw);

const logs = data.signalLogs || [];
const settledLogs = logs.filter(l => l.status === 'RESOLVED');

console.log(`Total logs: ${logs.length}`);
console.log(`Settled logs: ${settledLogs.length}`);

const buckets = {
  '50-66': { count: 0, wins: 0 },
  '66-70': { count: 0, wins: 0 },
  '70-80': { count: 0, wins: 0 },
  '80-90': { count: 0, wins: 0 },
  '90+': { count: 0, wins: 0 }
};

for (const log of settledLogs) {
  const conf = log.confidence || log.confidencePct || log.calibratedConfidencePct || log.lockedConfidence || 0;
  const wasCorrect = log.wasCorrect === true || String(log.wasCorrect) === "true";
  
  let bucket = '50-66';
  if (conf >= 90) bucket = '90+';
  else if (conf >= 80) bucket = '80-90';
  else if (conf >= 70) bucket = '70-80';
  else if (conf >= 66) bucket = '66-70';
  
  buckets[bucket].count++;
  if (wasCorrect) buckets[bucket].wins++;
}

for (const [bucket, stats] of Object.entries(buckets)) {
  const winRate = stats.count > 0 ? (stats.wins / stats.count * 100).toFixed(1) : 0;
  console.log(`Bucket ${bucket}%: ${stats.count} cycles, ${winRate}% win rate`);
}
