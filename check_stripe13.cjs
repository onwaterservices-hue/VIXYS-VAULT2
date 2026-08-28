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

  const usersSnap = await getDocs(collection(db, "users"));
  usersSnap.forEach(d => {
    if (JSON.stringify(d.data()).toLowerCase().includes("harvey")) {
      console.log("Found in users:", d.id);
    }
  });

  const subSnap = await getDocs(collection(db, "subscriptions"));
  subSnap.forEach(d => {
    if (JSON.stringify(d.data()).toLowerCase().includes("harvey")) {
      console.log("Found in subscriptions:", d.id);
    }
  });

  process.exit(0);
}
run();
