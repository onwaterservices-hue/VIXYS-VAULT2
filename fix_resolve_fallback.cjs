const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const loginTarget = `  let resolution: CanonicalUserResolution;
  try {
    resolution = await resolveCanonicalUserByEmail(cleanEmail);
  } catch (lookupErr: any) {
    console.error(\`[AUTH_DEBUG] FIRESTORE_LOOKUP_EXCEPTION reqId=\${reqId}:\`, lookupErr?.message || lookupErr);
    
    // Check if it's an explicit firestore failure return
    if (lookupErr?.status === 503 || lookupErr?.code === 'resource-exhausted') {
      return res.status(503).json({ success: false, error: 'AUTH_SERVICE_UNAVAILABLE', message: 'Authentication service is temporarily unavailable.' });
    }`;

const loginReplacement = `  let resolution: CanonicalUserResolution;
  try {
    resolution = await resolveCanonicalUserByEmail(cleanEmail);
    if ((resolution as any).status === 503) { throw new Error("503 returned"); }
  } catch (lookupErr: any) {
    const fallbackUser = serverUsers.find(u => u.email?.toLowerCase() === cleanEmail);
    resolution = { user: fallbackUser || null, allDocs: fallbackUser ? [fallbackUser] : [] };
  }
  
  if (!resolution.user && serverUsers) {
    const fallbackUser = serverUsers.find(u => u.email?.toLowerCase() === cleanEmail);
    if (fallbackUser) resolution = { user: fallbackUser, allDocs: [fallbackUser] };
  }`;

if (code.includes('resolution = await resolveCanonicalUserByEmail(cleanEmail);')) {
  // We'll just patch the function resolveCanonicalUserByEmail itself to not return {status: 503}
  const resolveTarget = `    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota')) {
      console.log(\`[AUTH] email=\${cleanEmail} firestore=UNAVAILABLE status=503\`);
      return Promise.reject({ status: 503, message: err.message, code: err.code });
    }`;
  const resolveReplacement = `    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota')) {
      console.log(\`[AUTH] email=\${cleanEmail} firestore=UNAVAILABLE FALLING BACK TO MEMORY\`);
      const fallback = serverUsers.find(u => u.email?.toLowerCase() === cleanEmail);
      return { user: fallback || null, allDocs: fallback ? [fallback] : [] };
    }`;
  code = code.replace(resolveTarget, resolveReplacement);
  fs.writeFileSync('backend.ts', code);
  console.log('Patched resolveCanonicalUserByEmail to fallback to memory.');
}
