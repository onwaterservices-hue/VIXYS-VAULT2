const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const target1 = `  try {
    await ensureFirebaseReady();
  } catch (initErr: any) {
    console.error(\`[AUTH_DEBUG] FIREBASE_INIT_FAILED reqId=\${reqId}:\`, initErr?.message || initErr);
    console.log(\`[AUTH SERVICE UNAVAILABLE] email=\${cleanEmail}\`);
    return res.status(503).json({
      success: false,
      error: 'AUTH_SERVICE_UNAVAILABLE',
      message: 'Authentication service is temporarily unavailable. Please try again in a few moments.'
    });
  }`;

const replacement1 = `  try {
    await ensureFirebaseReady();
  } catch (initErr: any) {
    console.error(\`[AUTH_DEBUG] FIREBASE_INIT_FAILED reqId=\${reqId}:\`, initErr?.message || initErr);
    // Continue with in-memory fallback
  }`;

const target2 = `  try { await ensureFirebaseReady(); } catch (initErr: any) {}`;
// target2 is already non-blocking

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  fs.writeFileSync('backend.ts', code);
  console.log('Fixed login fallback');
} else {
  console.log('Target 1 not found');
}
