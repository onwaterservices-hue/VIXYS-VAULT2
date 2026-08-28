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

  const fsUsers = new Set();
  const uSnap = await getDocs(collection(db, "users"));
  uSnap.forEach(d => fsUsers.add(d.data().email?.toLowerCase()));

  const fsSubs = new Set();
  const sSnap = await getDocs(collection(db, "subscriptions"));
  sSnap.forEach(d => fsSubs.add(d.data().email?.toLowerCase()));

  const subs = await stripe.subscriptions.list({ limit: 100, status: "active" });
  let count = 0;
  let starter = 0;
  let pro = 0;
  let elite = 0;
  
  for (const s of subs.data) {
    const cust = await stripe.customers.retrieve(s.customer);
    const email = cust.email?.toLowerCase();
    
    const hasUser = fsUsers.has(email);
    const hasSub = fsSubs.has(email);
    
    if (!hasUser || !hasSub) {
      count++;
      const priceId = s.items.data[0].price.id;
      if (priceId === process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_STARTER_ANNUAL_PRICE_ID) starter++;
      else if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID) pro++;
      else if (priceId === process.env.STRIPE_ELITE_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_ELITE_ANNUAL_PRICE_ID) elite++;
    }
  }
  
  // also count day passes if possible, but they aren't subscriptions
  const payments = await stripe.paymentIntents.list({ limit: 100 });
  let daypass = 0;
  for (const p of payments.data) {
    if (p.status === 'succeeded' && p.amount === 999) {
      // rough guess for day pass
      const cust = await stripe.customers.retrieve(p.customer);
      if (cust && cust.email && !fsSubs.has(cust.email.toLowerCase())) {
        daypass++;
      }
    }
  }

  console.log(`Affected users: ${count}`);
  console.log(`STARTER: ${starter}`);
  console.log(`PRO: ${pro}`);
  console.log(`ELITE: ${elite}`);
  console.log(`DAY PASS: ${daypass}`);
  process.exit(0);
}
run();
