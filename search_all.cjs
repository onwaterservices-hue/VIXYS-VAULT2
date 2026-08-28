const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

async function run() {
  const firebaseConfigRaw = fs.readFileSync("./firebase-applet-config.json", "utf-8");
  const firebaseConfig = JSON.parse(firebaseConfigRaw);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  const colls = ["users", "subscriptions", "discordProfiles", "webhook_events"];
  for (const c of colls) {
    console.log("Checking", c);
    const snap = await getDocs(collection(db, c));
    snap.forEach(d => {
      const str = JSON.stringify(d.data()).toLowerCase();
      if (str.includes("sauce420")) {
        console.log("Found in", c, d.id, str);
      }
    });
  }
  process.exit(0);
}
run();
