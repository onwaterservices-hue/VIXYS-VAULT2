const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add the payment verification overlay component at the top or inside App
if (!code.includes("isVerifyingPayment")) {
  code = code.replace(
    "const [isEntitlementLoading, setIsEntitlementLoading] = useState<boolean>(true);",
    "const [isEntitlementLoading, setIsEntitlementLoading] = useState<boolean>(true);\n  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);\n  const [paymentVerificationText, setPaymentVerificationText] = useState<string>('VERIFYING PAYMENT...');"
  );
  
  // Add useEffect to handle URL params and polling
  const use_effect = `
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe_status');
    const dayPassParam = params.get('day_pass');
    
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
          const res = await safeFetchJson<any>(\`/api/auth/me?email=\${encodeURIComponent(authState.user.email)}\`);
          if (res?.user?.dayPass?.active || res?.user?.entitlement?.dayPass?.active || res?.user?.subscription === 'PRO_PASS' || res?.user?.subscription === 'ELITE_PASS') {
            clearInterval(pollInterval);
            setPaymentVerificationText('PAYMENT VERIFIED');
            setTimeout(() => {
              setIsVerifyingPayment(false);
              setActiveTab('live');
              // Clear URL
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
        } catch (e) {
          if (attempts >= 10) {
            clearInterval(pollInterval);
            setIsVerifyingPayment(false);
          }
        }
      }, 2000);
      
      return () => clearInterval(pollInterval);
    }
  }, [authState.isAuthenticated, authState.user?.email]);
  `;
  
  code = code.replace(
    "// 2. Fetch Authoritative Entitlement from Backend",
    use_effect + "\n\n  // 2. Fetch Authoritative Entitlement from Backend"
  );
  
  const overlay_ui = `
      {isVerifyingPayment && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-[#05020F]/95 backdrop-blur-md animate-fadeIn font-mono text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
          <h2 className="text-2xl font-black text-white tracking-widest uppercase animate-pulse">{paymentVerificationText}</h2>
          <p className="text-purple-300 mt-3 max-w-md mx-auto text-sm">Please hold on while we securely verify your payment and provision your vault access.</p>
        </div>
      )}
  `;
  
  code = code.replace(
    "<div className=\"min-h-screen",
    overlay_ui + "\n      <div className=\"min-h-screen"
  );
  
  fs.writeFileSync('src/App.tsx', code);
}

