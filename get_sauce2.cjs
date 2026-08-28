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

  const snap = await getDocs(collection(db, "discordProfiles"));
  snap.forEach(d => {
    if (JSON.stringify(d.data()).toLowerCase().includes("igotthesauce420")) {
      console.log("Found in discordProfiles:", d.id, JSON.stringify(d.data()));
    }
  });

  process.exit(0);
}
run();
