import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

function formatPrivateKey(key: string) {
  return key.replace(/\\n/g, '\n');
}

export function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return {
      admin,
      firestore: admin.firestore(),
      messaging: admin.messaging(),
      auth: admin.auth()
    };
  }

  try {
    let serviceAccount: any = null;

    // 1. Try Individual Environment Variables (Higher priority)
    const projectId = process.env.ADMIN_PROJECT_ID || process.env.admin_project_id || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.ADMIN_CLIENT_EMAIL || process.env.admin_client_email || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.ADMIN_PRIVATE_KEY || process.env.admin_private_key || process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      console.log('[Firebase Admin] Initializing with individual environment variables');
      serviceAccount = {
        projectId,
        clientEmail,
        privateKey: formatPrivateKey(privateKey)
      };
    }

    // 2. Try JSON Environment Variable
    if (!serviceAccount) {
      const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (serviceAccountJson) {
        console.log('[Firebase Admin] Initializing with SERVICE_ACCOUNT_JSON');
        try {
          serviceAccount = JSON.parse(serviceAccountJson);
        } catch (e) {
          console.error('[Firebase Admin] Failed to parse SERVICE_ACCOUNT_JSON:', e);
        }
      }
    }

    // 3. Try to load from file (Local Development)
    if (!serviceAccount) {
      try {
        const serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');
        if (fs.existsSync(serviceAccountPath)) {
          console.log('[Firebase Admin] Loading credentials from service-account-key.json');
          serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        }
      } catch (e: any) {
        console.warn('[Firebase Admin] Could not read service-account-key.json:', e.message);
      }
    }

    if (serviceAccount) {
      const projectId = serviceAccount.project_id || serviceAccount.projectId;
      const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
        storageBucket: storageBucket
      });
      console.log(`[Firebase Admin] Initialized successfully with explicit credentials (bucket: ${storageBucket})`);
    } else {
      // 4. Fallback to Application Default Credentials (ADC)
      // This works automatically on Google Cloud (App Engine, Cloud Functions, etc.)
      console.log('[Firebase Admin] No explicit credentials found, falling back to Application Default Credentials');
      const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-5437783532-5f953.firebasestorage.app';

      admin.initializeApp({
        storageBucket: storageBucket
      });
      console.log(`[Firebase Admin] Initialized successfully with ADC (bucket: ${storageBucket})`);
    }

    return {
      admin,
      firestore: admin.firestore(),
      messaging: admin.messaging(),
      auth: admin.auth()
    };

  } catch (error: any) {
    console.error('[Firebase Admin] Critical Initialization Error:', error.message);
    // Don't throw here, let the callers handle the missing services
    return {
      admin,
      firestore: null as any,
      messaging: null as any,
      auth: null as any
    };
  }
}

// Initialize immediately to export singletons
const { firestore, messaging } = initFirebaseAdmin();

export const adminDb = firestore;
export const adminMessaging = messaging;
export const adminAuth = admin.auth();

export function getAdminFirestore() {
  return adminDb;
}
