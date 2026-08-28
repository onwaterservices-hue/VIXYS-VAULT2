import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  projectId: "ai-studio-btc15pro15minbtc-5ffd95f2-2d75-456b-8811-6d9cbc0c1c72"
});
const db = getFirestore(app);

async function run() {
  console.log("Checking credentials collection...");
  try {
    const credsSnap = await db.collection("kalshi_credentials").limit(5).get();
    console.log("Found:", credsSnap.size);
    credsSnap.forEach(doc => {
      console.log(doc.id, "configured:", doc.data().credentials?.configured);
    });
  } catch (err) {
    console.error("Firestore error:", err);
  }
}
run();
