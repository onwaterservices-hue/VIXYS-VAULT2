const fs = require('fs');

let content = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

// Replace Day Pass button logic
content = content.replace(/if \(authState\?\.isAuthenticated\) \{ window\.location\.href = getStripeDayPassUrl\(\{ email: authState\?\.user\?\.email, uid: authState\?\.user\?\.id \}\); \} else \{ onOpenAuth\('register'\); \}/g, "window.location.href = getStripeDayPassUrl({ email: authState?.user?.email, uid: authState?.user?.id });");

// Replace Subscribe button logic
content = content.replace(/if \(authState\?\.isAuthenticated\) \{ window\.location\.href = getStripePaymentUrl\('STARTER', billingInterval, \{ email: authState\?\.user\?\.email, uid: authState\?\.user\?\.id \}\); \} else \{ onOpenAuth\('register'\); \}/g, "window.location.href = getStripePaymentUrl('STARTER', billingInterval, { email: authState?.user?.email, uid: authState?.user?.id });");
content = content.replace(/if \(authState\?\.isAuthenticated\) \{ window\.location\.href = getStripePaymentUrl\('PRO', billingInterval, \{ email: authState\?\.user\?\.email, uid: authState\?\.user\?\.id \}\); \} else \{ onOpenAuth\('register'\); \}/g, "window.location.href = getStripePaymentUrl('PRO', billingInterval, { email: authState?.user?.email, uid: authState?.user?.id });");
content = content.replace(/if \(authState\?\.isAuthenticated\) \{ window\.location\.href = getStripePaymentUrl\('ELITE', billingInterval, \{ email: authState\?\.user\?\.email, uid: authState\?\.user\?\.id \}\); \} else \{ onOpenAuth\('register'\); \}/g, "window.location.href = getStripePaymentUrl('ELITE', billingInterval, { email: authState?.user?.email, uid: authState?.user?.id });");

fs.writeFileSync('src/components/LandingPage.tsx', content);
