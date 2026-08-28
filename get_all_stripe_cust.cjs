const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  let hasMore = true;
  let startingAfter = undefined;
  while(hasMore) {
    const custs = await stripe.customers.list({ limit: 100, starting_after: startingAfter });
    for (const c of custs.data) {
      const str = JSON.stringify(c).toLowerCase();
      if (str.includes("sauce")) {
        console.log("Found Cust:", c.id, c.email, c.name);
      }
    }
    if (custs.has_more) {
      startingAfter = custs.data[custs.data.length - 1].id;
    } else {
      hasMore = false;
    }
  }
}
run();
