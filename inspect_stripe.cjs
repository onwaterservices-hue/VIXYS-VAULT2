const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function run() {
  try {
    const priceId = process.env.STRIPE_DAY_PASS_PRICE_ID;
    console.log("Day Pass Price ID:", priceId);
    
    // Fetch recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
    });
    
    let dayPassSessions = [];
    for (const session of sessions.data) {
      if (session.payment_status === 'paid' && session.status === 'complete') {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const hasDayPass = lineItems.data.some(item => item.price.id === priceId);
        if (hasDayPass) {
          dayPassSessions.push(session);
        }
      }
    }
    
    console.log(`Found ${dayPassSessions.length} paid Day Pass checkout sessions.`);
    
    if (dayPassSessions.length > 0) {
      dayPassSessions.forEach(s => {
        console.log(`Session: ${s.id}, Customer: ${s.customer}, Email: ${s.customer_details?.email}, Created: ${new Date(s.created * 1000).toISOString()}`);
      });
    }
    
    // Let's also check Payment Intents or Charges just in case they were direct
    const charges = await stripe.charges.list({ limit: 10 });
    console.log(`Also fetched ${charges.data.length} recent charges to see if there's data.`);
    
  } catch (err) {
    console.error(err);
  }
}

run();
