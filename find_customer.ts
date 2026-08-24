import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  console.log("Reading users from Firestore...");
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log("Total users in Firestore:", usersSnap.size);
  const emails = [];
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.email) {
      emails.push(data.email);
      if (data.email.toLowerCase().includes("selvin") || JSON.stringify(data).includes("Abq65412")) {
        console.log("FOUND USER:", doc.id, data);
      }
    }
  });
  console.log("Firestore emails:", emails.sort());
}

main().catch(console.error);
