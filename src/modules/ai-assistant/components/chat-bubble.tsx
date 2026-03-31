"use client";

import { useState, useCallback } from "react";
import { Bot, Flag, ThumbsUp, ThumbsDown } from "lucide-react";
import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { reportAiError, submitChatFeedback, type FeedbackReason } from "@/lib/ai/decision-log";
import type { ChatMessage } from "../types";

function ReportButton({
  message,
  userId,
}: {
  message: ChatMessage;
  userId?: string;
}) {
  const [state, setState] = useState<"idle" | "open" | "sent">("idle");
  const [reason, setReason] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!reason.trim() || !userId) return;
    try {
      await reportAiError({
        userId,
        messageId: message.id,
        messageContent: message.content,
        reason: reason.trim(),
      });
      setState("sent");
    } catch {
      // Silently fail — ikke blokkér bruker
    }
  }, [reason, userId, message.id, message.content]);

  if (state === "sent") {
    return (
      <span className="text-[10px] text-muted-foreground">
        Takk for tilbakemeldingen!
      </span>
    );
  }

  if (state === "open") {
    return (
      <div className="flex flex-col gap-1 mt-1">
        <textarea
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Beskriv hva som var feil..."
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
        <div className="flex gap-1">
          <button
            className="rounded-md bg-primary px-2 py-0.5 text-[10px] text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!reason.trim()}
          >
            Send
          </button>
          <button
            className="rounded-md px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              setState("idle");
              setReason("");
            }}
          >
            Avbryt
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => setState("open")}
      aria-label="Rapporter feil i dette svaret"
    >
      <Flag className="h-2.5 w-2.5" aria-hidden="true" />
      Rapporter feil
    </button>
  );
}

const NEGATIVE_REASONS: { value: FeedbackReason; label: string }[] = [
  { value: "feil_info", label: "Feil informasjon" },
  { value: "ikke_relevant", label: "Ikke relevant" },
  { value: "uforstaelig", label: "Uforståelig" },
  { value: "annet", label: "Annet" },
];

function FeedbackButtons({
  message,
  userId,
}: {
  message: ChatMessage;
  userId?: string;
}) {
  const [rating, setRating] = useState<"positive" | "negative" | null>(null);
  const [showReasons, setShowReasons] = useState(false);

  const handlePositive = useCallback(async () => {
    if (!userId || rating) return;
    setRating("positive");
    await submitChatFeedback({
      userId,
      messageId: message.id,
      rating: "positive",
    });
  }, [userId, rating, message.id]);

  const handleNegative = useCallback(() => {
    if (!userId || rating) return;
    setShowReasons(true);
  }, [userId, rating]);

  const handleNegativeWithReason = useCallback(
    async (reason: FeedbackReason) => {
      if (!userId) return;
      setRating("negative");
      setShowReasons(false);
      await submitChatFeedback({
        userId,
        messageId: message.id,
        rating: "negative",
        reason,
      });
    },
    [userId, message.id]
  );

  if (rating) {
    return (
      <span className="text-[10px] text-muted-foreground">
        {rating === "positive" ? "👍 Takk!" : "👎 Takk for tilbakemeldingen"}
      </span>
    );
  }

  if (showReasons) {
    return (
      <div className="flex flex-wrap gap-1">
        {NEGATIVE_REASONS.map((r) => (
          <button
            key={r.value}
            className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => handleNegativeWithReason(r.value)}
          >
            {r.label}
          </button>
        ))}
        <button
          className="text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => setShowReasons(false)}
        >
          Avbryt
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        onClick={handlePositive}
        aria-label="Nyttig svar"
      >
        <ThumbsUp className="h-2.5 w-2.5" aria-hidden="true" />
      </button>
      <button
        className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        onClick={handleNegative}
        aria-label="Ikke nyttig svar"
      >
        <ThumbsDown className="h-2.5 w-2.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ChatBubble({
  message,
  userId,
}: {
  message: ChatMessage;
  userId?: string;
}) {
  const [showTime, setShowTime] = useState(false);
  const isUser = message.role === "user";

  const time = message.timestamp.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const roleLabel = isUser ? "Du" : "AI-veileder";

  return (
    <div
      className={cn(
        "flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      role="article"
      aria-label={`${roleLabel}, ${time}`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
      onFocus={() => setShowTime(true)}
      onBlur={() => setShowTime(false)}
      tabIndex={0}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
          <Bot className="h-3 w-3 text-primary" aria-hidden="true" />
        </div>
      )}

      <div className="flex flex-col gap-0.5" style={{ maxWidth: "80%" }}>
        {/* AI-generert merking (EU AI Act) */}
        {!isUser && (
          <div className="flex items-center gap-1.5 px-1">
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground border-muted-foreground/30"
            >
              AI-generert
            </Badge>
          </div>
        )}

        <div
          className={cn(
            "px-3.5 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-2xl rounded-br-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
              : "rounded-2xl rounded-bl-md bg-muted/80 text-foreground"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              {message.content ? (
                <div className="prose-sm prose-neutral dark:prose-invert max-w-none [&_pre]:rounded-lg [&_pre]:bg-background/50 [&_pre]:p-2.5 [&_pre]:font-mono [&_pre]:text-xs [&_code]:rounded-md [&_code]:bg-background/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_p]:m-0 [&_p]:leading-relaxed [&_ul]:m-0 [&_ul]:pl-4 [&_ol]:m-0 [&_ol]:pl-4 [&_li]:m-0">
                  <Markdown
                  allowedElements={["p", "br", "strong", "em", "ul", "ol", "li", "code", "pre", "blockquote", "h1", "h2", "h3", "a", "span"]}
                  skipHtml={true}
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href?.startsWith("http") ? href : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >{message.content}</Markdown>
                </div>
              ) : null}
              {message.streaming && (
                <span className="inline-flex items-center gap-1.5 pt-1" role="status" aria-label="Veileder skriver...">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "0ms" }} aria-hidden="true" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} aria-hidden="true" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "300ms" }} aria-hidden="true" />
                </span>
              )}
            </>
          )}
        </div>

        {/* Handlinger og tidsstempel under AI-meldinger */}
        {!isUser && !message.streaming && message.content && (
          <div className="flex items-center gap-2 px-1">
            <FeedbackButtons message={message} userId={userId} />
            <span className="text-muted-foreground/30" aria-hidden="true">·</span>
            <ReportButton message={message} userId={userId} />
          </div>
        )}

        {/* Ansvarsfraskrivelse på AI-svar med karriereinnhold */}
        {!isUser && !message.streaming && message.content && (
          <p className="px-1 text-[9px] leading-tight text-muted-foreground/70 mt-0.5">
            AI-generert innhold. For viktige valg, snakk med en rådgiver.
          </p>
        )}

        {showTime && (
          <span className={cn("px-1 text-[10px] text-muted-foreground", isUser ? "text-right" : "text-left")} aria-hidden="true">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}
