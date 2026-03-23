"use client";

import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import { ChatBubble } from "./chat-bubble";
import type { ChatMessage } from "../types";

type ChatMessagesProps = {
  messages: ChatMessage[];
  welcomeMessage: string;
};

export function ChatMessages({ messages, welcomeMessage }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Rull til bunnen ved nye meldinger
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="status">
        <div className="rounded-full bg-muted p-3">
          <Bot className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">{welcomeMessage}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col gap-3 overflow-y-auto p-3"
      role="log"
      aria-live="polite"
      aria-label="AI-chat samtale"
    >
      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
