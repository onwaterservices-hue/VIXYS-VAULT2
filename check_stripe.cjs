require('dotenv').config();
const Stripe = require('stripe');
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('dump.json', 'utf8'));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const ambiguousEmails = [
  "quant.sarah@optionstrade.io", "trader.alex@gmail.com", "abe.carrillo987@gmail.com", 
  "ajhuns07@gmail.com", "albertt2700@gmail.com", "alexescobar7503@gmail.com", 
  "dm2664817@gmail.com", "ludinvelasquez47@gmail.com", "ragnarks1996@gmail.com", 
  "xavierrosales503@icloud.com", "vksminhkaka@gmail.com", "ogershey@gmail.com", 
  "nathan.velasquez29@icloud.com", "jeremygarr30@gmail.com", "trelll2008@icloud.com", 
  "gifyzslide@gmail.com", "dhdh@gmail.com"
];

async function run() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log("NO STRIPE KEY FOUND IN ENV! Checking local dump for ID patterns instead.");
  }

  const users = data.users;
  const dayPasses = data.dayPasses;
  
  for (const email of ambiguousEmails) {
    const user = users.find(u => u.email === email);
    const dayPass = dayPasses.find(dp => dp[0] === email || (dp[1] && dp[1].email === email));
    
    let custId = user ? user.stripeCustomerId : null;
    let csId = dayPass ? (dayPass[1].stripeCheckoutSessionId || dayPass[1].stripeEventId) : null;
    
    console.log(`\nEmail: ${email}`);
    console.log(`Local Cust ID: ${custId || 'None'}`);
    console.log(`Local CS ID: ${csId || 'None'}`);
    
    if (process.env.STRIPE_SECRET_KEY) {
      if (custId && custId.startsWith('cus_')) {
        try {
          const cust = await stripe.customers.retrieve(custId);
          console.log(`Stripe API Cust: FOUND (livemode: ${cust.livemode})`);
        } catch (e) {
          console.log(`Stripe API Cust Error: ${e.message}`);
        }
      }
      if (csId && csId.startsWith('cs_')) {
        try {
          const session = await stripe.checkout.sessions.retrieve(csId);
          console.log(`Stripe API Session: FOUND (livemode: ${session.livemode}, status: ${session.payment_status})`);
        } catch (e) {
          console.log(`Stripe API Session Error: ${e.message}`);
        }
      }
    } else {
      // Heuristic check
      if (custId && custId.includes('_quant_') || custId?.includes('_trader_')) {
        console.log("Heuristic: Obviously fake mock ID.");
      }
      if (csId && csId.startsWith('cs_live_')) {
        console.log("Heuristic: Looks like a real live-mode checkout session.");
      }
    }
  }
}

run();
