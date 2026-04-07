/**
 * Feedback-lagring — lagrer bruker-feedback på AI-meldinger til Firestore.
 * Collection: chatFeedback/{autoId}
 *
 * Issue #105 — Tilbakemeldingssystem
 *
 * Feedback synkroniseres automatisk til Notion via Cloud Function-trigger
 * (onDocumentCreated på chatFeedback-collection).
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { FeedbackRating, FeedbackReason } from "../types";

type FeedbackData = {
  userId: string;
  conversationId: string | null;
  messageId: string;
  rating: FeedbackRating;
  reason: FeedbackReason | null;
  messageContent: string;
  /** Hvilken side/funksjon feedback ble gitt fra (f.eks. "karriere", "veileder") */
  pageContext?: string;
  /** Brukerens rolle (elev, foresatt, rådgiver) */
  userRole?: string;
};

/**
 * Lagrer feedback på en AI-melding til Firestore.
 * Meldingsinnhold avkortes til 500 tegn for GDPR (minimer datamengde).
 *
 * Notion-sync skjer automatisk via Cloud Function-trigger —
 * ingen ekstra klient-side logikk nødvendig.
 */
export async function saveChatFeedback(data: FeedbackData): Promise<void> {
  try {
    await addDoc(collection(db, "chatFeedback"), {
      ...data,
      messageContent: data.messageContent.slice(0, 500),
      pageContext: data.pageContext ?? null,
      userRole: data.userRole ?? null,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("[saveChatFeedback] Kunne ikke lagre feedback:", err);
  }
}
