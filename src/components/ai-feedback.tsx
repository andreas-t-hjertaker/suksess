"use client";

/**
 * AI-tilbakemeldingskomponent — elev-feedback på AI-svar (Issue #105)
 *
 * Lar elever gi tommel opp/ned og valgfri fritekst-tilbakemelding på AI-svar.
 * Data lagres i Firestore for kvalitetsforbedring og EU AI Act compliance.
 */

import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { nowISO } from "@/lib/utils/time";
import { logger } from "@/lib/observability/logger";

export type FeedbackRating = "positive" | "negative" | null;

export type AiFeedbackData = {
  messageId: string;
  conversationId: string;
  userId: string;
  rating: FeedbackRating;
  comment: string | null;
  featureId: string;
  timestamp: string;
};

type AiFeedbackProps = {
  messageId: string;
  conversationId: string;
  userId: string;
  featureId?: string;
};

async function submitFeedback(data: AiFeedbackData): Promise<boolean> {
  try {
    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(
      doc(collection(db, "users", data.userId, "feedback"), feedbackId),
      {
        ...data,
        createdAt: serverTimestamp(),
      }
    );
    logger.info("ai_feedback_submitted", {
      rating: data.rating,
      featureId: data.featureId,
      hasComment: !!data.comment,
    });
    return true;
  } catch (err) {
    logger.error("ai_feedback_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}

export function AiFeedback({
  messageId,
  conversationId,
  userId,
  featureId = "career-advisor",
}: AiFeedbackProps) {
  const [rating, setRating] = useState<FeedbackRating>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleRating(newRating: FeedbackRating) {
    setRating(newRating);
    setSubmitting(true);

    const success = await submitFeedback({
      messageId,
      conversationId,
      userId,
      rating: newRating,
      comment: null,
      featureId,
      timestamp: nowISO(),
    });

    setSubmitting(false);
    if (success && newRating === "negative") {
      setShowComment(true);
    } else if (success) {
      setSubmitted(true);
    }
  }

  async function handleCommentSubmit() {
    if (!comment.trim()) return;
    setSubmitting(true);

    const success = await submitFeedback({
      messageId,
      conversationId,
      userId,
      rating,
      comment: comment.trim(),
      featureId,
      timestamp: nowISO(),
    });

    setSubmitting(false);
    if (success) {
      setSubmitted(true);
      setShowComment(false);
    }
  }

  if (submitted) {
    return (
      <p className="text-xs text-muted-foreground" role="status">
        Takk for tilbakemeldingen!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">Var dette nyttig?</span>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6",
            rating === "positive" && "text-green-600 bg-green-50 dark:bg-green-950"
          )}
          onClick={() => handleRating("positive")}
          disabled={submitting}
          aria-label="Nyttig svar"
          aria-pressed={rating === "positive"}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6",
            rating === "negative" && "text-red-600 bg-red-50 dark:bg-red-950"
          )}
          onClick={() => handleRating("negative")}
          disabled={submitting}
          aria-label="Ikke nyttig svar"
          aria-pressed={rating === "negative"}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
        {!showComment && rating === null && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowComment(true)}
            aria-label="Gi tilbakemelding"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        )}
        {submitting && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {showComment && (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Hva kan forbedres?"
            className="flex-1 rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
            maxLength={500}
            aria-label="Tilbakemelding på AI-svar"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCommentSubmit();
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCommentSubmit}
            disabled={!comment.trim() || submitting}
            aria-label="Send tilbakemelding"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
