"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Rute → lesbart navn
// ---------------------------------------------------------------------------
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  profil: "Min profil",
  veileder: "AI-veileder",
  karriere: "Karriere",
  karrieregraf: "Karrieregraf",
  cv: "CV-builder",
  analyse: "Analyse",
  soknadscoach: "Søknads-coach",
  jobbmatch: "Jobbmatch",
  studier: "Studiemestring",
  karakterer: "Karakterer",
  dokumenter: "Dokumenter",
  fremgang: "Fremgang & XP",
  abonnement: "Abonnement",
  innstillinger: "Innstillinger",
  "mine-data": "Mine data",
  utvikler: "Utvikler",
  laerling: "Lærling & yrkesfag",
  mentorer: "Karrierementorer",
  arbeidsgivere: "Arbeidsgivere",
  admin: "Admin",
  brukere: "Brukere",
  elever: "Elever",
  radgivere: "Rådgivere",
  tenant: "Skoleinnstillinger",
  "feature-flags": "Feature flags",
  onboarding: "Onboarding",
  counselor: "Rådgiver-onboarding",
  login: "Innlogging",
  personvern: "Personvern",
  pricing: "Priser",
  legal: "Juridisk",
  vilkar: "Vilkår",
  dpia: "DPIA",
  databehandleravtale: "Databehandleravtale",
  samtykke: "Samtykke",
};

type BreadcrumbItem = {
  label: string;
  href: string;
  isCurrent: boolean;
};

function buildCrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: BreadcrumbItem[] = [];

  let accPath = "";
  for (let i = 0; i < segments.length; i++) {
    accPath += "/" + segments[i];
    const label = SEGMENT_LABELS[segments[i]] ?? segments[i];
    crumbs.push({
      label,
      href: accPath,
      isCurrent: i === segments.length - 1,
    });
  }

  return crumbs;
}

// ---------------------------------------------------------------------------
// Breadcrumbs-komponent
// ---------------------------------------------------------------------------

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  // Ikke vis på dashboard-roten
  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Brødsmulesti"
      className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}
    >
      <Link
        href="/dashboard"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Hjem — Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" aria-hidden />
          {crumb.isCurrent ? (
            <span
              className="font-medium text-foreground truncate max-w-[160px]"
              aria-current="page"
            >
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="truncate max-w-[120px] hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
