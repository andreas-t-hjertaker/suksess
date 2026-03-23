"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Search,
  LayoutDashboard,
  Sparkles,
  Compass,
  GraduationCap,
  Brain,
  ScrollText,
  BarChart2,
  ClipboardList,
  Briefcase,
  BookOpen,
  GitBranch,
  TrendingUp,
  Settings,
  HardHat,
  Users,
  Building2,
  FileText,
  ChevronRight,
  Keyboard,
  User,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Kommandoer
// ---------------------------------------------------------------------------

type Command = {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  category: "navigasjon" | "handling" | "innstillinger";
  keywords?: string[];
};

const COMMANDS: Command[] = [
  // Navigasjon
  { id: "home", label: "Dashboard", description: "Gå til dashbordet", icon: LayoutDashboard, href: "/dashboard", category: "navigasjon" },
  { id: "veileder", label: "AI-veileder", description: "Chat med din personlige karriereveileder", icon: Sparkles, href: "/dashboard/veileder", category: "navigasjon", keywords: ["chat", "ai", "assistent"] },
  { id: "karriere", label: "Karrierestiutforsker", description: "Finn yrker som passer din profil", icon: Compass, href: "/dashboard/karriere", category: "navigasjon" },
  { id: "karakterer", label: "Karakterer & SO-poeng", description: "Registrer karakterer og beregn SO-poeng", icon: GraduationCap, href: "/dashboard/karakterer", category: "navigasjon", keywords: ["grade", "poeng", "so"] },
  { id: "profil", label: "Min profil", description: "Se RIASEC- og Big Five-resultater", icon: Brain, href: "/dashboard/profil", category: "navigasjon", keywords: ["big five", "riasec", "personlighet"] },
  { id: "cv", label: "CV-builder", description: "Bygg og last ned din CV", icon: ScrollText, href: "/dashboard/cv", category: "navigasjon", keywords: ["resume", "jobb"] },
  { id: "analyse", label: "Avansert analyse", description: "Dypdykk i din personlighetsprofil", icon: BarChart2, href: "/dashboard/analyse", category: "navigasjon" },
  { id: "soknadscoach", label: "Søknads-coach", description: "Sjekk sjanser og poenggrenser", icon: ClipboardList, href: "/dashboard/soknadscoach", category: "navigasjon", keywords: ["søknad", "poenggrense", "samordna"] },
  { id: "jobbmatch", label: "Jobbmatch", description: "Finn jobber som matcher profilen din", icon: Briefcase, href: "/dashboard/jobbmatch", category: "navigasjon" },
  { id: "studier", label: "Studiemestring", description: "ECTS-poeng og eksamensoversikt", icon: BookOpen, href: "/dashboard/studier", category: "navigasjon" },
  { id: "karrieregraf", label: "Karrieregraf", description: "Visualiser branching karriereveier", icon: GitBranch, href: "/dashboard/karrieregraf", category: "navigasjon" },
  { id: "fremgang", label: "Fremgang & XP", description: "Gamification og prestasjoner", icon: TrendingUp, href: "/dashboard/fremgang", category: "navigasjon", keywords: ["xp", "badge", "streak"] },
  { id: "laerling", label: "Lærling & yrkesfag", description: "Utforsk fagbrev og lærebedrifter", icon: HardHat, href: "/dashboard/laerling", category: "navigasjon" },
  { id: "mentorer", label: "Karrierementorer", description: "Finn en mentor som passer din profil", icon: Users, href: "/dashboard/mentorer", category: "navigasjon" },
  { id: "arbeidsgivere", label: "Arbeidsgivere", description: "Lærlingplasser og employer branding", icon: Building2, href: "/dashboard/arbeidsgivere", category: "navigasjon" },
  { id: "dokumenter", label: "Dokumenter", description: "Mine dokumenter og filer", icon: FileText, href: "/dashboard/dokumenter", category: "navigasjon" },
  { id: "bruker", label: "Min bruker", description: "Brukerprofil og kontoinformasjon", icon: User, href: "/dashboard/profil", category: "navigasjon" },
  // Innstillinger
  { id: "innstillinger", label: "Innstillinger", description: "App-innstillinger og preferanser", icon: Settings, href: "/dashboard/innstillinger", category: "innstillinger" },
  { id: "mine-data", label: "Mine data", description: "Eksporter eller slett dine data (GDPR)", icon: Settings, href: "/dashboard/mine-data", category: "innstillinger", keywords: ["gdpr", "personvern"] },
];

// ---------------------------------------------------------------------------
// Highlighter for søkematching
// ---------------------------------------------------------------------------
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Kommandopalett-komponent
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const { signOut } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // Åpne med Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Fokus input når åpnes
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filtrer kommandoer
  const filtered = COMMANDS.filter((cmd) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      (cmd.description?.toLowerCase().includes(q)) ||
      (cmd.keywords?.some((k) => k.includes(q)))
    );
  });

  // Håndter navigasjon med piltaster
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      executeCommand(filtered[selected]);
    }
  }

  const executeCommand = useCallback((cmd: Command | undefined) => {
    if (!cmd) return;
    setOpen(false);
    if (cmd.action) {
      cmd.action();
    } else if (cmd.href) {
      router.push(cmd.href);
    }
  }, [router]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Åpne kommandopalett (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Søk...</span>
        <kbd className="ml-2 flex items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-mono">
          <span>⌘</span>K
        </kbd>
      </button>
    );
  }

  // Grupper kommandoer
  const categories = ["navigasjon", "handling", "innstillinger"] as const;
  const grouped = categories
    .map((cat) => ({
      cat,
      items: filtered.filter((c) => c.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Palett */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-200"
        role="dialog"
        aria-label="Kommandopalett"
        aria-modal="true"
      >
        {/* Søkefelt */}
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Søk etter sider, funksjoner..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            aria-label="Søk i kommandopalett"
            autoComplete="off"
          />
          <kbd className="flex items-center gap-0.5 rounded border border-border/50 bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Resultater */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Ingen resultater for "{query}"</p>
            </div>
          ) : (
            grouped.map(({ cat, items }) => {
              const catLabel = {
                navigasjon: "Navigasjon",
                handling: "Handlinger",
                innstillinger: "Innstillinger",
              }[cat];

              return (
                <div key={cat}>
                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {catLabel}
                  </p>
                  {items.map((cmd) => {
                    const globalIdx = filtered.indexOf(cmd);
                    const isSelected = globalIdx === selected;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelected(globalIdx)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          isSelected ? "bg-accent" : "hover:bg-accent/50"
                        )}
                        aria-selected={isSelected}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <cmd.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            <Highlight text={cmd.label} query={query} />
                          </p>
                          {cmd.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              <Highlight text={cmd.description} query={query} />
                            </p>
                          )}
                        </div>
                        {isSelected && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <Keyboard className="h-3 w-3" />
              ↑↓ naviger
            </span>
            <span>↵ åpne</span>
            <span>Esc lukk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
