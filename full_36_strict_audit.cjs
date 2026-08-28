const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

async function run() {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  const fsUsersSnap = await getDocs(collection(db, "users"));
  const fsUsers = [];
  fsUsersSnap.forEach(d => fsUsers.push({ id: d.id, ...d.data() }));

  const fsSubsSnap = await getDocs(collection(db, "subscriptions"));
  const fsSubs = [];
  fsSubsSnap.forEach(d => fsSubs.push({ id: d.id, ...d.data() }));

  const allStripeSubs = [];
  let hasMore = true;
  let startingAfter = undefined;
  while (hasMore) {
    const list = await stripe.subscriptions.list({
      limit: 100,
      status: 'all',
      starting_after: startingAfter,
      expand: ['data.customer']
    });
    allStripeSubs.push(...list.data);
    hasMore = list.has_more;
    if (hasMore && list.data.length > 0) {
      startingAfter = list.data[list.data.length - 1].id;
    }
  }

  const activeSubs = allStripeSubs.filter(s => s.status === 'active' || s.status === 'trialing');

  const hardcodedList = [
    "ogaccount85@gmail.com",
    "ogacount85@gmail.com",
    "selvinrom1.6@gmail.com",
    "ludinvelasquez47@gmail.com",
    "wasan@cartwrightrn.com",
    "vixyvault0@gmail.com",
    "onwaterservices@gmail.com"
  ];

  const table = [];

  for (let i = 0; i < activeSubs.length; i++) {
    const s = activeSubs[i];
    const cust = s.customer;
    const custId = typeof cust === 'string' ? cust : cust?.id;
    const custEmail = (typeof cust === 'object' && cust?.email ? cust.email : '').toLowerCase().trim();
    const priceId = s.items?.data?.[0]?.price?.id || 'NONE';
    
    let plan = 'STARTER';
    if (priceId === 'price_1Tz7MvCYsvFDvgUJvV3T99wY' || priceId.includes('PRO')) plan = 'PRO';
    else if (priceId === 'price_1Tz7NKCYsvFDvgUJoVq0eP1Q' || priceId.includes('ELITE')) plan = 'ELITE';
    else if (priceId === 'price_1Tz7MWCYsvFDvgUJCLaiMRWE' || priceId.includes('STARTER')) plan = 'STARTER';

    // Find users
    const matchedUsers = custEmail ? fsUsers.filter(u => u.email && u.email.toLowerCase() === custEmail) : [];
    const matchedByCustId = fsUsers.filter(u => u.stripeCustomerId === custId);
    
    const user = matchedUsers[0] || matchedByCustId[0] || null;
    const exactMatch = Boolean(matchedUsers.length === 1);
    const hasOverride = hardcodedList.includes(custEmail);
    const fsSub = fsSubs.find(sub => sub.id === s.id || sub.stripeSubscriptionId === s.id || (custEmail && sub.email && sub.email.toLowerCase() === custEmail));

    let conflictingEntitlement = 'NO';
    if (hasOverride) {
      conflictingEntitlement = 'YES (Hardcoded Server Override)';
    } else if (user && user.grantSource === 'MANUAL_GRANT') {
      conflictingEntitlement = 'YES (Manual Grant in Firestore)';
    } else if (user && user.stripeCustomerId && user.stripeCustomerId.startsWith('cus_venmo_')) {
      conflictingEntitlement = 'YES (Venmo Mock Cust ID)';
    } else if (matchedUsers.length > 1) {
      conflictingEntitlement = 'YES (Duplicate User Records)';
    }

    let recAction = 'MANUAL REVIEW';
    if (custEmail === 'harveysantoyo10@gmail.com' || custEmail === 'harveysantoyo@icloud.com' || s.id === 'sub_1U9FbOCYsvFDvgUJylDMKoyj') {
      recAction = 'RECOVERED (Harvey)';
    } else if (custEmail === 'sergioaddiaz1711@icloud.com' || s.id === 'sub_1U6MrLCYsvFDvgUJtFO3OV3Q') {
      recAction = 'RECOVERED (Sergio)';
    } else if (hasOverride) {
      recAction = 'DO NOT TOUCH (Hardcoded Override)';
    } else if (exactMatch && conflictingEntitlement === 'NO') {
      recAction = 'SAFE AUTO-RECOVERY';
    } else if (!user) {
      recAction = 'MANUAL REVIEW (No VIXY Account)';
    } else if (matchedUsers.length > 1) {
      recAction = 'MANUAL REVIEW (Duplicate Accounts)';
    } else {
      recAction = `MANUAL REVIEW (${conflictingEntitlement})`;
    }

    table.push({
      num: i + 1,
      stripeCustId: custId,
      stripeEmail: custEmail || 'NONE',
      stripeSubId: s.id,
      stripePriceId: priceId,
      stripePlan: plan,
      subStatus: s.status,
      createdDate: new Date(s.created * 1000).toISOString().split('T')[0],
      hasVixyUser: user ? 'YES' : 'NO',
      vixyUserId: user ? (user.id || user.uid) : 'NONE',
      vixyLoginEmail: user ? user.email : 'NONE',
      exactEmailMatch: exactMatch ? 'YES' : 'NO',
      hasFsEntitlement: (fsSub && fsSub.status === 'ACTIVE') ? 'YES' : 'NO',
      hasOverride: hasOverride ? 'YES' : 'NO',
      conflictingEntitlement: conflictingEntitlement,
      isRealStripeSub: 'YES',
      recAction: recAction
    });
  }

  fs.writeFileSync('final_strict_audit_36.json', JSON.stringify(table, null, 2));
  console.log("Strict Table Created.");
  process.exit(0);
}
run();
