const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
async function run() {
  const events = await stripe.events.list({ limit: 100 });
  let found = 0;
  for (const e of events.data) {
    if (e.type === 'checkout.session.completed' || e.type.startsWith('customer.subscription')) {
       // we can list webhook delivery attempts for this event
       // Wait, stripe.events.list doesn't include delivery status. 
       // There is a 'stripe.webhookEndpoints.list' but we want event delivery.
       console.log(`Event: ${e.id}, Type: ${e.type}`);
       found++;
       if(found >= 5) break;
    }
  }
}
run();
