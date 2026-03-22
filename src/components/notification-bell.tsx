"use client";

/**
 * NotificationBell — klokke-ikon med ulest-teller og dropdown-panel.
 */

import { useState, useRef, useEffect } from "react";
import { Bell, BellRing, Check, CheckCheck, Trophy, Zap, Lightbulb, CalendarClock, Info, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useNotifications, type Notification, type NotificationType } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Ikoner per type
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  achievement: <Trophy className="h-4 w-4 text-yellow-500" />,
  xp: <Zap className="h-4 w-4 text-blue-500" />,
  tip: <Lightbulb className="h-4 w-4 text-green-500" />,
  deadline: <CalendarClock className="h-4 w-4 text-orange-500" />,
  system: <Info className="h-4 w-4 text-muted-foreground" />,
};

function timeAgo(date: Date | null): string {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Nå";
  if (m < 60) return `${m}m siden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}t siden`;
  const d = Math.floor(h / 24);
  return `${d}d siden`;
}

// ---------------------------------------------------------------------------
// Enkelt-varsling
// ---------------------------------------------------------------------------

function NotifItem({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        !notif.read && "bg-primary/5",
        "hover:bg-accent cursor-pointer"
      )}
      onClick={() => !notif.read && onRead(notif.id)}
      role="listitem"
    >
      <div className="mt-0.5 shrink-0">{TYPE_ICONS[notif.type]}</div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", !notif.read && "font-semibold")}>{notif.title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{notif.body}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(notif.createdAt)}</p>
      </div>
      {notif.link && (
        <Link href={notif.link} className="shrink-0 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      )}
      {!notif.read && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" aria-label="Ulest" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hoved-komponent
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Lukk ved klikk utenfor
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Varslinger${unreadCount > 0 ? `, ${unreadCount} ulest` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-foreground" />
        ) : (
          <Bell className="h-5 w-5 text-muted-foreground" />
        )}
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-11 z-50 w-80 rounded-xl border bg-popover shadow-lg",
            "animate-in fade-in-0 zoom-in-95"
          )}
          role="dialog"
          aria-label="Varslinger"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Varslinger</p>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} ulest
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={markAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Les alle
              </Button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-[400px] overflow-y-auto" role="list">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Laster…</p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Ingen varslinger ennå</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotifItem key={n.id} notif={n} onRead={markRead} />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t px-4 py-2">
              <p className="text-[10px] text-muted-foreground text-center">
                Viser de {notifications.length} nyeste varslingene
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
