import re

with open("backend.ts", "r") as f:
    code = f.read()

# Add import
import_str = "import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';\n"
code = code.replace("import { initializeApp } from 'firebase/app';", import_str + "import { initializeApp } from 'firebase/app';")

# Find where initializeApp happens
init_block = """
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
"""

auth_block = """
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    const backendAuth = getAuth(firebaseApp);
    try {
      await signInWithEmailAndPassword(backendAuth, 'backend_system@vixy.local', 'vixy_backend_super_secret_password_2026');
      console.log('[Firestore] Backend authenticated securely as system user.');
    } catch (authErr) {
      console.error('[Firestore] Backend authentication failed:', authErr);
    }
"""

code = code.replace(init_block, auth_block)

with open("backend.ts", "w") as f:
    f.write(code)
