const fs = require('fs');
let code = fs.readFileSync('src/components/AuthView.tsx', 'utf-8');

const redirectOriginal = `      if (mode === 'register' && !isAdminEmail) {
        setTimeout(() => {
          const directCheckoutUrl = getStripeDayPassUrl({ email: userEmail, uid: newUserId });
          window.location.href = directCheckoutUrl;
        }, 1200);
      } else if (onSuccessNavigate) {
        setTimeout(onSuccessNavigate, 1000);
      }`;

const redirectNew = `      if (mode === 'register' && !isAdminEmail && assignedRole === 'UNPAID' && serverUser?.role !== 'PRO' && serverUser?.role !== 'ELITE') {
        setTimeout(() => {
          const directCheckoutUrl = getStripeDayPassUrl({ email: userEmail, uid: newUserId });
          window.location.href = directCheckoutUrl;
        }, 1200);
      } else if (onSuccessNavigate) {
        setTimeout(onSuccessNavigate, 1000);
      }`;

code = code.replace(redirectOriginal, redirectNew);
fs.writeFileSync('src/components/AuthView.tsx', code);
