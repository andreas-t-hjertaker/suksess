"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Bot, X, Trash2, Sparkles, MinusSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDefaultContext } from "../lib/context";
import { useChatSession } from "../hooks/use-chat";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import type { ChatConfig } from "../types";

// Kontekst-spesifikke forslag per rute
const ROUTE_SUGGESTIONS: Record<string, string[]> = {
  "/dashboard/karriere": ["Hva passer min RIASEC-profil?", "Vise karrierestier for R-typer"],
  "/dashboard/karakterer": ["Hva er SO-poengene mine?", "Hva trenger jeg for å komme inn på medisin?"],
  "/dashboard/soknadscoach": ["Sjekk sjansene mine", "Forklare poenggrensene"],
  "/dashboard/veileder": ["Fortell om deg selv", "Hva slags studier passer meg?", "Gi meg karriereråd"],
};

function getDefaultSuggestions(pathname: string): string[] {
  for (const [key, suggestions] of Object.entries(ROUTE_SUGGESTIONS)) {
    if (pathname.startsWith(key)) return suggestions;
  }
  return ["Hva passer min profil?", "Hva er SO-poeng?", "Hjelp meg velge studie"];
}

export function AiAssistant(config?: ChatConfig) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  const context = useMemo(() => {
    if (config?.contextProvider) {
      return config.contextProvider();
    }
    return getDefaultContext(user, pathname);
  }, [user, pathname, config]);

  const { messages, sendMessage, clearMessages, isStreaming } =
    useChatSession(context, config);

  const title = config?.title || "AI-studieveileder";
  const welcomeMessage =
    config?.welcomeMessage || "Hei! Jeg er din personlige studieveileder. Hva lurer du på? 👋";
  const placeholder = config?.placeholder || "Spør meg om studier, karriere, karakterer...";
  const position = config?.position || "bottom-right";
  const suggestions = config?.suggestions ?? getDefaultSuggestions(pathname);

  function handleSend(text: string) {
    sendMessage(text);
    if (!open) setHasUnread(true);
  }

  function handleOpen() {
    setOpen(true);
    setMinimized(false);
    setHasUnread(false);
  }

  function handleClear() {
    clearMessages();
  }

  const posClass = position === "bottom-right" ? "right-6" : "left-6";

  return (
    <>
      {/* Chat-panel */}
      <div
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden transition-all duration-300 ease-out",
          posClass,
          "bottom-20",
          open && !minimized
            ? "pointer-events-auto translate-y-0 opacity-100 scale-100"
            : "pointer-events-none translate-y-4 opacity-0 scale-95"
        )}
        style={{ transformOrigin: "bottom right" }}
      >
        <div className="flex h-[520px] w-[380px] flex-col rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-primary/5 to-violet-500/5 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 shadow-sm">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold">{title}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-muted-foreground">Online · Gemini 2.5</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleClear}
                disabled={messages.length === 0}
                title="Tøm samtale"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setMinimized(true)}
                title="Minimer"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <MinusSquare className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setOpen(false)}
                title="Lukk"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Meldinger */}
          <ChatMessages messages={messages} welcomeMessage={welcomeMessage} />

          {/* Inndata */}
          <ChatInput
            onSend={handleSend}
            disabled={isStreaming}
            placeholder={placeholder}
            suggestions={messages.length === 0 ? suggestions : undefined}
          />
        </div>
      </div>

      {/* Minimert-visning */}
      {open && minimized && (
        <div
          className={cn(
            "fixed z-50 bottom-20",
            posClass,
            "animate-in slide-in-from-bottom-2 duration-200"
          )}
        >
          <button
            onClick={() => setMinimized(false)}
            className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-background/95 px-4 py-2.5 shadow-xl backdrop-blur-xl hover:bg-background transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium">{title}</span>
            {isStreaming && (
              <span className="flex h-4 items-center gap-0.5">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-primary/60"
                    style={{ animation: `typing-bounce 1.2s ease-in-out ${d}ms infinite` }}
                  />
                ))}
              </span>
            )}
          </button>
        </div>
      )}

      {/* FAB-knapp */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-label={open ? "Lukk AI-assistent" : "Åpne AI-assistent"}
        className={cn(
          "fixed z-50 bottom-6 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "hover:scale-105 hover:shadow-xl active:scale-95",
          open
            ? "bg-foreground/10 text-foreground backdrop-blur-sm border border-border/50"
            : "bg-primary text-primary-foreground glow-sm",
          posClass
        )}
        style={{ height: "52px", width: "52px" }}
      >
        <div className="relative">
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <>
              <Bot className="h-5 w-5" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-background" />
              )}
            </>
          )}
        </div>
      </button>
    </>
  );
}
