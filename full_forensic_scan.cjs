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

  // 1. Get all Firestore users
  const fsUsersSnap = await getDocs(collection(db, "users"));
  const fsUsers = [];
  fsUsersSnap.forEach(d => {
    fsUsers.push({ id: d.id, ...d.data() });
  });

  // 2. Get all Firestore subscriptions
  const fsSubsSnap = await getDocs(collection(db, "subscriptions"));
  const fsSubs = [];
  fsSubsSnap.forEach(d => {
    fsSubs.push({ id: d.id, ...d.data() });
  });

  // 3. Get all Stripe subscriptions (active & trialing)
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

  // Active or trialing subscriptions
  const activeSubs = allStripeSubs.filter(s => s.status === 'active' || s.status === 'trialing');

  // Hardcoded overrides in server.ts
  const serverContent = fs.readFileSync('server.ts', 'utf8');
  const hardcodedList = [
    "ogaccount85@gmail.com",
    "ogacount85@gmail.com",
    "selvinrom1.6@gmail.com",
    "ludinvelasquez47@gmail.com",
    "wasan@cartwrightrn.com",
    "vixyvault0@gmail.com",
    "onwaterservices@gmail.com"
  ];

  console.log(JSON.stringify({
    totalStripeSubs: allStripeSubs.length,
    activeStripeSubs: activeSubs.length,
    fsUsersCount: fsUsers.length,
    fsSubsCount: fsSubs.length
  }, null, 2));

  // Map each active stripe sub
  const report = [];
  for (const s of activeSubs) {
    const cust = s.customer;
    const custId = typeof cust === 'string' ? cust : cust?.id;
    const custEmail = (typeof cust === 'object' && cust?.email ? cust.email : '').toLowerCase().trim();
    const priceId = s.items?.data?.[0]?.price?.id || 'NONE';
    const prodId = s.items?.data?.[0]?.price?.product || 'NONE';
    
    // Determine plan
    let plan = 'UNKNOWN';
    if (priceId === process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || priceId === 'price_1Tz7MWCYsvFDvgUJCLaiMRWE') plan = 'STARTER';
    else if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === 'price_1Tz7MvCYsvFDvgUJvV3T99wY') plan = 'PRO';
    else if (priceId === process.env.STRIPE_ELITE_MONTHLY_PRICE_ID || priceId === 'price_1Tz7NKCYsvFDvgUJoVq0eP1Q') plan = 'ELITE';
    else if (priceId.includes('STARTER') || prodId.includes('STARTER')) plan = 'STARTER';
    else plan = 'STARTER'; // default or check

    // Check matching Firestore User
    let matchedUser = fsUsers.find(u => u.email && u.email.toLowerCase() === custEmail);
    let matchedByCustId = fsUsers.find(u => u.stripeCustomerId === custId);
    let matchedBySubId = fsUsers.find(u => u.stripeSubscriptionId === s.id);

    // Check existing Firestore Sub
    let fsSub = fsSubs.find(subDoc => subDoc.id === s.id || subDoc.stripeSubscriptionId === s.id || (custEmail && subDoc.email && subDoc.email.toLowerCase() === custEmail));

    const exactEmailMatch = Boolean(matchedUser && matchedUser.email?.toLowerCase() === custEmail);
    const hasOverride = hardcodedList.includes(custEmail);

    let action = 'MANUAL REVIEW';
    if (custEmail === 'harveysantoyo10@gmail.com' || s.id === 'sub_1U9FbOCYsvFDvgUJylDMKoyj') {
      action = 'RECOVERED (Harvey)';
    } else if (custEmail === 'sergioaddiaz1711@icloud.com' || s.id === 'sub_1U6MrLCYsvFDvgUJtFO3OV3Q') {
      action = 'RECOVERED (Sergio)';
    } else if (exactEmailMatch && !hasOverride && !matchedUser.subscriptionExpiresAt && !matchedUser.plan?.includes('OVERRIDE')) {
      action = 'SAFE AUTO-RECOVERY';
    } else if (!matchedUser) {
      action = 'MANUAL REVIEW (No VIXY User)';
    } else if (hasOverride) {
      action = 'DO NOT TOUCH (Override Conflict)';
    }

    report.push({
      stripeCustId: custId,
      stripeEmail: custEmail || 'NONE',
      stripeSubId: s.id,
      stripePriceId: priceId,
      stripePlan: plan,
      status: s.status,
      createdDate: new Date(s.created * 1000).toISOString().split('T')[0],
      hasVixyUser: Boolean(matchedUser || matchedByCustId || matchedBySubId),
      vixyUserId: matchedUser?.id || matchedByCustId?.id || matchedBySubId?.id || 'NONE',
      vixyLoginEmail: matchedUser?.email || matchedByCustId?.email || matchedBySubId?.email || 'NONE',
      exactEmailMatch: exactEmailMatch,
      hasFsEntitlement: Boolean(fsSub && fsSub.status === 'ACTIVE'),
      hasHardcodedOverride: hasOverride,
      hasConflictingEntitlement: Boolean(hasOverride || (matchedUser && matchedUser.subscription && matchedUser.subscription !== 'NONE' && matchedUser.stripeSubscriptionId !== s.id)),
      isRealStripeSub: true,
      action: action
    });
  }

  fs.writeFileSync('forensic_audit_32.json', JSON.stringify(report, null, 2));
  console.log(`Report generated with ${report.length} active subscriptions.`);
  process.exit(0);
}
run();
