import { initializeApp, getApps } from "firebase/app";

// Firebase-konfigurasjon fra miljøvariabler (NEXT_PUBLIC_FIREBASE_*)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Ved build-time (SSG) er env vars ikke tilgjengelige — bruk placeholder
// som aldri blir brukt runtime (klient-side har alltid env vars satt)
const isBuildTime =
  typeof window === "undefined" &&
  (!firebaseConfig.apiKey || !firebaseConfig.projectId);

if (isBuildTime) {
  firebaseConfig.apiKey = "build-placeholder";
  firebaseConfig.projectId = "build-placeholder";
}

// Unngå re-initialisering ved hot reload
export const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
