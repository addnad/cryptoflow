import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase client bootstrap. Entirely env-driven: when the public config is
 * absent the app runs on the local services adapter instead (see
 * lib/services/index.ts) so nothing here may throw at import time.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured: boolean = Boolean(
  config.apiKey && config.projectId && config.appId,
);

let app: FirebaseApp | null = null;

function getApp(): FirebaseApp {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured for this build.");
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}

export function getDb(): Firestore {
  return getFirestore(getApp());
}
