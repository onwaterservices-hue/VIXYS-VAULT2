const { initializeApp } = require("firebase/app");
const { getFirestore, setDoc, doc } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require("fs");

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);
const auth = getAuth(app);

async function run() {
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", process.env.FIRESTORE_BACKEND_PASSWORD || process.env.BACKEND_SYSTEM_PASSWORD || "vixy_backend_super_secret_password_2026");
  console.log("Authenticated.");
  
  await setDoc(doc(db, "users", "usr_6704"), { role: "MOD" }, { merge: true });
  console.log('Updated user in Firestore.');
  process.exit(0);
}

run().catch(console.error);
