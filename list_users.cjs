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
  let found = false;
  users.forEach(d => {
    if (d.data().email?.toLowerCase() === "harveysantoyo10@gmail.com") {
      console.log(`Exact match FS User: ${d.id} | Email: ${d.data().email}`);
      found = true;
    }
  });
  if (!found) {
    console.log("No exact match found, but here are some users:");
    let i = 0;
    users.forEach(d => {
        if(i < 5) console.log(d.data().email);
        i++;
    });
  }
  process.exit(0);
}
run();
