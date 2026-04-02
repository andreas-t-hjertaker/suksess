/**
 * Feedback-lagring — lagrer bruker-feedback på AI-meldinger til Firestore.
 * Collection: chatFeedback/{autoId}
 *
 * Issue #105 — Tilbakemeldingssystem
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
};

/**
 * Lagrer feedback på en AI-melding til Firestore.
 * Meldingsinnhold avkortes til 500 tegn for GDPR (minimer datamengde).
 */
export async function saveChatFeedback(data: FeedbackData): Promise<void> {
  try {
    await addDoc(collection(db, "chatFeedback"), {
      ...data,
      messageContent: data.messageContent.slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("[saveChatFeedback] Kunne ikke lagre feedback:", err);
  }
}
