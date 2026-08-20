const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfigRaw = fs.readFileSync('firebase-applet-config.json', 'utf-8');
const firebaseConfig = JSON.parse(firebaseConfigRaw);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

async function check() {
  await signInWithEmailAndPassword(auth, 'backend_system@vixy.local', 'vixy_backend_super_secret_password_2026');
  const q = query(collection(db, 'users'), where('email', '==', 'vixyvault0@gmail.com'));
  const snap = await getDocs(q);
  if (!snap.empty) {
    console.log(snap.docs[0].data());
  } else {
    console.log("No user found");
  }
}
check();

