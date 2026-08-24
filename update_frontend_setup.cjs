const fs = require('fs');

function updateFrontend(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // 1. Add state for setup
    if (!content.includes('const [setupTokenSent, setSetupTokenSent] = useState(false);')) {
        content = content.replace(
            "const [mode, setMode] = useState<'login' | 'register' | 'setup'>('login');",
            "const [mode, setMode] = useState<'login' | 'register' | 'setup'>('login');\n  const [setupTokenSent, setSetupTokenSent] = useState(false);\n  const [setupToken, setSetupToken] = useState('');"
        );
    }
    
    // 2. Change the setupUI completely
    const setupUIRegex = /\{mode === 'setup' && \([\s\S]*?Back to Sign In<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*\)\}/;
    
    const newSetupUI = `
            {mode === 'setup' && (
              <div className="space-y-4">
                <div className="p-6 bg-purple-500/10 border border-purple-500/40 rounded-2xl text-center space-y-4">
                  <ShieldCheck className="w-10 h-10 text-amber-400 mx-auto" />
                  <h3 className="text-lg font-bold text-white">ACCOUNT FOUND</h3>
                  <p className="text-xs text-purple-300 font-sans">
                    {!setupTokenSent 
                      ? "Your VIXY VAULT purchase is already attached to this email.\\nVerify ownership and create your password."
                      : "We've sent a verification code to your email.\\nEnter it below to create your password."}
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-purple-300/70 block font-semibold">Email</label>
                  <input
                    type="email"
                    readOnly
                    value={email}
                    className="w-full bg-[#0B061A]/50 border border-purple-900/40 rounded-xl px-4 py-2.5 text-purple-300/50 cursor-not-allowed"
                  />
                </div>

                {!setupTokenSent ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      setErrorMsg('');
                      try {
                        const res = await fetch('/api/auth/request-password-setup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email })
                        }).then(r => r.json());
                        
                        setLoading(false);
                        if (res.success) {
                          setSetupTokenSent(true);
                          setSuccessMsg('Verification code sent to your email.');
                        } else {
                          setErrorMsg(res.message || 'Failed to send verification code.');
                        }
                      } catch (e) {
                        setLoading(false);
                        setErrorMsg('Network error. Please try again.');
                      }
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3 rounded-xl transition-all"
                  >
                    SEND VERIFICATION CODE
                  </button>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-purple-300/70 block font-semibold">Verification Code</label>
                      <input
                        type="text"
                        required
                        value={setupToken}
                        onChange={(e) => setSetupToken(e.target.value)}
                        className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-4 py-2.5 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500 tracking-widest text-center uppercase"
                        placeholder="XXXXXX"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-purple-300/70 block font-semibold">New Password</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-4 py-2.5 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-purple-300/70 block font-semibold">Confirm Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-4 py-2.5 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        if (!setupToken) {
                          setErrorMsg('Please enter the verification code.');
                          return;
                        }
                        if (password !== confirmPassword) {
                          setErrorMsg('Passwords do not match.');
                          return;
                        }
                        if (password.length < 6) {
                          setErrorMsg('Password must be at least 6 characters.');
                          return;
                        }
                        
                        setLoading(true);
                        setErrorMsg('');
                        try {
                          const actRes = await fetch('/api/auth/initialize-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email, password: password, token: setupToken })
                          }).then(r => r.json());
                          
                          if (actRes.success) {
                            setSuccessMsg('ACCOUNT READY! Entering VIXY Terminal...');
                            const serverUser = actRes.user || {};
                            const canonicalUserId = serverUser.id || serverUser.uid || \`usr_\${email.replace(/[^a-zA-Z0-9_]/g, '_')}\`;
                            
                            let assignedRole = email === 'vixyvault0@gmail.com' ? 'ADMIN' : 'UNPAID';
                            if (actRes.entitlement) {
                               if (actRes.entitlement.canAccessAdminPanel) assignedRole = 'ADMIN';
                               else if (actRes.entitlement.proQuant || actRes.entitlement.eliteQuant || actRes.entitlement.dayPassActive) assignedRole = 'PRO';
                            }
                            
                            setAuthState({
                              isAuthenticated: true,
                              user: {
                                id: canonicalUserId,
                                email,
                                role: assignedRole as 'PRO' | 'ADMIN' | 'UNPAID',
                                discordLinked: false,
                                discordId: undefined,
                                discordTag: undefined
                              }
                            });
                            setUserRole(assignedRole as any);
                            if (typeof onSuccessNavigate === 'function') {
                              setTimeout(() => onSuccessNavigate(assignedRole as any), 1000);
                            }
                          } else {
                            setLoading(false);
                            setErrorMsg(actRes.message || 'Failed to initialize password.');
                            if (actRes.error === 'PASSWORD_ALREADY_SET') {
                               setMode('login');
                               setSetupTokenSent(false);
                            }
                          }
                        } catch (e) {
                          setLoading(false);
                          setErrorMsg('Network error. Please try again.');
                        }
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3 rounded-xl transition-all"
                    >
                      SET PASSWORD & ENTER TERMINAL
                    </button>
                  </>
                )}
                
                <div className="text-center pt-2">
                  <button type="button" onClick={() => { setMode('login'); setSetupTokenSent(false); }} className="text-purple-400 hover:text-white underline text-xs">Back to Sign In</button>
                </div>
              </div>
            )}`;

    content = content.replace(setupUIRegex, newSetupUI);
    
    // 3. Update wording for the CREATE ACCOUNT tab as requested
    content = content.replace(
      />\s*Create Your VIXY Account\s*<\/h1>/,
      ">Set Up Your VIXY VAULT Access</h1>"
    );
    content = content.replace(
      /Create your account to unlock 24-Hour Day Pass \(\$9\.99\) & Full\s*Terminal Access\./,
      "New to VIXY VAULT? Purchase access through the official Stripe Payment Link, then return here to set up your account."
    );

    fs.writeFileSync(filepath, content);
}

updateFrontend('src/components/AuthView.tsx');
updateFrontend('src/components/AuthModal.tsx');
console.log('Frontend updated!');
