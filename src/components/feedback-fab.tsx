"use client";

/**
 * FeedbackFAB — flytende tilbakemeldingsknapp.
 *
 * Vises nederst til høyre på alle dashboard-sider.
 * Åpner FeedbackDialog ved klikk.
 * Lytter på feil-kontekst event bus for automatisk feilrapportering.
 */

import { useState, useEffect, useCallback } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { lyttPaaFeilrapport, type FeilRapportData } from "@/lib/feil-kontekst";
import type { TilbakemeldingType, TilbakemeldingKilde } from "@/types/domain";

export function FeedbackFAB() {
  const [open, setOpen] = useState(false);
  const [kilde, setKilde] = useState<TilbakemeldingKilde>("fab");
  const [initialType, setInitialType] = useState<TilbakemeldingType | undefined>();
  const [feilKontekst, setFeilKontekst] = useState<FeilRapportData | undefined>();

  // Lytt på feilrapport-events fra ErrorBoundary
  useEffect(() => {
    const cleanup = lyttPaaFeilrapport((data) => {
      setKilde("error-boundary");
      setInitialType("feil");
      setFeilKontekst(data);
      setOpen(true);
    });
    return cleanup;
  }, []);

  const handleOpen = useCallback(() => {
    setKilde("fab");
    setInitialType(undefined);
    setFeilKontekst(undefined);
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset kontekst når dialogen lukkes
      setKilde("fab");
      setInitialType(undefined);
      setFeilKontekst(undefined);
    }
  }, []);

  return (
    <>
      <Button
        onClick={handleOpen}
        size="icon"
        className="fixed bottom-20 right-4 z-[10000] h-12 w-12 rounded-full shadow-lg sm:bottom-6 sm:right-6"
        aria-label="Gi tilbakemelding"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </Button>

      <FeedbackDialog
        open={open}
        onOpenChange={handleOpenChange}
        kilde={kilde}
        initialType={initialType}
        feilKontekst={feilKontekst}
      />
    </>
  );
}
