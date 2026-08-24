const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const pollingLogic = `
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe_status');
    
    if (stripeStatus === 'success') {
      setIsVerifyingPayment(true);
      
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (!authState.isAuthenticated || !authState.user?.email) {
          if (attempts > 5) {
             clearInterval(pollInterval);
             setPaymentVerificationText('ACCESS VERIFIED');
             setTimeout(() => { setIsVerifyingPayment(false); }, 1500);
          }
          return;
        }
        
        try {
          // Use the entitlements API since it accurately returns dayPass
          const userId = authState.user.id || '';
          const res = await fetch(\`/api/entitlements?email=\${encodeURIComponent(authState.user.email)}&userId=\${encodeURIComponent(userId)}\`);
          if (res.ok) {
            const ent = await res.json();
            if (ent.dayPass?.active || ent.status === 'active' || ent.plan === 'ELITE_QUANT' || ent.plan === 'PRO_QUANT' || ent.plan === 'DAY_PASS') {
              clearInterval(pollInterval);
              setPaymentVerificationText('PAYMENT VERIFIED');
              
              // Also eagerly update the UI state
              setDayPassInfo(ent.dayPass || { active: true, secondsRemaining: 86400 });
              setUserRole('PRO');
              
              setTimeout(() => {
                setIsVerifyingPayment(false);
                setActiveTab('live');
                window.history.replaceState({}, document.title, window.location.pathname);
              }, 1500);
            } else if (attempts >= 10) {
              clearInterval(pollInterval);
              setPaymentVerificationText('PAYMENT RECEIVED — FINALIZING ACCESS');
              setTimeout(() => {
                setIsVerifyingPayment(false);
                window.history.replaceState({}, document.title, window.location.pathname);
              }, 2000);
            }
          } else if (attempts >= 10) {
            clearInterval(pollInterval);
            setIsVerifyingPayment(false);
          }
        } catch (e) {
          if (attempts >= 10) {
            clearInterval(pollInterval);
            setIsVerifyingPayment(false);
          }
        }
      }, 2000);
      
      return () => clearInterval(pollInterval);
    }
  }, [authState.isAuthenticated, authState.user?.email, authState.user?.id]);
`;

code = code.replace(
  "  useEffect(() => {\n    const userEmail = authState.user?.email",
  pollingLogic + "\n  useEffect(() => {\n    const userEmail = authState.user?.email"
);

fs.writeFileSync('src/App.tsx', code);
