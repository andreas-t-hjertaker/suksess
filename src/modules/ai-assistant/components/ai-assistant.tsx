"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, X, Trash2, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDefaultContext } from "../lib/context";
import { useChatSession } from "../hooks/use-chat";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ConversationHistory } from "./conversation-history";
import type { ChatConfig } from "../types";

export function AiAssistant(config?: ChatConfig) {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  const context = useMemo(() => {
    if (config?.contextProvider) {
      return config.contextProvider();
    }
    return getDefaultContext(user, pathname);
  }, [user, pathname, config]);

  const { messages, sendMessage, clearMessages, loadConversation, isStreaming, conversationId } =
    useChatSession(context, config);

  const title = config?.title || "AI-assistent";
  const welcomeMessage =
    config?.welcomeMessage || "Hei! Hvordan kan jeg hjelpe deg i dag?";
  const placeholder = config?.placeholder || "Skriv en melding...";
  const position = config?.position || "bottom-right";

  // Marker uleste meldinger når panelet er lukket
  function handleSend(text: string) {
    sendMessage(text);
    if (!open) setHasUnread(true);
  }

  function handleOpen() {
    setOpen(true);
    setHasUnread(false);
  }

  function handleClear() {
    clearMessages();
  }

  return (
    <>
      {/* Chat-panel */}
      <div
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden transition-all duration-200 ease-out",
          position === "bottom-right" ? "right-6 bottom-20" : "left-6 bottom-20",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        )}
      >
        <Card className="flex h-[500px] w-[380px] flex-col shadow-xl sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              {user && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setShowHistory(!showHistory)}
                  title="Samtalehistorikk"
                  aria-label="Samtalehistorikk"
                  aria-expanded={showHistory}
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleClear}
                disabled={messages.length === 0}
                title="Tøm samtale"
                aria-label="Tøm samtale"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setOpen(false)}
                title="Lukk"
                aria-label="Lukk chat"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Samtalehistorikk-panel */}
          {showHistory && user && (
            <div className="absolute inset-0 top-[49px] z-10 bg-background">
              <ConversationHistory
                userId={user.uid}
                activeConversationId={conversationId}
                onSelect={(id) => loadConversation(id)}
                onNewChat={handleClear}
                onClose={() => setShowHistory(false)}
              />
            </div>
          )}

          {/* Meldinger */}
          <ChatMessages messages={messages} welcomeMessage={welcomeMessage} />

          {/* Inndata */}
          <ChatInput
            onSend={handleSend}
            disabled={isStreaming}
            placeholder={placeholder}
          />
        </Card>
      </div>

      {/* FAB-knapp */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-label={open ? "Lukk AI-assistent" : hasUnread ? "Åpne AI-assistent (ulest melding)" : "Åpne AI-assistent"}
        aria-expanded={open}
        className={cn(
          "fixed z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95",
          position === "bottom-right" ? "right-6 bottom-6" : "left-6 bottom-6"
        )}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <>
            <Bot className="h-5 w-5" aria-hidden="true" />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive" aria-hidden="true" />
            )}
          </>
        )}
      </button>
    </>
  );
}
