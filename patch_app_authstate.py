with open('src/App.tsx', 'r') as f:
    code = f.read()

# The authState declaration we want to extract
auth_state_decl = """  // Auth State (persisted or defaults to unauthenticated for visitors)
  const [authState, setAuthState] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem('vixy_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.isAuthenticated === 'boolean') {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return {
      isAuthenticated: false,
      user: null,
    };
  });"""

if auth_state_decl in code:
    code = code.replace("\n" + auth_state_decl + "\n", "")
    
    # We want to insert it before the trialSeconds useEffect.
    # We'll insert it right after the multi-asset state or userRole.
    insert_target = """  const [userRole, setUserRole] = useState<'DEMO' | 'PRO' | 'ADMIN'>(() => {"""
    code = code.replace(insert_target, auth_state_decl + "\n\n" + insert_target)
    
    with open('src/App.tsx', 'w') as f:
        f.write(code)
    print("Patched authState position successfully")
else:
    print("Could not find authState declaration exactly")

