const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
    let found = 0;
    for (const s of sessions.data) {
      const email = s.customer_details?.email || s.customer_email || "";
      if (email.toLowerCase().includes("harvey")) {
        console.log(`Found Session: ${s.id} | Status: ${s.status} | Mode: ${s.mode} | Email: ${email}`);
        found++;
      }
    }
    console.log("Total found:", found);
  } catch (err) {
    console.error(err);
  }
}
run();
