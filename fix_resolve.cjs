const fs = require('fs');

let content = fs.readFileSync('backend.ts', 'utf8');

const regex = /async function resolveCanonicalUserByEmail\(email: string\): Promise<CanonicalUserResolution> \{[\s\S]*?return \{ user: null, allDocs: \[\], error: firestoreErr\?\.message \|\| 'FIRESTORE_ERROR' \};\n  \}\n\}/;

const newFunc = `async function resolveCanonicalUserByEmail(email: string): Promise<CanonicalUserResolution> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { user: null, allDocs: [] };
  }

  // 1. Check in-memory hydrated cache FIRST
  const memUser = serverUsers.find(u => u.email?.toLowerCase() === cleanEmail);
  if (memUser) {
    console.log(\`[VIXY_AUTH_SOURCE] source=MEMORY_HYDRATED email=\${cleanEmail}\`);
    return { user: memUser, allDocs: [] };
  }

  // 2. Fallback to Firestore if NOT in memory
  try {
    await ensureFirebaseReady();
  } catch (initErr: any) {
    console.error('[AUTH_DEBUG] ensureFirebaseReady error in resolveCanonicalUserByEmail:', initErr?.message || initErr);
    return { user: null, allDocs: [], error: 'FIREBASE_INIT_FAILED' };
  }

  if (!db) {
    return { user: null, allDocs: [] };
  }

  try {
    await ensureFirestoreNetworkEnabled().catch(() => {});
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const snap = await getDocs(q);
    
    const allDocs: any[] = [];
    snap.forEach((d: any) => {
      allDocs.push({ _docId: d.id, ...d.data() });
    });

    if (allDocs.length === 0) {
      return { user: null, allDocs: [] };
    }

    // Sort documents by heuristic score
    const sortedDocs = [...allDocs].sort((a, b) => scoreUserDoc(b) - scoreUserDoc(a));
    const bestDoc = sortedDocs[0];

    const credentialDoc = allDocs.find(d => d.passwordHash && typeof d.passwordHash === 'string' && d.passwordHash.startsWith('vixy$'))
      || allDocs.find(d => d.passwordHash && typeof d.passwordHash === 'string' && d.passwordHash !== 'AuthManaged2026!' && d.passwordHash.length > 0);

    const effectivePasswordHash = credentialDoc?.passwordHash && credentialDoc.passwordHash !== 'AuthManaged2026!'
      ? credentialDoc.passwordHash
      : undefined;

    const subDoc = allDocs.find(d => d.subscription && d.subscription !== 'NONE') || bestDoc;

    const resolvedUser: ServerUser = {
      id: bestDoc.id || bestDoc._docId,
      uid: bestDoc.uid || bestDoc._docId,
      email: cleanEmail,
      name: bestDoc.name || credentialDoc?.name || cleanEmail.split('@')[0],
      role: isMasterAdminEmail(cleanEmail) ? 'OWNER' : (bestDoc.role || 'USER'),
      subscription: isMasterAdminEmail(cleanEmail) ? 'ELITE_PASS' : (subDoc.subscription || bestDoc.subscription || 'NONE'),
      passwordHash: effectivePasswordHash,
      status: bestDoc.status || (subDoc.subscription && subDoc.subscription !== 'NONE' ? 'ACTIVE' : 'INACTIVE'),
      joined: bestDoc.joined || bestDoc.createdAt || new Date().toISOString().split('T')[0],
      stripeCustomerId: bestDoc.stripeCustomerId || subDoc.stripeCustomerId || undefined,
      stripeSubscriptionId: bestDoc.stripeSubscriptionId || subDoc.stripeSubscriptionId || undefined,
      discordLinked: Boolean(bestDoc.discordLinked || bestDoc.discordId),
      discordId: bestDoc.discordId || undefined,
      discordTag: bestDoc.discordTag || undefined,
      guildVerified: bestDoc.guildVerified || undefined
    };

    serverUsers.unshift(resolvedUser);
    console.log(\`[VIXY_AUTH_SOURCE] source=FIRESTORE email=\${cleanEmail}\`);
    return { user: resolvedUser, allDocs };
  } catch (firestoreErr: any) {
    if (firestoreErr?.code === 'resource-exhausted') {
      persistenceState = 'DEGRADED_CACHE_ACTIVE';
    }
    console.error('[AUTH_DEBUG] FIRESTORE_QUERY_ERROR in resolveCanonicalUserByEmail:', {
      email: cleanEmail,
      code: firestoreErr?.code,
      message: firestoreErr?.message
    });
    return { user: null, allDocs: [], error: firestoreErr?.message || 'FIRESTORE_ERROR' };
  }
}`;

content = content.replace(regex, newFunc);
fs.writeFileSync('backend.ts', content);
console.log('resolveCanonicalUserByEmail replaced successfully.');
