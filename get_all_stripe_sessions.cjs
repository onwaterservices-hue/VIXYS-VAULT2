const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  let hasMore = true;
  let startingAfter = undefined;
  while(hasMore) {
    const sessions = await stripe.checkout.sessions.list({ limit: 100, starting_after: startingAfter });
    for (const s of sessions.data) {
      const str = JSON.stringify(s).toLowerCase();
      if (str.includes("sauce")) {
        console.log("Found Session:", s.id, "Email:", s.customer_email || s.customer_details?.email);
      }
    }
    if (sessions.has_more) {
      startingAfter = sessions.data[sessions.data.length - 1].id;
    } else {
      hasMore = false;
    }
  }
}
run();
