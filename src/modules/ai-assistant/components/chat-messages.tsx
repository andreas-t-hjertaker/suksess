"use client";

import { useEffect, useRef } from "react";
import { Bot, Sparkles, GraduationCap, Compass, Brain } from "lucide-react";
import { ChatBubble } from "./chat-bubble";
import type { ChatMessage } from "../types";

const SUGGESTED_PROMPTS = [
  { text: "Hva passer for min RIASEC-profil?", icon: Compass },
  { text: "Hjelp meg forstå Big Five-resultatene mine", icon: Brain },
  { text: "Hvilke studier bør jeg vurdere?", icon: GraduationCap },
  { text: "Gi meg karrieretips!", icon: Sparkles },
];

type ChatMessagesProps = {
  messages: ChatMessage[];
  welcomeMessage: string;
  onSendSuggestion?: (text: string) => void;
  userId?: string;
};

export function ChatMessages({ messages, welcomeMessage, onSendSuggestion, userId }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center" role="status">
        <div className="rounded-full bg-primary/10 p-3">
          <Bot className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium">{welcomeMessage}</p>
          <p className="text-xs text-muted-foreground mt-1">Velg et forslag eller skriv din egen melding.</p>
        </div>
        {onSendSuggestion && (
          <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt.text}
                type="button"
                onClick={() => onSendSuggestion(prompt.text)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
              >
                <prompt.icon className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                <span className="line-clamp-2">{prompt.text}</span>
              </button>
            ))}
          </div>
        )}
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
        <ChatBubble key={msg.id} message={msg} userId={userId} />
      ))}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
