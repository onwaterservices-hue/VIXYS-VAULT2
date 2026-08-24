import re

with open("backend.ts", "r") as f:
    code = f.read()

bad = """
    try {
      await signInWithEmailAndPassword(backendAuth, 'backend_system@vixy.local', 'vixy_backend_super_secret_password_2026');
      console.log('[Firestore] Backend authenticated securely as system user.');
    } catch (authErr) {
      console.error('[Firestore] Backend authentication failed:', authErr);
    }
"""

good = """
    signInWithEmailAndPassword(backendAuth, 'backend_system@vixy.local', 'vixy_backend_super_secret_password_2026')
      .then(() => console.log('[Firestore] Backend authenticated securely as system user.'))
      .catch((authErr) => console.error('[Firestore] Backend authentication failed:', authErr));
"""

code = code.replace(bad, good)

with open("backend.ts", "w") as f:
    f.write(code)
