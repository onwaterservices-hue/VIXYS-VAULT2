const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'ai-studio-btc15pro15minbtc-5ffd95f2-2d75-456b-8811-6d9cbc0c1c72'
});
const db = admin.firestore();

async function main() {
    const hbSnap = await db.collection("vixy_engine_heartbeat").doc("current").get();
    if (hbSnap.exists) {
        console.log(hbSnap.data());
    } else {
        console.log("No heartbeat found yet.");
    }
}
main().catch(console.error);
