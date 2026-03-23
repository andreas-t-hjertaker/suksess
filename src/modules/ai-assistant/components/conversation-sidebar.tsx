/**
 * Samtalehistorikk-sidebar (Issue #63)
 *
 * Viser liste over tidligere samtaler og lar brukeren gjenoppta dem.
 * Responsiv: kollapsbar på mobil, permanent på desktop.
 * GDPR: slett-knapp per samtale (rett til sletting).
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getRecentConversations, deleteConversationById, type StoredConversation } from "../lib/conversation-store";

interface ConversationSidebarProps {
  userId: string;
  currentConversationId?: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  className?: string;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "I dag";
  if (diffDays === 1) return "I går";
  if (diffDays < 7) return `${diffDays} dager siden`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} uker siden`;
  return date.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

export function ConversationSidebar({
  userId,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  className,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await getRecentConversations(userId);
      setConversations(convs);
    } catch {
      // Ignorer feil — historikk er sekundær funksjon
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteConversationById(userId, id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        onNewConversation();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-muted/30 transition-all duration-200",
        collapsed ? "w-12" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {!collapsed && (
          <span className="text-sm font-medium text-muted-foreground">Samtaler</span>
        )}
        <div className={cn("flex gap-1", collapsed && "mx-auto")}>
          {!collapsed && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onNewConversation}
              title="Ny samtale"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Vis samtaler" : "Skjul samtaler"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-30" />
              <p>Ingen samtaler ennå</p>
              <Button size="sm" variant="outline" onClick={onNewConversation} className="gap-1">
                <Plus className="h-3 w-3" />
                Start samtale
              </Button>
            </div>
          ) : (
            <ul className="p-2 space-y-0.5">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    onClick={() => onSelectConversation(conv.id)}
                    className={cn(
                      "group relative w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                      currentConversationId === conv.id && "bg-accent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="line-clamp-2 flex-1 text-xs font-medium leading-tight">
                        {conv.title || "Samtale"}
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, conv.id)}
                        disabled={deletingId === conv.id}
                        className="invisible shrink-0 rounded p-0.5 hover:bg-destructive/20 hover:text-destructive group-hover:visible"
                        title="Slett samtale (GDPR)"
                        aria-label="Slett samtale"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{formatRelativeDate(conv.lastMessageAt)}</span>
                      <span>·</span>
                      <span>{conv.messageCount} meld.</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
