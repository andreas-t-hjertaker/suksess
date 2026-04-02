/**
 * Sentralisert Firebase Auth feilhåndtering.
 *
 * Mapper Firebase-feilkoder til brukervennlige norske meldinger.
 * Brukes av login-side, auth-hooks og API-klient.
 */

/** Firebase auth feilkode → norsk brukermelding */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // E-post/passord
  "auth/user-not-found": "Ingen bruker funnet med denne e-postadressen.",
  "auth/wrong-password": "Feil passord.",
  "auth/invalid-credential": "Ugyldig e-post eller passord.",
  "auth/email-already-in-use": "Denne e-postadressen er allerede i bruk.",
  "auth/weak-password": "Passordet må være minst 6 tegn.",
  "auth/invalid-email": "Ugyldig e-postadresse.",
  "auth/too-many-requests": "For mange forsøk. Prøv igjen senere.",

  // Popup/redirect
  "auth/popup-closed-by-user": "Innloggingsvinduet ble lukket. Prøv igjen.",
  "auth/popup-blocked":
    "Popup ble blokkert av nettleseren. Tillat popups for denne siden.",
  "auth/cancelled-popup-request": "Innloggingen ble avbrutt.",

  // Nettverks- og konfigurasjonsfeil
  "auth/network-request-failed":
    "Ingen nettverkstilkobling. Sjekk internett og prøv igjen.",
  "auth/unauthorized-domain":
    "Innlogging er ikke tillatt fra dette domenet.",
  "auth/operation-not-allowed":
    "Denne innloggingsmetoden er ikke aktivert.",
  "auth/invalid-api-key": "Ugyldig konfigurasjon. Kontakt support.",

  // Kontostatus
  "auth/user-disabled":
    "Denne kontoen er deaktivert. Kontakt skolens administrator.",
  "auth/account-exists-with-different-credential":
    "En konto med denne e-posten finnes allerede. Prøv en annen innloggingsmetode.",

  // E-postlenke
  "auth/expired-action-code": "Lenken har utløpt. Be om en ny.",
  "auth/invalid-action-code": "Ugyldig lenke. Be om en ny.",
};

/**
 * Hent brukervennlig feilmelding fra en Firebase auth-feil.
 *
 * Håndterer Firebase-feilkoder, nettverksfeil og ukjente feil.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return AUTH_ERROR_MESSAGES["auth/network-request-failed"];
  }

  const code = extractErrorCode(error);
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  return "Noe gikk galt. Prøv igjen.";
}

/**
 * Sjekk om en feil er en nettverksfeil.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.message.includes("network") || error.message.includes("Network")) {
      return true;
    }
  }

  const code = extractErrorCode(error);
  return code === "auth/network-request-failed";
}

/**
 * Sjekk om feilen er en bruker-avbrutt handling (ikke en ekte feil).
 * Nyttig for å unngå å vise feilmelding ved avbrutt popup/redirect.
 */
export function isUserCancelledError(error: unknown): boolean {
  const code = extractErrorCode(error);
  return (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/redirect-cancelled-by-user"
  );
}

/** Trekk ut Firebase-feilkode fra et ukjent error-objekt */
function extractErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return null;
}
