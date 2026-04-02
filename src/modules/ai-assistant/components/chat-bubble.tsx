"use client";

import { useState } from "react";
import { Bot, ThumbsUp, ThumbsDown } from "lucide-react";
import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { ChatMessage, FeedbackRating, FeedbackReason } from "../types";

const FEEDBACK_REASONS: { value: FeedbackReason; label: string }[] = [
  { value: "wrong_info", label: "Feil informasjon" },
  { value: "not_relevant", label: "Ikke relevant" },
  { value: "unclear", label: "Uforståelig" },
  { value: "other", label: "Annet" },
];

type ChatBubbleProps = {
  message: ChatMessage;
  onFeedback?: (messageId: string, rating: FeedbackRating, reason?: FeedbackReason) => void;
};

export function ChatBubble({ message, onFeedback }: ChatBubbleProps) {
  const [showTime, setShowTime] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const isUser = message.role === "user";
  const canShowFeedback = !isUser && !message.streaming && message.content;

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
        {/* Feedback-knapper for AI-meldinger */}
        {canShowFeedback && onFeedback && (
          <div className="flex items-center gap-1 px-1 mt-0.5">
            <button
              type="button"
              onClick={() => {
                onFeedback(message.id, "thumbs_up");
                setShowReasons(false);
              }}
              className={cn(
                "rounded p-0.5 transition-colors",
                message.feedback === "thumbs_up"
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground/50 hover:text-green-600 dark:hover:text-green-400"
              )}
              aria-label="Nyttig svar"
              title="Nyttig svar"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (message.feedback === "thumbs_down") return;
                setShowReasons((v) => !v);
              }}
              className={cn(
                "rounded p-0.5 transition-colors",
                message.feedback === "thumbs_down"
                  ? "text-red-500 dark:text-red-400"
                  : "text-muted-foreground/50 hover:text-red-500 dark:hover:text-red-400"
              )}
              aria-label="Ikke nyttig svar"
              title="Ikke nyttig svar"
            >
              <ThumbsDown className="h-3 w-3" />
            </button>
            {message.feedback && (
              <span className="text-[10px] text-muted-foreground ml-1">
                Takk for tilbakemelding
              </span>
            )}
          </div>
        )}

        {/* Begrunnelse-dropdown ved thumbs down */}
        {showReasons && !message.feedback && onFeedback && (
          <div className="flex flex-wrap gap-1 px-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {FEEDBACK_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  onFeedback(message.id, "thumbs_down", r.value);
                  setShowReasons(false);
                }}
                className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
              >
                {r.label}
              </button>
            ))}
          </div>
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
