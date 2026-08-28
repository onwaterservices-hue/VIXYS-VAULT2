const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

const candidates = [
  "jessehuber54@gmail.com",
  "oreoromp@gmail.com",
  "maxo1011@outlook.com",
  "vksminhkaka@gmail.com",
  "adriiiansf27@gmail.com",
  "joel116569@gmail.com"
];

async function run() {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  const fsUsersSnap = await getDocs(collection(db, "users"));
  const allUsers = [];
  fsUsersSnap.forEach(d => allUsers.push({ id: d.id, ...d.data() }));

  for (const c of candidates) {
    const userDocs = allUsers.filter(u => u.email && u.email.toLowerCase() === c);
    console.log(`\nCandidate: ${c}`);
    console.log(`Matching doc count: ${userDocs.length}`);
    userDocs.forEach(u => {
      console.log(`- DocID: ${u.id}, Role: ${u.role}, Sub: ${u.subscription}, GrantSource: ${u.grantSource || 'NONE'}, CustId: ${u.stripeCustomerId}, SubId: ${u.stripeSubscriptionId}`);
    });
  }
  process.exit(0);
}
run();
