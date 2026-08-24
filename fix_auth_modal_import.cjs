const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf-8');

if (!code.includes("import { getStripeDayPassUrl }")) {
  code = code.replace(
    "import { syncAuthUserApi } from '../services/api';",
    "import { syncAuthUserApi } from '../services/api';\nimport { getStripeDayPassUrl } from '../config/stripeLinks';"
  );
  fs.writeFileSync('src/components/AuthModal.tsx', code);
}
