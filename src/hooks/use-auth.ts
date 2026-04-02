"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import {
  onAuthChange,
  signInWithGoogle,
  signInWithFeide,
  getFeideRedirectResult,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  resetPassword,
  signInAnonymous,
  sendEmailLink,
  isEmailLink,
  completeEmailLinkSignIn,
} from "@/lib/firebase/auth";
import type { User } from "@/types";
import { getAuthErrorMessage } from "@/lib/firebase/auth-errors";

type AuthContextType = {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  /** Feilmelding fra Feide-redirect (vises ved oppstart etter feil redirect) */
  feideError: string | null;
  /** Om e-post trengs for e-postlenke-innlogging (kryss-enhet) */
  emailPromptNeeded: boolean;
  signInGoogle: () => Promise<void>;
  signInFeide: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  sendEmailSignInLink: (email: string) => Promise<void>;
  completeEmailSignIn: () => Promise<boolean>;
  /** Fullfør e-postlenke-innlogging med brukeroppgitt e-post */
  confirmEmailForSignIn: (email: string) => Promise<boolean>;
  clearFeideError: () => void;
};

// Eksporter context slik at provider-komponenten kan bruke den
export const AuthContext = createContext<AuthContextType | null>(null);

/** Hook for å hente autentiseringsstatus og funksjoner */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth må brukes innenfor en AuthProvider");
  }
  return ctx;
}

/** Hook som bare brukes av AuthProvider internt */
export function useAuthState() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [feideError, setFeideError] = useState<string | null>(null);
  const [emailPromptNeeded, setEmailPromptNeeded] = useState(false);
  const pendingEmailUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((fbUser) => {
      setFirebaseUser(fbUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Konverter Firebase-bruker til vår brukertype
  const user: User | null = firebaseUser
    ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
      }
    : null;

  // Håndter Feide-redirect-resultat ved oppstart
  useEffect(() => {
    getFeideRedirectResult().catch((err) => {
      // Ignorer forventet "ingen aktiv redirect" — vis ekte feil
      const code = (err as { code?: string })?.code;
      if (code && code !== "auth/null-user") {
        setFeideError(getAuthErrorMessage(err));
      }
    });
  }, []);

  const signInGoogle = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const signInFeideCallback = useCallback(async () => {
    await signInWithFeide();
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmail(email, password);
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    await signUpWithEmail(email, password);
  }, []);

  const handleSignOut = useCallback(async () => {
    // Rydd opp localStorage-cache ved utlogging (GDPR)
    try {
      const { pruneL3Cache } = await import("@/lib/ai/cache");
      pruneL3Cache();
    } catch { /* cache-modul ikke tilgjengelig */ }
    await signOutUser();
  }, []);

  const handleResetPassword = useCallback(async (email: string) => {
    await resetPassword(email);
  }, []);

  const handleSignInAnonymously = useCallback(async () => {
    await signInAnonymous();
  }, []);

  const handleSendEmailSignInLink = useCallback(async (email: string) => {
    await sendEmailLink(email);
  }, []);

  /**
   * Fullfør e-postlenke-innlogging.
   * Returnerer `true` hvis URL-en var en gyldig innloggingslenke og brukeren ble logget inn.
   * Hvis e-post mangler i localStorage (kryss-enhet), sett emailPromptNeeded=true
   * og vent på at login-siden kaller confirmEmailForSignIn().
   */
  const handleCompleteEmailSignIn = useCallback(async (): Promise<boolean> => {
    const url = window.location.href;
    if (!isEmailLink(url)) return false;

    const email = window.localStorage.getItem("emailForSignIn");
    if (!email) {
      // Kryss-enhet: trenger e-post fra bruker via UI (ikke window.prompt)
      pendingEmailUrlRef.current = url;
      setEmailPromptNeeded(true);
      return false;
    }

    await completeEmailLinkSignIn(email, url);
    return true;
  }, []);

  /** Bruker oppgir e-post for kryss-enhet e-postlenke-innlogging */
  const handleConfirmEmailForSignIn = useCallback(async (email: string): Promise<boolean> => {
    const url = pendingEmailUrlRef.current;
    if (!url || !email) return false;

    await completeEmailLinkSignIn(email, url);
    pendingEmailUrlRef.current = null;
    setEmailPromptNeeded(false);
    return true;
  }, []);

  const clearFeideError = useCallback(() => setFeideError(null), []);

  return {
    user,
    firebaseUser,
    loading,
    feideError,
    emailPromptNeeded,
    signInGoogle,
    signInFeide: signInFeideCallback,
    signInEmail,
    signUpEmail,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    signInAnonymously: handleSignInAnonymously,
    sendEmailSignInLink: handleSendEmailSignInLink,
    completeEmailSignIn: handleCompleteEmailSignIn,
    confirmEmailForSignIn: handleConfirmEmailForSignIn,
    clearFeideError,
  };
}
