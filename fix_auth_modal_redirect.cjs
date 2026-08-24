const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf-8');

code = code.replace(
  "setTimeout(() => {\n          setSuccessMsg('');\n          onClose();\n        }, 1000);",
  `if (mode === 'register' && !isAdminEmail) {
          setTimeout(() => {
            window.location.href = getStripeDayPassUrl({ email: userEmail, uid: canonicalUserId });
          }, 1200);
        } else {
          setTimeout(() => {
            setSuccessMsg('');
            onClose();
          }, 1000);
        }`
);

fs.writeFileSync('src/components/AuthModal.tsx', code);
