const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function run() {
  initializeApp({
    credential: applicationDefault(),
    projectId: "btc15-pro--prediction-terminal"
  });
  const db = getFirestore("ai-studio-btc15pro15minbtc-5ffd95f2-2d75-456b-8811-6d9cbc0c1c72");
  const snapshot = await db.collection('signal_logs').orderBy('resolvedAt', 'desc').limit(100).get();
  let up = 0, down = 0, other = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.direction === 'UP') up++;
    else if (data.direction === 'DOWN') down++;
    else other++;
  });
  console.log(`Total: ${snapshot.size} | UP: ${up} | DOWN: ${down} | OTHER: ${other}`);
}
run().catch(console.error);
