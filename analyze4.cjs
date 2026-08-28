const fs = require('fs');
const raw = fs.readFileSync('/tmp/vixy_store.json', 'utf8');
const data = JSON.parse(raw);

const logs = (data.signalLogs || []).filter(l => l.status === 'RESOLVED' && l.decision !== 'SKIP');
console.log(`Real Settled Trades in signalLogs: ${logs.length}`);

for (const log of logs) {
  console.log(`Conf: ${log.confidence}, Pred: ${log.direction}, Actual: ${log.actualOutcome}, Correct: ${log.wasCorrect}`);
}

const history = (data.learningEngine?.settledHistory || []).filter(h => h.prediction !== "SKIP" && h.prediction !== "NEUTRAL");
console.log(`\nReal Settled Trades in history: ${history.length}`);
for (const h of history) {
  console.log(`Conf: ${h.confidence}, Pred: ${h.prediction}, Actual: ${h.actualOutcome}, Brier: ${h.brierScore}`);
}
