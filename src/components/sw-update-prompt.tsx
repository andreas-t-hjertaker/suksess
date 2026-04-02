"use client";

/**
 * Service Worker oppdateringsprompt (Issue #102, #116)
 *
 * Viser en melding når en ny versjon av appen er tilgjengelig,
 * og lar brukeren oppdatere uten å miste arbeid.
 */

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SwUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      // Sjekk om det allerede er en ventende worker
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdate(true);
      }

      // Lytt etter nye workers
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowUpdate(true);
          }
        });
      });
    });

    // Lytt etter controllerchange for å reloade
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  function handleUpdate() {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  }

  if (!showUpdate) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-lg border bg-background p-4 shadow-lg sm:left-auto"
    >
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Ny versjon tilgjengelig</p>
          <p className="text-xs text-muted-foreground">
            Oppdater for å få siste forbedringer.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowUpdate(false)}>
            Senere
          </Button>
          <Button size="sm" onClick={handleUpdate}>
            Oppdater
          </Button>
        </div>
      </div>
    </div>
  );
}
