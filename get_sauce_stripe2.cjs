const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
    let found = false;
    for (const s of sessions.data) {
      const str = JSON.stringify(s).toLowerCase();
      if (str.includes("sauce420")) {
        console.log("Found session:", s.id, "Email:", s.customer_email || s.customer_details?.email);
        found = true;
      }
    }
  } catch (err) {
    console.error(err);
  }
}
run();
