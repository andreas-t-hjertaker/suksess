"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "consent";

/** Sjekk om brukeren har gitt samtykke til analyseverktøy */
export function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "accepted";
}

/** GDPR-samtykkebanner for informasjonskapsler/analytics */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
    // Last inn analytics ved å laste siden på nytt
    window.location.reload();
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Vi bruker informasjonskapsler og analyse for å forbedre opplevelsen din.
          Ved å godta samtykker du til bruk av Firebase Analytics.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={decline}>
            Avslå
          </Button>
          <Button size="sm" onClick={accept}>
            Godta
          </Button>
        </div>
      </div>
    </div>
  );
}
