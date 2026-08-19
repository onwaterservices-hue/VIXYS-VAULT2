const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function run() {
  const users = await db.collection('users').where('email', '==', 'vixyvault0@gmail.com').get();
  users.forEach(doc => console.log(doc.id, doc.data()));
}
run().catch(console.error);
