const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const bad = `const entitlementType = session.metadata?.entitlementType || session.metadata?.productType || session.metadata?.plan;
      const isDayPass = session.mode === 'payment' || entitlementType === 'VIXY_DAY_PASS' || entitlementType === 'DAY_PASS';

      if (isDayPass) {`;

const good = `const entitlementType = session.metadata?.entitlementType || session.metadata?.productType || session.metadata?.plan;
      
      // Strict verification of the Day Pass Price ID
      const expectedDayPassPriceId = process.env.STRIPE_DAY_PASS_PRICE_ID || 'price_1U4cKTCYsvFDvgUJZHASVwRG';
      let isDayPass = false;
      
      try {
         const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
         isDayPass = lineItems.data.some(item => item.price?.id === expectedDayPassPriceId);
      } catch (err) {
         console.warn('[STRIPE WEBHOOK ERROR] Could not fetch line items for session', session.id, err);
         // Fallback to strict metadata if line items fail
         isDayPass = (entitlementType === 'VIXY_DAY_PASS' || entitlementType === 'DAY_PASS') && session.mode === 'payment';
      }

      if (isDayPass) {`;

code = code.replace(bad, good);
fs.writeFileSync('backend.ts', code);
