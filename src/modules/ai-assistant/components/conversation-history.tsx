"use client";

/**
 * Samtalehistorikk — sidebar/liste over tidligere AI-samtaler (Issue #63)
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2, Clock, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRecentConversations,
  deleteConversation,
  type StoredConversation,
} from "../lib/conversation-store";

type ConversationHistoryProps = {
  userId: string;
  onSelect: (conversationId: string) => void;
  onNewChat: () => void;
  activeConversationId?: string | null;
  onClose?: () => void;
};

export function ConversationHistory({
  userId,
  onSelect,
  onNewChat,
  activeConversationId,
  onClose,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const recent = await getRecentConversations(userId, 20);
      setConversations(recent);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  async function handleDelete(e: React.MouseEvent, convId: string) {
    e.stopPropagation();
    try {
      await deleteConversation(userId, convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
    } catch {
      // Silently fail
    }
  }

  function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
    }
    if (days === 1) return "I går";
    if (days < 7) return `${days} dager siden`;
    return date.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">Samtaler</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => { onNewChat(); onClose?.(); }}
            title="Ny samtale"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon-xs" onClick={onClose} title="Lukk historikk">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-xs">Ingen tidligere samtaler</p>
          </div>
        ) : (
          <div className="space-y-0.5 p-1.5">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => { onSelect(conv.id); onClose?.(); }}
                className={cn(
                  "group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeConversationId === conv.id && "bg-accent"
                )}
              >
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{conv.title}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{formatDate(conv.lastMessageAt)}</span>
                    <span>&middot;</span>
                    <span>{conv.messageCount} mld.</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  title="Slett samtale"
                  aria-label={`Slett samtale: ${conv.title}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
