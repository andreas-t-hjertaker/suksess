/**
 * Weaviate søkeproxy — /api/search (Issue #65, #8)
 *
 * Holder Weaviate API-nøkkel server-side (aldri eksponert til klient).
 * Støtter hybrid BM25 + vektorsøk med NorSBERT4 embeddings.
 *
 * POST /api/search
 * Body: { query: string, className: string, limit?: number, alpha?: number, filters?: Record<string, unknown> }
 *
 * GDPR: Weaviate Cloud er konfigurert i europe-west1.
 * Autentisering: Firebase ID-token i Authorization-header.
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Konfigurasjon ────────────────────────────────────────────────────────────

const WEAVIATE_URL = process.env.WEAVIATE_URL ?? "";
const WEAVIATE_API_KEY = process.env.WEAVIATE_API_KEY ?? "";

const ALLOWED_CLASSES = new Set([
  "StudyProgram",
  "CareerPath",
  "KnowledgeArticle",
  "ConversationMemory",
]);

// ─── Typer ────────────────────────────────────────────────────────────────────

type SearchBody = {
  query: string;
  className: string;
  limit?: number;
  alpha?: number; // 0 = BM25, 1 = ren vektor, 0.75 = anbefalt hybrid
  filters?: Record<string, string | number | boolean>;
};

type WeaviateResult = {
  _additional?: { id?: string; score?: number; certainty?: number };
  [key: string]: unknown;
};

// ─── Weaviate hybrid-søk ──────────────────────────────────────────────────────

async function weaviateHybridSearch(
  query: string,
  className: string,
  limit: number,
  alpha: number,
  filters?: Record<string, string | number | boolean>
): Promise<WeaviateResult[]> {
  if (!WEAVIATE_URL || !WEAVIATE_API_KEY) {
    // Weaviate ikke konfigurert — returner tomt (graceful degradation)
    return [];
  }

  // Bygg GraphQL-filtre
  const whereClause = filters && Object.keys(filters).length > 0
    ? `where: { operator: And, operands: [${Object.entries(filters)
        .map(([k, v]) => `{ path: ["${k}"], operator: Equal, ${typeof v === "string" ? `valueText: "${v}"` : typeof v === "number" ? `valueNumber: ${v}` : `valueBoolean: ${v}`} }`)
        .join(", ")}] },`
    : "";

  const graphqlQuery = `{
    Get {
      ${className}(
        hybrid: { query: ${JSON.stringify(query)}, alpha: ${alpha} },
        limit: ${limit},
        ${whereClause}
      ) {
        _additional { id score certainty }
        ${getPropertiesForClass(className)}
      }
    }
  }`;

  const response = await fetch(`${WEAVIATE_URL}/v1/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WEAVIATE_API_KEY}`,
      "X-Weaviate-Cluster-Url": WEAVIATE_URL,
    },
    body: JSON.stringify({ query: graphqlQuery }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    console.warn(`[Weaviate] Søk feilet: ${response.status}`);
    return [];
  }

  const data = await response.json() as {
    data?: { Get?: Record<string, WeaviateResult[]> };
    errors?: { message: string }[];
  };

  if (data.errors?.length) {
    console.warn("[Weaviate] GraphQL feil:", data.errors[0].message);
    return [];
  }

  return data.data?.Get?.[className] ?? [];
}

/** Returner relevante felt per klasse for GraphQL-query */
function getPropertiesForClass(className: string): string {
  const fields: Record<string, string> = {
    StudyProgram: "name institution description nusCode level requiredGpa riasecCodes url",
    CareerPath: "title description demand salaryMin salaryMax riasecCodes styrk08Code",
    KnowledgeArticle: "title body source url lastUpdated",
    ConversationMemory: "userId question answer",
  };
  return fields[className] ?? "name description";
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Krev Firebase ID-token i Authorization-header (JWT-format)
  // Full verifisering gjøres av Cloud Function; her sjekker vi bare at tokenet er til stede.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ") || authHeader.length < 20) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Valider forespørsel
  let body: SearchBody;
  try {
    body = await req.json() as SearchBody;
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørselskropp" }, { status: 400 });
  }

  const { query, className, limit = 10, alpha = 0.75, filters } = body;

  if (!query?.trim() || query.length > 500) {
    return NextResponse.json({ error: "Ugyldig søketerm" }, { status: 400 });
  }

  if (!ALLOWED_CLASSES.has(className)) {
    return NextResponse.json({ error: `Ukjent klasse: ${className}` }, { status: 400 });
  }

  const clampedLimit = Math.min(Math.max(1, limit), 20);

  try {
    const rawResults = await weaviateHybridSearch(
      query.trim(),
      className,
      clampedLimit,
      alpha,
      filters
    );

    // Normaliser til SearchResult-format
    const results = rawResults.map((r) => ({
      id: r._additional?.id ?? String(Math.random()),
      score: r._additional?.score ?? r._additional?.certainty ?? 0,
      payload: Object.fromEntries(
        Object.entries(r).filter(([k]) => k !== "_additional")
      ),
      className,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[Weaviate proxy] Feil:", err);
    return NextResponse.json({ results: [] }); // Graceful degradation
  }
}
