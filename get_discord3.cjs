const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  const custs = await stripe.customers.list({ limit: 100 });
  for (const c of custs.data) {
    if (JSON.stringify(c).toLowerCase().includes("sauce")) {
      console.log("Customer:", c.email, c.name);
    }
  }
}
run();
