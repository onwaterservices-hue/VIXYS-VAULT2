const admin = require("firebase-admin");
const fs = require('fs');

async function run() {
  const serviceAccount = JSON.parse(fs.readFileSync("./firebase-service-account.json", "utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  try {
    const user = await admin.auth().getUserByEmail("harveysantoyo10@gmail.com");
    console.log("Firebase Auth User found:", user.uid);
  } catch (e) {
    console.log("Not in Firebase Auth:", e.message);
  }
}
run();
