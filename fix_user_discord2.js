const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
    projectId: "ai-studio-btc15pro15minbtc-5ffd95f2-2d75-456b-8811-6d9cbc0c1c72"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    await setDoc(doc(db, "users", "usr_v5q0p6r"), { discordId: "123456789", discordLinked: true }, { merge: true });
    console.log("Updated");
}
run();
