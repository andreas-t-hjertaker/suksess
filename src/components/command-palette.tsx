"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
  MessageSquare,
  Search,
  Clock,
} from "lucide-react";

const PAGES = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: "hjem oversikt" },
  { href: "/dashboard/profil", label: "Min profil", icon: User, keywords: "riasec big five personlighet" },
  { href: "/dashboard/veileder", label: "AI-veileder", icon: Sparkles, keywords: "chat ai assistent" },
  { href: "/dashboard/karriere", label: "Karrierestiutforsker", icon: Compass, keywords: "yrke jobb utdanning" },
  { href: "/dashboard/karrieregraf", label: "Karrieregraf", icon: GitBranch, keywords: "visualiser karrierevei" },
  { href: "/dashboard/cv", label: "CV-builder", icon: ScrollText, keywords: "cv resume søknad" },
  { href: "/dashboard/analyse", label: "Avansert analyse", icon: BarChart2, keywords: "personlighet statistikk" },
  { href: "/dashboard/soknadscoach", label: "Søknads-coach", icon: ClipboardList, keywords: "søknad poeng sjanse" },
  { href: "/dashboard/jobbmatch", label: "Jobbmatch", icon: Briefcase, keywords: "jobb stilling arbeid" },
  { href: "/dashboard/studier", label: "Studiemestring", icon: BookOpen, keywords: "studie ects eksamen" },
  { href: "/dashboard/karakterer", label: "Karakterer", icon: GraduationCap, keywords: "karakter snitt so-poeng" },
  { href: "/dashboard/dokumenter", label: "Dokumenter", icon: FileText, keywords: "fil dokument" },
  { href: "/dashboard/fremgang", label: "Fremgang & XP", icon: TrendingUp, keywords: "nivå achievement badge" },
  { href: "/dashboard/abonnement", label: "Abonnement", icon: CreditCard, keywords: "betaling plan stripe" },
  { href: "/dashboard/utvikler", label: "Utvikler", icon: Code, keywords: "api nøkkel utvikler" },
  { href: "/dashboard/innstillinger", label: "Innstillinger", icon: Settings, keywords: "innstilling tema" },
  { href: "/dashboard/mine-data", label: "Mine data", icon: DatabaseZap, keywords: "gdpr eksport slett" },
];

const ACTIONS = [
  { id: "chat", label: "Start ny chat", icon: MessageSquare, href: "/dashboard/veileder" },
  { id: "test", label: "Ta personlighetstest", icon: User, href: "/dashboard" },
  { id: "search", label: "Søk i karrierer", icon: Search, href: "/dashboard/karriere" },
];

const RECENT_KEY = "suksess-recent-pages";
const MAX_RECENT = 5;

function getRecentPages(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecentPage(href: string) {
  const recent = getRecentPages().filter((h) => h !== href);
  recent.unshift(href);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
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

  const recentHrefs = getRecentPages();
  const recentPages = recentHrefs
    .map((href) => PAGES.find((p) => p.href === href))
    .filter(Boolean);

  return (
    <>
      {/* Search trigger button in header */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Åpne søk (Cmd+K)"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Søk...</span>
        <kbd className="ml-2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Søk etter sider, karrierer eller handlinger..." />
        <CommandList>
          <CommandEmpty>
            Ingen treff funnet. Prøv et annet søkeord.
          </CommandEmpty>

          {recentPages.length > 0 && (
            <>
              <CommandGroup heading="Nylig besøkt">
                {recentPages.map((page) => page && (
                  <CommandItem
                    key={`recent-${page.href}`}
                    value={`${page.label} ${page.keywords}`}
                    onSelect={() => navigate(page.href)}
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    {page.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="Sider">
            {PAGES.map((page) => (
              <CommandItem
                key={page.href}
                value={`${page.label} ${page.keywords}`}
                onSelect={() => navigate(page.href)}
              >
                <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Handlinger">
            {ACTIONS.map((action) => (
              <CommandItem
                key={action.id}
                value={action.label}
                onSelect={() => navigate(action.href)}
              >
                <action.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {action.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
