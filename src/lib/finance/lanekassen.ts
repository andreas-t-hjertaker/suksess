/**
 * Lånekassen-kalkulator — studiefinansiering for norske studenter (Issue #59)
 *
 * Satser for studieåret 2025–2026 fra Forskrift om utdanningsstøtte.
 * Oppdateres manuelt årlig (Lånekassen har ingen offentlig API).
 *
 * Kilder:
 * - https://lanekassen.no/satser/
 * - Forskrift om utdanningsstøtte (FOR-2024-xx-xx)
 */

// ─── Satser 2025–2026 ───────────────────────────────────────────────────────

export const LANEKASSEN_YEAR = "2025-2026";

export const SATSER = {
  /** Basislån per studieår (10 måneder) */
  basislaan: 166_859,
  /** Andel som kan omgjøres til stipend ved bestått (40%) */
  stipendAndel: 0.4,
  /** Nominell rente (flytende) per mars 2026 */
  renteFlytende: 0.04621,
  /** Nominell rente (fast 3 år) */
  renteFast3: 0.0455,
  /** Borteboerstipend per måned (VGS-elev u/21 som bor borte) */
  borteboerstipendMnd: 5_944,
  /** Antall måneder borteboerstipend per skoleår */
  borteboerMaaneder: 10,
  /** Reisestipend — varierer per sone, her: gjennomsnitt */
  reisestipendSnitt: 3_800,
  /** Utstyrsstipend per skoleår — varierer per VGS-program */
  utstyrsstipendSatser: {
    sats1: 1_183, // Studiespesialiserende m.fl.
    sats2: 2_371, // Service og samferdsel, Helse og oppvekst
    sats3: 4_261, // Elektro, Teknikk, Bygg m.fl.
  } as Record<string, number>,
  /** Inntektsgrense før reduksjon (trygdeavgiftsfritt beløp) */
  inntektsgrense: 214_216,
  /** Formuesgrense enslig */
  formuesgrense: 475_517,
} as const;

// ─── Utstyrsstipend per VGS-program ─────────────────────────────────────────

const UTSTYRSSTIPEND_MAP: Record<string, keyof typeof SATSER.utstyrsstipendSatser> = {
  "studiespesialiserende": "sats1",
  "idrett": "sats1",
  "kunst-design-arkitektur": "sats1",
  "medier-kommunikasjon": "sats1",
  "musikk-dans-drama": "sats1",
  "helse-oppvekst": "sats2",
  "salg-service-reiseliv": "sats2",
  "informasjonsteknologi-medieproduksjon": "sats2",
  "naturbruk": "sats3",
  "restaurant-matfag": "sats3",
  "bygg-anlegg": "sats3",
  "elektro-datateknologi": "sats3",
  "teknikk-industriell-produksjon": "sats3",
  "teknologi-industrifag": "sats3",
  "frisør-blomster-interiør": "sats3",
  "håndverk-design-produktutvikling": "sats3",
};

// ─── Beregninger ─────────────────────────────────────────────────────────────

export type StudiefinansieringInput = {
  /** "hoeyere" | "vgs" */
  studieType: "hoeyere" | "vgs";
  /** Bor borte fra foreldre? (kun relevant for VGS) */
  borBorte?: boolean;
  /** VGS-programkode for utstyrsstipend */
  vgsProgram?: string;
  /** Antall studieår (for totalberegning) */
  antallAar?: number;
};

export type StudiefinansieringResult = {
  /** Brutto lån per år */
  laanPerAar: number;
  /** Stipend per år (omgjort ved bestått) */
  stipendPerAar: number;
  /** Netto lån per år (etter stipend-omgjøring) */
  nettoLaanPerAar: number;
  /** Borteboerstipend per år (VGS) */
  borteboerstipendPerAar: number;
  /** Utstyrsstipend per år (VGS) */
  utstyrsstipendPerAar: number;
  /** Reisestipend per år */
  reisestipendPerAar: number;
  /** Totalt per år (alle stipend + lån) */
  totalPerAar: number;
  /** Total over hele studieløpet */
  totalStudielop: number;
  /** Total gjeld etter studieløpet */
  totalGjeld: number;
  /** Satser brukt */
  year: string;
};

export function beregnStudiefinansiering(
  input: StudiefinansieringInput
): StudiefinansieringResult {
  const antallAar = input.antallAar ?? (input.studieType === "hoeyere" ? 3 : 3);

  // Basislån
  const laanPerAar = SATSER.basislaan;
  const stipendPerAar = Math.round(laanPerAar * SATSER.stipendAndel);
  const nettoLaanPerAar = laanPerAar - stipendPerAar;

  // VGS-spesifikke stipend
  let borteboerstipendPerAar = 0;
  let utstyrsstipendPerAar = 0;

  if (input.studieType === "vgs") {
    if (input.borBorte) {
      borteboerstipendPerAar = SATSER.borteboerstipendMnd * SATSER.borteboerMaaneder;
    }
    if (input.vgsProgram) {
      const satsKey = UTSTYRSSTIPEND_MAP[input.vgsProgram];
      if (satsKey) {
        utstyrsstipendPerAar = SATSER.utstyrsstipendSatser[satsKey];
      }
    }
  }

  const reisestipendPerAar = SATSER.reisestipendSnitt;

  const totalPerAar =
    nettoLaanPerAar + stipendPerAar + borteboerstipendPerAar + utstyrsstipendPerAar + reisestipendPerAar;

  const totalStudielop = totalPerAar * antallAar;
  const totalGjeld = nettoLaanPerAar * antallAar;

  return {
    laanPerAar,
    stipendPerAar,
    nettoLaanPerAar,
    borteboerstipendPerAar,
    utstyrsstipendPerAar,
    reisestipendPerAar,
    totalPerAar,
    totalStudielop,
    totalGjeld,
    year: LANEKASSEN_YEAR,
  };
}

/**
 * Formater kronebeløp til norsk format.
 */
export function formatNok(amount: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amount);
}
