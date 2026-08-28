const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const subs = await stripe.subscriptions.list({
      limit: 10,
      price: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID
    });
    for (const s of subs.data) {
      console.log("Sub:", s.id, "Cust:", s.customer, "Email:", s.customer_email || "N/A");
      const cust = await stripe.customers.retrieve(s.customer);
      console.log("  Cust Email:", cust.email, "Name:", cust.name);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
