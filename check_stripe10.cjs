const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

async function run() {
  const firebaseConfigRaw = fs.readFileSync("./firebase-applet-config.json", "utf-8");
  const firebaseConfig = JSON.parse(firebaseConfigRaw);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  const snap = await getDoc(doc(db, "webhook_events", "evt_1U9FbQCYsvFDvgUJ7L37DRdW"));
  if (snap.exists()) {
    console.log("Webhook Event Found:", snap.data());
  } else {
    console.log("Webhook Event NOT FOUND in Firestore!");
  }
  
  process.exit(0);
}
run();
