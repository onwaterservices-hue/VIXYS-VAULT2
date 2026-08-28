const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
async function run() {
  const events = await stripe.webhookEndpoints.list({limit: 10});
  console.log("Endpoints:", events.data.length);
  // can we get recent failed webhook deliveries?
  // stripe.events doesn't give webhook delivery status easily, but let's check recent events
  const recentEvents = await stripe.events.list({ limit: 10 });
  for (const e of recentEvents.data) {
    if (e.type === 'checkout.session.completed' || e.type.startsWith('customer.subscription')) {
       console.log(`Event ${e.id} type ${e.type}`);
    }
  }
}
run();
