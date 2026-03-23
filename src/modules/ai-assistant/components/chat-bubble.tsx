"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import { AiBadge } from "@/components/ai-badge";
import { ThumbsUp, ThumbsDown, Copy, Check } from "lucide-react";
import type { ChatMessage } from "../types";

// ---------------------------------------------------------------------------
// Typing-indikator (tre pulserende dots — moderne stil)
// ---------------------------------------------------------------------------
export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        AI
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-foreground/40"
              style={{ animation: `typing-bounce 1.2s ease-in-out ${delay}ms infinite` }}
            />
          ))}
        </div>
        <style>{`
          @keyframes typing-bounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-4px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat-boble
// ---------------------------------------------------------------------------
export function ChatBubble({ message }: { message: ChatMessage }) {
  const [showTime, setShowTime] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const isUser = message.role === "user";

  const time = message.timestamp.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (isUser) {
    return (
      <div
        className="flex flex-col items-end gap-1"
        onMouseEnter={() => setShowTime(true)}
        onMouseLeave={() => setShowTime(false)}
      >
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        {showTime && (
          <span className="px-1 text-[10px] text-muted-foreground">{time}</span>
        )}
      </div>
    );
  }

  // AI-melding
  return (
    <div
      className="flex items-start gap-2.5 group"
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {/* AI-avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
        AI
      </div>

      <div className="flex flex-col gap-1 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm shadow-sm">
          {message.content ? (
            <div className="prose-sm prose-neutral dark:prose-invert max-w-none leading-relaxed [&_p]:m-0 [&_p]:leading-relaxed [&_ul]:m-0 [&_ul]:pl-4 [&_ol]:m-0 [&_ol]:pl-4 [&_li]:m-0 [&_pre]:rounded-lg [&_pre]:bg-background/80 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs">
              <Markdown>{message.content}</Markdown>
            </div>
          ) : null}
          {message.streaming && (
            <span className="inline-flex items-center gap-1 pt-1.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 rounded-full bg-foreground/40"
                  style={{ animation: `typing-bounce 1.2s ease-in-out ${delay}ms infinite` }}
                />
              ))}
            </span>
          )}
        </div>

        {/* Handlinger under AI-boble */}
        {!message.streaming && message.content && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-1">
            {/* EU AI Act merking */}
            <AiBadge />
            <div className="flex-1" />
            {/* Kopier */}
            <button
              onClick={handleCopy}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Kopier svar"
              aria-label="Kopier svar"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {/* Tommel opp */}
            <button
              onClick={() => setFeedback("up")}
              className={cn(
                "rounded-md p-1 transition-colors",
                feedback === "up"
                  ? "text-green-500"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Nyttig svar"
              aria-label="Nyttig svar"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            {/* Tommel ned */}
            <button
              onClick={() => setFeedback("down")}
              className={cn(
                "rounded-md p-1 transition-colors",
                feedback === "down"
                  ? "text-red-500"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Dårlig svar"
              aria-label="Dårlig svar"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {showTime && (
          <span className="pl-1 text-[10px] text-muted-foreground">{time}</span>
        )}
      </div>
    </div>
  );
}
