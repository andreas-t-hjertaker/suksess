"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Generisk empty state-komponent
// ---------------------------------------------------------------------------

type EmptyStateProps = {
  /** Stor emoji eller SVG-illustrasjon */
  emoji?: string;
  /** Overskrift */
  title: string;
  /** Beskrivende tekst */
  description?: string;
  /** Primær handlingsknapp */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Sekundær handlingsknapp */
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Tilpasset innhold under tekst */
  children?: React.ReactNode;
  className?: string;
  /** Størrelse på komponenten */
  size?: "sm" | "md" | "lg";
};

export function EmptyState({
  emoji,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizes = {
    sm: { emoji: "text-4xl", title: "text-base", desc: "text-xs", wrap: "py-8 px-4", gap: "gap-2" },
    md: { emoji: "text-5xl", title: "text-lg", desc: "text-sm", wrap: "py-12 px-6", gap: "gap-3" },
    lg: { emoji: "text-6xl", title: "text-xl", desc: "text-base", wrap: "py-16 px-8", gap: "gap-4" },
  }[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        sizes.wrap,
        sizes.gap,
        className
      )}
    >
      {emoji && (
        <div className={cn(sizes.emoji, "animate-float select-none")} aria-hidden="true">
          {emoji}
        </div>
      )}
      <div className={cn("space-y-1.5", size === "lg" ? "space-y-2" : "")}>
        <h3 className={cn("font-semibold text-foreground", sizes.title)}>{title}</h3>
        {description && (
          <p className={cn("text-muted-foreground max-w-sm mx-auto leading-relaxed", sizes.desc)}>
            {description}
          </p>
        )}
      </div>
      {children}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          {action && (
            action.href ? (
              <Link href={action.href}>
                <Button size={size === "sm" ? "sm" : "default"}>{action.label}</Button>
              </Link>
            ) : (
              <Button size={size === "sm" ? "sm" : "default"} onClick={action.onClick}>
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Link href={secondaryAction.href}>
                <Button variant="outline" size={size === "sm" ? "sm" : "default"}>
                  {secondaryAction.secondaryAction?.label ?? secondaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size={size === "sm" ? "sm" : "default"} onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forhåndsdefinerte empty states for vanlige scenarier
// ---------------------------------------------------------------------------

/** Ingen karakterer registrert */
export function NoGradesEmptyState() {
  return (
    <EmptyState
      emoji="📚"
      title="Ingen karakterer ennå"
      description="Registrer karakterene dine for å beregne SO-poeng og se hvilke studier du kan komme inn på."
      action={{ label: "Registrer karakterer", href: "/dashboard/karakterer" }}
    />
  );
}

/** Personlighetsprofil mangler */
export function NoProfileEmptyState() {
  return (
    <EmptyState
      emoji="🧠"
      title="Profilen din er ikke klar"
      description="Ta Big Five og RIASEC-testen for å få personlig karriereveiledning og matchede studieretninger."
      action={{ label: "Start personlighetstesten", href: "/dashboard" }}
    />
  );
}

/** Ingen jobbmatcher */
export function NoJobMatchesEmptyState() {
  return (
    <EmptyState
      emoji="💼"
      title="Ingen jobbmatcher ennå"
      description="Fullfør personlighetstesten for å se jobber som passer din profil og interesser."
      action={{ label: "Gå til profil", href: "/dashboard/profil" }}
      secondaryAction={{ label: "AI-veileder", href: "/dashboard/veileder" }}
    />
  );
}

/** Ingen samtalehistorikk */
export function NoChatHistoryEmptyState() {
  return (
    <EmptyState
      emoji="💬"
      title="Ingen samtalehistorikk"
      description="Start en samtale med AI-veilederen din. Den husker hvem du er og gir personlige råd."
      action={{ label: "Start samtale", href: "/dashboard/veileder" }}
      size="sm"
    />
  );
}

/** Ingen dokumenter */
export function NoDocumentsEmptyState() {
  return (
    <EmptyState
      emoji="📄"
      title="Ingen dokumenter"
      description="Last opp CV, attester og vitnemål her. De er tilgjengelige fra alle enheter."
    />
  );
}

/** Søkeresultater er tomme */
export function NoSearchResultsEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      emoji="🔍"
      title={`Ingen resultater for "${query}"`}
      description="Prøv et annet søkeord, eller bruk AI-veilederen for hjelp."
      action={{ label: "Spør AI-veilederen", href: "/dashboard/veileder" }}
      size="sm"
    />
  );
}

/** Feil ved lasting */
export function ErrorEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      emoji="😕"
      title="Noe gikk galt"
      description="Kunne ikke laste innholdet. Sjekk internettforbindelsen din og prøv igjen."
      action={onRetry ? { label: "Prøv igjen", onClick: onRetry } : undefined}
      size="sm"
    />
  );
}

/** Ingen mentorer tilgjengelig */
export function NoMentorsEmptyState() {
  return (
    <EmptyState
      emoji="🤝"
      title="Ingen mentorer matcher profilen din ennå"
      description="Vi jobber med å koble deg med en mentor basert på din RIASEC-profil. Kom tilbake snart!"
      action={{ label: "Fullfør profil", href: "/dashboard/profil" }}
    />
  );
}

/** Ingen karrierestier utforsket */
export function NoCareerPathsEmptyState() {
  return (
    <EmptyState
      emoji="🎯"
      title="Utforsk karrieremulighetene dine"
      description="Basert på din RIASEC-kode og interesser vil vi vise deg karrierestier som passer deg best."
      action={{ label: "Ta RIASEC-testen", href: "/dashboard" }}
    />
  );
}

/** Tom fremgangsside */
export function NoAchievementsEmptyState() {
  return (
    <EmptyState
      emoji="🏆"
      title="Ingen prestasjoner ennå"
      description="Fullfør oppgaver, ta tester og bruk plattformen daglig for å tjene XP og låse opp badges!"
      action={{ label: "Se hva du kan gjøre", href: "/dashboard" }}
    />
  );
}
