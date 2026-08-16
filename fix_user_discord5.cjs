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
        await setDoc(doc(db, "discord_profiles", "ludinvelasquez47@gmail.com"), { discordUserId: "123456789", connected: true, roles: ["PRO"], inServer: true }, { merge: true });
        console.log("Updated profile");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
