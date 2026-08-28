const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const customers = await stripe.customers.list({ limit: 100 });
    let found = false;
    for (const c of customers.data) {
      const str = JSON.stringify(c).toLowerCase();
      if (str.includes("sauce420")) {
        console.log("Found customer:", c.id, "Email:", c.email);
        found = true;
        
        const subs = await stripe.subscriptions.list({ customer: c.id });
        console.log("Subs:", subs.data.length);
      }
    }
  } catch (err) {
    console.error(err);
  }
}
run();
