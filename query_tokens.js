import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
const serviceAccount = JSON.parse(fs.readFileSync("/app/firebase-applet-config.json", "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
async function run() {
  const snapshot = await db.collection("password_reset_tokens").where("email", "==", "test_reset@example.com").get();
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}
run();
