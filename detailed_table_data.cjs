const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, collection, getDocs } = require("firebase/firestore");
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
  fsUsersSnap.forEach(d => {
    fsUsers.push({ id: d.id, ...d.data() });
  });

  const fsSubsSnap = await getDocs(collection(db, "subscriptions"));
  const fsSubs = [];
  fsSubsSnap.forEach(d => {
    fsSubs.push({ id: d.id, ...d.data() });
  });

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

  const results = [];

  for (let i = 0; i < activeSubs.length; i++) {
    const s = activeSubs[i];
    const cust = s.customer;
    const custId = typeof cust === 'string' ? cust : cust?.id;
    const custEmail = (typeof cust === 'object' && cust?.email ? cust.email : '').toLowerCase().trim();
    const priceId = s.items?.data?.[0]?.price?.id || 'NONE';
    const prodId = s.items?.data?.[0]?.price?.product || 'NONE';

    let plan = 'STARTER';
    if (priceId === 'price_1Tz7MvCYsvFDvgUJvV3T99wY' || priceId.includes('PRO')) plan = 'PRO';
    else if (priceId === 'price_1Tz7NKCYsvFDvgUJoVq0eP1Q' || priceId.includes('ELITE')) plan = 'ELITE';
    else if (priceId === 'price_1Tz7MWCYsvFDvgUJCLaiMRWE' || priceId.includes('STARTER')) plan = 'STARTER';

    // Find in Firestore users
    const userByEmail = custEmail ? fsUsers.find(u => u.email && u.email.toLowerCase() === custEmail) : null;
    const userByCustId = fsUsers.find(u => u.stripeCustomerId === custId);
    const userBySubId = fsUsers.find(u => u.stripeSubscriptionId === s.id);
    const matchedUser = userByEmail || userByCustId || userBySubId;

    // Find in Firestore subscriptions
    const subBySubId = fsSubs.find(sub => sub.id === s.id || sub.stripeSubscriptionId === s.id);
    const subByEmail = custEmail ? fsSubs.find(sub => sub.email && sub.email.toLowerCase() === custEmail) : null;
    const matchedSub = subBySubId || subByEmail;

    const exactMatch = Boolean(userByEmail);
    const hasOverride = hardcodedList.includes(custEmail);

    let conflict = 'NO';
    if (hasOverride) {
      conflict = 'YES (Hardcoded Override)';
    } else if (matchedUser && matchedUser.subscription && matchedUser.subscription !== 'NONE' && matchedUser.subscription !== 'STARTER_PASS' && matchedUser.subscription !== 'STARTER') {
      conflict = `YES (Has plan ${matchedUser.subscription})`;
    } else if (matchedUser && matchedUser.stripeSubscriptionId && matchedUser.stripeSubscriptionId !== s.id) {
      conflict = `YES (Diff sub ID ${matchedUser.stripeSubscriptionId})`;
    }

    let recAction = 'MANUAL REVIEW';
    if (custEmail === 'harveysantoyo@icloud.com' || s.id === 'sub_1U9FbOCYsvFDvgUJylDMKoyj') {
      recAction = 'RECOVERED (Harvey)';
    } else if (custEmail === 'sergioaddiaz1711@icloud.com' || s.id === 'sub_1U6MrLCYsvFDvgUJtFO3OV3Q') {
      recAction = 'RECOVERED (Sergio)';
    } else if (hasOverride) {
      recAction = 'DO NOT TOUCH (Hardcoded Override)';
    } else if (exactMatch && matchedUser) {
      // Check if duplicate user exists
      const duplicateUsers = fsUsers.filter(u => u.email && u.email.toLowerCase() === custEmail);
      if (duplicateUsers.length > 1) {
        recAction = 'MANUAL REVIEW (Duplicate Users)';
      } else {
        recAction = 'SAFE AUTO-RECOVERY';
      }
    } else {
      recAction = 'MANUAL REVIEW (No VIXY Account / Email Mismatch)';
    }

    results.push({
      num: i + 1,
      stripeCustId: custId,
      stripeEmail: custEmail || 'NO_EMAIL',
      stripeSubId: s.id,
      stripePriceId: priceId,
      stripePlan: plan,
      subStatus: s.status,
      createdDate: new Date(s.created * 1000).toISOString().split('T')[0],
      hasVixyUser: matchedUser ? 'YES' : 'NO',
      vixyUserId: matchedUser ? (matchedUser.id || matchedUser.uid) : 'NONE',
      vixyLoginEmail: matchedUser ? matchedUser.email : 'NONE',
      exactEmailMatch: exactMatch ? 'YES' : 'NO',
      hasFsEntitlement: (matchedSub && matchedSub.status === 'ACTIVE') ? 'YES' : 'NO',
      hasOverride: hasOverride ? 'YES' : 'NO',
      hasConflict: conflict,
      isRealStripeSub: 'YES',
      recAction: recAction
    });
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}
run();
