/**
 * Server-Sent Events (SSE) endpoint for AI chat streaming (Issue #40)
 *
 * POST /api/chat/stream
 * Body: { messages: ChatMessage[], feature?: string, tenantId?: string }
 *
 * Returnerer SSE-stream med delta-tokens fra Gemini via Vertex AI.
 * Autentisering via Firebase ID-token i Authorization-header.
 *
 * Merk: Klient-side streaming via Firebase AI SDK er primær tilnærming.
 * Dette endepunktet er for server-side agenter og fallback-scenarioer.
 */

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_FUNCTIONS_URL ??
  "https://europe-west1-suksess-prod.cloudfunctions.net";

/**
 * Proxy streaming SSE fra Cloud Function til klient.
 * Cloud Function håndterer autentisering og LLM-kallet.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Proxy til Cloud Function med streaming
  const upstream = await fetch(`${FUNCTIONS_URL}/llm-chat-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response(
      formatSseError("LLM-tjenesten er midlertidig utilgjengelig."),
      {
        status: 502,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  // Transparently proxy SSE-stream til klient
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Deaktiver Nginx-buffering
    },
  });
}

function formatSseError(message: string): string {
  return `data: ${JSON.stringify({ type: "error", error: message })}\n\n`;
}
