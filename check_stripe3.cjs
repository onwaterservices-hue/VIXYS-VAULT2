const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const pis = await stripe.paymentIntents.list({
      customer: "cus_V9Z40FVLmQ1LFd",
    });
    console.log("Payment Intents found:", pis.data.length);
    pis.data.forEach(pi => {
      console.log(`PI: ${pi.id} | Status: ${pi.status} | Amount: ${pi.amount}`);
    });
  } catch (err) {
    console.error(err);
  }
}
run();
