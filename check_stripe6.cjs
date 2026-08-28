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

  const email = "harveysantoyo@icloud.com";
  const q = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(q);
  console.log("Docs found for iCloud:", snap.size);
  snap.forEach(d => {
    console.log("Data:", JSON.stringify(d.data(), null, 2));
  });
  
  const subSnap = await getDocs(collection(db, "subscriptions"));
  subSnap.forEach(d => {
    if (d.data().email === email || d.data().customerEmail === email) {
      console.log("Sub Data:", JSON.stringify(d.data(), null, 2));
    }
  });

  process.exit(0);
}
run();
