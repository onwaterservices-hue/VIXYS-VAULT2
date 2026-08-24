import re

with open("backend.ts", "r") as f:
    code = f.read()

bad_login = """
  const cleanEmail = email.trim().toLowerCase();
  const user = serverUsers.find(u => u.email?.toLowerCase() === cleanEmail);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  }
"""

good_login = """
  const cleanEmail = email.trim().toLowerCase();
  let user = serverUsers.find(u => u.email?.toLowerCase() === cleanEmail);
  
  // Hydrate from Firestore if not found in memory
  if (!user && db) {
    try {
      const { getDocs, query, collection, where } = require('firebase/firestore');
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const uData = snap.docs[0].data();
        user = {
          id: snap.docs[0].id,
          uid: uData.uid || snap.docs[0].id,
          email: uData.email,
          name: uData.name || uData.email.split('@')[0],
          role: uData.role || 'USER',
          subscription: uData.subscription || 'NONE',
          passwordHash: uData.passwordHash || 'AuthManaged2026!',
          status: uData.status || 'ACTIVE'
        };
        serverUsers.unshift(user);
      }
    } catch (e) {
      console.warn('[LOGIN FIRESTORE LOOKUP ERROR]', e);
    }
  }
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  }
"""

code = code.replace(bad_login, good_login)

# Oh wait, `app.post('/api/auth/login'` is NOT async. Let's make it async.
bad_route = "app.post('/api/auth/login', (req, res) => {"
good_route = "app.post('/api/auth/login', async (req, res) => {"
code = code.replace(bad_route, good_route)

with open("backend.ts", "w") as f:
    f.write(code)
