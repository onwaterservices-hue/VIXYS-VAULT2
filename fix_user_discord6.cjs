const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfigRaw = require('fs').readFileSync('firebase-applet-config.json', 'utf-8');
const firebaseConfig = JSON.parse(firebaseConfigRaw);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
    try {
        await signInWithEmailAndPassword(auth, 'backend_system@vixy.local', 'vixy_backend_super_secret_password_2026');
        console.log("Authenticated");
        await setDoc(doc(db, "users", "usr_v5q0p6r"), { discordUserId: "123456789", discordLinked: true }, { merge: true });
        console.log("Updated user");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
