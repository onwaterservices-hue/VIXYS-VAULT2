const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
async function run() {
  const sergioCusts = await stripe.customers.search({ query: `email:"sergioaddiaz1711@icloud.com"` });
  for (const c of sergioCusts.data) {
     const sessions = await stripe.checkout.sessions.list({ customer: c.id });
     for (const s of sessions.data) {
        console.log(`Session: ${s.id} Status: ${s.status} Payment: ${s.payment_status}`);
        console.log(`  Customer Details Email: ${s.customer_details?.email}`);
        console.log(`  Customer Email: ${s.customer_email}`);
        console.log(`  Mode: ${s.mode}, Subs: ${s.subscription}`);
     }
  }
}
run();
