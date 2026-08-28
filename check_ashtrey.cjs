const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

async function run() {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  const fsUsersSnap = await getDocs(collection(db, "users"));
  const ashUsers = [];
  fsUsersSnap.forEach(d => {
    if (d.data().email && d.data().email.toLowerCase().includes('ashtreyboa')) {
      ashUsers.push({ id: d.id, ...d.data() });
    }
  });
  console.log("ashtreyboa users:", ashUsers);
  process.exit(0);
}
run();
