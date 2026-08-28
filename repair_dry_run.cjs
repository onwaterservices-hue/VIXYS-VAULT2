const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const fs = require('fs');

const targets = [
  {
    name: "HARVEY",
    vixyEmail: "harveysantoyo10@gmail.com",
    stripeCustId: "cus_V9YiKd4iJOBqns",
    stripeSubId: "sub_1U9FbOCYsvFDvgUJylDMKoyj"
  },
  {
    name: "SERGIO",
    vixyEmail: "sergioaddiaz1711@icloud.com",
    stripeCustId: "cus_V6a1DUk23lAA12",
    stripeSubId: "sub_1U6MrLCYsvFDvgUJtFO3OV3Q"
  }
];

async function run() {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "backend_system@vixy.local", "vixy_backend_super_secret_password_2026");

  for (const t of targets) {
    console.log(`\n==================================================`);
    console.log(`${t.name}`);
    console.log(`==================================================`);
    
    let userDocId = null;
    let currentUserData = null;
    
    // Find user doc by email
    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.forEach(d => {
      if (d.data().email?.toLowerCase() === t.vixyEmail.toLowerCase()) {
        userDocId = d.id;
        currentUserData = d.data();
      }
    });

    if (!userDocId) {
       console.log(`ERROR: Could not find Firestore User for ${t.vixyEmail}`);
       continue;
    }

    console.log(`VIXY USER: ${userDocId} (${t.vixyEmail})`);
    console.log(`STRIPE CUSTOMER: ${t.stripeCustId}`);
    console.log(`STRIPE SUBSCRIPTION: ${t.stripeSubId}`);

    // Fetch sub from Stripe to confirm
    let sub = null;
    try {
      sub = await stripe.subscriptions.retrieve(t.stripeSubId);
    } catch (e) {
      console.log(`ERROR: Could not retrieve Stripe sub: ${e.message}`);
      continue;
    }

    console.log(`STRIPE STATUS: ${sub.status}`);
    
    // Derive plan
    const stripePriceId = sub.items?.data?.[0]?.price?.id || "";
    let rawPlan = "NONE";
    if (stripePriceId === process.env.STRIPE_ELITE_MONTHLY_PRICE_ID || stripePriceId === process.env.STRIPE_ELITE_ANNUAL_PRICE_ID) {
      rawPlan = "ELITE";
    } else if (stripePriceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || stripePriceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID) {
      rawPlan = "PRO";
    } else if (stripePriceId === process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || stripePriceId === process.env.STRIPE_STARTER_ANNUAL_PRICE_ID) {
      rawPlan = "STARTER";
    }
    
    // Override raw plan since the prompt explicitly specified they are STARTER, but we check just in case.
    if(rawPlan === "NONE") rawPlan = "STARTER"; 

    console.log(`STRIPE PLAN: ${rawPlan}`);
    
    const passName = `${rawPlan}_PASS`;

    // Check existing entitlement
    console.log(`CURRENT VIXY ENTITLEMENT (users doc): Plan=${currentUserData.plan || currentUserData.subscription || 'NONE'} | Status=${currentUserData.status || 'INACTIVE'} | StripeSubId=${currentUserData.stripeSubscriptionId || 'NONE'}`);
    
    const currentSubSnap = await getDoc(doc(db, "subscriptions", t.stripeSubId));
    let currentSubData = currentSubSnap.exists() ? currentSubSnap.data() : null;
    if (!currentSubData) {
       // Maybe it's stored under user doc ID?
       const currentSubSnap2 = await getDoc(doc(db, "subscriptions", userDocId));
       if (currentSubSnap2.exists()) currentSubData = currentSubSnap2.data();
    }
    console.log(`CURRENT VIXY ENTITLEMENT (subscriptions doc): Plan=${currentSubData?.plan || 'NONE'} | Status=${currentSubData?.status || 'INACTIVE'}`);

    // PROPOSED CHANGES
    const proposedUserUpdate = {
        stripeCustomerId: t.stripeCustId,
        stripeSubscriptionId: t.stripeSubId,
        stripePriceId: stripePriceId,
        stripeProductId: sub.items?.data?.[0]?.price?.product || "",
        plan: passName,
        subscription: passName,
        status: (sub.status === 'active' || sub.status === 'trialing') ? "ACTIVE" : sub.status.toUpperCase(),
        accountStatus: (sub.status === 'active' || sub.status === 'trialing') ? "ACTIVE" : sub.status.toUpperCase(),
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        vixyUserId: userDocId,
        updatedAt: new Date().toISOString()
    };
    
    const proposedSubUpdate = {
        userId: userDocId,
        email: t.vixyEmail,
        stripeCustomerId: t.stripeCustId,
        stripeSubscriptionId: t.stripeSubId,
        subscriptionId: t.stripeSubId,
        stripePriceId: stripePriceId,
        stripeProductId: sub.items?.data?.[0]?.price?.product || "",
        plan: passName,
        status: (sub.status === 'active' || sub.status === 'trialing') ? "ACTIVE" : sub.status.toUpperCase(),
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        vixyUserId: userDocId,
        updatedAt: new Date().toISOString()
    };
    
    console.log(`\nPROPOSED ENTITLEMENT (users doc update):`);
    console.log(JSON.stringify(proposedUserUpdate, null, 2));

    console.log(`\nPROPOSED ENTITLEMENT (subscriptions doc update):`);
    console.log(JSON.stringify(proposedSubUpdate, null, 2));
    
    console.log(`\nFIRESTORE DOCUMENTS TO MODIFY:`);
    console.log(`- doc(db, "users", "${userDocId}") (merge: true)`);
    console.log(`- doc(db, "subscriptions", "${t.stripeSubId}") (merge: true)`);
  }
  process.exit(0);
}
run();
