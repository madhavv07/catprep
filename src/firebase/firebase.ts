import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import baseFirebaseConfig from '../../firebase-applet-config.json';

// Ensure a structurally valid apiKey exists
export const safeFirebaseConfig = {
  apiKey: (baseFirebaseConfig as any).apiKey || 'AIzaSyPrepDeskMockKeyForPreviewEnvironment001',
  projectId: baseFirebaseConfig.projectId || 'prepdesk-dev-f89a2',
  authDomain: baseFirebaseConfig.authDomain || 'prepdesk-dev-f89a2.firebaseapp.com',
  storageBucket: baseFirebaseConfig.storageBucket || 'prepdesk-dev-f89a2.firebasestorage.app',
  firestoreDatabaseId: (baseFirebaseConfig as any).firestoreDatabaseId || '(default)',
};

// Initialize Firebase safely
const app = getApps().length > 0 ? getApp() : initializeApp(safeFirebaseConfig);

let authInstance: Auth;
try {
  authInstance = getAuth(app);
} catch (err) {
  console.warn('Firebase Auth init fallback:', err);
  const fallbackApp = initializeApp(
    { ...safeFirebaseConfig, apiKey: 'AIzaSyPrepDeskMockKeyForPreviewEnvironment001' },
    'prepdesk-auth-fallback'
  );
  authInstance = getAuth(fallbackApp);
}

export const auth = authInstance;
export const db: Firestore = getFirestore(app, safeFirebaseConfig.firestoreDatabaseId);

// Canonical helper to derive secure internal auth email from Student ID
export function studentIdToAuthEmail(studentId: string): string {
  const clean = studentId.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${clean}@prepdesk.internal`;
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client operating with offline persistence.');
    }
  }
}
testConnection();

export default app;

