/**
 * Lånekassen-kalkulator for studiefinansiering (Issue #59)
 *
 * Lånekassen har ingen offentlig API — vi vedlikeholder et konfigurasjonsmodul
 * med satser fra "Forskrift om utdanningsstøtte" (oppdateres manuelt hvert år).
 *
 * Satser for studieåret 2025–2026 (siste oppdatering: mars 2026).
 * Kilde: https://lanekassen.no/nb-NO/stipend-og-lan/
 */

// ─── Konfigurering (oppdateres årlig) ─────────────────────────────────────────

export const LANEKASSEN_SATSER_2025_2026 = {
  /** Maksimalt basislån per studieår (kr) */
  basislan: 166_859,

  /** Andel av basislånet som kan omgjøres til stipend ved bestått eksamen (40 %) */
  stipendAndel: 0.40,

  /** Rente (nominell) per 15. mars 2026 */
  rente: 0.04621,

  /** VGS borteboerstipend (under 21 år, bor borte fra foreldre) per måned */
  borteboerstipendPerMnd: 3_490,

  /** VGS borteboerstipend antall måneder per skoleår */
  borteboerMåneder: 10,

  /** Utstyrsstipend VGS — grunnbeløp per studieår */
  utstyrsstipendGrunnbelop: 2_200,

  /** Utstyrsstipend VGS — tillegg for yrkesfaglige programmer */
  utstyrsstipendYrkesfagTillegg: 7_000,

  /** Reisestipend — maks per studieår */
  reisestipendMaks: 8_600,

  /** Behovsprøvd stipend VGS — maks månedlig (avhenger av foreldres inntekt) */
  behovsstipendMaksPerMnd: 3_754,

  /** Grense for full behovsprøving (foreldres bruttoinntekt) */
  behovsstipendInntektsgrense: 594_700,

  /** Studiestøtte per måned for høyere utdanning (basislån / 11 mnd) */
  get hoyereUtdPerMnd() {
    return Math.round(this.basislan / 11);
  },

  /** Stipenddel per måned (40 % av månedlig støtte) */
  get stipendPerMnd() {
    return Math.round(this.hoyereUtdPerMnd * this.stipendAndel);
  },

  /** Lånedel per måned */
  get lanPerMnd() {
    return this.hoyereUtdPerMnd - this.stipendPerMnd;
  },
};

// ─── Typer ────────────────────────────────────────────────────────────────────

export type StudieType = "hoeyere" | "vgs_yrkesfag" | "vgs_studieforberedende" | "fagskole";

export type Bosted = "hjemme" | "borte";

export type LanekassenBeregning = {
  studieType: StudieType;
  /** Totalt støttebeløp per år (lån + stipend) */
  totalPerAar: number;
  /** Stipenddel per år (skattefritt) */
  stipendPerAar: number;
  /** Låndel per år (må betales tilbake) */
  lanPerAar: number;
  /** Borteboerstipend (kun VGS under 21, borte fra foreldre) */
  borteboerstipendPerAar: number | null;
  /** Utstyrsstipend (kun VGS) */
  utstyrsstipend: number | null;
  /** Estimert månedlig beløp til disposisjon */
  perManed: number;
  /** Lenke til Lånekassens offisielle kalkulator */
  kalkulatorUrl: string;
  /** År-satsene gjelder for */
  studieaar: string;
};

// ─── Kalkulatorfunksjon ────────────────────────────────────────────────────────

const KALKULATORURL = "https://lanekassen.no/nb-NO/stipend-og-lan/hoyere-utdanning/kalkulator/";

/**
 * Beregn estimert studiestøtte fra Lånekassen.
 *
 * @param studieType - type studie
 * @param bosted - om eleven bor hjemme eller borte fra foreldre
 * @param alder - alder (påvirker borteboerstipend for VGS)
 * @param erYrkesfag - om VGS-programmet er yrkesfaglig (påvirker utstyrsstipend)
 */
export function beregnLanekassen(
  studieType: StudieType,
  bosted: Bosted = "hjemme",
  alder: number = 18,
  erYrkesfag = false
): LanekassenBeregning {
  const s = LANEKASSEN_SATSER_2025_2026;

  if (studieType === "hoeyere" || studieType === "fagskole") {
    const totalPerAar = s.basislan;
    const stipendPerAar = Math.round(totalPerAar * s.stipendAndel);
    const lanPerAar = totalPerAar - stipendPerAar;

    return {
      studieType,
      totalPerAar,
      stipendPerAar,
      lanPerAar,
      borteboerstipendPerAar: null,
      utstyrsstipend: null,
      perManed: Math.round(totalPerAar / 11),
      kalkulatorUrl: KALKULATORURL,
      studieaar: "2025–2026",
    };
  }

  // VGS
  const borteboer =
    bosted === "borte" && alder < 21
      ? s.borteboerstipendPerMnd * s.borteboerMåneder
      : null;

  const utstyr = erYrkesfag
    ? s.utstyrsstipendGrunnbelop + s.utstyrsstipendYrkesfagTillegg
    : s.utstyrsstipendGrunnbelop;

  const totalPerAar = (borteboer ?? 0) + utstyr;

  return {
    studieType,
    totalPerAar,
    stipendPerAar: totalPerAar, // VGS-støtte er kun stipend, ikke lån
    lanPerAar: 0,
    borteboerstipendPerAar: borteboer,
    utstyrsstipend: utstyr,
    perManed: Math.round(totalPerAar / 10),
    kalkulatorUrl: "https://lanekassen.no/nb-NO/stipend-og-lan/videregaende-skole/",
    studieaar: "2025–2026",
  };
}

/**
 * Formater beregning til lesbar streng (for AI-prompt og UI).
 */
export function formaterBeregning(b: LanekassenBeregning): string {
  const lines: string[] = [
    `Studiefinansiering ${b.studieaar}:`,
    `• Totalt per år: ${b.totalPerAar.toLocaleString("nb-NO")} kr`,
  ];

  if (b.stipendPerAar > 0 && b.lanPerAar > 0) {
    lines.push(`  – Stipend (skattefritt): ${b.stipendPerAar.toLocaleString("nb-NO")} kr`);
    lines.push(`  – Lån (tilbakebetales): ${b.lanPerAar.toLocaleString("nb-NO")} kr`);
  }

  if (b.borteboerstipendPerAar) {
    lines.push(`• Borteboerstipend: ${b.borteboerstipendPerAar.toLocaleString("nb-NO")} kr`);
  }

  if (b.utstyrsstipend) {
    lines.push(`• Utstyrsstipend: ${b.utstyrsstipend.toLocaleString("nb-NO")} kr`);
  }

  lines.push(`• Ca. ${b.perManed.toLocaleString("nb-NO")} kr/mnd`);
  lines.push(`Se nøyaktig beregning: ${b.kalkulatorUrl}`);

  return lines.join("\n");
}
