import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, limit, query } from "firebase/firestore";
import * as fs from 'fs';

async function run() {
  const firebaseConfigRaw = fs.readFileSync("./firebase-applet-config.json", "utf-8");
  const firebaseConfig = JSON.parse(firebaseConfigRaw);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  console.log("Checking credentials collection...");
  try {
    const credsSnap = await getDocs(query(collection(db, "kalshi_credentials"), limit(5)));
    console.log("Found:", credsSnap.size);
    credsSnap.forEach(d => {
      console.log(d.id, "configured:", d.data().credentials?.configured);
    });
  } catch (err) {
    console.error("Firestore error:", err);
  }
}
run();
