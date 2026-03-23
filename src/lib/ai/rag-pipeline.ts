/**
 * RAG Pipeline — Retrieval Augmented Generation med Weaviate (Issue #35)
 *
 * Flyt:
 * 1. Sjekk semantisk cache (Dice-koeffisient ≥ 0.85)
 * 2. Parallelt: hent relevante dokument fra Weaviate (studie, karriere, artikler)
 * 3. Bygg kontekst-blokk som injiseres i system-prompten
 * 4. Returner beriket kontekst til AI-veilederen
 *
 * Designprinsipper:
 * - Graceful degradation: Weaviate-feil stopper ikke AI-kallet
 * - TTL-basert caching av Weaviate-søkeresultater (1 time)
 * - Kontekstkomprimering: maks 2000 tokens per kilde
 */

import {
  searchStudyPrograms,
  searchCareerPaths,
  searchKnowledgeArticles,
  type SearchResult,
} from "@/lib/weaviate/client";
import { getSemanticCache } from "@/lib/ai/semantic-cache";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type RagContext = {
  /** Studieprogram relevante for spørsmålet */
  studyPrograms: RagDocument[];
  /** Karriereveier relevante for spørsmålet */
  careerPaths: RagDocument[];
  /** Kunnskapsartikler */
  articles: RagDocument[];
  /** Formatert kontekstblokk klar for injeksjon i system-prompt */
  contextBlock: string;
  /** Cache-treff? */
  fromCache: boolean;
};

export type RagDocument = {
  id: string;
  title: string;
  content: string;
  score: number;
  source: string;
};

type UserProfile = {
  riasecCode?: string | null;
  bigFive?: Record<string, number> | null;
  interests?: string[] | null;
};

// ---------------------------------------------------------------------------
// Kontekst-komprimering
// ---------------------------------------------------------------------------

const MAX_CHARS_PER_DOC = 400;
const MAX_DOCS_PER_CATEGORY = 3;

function truncate(text: string, maxChars = MAX_CHARS_PER_DOC): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 3) + "…";
}

function formatSearchResult(result: SearchResult): RagDocument {
  const p = result.payload;
  const title =
    (p.name as string) || (p.title as string) || "Ukjent";
  const content =
    (p.description as string) || (p.body as string) || "";
  const source =
    (p.source as string) || (p.institution as string) || "ukjent kilde";

  return {
    id: result.id,
    title,
    content: truncate(content),
    score: result.score,
    source,
  };
}

// ---------------------------------------------------------------------------
// Kontekstblokk-bygger
// ---------------------------------------------------------------------------

function buildContextBlock(
  studyPrograms: RagDocument[],
  careerPaths: RagDocument[],
  articles: RagDocument[]
): string {
  const sections: string[] = [];

  if (studyPrograms.length > 0) {
    sections.push(
      "### Relevante studieprogram\n" +
      studyPrograms
        .map((d) => `- **${d.title}** (${d.source}): ${d.content}`)
        .join("\n")
    );
  }

  if (careerPaths.length > 0) {
    sections.push(
      "### Relevante karriereveier\n" +
      careerPaths
        .map((d) => `- **${d.title}**: ${d.content}`)
        .join("\n")
    );
  }

  if (articles.length > 0) {
    sections.push(
      "### Nyttig bakgrunnsinformasjon\n" +
      articles
        .map((d) => `- ${d.title}: ${d.content}`)
        .join("\n")
    );
  }

  if (sections.length === 0) {
    return "";
  }

  return (
    "## Hentet kontekst (RAG)\n" +
    "Bruk informasjonen nedenfor til å gi presise og faktabaserte svar:\n\n" +
    sections.join("\n\n")
  );
}

// ---------------------------------------------------------------------------
// Hoved-RAG-funksjon
// ---------------------------------------------------------------------------

/**
 * Hent RAG-kontekst for en brukermelding.
 *
 * @param query - Brukerens spørsmål/melding
 * @param profile - Brukerens profil (RIASEC, Big Five)
 * @param feature - Funksjonsnavn for semantic cache (f.eks. "career-advice")
 */
export async function retrieveRagContext(
  query: string,
  profile?: UserProfile,
  feature = "rag"
): Promise<RagContext> {
  // 1. Sjekk semantisk cache
  const cachedResponse = await getSemanticCache(query, `${feature}-rag`);
  if (cachedResponse) {
    try {
      const parsed = JSON.parse(cachedResponse) as RagContext;
      return { ...parsed, fromCache: true };
    } catch {
      // Ignore malformed cache entry
    }
  }

  // 2. Bygg utvidet søkestreng med brukerens RIASEC-profil
  const enrichedQuery = profile?.riasecCode
    ? `${query} [RIASEC: ${profile.riasecCode}]`
    : query;

  // 3. Parallelle Weaviate-søk
  const [studyResults, careerResults, articleResults] = await Promise.allSettled([
    searchStudyPrograms(enrichedQuery, MAX_DOCS_PER_CATEGORY),
    searchCareerPaths(enrichedQuery, MAX_DOCS_PER_CATEGORY),
    searchKnowledgeArticles(query, MAX_DOCS_PER_CATEGORY), // Uten RIASEC for bredere artikkeltreff
  ]);

  const studyPrograms =
    studyResults.status === "fulfilled"
      ? studyResults.value.map(formatSearchResult)
      : [];
  const careerPaths =
    careerResults.status === "fulfilled"
      ? careerResults.value.map(formatSearchResult)
      : [];
  const articles =
    articleResults.status === "fulfilled"
      ? articleResults.value.map(formatSearchResult)
      : [];

  const contextBlock = buildContextBlock(studyPrograms, careerPaths, articles);

  return {
    studyPrograms,
    careerPaths,
    articles,
    contextBlock,
    fromCache: false,
  };
}

/**
 * Injiser RAG-kontekst i en system-prompt.
 * Legger til kontekstblokk etter kjerneprompt, før spesifikke instruksjoner.
 */
export function injectRagContext(
  systemPrompt: string,
  ragContext: RagContext
): string {
  if (!ragContext.contextBlock) return systemPrompt;

  // Finn passsende injeksjonspunkt (etter persona-blokk, før avslutning)
  const injectionMarker = "## Rammer";
  const markerIndex = systemPrompt.indexOf(injectionMarker);

  if (markerIndex !== -1) {
    return (
      systemPrompt.slice(0, markerIndex) +
      ragContext.contextBlock +
      "\n\n" +
      systemPrompt.slice(markerIndex)
    );
  }

  // Fallback: legg til på slutten
  return systemPrompt + "\n\n" + ragContext.contextBlock;
}
