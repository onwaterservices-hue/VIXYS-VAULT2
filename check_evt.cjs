const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

async function run() {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  const eventIds = [
    "evt_1U9FbQCYsvFDvgUJ7L37DRdW",
    "evt_1U9FbPCYsvFDvgUJml8kbNHA",
    "evt_1U9E3NCYsvFDvgUJMst5ND1F",
    "evt_1U9DIqCYsvFDvgUJQtccD56m",
    "evt_1U9CPSCYsvFDvgUJO7zhaVYC"
  ];
  for (const id of eventIds) {
    const d = await getDoc(doc(db, "webhook_events", id));
    console.log(`Event ${id} in Firestore: ${d.exists()}`);
  }
  process.exit(0);
}
run();
