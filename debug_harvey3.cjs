const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

async function run() {
  const firebaseConfigRaw = fs.readFileSync("./firebase-applet-config.json", "utf-8");
  const firebaseConfig = JSON.parse(firebaseConfigRaw);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  console.log("Checking ALL Users collection...");
  const snap = await getDocs(collection(db, "users"));
  snap.forEach(d => {
    if (d.id.includes("harvey") || (d.data().email && d.data().email.includes("harvey"))) {
      console.log("Doc ID:", d.id);
      console.log("Data:", JSON.stringify(d.data(), null, 2));
    }
  });

  process.exit(0);
}
run();
