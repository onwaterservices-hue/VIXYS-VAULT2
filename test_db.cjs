const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const app = initializeApp({
  projectId: 'ai-studio-btc15pro15minbtc-5ffd95f2-2d75-456b-8811-6d9cbc0c1c72'
});
const db = getFirestore(app);

async function run() {
  const email = 'test_daypass_grace@example.com';
  const docSnap = await getDoc(doc(db, 'day_passes', email));
  console.log("Day Pass in DB:", docSnap.data());
  process.exit(0);
}

run();
