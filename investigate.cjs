const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, getDoc } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

async function run() {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  console.log("=========================================");
  console.log("SERGIO INVESTIGATION");
  console.log("=========================================");
  
  const sergioEmail = "sergioaddiaz1711@icloud.com";
  // 1. Stripe Customer
  const sergioCusts = await stripe.customers.search({ query: `email:"${sergioEmail}"` });
  for (const c of sergioCusts.data) {
    console.log(`Stripe Customer ID: ${c.id}`);
    console.log(`Customer Email: ${c.email}`);
    // Subscriptions
    const subs = await stripe.subscriptions.list({ customer: c.id });
    for (const s of subs.data) {
      console.log(`  Sub: ${s.id} | Status: ${s.status} | Price: ${s.items.data[0].price.id}`);
    }
  }
  
  // 2. Firestore User
  const usersSnap = await getDocs(collection(db, "users"));
  let sergioFs = null;
  usersSnap.forEach(d => {
    if (d.data().email?.toLowerCase() === sergioEmail) {
      sergioFs = { id: d.id, ...d.data() };
      console.log(`Firestore User Found! UID: ${d.id}, Email: ${d.data().email}`);
    }
  });
  if (!sergioFs) {
     console.log(`No exact Firestore User found for ${sergioEmail}`);
  }

  // 3. Firestore Subscriptions
  if (sergioFs) {
    const subDoc = await getDoc(doc(db, "subscriptions", sergioFs.id));
    if (subDoc.exists()) {
      console.log(`Firestore Sub Found! Status: ${subDoc.data().status}`);
    } else {
      console.log(`No Firestore Sub document found for user ${sergioFs.id}`);
    }
  }


  console.log("\n=========================================");
  console.log("IGOTTHESAUCE420 INVESTIGATION");
  console.log("=========================================");
  
  // They laid "25 for the month" - starter tier?
  // Let's search recent sessions for any with a discord ID or name resembling igotthesauce
  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  let foundSauce = false;
  for (const s of sessions.data) {
    const str = JSON.stringify(s).toLowerCase();
    if (str.includes("sauce420") || str.includes("igotthesauce") || str.includes("sauce")) {
      console.log(`Found Session: ${s.id}`);
      console.log(`Email: ${s.customer_details?.email}`);
      console.log(`Amount: ${s.amount_total}`);
      console.log(`Customer: ${s.customer}`);
      foundSauce = true;
    }
  }
  
  // check customers metadata for discord
  const custs = await stripe.customers.list({ limit: 100 });
  for (const c of custs.data) {
    const str = JSON.stringify(c).toLowerCase();
    if (str.includes("sauce420") || str.includes("igotthesauce") || str.includes("sauce")) {
      console.log(`Found Customer: ${c.id}, Email: ${c.email}, Name: ${c.name}`);
      foundSauce = true;
    }
  }

  if (!foundSauce) {
    console.log("NO CONFIDENT MATCH FOR IGOTTHESAUCE420. NEEDS MANUAL REVIEW.");
  }


  console.log("\n=========================================");
  console.log("32 ORPHANED STRIPE SUBSCRIPTIONS");
  console.log("=========================================");
  
  // We need to list active stripe subs, and see if they exist in Firestore
  const activeSubs = await stripe.subscriptions.list({ limit: 100, status: "active" });
  const fsUsersByEmail = new Map();
  usersSnap.forEach(d => {
    if (d.data().email) fsUsersByEmail.set(d.data().email.toLowerCase(), d.id);
  });
  
  const fsSubs = new Set();
  const subSnap = await getDocs(collection(db, "subscriptions"));
  subSnap.forEach(d => fsSubs.add(d.id));

  let orphans = [];
  for (const s of activeSubs.data) {
    const cust = await stripe.customers.retrieve(s.customer);
    const email = cust.email?.toLowerCase();
    
    let fsUid = fsUsersByEmail.get(email);
    let fsSubMatch = fsUid ? fsSubs.has(fsUid) : false;
    
    if (!fsUid || !fsSubMatch) {
       orphans.push({
         customerId: cust.id,
         customerEmail: email,
         subId: s.id,
         status: s.status,
         price: s.items.data[0].price.id,
         created: new Date(s.created * 1000).toISOString(),
         fsUidMatch: fsUid || null,
         fsSubMatch: fsSubMatch
       });
    }
  }
  
  for (const o of orphans) {
    let recommendation = "NEEDS MANUAL REVIEW";
    let confidence = "LOW";
    if (o.fsUidMatch && !o.fsSubMatch) {
      recommendation = "CREATE FIRESTORE ENTITLEMENT FOR EXISTING USER";
      confidence = "HIGH (SAFE MATCH)";
    } else if (!o.fsUidMatch) {
      // Is there a similar email? Or no user at all?
      recommendation = "WAITING FOR CUSTOMER VIXY LOGIN (MISSING USER RECORD)";
      confidence = "N/A";
    }
    console.log(`Customer: ${o.customerId} | Email: ${o.customerEmail}`);
    console.log(`Sub: ${o.subId} | Price: ${o.price} | Created: ${o.created}`);
    console.log(`VIXY User ID: ${o.fsUidMatch || 'NONE'} | Firestore Sub: ${o.fsSubMatch}`);
    console.log(`Recommendation: ${recommendation} | Confidence: ${confidence}`);
    console.log("---");
  }

  process.exit(0);
}
run();
