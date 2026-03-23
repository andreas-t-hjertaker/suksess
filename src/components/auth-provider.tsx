"use client";

import React, { useEffect } from "react";
import { AuthContext, useAuthState } from "@/hooks/use-auth";
import { initializeUserDoc } from "@/lib/firebase/collections";

/** Wrapper-komponent som gir autentiserings-kontekst til hele appen */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();

  // Initialiser brukerdokument ved første innlogging
  useEffect(() => {
    const { firebaseUser } = authState;
    if (!firebaseUser) return;
    initializeUserDoc(firebaseUser.uid, {
      displayName: firebaseUser.displayName,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
    }).catch(() => {
      // Ignorer — brukeren kan allerede eksistere
    });
  }, [authState.firebaseUser?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}
