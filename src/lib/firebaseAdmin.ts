/**
 * TRUSTED SERVER-SIDE FIRESTORE IDENTITY (Firebase Admin SDK)
 *
 * WHY THIS EXISTS
 * ---------------
 * The production server (server.ts) authenticated to Firestore through the Firebase
 * CLIENT SDK, signing in as an ordinary Firebase Auth user whose credential was written
 * directly into source. That approach has three defects:
 *
 *   1. The credential lived in the repository and its git history, so anyone with read
 *      access to the repo could authenticate as the backend and reach every collection
 *      guarded by isBackendSystem() — users, subscriptions, stripe_events and the
 *      encrypted kalshi_credentials among them.
 *   2. `db` is assigned before the sign-in promise resolves, so writes issued during the
 *      boot window went out unauthenticated and were rejected with PERMISSION_DENIED.
 *   3. It made the security rules carry the entire trust boundary, which is why
 *      active_cycle_lock and signal_logs ended up world-writable to compensate.
 *
 * The Admin SDK authenticates as a service account and bypasses security rules entirely,
 * which is the correct trust model for a trusted backend. Rules can then deny client
 * writes outright, and there is no shared password to leak or rotate.
 *
 * CREDENTIALS — never committed
 * -----------------------------
 * Resolved in order:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON  — service-account JSON, raw or base64
 *   2. GOOGLE_APPLICATION_CREDENTIALS — path to a service-account file
 *   3. Application Default Credentials — when running on GCP/Cloud Run
 *
 * FAIL-SAFE, NOT FAIL-SILENT
 * --------------------------
 * With no credential this exports `adminDb === null` and records the reason. Callers must
 * branch on that and surface the degraded state instead of assuming a write landed.
 */

import { readFileSync } from 'fs';

type AdminFirestore = any;

let adminDbInstance: AdminFirestore | null = null;
let initError: string | null = null;
let initAttempted = false;
let credentialSource = 'NONE';

function decodeServiceAccount(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Accept raw JSON or base64 — platform env editors frequently mangle the embedded
  // newlines inside private_key, so base64 is the more reliable transport.
  const candidate = trimmed.startsWith('{')
    ? trimmed
    : Buffer.from(trimmed, 'base64').toString('utf8');

  const parsed = JSON.parse(candidate);
  if (parsed && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

function initAdmin(): AdminFirestore | null {
  if (initAttempted) return adminDbInstance;
  initAttempted = true;

  try {
    // Required lazily so bundling the frontend never pulls in firebase-admin.
    const admin = require('firebase-admin');

    const existing = admin.apps || [];
    if (existing.length > 0 && existing[0]) {
      adminDbInstance = admin.firestore();
      credentialSource = 'EXISTING_APP';
      return adminDbInstance;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || undefined;
    const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';

    let serviceAccount: Record<string, unknown> | null = null;
    if (inlineJson) {
      serviceAccount = decodeServiceAccount(inlineJson);
      credentialSource = 'FIREBASE_SERVICE_ACCOUNT_JSON';
    } else if (credPath) {
      serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
      credentialSource = 'GOOGLE_APPLICATION_CREDENTIALS';
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
        projectId: (serviceAccount as any).project_id || projectId,
      });
    } else {
      // ADC: succeeds on GCP with an attached service account, throws locally.
      admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
      credentialSource = 'APPLICATION_DEFAULT';
    }

    adminDbInstance = admin.firestore();
    console.log(`[FirebaseAdmin] Trusted server identity initialized via ${credentialSource}.`);
    return adminDbInstance;
  } catch (err: any) {
    initError = err?.message || String(err);
    credentialSource = 'NONE';
    console.warn(
      '[FirebaseAdmin] No service-account credential available. Falling back to the ' +
      'legacy client-SDK backend identity if BACKEND_SYSTEM_EMAIL/PASSWORD are configured. ' +
      'Set FIREBASE_SERVICE_ACCOUNT_JSON to use the trusted server path.'
    );
    return null;
  }
}

export const adminDb: AdminFirestore | null = initAdmin();

export function isAdminAvailable(): boolean {
  return adminDb !== null;
}

export function getAdminStatus(): {
  available: boolean;
  credentialSource: string;
  error: string | null;
} {
  return { available: adminDb !== null, credentialSource, error: initError };
}
