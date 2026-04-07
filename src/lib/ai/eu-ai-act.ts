/**
 * EU AI Act compliance — risikokategorisering, transparens og loggføring (Issue #103)
 *
 * Suksess er klassifisert som HØYRISIKO-AI jf. EU AI Act Art. 6(2) og Annex III:
 * - Kategori 3(a): AI-systemer i utdanning (tilgang, opptak, vurdering)
 * - Kategori 3(b): AI som evaluerer læringsutbytte
 * - Skjerpende: Brukere er mindreårige (16–19 år)
 *
 * Krav som dekkes:
 * - Art. 9: Risikostyringssystem
 * - Art. 13: Transparens og informasjon til brukere
 * - Art. 14: Mennesketilsyn (human oversight)
 * - Art. 52: Transparensforpliktelser (informere at AI er i bruk)
 * - Art. 12: Loggføring (record-keeping)
 *
 * Frist: 2. august 2026 (EU AI Act full ikrafttredelse)
 */

import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { logger } from "@/lib/observability/logger";
import { nowISO } from "@/lib/utils/time";

// ---------------------------------------------------------------------------
// Risikokategorisering (Art. 9)
// ---------------------------------------------------------------------------

export type RiskLevel = "unacceptable" | "high" | "limited" | "minimal";

export type AiFeatureRiskClassification = {
  featureId: string;
  featureName: string;
  riskLevel: RiskLevel;
  annex: string;
  justification: string;
  mitigations: string[];
  humanOversightRequired: boolean;
  lastReviewedAt: string;
};

/**
 * Risikokategorisering for alle AI-funksjoner i Suksess.
 * Oppdateres ved endringer i funksjonalitet eller regulering.
 */
export const AI_FEATURE_RISK_REGISTRY: AiFeatureRiskClassification[] = [
  {
    featureId: "career-advisor",
    featureName: "AI-karriereveileder (chat)",
    riskLevel: "high",
    annex: "Annex III, 3(a)",
    justification:
      "AI-systemet gir karriereveiledning og utdanningsanbefalinger til mindreårige. " +
      "Kan påvirke utdanningsvalg og fremtidige muligheter.",
    mitigations: [
      "Krisedeteksjon med direkte henvisning til nødtjenester (116 111)",
      "PII-filtrering før data sendes til LLM",
      "Prompt-injeksjonsforsvar",
      "Rate limiting (30/t, 200/dag)",
      "Gemini safety settings på BLOCK_LOW_AND_ABOVE",
      "System-prompt med sikkerhetsinstruksjoner som overstyr alt annet",
      "Aldersadekvat innhold — ingen medisinsk/juridisk/finansiell rådgivning",
      "AI-transparensvarsel synlig i chat-UI",
    ],
    humanOversightRequired: true,
    lastReviewedAt: "2026-04-02",
  },
  {
    featureId: "personality-analysis",
    featureName: "Personlighetsanalyse (Big Five / RIASEC)",
    riskLevel: "high",
    annex: "Annex III, 3(b)",
    justification:
      "AI-basert personlighetsprofil brukes til å anbefale karrierestier og studieprogram. " +
      "Kan påvirke mindreåriges selvbilde og fremtidige valg.",
    mitigations: [
      "Validert psykologisk rammeverk (BFI-20, RIASEC)",
      "Resultater presenteres som utforskende, ikke bestemmende",
      "Bruker kan ta testen på nytt når som helst",
      "K-means++ klynge-matching er statistisk, ikke deterministisk",
      "Ingen automatiserte beslutninger — kun anbefalinger",
    ],
    humanOversightRequired: true,
    lastReviewedAt: "2026-04-02",
  },
  {
    featureId: "career-path-explorer",
    featureName: "Karrierestiutforsker",
    riskLevel: "high",
    annex: "Annex III, 3(a)",
    justification:
      "Anbefaler karrierestier basert på personlighetsprofil og karakterer. " +
      "Potensial for systematisk bias i yrkesveiledning.",
    mitigations: [
      "RIASEC-matching er transparent og forklarbar",
      "Bruker ser alle karrierestier, ikke bare anbefalte",
      "Ingen filtrering basert på kjønn, etnisitet eller bakgrunn",
      "Karrieredata fra offentlige kilder (NAV, SSB, utdanning.no)",
    ],
    humanOversightRequired: false,
    lastReviewedAt: "2026-04-02",
  },
  {
    featureId: "grade-calculator",
    featureName: "Poengkalkulator (Samordna Opptak)",
    riskLevel: "limited",
    annex: "N/A — deterministisk beregning",
    justification:
      "Regelbasert poengberegning etter SOs offisielle formler. " +
      "Ingen ML-modell eller AI-vurdering involvert.",
    mitigations: [
      "Bruker offisielle beregningsregler fra Samordna Opptak",
      "Dual-modus: 2028-reform og legacy for sammenligning",
      "Tester verifiserer korrekthet mot kjente eksempler",
    ],
    humanOversightRequired: false,
    lastReviewedAt: "2026-04-02",
  },
  {
    featureId: "cv-builder",
    featureName: "CV-builder med AI-forslag",
    riskLevel: "limited",
    annex: "N/A",
    justification:
      "AI genererer forslag til CV-tekst. Brukeren redigerer og godkjenner alt innhold selv.",
    mitigations: [
      "Brukeren har full kontroll over endelig CV-innhold",
      "AI-forslag er tydelig merket som forslag",
      "Ingen automatisk innsending av CV",
    ],
    humanOversightRequired: false,
    lastReviewedAt: "2026-04-02",
  },
  {
    featureId: "jobbmatch",
    featureName: "Jobbmatch",
    riskLevel: "high",
    annex: "Annex III, 4(a)",
    justification:
      "AI-matching av elever med stillinger. Kan påvirke tilgang til arbeidsmuligheter.",
    mitigations: [
      "RIASEC-basert matching er transparent og forklarbar",
      "Bruker ser matchscore og begrunnelse",
      "Ingen automatisk søknadsinnsending",
      "Alle stillinger er tilgjengelige uavhengig av matchscore",
    ],
    humanOversightRequired: false,
    lastReviewedAt: "2026-04-02",
  },
];

// ---------------------------------------------------------------------------
// AI-beslutningslogg (Art. 12 — Record-keeping)
// ---------------------------------------------------------------------------

export type AiDecisionLog = {
  /** Unik ID for loggoppføringen */
  logId: string;
  /** Tidspunkt for AI-interaksjonen */
  timestamp: string;
  /** Bruker-ID (pseudonymisert for logging) */
  userId: string;
  /** Hvilken AI-funksjon som ble brukt */
  featureId: string;
  /** Type AI-beslutning */
  decisionType:
    | "career_recommendation"
    | "study_recommendation"
    | "personality_assessment"
    | "job_match"
    | "cv_suggestion"
    | "general_advice"
    | "crisis_intervention";
  /** Input-sammendrag (uten PII) */
  inputSummary: string;
  /** Output-sammendrag */
  outputSummary: string;
  /** Modell brukt */
  model: string;
  /** Konfidensnivå (0-1) hvis tilgjengelig */
  confidence: number | null;
  /** Om mennesketilsyn ble utløst */
  humanOversightTriggered: boolean;
  /** Risikoflagg */
  riskFlags: string[];
  /** Tenant (skole) */
  tenantId: string | null;
};

/**
 * Logg en AI-beslutning til Firestore for compliance-formål.
 * Oppbevares i minimum 5 år jf. EU AI Act Art. 12(2).
 * Samling: aiDecisionLogs/{logId}
 *
 * TTL-policy må konfigureres i Firestore:
 *   gcloud firestore fields ttls update retentionExpiresAt \
 *     --collection-group=aiDecisionLogs --project=suksess-842ed
 */
export async function logAiDecision(
  decision: Omit<AiDecisionLog, "logId" | "timestamp">
): Promise<string> {
  const logId = `aidl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: AiDecisionLog = {
    ...decision,
    logId,
    timestamp: nowISO(),
  };

  // Oppbevaringsperiode: 5 år jf. EU AI Act Art. 12(2), deretter GDPR Art. 5(1)(e) dataminimalisering
  const RETENTION_YEARS = 5;
  const retentionExpiresAt = new Date(Date.now() + RETENTION_YEARS * 365.25 * 24 * 60 * 60 * 1000);

  try {
    await setDoc(doc(collection(db, "aiDecisionLogs"), logId), {
      ...entry,
      createdAt: serverTimestamp(),
      retentionExpiresAt,
    });

    logger.info("ai_decision_logged", {
      logId,
      featureId: decision.featureId,
      decisionType: decision.decisionType,
      humanOversight: decision.humanOversightTriggered,
      riskFlags: decision.riskFlags,
    });
  } catch (err) {
    logger.error("ai_decision_log_failed", {
      logId,
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  return logId;
}

// ---------------------------------------------------------------------------
// Transparensinformasjon (Art. 13 + Art. 52)
// ---------------------------------------------------------------------------

export type AiTransparencyInfo = {
  featureId: string;
  /** Hva AI-systemet gjør */
  purpose: string;
  /** Hvilke data brukes */
  dataUsed: string[];
  /** Begrensninger */
  limitations: string[];
  /** Hvordan brukeren kan påvirke */
  userControl: string[];
  /** Kontaktinfo for klager */
  complaintContact: string;
};

/**
 * Transparensinformasjon per AI-funksjon — vises i UI.
 * Jf. Art. 13: Brukere skal informeres om at de interagerer med AI,
 * hva systemet gjør, og hvilke begrensninger det har.
 */
export const AI_TRANSPARENCY_INFO: AiTransparencyInfo[] = [
  {
    featureId: "career-advisor",
    purpose:
      "AI-veilederen gir karriere- og utdanningsråd basert på samtalen din. " +
      "Den bruker en stor språkmodell (Gemini) til å generere svar.",
    dataUsed: [
      "Dine meldinger i samtalen",
      "Din personlighetsprofil (Big Five / RIASEC) hvis du har fullført testen",
      "Dine karakterer hvis du har lagt dem inn",
    ],
    limitations: [
      "AI-en kan gi unøyaktige eller utdaterte svar",
      "AI-en erstatter IKKE en profesjonell karriereveileder",
      "AI-en har ikke tilgang til sanntidsdata om ledige studieplasser",
      "AI-en kan ikke gi medisinsk, juridisk eller finansiell rådgivning",
    ],
    userControl: [
      "Du kan slette alle samtaler når som helst",
      "Du kan eksportere dine data (GDPR Art. 20)",
      "Du kan be om at dine data slettes (GDPR Art. 17)",
      "Du velger selv om du vil følge AI-ens råd",
    ],
    complaintContact: "personvern@suksess.no",
  },
  {
    featureId: "personality-analysis",
    purpose:
      "Personlighetsanalysen kartlegger dine interesser og personlighetstrekk " +
      "ved hjelp av anerkjente psykologiske rammeverk (Big Five og RIASEC).",
    dataUsed: [
      "Dine svar på personlighetstesten (BFI-20 og RIASEC)",
      "Svarene brukes til å beregne en profil lokalt i nettleseren",
    ],
    limitations: [
      "Testen gir et øyeblikksbilde — personligheten din kan endre seg",
      "Resultatene er veiledende, ikke diagnostiske",
      "Profilering brukes kun til å foreslå relevante karrierestier",
    ],
    userControl: [
      "Du kan ta testen på nytt når som helst",
      "Du kan slette profilen din",
      "Resultatene deles IKKE med tredjeparter",
    ],
    complaintContact: "personvern@suksess.no",
  },
  {
    featureId: "jobbmatch",
    purpose:
      "Jobbmatch kobler din personlighetsprofil med stillinger ved hjelp av " +
      "RIASEC-matching. Matchscoren viser hvor godt profilen passer stillingen.",
    dataUsed: [
      "Din RIASEC-profil",
      "Stillingsannonser fra NAV/arbeidsgivere",
    ],
    limitations: [
      "Matchscoren er veiledende og basert på RIASEC-kategorier",
      "Mange faktorer som påvirker jobbmatch er ikke inkludert (nettverk, erfaring, etc.)",
      "AI-en søker IKKE på jobber for deg",
    ],
    userControl: [
      "Du kan se alle stillinger uavhengig av matchscore",
      "Du velger selv hvilke stillinger du vil utforske",
    ],
    complaintContact: "personvern@suksess.no",
  },
];

// ---------------------------------------------------------------------------
// Mennesketilsyn (Art. 14 — Human Oversight)
// ---------------------------------------------------------------------------

export type HumanOversightEvent = {
  featureId: string;
  trigger: "crisis_detected" | "high_risk_recommendation" | "user_complaint" | "anomaly_detected" | "manual_review";
  description: string;
  userId: string;
  tenantId: string | null;
  status: "pending" | "reviewed" | "escalated";
  reviewedBy: string | null;
  reviewedAt: string | null;
};

/**
 * Opprett et mennesketilsyn-event (Art. 14).
 * Krever manuell gjennomgang av rådgiver/admin.
 * Samling: humanOversightEvents/{eventId}
 */
export async function createHumanOversightEvent(
  event: Omit<HumanOversightEvent, "status" | "reviewedBy" | "reviewedAt">
): Promise<string> {
  const eventId = `hoe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await setDoc(doc(collection(db, "humanOversightEvents"), eventId), {
      ...event,
      eventId,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: serverTimestamp(),
    });

    logger.warn("human_oversight_created", {
      eventId,
      featureId: event.featureId,
      trigger: event.trigger,
    });
  } catch (err) {
    logger.error("human_oversight_create_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  return eventId;
}

// ---------------------------------------------------------------------------
// AI-varselskomponent-data
// ---------------------------------------------------------------------------

/**
 * Standardvarsel som vises i alle AI-drevne grensesnitt.
 * Jf. Art. 52(1): "Brukere skal informeres om at de interagerer med et AI-system."
 */
export const AI_DISCLOSURE_NOTICE = {
  nb: "Du snakker med en AI-karriereveileder. Svarene er generert av kunstig intelligens og kan inneholde feil. For viktige beslutninger, snakk også med en rådgiver på skolen din.",
  nn: "Du snakkar med ein AI-karriererettleiar. Svara er genererte av kunstig intelligens og kan innehalde feil. For viktige avgjerder, snakk også med ein rådgjevar på skulen din.",
  se: "Don hálat AI-karrierrabagadalliiguin. Vástádusat leat ráhkaduvvon künstalaš jierpmin ja sáhttet sisttisdoallat meattáhusaid.",
} as const;

/**
 * Sjekk om en AI-funksjon krever mennesketilsyn.
 */
export function requiresHumanOversight(featureId: string): boolean {
  const feature = AI_FEATURE_RISK_REGISTRY.find((f) => f.featureId === featureId);
  return feature?.humanOversightRequired ?? false;
}

/**
 * Hent risikokategorisering for en AI-funksjon.
 */
export function getFeatureRiskLevel(featureId: string): RiskLevel | null {
  return AI_FEATURE_RISK_REGISTRY.find((f) => f.featureId === featureId)?.riskLevel ?? null;
}

/**
 * Hent transparensinformasjon for en AI-funksjon.
 */
export function getTransparencyInfo(featureId: string): AiTransparencyInfo | null {
  return AI_TRANSPARENCY_INFO.find((f) => f.featureId === featureId) ?? null;
}
