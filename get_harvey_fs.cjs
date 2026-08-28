const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

async function run() {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  const users = await getDocs(collection(db, "users"));
  users.forEach(d => {
    if (d.data().email?.toLowerCase().includes("harvey")) {
      console.log(`FS User: ${d.id} | Email: ${d.data().email} | UID: ${d.data().uid}`);
    }
  });
  process.exit(0);
}
run();
