/**
 * Weaviate-klient for semantisk søk i studieprogram, karriereveier og artikler.
 *
 * Weaviate Cloud er konfigurert i europe-west1 for GDPR-compliance.
 * Schema definert i weaviate/schema.ts.
 *
 * NB: I produksjon brukes API-nøkler via Cloud Run backend.
 * Frontend-koden her kaller Cloud Function som proxy.
 */

// ---------------------------------------------------------------------------
// Konfigurasjon
// ---------------------------------------------------------------------------

export const WEAVIATE_CONFIG = {
  /** Weaviate Cloud endpoint (europe-west1) */
  url: process.env.NEXT_PUBLIC_WEAVIATE_URL ?? "https://suksess.weaviate.network",
  /** API-kall via Cloud Function (frontend → backend → Weaviate) */
  proxyUrl: process.env.NEXT_PUBLIC_WEAVIATE_PROXY ?? "/api/search",
} as const;

// ---------------------------------------------------------------------------
// Weaviate schema-klasser
// ---------------------------------------------------------------------------

export const WEAVIATE_CLASSES = {
  /** Studieprogrammer fra utdanning.no og DBH */
  STUDY_PROGRAM: "StudyProgram",
  /** Karriereveier fra NAV/SSB */
  CAREER_PATH: "CareerPath",
  /** Kunnskapsartikler om studieteknikk, søknadsprosessen, etc. */
  KNOWLEDGE_ARTICLE: "KnowledgeArticle",
  /** Samtale-minner (brukerens tidligere spørsmål) */
  CONVERSATION_MEMORY: "ConversationMemory",
} as const;

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type SearchResult = {
  id: string;
  score: number;
  payload: Record<string, unknown>;
  className: string;
};

export type SemanticSearchParams = {
  query: string;
  className: (typeof WEAVIATE_CLASSES)[keyof typeof WEAVIATE_CLASSES];
  limit?: number;
  filters?: Record<string, string | number | boolean>;
};

// ---------------------------------------------------------------------------
// Semantisk søk via Cloud Function proxy
// ---------------------------------------------------------------------------

/**
 * Utfør semantisk søk mot Weaviate via Cloud Function proxy.
 * Returnerer rangerte resultater med relevanscore.
 */
export async function semanticSearch(
  params: SemanticSearchParams
): Promise<SearchResult[]> {
  try {
    const response = await fetch(WEAVIATE_CONFIG.proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.warn(`Weaviate search failed: ${response.status}`);
      return [];
    }

    const data = await response.json() as { results?: SearchResult[] };
    return data.results ?? [];
  } catch {
    // Weaviate er ikke tilgjengelig — returner tomt (graceful degradation)
    return [];
  }
}

/**
 * Hent relevante studieprogrammer basert på spørsmål.
 * Brukes som RAG-kontekst for AI-veilederen.
 */
export async function searchStudyPrograms(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  return semanticSearch({
    query,
    className: WEAVIATE_CLASSES.STUDY_PROGRAM,
    limit,
  });
}

/**
 * Hent relevante karriereveier for et søk.
 */
export async function searchCareerPaths(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  return semanticSearch({
    query,
    className: WEAVIATE_CLASSES.CAREER_PATH,
    limit,
  });
}

/**
 * Hent kunnskapsartikler som RAG-kontekst.
 */
export async function searchKnowledgeArticles(
  query: string,
  limit = 3
): Promise<SearchResult[]> {
  return semanticSearch({
    query,
    className: WEAVIATE_CLASSES.KNOWLEDGE_ARTICLE,
    limit,
  });
}

// ---------------------------------------------------------------------------
// Weaviate-schema definisjon (sendes til backend ved provisjonering)
// ---------------------------------------------------------------------------

export const WEAVIATE_SCHEMA = {
  classes: [
    {
      class: WEAVIATE_CLASSES.STUDY_PROGRAM,
      description: "Studieprogram ved norske universiteter og høgskoler",
      vectorizer: "text2vec-weaviate",
      moduleConfig: {
        "text2vec-weaviate": {
          model: "Snowflake/snowflake-arctic-embed-m-v2.0",
        },
      },
      properties: [
        { name: "name", dataType: ["text"], description: "Programnavn" },
        { name: "institution", dataType: ["text"], description: "Institusjon" },
        { name: "description", dataType: ["text"], description: "Beskrivelse" },
        { name: "nusCode", dataType: ["text"], description: "NUS-kode" },
        { name: "level", dataType: ["text"], description: "bachelor/master/phd" },
        { name: "requiredGpa", dataType: ["number"], description: "Opptakspoeng" },
        { name: "riasecCodes", dataType: ["text[]"], description: "RIASEC-koder" },
        { name: "url", dataType: ["text"], description: "Programside URL" },
      ],
    },
    {
      class: WEAVIATE_CLASSES.CAREER_PATH,
      description: "Karriereveier og yrkesbeskrivelser",
      vectorizer: "text2vec-weaviate",
      properties: [
        { name: "title", dataType: ["text"], description: "Yrkestittel" },
        { name: "description", dataType: ["text"], description: "Yrkbeskrivelse" },
        { name: "demand", dataType: ["text"], description: "high/medium/low" },
        { name: "salaryMin", dataType: ["number"], description: "Minimumslønn NOK" },
        { name: "salaryMax", dataType: ["number"], description: "Maksimumslønn NOK" },
      ],
    },
    {
      class: WEAVIATE_CLASSES.KNOWLEDGE_ARTICLE,
      description: "Kunnskapsartikler om studier, søknad og karriere",
      vectorizer: "text2vec-weaviate",
      properties: [
        { name: "title", dataType: ["text"] },
        { name: "body", dataType: ["text"] },
        { name: "source", dataType: ["text"], description: "utdanning.no/nav.no/etc." },
        { name: "url", dataType: ["text"] },
        { name: "lastUpdated", dataType: ["date"] },
      ],
    },
    {
      class: WEAVIATE_CLASSES.CONVERSATION_MEMORY,
      description: "Anonymiserte samtale-minner for RAG",
      vectorizer: "text2vec-weaviate",
      properties: [
        { name: "userId", dataType: ["text"] },
        { name: "question", dataType: ["text"] },
        { name: "answer", dataType: ["text"] },
        { name: "timestamp", dataType: ["date"] },
      ],
    },
  ],
};
