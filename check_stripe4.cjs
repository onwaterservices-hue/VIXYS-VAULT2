const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const custs = await stripe.customers.list({
      email: "harveysantoyo10@gmail.com",
    });
    console.log("Customers found:", custs.data.length);
    for (const c of custs.data) {
      console.log(`\nCustomer: ${c.id}`);
      const subs = await stripe.subscriptions.list({ customer: c.id });
      console.log(`  Subs: ${subs.data.length}`);
      
      const sessions = await stripe.checkout.sessions.list({ customer: c.id });
      console.log(`  Sessions: ${sessions.data.length}`);
      sessions.data.forEach(s => console.log(`    Session: ${s.id} | Status: ${s.status} | Mode: ${s.mode}`));
    }
  } catch (err) {
    console.error(err);
  }
}
run();
