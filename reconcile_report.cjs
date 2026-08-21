const Stripe = require('stripe');
const fs = require('fs');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const store = JSON.parse(fs.readFileSync('data/vixy_store.json', 'utf8'));
const users = store.users || [];
const subscriptions = store.subscriptions || {};

async function run() {
  const report = [];
  
  for (const user of users) {
    // Only check users with stripe ids or with plans that might have been changed
    const subRecord = subscriptions[user.email] || {};
    const stripeSubId = user.stripeSubscriptionId || subRecord.stripeSubscriptionId;
    const stripeCustId = user.stripeCustomerId || subRecord.stripeCustomerId;
    
    let stripeStatus = 'NONE';
    let stripePriceId = 'NONE';
    let stripeProductId = 'NONE';
    
    if (stripeSubId) {
      try {
        const sub = await stripe.subscriptions.retrieve(stripeSubId);
        stripeStatus = sub.status;
        const item = sub.items.data[0];
        if (item) {
          stripePriceId = item.price.id;
          stripeProductId = item.price.product;
        }
      } catch (err) {
        stripeStatus = 'ERROR: ' + err.message;
      }
    }
    
    if (stripeSubId || stripeCustId || user.subscription === 'STARTER' || user.subscription === 'NONE' || user.subscription === 'PRO') {
      report.push({
        email: user.email,
        userId: user.id,
        stripeCustId: stripeCustId || null,
        stripeSubId: stripeSubId || null,
        stripeStatus,
        stripePriceId,
        stripeProductId,
        appPlan: user.subscription,
        appRole: user.role,
        subRecordPlan: subRecord.plan
      });
    }
  }
  
  fs.writeFileSync('reconcile_report.json', JSON.stringify(report, null, 2));
  console.log("Report generated with " + report.length + " users.");
}

run().catch(console.error);
