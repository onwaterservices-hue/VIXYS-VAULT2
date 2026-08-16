const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf-8');

const redirectOriginal = `        if (mode === 'register' && !isAdminEmail) {
          setTimeout(() => {
            window.location.href = getStripeDayPassUrl({ email: userEmail, uid: canonicalUserId });
          }, 1200);
        } else {
          setTimeout(() => {
            setSuccessMsg('');
            onClose();
          }, 1000);
        }`;

const redirectNew = `        if (mode === 'register' && !isAdminEmail && finalRole === 'UNPAID') {
          setTimeout(() => {
            window.location.href = getStripeDayPassUrl({ email: userEmail, uid: canonicalUserId });
          }, 1200);
        } else {
          setTimeout(() => {
            setSuccessMsg('');
            onClose();
          }, 1000);
        }`;

code = code.replace(redirectOriginal, redirectNew);
fs.writeFileSync('src/components/AuthModal.tsx', code);
