const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

async function run() {
  const firebaseConfigRaw = fs.readFileSync("./firebase-applet-config.json", "utf-8");
  const firebaseConfig = JSON.parse(firebaseConfigRaw);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  // Get firestore users and subs
  const fsUsers = new Set();
  const uSnap = await getDocs(collection(db, "users"));
  uSnap.forEach(d => fsUsers.add(d.data().email?.toLowerCase()));

  const fsSubs = new Set();
  const sSnap = await getDocs(collection(db, "subscriptions"));
  sSnap.forEach(d => fsSubs.add(d.data().email?.toLowerCase()));

  const subs = await stripe.subscriptions.list({ limit: 100, status: "active" });
  for (const s of subs.data) {
    const cust = await stripe.customers.retrieve(s.customer);
    const email = cust.email?.toLowerCase();
    
    // Does this email exist in Firestore?
    const hasUser = fsUsers.has(email);
    const hasSub = fsSubs.has(email);
    
    if (!hasUser || !hasSub) {
      console.log(`Mismatch: Email ${email} | Name: ${cust.name} | FS User: ${hasUser} | FS Sub: ${hasSub} | Price: ${s.items.data[0].price.id}`);
    }
  }
  process.exit(0);
}
run();
