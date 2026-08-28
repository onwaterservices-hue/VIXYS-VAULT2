const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const custs = await stripe.customers.list({ email: "harveysantoyo@icloud.com" });
    const subs = await stripe.subscriptions.list({ customer: custs.data[0].id });
    console.log("Sub price ID:", subs.data[0].items.data[0].price.id);
  } catch (err) {
    console.error(err);
  }
}
run();
