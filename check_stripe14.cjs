const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const events = await stripe.events.list({ limit: 100 });
    let theEvent = events.data.find(e => e.id === "evt_1U9FbQCYsvFDvgUJ7L37DRdW");
    if (theEvent) {
      console.log("Event retrieved.");
      // Stripe doesn't expose webhook deliveries via API for security/logs without the old API, but we can check if it has pending webhooks
      console.log("Pending Webhooks:", theEvent.pending_webhooks);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
