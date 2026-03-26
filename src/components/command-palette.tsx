"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  User,
  Sparkles,
  Compass,
  GitBranch,
  ScrollText,
  BarChart2,
  ClipboardList,
  Briefcase,
  BookOpen,
  GraduationCap,
  FileText,
  TrendingUp,
  CreditCard,
  Code,
  Settings,
  DatabaseZap,
  Shield,
  Search,
  Clock,
  Zap,
  MessageSquare,
  Brain,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommandItem = {
  id: string;
  label: string;
  href?: string;
  icon: React.ElementType;
  category: "sider" | "handlinger" | "sist-besøkt";
  keywords?: string;
  onSelect?: () => void;
};

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

const PAGE_ITEMS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "sider" },
  { id: "profil", label: "Min profil", href: "/dashboard/profil", icon: User, category: "sider" },
  { id: "veileder", label: "AI-veileder", href: "/dashboard/veileder", icon: Sparkles, category: "sider", keywords: "chat ai bot" },
  { id: "karriere", label: "Karriere", href: "/dashboard/karriere", icon: Compass, category: "sider", keywords: "jobb yrke" },
  { id: "karrieregraf", label: "Karrieregraf", href: "/dashboard/karrieregraf", icon: GitBranch, category: "sider", keywords: "graf tre" },
  { id: "cv", label: "CV-builder", href: "/dashboard/cv", icon: ScrollText, category: "sider", keywords: "cv resume søknad" },
  { id: "analyse", label: "Analyse", href: "/dashboard/analyse", icon: BarChart2, category: "sider", keywords: "personlighet big five riasec" },
  { id: "soknadscoach", label: "Søknads-coach", href: "/dashboard/soknadscoach", icon: ClipboardList, category: "sider", keywords: "søknad tips" },
  { id: "jobbmatch", label: "Jobbmatch", href: "/dashboard/jobbmatch", icon: Briefcase, category: "sider", keywords: "jobb stilling" },
  { id: "studier", label: "Studiemestring", href: "/dashboard/studier", icon: BookOpen, category: "sider", keywords: "studie utdanning" },
  { id: "karakterer", label: "Karakterer", href: "/dashboard/karakterer", icon: GraduationCap, category: "sider", keywords: "karakter poeng" },
  { id: "dokumenter", label: "Dokumenter", href: "/dashboard/dokumenter", icon: FileText, category: "sider" },
  { id: "fremgang", label: "Fremgang & XP", href: "/dashboard/fremgang", icon: TrendingUp, category: "sider", keywords: "xp badge gamification" },
  { id: "abonnement", label: "Abonnement", href: "/dashboard/abonnement", icon: CreditCard, category: "sider", keywords: "betaling stripe" },
  { id: "utvikler", label: "Utvikler", href: "/dashboard/utvikler", icon: Code, category: "sider", keywords: "api nøkkel" },
  { id: "innstillinger", label: "Innstillinger", href: "/dashboard/innstillinger", icon: Settings, category: "sider" },
  { id: "mine-data", label: "Mine data", href: "/dashboard/mine-data", icon: DatabaseZap, category: "sider", keywords: "gdpr eksport slett" },
  { id: "admin", label: "Admin", href: "/admin", icon: Shield, category: "sider", keywords: "admin dashboard" },
];

const ACTION_ITEMS: CommandItem[] = [
  { id: "action-chat", label: "Start ny chat med AI-veileder", href: "/dashboard/veileder", icon: MessageSquare, category: "handlinger" },
  { id: "action-test", label: "Ta personlighetstest", href: "/dashboard/analyse", icon: Brain, category: "handlinger" },
  { id: "action-profil", label: "Se min profil", href: "/dashboard/profil", icon: User, category: "handlinger" },
];

// ---------------------------------------------------------------------------
// Recently visited (localStorage)
// ---------------------------------------------------------------------------

const RECENT_KEY = "suksess-recent-pages";
const MAX_RECENT = 5;

function getRecentPages(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentPage(href: string) {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentPages().filter((p) => p !== href);
    recent.unshift(href);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore localStorage errors
  }
}

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      addRecentPage(href);
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // Build recent items
  const recentHrefs = getRecentPages();
  const recentItems: CommandItem[] = recentHrefs
    .map((href) => PAGE_ITEMS.find((p) => p.href === href))
    .filter(Boolean) as CommandItem[];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Command panel */}
      <div
        className="relative w-full max-w-lg mx-4 glass-card rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Kommandopalett" className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-display [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
          <div className="flex items-center gap-2 border-b border-border/40 px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Søk etter sider, handlinger..."
              className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              Ingen treff. Prøv et annet søkeord.
            </Command.Empty>

            {/* Sist besøkt */}
            {recentItems.length > 0 && (
              <Command.Group heading="Sist besøkt">
                {recentItems.map((item) => (
                  <Command.Item
                    key={`recent-${item.id}`}
                    value={`recent ${item.label}`}
                    onSelect={() => item.href && navigate(item.href)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground transition-colors"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Sider */}
            <Command.Group heading="Sider">
              {PAGE_ITEMS.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.keywords || ""}`}
                  onSelect={() => item.href && navigate(item.href)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground transition-colors"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Handlinger */}
            <Command.Group heading="Handlinger">
              {ACTION_ITEMS.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.keywords || ""}`}
                  onSelect={() => item.href && navigate(item.href)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground transition-colors"
                >
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="border-t border-border/40 px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↑↓</kbd>{" "}
              navigere{" "}
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↵</kbd>{" "}
              åpne
            </span>
            <span>
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">esc</kbd>{" "}
              lukk
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trigger-knapp for header
// ---------------------------------------------------------------------------

export function CommandPaletteTrigger() {
  const [, setForceRender] = useState(0);

  // Trigger re-render to open the palette via a custom event
  useEffect(() => {
    function handler() {
      setForceRender((n) => n + 1);
    }
    window.addEventListener("open-command-palette", handler);
    return () => window.removeEventListener("open-command-palette", handler);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        // Dispatch keyboard event to toggle
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
      }}
      className="hidden sm:flex items-center gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Åpne søk (Cmd+K)"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Søk...</span>
      <kbd className="ml-2 rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono">
        ⌘K
      </kbd>
    </button>
  );
}
