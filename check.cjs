const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const ref = doc(db, 'users', 'usr_azar45157_gmail_com');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    console.log("User subscription:", snap.data().subscription);
  } else {
    console.log("Not found");
  }
  process.exit(0);
}
check();
