const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const endpoints = await stripe.webhookEndpoints.list();
    endpoints.data.forEach(e => {
      console.log(`URL: ${e.url} | Status: ${e.status}`);
    });
  } catch (err) {
    console.error(err);
  }
}
run();
