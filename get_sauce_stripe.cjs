const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const custs = await stripe.customers.search({
      query: 'metadata["discordUserId"]:* OR email:*'
    });
    // the search api might be limited, let's just list recent sessions
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
    let found = false;
    for (const s of sessions.data) {
      const str = JSON.stringify(s).toLowerCase();
      if (str.includes("igotthesauce") || str.includes("sauce420")) {
        console.log("Found session:", s.id, "Email:", s.customer_email || s.customer_details?.email);
        found = true;
      }
    }
    if (!found) {
        console.log("Not found in recent sessions");
        const charges = await stripe.charges.list({ limit: 100 });
        for (const c of charges.data) {
          const str = JSON.stringify(c).toLowerCase();
          if (str.includes("igotthesauce") || str.includes("sauce420")) {
            console.log("Found charge:", c.id, "Email:", c.billing_details?.email);
            found = true;
          }
        }
    }
  } catch (err) {
    console.error(err);
  }
}
run();
