"use client";

import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
  type Unsubscribe,
  type ActionCodeSettings,
} from "firebase/auth";
import { app } from "./config";

export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

// ─── Feide OIDC ──────────────────────────────────────────
// Feide er Norges nasjonale innloggingstjeneste for skoler og universiteter.
// Firebase støtter Feide via OIDC-tilleggsleverandør.
// FEIDE_OIDC_PROVIDER_ID konfigureres i Firebase Authentication console.

const FEIDE_PROVIDER_ID =
  process.env.NEXT_PUBLIC_FEIDE_PROVIDER_ID ?? "oidc.feide";

function createFeideProvider() {
  const provider = new OAuthProvider(FEIDE_PROVIDER_ID);
  // Feide krever disse scope-ene for å hente skole-tilknytning
  provider.addScope("openid");
  provider.addScope("profile");
  provider.addScope("email");
  provider.addScope("userid-feide");
  provider.addScope("groups-org");
  // Be om org-tilknytning for multi-tenant
  provider.setCustomParameters({
    prompt: "select_account",
  });
  return provider;
}

// ─── Google ──────────────────────────────────────────────

/** Logg inn med Google-popup */
export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

// ─── Feide OIDC ──────────────────────────────────────────

/**
 * Logg inn med Feide via OIDC-redirect.
 * Bruk redirect (ikke popup) da Feide blokkerer popups.
 * Etter redirect: kall `getFeideRedirectResult()` for å hente brukeren.
 */
export async function signInWithFeide() {
  const provider = createFeideProvider();
  return signInWithRedirect(auth, provider);
}

/**
 * Hent resultat etter Feide-redirect.
 * Kall ved oppstart av appen (f.eks. i AuthProvider).
 * Returnerer null hvis ingen redirect er i gang.
 */
export async function getFeideRedirectResult() {
  return getRedirectResult(auth);
}

// ─── E-post / passord ────────────────────────────────────

/** Logg inn med e-post og passord */
export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Opprett ny bruker med e-post og passord */
export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

/** Send e-post for tilbakestilling av passord */
export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

// ─── E-postlenke (passordløs) ────────────────────────────

/**
 * Send en innloggingslenke til brukerens e-post.
 * `url` er adressen brukeren sendes tilbake til etter klikk (default: /login).
 */
export async function sendEmailLink(email: string, url?: string) {
  const actionCodeSettings: ActionCodeSettings = {
    url: url ?? `${window.location.origin}/login`,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  // Lagre e-post lokalt slik at vi kan fullføre innlogging på callback
  window.localStorage.setItem("emailForSignIn", email);
}

/** Sjekk om gjeldende URL er en innloggingslenke */
export function isEmailLink(url: string) {
  return isSignInWithEmailLink(auth, url);
}

/** Fullfør innlogging via e-postlenke */
export async function completeEmailLinkSignIn(email: string, url: string) {
  const result = await signInWithEmailLink(auth, email, url);
  window.localStorage.removeItem("emailForSignIn");
  return result;
}

// ─── Anonym ──────────────────────────────────────────────

/** Logg inn anonymt */
export async function signInAnonymous() {
  return firebaseSignInAnonymously(auth);
}

// ─── Felles ──────────────────────────────────────────────

/** Logg ut */
export async function signOutUser() {
  return signOut(auth);
}

/** Lytt på endringer i autentiseringstilstand */
export function onAuthChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
