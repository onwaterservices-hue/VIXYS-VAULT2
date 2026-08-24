const admin = require('firebase-admin');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = admin.initializeApp({
  projectId: config.projectId,
  credential: admin.credential.applicationDefault()
});
const db = admin.firestore();
// Since ADC uses the host project, it'll fail. We should use the REST API.
