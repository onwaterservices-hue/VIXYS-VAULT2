const fs = require('fs');
let code = fs.readFileSync('src/components/LandingPage.tsx', 'utf-8');

code = code.replace(
  "import { Logo } from './Logo';",
  "import { Logo } from './Logo';\nimport { getStripeDayPassUrl } from '../config/stripeLinks';"
);

code = code.replace(
  "onClick={() => onOpenAuth('register')}",
  "onClick={() => { if (authState?.isAuthenticated) { window.location.href = getStripeDayPassUrl({ email: authState?.user?.email, uid: authState?.user?.id }); } else { onOpenAuth('register'); } }}"
);

fs.writeFileSync('src/components/LandingPage.tsx', code);
