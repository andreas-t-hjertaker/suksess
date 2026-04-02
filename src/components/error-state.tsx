"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

interface ErrorStateProps {
  /** Feilmelding å vise */
  message?: string;
  /** Retry-funksjon */
  onRetry?: () => void;
  /** Om feilen skyldes nettverksproblemer */
  isOffline?: boolean;
}

/**
 * Gjenbrukbar feilvisning med retry-knapp (#140)
 *
 * Bruk:
 *   <ErrorState message="Kunne ikke laste data" onRetry={retry} />
 *   <ErrorState isOffline onRetry={retry} />
 */
export function ErrorState({
  message = "Noe gikk galt. Prøv igjen.",
  onRetry,
  isOffline = false,
}: ErrorStateProps) {
  const Icon = isOffline ? WifiOff : AlertTriangle;

  return (
    <Card role="alert" aria-live="polite" className="border-destructive/20 bg-destructive/5">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <Icon className="h-10 w-10 text-destructive/70" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium text-destructive">
            {isOffline ? "Du er frakoblet" : "Noe gikk galt"}
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {isOffline
              ? "Sjekk internettilkoblingen din og prøv igjen."
              : message}
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Prøv igjen
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
