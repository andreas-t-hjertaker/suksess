/**
 * Feedback → Notion synkronisering
 *
 * Firestore-triggere som automatisk synkroniserer feedback til Notion.
 * Håndterer to collections:
 *   1. chatFeedback/{id}  — thumbs up/down på AI-meldinger
 *   2. feedback/{id}      — generell plattform-feedback (feil/forslag/ros)
 *
 * Notion-database propertier:
 *   - Tilbakemelding (title)  — emoji + type + tittel
 *   - Type (select)           — "AI-feedback" / "Feil" / "Forslag" / "Ros"
 *   - Prioritet (select)      — "Kritisk" / "Høy" / "Middels" / "Lav" (nullable)
 *   - Beskrivelse (rich_text) — innhold (avkortet)
 *   - Side (rich_text)        — hvilken side feedback kom fra
 *   - Bruker-ID (rich_text)   — anonymisert
 *   - Kilde (select)          — "FAB" / "Error Boundary" / "AI-veileder" osv.
 *   - Nettleser (rich_text)   — teknisk kontekst
 *   - Status (select)         — "Ny" / "Under behandling" / "Løst" / "Avvist"
 *   - Opprettet (date)        — ISO-dato
 *
 * Secrets (Firebase Functions config):
 *   NOTION_API_TOKEN         — Notion integration token
 *   NOTION_FEEDBACK_DB_ID    — Notion database ID for feedback
 */

// Leses fra miljøvariabler (satt via Cloud Functions env eller Secret Manager manuelt)
// Bruker process.env i stedet for defineSecret for å unngå at Firebase CLI
// krever Secret Manager API under deploy.

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
  middels: "Middels",
  lav: "Lav",
};

const KILDE_LABELS: Record<string, string> = {
  fab: "FAB",
  sidebar: "Sidebar",
  "error-boundary": "Error Boundary",
  toast: "Toast",
};

const STATUS_LABELS: Record<string, string> = {
  ny: "Ny",
  under_behandling: "Under behandling",
  lost: "Løst",
  avvist: "Avvist",
};

// ---------------------------------------------------------------------------
// Felles Notion API-kall
// ---------------------------------------------------------------------------

async function createNotionPage(
  properties: Record<string, unknown>
): Promise<boolean> {
  const token = process.env.NOTION_API_TOKEN ?? "";
  const databaseId = process.env.NOTION_FEEDBACK_DB_ID ?? "";

  if (!token || !databaseId) {
    console.warn(
      "[feedback-notion-sync] Mangler NOTION_API_TOKEN eller NOTION_FEEDBACK_DB_ID — hopper over sync"
    );
    return false;
  }

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `[feedback-notion-sync] Notion API feil (${response.status}): ${errorText}`
    );
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// chatFeedback → Notion (AI-meldinger)
// ---------------------------------------------------------------------------

/**
 * Synkroniserer ett chatFeedback-dokument til Notion.
 */
export async function syncChatFeedbackToNotion(
  feedbackId: string,
  data: ChatFeedbackDoc
): Promise<void> {
  const isPositive = data.rating === "thumbs_up";
  const emoji = isPositive ? "👍" : "👎";
  const ratingLabel = isPositive ? "Positiv" : "Negativ";
  const reasonLabel = data.reason
    ? REASON_LABELS[data.reason] ?? data.reason
    : null;

  const title = [emoji, "AI-feedback", ratingLabel, reasonLabel ? `— ${reasonLabel}` : ""]
    .filter(Boolean)
    .join(" ");

  const anonymizedUserId = data.userId.slice(0, 8) + "…";
  const createdDate =
    data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString();

  const properties: Record<string, unknown> = {
    Tilbakemelding: {
      title: [{ text: { content: title } }],
    },
    Type: {
      select: { name: "AI-feedback" },
    },
    Beskrivelse: {
      rich_text: [
        {
          text: {
            content: data.messageContent?.slice(0, 500) || "(tom melding)",
          },
        },
      ],
    },
    "Bruker-ID": {
      rich_text: [{ text: { content: anonymizedUserId } }],
    },
    Kilde: {
      select: { name: "AI-veileder" },
    },
    Status: {
      select: { name: "Ny" },
    },
    Opprettet: {
      date: { start: createdDate },
    },
  };

  if (reasonLabel) {
    properties["Prioritet"] = {
      select: { name: reasonLabel },
    };
  }

  if (data.conversationId) {
    properties["Side"] = {
      rich_text: [{ text: { content: `/dashboard/veileder (${data.conversationId})` } }],
    };
  }

  const ok = await createNotionPage(properties);
  if (ok) {
    console.log(
      `[feedback-notion-sync] chatFeedback ${feedbackId} → Notion (${ratingLabel})`
    );
  }
}

// ---------------------------------------------------------------------------
// feedback → Notion (generell plattform-feedback)
// ---------------------------------------------------------------------------

/**
 * Synkroniserer ett generelt feedback-dokument til Notion.
 */
export async function syncTilbakemeldingToNotion(
  feedbackId: string,
  data: TilbakemeldingDoc
): Promise<void> {
  const emoji = TYPE_EMOJIS[data.type] ?? "📝";
  const typeLabel = TYPE_LABELS[data.type] ?? data.type;
  const title = `${emoji} ${typeLabel}: ${data.tittel.slice(0, 80)}`;

  const anonymizedUserId = data.uid.slice(0, 8) + "…";
  const createdDate =
    data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString();

  const properties: Record<string, unknown> = {
    Tilbakemelding: {
      title: [{ text: { content: title } }],
    },
    Type: {
      select: { name: typeLabel },
    },
    Beskrivelse: {
      rich_text: [
        {
          text: {
            content: [
              data.beskrivelse?.slice(0, 400),
              data.feilmelding ? `\n\nFeil: ${data.feilmelding}` : "",
            ]
              .filter(Boolean)
              .join(""),
          },
        },
      ],
    },
    Side: {
      rich_text: [{ text: { content: data.side || "ukjent" } }],
    },
    "Bruker-ID": {
      rich_text: [{ text: { content: anonymizedUserId } }],
    },
    Kilde: {
      select: { name: KILDE_LABELS[data.kilde] ?? data.kilde },
    },
    Nettleser: {
      rich_text: [{ text: { content: data.nettleser || "ukjent" } }],
    },
    Status: {
      select: { name: STATUS_LABELS[data.status] ?? "Ny" },
    },
    Opprettet: {
      date: { start: createdDate },
    },
  };

  // Prioritet kun for feilrapporter
  if (data.prioritet && PRIORITET_LABELS[data.prioritet]) {
    properties["Prioritet"] = {
      select: { name: PRIORITET_LABELS[data.prioritet] },
    };
  }

  const ok = await createNotionPage(properties);
  if (ok) {
    console.log(
      `[feedback-notion-sync] feedback ${feedbackId} → Notion (${typeLabel})`
    );
  }
}

/** Ingen secrets-deklarasjon nødvendig — bruker process.env direkte */
export const feedbackNotionSecrets: never[] = [];
