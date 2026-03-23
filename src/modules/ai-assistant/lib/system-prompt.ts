import type { AssistantContext } from "../types";
import type { BigFiveScores, RiasecScores } from "@/types/domain";

// ---------------------------------------------------------------------------
// RAG-kontekstbygging
// ---------------------------------------------------------------------------

function formatBigFive(bf: BigFiveScores): string {
  return [
    `Åpenhet: ${bf.openness}/100`,
    `Planmessighet: ${bf.conscientiousness}/100`,
    `Utadvendthet: ${bf.extraversion}/100`,
    `Medmenneskelighet: ${bf.agreeableness}/100`,
    `Emosjonell stabilitet: ${100 - bf.neuroticism}/100`,
  ].join(", ");
}

function formatRiasec(rs: RiasecScores): string {
  const sorted = Object.entries(rs)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => {
      const labels: Record<string, string> = {
        realistic: "R",
        investigative: "I",
        artistic: "A",
        social: "S",
        enterprising: "E",
        conventional: "C",
      };
      return labels[k] ?? k;
    });
  return sorted.join("");
}

// ---------------------------------------------------------------------------
// Hovdprompt
// ---------------------------------------------------------------------------

/** Bygg system-instruksjon for AI-studieveilederen basert på brukerkontekst */
export function buildSystemPrompt(
  context: AssistantContext,
  customPrompt?: string
): string {
  const parts: string[] = [
    "Du er en personlig AI-studieveileder for Suksess-plattformen.",
    "Du hjelper norske VGS-elever og studenter med studievalg, karriereveiledning og faglig utvikling.",
    "",
    "## Brukerinformasjon",
    `Navn: ${context.user?.displayName || "Ukjent elev"}`,
    `Nåværende side: ${context.currentPath}`,
  ];

  // Legg til personlighetsprofil fra RAG-kontekst
  if (context.customContext) {
    parts.push("", "## Profil og kontekst", context.customContext);
  }

  parts.push(
    "",
    "## Veiledningsprinsipper",
    "1. Svar alltid på norsk med mindre brukeren skriver på et annet språk",
    "2. Tilpass svar til elevens personlighetsprofil og interesser (bruk konteksten ovenfor)",
    "3. Vær konkret og handlingsorientert — gi faktiske neste steg",
    "4. Henvis til utdanning.no, samordnaopptak.no og nav.no for offisielle data",
    "5. Sitér kilder i svaret når du refererer til spesifikke studieprogram eller poenggrenser",
    "6. Bruk markdown for formatering (lister, **uthevning**, tabeller)",
    "7. Hold svar mellom 100–400 ord for grunnleggende spørsmål",
    "8. Spør oppfølgingsspørsmål når du trenger mer kontekst",
    "9. Vær oppmuntrende og støttende — mange elever er usikre på fremtiden",
    "",
    "## Kunnskap du alltid har tilgjengelig",
    "- Norsk utdanningssystem: VGS, høyere utdanning, fagskole, lærelingeløp",
    "- Samordna opptak: søknadsfrister, kvoter, poenggrenser, supplerings-opptak",
    "- Studieprogram ved norske universiteter og høgskoler",
    "- Programfag i VGS og tilleggspoeng (realfag, fremmedspråk)",
    "- NAV Arbeidsplassen: jobbmarked og kompetansebehov",
    "- Big Five personlighetstrekk og RIASEC-interessemodellen",
  );

  if (customPrompt) {
    parts.push("", customPrompt);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// RAG-kontekst fra brukerprofil
// ---------------------------------------------------------------------------

export function buildProfileContext(data: {
  bigFive?: BigFiveScores | null;
  riasec?: RiasecScores | null;
  strengths?: string[];
  gradeAvg?: number | null;
  interests?: string[];
}): string {
  const lines: string[] = [];

  if (data.bigFive) {
    lines.push(`Big Five-profil: ${formatBigFive(data.bigFive)}`);
  }
  if (data.riasec) {
    lines.push(`RIASEC-kode: ${formatRiasec(data.riasec)}`);
  }
  if (data.strengths?.length) {
    lines.push(`Topp-styrker: ${data.strengths.join(", ")}`);
  }
  if (data.gradeAvg != null) {
    lines.push(`Karaktersnitt: ${data.gradeAvg.toFixed(2)}`);
  }
  if (data.interests?.length) {
    lines.push(`Interesseområder: ${data.interests.join(", ")}`);
  }

  return lines.length > 0 ? lines.join("\n") : "";
}
