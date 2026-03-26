"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";

// ---------------------------------------------------------------------------
// Route-label mapping for breadcrumbs
// ---------------------------------------------------------------------------

const ROUTE_LABELS: Record<string, string> = {
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
  utvikler: "Utvikler",
  innstillinger: "Innstillinger",
  "mine-data": "Mine data",
  admin: "Admin",
  brukere: "Brukere",
  elever: "Elever",
  "feature-flags": "Feature Flags",
  radgivere: "Rådgivere",
  tenant: "Tenant",
};

function getLabel(segment: string): string {
  return ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

// ---------------------------------------------------------------------------
// Breadcrumbs komponent
// ---------------------------------------------------------------------------

export function Breadcrumbs() {
  const pathname = usePathname();

  // Ikke vis breadcrumbs på root dashboard
  if (pathname === "/dashboard") return null;

  const segments = pathname.split("/").filter(Boolean);

  // Bygg crumbs: [{ label, href }]
  const crumbs = segments.map((segment, i) => ({
    label: getLabel(segment),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  // Mobil: vis kun «← Tilbake»
  const parentCrumb = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;

  return (
    <nav aria-label="Breadcrumb" className="px-4 py-2 border-b border-border/40">
      {/* Desktop breadcrumbs */}
      <ol className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {crumb !== crumbs[0] && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {crumb.isLast ? (
              <span className="font-medium text-foreground" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>

      {/* Mobil: Tilbake-knapp */}
      {parentCrumb && (
        <Link
          href={parentCrumb.href}
          className="flex sm:hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Tilbake til {parentCrumb.label}</span>
        </Link>
      )}
    </nav>
  );
}
