import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
const serviceAccount = JSON.parse(fs.readFileSync("/app/firebase-applet-config.json", "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
async function run() {
  const email = process.argv[2];
  const snap = await db.collection("password_reset_tokens").where("email", "==", email).orderBy("createdAt", "desc").limit(1).get();
  if (snap.empty) {
    console.log("NO_TOKEN");
  } else {
    console.log(snap.docs[0].id);
  }
}
run();
