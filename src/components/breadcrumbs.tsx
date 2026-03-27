"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";

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
  onboarding: "Onboarding",
  login: "Innlogging",
};

function getLabel(segment: string): string {
  return ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Don't show on root pages
  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, i) => ({
    label: getLabel(segment),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <>
      {/* Desktop breadcrumbs */}
      <nav aria-label="Brødsmulesti" className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
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
          </span>
        ))}
      </nav>

      {/* Mobile back button */}
      {crumbs.length >= 2 && (
        <nav aria-label="Tilbakenavigasjon" className="flex sm:hidden">
          <Link
            href={crumbs[crumbs.length - 2].href}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{crumbs[crumbs.length - 2].label}</span>
          </Link>
        </nav>
      )}
    </>
  );
}
