const fs = require('fs');

const raw = fs.readFileSync('/tmp/vixy_store.json', 'utf8');
const data = JSON.parse(raw);

const engine = data.learningEngine || {};
const history = engine.settledHistory || [];

console.log(`History length: ${history.length}`);
console.log(`Today's settled: ${engine.todaySettledCount || 0}`);
console.log(`Lifetime observations: ${engine.lifetimeObservations || 0}`);

if (history.length > 0) {
  const buckets = {
    '50-66': { count: 0, wins: 0 },
    '66-70': { count: 0, wins: 0 },
    '70-80': { count: 0, wins: 0 },
    '80-90': { count: 0, wins: 0 },
    '90+': { count: 0, wins: 0 }
  };
  for (const h of history) {
    const conf = h.confidence || h.calibratedConfidencePct || 0;
    const wasCorrect = h.wasCorrect === true;
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
    console.log(`History Bucket ${bucket}%: ${stats.count} cycles, ${winRate}% win rate`);
  }
}
