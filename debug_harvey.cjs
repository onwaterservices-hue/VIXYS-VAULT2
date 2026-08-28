const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, collection, getDocs, query, where } = require("firebase/firestore");
const fs = require('fs');

async function run() {
  const firebaseConfigRaw = fs.readFileSync("./firebase-applet-config.json", "utf-8");
  const firebaseConfig = JSON.parse(firebaseConfigRaw);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const email = "harveysantoyo10@gmail.com";
  
  console.log("Checking Users collection...");
  const q = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(q);
  console.log("Docs found:", snap.size);
  snap.forEach(d => {
    console.log("Doc ID:", d.id);
    console.log("Data:", JSON.stringify(d.data(), null, 2));
  });

  console.log("\nChecking Subscriptions collection...");
  const subSnap = await getDocs(collection(db, "subscriptions"));
  subSnap.forEach(d => {
    if (d.data().customerEmail === email || d.data().email === email) {
      console.log("Sub Doc ID:", d.id);
      console.log("Data:", JSON.stringify(d.data(), null, 2));
    }
  });
}
run();
