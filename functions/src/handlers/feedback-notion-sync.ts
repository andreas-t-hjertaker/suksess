/**
 * Feedback → Notion synkronisering
 *
 * Firestore-triggere som automatisk synkroniserer feedback til Notion.
 * Håndterer to collections:
 *   1. chatFeedback/{id}  — thumbs up/down på AI-meldinger
 *   2. feedback/{id}      — generell plattform-feedback (feil/forslag/ros)
 *
 * Notion-database: «Pilotbruker Feedback — Suksess»
 * Properties (matcher Notion-skjemaet):
 *   - Feedback (title)       — emoji + type + tittel
 *   - Type (select)          — "AI-feedback" / "Feil" / "Forslag" / "Ros" / "Annet"
 *   - Status (select)        — "Ny"
 *   - Prioritet (select)     — "Kritisk" / "Høy" / "Medium" / "Lav"
 *   - Beskrivelse (rich_text) — innhold
 *   - Side (rich_text)       — hvilken side feedback kom fra
 *   - Bruker (rich_text)     — anonymisert bruker-ID
 *   - Kilde (select)         — "FAB" / "Sidebar" / "Error Boundary" / "Toast" / "AI-veileder"
 *   - Nettleser (rich_text)  — teknisk kontekst
 *   - E-post (email)         — brukerens e-post
 *   - Dato (date)            — ISO-dato
 *   - Firestore ID (rich_text) — ID for sporbarhet
 *
 * Miljøvariabler:
 *   NOTION_API_TOKEN         — Notion integration token
 *   NOTION_FEEDBACK_DB_ID    — Notion database ID for feedback
 */

import { logger } from "firebase-functions/v2";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

/** AI-chat feedback (chatFeedback-collection) */
export type ChatFeedbackDoc = {
  userId: string;
  conversationId: string | null;
  messageId: string;
  rating: "thumbs_up" | "thumbs_down";
  reason: string | null;
  messageContent: string;
  createdAt?: { toDate?: () => Date };
};

/** Generell plattform-feedback (feedback-collection) */
export type TilbakemeldingDoc = {
  type: "feil" | "forslag" | "ros";
  tittel: string;
  beskrivelse: string;
  prioritet?: string | null;
  kilde: string;
  side: string;
  nettleser: string;
  skjermstorrelse: string;
  uid: string;
  epost?: string | null;
  feilmelding?: string | null;
  stackTrace?: string | null;
  status: string;
  createdAt?: { toDate?: () => Date };
};

// ---------------------------------------------------------------------------
// Mappings
// ---------------------------------------------------------------------------

const REASON_LABELS: Record<string, string> = {
  wrong_info: "Feil informasjon",
  not_relevant: "Ikke relevant",
  unclear: "Uforståelig",
  other: "Annet",
};

const TYPE_EMOJIS: Record<string, string> = {
  feil: "🐛",
  forslag: "💡",
  ros: "👏",
};

const TYPE_LABELS: Record<string, string> = {
  feil: "Feil",
  forslag: "Forslag",
  ros: "Ros",
};

const PRIORITET_LABELS: Record<string, string> = {
  kritisk: "Kritisk",
  hoy: "Høy",
  middels: "Medium",
  lav: "Lav",
};

const KILDE_LABELS: Record<string, string> = {
  fab: "FAB",
  sidebar: "Sidebar",
  "error-boundary": "Error Boundary",
  toast: "Toast",
};

// ---------------------------------------------------------------------------
// Felles Notion API-kall
// ---------------------------------------------------------------------------

async function createNotionPage(
  properties: Record<string, unknown>,
  children?: unknown[]
): Promise<string | null> {
  const token = process.env.NOTION_API_TOKEN ?? "";
  const databaseId = process.env.NOTION_FEEDBACK_DB_ID ?? "";

  if (!token || !databaseId) {
    logger.warn(
      "[feedback-notion-sync] Mangler NOTION_API_TOKEN eller NOTION_FEEDBACK_DB_ID — hopper over sync"
    );
    return null;
  }

  const body: Record<string, unknown> = {
    parent: { database_id: databaseId },
    properties,
  };
  if (children && children.length > 0) {
    body.children = children;
  }

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      `[feedback-notion-sync] Notion API feil (${response.status}): ${errorText}`
    );
    return null;
  }

  const result = (await response.json()) as { id?: string };
  return result.id ?? null;
}

// ---------------------------------------------------------------------------
// chatFeedback → Notion (AI-meldinger)
// ---------------------------------------------------------------------------

/**
 * Synkroniserer ett chatFeedback-dokument til Notion.
 * Returnerer Notion-side-ID for writeback til Firestore.
 */
export async function syncChatFeedbackToNotion(
  feedbackId: string,
  data: ChatFeedbackDoc
): Promise<string | null> {
  const isPositive = data.rating === "thumbs_up";
  const emoji = isPositive ? "👍" : "👎";
  const ratingLabel = isPositive ? "Positiv" : "Negativ";
  const reasonLabel = data.reason
    ? REASON_LABELS[data.reason] ?? data.reason
    : null;

  const title = [emoji, "AI-feedback", ratingLabel, reasonLabel ? `— ${reasonLabel}` : ""]
    .filter(Boolean)
    .join(" ");

  const anonymizedUserId = data.userId ? data.userId.slice(0, 8) + "…" : "anonym";
  const createdDate =
    data.createdAt?.toDate?.()?.toISOString()?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  const properties: Record<string, unknown> = {
    Feedback: {
      title: [{ text: { content: title.slice(0, 200) } }],
    },
    Type: {
      select: { name: "AI-feedback" },
    },
    Beskrivelse: {
      rich_text: [
        {
          text: {
            content: data.messageContent?.slice(0, 2000) || "(tom melding)",
          },
        },
      ],
    },
    Bruker: {
      rich_text: [{ text: { content: anonymizedUserId } }],
    },
    Kilde: {
      select: { name: "AI-veileder" },
    },
    Status: {
      select: { name: "Ny" },
    },
    Dato: {
      date: { start: createdDate },
    },
    "Firestore ID": {
      rich_text: [{ text: { content: feedbackId } }],
    },
  };

  if (data.conversationId) {
    properties["Side"] = {
      rich_text: [{ text: { content: `/dashboard/veileder (${data.conversationId})` } }],
    };
  }

  const notionId = await createNotionPage(properties);
  if (notionId) {
    logger.info(
      `[feedback-notion-sync] chatFeedback ${feedbackId} → Notion ${notionId} (${ratingLabel})`
    );
  }
  return notionId;
}

// ---------------------------------------------------------------------------
// feedback → Notion (generell plattform-feedback)
// ---------------------------------------------------------------------------

/**
 * Synkroniserer ett generelt feedback-dokument til Notion.
 * Returnerer Notion-side-ID for writeback til Firestore.
 */
export async function syncTilbakemeldingToNotion(
  feedbackId: string,
  data: TilbakemeldingDoc
): Promise<string | null> {
  const emoji = TYPE_EMOJIS[data.type] ?? "📝";
  const typeLabel = TYPE_LABELS[data.type] ?? data.type;
  const title = `${emoji} ${typeLabel}: ${data.tittel.slice(0, 80)}`;

  const anonymizedUserId = data.uid ? data.uid.slice(0, 8) + "…" : "anonym";
  const createdDate =
    data.createdAt?.toDate?.()?.toISOString()?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  const properties: Record<string, unknown> = {
    Feedback: {
      title: [{ text: { content: title.slice(0, 200) } }],
    },
    Type: {
      select: { name: typeLabel },
    },
    Status: {
      select: { name: "Ny" },
    },
    Dato: {
      date: { start: createdDate },
    },
    "Firestore ID": {
      rich_text: [{ text: { content: feedbackId } }],
    },
    Bruker: {
      rich_text: [{ text: { content: anonymizedUserId } }],
    },
  };

  // Beskrivelse som separat property
  if (data.beskrivelse) {
    const beskContent = [
      data.beskrivelse.slice(0, 1800),
      data.feilmelding ? `\n\nFeil: ${data.feilmelding}` : "",
    ]
      .filter(Boolean)
      .join("");
    properties["Beskrivelse"] = {
      rich_text: [{ text: { content: beskContent } }],
    };
  }

  if (data.side) {
    properties["Side"] = {
      rich_text: [{ text: { content: data.side.slice(0, 200) } }],
    };
  }

  if (data.kilde) {
    properties["Kilde"] = {
      select: { name: KILDE_LABELS[data.kilde] ?? data.kilde },
    };
  }

  if (data.nettleser) {
    properties["Nettleser"] = {
      rich_text: [{ text: { content: data.nettleser.slice(0, 200) } }],
    };
  }

  if (data.epost) {
    properties["E-post"] = { email: data.epost };
  }

  // Prioritet kun for feilrapporter
  if (data.prioritet && PRIORITET_LABELS[data.prioritet]) {
    properties["Prioritet"] = {
      select: { name: PRIORITET_LABELS[data.prioritet] },
    };
  }

  // Children-blokker for ekstra kontekst
  const children: unknown[] = [];

  if (data.stackTrace) {
    children.push(
      {
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: [{ text: { content: "Stack Trace" } }] },
      },
      {
        object: "block",
        type: "code",
        code: {
          rich_text: [{ text: { content: data.stackTrace.slice(0, 2000) } }],
          language: "plain text",
        },
      }
    );
  }

  const notionId = await createNotionPage(properties, children);
  if (notionId) {
    logger.info(
      `[feedback-notion-sync] feedback ${feedbackId} → Notion ${notionId} (${typeLabel})`
    );
  }
  return notionId;
}

/** Ingen secrets-deklarasjon nødvendig — bruker process.env direkte */
export const feedbackNotionSecrets: never[] = [];
