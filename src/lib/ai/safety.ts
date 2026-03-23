/**
 * AI Safety guardrails for mindreårige (Issue #57)
 *
 * Lag-delt forsvar:
 * 1. Krise-detektor (regex) — kjøres FØR LLM-kall
 * 2. PII-detektor — blokkér personnummer, telefon, e-post
 * 3. Prompt-injeksjonsdetektor — fjerner jailbreak-forsøk
 * 4. Rate limiting metadata — håndheves server-side
 */

// ─── Krise-nøkkelord ──────────────────────────────────────────────────────────

const KRISE_PATTERNS = [
  /\b(ta mitt liv|ta livet mitt|selvmord|suicid|avslutte livet)\b/i,
  /\b(skade meg selv|skader meg|kutte meg|skjære meg)\b/i,
  /\b(ikke vil leve|vil ikke leve|orker ikke mer|gir opp livet)\b/i,
  /\b(overgrep|misbruk|vold hjemme|slått hjemme)\b/i,
  /\b(rusmiddel|narkotika|kjøpe hasj|kjøpe amfetamin)\b/i,
];

const KRISE_SVAR = `Jeg merker at det du skriver kan handle om noe vanskelig. Jeg er en AI og kan ikke hjelpe med dette, men det finnes voksne som kan:

**Kristelefonen:** 116 111 (døgnet rundt, gratis)
**ung.no/rådogrett:** Chat med rådgivere
**Helsesykepleier på skolen din** kan også hjelpe

Du trenger ikke ha det slik alene. Ring eller chat nå.`;

// ─── PII-mønstre (norsk) ──────────────────────────────────────────────────────

const PII_PATTERNS = [
  { name: "personnummer", pattern: /\b\d{6}\s?\d{5}\b/ },
  { name: "telefon",      pattern: /\b(\+47|0047)?\s?[2-9]\d{7}\b/ },
  { name: "epost",        pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/ },
];

// ─── Prompt-injeksjonsmønstre ─────────────────────────────────────────────────

const INJEKSJON_PATTERNS = [
  /ignore (previous|all) instructions/i,
  /you are now (a|an|the)/i,
  /forget (everything|your|all) (you|previous)/i,
  /\[SYSTEM\]|\[INST\]|<\|im_start\|>/i,
  /jailbreak|DAN mode|developer mode/i,
  /act as if you (have no|are without) (restrictions|guidelines)/i,
];

// ─── Eksporterte funksjoner ───────────────────────────────────────────────────

export interface SafetyCheckResult {
  safe: boolean;
  reason?: "krise" | "pii" | "injeksjon";
  kriseResponse?: string;
  sanitizedMessage?: string;
}

/**
 * Sjekk melding for krise, PII og injeksjon.
 * Returnerer sanitisert melding eller krise-bypass.
 */
export function checkMessageSafety(message: string): SafetyCheckResult {
  // 1. Krise-detektor
  for (const pattern of KRISE_PATTERNS) {
    if (pattern.test(message)) {
      return { safe: false, reason: "krise", kriseResponse: KRISE_SVAR };
    }
  }

  // 2. PII-detektor — fjern sensitiv info
  let sanitized = message;
  for (const { pattern } of PII_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[FJERNET]");
  }

  // 3. Prompt-injeksjonsdetektor
  for (const pattern of INJEKSJON_PATTERNS) {
    if (pattern.test(message)) {
      return { safe: false, reason: "injeksjon" };
    }
  }

  return { safe: true, sanitizedMessage: sanitized };
}

/**
 * Rate limit-nøkkel for bruker (brukes med Firestore-teller server-side).
 */
export function getRateLimitKey(userId: string, window: "hour" | "day"): string {
  const now = new Date();
  if (window === "hour") {
    return `ratelimit_${userId}_${now.toISOString().slice(0, 13)}`;
  }
  return `ratelimit_${userId}_${now.toISOString().slice(0, 10)}`;
}

export const RATE_LIMITS = {
  messagesPerHour: 30,
  messagesPerDay: 200,
};
