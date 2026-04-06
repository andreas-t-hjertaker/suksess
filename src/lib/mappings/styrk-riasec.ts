/**
 * Autoritativ STYRK-08 ↔ RIASEC mapping.
 *
 * Én kilde for alle moduler som trenger å konvertere mellom
 * STYRK-08 yrkeskoder og RIASEC-personlighetskoder.
 *
 * Brukes av:
 * - src/lib/jobbmatch/nav-stillinger.ts (jobbmatch)
 * - src/lib/karriere/data-service.ts (karrierestier + SSB-kobling)
 */

import type { RiasecScores } from "@/types/domain";

// ---------------------------------------------------------------------------
// STYRK-08 → RIASEC (1-sifret hovedgruppe)
// ---------------------------------------------------------------------------

/**
 * Mapper STYRK-08 hovedgrupper (1. siffer) til primære RIASEC-koder.
 * Basert på Holland-kode forskning og norsk yrkesklassifisering.
 */
export const STYRK_RIASEC_MAP: Record<string, (keyof RiasecScores)[]> = {
  "0": ["enterprising", "conventional"],       // Militære yrker
  "1": ["enterprising", "conventional", "social"], // Ledere
  "2": ["investigative", "social"],              // Akademiske yrker
  "3": ["conventional", "social", "realistic"],  // Teknikere
  "4": ["conventional", "enterprising"],         // Kontor og kundeservice
  "5": ["social", "enterprising"],               // Salg, service, omsorg
  "6": ["realistic", "conventional"],            // Bønder, fiskere
  "7": ["realistic", "investigative"],           // Håndverkere
  "8": ["realistic", "conventional"],            // Operatører, sjåfører
  "9": ["realistic", "conventional"],            // Renholdere, hjelpearbeidere
};

// ---------------------------------------------------------------------------
// STYRK-08 → RIASEC (2-sifret underkode, mer spesifikk)
// ---------------------------------------------------------------------------

export const STYRK_2_RIASEC_MAP: Record<string, (keyof RiasecScores)[]> = {
  "21": ["investigative", "realistic"],           // Realfag og ingeniører
  "22": ["investigative", "social"],              // Helseyrker
  "23": ["social", "artistic"],                   // Undervisning
  "24": ["conventional", "enterprising"],         // Økonomi, HR, juss
  "25": ["investigative", "realistic", "conventional"], // IT
  "26": ["social", "artistic", "investigative"],  // Kultur og samfunn
  "31": ["realistic", "investigative"],           // Tekniske yrker
  "32": ["social", "realistic"],                  // Helseteknikere
  "33": ["conventional", "enterprising"],         // Forretning, finans
  "34": ["social", "artistic"],                   // Juss, sosial, kultur
  "35": ["realistic", "investigative"],           // IKT-teknikere
  "51": ["social", "enterprising"],               // Personlig tjenesteyting
  "52": ["enterprising", "social"],               // Selgere
  "53": ["social", "realistic"],                  // Omsorg
  "71": ["realistic", "artistic"],                // Bygg og anlegg
  "72": ["realistic", "investigative"],           // Metall og maskin
  "75": ["realistic", "artistic"],                // Mat og trearbeid
};

// ---------------------------------------------------------------------------
// Karriere-ID → STYRK-08 (for SSB-kobling)
// ---------------------------------------------------------------------------

export const CAREER_STYRK_MAP: Record<string, string> = {
  "software-engineer": "2511",
  "data-scientist": "2512",
  "sykepleier": "2221",
  "lege": "2211",
  "lektor": "2320",
  "advokat": "2611",
  "elektriker": "7411",
  "mekaniker": "7231",
  "grafisk-designer": "2166",
  "sivilingenior": "2142",
  "finansanalytiker": "2413",
};

// ---------------------------------------------------------------------------
// Konverteringsfunksjon
// ---------------------------------------------------------------------------

/**
 * Hent RIASEC-koder for en STYRK-08 kode.
 * Prøver 2-sifret kode først (mer spesifikk), faller tilbake til 1-sifret.
 */
export function styrkToRiasec(styrkCode: string | null): (keyof RiasecScores)[] {
  if (!styrkCode) return [];

  const twoDigit = styrkCode.substring(0, 2);
  if (STYRK_2_RIASEC_MAP[twoDigit]) return STYRK_2_RIASEC_MAP[twoDigit];

  const oneDigit = styrkCode.substring(0, 1);
  if (STYRK_RIASEC_MAP[oneDigit]) return STYRK_RIASEC_MAP[oneDigit];

  return [];
}
