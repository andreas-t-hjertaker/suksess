"use client";

import { useState } from "react";
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
      className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}
      role="article"
      aria-label={`${roleLabel}, ${time}`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
      onFocus={() => setShowTime(true)}
      onBlur={() => setShowTime(false)}
      tabIndex={0}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            {message.content ? (
              <div className="prose-sm prose-neutral dark:prose-invert max-w-none [&_pre]:rounded-md [&_pre]:bg-background/50 [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs [&_code]:rounded [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_p]:m-0 [&_p]:leading-relaxed [&_ul]:m-0 [&_ul]:pl-4 [&_ol]:m-0 [&_ol]:pl-4 [&_li]:m-0">
                <Markdown>{message.content}</Markdown>
              </div>
            ) : null}
            {message.streaming && (
              <span className="inline-flex items-center gap-1 pt-1" role="status" aria-label="Veileder skriver...">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50" aria-hidden="true" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50 [animation-delay:150ms]" aria-hidden="true" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50 [animation-delay:300ms]" aria-hidden="true" />
              </span>
            )}
          </>
        )}
      </div>
      {showTime && (
        <span className="px-1 text-[10px] text-muted-foreground" aria-hidden="true">{time}</span>
      )}
    </div>
  );
}
