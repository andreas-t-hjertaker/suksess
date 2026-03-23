"use client";

/**
 * Firebase App Check — misbruksbeskyttelse for AI og API (#49)
 *
 * Bruker reCAPTCHA Enterprise (v3, usynlig) som attestasjonsleverandør.
 * App Check verifiserer at kall til Firebase-tjenester (Vertex AI, Firestore,
 * Functions) kommer fra ekte klienter — ikke scriptkiddie-automatisering.
 *
 * Bakgrunn: Truffle Security (feb. 2026) avslørte at 2 863 eksponerte
 * Google API-nøkler fikk stille Gemini-tilgang. App Check er primær
 * mitigasjon.
 *
 * Setup i Firebase Console:
 * 1. Firebase → App Check → Registrer web-app
 * 2. Velg reCAPTCHA Enterprise, lim inn site key
 * 3. Aktiver enforcement for: Vertex AI, Firestore, Cloud Functions
 * 4. I GCP Console: opprett reCAPTCHA Enterprise-nøkkel for domenet
 */

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { app } from "./config";

let appCheckInitialized = false;

/**
 * Initialiser App Check med reCAPTCHA Enterprise.
 * Kall denne én gang tidlig i app-livsyklusen (f.eks. i layout.tsx).
 *
 * I development kan du bruke debug-token:
 *   localStorage.setItem("FIREBASE_APPCHECK_DEBUG_TOKEN", "din-debug-token")
 */
export function initAppCheck(): void {
  if (appCheckInitialized) return;
  if (typeof window === "undefined") return; // Server-side: ikke initialiser

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;

  if (!siteKey) {
    if (process.env.NODE_ENV === "development") {
      // Development-modus: App Check deaktiveres stilltiende
      console.debug("[AppCheck] NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY mangler — App Check deaktivert i utvikling");
    }
    return;
  }

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      // isTokenAutoRefreshEnabled: oppdater token automatisk
      isTokenAutoRefreshEnabled: true,
    });
    appCheckInitialized = true;
  } catch (err) {
    // App Check-feil skal ikke krasje appen
    console.error("[AppCheck] Initialisering feilet:", err);
  }
}
