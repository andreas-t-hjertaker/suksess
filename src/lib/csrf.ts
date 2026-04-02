/**
 * CSRF-beskyttelse for API-kall (#139)
 *
 * Genererer et kryptografisk sikkert CSRF-token per sesjon.
 * Tokenet sendes som X-CSRF-Token header på alle muterende
 * forespørsler (POST, PUT, PATCH, DELETE).
 *
 * Cloud Functions validerer at tokenet finnes og matcher
 * et gyldig format (forhindrer CSRF-angrep).
 */

const CSRF_KEY = "suksess-csrf";

/** Generer et kryptografisk tilfeldig CSRF-token */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hent eller opprett CSRF-token for gjeldende sesjon */
export function getCsrfToken(): string {
  if (typeof window === "undefined") return "";

  let token = sessionStorage.getItem(CSRF_KEY);
  if (!token) {
    token = generateToken();
    sessionStorage.setItem(CSRF_KEY, token);
  }
  return token;
}

/** Valider format på CSRF-token (64 hex-tegn) */
export function isValidCsrfFormat(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}
