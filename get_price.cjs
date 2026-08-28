const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const price = await stripe.prices.retrieve(process.env.STRIPE_STARTER_MONTHLY_PRICE_ID);
    console.log("Price:", price.unit_amount);
  } catch (err) {
    console.error(err);
  }
}
run();
