const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const sessions = await stripe.checkout.sessions.list({
      customer: "cus_V9Z40FVLmQ1LFd",
    });
    console.log("Sessions found:", sessions.data.length);
    sessions.data.forEach(s => {
      console.log(`Session: ${s.id} | Status: ${s.status} | Mode: ${s.mode}`);
    });
  } catch (err) {
    console.error(err);
  }
}
run();
