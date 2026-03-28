"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "../types";

export function ChatBubble({ message }: { message: ChatMessage }) {
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
        {showTime && (
          <span className={cn("px-1 text-[10px] text-muted-foreground", isUser ? "text-right" : "text-left")} aria-hidden="true">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}
