"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: string[];
};

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Skriv en melding...",
  suggestions,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasValue = value.trim().length > 0;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  function handleSend() {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-border/60 bg-background/80 backdrop-blur-sm p-3 space-y-2">
      {/* Foreslåtte spørsmål */}
      {suggestions && suggestions.length > 0 && !hasValue && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => { onSend(s); }}
              disabled={disabled}
              className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Inputfelt */}
      <div className={cn(
        "flex items-end gap-2 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 transition-all",
        "focus-within:border-primary/40 focus-within:bg-background focus-within:shadow-sm",
        disabled && "opacity-60"
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Chat-melding"
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 leading-relaxed py-0.5 max-h-[120px]"
        />
        <div className="flex items-center gap-1 shrink-0">
          {!hasValue && (
            <button
              className="rounded-full p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              title="Taleinnput (kommer snart)"
              aria-label="Taleinnput"
              disabled
            >
              <Mic className="h-4 w-4" />
            </button>
          )}
          <Button
            size="icon"
            className={cn(
              "h-7 w-7 rounded-full transition-all",
              hasValue
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            )}
            onClick={handleSend}
            disabled={disabled || !hasValue}
            aria-label="Send melding"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground/60">
        AI kan gjøre feil. Verifiser viktig informasjon.
      </p>
    </div>
  );
}
