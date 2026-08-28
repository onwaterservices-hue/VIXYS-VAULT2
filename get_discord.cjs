const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const fs = require('fs');

async function run() {
  const firebaseConfigRaw = fs.readFileSync("./firebase-applet-config.json", "utf-8");
  const firebaseConfig = JSON.parse(firebaseConfigRaw);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const snap = await getDocs(collection(db, "discordProfiles"));
  snap.forEach(d => {
    const data = d.data();
    console.log(d.id, data.username, data.global_name, data.email);
  });
  process.exit(0);
}
run();
