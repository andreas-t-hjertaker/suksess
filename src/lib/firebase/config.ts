import { initializeApp, getApps } from "firebase/app";

// Les fra miljøvariabler med fallback til suksess-842ed prosjektet
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCRzbVt9axQR1iTGHpLYG_P81fvz9c8Z5Q",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "suksess-842ed.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://suksess-842ed-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "suksess-842ed",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "suksess-842ed.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1054760477581",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1054760477581:web:603deaaba460db4d5693c4",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-6STHL923D3",
};

// Unngå re-initialisering ved hot reload
export const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
