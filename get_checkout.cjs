const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  for (const s of sessions.data) {
    const str = JSON.stringify(s).toLowerCase();
    if (str.includes("sauce")) {
      console.log("Found in session:", s.id, "Email:", s.customer_email || s.customer_details?.email);
    }
  }
}
run();
