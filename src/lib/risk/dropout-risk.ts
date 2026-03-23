/**
 * Frafallsrisiko-modell (Issue #23)
 *
 * Regelbasert scoring-modell som identifiserer elever med forhøyet risiko
 * for frafall basert på engasjementsignaler og profildata.
 *
 * Risiko-score: 0–100 (0 = lavest risiko, 100 = høyest risiko)
 * Kalibrering: score > 70 = høy, 40–70 = moderat, < 40 = lav
 *
 * Kun synlig for rådgiver/admin — ikke for eleven selv — med samtykke.
 */

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type DropoutRiskLevel = "high" | "medium" | "low";

export type DropoutRiskSignal = {
  /** Signal-ID */
  id: string;
  /** Vekt i score (0–100) */
  weight: number;
  /** Verdien er true/false eller numerisk */
  value: boolean | number;
  /** Beskrivelse for rådgiver */
  description: string;
};

export type DropoutRiskResult = {
  userId: string;
  score: number;
  level: DropoutRiskLevel;
  signals: DropoutRiskSignal[];
  computedAt: Date;
};

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export type DropoutRiskInput = {
  userId: string;
  /** Antall dager siden siste innlogging (null = aldri) */
  daysSinceLastLogin: number | null;
  /** Antall innlogginger siste 30 dager */
  loginsLast30Days: number;
  /** 0–100 — hvor fullstendig onboarding er */
  onboardingCompletionPct: number;
  /** Er Big Five fullført? */
  bigFiveCompleted: boolean;
  /** Antall registrerte karakterer */
  gradesCount: number;
  /** Er minst ett programfag valgt? */
  programfagSelected: boolean;
  /** Antall karriereveier sett på */
  careerPathsViewed: number;
  /** Big Five neuroticism-score 0–100 (høy = mer risiko) */
  neuroticism?: number;
  /** Big Five conscientiousness-score 0–100 (lav = mer risiko) */
  conscientiousness?: number;
  /** Har brukeren brukt AI-veilederen? */
  hasUsedAiAssistant: boolean;
  /** Karaktersnitt (null = ingen karakterer) */
  gradeAverage: number | null;
};

// ---------------------------------------------------------------------------
// Hoved-algoritme
// ---------------------------------------------------------------------------

export function computeDropoutRisk(input: DropoutRiskInput): DropoutRiskResult {
  const signals: DropoutRiskSignal[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  function addSignal(
    id: string,
    description: string,
    weight: number,
    riskContribution: number, // 0–1
    value: boolean | number
  ) {
    signals.push({ id, description, weight, value });
    totalWeight += weight;
    weightedScore += weight * riskContribution;
  }

  // 1. Engasjement — innlogging
  if (input.daysSinceLastLogin === null) {
    addSignal("no_login", "Har aldri logget inn", 20, 1.0, true);
  } else if (input.daysSinceLastLogin > 30) {
    addSignal("inactive_30d", `Ikke logget inn på ${input.daysSinceLastLogin} dager`, 20, 0.9, input.daysSinceLastLogin);
  } else if (input.daysSinceLastLogin > 14) {
    addSignal("inactive_14d", "Ikke logget inn på 14+ dager", 20, 0.5, input.daysSinceLastLogin);
  } else {
    addSignal("active_login", "Aktiv innlogging siste 14 dager", 20, 0.0, input.daysSinceLastLogin);
  }

  // 2. Onboarding-fullføring
  const onboardingRisk = Math.max(0, (100 - input.onboardingCompletionPct) / 100);
  addSignal(
    "onboarding_pct",
    `Onboarding ${input.onboardingCompletionPct}% fullført`,
    15,
    onboardingRisk,
    input.onboardingCompletionPct
  );

  // 3. Big Five ikke fullført
  if (!input.bigFiveCompleted) {
    addSignal("no_bigfive", "Personlighetstest ikke fullført", 12, 0.8, false);
  } else {
    addSignal("bigfive_done", "Personlighetstest fullført", 12, 0.0, true);
  }

  // 4. Ingen karakterer registrert
  const gradesRisk = input.gradesCount === 0 ? 0.9 : input.gradesCount < 3 ? 0.4 : 0.0;
  addSignal("grades_count", `${input.gradesCount} karakterer registrert`, 10, gradesRisk, input.gradesCount);

  // 5. Ingen programfag valgt
  if (!input.programfagSelected) {
    addSignal("no_programfag", "Ingen programfag valgt", 10, 0.7, false);
  } else {
    addSignal("programfag_selected", "Programfag valgt", 10, 0.0, true);
  }

  // 6. Ingen karriereveier utforsket
  const careerRisk = input.careerPathsViewed === 0 ? 0.8 : input.careerPathsViewed < 3 ? 0.3 : 0.0;
  addSignal(
    "career_views",
    `${input.careerPathsViewed} karriereveier sett på`,
    10,
    careerRisk,
    input.careerPathsViewed
  );

  // 7. Big Five: høy neuroticism
  if (input.neuroticism !== undefined) {
    const neuroRisk = Math.max(0, (input.neuroticism - 60) / 40);
    addSignal("high_neuroticism", `Neuroticism: ${input.neuroticism}`, 8, neuroRisk, input.neuroticism);
  }

  // 8. Big Five: lav conscientiousness
  if (input.conscientiousness !== undefined) {
    const conRisk = Math.max(0, (40 - input.conscientiousness) / 40);
    addSignal("low_conscientiousness", `Conscientiousness: ${input.conscientiousness}`, 8, conRisk, input.conscientiousness);
  }

  // 9. Karaktersnitt under grensen
  if (input.gradeAverage !== null) {
    const gradeRisk = input.gradeAverage < 2.5 ? 0.9 : input.gradeAverage < 3.0 ? 0.5 : 0.0;
    addSignal("grade_average", `Karaktersnitt: ${input.gradeAverage.toFixed(1)}`, 10, gradeRisk, input.gradeAverage);
  }

  // 10. Ikke brukt AI-veilederen
  if (!input.hasUsedAiAssistant) {
    addSignal("no_ai_use", "AI-veileder ikke brukt", 7, 0.4, false);
  } else {
    addSignal("ai_used", "AI-veileder brukt", 7, 0.0, true);
  }

  const rawScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 50;
  const score = Math.round(Math.min(100, Math.max(0, rawScore)));
  const level: DropoutRiskLevel =
    score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return { userId: input.userId, score, level, signals, computedAt: new Date() };
}

// ---------------------------------------------------------------------------
// Hjelpefunksjon: lag sammendrag for rådgiver
// ---------------------------------------------------------------------------

export function formatRiskSummary(result: DropoutRiskResult): string {
  const levelLabel =
    result.level === "high" ? "Høy" : result.level === "medium" ? "Moderat" : "Lav";
  const topSignals = result.signals
    .filter((s) => (s.value === false || (typeof s.value === "number" && s.weight > 8)))
    .slice(0, 3)
    .map((s) => `• ${s.description}`)
    .join("\n");
  return `Frafallsrisiko: ${levelLabel} (${result.score}/100)\n${topSignals}`;
}

export const RISK_LEVEL_COLORS: Record<DropoutRiskLevel, string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-green-600 bg-green-50 border-green-200",
};

export const RISK_LEVEL_LABELS: Record<DropoutRiskLevel, string> = {
  high: "Høy risiko",
  medium: "Moderat risiko",
  low: "Lav risiko",
};
