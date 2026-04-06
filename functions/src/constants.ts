/**
 * Central constants for Suksess Cloud Functions.
 * Extracted from inline magic numbers for maintainability.
 */

// ============================================================
// API Key Management (#100)
// ============================================================

/** API key TTL in days (90 dagar) */
export const API_KEY_TTL_DAYS = 90;

/** Maximum recipients for email sending */
export const EMAIL_MAX_RECIPIENTS = 50;

/** Batch import limit for school users */
export const SCHOOL_USER_IMPORT_BATCH_SIZE = 100;

// ============================================================
// Stripe B2B / EHF Peppol (#110)
// ============================================================

/** Organization number validation — Norwegian orgnr is exactly 9 digits */
export const ORG_NUMBER_DIGITS = 9;

/** EHF/Peppol retry maximum attempts */
export const EHF_MAX_RETRY_ATTEMPTS = 3;

// ============================================================
// Rate Limiting
// ============================================================

/** Default rate limit window (seconds) */
export const RATE_LIMIT_WINDOW_SECONDS = 60;

/** Default rate limit requests per window */
export const RATE_LIMIT_REQUESTS_PER_WINDOW = 10;

// ============================================================
// Consent / GDPR (#106)
// ============================================================

/** Parent consent token TTL in milliseconds (24 hours) */
export const CONSENT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Parent consent email template locale */
export const CONSENT_EMAIL_LOCALE = "nb";

// ============================================================
// Firebase Configuration
// ============================================================

/** Default Cloud Functions region */
export const FUNCTIONS_REGION = "europe-west1";

/** Allowed CORS origins */
export const ALLOWED_ORIGINS = [
  "https://suksess.no",
  "https://www.suksess.no",
  "https://suksess-842ed.web.app",
  "https://suksess-842ed.firebaseapp.com",
  /^http:\/\/localhost(:\d+)?$/,
];

// ============================================================
// Feature Flags (Default values)
// ============================================================

export const DEFAULT_FEATURE_FLAGS = {
  "ai-chat": true,
  "career-path": true,
  "school-admin": true,
} as const;
