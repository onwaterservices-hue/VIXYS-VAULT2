const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const events = await stripe.events.list({ limit: 100 });
    events.data.forEach(e => {
      const obj = e.data.object;
      const email = obj.customer_details?.email || obj.customer_email || obj.email || "";
      if (email.toLowerCase().includes("harvey") || (obj.id && obj.id.includes("b1seuFT"))) {
        console.log(`Event: ${e.id} | Type: ${e.type} | ObjId: ${obj.id}`);
      }
    });
  } catch (err) {
    console.error(err);
  }
}
run();
